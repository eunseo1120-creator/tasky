import { Suspense, lazy } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Member } from "@/store/useTaskStore";
import { TEAM_GACHA_POOL } from "@/store/useUIStore";

const TeamChoreMachine = lazy(() => import("@/components/TeamChoreMachine"));

type TeamDrawMachineDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Member[];
  onSendToShot: (title: string) => void;
  onAssignTask: (input: { title: string; ownerId: string }) => Promise<void> | void;
};

export function TeamDrawMachineDialog({
  open,
  onOpenChange,
  members,
  onAssignTask,
}: TeamDrawMachineDialogProps) {
  if (!open) return null;

  const initialChores = TEAM_GACHA_POOL.map((title, index) => ({
    id: `tasky-gacha-${index}`,
    title,
    icon: "•",
    meta: "Tasky chore",
  }));

  const initialMembers = members
    .filter((member) => !member.blocked && member.assignable)
    .map((member) => ({
      id: member.user_id,
      name: member.nickname,
      avatar: member.nickname.slice(0, 1),
    }));

  const handleAssigned = (assignment: { choreTitle: string; memberId: string }) => {
    window.setTimeout(() => {
      void Promise.resolve(
        onAssignTask({
          title: assignment.choreTitle,
          ownerId: assignment.memberId,
        }),
      ).catch((error) => {
        console.error("[TeamDrawMachineDialog] Failed to persist draw result", error);
      });

      onOpenChange(false);
    }, 120);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94vh] max-w-[min(1280px,calc(100vw-24px))] overflow-y-auto border-0 bg-transparent p-0 shadow-none">
        <Suspense
          fallback={
            <div className="rounded-[2rem] border border-border/70 bg-card/95 p-8 text-center shadow-2xl">
              <div className="text-lg font-semibold">랜덤 뽑기 불러오는 중</div>
            </div>
          }
        >
          <TeamChoreMachine
            initialChores={initialChores}
            initialMembers={initialMembers}
            maxCandidates={5}
            onAssigned={(assignment) => {
              handleAssigned(assignment);
            }}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}
