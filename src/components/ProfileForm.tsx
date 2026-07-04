import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { BriefcaseBusiness, Crown, Shuffle, Upload, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JOBKOREA_ROLES, type JobkoreaRole } from "@/lib/jobkorea";
import { randomAvatarUrl, type Profile } from "@/store/useProfileStore";
import { cn } from "@/lib/utils";

interface Props {
  initialNickname?: string;
  initialAvatar?: string;
  initialRole?: Profile["role"];
  initialJobRole?: JobkoreaRole;
  onSubmit: (
    nickname: string,
    avatar: string,
    role: Profile["role"],
    jobRole: JobkoreaRole,
  ) => void;
  submitLabel?: string;
  disabled?: boolean;
  showRoleSelector?: boolean;
}

export function ProfileForm({
  initialNickname = "",
  initialAvatar,
  initialRole = "member",
  initialJobRole = "인사담당",
  onSubmit,
  submitLabel = "계속하기",
  disabled = false,
  showRoleSelector = true,
}: Props) {
  const [nickname, setNickname] = useState(initialNickname);
  const [avatar, setAvatar] = useState<string>(initialAvatar ?? randomAvatarUrl());
  const [role, setRole] = useState<Profile["role"]>(initialRole);
  const [jobRole, setJobRole] = useState<JobkoreaRole>(initialJobRole);
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = (file: File | null) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("이미지는 2MB 이하만 업로드할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) return;
    onSubmit(trimmed, avatar, role, jobRole);
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <motion.div
          key={avatar}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-primary/35 bg-muted"
        >
          <img src={avatar} alt="avatar" className="h-full w-full object-cover" />
        </motion.div>

        <div className="flex flex-1 flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAvatar(randomAvatarUrl())}
            className="justify-start"
            disabled={disabled}
          >
            <Shuffle className="mr-2 h-4 w-4" />
            랜덤 아바타
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
            className="justify-start"
            disabled={disabled}
          >
            <Upload className="mr-2 h-4 w-4" />
            사진 업로드
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
        </div>
      </div>

      <div className="relative">
        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="닉네임을 입력해 주세요"
          className="h-11 pl-9"
          maxLength={24}
          disabled={disabled}
        />
      </div>

      {showRoleSelector && (
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            입장 역할
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => setRole("manager")}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                role === "manager"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Crown className="h-4 w-4" />
                팀장
              </div>
              <div className="mt-1 text-xs leading-5 opacity-80">
                팀 업무를 분배하고 상태를 관리하는 역할입니다.
              </div>
            </button>

            <button
              type="button"
              disabled={disabled}
              onClick={() => setRole("member")}
              className={cn(
                "rounded-2xl border px-4 py-3 text-left transition",
                role === "member"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4" />
                팀원
              </div>
              <div className="mt-1 text-xs leading-5 opacity-80">
                본인 상태를 공유하고 팀장에게 업무를 받는 역할입니다.
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          내 직무
        </label>
        <div className="relative">
          <BriefcaseBusiness className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            value={jobRole}
            onChange={(e) => setJobRole(e.target.value as JobkoreaRole)}
            disabled={disabled}
            className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition focus-visible:ring-1 focus-visible:ring-ring"
          >
            {JOBKOREA_ROLES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-muted-foreground">
          선택한 직무 기준으로 나중에 JobKorea 추천 공고를 보여줍니다.
        </p>
      </div>

      <p className="text-[11px] text-muted-foreground">
        입장 후 같은 룸의 팀원들에게 닉네임과 아바타, 역할, 직무가 표시됩니다.
      </p>

      <Button type="submit" className="h-11 w-full" disabled={!nickname.trim() || disabled}>
        {submitLabel}
      </Button>
    </form>
  );
}
