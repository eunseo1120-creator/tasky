import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BriefcaseBusiness,
  Calendar,
  Crown,
  Gamepad2,
  Home,
  LogOut,
  Moon,
  Music,
  Music2,
  Pencil,
  X,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  Trophy,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { CalendarView } from "@/components/CalendarView";
import { Matrix } from "@/components/Matrix";
import { ProfileForm } from "@/components/ProfileForm";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { JOBKOREA_POSTINGS, getJobkoreaOpenUrl } from "@/lib/jobkorea";
import { syncProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/store/useProfileStore";
import { useTaskStore } from "@/store/useTaskStore";
import { TRACKS, useUIStore } from "@/store/useUIStore";

import { ScheduleBombWatcher } from "./ScheduleBombWatcher";
import { Slingshot } from "./Slingshot";

const REQUIRED_JOBKOREA_CLICKS = 7;
const FIREWORKS = [
  { left: "8%", top: "10%", color: "bg-amber-300" },
  { left: "84%", top: "12%", color: "bg-sky-300" },
  { left: "18%", top: "72%", color: "bg-rose-300" },
  { left: "74%", top: "76%", color: "bg-emerald-300" },
  { left: "50%", top: "18%", color: "bg-fuchsia-300" },
  { left: "50%", top: "52%", color: "bg-orange-300" },
  { left: "30%", top: "34%", color: "bg-cyan-300" },
  { left: "68%", top: "30%", color: "bg-lime-300" },
];

export function AppShell() {
  const tab = useUIStore((s) => s.tab);
  const setTab = useUIStore((s) => s.setTab);
  const gameMode = useUIStore((s) => s.gameMode);
  const toggleGame = useUIStore((s) => s.toggleGame);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const bgm = useUIStore((s) => s.bgm);
  const toggleBgm = useUIStore((s) => s.toggleBgm);
  const trackId = useUIStore((s) => s.trackId);
  const setTrackId = useUIStore((s) => s.setTrackId);

  const room = useTaskStore((s) => s.room);
  const leaveRoom = useTaskStore((s) => s.leaveRoom);
  const userId = useTaskStore((s) => s.userId);
  const members = useTaskStore((s) => s.members);
  const onlineIds = useTaskStore((s) => s.onlineIds);
  const tasks = useTaskStore((s) => s.tasks);
  const setSelfStatus = useTaskStore((s) => s.setSelfStatus);
  const syncPresence = useTaskStore((s) => s.syncPresence);

  const profile = useProfileStore((s) => s.profile);
  const setProfileForRoom = useProfileStore((s) => s.setProfileForRoom);
  const score = useProfileStore((s) => s.score);
  const resetScore = useProfileStore((s) => s.resetScore);

  const [editingProfile, setEditingProfile] = useState(false);
  const [jobkoreaClicks, setJobkoreaClicks] = useState(0);
  const [jobkoreaOpen, setJobkoreaOpen] = useState(false);
  const [stealthMeetOpen, setStealthMeetOpen] = useState(false);

  const selfMember = useMemo(
    () => members.find((member) => member.user_id === userId) ?? null,
    [members, userId],
  );

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.deleted && !task.completed),
    [tasks],
  );

  const selectedJobRole = profile?.jobRole ?? selfMember?.jobRole ?? "인사담당";
  const relatedJobs = useMemo(
    () => JOBKOREA_POSTINGS.filter((posting) => posting.role === selectedJobRole),
    [selectedJobRole],
  );

  const mentionCount = useMemo(
    () =>
      activeTasks.filter((task) => userId && task.mentions.includes(userId) && task.created_by !== userId).length,
    [activeTasks, userId],
  );

  const dueCount = useMemo(
    () => activeTasks.filter((task) => Boolean(task.deadline)).length,
    [activeTasks],
  );

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stealthMeetVideoRef = useRef<HTMLVideoElement | null>(null);
  const currentTrackUrl = TRACKS.find((track) => track.id === trackId)?.url ?? TRACKS[0].url;

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    if (room && userId && profile) {
      void syncPresence();
    }
  }, [profile, room, syncPresence, userId]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true;
      audioRef.current.volume = 0.35;
    }

    const audio = audioRef.current;
    if (audio.src !== currentTrackUrl) audio.src = currentTrackUrl;
    if (bgm) audio.play().catch(() => undefined);
    else audio.pause();
  }, [bgm, currentTrackUrl]);

  useEffect(() => {
    const video = stealthMeetVideoRef.current;
    if (!video) return;

    if (stealthMeetOpen) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
  }, [stealthMeetOpen]);
  const onJobkoreaClick = () => {
    const next = Math.min(REQUIRED_JOBKOREA_CLICKS, jobkoreaClicks + 1);
    setJobkoreaClicks(next);

    if (next >= REQUIRED_JOBKOREA_CLICKS) {
      setJobkoreaOpen(true);
      toast("JobKorea 리스트를 열었습니다.", {
        description: `${selectedJobRole} 기준 공고를 보여줍니다.`,
      });
    }
  };

  const closeJobkorea = (open: boolean) => {
    setJobkoreaOpen(open);
    if (!open) setJobkoreaClicks(0);
  };

  const openStealthMeet = () => {
    if (!bgm) {
      toggleBgm();
    }
    setStealthMeetOpen(true);
    toast("Stealth Meet 실행", {
      description: "화면에는 미팅, 귀에는 BGM이 유지됩니다.",
    });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-r border-sidebar-border bg-sidebar px-4 py-4 text-sidebar-foreground">
        <div className="rounded-[2rem] border border-sidebar-border bg-card/75 p-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Tasky
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight">일은 그대로, 흐름은 더 트렌디하게</h1>
          <div className="mt-4 text-xs text-muted-foreground">Room Code</div>
          <div className="mt-1 flex items-center justify-between">
            <span className="font-mono text-base font-semibold tracking-[0.24em]">{room}</span>
            <button
              onClick={() => void leaveRoom()}
              className="text-muted-foreground transition hover:text-foreground"
              title="룸 나가기"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-[1.75rem] border border-sidebar-border bg-card/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Room Members
          </div>
          <div className="space-y-2">
            {members.map((member) => {
              const online = onlineIds.has(member.user_id);
              const isMe = member.user_id === userId;
              return (
                <div key={member.user_id} className="rounded-2xl border border-border/70 bg-background/75 p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img
                        src={member.avatar_url}
                        alt={member.nickname}
                        className="h-10 w-10 rounded-full border bg-muted object-cover"
                      />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card",
                          online ? "bg-emerald-500" : "bg-muted-foreground/40",
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">
                        {member.nickname}
                        {isMe ? " (나)" : ""}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          {member.role === "manager" ? "팀장" : "팀원"}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          {member.jobRole}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            member.absent
                              ? member.blocked
                                ? "bg-rose-500/15 text-rose-600"
                                : "bg-amber-500/15 text-amber-700"
                              : "bg-emerald-500/15 text-emerald-700",
                          )}
                        >
                          {member.absent ? (member.blocked ? "배정 불가" : "부재 중") : "업무 가능"}
                        </span>
                      </div>
                    </div>
                    {member.role === "manager" && <Crown className="h-4 w-4 text-amber-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <nav className="mt-4 flex flex-col gap-2">
          <NavItem
            icon={<Home className="h-4 w-4" />}
            label="Tasky 보드"
            active={tab === "home"}
            onClick={() => setTab("home")}
          />
          <NavItem
            icon={<Calendar className="h-4 w-4" />}
            label="캘린더"
            active={tab === "calendar"}
            onClick={() => setTab("calendar")}
          />
        </nav>

        <div className="mt-4 grid gap-3">
          <StatCard label="Tasky Score" value={`${score.toLocaleString()}점`} />
          <StatCard label="활성 업무" value={`${activeTasks.length}건`} />
          <StatCard label="마감일 있는 task" value={`${dueCount}건`} />
          <StatCard label="협업 요청" value={`${mentionCount}건`} />
        </div>

        {profile && (
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.75rem] border border-sidebar-border bg-card/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    My Role
                  </div>
                  <div className="mt-2 text-sm font-semibold">
                    {profile.role === "manager" ? "팀장" : "팀원"} · {selectedJobRole}
                  </div>
                </div>
                <button
                  onClick={() => void setSelfStatus({ absent: !(selfMember?.absent ?? false) })}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                    selfMember?.absent ? "bg-amber-500 text-amber-950" : "bg-emerald-500 text-emerald-950",
                  )}
                >
                  {selfMember?.absent ? "부재 모드 ON" : "부재 모드 OFF"}
                </button>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                {selfMember?.blocked
                  ? "이벤트를 중도 포기한 상태입니다. 부재 모드를 종료하기 전까지는 업무 배정이 잠깁니다."
                  : selfMember?.absent
                    ? "부재 모드가 켜져 있습니다. 이벤트 흐름과 연결되는 상태입니다."
                    : "현재는 정상적으로 업무를 받을 수 있습니다."}
              </p>
            </div>

            <motion.button
              whileHover={{ y: -1 }}
              onClick={() => setEditingProfile(true)}
              className="flex w-full items-center gap-3 rounded-[1.75rem] border border-sidebar-border bg-card/70 p-3 text-left transition hover:bg-accent"
            >
              <div className="h-12 w-12 overflow-hidden rounded-2xl border bg-muted">
                <img src={profile.avatar} alt={profile.nickname} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{profile.nickname}</div>
                <div className="text-[11px] text-muted-foreground">
                  {profile.role === "manager" ? "팀장 계정" : "팀원 계정"} · {profile.jobRole}
                </div>
              </div>
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              animate={
                jobkoreaClicks >= REQUIRED_JOBKOREA_CLICKS
                  ? { scale: [1, 1.05, 0.96, 1], rotate: [0, 1, -1, 0] }
                  : undefined
              }
              transition={{ duration: 0.45 }}
              onClick={onJobkoreaClick}
              className="overflow-hidden rounded-[1.75rem] border border-sky-300/50 bg-[linear-gradient(135deg,#0b1221_0%,#1a3470_60%,#2c6dff_100%)] p-4 text-left text-white shadow-[0_18px_38px_rgba(16,24,40,0.16)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-100/80">
                    JobKorea Radar
                  </div>
                  <div className="mt-2 text-lg font-bold">JOBKOREA</div>
                  <div className="mt-1 text-xs text-sky-100/80">
                    {selectedJobRole} 직무 공고를 7번 클릭으로 열어보세요.
                  </div>
                </div>
                <BriefcaseBusiness className="h-5 w-5 text-sky-100" />
              </div>

              <div className="mt-4">
                <Progress value={(jobkoreaClicks / REQUIRED_JOBKOREA_CLICKS) * 100} className="h-2 bg-white/20" />
                <div className="mt-2 flex items-center justify-between text-[11px] text-sky-100/85">
                  <span>{jobkoreaClicks}/{REQUIRED_JOBKOREA_CLICKS} clicks</span>
                  <span>{jobkoreaClicks >= REQUIRED_JOBKOREA_CLICKS ? "오픈 완료" : "게이지 충전 중"}</span>
                </div>
              </div>
            </motion.button>
          </div>
        )}

        <div className="mt-6 rounded-[1.75rem] border border-sidebar-border bg-card/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-foreground/85">
            <Music2 className="h-3.5 w-3.5 text-primary" />
            Focus BGM
          </div>
          <div className="space-y-3">
            <Select value={trackId} onValueChange={setTrackId}>
              <SelectTrigger className="h-11 rounded-xl bg-background/85 text-sm">
                <SelectValue placeholder="재생할 BGM 선택" />
              </SelectTrigger>
              <SelectContent>
                {TRACKS.map((track) => (
                  <SelectItem key={track.id} value={track.id}>
                    {track.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-[11px] text-muted-foreground">
              현재 선택: {TRACKS.find((track) => track.id === trackId)?.name ?? "없음"}
            </div>
          </div>
        </div>
      </aside>

      <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-5">
        <div className="mb-4 grid gap-3 xl:grid-cols-[1.58fr_0.82fr]">
          <section className="rounded-[2rem] border border-border/75 bg-card/80 p-5 shadow-[0_24px_54px_rgba(15,23,42,0.06)]">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Tasky Demo Flow
            </div>
            <h2 className="mt-3 text-3xl font-bold">메인 보드와 JobKorea 탐색을 한 흐름으로</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
              룸 입장 시 선택한 직무를 기준으로, 업무 보드와 공고 탐색 경험이 자연스럽게 이어지도록
              연결했습니다. 팀원 상태, 마감일, 역할 정보도 같은 화면에서 바로 확인할 수 있습니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <HeroChip icon={<Target className="h-3.5 w-3.5" />} label="Tasky Shot" active={gameMode} />
              <HeroChip icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Absence Guard" />
              <HeroChip icon={<BriefcaseBusiness className="h-3.5 w-3.5" />} label={selectedJobRole} active />
              <HeroChip icon={<Music2 className="h-3.5 w-3.5" />} label="Focus BGM" active={bgm} />
            </div>
          </section>

          <section className="grid gap-3">
            <MiniStat label="온라인 팀원" value={`${onlineIds.size}명`} />
            <MiniStat label="활성 업무" value={`${activeTasks.length}건`} />
            <MiniStat label="Tasky Score" value={score.toLocaleString()} />
          </section>
        </div>

        <div className="min-h-fit flex-1 rounded-[2rem] border border-border/70 bg-background/70 p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="min-h-fit"
            >
              {tab === "home" ? <Matrix /> : <CalendarView />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>{gameMode && tab === "home" && <Slingshot key="sling" />}</AnimatePresence>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <Fab active={stealthMeetOpen} onClick={openStealthMeet} icon={<Video className="h-5 w-5" />} label="Stealth Meet" />
        <Fab active={gameMode} onClick={toggleGame} icon={<Gamepad2 className="h-5 w-5" />} label="Tasky Shot" />
        <Fab
          active={theme === "dark"}
          onClick={toggleTheme}
          icon={theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          label="Theme"
        />
        <Fab
          active={bgm}
          onClick={toggleBgm}
          icon={bgm ? <Music2 className="h-5 w-5" /> : <Music className="h-5 w-5" />}
          label="BGM"
        />
        <Fab active={false} onClick={resetScore} icon={<Trophy className="h-5 w-5" />} label="Reset Score" />
      </div>

      <AnimatePresence>
        {stealthMeetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-slate-950/78 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="relative h-full w-full p-4 md:p-6"
            >
              <div className="relative h-full w-full overflow-hidden rounded-[2rem] border border-white/12 bg-[#0f172a] shadow-[0_30px_90px_rgba(15,23,42,0.55)]">
                <video
                  ref={stealthMeetVideoRef}
                  className="h-full w-full object-cover"
                  src="/media/google-meet-demo.webm"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.28),transparent_22%,transparent_78%,rgba(2,6,23,0.32))]" />
                <div className="absolute right-5 top-5 z-10 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={toggleBgm}
                    className="h-11 w-11 rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md hover:bg-black/60"
                  >
                    {bgm ? <Music2 className="h-4.5 w-4.5" /> : <Music className="h-4.5 w-4.5" />}
                    <span className="sr-only">BGM toggle</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    onClick={() => setStealthMeetOpen(false)}
                    className="h-11 w-11 rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md hover:bg-black/60"
                  >
                    <X className="h-4.5 w-4.5" />
                    <span className="sr-only">Close Stealth Meet</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>프로필 수정</DialogTitle>
            <DialogDescription>닉네임, 역할, 직무를 다시 설정할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <ProfileForm
            initialNickname={profile?.nickname}
            initialAvatar={profile?.avatar}
            initialRole={profile?.role}
            initialJobRole={profile?.jobRole}
            submitLabel="저장하기"
            onSubmit={(nickname, avatar, role, jobRole) => {
              if (room) {
                setProfileForRoom(room, { nickname, avatar, role, jobRole });
              }
              void syncProfile(nickname, avatar);
              void syncPresence();
              setEditingProfile(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={jobkoreaOpen} onOpenChange={closeJobkorea}>
        <DialogContent className="max-w-3xl overflow-hidden border-primary/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(255,251,240,0.98)_42%,rgba(252,244,221,1)_100%)] shadow-[0_30px_90px_rgba(16,24,40,0.22)]">
          <JobkoreaCelebration />
          <DialogHeader className="relative z-20">
            <DialogTitle>JOBKOREA 추천 공고</DialogTitle>
            <DialogDescription>
              현재 선택 직무는 <strong>{selectedJobRole}</strong> 입니다. 같은 직무 기준 공고만 보여줍니다.
            </DialogDescription>
          </DialogHeader>
          <div className="relative z-20 space-y-3">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-primary/15 bg-white/70 px-4 py-3 backdrop-blur-sm"
            >
              <div>
                <div className="text-sm font-semibold">{selectedJobRole} 직무 공고 리스트</div>
                <div className="text-xs text-muted-foreground">
                  {relatedJobs.length}개의 샘플 공고를 현재 UI 안에서 바로 확인할 수 있습니다.
                </div>
              </div>
              <Button asChild>
                <a href={getJobkoreaOpenUrl(selectedJobRole)} target="_blank" rel="noreferrer">
                  JobKorea에서 이어 보기
                </a>
              </Button>
            </motion.div>

            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {relatedJobs.map((job) => (
                <article
                  key={`${job.role}-${job.company}-${job.title}`}
                  className="rounded-2xl border border-white/70 bg-white/78 p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)] backdrop-blur-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/12 px-2 py-1 text-[10px] font-semibold text-primary">
                      {job.role}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {job.career}
                    </span>
                    <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                      {job.period}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold">{job.company}</div>
                  <div className="mt-1 text-base font-bold">{job.title}</div>
                  <div className="mt-3">
                    <Button asChild variant="outline">
                      <a href={job.url} target="_blank" rel="noreferrer">
                        공고 열기
                      </a>
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Toaster />
      <ScheduleBombWatcher />
    </div>
  );
}

function JobkoreaCelebration() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18),transparent_58%)]" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,225,125,0.95)_0%,rgba(255,225,125,0.35)_38%,transparent_70%)] mix-blend-screen"
        initial={{ opacity: 0, scale: 0.25 }}
        animate={{ opacity: [0, 1, 0], scale: [0.25, 1.55, 2.1] }}
        transition={{ duration: 0.95, ease: "easeOut" }}
      />
      {FIREWORKS.map((item, index) => (
        <motion.div
          key={`${item.left}-${item.top}`}
          className="absolute"
          style={{ left: item.left, top: item.top }}
          initial={{ opacity: 0, scale: 0.25 }}
          animate={{ opacity: [0, 1, 0.18], scale: [0.25, 1.45, 1] }}
          transition={{ delay: index * 0.06, duration: 1.1, ease: "easeOut" }}
        >
          <div className="relative h-28 w-28">
            {Array.from({ length: 14 }).map((_, rayIndex) => (
              <motion.span
                key={rayIndex}
                className={cn("absolute left-1/2 top-1/2 h-12 w-1.5 rounded-full opacity-95 shadow-[0_0_14px_rgba(255,255,255,0.65)]", item.color)}
                style={{
                  transform: `translate(-50%, -100%) rotate(${rayIndex * (360 / 14)}deg)`,
                  transformOrigin: "center bottom",
                }}
                animate={{ scaleY: [0.2, 1.18, 0.5], opacity: [0, 1, 0.08] }}
                transition={{ delay: index * 0.06 + rayIndex * 0.015, duration: 0.88 }}
              />
            ))}
            <motion.span
              className={cn("absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.9)]", item.color)}
              animate={{ scale: [0.25, 1.45, 0.55], opacity: [0.15, 1, 0.18] }}
              transition={{ delay: index * 0.06, duration: 0.92 }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
        active ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function HeroChip({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
        active ? "border-primary/20 bg-primary text-primary-foreground" : "border-border bg-background/75 text-foreground",
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-[84px] items-center justify-between rounded-[1.35rem] border border-border/75 bg-card/80 px-5 py-4 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="shrink-0 text-right text-2xl font-bold leading-none">{value}</div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-sidebar-border bg-card/70 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </div>
        <div className="text-base font-bold">{value}</div>
      </div>
    </div>
  );
}

function Fab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      whileHover={{ scale: 1.05 }}
      onClick={onClick}
      title={label}
      className={cn(
        "relative grid h-12 w-12 place-items-center rounded-full border shadow-lg transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-accent",
      )}
    >
      {icon}
      <span className="sr-only">{label}</span>
      {active && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />}
    </motion.button>
  );
}
