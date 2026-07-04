import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Music2, ShieldCheck, Sparkles, Target, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureAuth, syncProfile } from "@/lib/auth";
import { useTaskStore } from "@/store/useTaskStore";
import { useProfileStore, type Profile } from "@/store/useProfileStore";

import { ProfileForm } from "./ProfileForm";

export function RoomGate({ children }: { children: React.ReactNode }) {
  const room = useTaskStore((s) => s.room);
  const joinRoom = useTaskStore((s) => s.joinRoom);
  const profile = useProfileStore((s) => s.profile);
  const profilesByRoom = useProfileStore((s) => s.profilesByRoom);
  const setProfileForRoom = useProfileStore((s) => s.setProfileForRoom);

  const [step, setStep] = useState<"room" | "profile">("room");
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;
  if (room && profile) return <>{children}</>;

  const submitRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const nextCode = code.trim().toUpperCase();
    if (!nextCode) return;

    setError(null);
    setPendingCode(nextCode);
    setStep("profile");
  };

  const enterRoom = async (nextCode: string, nextProfile: Profile) => {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      setProfileForRoom(nextCode, nextProfile);
      await ensureAuth();
      const userId = await syncProfile(nextProfile.nickname, nextProfile.avatar);
      await joinRoom(nextCode, userId);
    } catch (err) {
      console.error("[RoomGate] Could not join room", err);
      const message = err instanceof Error ? err.message : "알 수 없는 오류";
      setError(`룸에 입장하지 못했습니다. ${message}`);
    } finally {
      setBusy(false);
    }
  };

  const submitProfile = async (
    nickname: string,
    avatar: string,
    role: Profile["role"],
    jobRole: Profile["jobRole"],
  ) => {
    if (busy || !pendingCode) return;
    const nextProfile: Profile = { nickname, avatar, role, jobRole };
    await enterRoom(pendingCode, nextProfile);
  };

  const randomCode = () => Math.random().toString(36).slice(2, 7).toUpperCase();
  const pendingProfile = pendingCode ? profilesByRoom[pendingCode] ?? null : null;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(72,187,153,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(240,138,93,0.18),transparent_28%)]" />

      <div className="relative z-10 grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-card/80 px-4 py-2 text-xs font-semibold tracking-[0.2em] text-primary">
            <Sparkles className="h-4 w-4" />
            JOBKOREA VIBEATHON 2026
          </div>

          <h1 className="max-w-xl text-5xl font-display leading-none text-foreground sm:text-6xl">
            Tasky
          </h1>

          <p className="mt-3 text-lg font-semibold text-foreground/80">
            일은 그대로, 흐름은 더 가볍게.
          </p>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            업무를 없애는 서비스가 아니라, 업무를 덜 답답하게 만드는 협업 보드입니다.
            요청은 조금 더 재밌게, 상태 공유는 더 명확하게, 직무 탐색은 JobKorea와 자연스럽게
            연결합니다.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <FeatureCard
              icon={<Target className="h-4 w-4" />}
              title="Tasky Shot"
              body="업무를 바로 카드로 던지고, 필요한 사람에게 빠르게 연결합니다."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Absence Guard"
              body="부재 모드와 상태 제어 흐름을 한 화면 안에서 관리합니다."
            />
            <FeatureCard
              icon={<Music2 className="h-4 w-4" />}
              title="Focus Flow"
              body="작업 몰입을 해치지 않으면서 협업 상태를 자연스럽게 드러냅니다."
            />
          </div>
        </section>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel w-full rounded-[2rem] p-8 shadow-2xl"
        >
          <div className="mb-6 flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">
              Team Room Access
            </span>
          </div>

          <AnimatePresence mode="wait">
            {step === "room" ? (
              <motion.div
                key="room"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
              >
                <h2 className="mb-2 text-3xl font-bold">팀 룸에 입장하기</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  같은 룸 코드를 쓰는 팀원끼리 같은 보드를 실시간으로 함께 봅니다.
                </p>

                <form onSubmit={submitRoom} className="space-y-4">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="예: TASKY"
                      className="h-12 pl-9 text-base font-medium tracking-[0.25em] uppercase"
                      maxLength={12}
                      disabled={busy}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="h-11 flex-1" disabled={!code.trim() || busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "다음"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11"
                      onClick={() => setCode(randomCode())}
                      disabled={busy}
                    >
                      랜덤
                    </Button>
                  </div>

                  {error && <p className="text-sm text-destructive">{error}</p>}
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
              >
                <h2 className="mb-2 text-3xl font-bold">팀원 프로필 설정</h2>
                <p className="mb-6 text-sm text-muted-foreground">
                  룸 코드 <span className="font-mono font-semibold text-foreground">{pendingCode}</span>
                  로 입장합니다. 닉네임, 아바타, 역할, 직무를 정해 주세요.
                </p>

                <ProfileForm
                  initialNickname={pendingProfile?.nickname}
                  initialAvatar={pendingProfile?.avatar}
                  initialRole={pendingProfile?.role}
                  initialJobRole={pendingProfile?.jobRole}
                  onSubmit={(nickname, avatar, role, jobRole) =>
                    void submitProfile(nickname, avatar, role, jobRole)
                  }
                  submitLabel={busy ? "입장 중..." : "룸 입장"}
                  disabled={busy}
                />

                {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
                {pendingCode && !pendingProfile && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    이 방은 처음 입장하는 방이라 새 프로필로 저장됩니다.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl border border-border/70 bg-card/75 p-4 shadow-[0_18px_40px_rgba(16,24,40,0.05)]">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/14 text-primary">
        {icon}
      </div>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}
