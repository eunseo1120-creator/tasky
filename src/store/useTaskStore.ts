import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/integrations/supabase/client";
import type { JobkoreaRole } from "@/lib/jobkorea";
import { useProfileStore } from "@/store/useProfileStore";

export type Quadrant = "do" | "schedule" | "delegate" | "eliminate";
export type MemberRole = "manager" | "member";

export interface Task {
  id: string;
  room: string;
  title: string;
  quadrant: Quadrant;
  deadline?: string;
  owner_id?: string | null;
  mentions: string[];
  completed: boolean;
  deleted: boolean;
  created_by: string;
  created_at: string;
}

export interface Member {
  user_id: string;
  nickname: string;
  avatar_url: string;
  role: MemberRole;
  jobRole: JobkoreaRole;
  absent: boolean;
  blocked: boolean;
  assignable: boolean;
}

export interface TaskComment {
  id: string;
  task_id: string;
  room_code: string;
  user_id: string;
  content: string;
  mentions: string[];
  created_at: string;
}

type MemberOverride = Pick<Member, "blocked" | "assignable">;

interface TaskState {
  room: string | null;
  userId: string | null;
  tasks: Task[];
  members: Member[];
  onlineIds: Set<string>;
  commentsByTask: Record<string, TaskComment[]>;
  commentsMode: "remote" | "local" | "unknown";
  _channels: RealtimeChannel[];
  _presenceChannel: RealtimeChannel | null;
  _memberOverrides: Record<string, MemberOverride>;
  _ready: boolean;

  joinRoom: (code: string, userId: string) => Promise<void>;
  leaveRoom: () => Promise<void>;
  syncPresence: () => Promise<void>;
  setSelfStatus: (
    patch: Partial<Pick<Member, "role" | "absent" | "blocked" | "assignable">>,
  ) => Promise<void>;
  allowAssignmentFor: (userId: string) => void;
  blockAssignmentFor: (userId: string) => void;

  addTask: (input: {
    title: string;
    quadrant: Quadrant;
    deadline?: string;
    owner_id?: string | null;
    mentions?: string[];
  }) => Promise<Task | null>;
  updateTask: (
    id: string,
    patch: Partial<
      Pick<Task, "title" | "quadrant" | "deadline" | "owner_id" | "mentions" | "completed" | "deleted">
    >,
  ) => Promise<void>;
  moveTask: (id: string, quadrant: Quadrant) => Promise<void>;
  setDeadline: (id: string, deadline?: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  restoreTask: (id: string) => Promise<void>;

  loadComments: () => Promise<void>;
  addComment: (taskId: string, content: string, mentions?: string[]) => Promise<void>;
}

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    room: row.room_code as string,
    title: row.title as string,
    quadrant: row.quadrant as Quadrant,
    deadline: (row.deadline as string | null) ?? undefined,
    owner_id: (row.owner_id as string | null) ?? null,
    mentions: (row.mentions as string[] | null) ?? [],
    completed: Boolean(row.completed),
    deleted: Boolean(row.deleted),
    created_by: row.created_by as string,
    created_at: row.created_at as string,
  };
}

function rowToComment(row: Record<string, unknown>): TaskComment {
  return {
    id: row.id as string,
    task_id: row.task_id as string,
    room_code: row.room_code as string,
    user_id: row.user_id as string,
    content: row.content as string,
    mentions: (row.mentions as string[] | null) ?? [],
    created_at: row.created_at as string,
  };
}

function localCommentsKey(room: string) {
  return `task-comments:${room}`;
}

function loadLocalComments(room: string): Record<string, TaskComment[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(localCommentsKey(room));
    return raw ? (JSON.parse(raw) as Record<string, TaskComment[]>) : {};
  } catch {
    return {};
  }
}

function saveLocalComments(room: string, commentsByTask: Record<string, TaskComment[]>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(localCommentsKey(room), JSON.stringify(commentsByTask));
}

function groupComments(comments: TaskComment[]) {
  return comments.reduce<Record<string, TaskComment[]>>((acc, comment) => {
    if (!acc[comment.task_id]) acc[comment.task_id] = [];
    acc[comment.task_id].push(comment);
    return acc;
  }, {});
}

function presenceMetaToMember(meta: Record<string, unknown> | undefined) {
  return {
    nickname: typeof meta?.nickname === "string" ? meta.nickname : undefined,
    avatar_url: typeof meta?.avatar_url === "string" ? meta.avatar_url : undefined,
    role: meta?.role === "manager" ? "manager" : meta?.role === "member" ? "member" : undefined,
    jobRole: typeof meta?.jobRole === "string" ? (meta.jobRole as JobkoreaRole) : undefined,
    absent: typeof meta?.absent === "boolean" ? meta.absent : undefined,
    blocked: typeof meta?.blocked === "boolean" ? meta.blocked : undefined,
    assignable: typeof meta?.assignable === "boolean" ? meta.assignable : undefined,
  } as Partial<Member>;
}

function latestPresenceMeta(state: RealtimePresenceState, userId: string) {
  const entries = state[userId];
  if (!entries?.length) return undefined;
  return entries[entries.length - 1] as Record<string, unknown>;
}

function mergeMemberState(
  member: Member,
  presenceState: RealtimePresenceState,
  overrides: Record<string, MemberOverride>,
) {
  const meta = presenceMetaToMember(latestPresenceMeta(presenceState, member.user_id));
  const absent = meta.absent ?? member.absent;

  if (!absent) {
    return {
      ...member,
      ...meta,
      absent: false,
      blocked: false,
      assignable: true,
    };
  }

  const override = overrides[member.user_id];
  return {
    ...member,
    ...meta,
    absent: true,
    blocked: override?.blocked ?? meta.blocked ?? false,
    assignable: override?.assignable ?? meta.assignable ?? false,
  };
}

function getSelfPresencePayload(state: TaskState) {
  const profile = useProfileStore.getState().profile;
  const self = state.members.find((member) => member.user_id === state.userId);

  return {
    online_at: Date.now(),
    nickname: profile?.nickname ?? self?.nickname ?? "Anonymous",
    avatar_url: profile?.avatar ?? self?.avatar_url ?? "",
    role: profile?.role ?? self?.role ?? "member",
    jobRole: profile?.jobRole ?? self?.jobRole ?? "인사담당",
    absent: self?.absent ?? false,
    blocked: self?.blocked ?? false,
    assignable: self?.assignable ?? true,
  };
}

function applyMembersPresence(
  members: Member[],
  presenceState: RealtimePresenceState,
  overrides: Record<string, MemberOverride>,
) {
  return members.map((member) => mergeMemberState(member, presenceState, overrides));
}

export const useTaskStore = create<TaskState>()((set, get) => ({
  room: null,
  userId: null,
  tasks: [],
  members: [],
  onlineIds: new Set(),
  commentsByTask: {},
  commentsMode: "unknown",
  _channels: [],
  _presenceChannel: null,
  _memberOverrides: {},
  _ready: false,

  joinRoom: async (code, userId) => {
    await Promise.allSettled(get()._channels.map((channel) => supabase.removeChannel(channel)));

    set({
      room: null,
      userId: null,
      tasks: [],
      members: [],
      onlineIds: new Set(),
      commentsByTask: {},
      commentsMode: "unknown",
      _channels: [],
      _presenceChannel: null,
      _memberOverrides: {},
      _ready: false,
    });

    const { error: joinError } = await supabase.from("room_members").insert({ room_code: code, user_id: userId });
    if (joinError && joinError.code !== "23505") throw joinError;

    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("room_code", code)
      .order("created_at", { ascending: true });
    if (tasksError) throw tasksError;

    set({ tasks: (tasks ?? []).map(rowToTask) });
    await refreshMembers(code, set, get);
    await get().loadComments();

    const channelKey = `${code}:${userId}:${crypto.randomUUID()}`;

    const tasksChannel = supabase
      .channel(`room:${channelKey}:tasks`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `room_code=eq.${code}` },
        (payload) => {
          set((state) => {
            const nextTasks = [...state.tasks];
            if (payload.eventType === "INSERT") {
              const task = rowToTask(payload.new as Record<string, unknown>);
              if (!nextTasks.find((item) => item.id === task.id)) nextTasks.push(task);
            } else if (payload.eventType === "UPDATE") {
              const task = rowToTask(payload.new as Record<string, unknown>);
              const index = nextTasks.findIndex((item) => item.id === task.id);
              if (index >= 0) nextTasks[index] = task;
              else nextTasks.push(task);
            } else if (payload.eventType === "DELETE") {
              const deletedId = (payload.old as { id: string }).id;
              return { tasks: nextTasks.filter((item) => item.id !== deletedId) };
            }
            return { tasks: nextTasks };
          });
        },
      )
      .subscribe();

    const membersChannel = supabase
      .channel(`room:${channelKey}:members`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "room_members", filter: `room_code=eq.${code}` },
        () => {
          void refreshMembers(code, set, get);
        },
      )
      .subscribe();

    const presenceChannel = supabase
      .channel(`room:${channelKey}:presence`, { config: { presence: { key: userId } } })
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        set((current) => ({
          onlineIds: ids,
          members: applyMembersPresence(current.members, state, current._memberOverrides),
        }));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track(getSelfPresencePayload(get()));
        }
      });

    set({
      room: code,
      userId,
      _channels: [tasksChannel, membersChannel, presenceChannel],
      _presenceChannel: presenceChannel,
      _ready: true,
    });
  },

  leaveRoom: async () => {
    const { room, userId, _channels } = get();
    for (const channel of _channels) await supabase.removeChannel(channel);

    if (room && userId) {
      await supabase.from("room_members").delete().eq("room_code", room).eq("user_id", userId);
    }

    set({
      room: null,
      userId: null,
      tasks: [],
      members: [],
      onlineIds: new Set(),
      commentsByTask: {},
      commentsMode: "unknown",
      _channels: [],
      _presenceChannel: null,
      _memberOverrides: {},
      _ready: false,
    });
  },

  syncPresence: async () => {
    const { _presenceChannel, userId } = get();
    if (!_presenceChannel || !userId) return;

    await _presenceChannel.track(getSelfPresencePayload(get()));
    const presenceState = _presenceChannel.presenceState();
    set((state) => ({
      members: applyMembersPresence(state.members, presenceState, state._memberOverrides),
    }));
  },

  setSelfStatus: async (patch) => {
    const { userId } = get();
    if (!userId) return;

    set((state) => {
      const nextOverrides = { ...state._memberOverrides };
      const members = state.members.map((member) => {
        if (member.user_id !== userId) return member;

        const nextRole = patch.role ?? member.role;
        const nextAbsent = patch.absent ?? member.absent;
        const nextBlocked = nextAbsent ? (patch.blocked ?? false) : false;
        const nextAssignable = nextAbsent ? (patch.assignable ?? false) : true;

        if (!nextAbsent) delete nextOverrides[userId];
        else nextOverrides[userId] = { blocked: nextBlocked, assignable: nextAssignable };

        return {
          ...member,
          role: nextRole,
          absent: nextAbsent,
          blocked: nextBlocked,
          assignable: nextAssignable,
        };
      });

      return { members, _memberOverrides: nextOverrides };
    });

    await get().syncPresence();
  },

  allowAssignmentFor: (memberId) => {
    set((state) => ({
      _memberOverrides: {
        ...state._memberOverrides,
        [memberId]: { blocked: false, assignable: true },
      },
      members: state.members.map((member) =>
        member.user_id === memberId ? { ...member, blocked: false, assignable: true } : member,
      ),
    }));
  },

  blockAssignmentFor: (memberId) => {
    set((state) => ({
      _memberOverrides: {
        ...state._memberOverrides,
        [memberId]: { blocked: true, assignable: false },
      },
      members: state.members.map((member) =>
        member.user_id === memberId ? { ...member, blocked: true, assignable: false } : member,
      ),
    }));
  },

  addTask: async (input) => {
    const { room, userId } = get();
    if (!room || !userId) return null;

    const optimisticId = crypto.randomUUID();
    const optimisticTask: Task = {
      id: optimisticId,
      room,
      title: input.title,
      quadrant: input.quadrant,
      deadline: input.deadline,
      owner_id: input.owner_id ?? null,
      mentions: input.mentions ?? [],
      completed: false,
      deleted: false,
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    set((state) => ({ tasks: [...state.tasks, optimisticTask] }));

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        id: optimisticId,
        room_code: room,
        title: input.title,
        quadrant: input.quadrant,
        deadline: input.deadline ?? null,
        owner_id: input.owner_id ?? null,
        mentions: input.mentions ?? [],
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      set((state) => ({ tasks: state.tasks.filter((task) => task.id !== optimisticId) }));
      return null;
    }

    return rowToTask(data as Record<string, unknown>);
  },

  updateTask: async (id, patch) => {
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    }));

    const dbPatch: Record<string, unknown> = {};
    if ("title" in patch) dbPatch.title = patch.title;
    if ("quadrant" in patch) dbPatch.quadrant = patch.quadrant;
    if ("deadline" in patch) dbPatch.deadline = patch.deadline ?? null;
    if ("owner_id" in patch) dbPatch.owner_id = patch.owner_id ?? null;
    if ("mentions" in patch) dbPatch.mentions = patch.mentions ?? [];
    if ("completed" in patch) dbPatch.completed = patch.completed;
    if ("deleted" in patch) dbPatch.deleted = patch.deleted;

    await supabase.from("tasks").update(dbPatch as never).eq("id", id);
  },

  moveTask: async (id, quadrant) => {
    await get().updateTask(id, { quadrant });
  },

  setDeadline: async (id, deadline) => {
    await get().updateTask(id, { deadline });
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((item) => item.id === id);
    if (!task) return;
    await get().updateTask(id, { completed: !task.completed });
  },

  deleteTask: async (id) => {
    await get().updateTask(id, { deleted: true });
  },

  restoreTask: async (id) => {
    await get().updateTask(id, { deleted: false, completed: false });
  },

  loadComments: async () => {
    const { room } = get();
    if (!room) return;

    try {
      const { data, error } = await supabase
        .from("task_comments")
        .select("*")
        .eq("room_code", room)
        .order("created_at", { ascending: true });

      if (error) throw error;

      set({
        commentsByTask: groupComments((data ?? []).map((row) => rowToComment(row as Record<string, unknown>))),
        commentsMode: "remote",
      });
    } catch {
      set({
        commentsByTask: loadLocalComments(room),
        commentsMode: "local",
      });
    }
  },

  addComment: async (taskId, content, mentions = []) => {
    const { room, userId, commentsMode } = get();
    if (!room || !userId) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    const optimistic: TaskComment = {
      id: crypto.randomUUID(),
      task_id: taskId,
      room_code: room,
      user_id: userId,
      content: trimmed,
      mentions,
      created_at: new Date().toISOString(),
    };

    set((state) => ({
      commentsByTask: {
        ...state.commentsByTask,
        [taskId]: [...(state.commentsByTask[taskId] ?? []), optimistic],
      },
    }));

    if (commentsMode === "remote" || commentsMode === "unknown") {
      try {
        const { error } = await supabase.from("task_comments").insert({
          id: optimistic.id,
          task_id: optimistic.task_id,
          room_code: optimistic.room_code,
          user_id: optimistic.user_id,
          content: optimistic.content,
          mentions: optimistic.mentions,
        } as never);

        if (error) throw error;

        set({ commentsMode: "remote" });
        return;
      } catch {
        // fall through to local storage
      }
    }

    const nextComments = get().commentsByTask;
    saveLocalComments(room, nextComments);
    set({ commentsMode: "local" });
  },
}));

async function refreshMembers(
  code: string,
  set: (partial: Partial<TaskState> | ((state: TaskState) => Partial<TaskState>)) => void,
  get: () => TaskState,
) {
  const { data: rows, error: membersError } = await supabase.from("room_members").select("user_id").eq("room_code", code);
  if (membersError) throw membersError;

  const ids = (rows ?? []).map((row) => row.user_id as string);
  if (!ids.length) {
    set({ members: [] });
    return;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("user_id, nickname, avatar_url")
    .in("user_id", ids);
  if (profilesError) throw profilesError;

  const currentMembers = get().members;
  const overrides = get()._memberOverrides;
  const presenceState = get()._presenceChannel?.presenceState() ?? {};

  const baseMembers: Member[] = (profiles ?? []).map((profileRow) => {
    const existing = currentMembers.find((member) => member.user_id === (profileRow.user_id as string));
    return {
      user_id: profileRow.user_id as string,
      nickname: (profileRow.nickname as string) ?? "Anonymous",
      avatar_url: (profileRow.avatar_url as string) ?? "",
      role: existing?.role ?? "member",
      jobRole: existing?.jobRole ?? "인사담당",
      absent: existing?.absent ?? false,
      blocked: existing?.blocked ?? false,
      assignable: existing?.assignable ?? true,
    };
  });

  set({
    members: applyMembersPresence(baseMembers, presenceState, overrides),
  });
}
