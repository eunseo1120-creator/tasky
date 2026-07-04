import { useState } from "react";
import { Settings2, RotateCcw } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useUIStore, DEFAULT_SLINGSHOT } from "@/store/useUIStore";
import { motion } from "framer-motion";

export function SlingshotSettings() {
  const cfg = useUIStore((s) => s.slingshot);
  const setSlingshot = useUIStore((s) => s.setSlingshot);
  const reset = useUIStore((s) => s.resetSlingshot);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <motion.button
          whileHover={{ rotate: 45 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground shrink-0 hover:bg-accent"
          title="새총 설정"
        >
          <Settings2 className="h-4 w-4" />
        </motion.button>
      </PopoverTrigger>
      <PopoverContent side="top" align="end" className="w-80 space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">새총 감도 설정</div>
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
            <RotateCcw className="mr-1 h-3 w-3" /> 초기화
          </Button>
        </div>

        <Row
          label="중력"
          value={cfg.gravity}
          format={(v) => v.toFixed(2)}
          min={0}
          max={1.5}
          step={0.05}
          onChange={(v) => setSlingshot({ gravity: v })}
          hint="높을수록 더 빨리 떨어집니다."
        />
        <Row
          label="발사 힘"
          value={cfg.power}
          format={(v) => v.toFixed(2)}
          min={0.05}
          max={0.5}
          step={0.01}
          onChange={(v) => setSlingshot({ power: v })}
          hint="초기 속도 배율입니다."
        />
        <Row
          label="최대 당김"
          value={cfg.maxPull}
          format={(v) => `${Math.round(v)}px`}
          min={80}
          max={400}
          step={10}
          onChange={(v) => setSlingshot({ maxPull: v })}
          hint="새총 밴드를 얼마나 멀리 당길 수 있는지 정합니다."
        />
        <Row
          label="밴드 두께"
          value={cfg.bandStrength}
          format={(v) => v.toFixed(1)}
          min={1}
          max={8}
          step={0.5}
          onChange={(v) => setSlingshot({ bandStrength: v })}
          hint="시각적 탄성 강도입니다."
        />
        <Row
          label="정착 시간"
          value={cfg.settleMs}
          format={(v) => `${Math.round(v)}ms`}
          min={400}
          max={3000}
          step={100}
          onChange={(v) => setSlingshot({ settleMs: v })}
          hint="업무가 구역에 안착했다고 판단하는 시간입니다."
        />
        <Row
          label="과부하 기준"
          value={cfg.dailyLimit}
          format={(v) => `${Math.round(v)}건`}
          min={3}
          max={30}
          step={1}
          onChange={(v) => setSlingshot({ dailyLimit: v })}
          hint="오늘 등록량이 이 기준을 넘으면 과부하 표시가 붙습니다."
        />
        <Row
          label="일정 폭탄 기준"
          value={cfg.bombDays}
          format={(v) => `${Math.round(v)}일`}
          min={1}
          max={14}
          step={1}
          onChange={(v) => setSlingshot({ bombDays: v })}
          hint="오래 방치된 일정은 자동으로 진행 중 업무로 이동합니다."
        />

        <div className="border-t pt-1 text-[10px] text-muted-foreground">
          기본값: 중력 {DEFAULT_SLINGSHOT.gravity} / 발사 힘 {DEFAULT_SLINGSHOT.power} / 최대 당김 {DEFAULT_SLINGSHOT.maxPull}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Row({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-muted-foreground">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
