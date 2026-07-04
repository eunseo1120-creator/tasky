import { useEffect, useRef } from "react";
import { useTaskStore } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import { toast } from "sonner";

export function ScheduleBombWatcher() {
  const tasks = useTaskStore((s) => s.tasks);
  const moveTask = useTaskStore((s) => s.moveTask);
  const bombDays = useUIStore((s) => s.slingshot.bombDays);

  const armed = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const thresholdMs = bombDays * 24 * 60 * 60 * 1000;
      for (const t of tasks) {
        if (t.deleted || t.completed) continue;
        if (t.quadrant !== "schedule") {
          const handle = armed.current.get(t.id);
          if (handle) {
            clearTimeout(handle);
            armed.current.delete(t.id);
            document
              .querySelector(`[data-task-id="${t.id}"]`)
              ?.classList.remove("bomb-blink");
          }
          continue;
        }

        const age = now - new Date(t.created_at).getTime();
        if (age >= thresholdMs && !armed.current.has(t.id)) {
          const el = document.querySelector(`[data-task-id="${t.id}"]`);
          el?.classList.add("bomb-blink");
          toast(`일정 폭탄 경고: ${t.title}`, {
            description: "오래 방치된 업무라 5초 뒤 진행 중 업무로 이동합니다.",
          });
          const handle = window.setTimeout(() => {
            armed.current.delete(t.id);
            el?.classList.remove("bomb-blink");
            void moveTask(t.id, "do");
            toast(`이동 완료: ${t.title}`, {
              description: "방치 기간이 지나 진행 중 업무 구역으로 이동했습니다.",
            });
          }, 5000);
          armed.current.set(t.id, handle);
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [tasks, moveTask, bombDays]);

  return null;
}
