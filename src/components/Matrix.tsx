import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AtSign,
  Calendar as CalIcon,
  Check,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { rewriteManagerComment } from "@/lib/comment-rewrite.functions";
import { cn } from "@/lib/utils";
import { useTaskStore, type Member, type Quadrant, type Task, type TaskComment } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";

const QUADRANTS: {
  id: Quadrant;
  title: string;
  subtitle: string;
  hint: string;
  bg: string;
  fg: string;
}[] = [
  {
    id: "do",
    title: "지금 바로",
    subtitle: "Do",
    hint: "당장 처리할 일",
    bg: "bg-quad-do",
    fg: "text-quad-do-fg",
  },
  {
    id: "schedule",
    title: "이번 주",
    subtitle: "Schedule",
    hint: "미리 잡아둘 일정",
    bg: "bg-quad-schedule",
    fg: "text-quad-schedule-fg",
  },
  {
    id: "delegate",
    title: "협업 요청",
    subtitle: "Delegate",
    hint: "담당자 지정, 멘션",
    bg: "bg-quad-delegate",
    fg: "text-quad-delegate-fg",
  },
  {
    id: "eliminate",
    title: "기타 이벤트",
    subtitle: "Eliminate",
    hint: "가볍게 정리할 일",
    bg: "bg-quad-eliminate",
    fg: "text-quad-eliminate-fg",
  },
];

export function Matrix() {
  const tasks = useTaskStore((s) => s.tasks);
  const members = useTaskStore((s) => s.members);
  const commentsByTask = useTaskStore((s) => s.commentsByTask);
  const moveTask = useTaskStore((s) => s.moveTask);
  const addTask = useTaskStore((s) => s.addTask);
  const showDeleted = useUIStore((s) => s.showDeleted);
  const setShowDeleted = useUIStore((s) => s.setShowDeleted);
  const gameMode = useUIStore((s) => s.gameMode);

  const [adding, setAdding] = useState<Quadrant | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");

  const visible = useMemo(
    () => tasks.filter((task) => showDeleted || (!task.deleted && !task.completed)),
    [tasks, showDeleted],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return visible;
    return visible.filter((task) => {
      const owner = members.find((member) => member.user_id === task.owner_id);
      const comments = commentsByTask[task.id] ?? [];
      return (
        task.title.toLowerCase().includes(query) ||
        owner?.nickname.toLowerCase().includes(query) ||
        comments.some((comment) => comment.content.toLowerCase().includes(query))
      );
    });
  }, [commentsByTask, members, search, visible]);

  const tasksByQuadrant = (quadrant: Quadrant) => filtered.filter((task) => task.quadrant === quadrant);

  const handleDrop = (quadrant: Quadrant, taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.quadrant === quadrant) return;
    void moveTask(task.id, quadrant);
  };

  const submitNew = (quadrant: Quadrant) => {
    const title = newTitle.trim();
    if (title) void addTask({ title, quadrant });
    setNewTitle("");
    setAdding(null);
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[1.5rem] border border-border/70 bg-card/70 px-4 py-3">
        <div>
          <h2 className="text-lg font-bold">Tasky 보드</h2>
          <p className="text-sm text-muted-foreground">
            카드를 직접 옮기거나, Tasky Shot으로 원하는 구역에 업무를 넣을 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-[240px] max-w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="task 검색"
              className="h-10 pl-9"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm select-none">
            <Checkbox checked={showDeleted} onCheckedChange={(value) => setShowDeleted(Boolean(value))} />
            보관함 포함
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 lg:auto-rows-[minmax(280px,auto)]">
        {QUADRANTS.map((quadrant) => (
          <div
            key={quadrant.id}
            data-quadrant={quadrant.id}
            className={cn(
              "relative flex min-h-[280px] flex-col gap-3 overflow-hidden rounded-[1.75rem] p-4 shadow-[0_20px_40px_rgba(15,23,42,0.05)]",
              quadrant.bg,
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={cn("text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80", quadrant.fg)}>
                  {quadrant.subtitle}
                </div>
                <h3 className={cn("text-2xl font-bold", quadrant.fg)}>{quadrant.title}</h3>
                <p className={cn("mt-1 text-xs opacity-75", quadrant.fg)}>{quadrant.hint}</p>
              </div>
              <button
                onClick={() => {
                  setAdding(quadrant.id);
                  setNewTitle("");
                }}
                className={cn("rounded-full p-1.5 transition hover:bg-black/10 dark:hover:bg-white/10", quadrant.fg)}
                aria-label="Add task"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div
              className="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto rounded-[1.1rem]"
              onDragOver={(e) => {
                if (!gameMode) e.preventDefault();
              }}
              onDrop={(e) => {
                if (gameMode) return;
                e.preventDefault();
                const taskId = e.dataTransfer.getData("text/task-id") || e.dataTransfer.getData("text/plain");
                if (taskId) handleDrop(quadrant.id, taskId);
              }}
            >
              <AnimatePresence>
                {tasksByQuadrant(quadrant.id).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    comments={commentsByTask[task.id] ?? []}
                    members={members}
                    draggable={!gameMode}
                    fg={quadrant.fg}
                  />
                ))}
              </AnimatePresence>

              {tasksByQuadrant(quadrant.id).length === 0 && (
                <div className={cn("text-xs italic opacity-60", quadrant.fg)}>
                  아직 들어온 카드가 없습니다.
                </div>
              )}
            </div>

            {adding === quadrant.id && (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  submitNew(quadrant.id);
                }}
                className="flex gap-2"
              >
                <Input
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onBlur={() => submitNew(quadrant.id)}
                  placeholder="업무 제목을 입력하세요"
                  className="h-8 bg-background/70 text-sm"
                />
                <Button type="submit" size="sm" className="h-8">
                  추가
                </Button>
              </motion.form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDeadline(deadline?: string) {
  return deadline ? deadline.replaceAll("-", "/") : "";
}

function normalizeDeadlineInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}/${digits.slice(4)}`;
  return `${digits.slice(0, 4)}/${digits.slice(4, 6)}/${digits.slice(6)}`;
}

function parseDeadlineInput(value: string) {
  const match = value.trim().match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  const normalized = `${year}-${month}-${day}`;
  const date = new Date(`${normalized}T00:00:00`);

  if (Number.isNaN(date.getTime())) return null;
  if (date.getFullYear() !== Number(year)) return null;
  if (date.getMonth() + 1 !== Number(month)) return null;
  if (date.getDate() !== Number(day)) return null;

  return normalized;
}

function TaskCard({
  task,
  comments,
  members,
  draggable,
  fg,
}: {
  task: Task;
  comments: TaskComment[];
  members: Member[];
  draggable: boolean;
  fg: string;
}) {
  const toggleComplete = useTaskStore((s) => s.toggleComplete);
  const deleteTask = useTaskStore((s) => s.deleteTask);
  const restoreTask = useTaskStore((s) => s.restoreTask);
  const setDeadline = useTaskStore((s) => s.setDeadline);
  const updateTask = useTaskStore((s) => s.updateTask);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState(formatDeadline(task.deadline));

  useEffect(() => {
    setDeadlineDraft(formatDeadline(task.deadline));
  }, [task.deadline]);

  const dim = task.deleted || task.completed;
  const owner = members.find((member) => member.user_id === task.owner_id);
  const mentioned = members.filter((member) => task.mentions.includes(member.user_id));

  const toggleMention = (uid: string) => {
    const next = task.mentions.includes(uid)
      ? task.mentions.filter((x) => x !== uid)
      : [...task.mentions, uid];
    void updateTask(task.id, { mentions: next });
  };

  return (
    <>
      <motion.div
        layout
        draggable={draggable && !dim}
        onDragStart={(e) => {
          setDragging(true);
          e.dataTransfer.setData("text/task-id", task.id);
          e.dataTransfer.setData("text/plain", task.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        onDragEnd={() => {
          requestAnimationFrame(() => setDragging(false));
        }}
        onClick={() => {
          if (!dragging) setOpen(true);
        }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: dim ? 0.45 : 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        transition={{ type: "spring", stiffness: 380, damping: 28 }}
        className={cn(
          "task-chip group max-w-full cursor-grab select-none active:cursor-grabbing",
          dim && "cursor-default line-through",
          fg,
        )}
        data-task-id={task.id}
      >
        {owner && (
          <img
            src={owner.avatar_url}
            alt={owner.nickname}
            title={`담당자 ${owner.nickname}`}
            className="mr-0.5 -ml-1 h-4 w-4 rounded-full border border-white/40 object-cover"
          />
        )}
        <span className="max-w-[150px] truncate">{task.title}</span>
        {task.deadline && <span className="text-[10px] opacity-80">{formatDeadline(task.deadline)}</span>}
        {mentioned.length > 0 && (
          <span className="inline-flex items-center text-[10px] opacity-80">
            <AtSign className="h-2.5 w-2.5" />
            {mentioned.length}
          </span>
        )}
        {comments.length > 0 && (
          <span className="inline-flex items-center text-[10px] opacity-80">
            <MessageCircle className="h-2.5 w-2.5" />
            {comments.length}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                title="담당자 지정"
                className="p-0.5"
              >
                <UserPlus className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 space-y-1 p-2" align="end">
              <div className="px-1.5 text-[10px] font-semibold uppercase text-muted-foreground">담당자</div>
              <button
                onClick={() => void updateTask(task.id, { owner_id: null })}
                className={cn("w-full rounded px-2 py-1 text-left text-xs hover:bg-muted", !task.owner_id && "bg-muted")}
              >
                미지정
              </button>
              {members.map((member) => (
                <button
                  key={member.user_id}
                  onClick={() => void updateTask(task.id, { owner_id: member.user_id })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted",
                    task.owner_id === member.user_id && "bg-muted",
                  )}
                >
                  <img src={member.avatar_url} alt="" className="h-5 w-5 rounded-full" />
                  <span className="truncate">{member.nickname}</span>
                </button>
              ))}

              <div className="px-1.5 pt-2 text-[10px] font-semibold uppercase text-muted-foreground">멘션</div>
              {members.map((member) => {
                const on = task.mentions.includes(member.user_id);
                return (
                  <button
                    key={`mention-${member.user_id}`}
                    onClick={() => toggleMention(member.user_id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted",
                      on && "bg-primary/15 text-primary",
                    )}
                  >
                    <AtSign className="h-3 w-3" />
                    <span className="truncate">{member.nickname}</span>
                    {on && <X className="ml-auto h-3 w-3" />}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()}
                title="마감일"
                className="p-0.5"
              >
                <CalIcon className="h-3 w-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-3" align="end" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase text-muted-foreground">마감일</div>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="YYYY/MM/DD"
                  value={deadlineDraft}
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    const next = normalizeDeadlineInput(e.target.value);
                    setDeadlineDraft(next);

                    const parsed = parseDeadlineInput(next);
                    if (parsed) {
                      void setDeadline(task.id, parsed);
                    }

                    if (!next.trim()) {
                      void setDeadline(task.id, undefined);
                    }
                  }}
                />
                {task.deadline && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      void setDeadline(task.id, undefined);
                    }}
                  >
                    날짜 지우기
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {!dim ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleComplete(task.id);
                }}
                title="완료"
                className="p-0.5"
              >
                <Check className="h-3 w-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteTask(task.id);
                }}
                title="삭제"
                className="p-0.5"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                void restoreTask(task.id);
              }}
              title="복구"
              className="p-0.5"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </motion.div>

      <TaskDetailDialog open={open} onOpenChange={setOpen} task={task} members={members} comments={comments} />
    </>
  );
}

function TaskDetailDialog({
  open,
  onOpenChange,
  task,
  members,
  comments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task;
  members: Member[];
  comments: TaskComment[];
}) {
  const userId = useTaskStore((s) => s.userId);
  const addComment = useTaskStore((s) => s.addComment);

  const [content, setContent] = useState("");
  const [mentions, setMentions] = useState<string[]>([]);
  const [rewriting, setRewriting] = useState(false);

  const owner = members.find((member) => member.user_id === task.owner_id);
  const taskMentions = members.filter((member) => task.mentions.includes(member.user_id));

  const submitComment = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    await addComment(task.id, trimmed, mentions);
    setContent("");
    setMentions([]);
  };

  const toggleCommentMention = (targetId: string) => {
    setMentions((current) =>
      current.includes(targetId) ? current.filter((item) => item !== targetId) : [...current, targetId],
    );
  };

  const rewriteForManager = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;

    setRewriting(true);
    try {
      const result = await rewriteManagerComment({ data: { content: trimmed } });
      setContent(result.rewritten);
      toast("AI 재작성 완료", {
        description: "팀장 보고용 톤으로 문장을 다시 정리했습니다.",
      });
    } catch (error) {
      console.error(error);
      setContent(formatCommentForManager(trimmed));
      toast("AI 재작성 실패", {
        description: "현재는 로컬 톤 정리 방식으로 대신 반영했습니다. OPENAI_API_KEY를 확인해 주세요.",
      });
    } finally {
      setRewriting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>
            task 상세를 보고 댓글과 멘션을 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/12 px-2 py-1 text-[10px] font-semibold text-primary">
                {task.quadrant}
              </span>
              {task.deadline && (
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                  {formatDeadline(task.deadline)}
                </span>
              )}
              {owner && (
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                  담당 {owner.nickname}
                </span>
              )}
            </div>

            {taskMentions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {taskMentions.map((member) => (
                  <span
                    key={member.user_id}
                    className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-foreground"
                  >
                    @{member.nickname}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold">댓글</div>
            <div className="max-h-[260px] space-y-3 overflow-y-auto rounded-2xl border border-border p-3">
              {comments.length === 0 ? (
                <div className="text-sm text-muted-foreground">아직 댓글이 없습니다.</div>
              ) : (
                comments.map((comment) => {
                  const author = members.find((member) => member.user_id === comment.user_id);
                  const commentMentions = members.filter((member) => comment.mentions.includes(member.user_id));
                  const isMine = comment.user_id === userId;

                  return (
                    <div key={comment.id} className="rounded-2xl bg-muted/35 p-3">
                      <div className="flex items-center gap-2">
                        {author && (
                          <img
                            src={author.avatar_url}
                            alt={author.nickname}
                            className="h-7 w-7 rounded-full object-cover"
                          />
                        )}
                        <div className="text-sm font-semibold">
                          {author?.nickname ?? "익명"}
                          {isMine ? " (나)" : ""}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(comment.created_at).toLocaleString("ko-KR")}
                        </div>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.content}</div>
                      {commentMentions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {commentMentions.map((member) => (
                            <span
                              key={member.user_id}
                              className="rounded-full bg-background px-2 py-1 text-[11px] font-medium text-primary"
                            >
                              @{member.nickname}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-border p-4">
            <div className="text-sm font-semibold">댓글 추가</div>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="댓글을 입력하세요"
              className="min-h-[96px]"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" onClick={() => void rewriteForManager()} disabled={!content.trim() || rewriting}>
                [팀장님 보고용]
              </Button>
              <span className="text-[11px] text-muted-foreground">
                {rewriting
                  ? "AI가 맥락을 보고 자연스럽게 다시 작성하는 중입니다."
                  : "AI가 초안의 맥락을 보고 팀장 보고용 문장으로 다시 작성합니다."}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {members.map((member) => {
                const active = mentions.includes(member.user_id);
                return (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => toggleCommentMention(member.user_id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground",
                    )}
                  >
                    @{member.nickname}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void submitComment()} disabled={!content.trim()}>
                댓글 등록
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatCommentForManager(input: string) {
  const cleaned = input
    .replace(/\s+/g, " ")
    .replace(/[~!]{2,}/g, " ")
    .replace(/[ㅋㅎ]{2,}/g, "")
    .trim();

  const normalized = cleaned
    .replace(/빨리/g, "신속히")
    .replace(/대충/g, "우선")
    .replace(/망함/g, "이슈가 발생한 상태입니다")
    .replace(/문제있음/g, "문제가 확인되었습니다")
    .replace(/안됨/g, "정상 동작하지 않고 있습니다")
    .replace(/해줘요?/g, "부탁드립니다")
    .replace(/봐줘요?/g, "확인 부탁드립니다");

  const sentence = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;

  if (sentence.length <= 28) {
    return `공유드립니다. ${sentence} 확인 부탁드립니다.`;
  }

  if (sentence.includes("원인") || sentence.includes("이슈") || sentence.includes("문제")) {
    return `현황 공유드립니다. ${sentence} 우선 확인된 내용 기준으로 정리드리며, 추가 확인 후 이어서 업데이트드리겠습니다.`;
  }

  if (sentence.includes("완료") || sentence.includes("반영") || sentence.includes("수정")) {
    return `진행 상황 공유드립니다. ${sentence} 필요한 후속 조치가 있으면 이어서 반영하겠습니다.`;
  }

  return `현황 공유드립니다. ${sentence} 세부 내용은 이어서 업데이트드리겠습니다.`;
}
