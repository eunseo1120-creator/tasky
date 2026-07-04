import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTaskStore } from "@/store/useTaskStore";

function parseTaskDate(deadline?: string) {
  if (!deadline) return null;
  const date = parseISO(deadline);
  return isValid(date) ? date : null;
}

function formatDeadline(deadline?: string) {
  return deadline ? deadline.replaceAll("-", "/") : "";
}

export function CalendarView() {
  const tasks = useTaskStore((s) => s.tasks);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());

  const visibleTasks = useMemo(
    () => tasks.filter((task) => !task.deleted && !task.completed && task.deadline),
    [tasks],
  );

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const selectedTasks = useMemo(
    () =>
      visibleTasks.filter((task) => {
        const date = parseTaskDate(task.deadline);
        return date ? isSameDay(date, selectedDate) : false;
      }),
    [selectedDate, visibleTasks],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-border/70 bg-card/70 px-4 py-3">
        <div>
          <h2 className="text-lg font-bold">캘린더</h2>
          <p className="text-sm text-muted-foreground">
            메인 보드에서 지정한 마감일이 여기서 날짜별로 모입니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" onClick={() => setCursor(subMonths(cursor, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-32 text-center text-sm font-semibold">
            {format(cursor, "yyyy.MM")}
          </div>
          <Button type="button" variant="outline" size="icon" onClick={() => setCursor(addMonths(cursor, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="flex min-h-0 flex-col rounded-[1.75rem] border border-border/70 bg-card/70 p-4">
          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>

          <div className="grid flex-1 grid-cols-7 gap-2">
            {gridDays.map((day) => {
              const dayTasks = visibleTasks.filter((task) => {
                const date = parseTaskDate(task.deadline);
                return date ? isSameDay(date, day) : false;
              });

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "flex min-h-24 flex-col rounded-2xl border p-3 text-left transition",
                    isSameMonth(day, cursor)
                      ? "border-border bg-background/80"
                      : "border-border/50 bg-muted/35 text-muted-foreground",
                    isSameDay(day, selectedDate) && "border-primary bg-primary/8 shadow-sm",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{format(day, "d")}</span>
                    {dayTasks.length > 0 && (
                      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1 overflow-hidden">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        className="truncate rounded-full bg-primary/10 px-2 py-1 text-[11px] text-foreground"
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[11px] text-muted-foreground">+{dayTasks.length - 3} more</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col rounded-[1.75rem] border border-border/70 bg-card/70 p-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              Selected Day
            </div>
            <h3 className="mt-2 text-2xl font-bold">{format(selectedDate, "yyyy/MM/dd")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              이 날짜에 묶인 할 일을 확인합니다.
            </p>
          </div>

          <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto">
            {selectedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                이 날짜에는 연결된 task가 없습니다.
              </div>
            ) : (
              selectedTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-border bg-background/85 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-semibold">{task.title}</div>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold text-primary">
                      {task.quadrant}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    마감일 {task.deadline}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
