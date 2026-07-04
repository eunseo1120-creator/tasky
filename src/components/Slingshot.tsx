import { useEffect, useRef, useState } from "react";
import Matter from "matter-js";
import { motion, AnimatePresence } from "framer-motion";
import { useTaskStore, type Quadrant } from "@/store/useTaskStore";
import { useUIStore } from "@/store/useUIStore";
import { useProfileStore } from "@/store/useProfileStore";
import { Input } from "@/components/ui/input";
import { Target } from "lucide-react";
import { SlingshotSettings } from "./SlingshotSettings";

const ANCHOR_OFFSET_Y = 110;
const ANCHOR_X_RATIO = 0.78;

interface FlyingTask {
  id: string;
  title: string;
  body: Matter.Body;
  settled: boolean;
  launchedAt: number;
  overload: boolean;
}

interface Burst {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ScorePop {
  id: string;
  x: number;
  y: number;
  score: number;
  color: string;
  overload?: boolean;
}

export function Slingshot() {
  const addTask = useTaskStore((s) => s.addTask);
  const cfg = useUIStore((s) => s.slingshot);
  const pendingShot = useUIStore((s) => s.pendingShot);
  const setPendingShot = useUIStore((s) => s.setPendingShot);
  const triggerBossSigh = useUIStore((s) => s.triggerBossSigh);
  const addScore = useProfileStore((s) => s.addScore);
  const bumpDaily = useProfileStore((s) => s.bumpDaily);
  const dailyCount = useProfileStore((s) => s.dailyCount);
  const overloadArmed = dailyCount >= cfg.dailyLimit;

  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const flyingRef = useRef<FlyingTask[]>([]);
  const [title, setTitle] = useState("");
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null);
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [pops, setPops] = useState<ScorePop[]>([]);
  const [shake, setShake] = useState(0);
  const dragging = useRef(false);

  useEffect(() => {
    if (pendingShot) {
      setTitle(pendingShot);
      setPendingShot(null);
    }
  }, [pendingShot, setPendingShot]);

  useEffect(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    setAnchor({ x: width * ANCHOR_X_RATIO, y: height - ANCHOR_OFFSET_Y });

    const engine = Matter.Engine.create();
    engine.gravity.y = cfgRef.current.gravity;
    engineRef.current = engine;

    const render = Matter.Render.create({
      canvas: canvasRef.current!,
      engine,
      options: {
        width,
        height,
        wireframes: false,
        background: "transparent",
        pixelRatio: window.devicePixelRatio,
      },
    });
    Matter.Render.run(render);

    const runner = Matter.Runner.create();
    Matter.Runner.run(runner, engine);

    const wallOpts = { isStatic: true, render: { visible: false } };
    const walls = [
      Matter.Bodies.rectangle(width / 2, -25, width, 50, wallOpts),
      Matter.Bodies.rectangle(width / 2, height + 25, width, 50, wallOpts),
      Matter.Bodies.rectangle(-25, height / 2, 50, height, wallOpts),
      Matter.Bodies.rectangle(width + 25, height / 2, 50, height, wallOpts),
    ];
    Matter.Composite.add(engine.world, walls);

    const onResize = () => {
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      render.canvas.width = nextWidth;
      render.canvas.height = nextHeight;
      render.options.width = nextWidth;
      render.options.height = nextHeight;
      setAnchor({ x: nextWidth * ANCHOR_X_RATIO, y: nextHeight - ANCHOR_OFFSET_Y });
    };
    window.addEventListener("resize", onResize);

    const afterUpdate = () => {
      const now = performance.now();
      const settleMs = cfgRef.current.settleMs;
      flyingRef.current.forEach((ft) => {
        if (ft.settled) return;
        const speed = Math.hypot(ft.body.velocity.x, ft.body.velocity.y);
        const age = now - ft.launchedAt;
        const shouldSettle = age > settleMs || (age > 350 && speed < 0.6);
        if (!shouldSettle) return;

        const px = ft.body.position.x;
        const py = ft.body.position.y;
        const hit = detectQuadrantHit(px, py);
        if (hit) {
          ft.settled = true;
          void addTask({ title: ft.title, quadrant: hit.quadrant });
          const color = quadrantColor(hit.quadrant);
          const score = ft.overload ? hit.score * 2 : hit.score;
          addScore(score);
          if (hit.quadrant === "eliminate") triggerBossSigh();
          const popId = `${ft.id}-pop`;
          setBursts((b) => [...b, { id: ft.id, x: px, y: py, color }]);
          setPops((p) => [...p, { id: popId, x: px, y: py, score, color, overload: ft.overload }]);
          setTimeout(() => setBursts((b) => b.filter((x) => x.id !== ft.id)), 700);
          setTimeout(() => setPops((p) => p.filter((x) => x.id !== popId)), 1300);
          setTimeout(() => {
            if (engineRef.current) Matter.Composite.remove(engineRef.current.world, ft.body);
            flyingRef.current = flyingRef.current.filter((f) => f.id !== ft.id);
          }, 280);
        } else if (age > settleMs + 800) {
          ft.settled = true;
          triggerBossSigh();
          setTimeout(() => {
            if (engineRef.current) Matter.Composite.remove(engineRef.current.world, ft.body);
            flyingRef.current = flyingRef.current.filter((f) => f.id !== ft.id);
          }, 200);
        }
      });
    };
    Matter.Events.on(engine, "afterUpdate", afterUpdate);

    return () => {
      window.removeEventListener("resize", onResize);
      Matter.Events.off(engine, "afterUpdate", afterUpdate);
      Matter.Render.stop(render);
      Matter.Runner.stop(runner);
      Matter.Engine.clear(engine);
      flyingRef.current = [];
    };
  }, [addTask, addScore, triggerBossSigh]);

  useEffect(() => {
    if (engineRef.current) engineRef.current.gravity.y = cfg.gravity;
  }, [cfg.gravity]);

  const [, force] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      force((n) => (n + 1) % 1000000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!title.trim()) return;
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    setPull({ x: e.clientX, y: e.clientY });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - anchor.x;
    const dy = e.clientY - anchor.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, cfgRef.current.maxPull);
    const nx = anchor.x + (dx / (len || 1)) * clamped;
    const ny = anchor.y + (dy / (len || 1)) * clamped;
    setPull({ x: nx, y: ny });
  };

  const onPointerUp = () => {
    if (!dragging.current || !pull) {
      dragging.current = false;
      setPull(null);
      return;
    }
    dragging.current = false;
    const dx = anchor.x - pull.x;
    const dy = anchor.y - pull.y;
    const len = Math.hypot(dx, dy);
    if (len < 12 || !engineRef.current) {
      setPull(null);
      return;
    }

    const overload = overloadArmed;
    const body = Matter.Bodies.circle(anchor.x, anchor.y, overload ? 30 : 26, {
      restitution: 0.6,
      friction: 0.04,
      frictionAir: 0.008,
      density: 0.0014,
      render: {
        visible: false,
      },
    });
    const power = cfgRef.current.power;
    Matter.Body.setVelocity(body, { x: dx * power, y: dy * power });
    Matter.Composite.add(engineRef.current.world, body);
    flyingRef.current.push({
      id: crypto.randomUUID(),
      title: title.trim(),
      body,
      settled: false,
      launchedAt: performance.now(),
      overload,
    });
    bumpDaily();
    setTitle("");
    setPull(null);
    setShake((n) => n + 1);
  };

  const pullVec = pull ? { x: pull.x - anchor.x, y: pull.y - anchor.y } : { x: 0, y: 0 };
  const pullLen = Math.hypot(pullVec.x, pullVec.y);
  const powerGauge = Math.min(pullLen / cfg.maxPull, 1);

  const bandPath = pull
    ? `M ${anchor.x - 30} ${anchor.y - 20} Q ${pull.x} ${pull.y}, ${anchor.x + 30} ${anchor.y - 20}`
    : `M ${anchor.x - 30} ${anchor.y - 20} Q ${anchor.x} ${anchor.y - 30}, ${anchor.x + 30} ${anchor.y - 20}`;

  return (
    <div ref={containerRef} className="pointer-events-none fixed inset-0 z-40">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {flyingRef.current.map((ft) => (
        <motion.div
          key={ft.id}
          animate={{ scale: ft.settled ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 20 }}
          className="pointer-events-none absolute"
          style={{
            left: ft.body.position.x,
            top: ft.body.position.y,
            transform: `translate(-50%, -50%) rotate(${ft.body.angle}rad)`,
          }}
        >
          <div className={cnProjectile(ft.overload)}>
            <span className={cnProjectileCore(ft.overload)} />
            <span className={cnTaskBubble(ft.overload)}>{ft.title}</span>
          </div>
        </motion.div>
      ))}

      <AnimatePresence>
        {bursts.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 1, scale: 0 }}
            animate={{ opacity: 0, scale: 3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute rounded-full"
            style={{
              left: b.x - 30,
              top: b.y - 30,
              width: 60,
              height: 60,
              background: `radial-gradient(circle, ${b.color}aa 0%, transparent 70%)`,
            }}
          />
        ))}
      </AnimatePresence>

      <AnimatePresence>
        {pops.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 0, scale: 0.6 }}
            animate={{ opacity: [0, 1, 1, 0], y: -90, scale: [0.6, 1.2, 1, 0.95] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", times: [0, 0.15, 0.7, 1] }}
            className="pointer-events-none absolute select-none font-extrabold tracking-tight"
            style={{
              left: p.x,
              top: p.y,
              transform: "translate(-50%, -50%)",
              color: p.color,
              fontSize: 18 + Math.min(36, p.score * 0.32),
              textShadow: "0 2px 8px rgba(0,0,0,0.25), 0 0 2px rgba(255,255,255,0.6)",
            }}
          >
            +{p.score}
            {p.overload && <span className="ml-1 text-xs">x2</span>}
          </motion.div>
        ))}
      </AnimatePresence>

      <svg className="absolute inset-0 h-full w-full" style={{ overflow: "visible" }}>
        <g>
          <line
            x1={anchor.x}
            y1={anchor.y + 60}
            x2={anchor.x - 30}
            y2={anchor.y - 20}
            stroke="#7c4a1e"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <line
            x1={anchor.x}
            y1={anchor.y + 60}
            x2={anchor.x + 30}
            y2={anchor.y - 20}
            stroke="#7c4a1e"
            strokeWidth={8}
            strokeLinecap="round"
          />
          <circle cx={anchor.x - 30} cy={anchor.y - 20} r={5} fill="#5a3614" />
          <circle cx={anchor.x + 30} cy={anchor.y - 20} r={5} fill="#5a3614" />
        </g>
        <motion.path
          d={bandPath}
          stroke="var(--color-primary)"
          strokeWidth={cfg.bandStrength}
          fill="none"
          strokeLinecap="round"
          animate={{ opacity: pull ? 1 : 0.7 }}
        />
        {pull && (
          <line
            x1={anchor.x}
            y1={anchor.y}
            x2={anchor.x - pullVec.x * 1.8}
            y2={anchor.y - pullVec.y * 1.8}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="6 6"
            className="text-primary opacity-70"
          />
        )}
      </svg>

      <motion.div
        key={shake}
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1, x: [0, -4, 4, -2, 2, 0] }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ y: { duration: 0.3 }, x: { duration: 0.3 } }}
        className="pointer-events-auto absolute left-1/2 -translate-x-1/2"
        style={{ bottom: 24 }}
      >
        <div className="glass-panel flex min-w-[520px] items-center gap-3 rounded-[1.75rem] px-4 py-3 shadow-2xl">
          <motion.div
            animate={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Target className="h-5 w-5 text-primary" />
          </motion.div>
          <div className="flex flex-1 flex-col gap-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="업무를 입력한 뒤 뒤로 당겨 발사하세요..."
              className="h-9"
            />
            {overloadArmed ? (
              <div className="flex items-center gap-1 text-[10px] font-semibold text-orange-700 dark:text-orange-300">
                오늘 등록 업무가 많아 보여요. 다음 발사는 보너스 점수와 함께 들어갑니다.
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground">
                정확히 맞추면 카드가 등록되고, 빗나가면 Tasky가 살짝 삐끗합니다.
              </div>
            )}
          </div>
          <motion.div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            animate={
              title.trim() && !pull
                ? {
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      "0 0 0 0 rgba(60,157,123,0.45)",
                      "0 0 0 12px rgba(60,157,123,0)",
                      "0 0 0 0 rgba(60,157,123,0)",
                    ],
                  }
                : { scale: 1 }
            }
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            className={`relative grid h-12 w-12 cursor-grab place-items-center rounded-full select-none active:cursor-grabbing ${
              !title.trim()
                ? "bg-muted text-muted-foreground opacity-60"
                : overloadArmed
                  ? "border-2 border-orange-600 bg-orange-300 text-orange-950"
                  : "bg-primary text-primary-foreground"
            }`}
            style={{ touchAction: "none" }}
            title={title.trim() ? "뒤로 당겼다가 놓아 발사하세요." : "먼저 업무를 입력하세요."}
          >
            <div className={`h-3 w-3 rounded-full ${overloadArmed ? "bg-orange-950" : "bg-current"}`} />
          </motion.div>
          <div className="w-20">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full bg-primary"
                animate={{ width: `${powerGauge * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            </div>
            <div className="mt-1 text-center text-[10px] text-muted-foreground">장전력</div>
          </div>
          <SlingshotSettings />
        </div>
      </motion.div>
    </div>
  );
}

function detectQuadrantHit(
  x: number,
  y: number,
): { quadrant: Quadrant; score: number } | null {
  const els = document.querySelectorAll<HTMLElement>("[data-quadrant]");
  for (const el of Array.from(els)) {
    const r = el.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const nx = Math.abs(x - cx) / (r.width / 2);
      const ny = Math.abs(y - cy) / (r.height / 2);
      const d = Math.min(1, Math.max(nx, ny));
      const score = Math.max(1, Math.round(100 - 99 * d));
      return { quadrant: el.dataset.quadrant as Quadrant, score };
    }
  }
  return null;
}

function quadrantColor(q: Quadrant): string {
  const map: Record<Quadrant, string> = {
    do: "#ef6b57",
    schedule: "#3c9d7b",
    delegate: "#2f7ed8",
    eliminate: "#f0b44b",
  };
  return map[q];
}

function cnTaskBubble(overload: boolean) {
  return `max-w-[220px] truncate whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold shadow-lg ${
    overload
      ? "border border-orange-400/80 bg-orange-50 text-orange-900"
      : "border border-white/20 bg-primary text-primary-foreground"
  }`;
}

function cnProjectile(overload: boolean) {
  return `flex items-center gap-2 rounded-full px-2 py-2 shadow-[0_14px_26px_rgba(15,23,42,0.18)] ${
    overload ? "bg-orange-100/92" : "bg-white/92"
  }`;
}

function cnProjectileCore(overload: boolean) {
  return `block h-5 w-5 shrink-0 rounded-full border-2 ${
    overload ? "border-orange-700 bg-orange-400" : "border-white bg-primary"
  }`;
}
