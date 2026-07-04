import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useUIStore } from "@/store/useUIStore";

const SIGH_LINES = [
  "지금 꼭 오늘 안에 드려야 하나요...",
  "월요일 아침에 주셔도 괜찮지 않을까요?",
  "한 번 더 생각해 보자는 뜻입니다.",
  "팀원도 숨은 쉬어야 합니다.",
];

export function BossCharacter() {
  const tick = useUIStore((s) => s.bossSighTick);
  const [sighing, setSighing] = useState(false);
  const [line, setLine] = useState(SIGH_LINES[0]);

  useEffect(() => {
    if (tick === 0) return;
    setLine(SIGH_LINES[tick % SIGH_LINES.length]);
    setSighing(true);
    const t = setTimeout(() => setSighing(false), 1800);
    return () => clearTimeout(t);
  }, [tick]);

  return (
    <div className="pointer-events-none absolute bottom-6 left-4 z-30 select-none">
      <div className="relative">
        <AnimatePresence>
          {sighing && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.8 }}
              animate={{ opacity: 1, y: -4, scale: 1 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
              className="absolute -top-12 left-12 whitespace-nowrap rounded-2xl border bg-card px-3 py-2 text-xs shadow-md"
            >
              {line}
              <span className="absolute -bottom-1 left-3 h-2 w-2 rotate-45 border-b border-r bg-card" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          animate={
            sighing
              ? { y: [0, -2, 0, -2, 0], rotate: [0, -3, 0, -3, 0] }
              : { y: [0, -1, 0], rotate: 0 }
          }
          transition={
            sighing
              ? { duration: 1.4, ease: "easeInOut" }
              : { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }
          className="grid h-14 w-14 place-items-center rounded-full border-2 border-orange-500/30 bg-gradient-to-br from-orange-100 to-orange-300 text-2xl shadow-lg"
          title="팀장님"
        >
          {sighing ? "휴..." : "😮"}
        </motion.div>
        <div className="mt-1 text-center text-[10px] font-semibold text-muted-foreground">
          팀장님
        </div>
      </div>
    </div>
  );
}
