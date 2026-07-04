import React, { useEffect, useId, useMemo, useRef, useState } from "react";

export type TeamChore = {
  id: string;
  title: string;
  icon?: string;
  meta?: string;
};

export type TeamMember = {
  id: string;
  name: string;
  avatar?: string;
};

export type ChoreAssignment = {
  id: string;
  choreId: string;
  choreTitle: string;
  choreIcon: string;
  memberId: string;
  memberName: string;
  memberAvatar: string;
  assignedAt: string;
};

type StatusState = {
  badge: string;
  title: string;
  text: string;
};

type TeamChoreMachineProps = {
  initialChores?: TeamChore[];
  initialMembers?: TeamMember[];
  maxCandidates?: number;
  onAssigned?: (assignment: ChoreAssignment) => void;
};

const defaultChores: TeamChore[] = [
  { id: "plant-water", title: "사무실 화분 물주기", icon: "🪴", meta: "5분 · 쉬움" },
  { id: "meeting-room", title: "회의실 정리", icon: "🧹", meta: "10분 · 보통" },
  { id: "snack-fill", title: "간식 채우기", icon: "🍪", meta: "15분 · 보통" },
  { id: "weekly-notes", title: "주간 회의록 작성", icon: "📝", meta: "30분 · 귀찮음" },
  { id: "pantry-clean", title: "탕비실 정리", icon: "☕", meta: "10분 · 보통" },
  { id: "dinner-place", title: "회식 장소 후보 찾기", icon: "🍽️", meta: "20분 · 탐색" },
];

const defaultMembers: TeamMember[] = [
  { id: "lilly", name: "Lilly", avatar: "🦊" },
  { id: "juhee", name: "주히", avatar: "🐰" },
  { id: "jung", name: "Jung", avatar: "🐥" },
  { id: "minji", name: "민지", avatar: "🐼" },
  { id: "daniel", name: "Daniel", avatar: "🐻" },
  { id: "hana", name: "Hana", avatar: "🐱" },
  { id: "sujin", name: "Sujin", avatar: "🐶" },
  { id: "alex", name: "Alex", avatar: "🐸" },
  { id: "yuna", name: "Yuna", avatar: "🦄" },
];

const avatars = ["🐻", "🐱", "🐶", "🐰", "🐼", "🦊", "🐯", "🐸", "🐥", "🦄"];

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function shuffle<T>(items: T[]) {
  const copied = [...items];
  for (let i = copied.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copied[i], copied[j]] = [copied[j], copied[i]];
  }
  return copied;
}

function pickCandidates(members: TeamMember[], maxCandidates: number) {
  if (members.length <= maxCandidates) return [...members];
  return shuffle(members).slice(0, maxCandidates);
}

export default function TeamChoreMachine({
  initialChores = defaultChores,
  initialMembers = defaultMembers,
  maxCandidates = 5,
  onAssigned,
}: TeamChoreMachineProps) {
  const selectId = useId();
  const resultTitleId = `${selectId}-result-title`;
  const playfieldRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLDivElement | null>(null);
  const basketRowRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const [chores, setChores] = useState<TeamChore[]>(() => initialChores);
  const [members, setMembers] = useState<TeamMember[]>(() => initialMembers);
  const [selectedChoreId, setSelectedChoreId] = useState(initialChores[0]?.id ?? "");
  const [taskInput, setTaskInput] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [activeCandidates, setActiveCandidates] = useState<TeamMember[]>(() =>
    initialMembers.slice(0, Math.min(maxCandidates, initialMembers.length))
  );
  const [assignments, setAssignments] = useState<ChoreAssignment[]>([]);
  const [rollingChore, setRollingChore] = useState<TeamChore | null>(null);
  const [result, setResult] = useState<ChoreAssignment | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [status, setStatus] = useState<StatusState>({
    badge: "READY",
    title: "기계 준비 완료",
    text: "잡무를 하나 선택한 뒤 START를 누르세요.",
  });

  const selectedChore = useMemo(
    () => chores.find((chore) => chore.id === selectedChoreId) ?? null,
    [chores, selectedChoreId]
  );

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function addChore() {
    const value = taskInput.trim();
    if (!value || isDrawing || isPreviewing) return;

    const newChore: TeamChore = {
      id: makeId("chore"),
      title: value,
      icon: "🧩",
      meta: "새 잡무",
    };

    setChores((prev) => [...prev, newChore]);
    setSelectedChoreId(newChore.id);
    setTaskInput("");
    setStatus({
      badge: "ADDED",
      title: "잡무 추가 완료",
      text: `"${value}" 업무가 내려보낼 목록에 들어갔어요.`,
    });
  }

  function removeChore(choreId: string) {
    if (isDrawing || isPreviewing) return;
    const remaining = chores.filter((chore) => chore.id !== choreId);
    setChores(remaining);
    if (selectedChoreId === choreId) setSelectedChoreId(remaining[0]?.id ?? "");
  }

  function addMember() {
    const value = memberInput.trim();
    if (!value || isDrawing || isPreviewing) return;

    const newMember: TeamMember = {
      id: makeId("member"),
      name: value,
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
    };
    const nextMembers = [...members, newMember];

    setMembers(nextMembers);
    setActiveCandidates(nextMembers.slice(0, Math.min(maxCandidates, nextMembers.length)));
    setMemberInput("");
    setStatus({
      badge: "MEMBER",
      title: "팀원 추가 완료",
      text: `${value}님이 뽑기 대상에 추가됐어요.`,
    });
  }

  function removeMember(memberId: string) {
    if (isDrawing || isPreviewing) return;
    const nextMembers = members.filter((member) => member.id !== memberId);
    setMembers(nextMembers);
    setActiveCandidates(nextMembers.slice(0, Math.min(maxCandidates, nextMembers.length)));
  }

  async function previewCandidates() {
    if (isDrawing || isPreviewing) return;

    setIsPreviewing(true);
    const finalCandidates = pickCandidates(members, maxCandidates);
    await animateCandidatePick(finalCandidates);
    setActiveCandidates(finalCandidates);
    setStatus({
      badge: "PREVIEW",
      title: "후보 미리 섞기 완료",
      text: "START를 누르면 후보를 다시 한 번 섞은 뒤 실제 뽑기가 시작돼요.",
    });
    setIsPreviewing(false);
  }

  async function animateCandidatePick(finalCandidates: TeamMember[]) {
    const rounds = members.length > maxCandidates ? 18 : 8;
    setStatus({
      badge: "PICKING",
      title: members.length > maxCandidates ? "바구니 후보 선발 중" : "참여 팀원 바구니 세팅 중",
      text:
        members.length > maxCandidates
          ? `팀원이 ${maxCandidates}명보다 많아서 먼저 바구니 후보를 뽑고 있어요.`
          : "참여 팀원이 후보 수 이하라서 모두 바구니에 들어갑니다.",
    });

    for (let i = 0; i < rounds; i += 1) {
      setActiveCandidates(pickCandidates(members, maxCandidates));
      await wait(80 + i * 8);
    }

    setActiveCandidates(finalCandidates);
    await wait(250);
  }

  async function startDraw() {
    if (isDrawing || isPreviewing) return;
    if (!selectedChore) {
      setStatus({ badge: "NO TASK", title: "잡무를 선택해주세요", text: "뽑을 업무를 먼저 선택해야 해요." });
      return;
    }
    if (members.length === 0) {
      setStatus({ badge: "NO MEMBER", title: "참여 팀원이 없어요", text: "팀원을 한 명 이상 추가해야 해요." });
      return;
    }

    setIsDrawing(true);
    setResult(null);
    setRollingChore(selectedChore);

    const finalCandidates = pickCandidates(members, maxCandidates);
    await animateCandidatePick(finalCandidates);
    setActiveCandidates(finalCandidates);
    await nextFrame();

    const winnerIndex = Math.floor(Math.random() * finalCandidates.length);
    const winner = finalCandidates[winnerIndex];

    setStatus({
      badge: "DRAWING",
      title: "업무 공 투입!",
      text: `"${selectedChore.title}" 공이 부드럽게 굴러 내려가기 시작했어요.`,
    });

    try {
      await playBallAnimation(winnerIndex);
    } catch {
      setStatus({
        badge: "ERROR",
        title: "뽑기 화면을 다시 확인해주세요",
        text: "공을 움직일 영역을 찾지 못했습니다. 컴포넌트가 렌더링된 뒤 다시 시도해주세요.",
      });
      setIsDrawing(false);
      setRollingChore(null);
      return;
    }

    const assignment: ChoreAssignment = {
      id: makeId("assignment"),
      choreId: selectedChore.id,
      choreTitle: selectedChore.title,
      choreIcon: selectedChore.icon ?? "🎯",
      memberId: winner.id,
      memberName: winner.name,
      memberAvatar: winner.avatar ?? "🙂",
      assignedAt: new Date().toISOString(),
    };

    setAssignments((prev) => [assignment, ...prev]);
    setResult(assignment);
    onAssigned?.(assignment);

    const remainingChores = chores.filter((chore) => chore.id !== selectedChore.id);
    setChores(remainingChores);
    setSelectedChoreId(remainingChores[0]?.id ?? "");
    setStatus({
      badge: "RESULT",
      title: `${winner.name}님 당첨!`,
      text: `"${selectedChore.title}" 업무가 ${winner.name}님에게 배정됐어요.`,
    });

    await wait(350);
    setRollingChore(null);
    setIsDrawing(false);
  }

  function resetAll() {
    if (isDrawing || isPreviewing) return;
    setChores(initialChores);
    setMembers(initialMembers);
    setSelectedChoreId(initialChores[0]?.id ?? "");
    setActiveCandidates(initialMembers.slice(0, Math.min(maxCandidates, initialMembers.length)));
    setAssignments([]);
    setResult(null);
    setRollingChore(null);
    setStatus({ badge: "RESET", title: "초기화 완료", text: "잡무와 팀원 목록이 기본값으로 돌아왔어요." });
  }

  function playBallAnimation(winnerIndex: number) {
    return new Promise<void>((resolve, reject) => {
      const playfield = playfieldRef.current;
      const ball = ballRef.current;
      const basketRow = basketRowRef.current;
      if (!playfield || !ball || !basketRow) {
        reject(new Error("Missing machine elements"));
        return;
      }

      const fieldRect = playfield.getBoundingClientRect();
      const baskets = Array.from(basketRow.querySelectorAll<HTMLElement>("[data-tcm-basket]"));
      const basket = baskets[winnerIndex];
      if (!basket) {
        reject(new Error("Missing winner basket"));
        return;
      }

      const basketRect = basket.getBoundingClientRect();
      const ballSize = ball.getBoundingClientRect().width || 56;
      const radius = ballSize / 2;
      const fieldWidth = fieldRect.width;
      const fieldHeight = fieldRect.height;
      const targetX = clamp(basketRect.left - fieldRect.left + basketRect.width / 2, radius + 16, fieldWidth - radius - 16);
      const targetY = clamp(
        basketRect.top - fieldRect.top + Math.min(42, basketRect.height * 0.5),
        radius + 80,
        fieldHeight - radius - 12
      );

      const pegShapes = Array.from(playfield.querySelectorAll<HTMLElement>("[data-tcm-peg]")).map((peg) => {
        const rect = peg.getBoundingClientRect();
        return {
          node: peg,
          x: rect.left - fieldRect.left + rect.width / 2,
          y: rect.top - fieldRect.top + rect.height / 2,
          radius: Math.max(rect.width, rect.height) / 2 + 5,
        };
      });

      const railShapes = Array.from(playfield.querySelectorAll<HTMLElement>("[data-tcm-rail]")).map((rail) => {
        const rect = rail.getBoundingClientRect();
        const style = window.getComputedStyle(rail);
        const width = Number.parseFloat(style.width) || rect.width;
        const height = Number.parseFloat(style.height) || rect.height || 12;
        const Matrix = window.DOMMatrixReadOnly || window.DOMMatrix;
        const matrix = style.transform === "none" || !Matrix ? { a: 1, b: 0 } : new Matrix(style.transform);
        const angle = Math.atan2(matrix.b, matrix.a);
        const cx = rect.left - fieldRect.left + rect.width / 2;
        const cy = rect.top - fieldRect.top + rect.height / 2;
        const dx = Math.cos(angle) * width / 2;
        const dy = Math.sin(angle) * width / 2;
        return {
          ax: cx - dx,
          ay: cy - dy,
          bx: cx + dx,
          by: cy + dy,
          thickness: height * 0.7,
        };
      });

      const nearestPointOnSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number) => {
        const abx = bx - ax;
        const aby = by - ay;
        const lengthSq = abx * abx + aby * aby || 1;
        const t = clamp(((px - ax) * abx + (py - ay) * aby) / lengthSq, 0, 1);
        return { x: ax + abx * t, y: ay + aby * t };
      };

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reducedMotion) {
        ball.style.transform = `translate(${targetX - radius}px, ${targetY - radius}px)`;
        resolve();
        return;
      }

      let x = fieldWidth * 0.5 + (Math.random() - 0.5) * 28;
      let y = 82;
      let vx = (Math.random() < 0.5 ? -1 : 1) * (70 + Math.random() * 80);
      let vy = 35;
      let rotation = 0;
      let squash = 0;
      let lastTime = performance.now();
      const startTime = lastTime;
      let settled = false;

      const updateBall = () => {
        const scaleX = 1 + squash * 0.16;
        const scaleY = 1 - squash * 0.12;
        ball.style.transform = `translate(${x - radius}px, ${y - radius}px) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
      };

      const setSquash = (amount: number) => {
        squash = Math.min(1.2, Math.max(squash, amount));
      };

      const bounce = (nx: number, ny: number, restitution: number) => {
        const dot = vx * nx + vy * ny;
        if (dot < 0) {
          const impulse = Math.abs(dot);
          vx -= (1 + restitution) * dot * nx;
          vy -= (1 + restitution) * dot * ny;
          setSquash(Math.min(1, impulse / 430));
        }
        vx *= 0.965;
        vy *= 0.982;
      };

      const finish = () => {
        if (settled) return;
        settled = true;
        const startX = x;
        const startY = y;
        const startRotation = rotation;
        const settleStart = performance.now();

        const settleFrame = (now: number) => {
          const t = clamp((now - settleStart) / 380, 0, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          x = startX + (targetX - startX) * eased;
          y = startY + (targetY - startY) * eased;
          rotation = startRotation + (targetX - startX) * eased * 1.4;
          squash = (1 - t) * 0.5;
          updateBall();

          if (t < 1) {
            rafRef.current = requestAnimationFrame(settleFrame);
            return;
          }
          resolve();
        };

        rafRef.current = requestAnimationFrame(settleFrame);
      };

      const step = (now: number) => {
        if (settled) return;

        const dt = Math.min((now - lastTime) / 1000, 0.032);
        const elapsed = (now - startTime) / 1000;
        lastTime = now;

        const laneInfluence =
          clamp((elapsed - 2.1) / 4.2, 0, 1) *
          clamp((y - fieldHeight * 0.42) / (fieldHeight * 0.36), 0, 1);
        const catchInfluence = clamp((y - (targetY - 150)) / 170, 0, 1);

        vx += (targetX - x) * (laneInfluence * 1.35 + catchInfluence * 2.4) * dt;
        vy += 430 * dt;
        if (elapsed > 5.8) {
          vx += (targetX - x) * 2.2 * dt;
          vy += (targetY - y) * 0.72 * dt;
        }

        vx *= Math.pow(0.985, dt * 60);
        vy *= Math.pow(0.996, dt * 60);
        squash *= Math.pow(0.84, dt * 60);
        vx = clamp(vx, -430, 430);
        vy = clamp(vy, -320, 650);

        x += vx * dt;
        y += vy * dt;
        rotation += (vx * dt / radius) * (180 / Math.PI);

        if (x < radius + 14) {
          x = radius + 14;
          vx = Math.abs(vx) * 0.58;
          setSquash(0.6);
        }
        if (x > fieldWidth - radius - 14) {
          x = fieldWidth - radius - 14;
          vx = -Math.abs(vx) * 0.58;
          setSquash(0.6);
        }
        if (y < radius + 70) {
          y = radius + 70;
          vy = Math.abs(vy) * 0.42;
        }
        if (y > fieldHeight - radius - 12) {
          y = fieldHeight - radius - 12;
          vy = -Math.abs(vy) * 0.28;
          vx *= 0.78;
          setSquash(0.7);
        }

        pegShapes.forEach((peg) => {
          const dx = x - peg.x;
          const dy = y - peg.y;
          const distance = Math.hypot(dx, dy) || 1;
          const minDistance = radius + peg.radius;
          if (distance >= minDistance) return;
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minDistance - distance;
          x += nx * overlap;
          y += ny * overlap;
          bounce(nx, ny, 0.66);
        });

        railShapes.forEach((rail) => {
          const point = nearestPointOnSegment(x, y, rail.ax, rail.ay, rail.bx, rail.by);
          const dx = x - point.x;
          const dy = y - point.y;
          const distance = Math.hypot(dx, dy) || 1;
          const minDistance = radius + rail.thickness;
          if (distance >= minDistance) return;
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = minDistance - distance;
          x += nx * overlap;
          y += ny * overlap;
          bounce(nx, ny, 0.52);
        });

        if (elapsed > 5.9 && Math.abs(x - targetX) < 24 && Math.abs(y - targetY) < 42) {
          finish();
          return;
        }
        if (elapsed > 8.2) {
          finish();
          return;
        }

        updateBall();
        rafRef.current = requestAnimationFrame(step);
      };

      updateBall();
      rafRef.current = requestAnimationFrame(step);
    });
  }

  const startDisabled = isDrawing || isPreviewing || chores.length === 0 || members.length === 0 || !selectedChoreId;

  return (
    <section className="tcm-root" aria-label="팀 잡무 뽑기 머신">
      <style>{teamChoreMachineStyles}</style>

      <aside className="tcm-panel">
        <p className="tcm-eyebrow">Team Chore Ball</p>
        <h2>잡무 뽑기 머신</h2>
        <p className="tcm-desc">
          내려보낼 업무를 고른 뒤 START를 누르세요. 공이 레일과 장애물에 튕기며 내려가고 마지막에 들어간
          바구니의 팀원이 담당자가 됩니다.
        </p>

        <div className="tcm-section-title">
          <span>1. 뽑을 잡무 선택</span>
          <small>선택 필수</small>
        </div>

        <div className="tcm-input-row">
          <input
            value={taskInput}
            onChange={(event) => setTaskInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addChore();
            }}
            placeholder="예: 회의실 정리"
            disabled={isDrawing || isPreviewing}
          />
          <button type="button" onClick={addChore} disabled={isDrawing || isPreviewing}>
            추가
          </button>
        </div>

        <label className="tcm-task-picker" htmlFor={selectId}>
          <span>내려보낼 업무</span>
          <select
            id={selectId}
            value={selectedChoreId}
            onChange={(event) => {
              setSelectedChoreId(event.target.value);
              const chore = chores.find((item) => item.id === event.target.value);
              if (chore) {
                setStatus({
                  badge: "SELECTED",
                  title: "내려보낼 업무 선택 완료",
                  text: `"${chore.title}" 업무 공을 기계에 넣을 준비가 됐어요.`,
                });
              }
            }}
            disabled={isDrawing || isPreviewing || chores.length === 0}
          >
            {chores.length === 0 ? (
              <option value="">내려보낼 업무가 없습니다</option>
            ) : (
              chores.map((chore) => (
                <option key={chore.id} value={chore.id}>
                  {chore.title} · {chore.meta ?? "잡무"}
                </option>
              ))
            )}
          </select>
        </label>

        <ul className="tcm-chore-list">
          {chores.map((chore) => (
            <li
              key={chore.id}
              className={`tcm-chore-item ${chore.id === selectedChoreId ? "is-selected" : ""}`}
              onClick={() => {
                if (isDrawing || isPreviewing) return;
                setSelectedChoreId(chore.id);
                setStatus({
                  badge: "SELECTED",
                  title: "내려보낼 업무 선택 완료",
                  text: `"${chore.title}" 업무 공을 기계에 넣을 준비가 됐어요.`,
                });
              }}
            >
              <span className="tcm-chore-icon">{chore.icon ?? "🎯"}</span>
              <span className="tcm-chore-text">
                <strong>{chore.title}</strong>
                <span>{chore.meta ?? "잡무"}</span>
              </span>
              <button
                type="button"
                aria-label={`${chore.title} 삭제`}
                onClick={(event) => {
                  event.stopPropagation();
                  removeChore(chore.id);
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className="tcm-section-title">
          <span>2. 참여 팀원</span>
          <small>{members.length}명</small>
        </div>

        <div className="tcm-input-row">
          <input
            value={memberInput}
            onChange={(event) => setMemberInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addMember();
            }}
            placeholder="예: 민수"
            disabled={isDrawing || isPreviewing}
          />
          <button type="button" onClick={addMember} disabled={isDrawing || isPreviewing}>
            추가
          </button>
        </div>

        <div className="tcm-member-pool">
          {members.map((member) => (
            <span className="tcm-member-chip" key={member.id}>
              <span>{member.avatar ?? "🙂"}</span>
              <span>{member.name}</span>
              <button type="button" aria-label={`${member.name} 삭제`} onClick={() => removeMember(member.id)}>
                ×
              </button>
            </span>
          ))}
        </div>

        <div className="tcm-section-title">
          <span>3. 이번 바구니 후보</span>
          <small>{maxCandidates}명 초과 시 {maxCandidates}명 선발</small>
        </div>

        <div className="tcm-candidate-strip">
          {Array.from({ length: maxCandidates }).map((_, index) => {
            const member = activeCandidates[index];
            return (
              <div className={`tcm-candidate-card ${isPreviewing ? "is-shuffling" : ""}`} key={`${member?.id ?? "empty"}-${index}`}>
                {member ? `${member.avatar ?? "🙂"} ${member.name}` : "-"}
              </div>
            );
          })}
        </div>

        <div className="tcm-status-box">
          <span>{status.badge}</span>
          <strong>{status.title}</strong>
          <p>{status.text}</p>
        </div>

        <button className="tcm-draw-btn" type="button" disabled={startDisabled} onClick={startDraw}>
          {isDrawing ? "ROLLING..." : "START"}
        </button>

        <div className="tcm-actions">
          <button type="button" onClick={previewCandidates} disabled={isDrawing || isPreviewing || members.length === 0}>
            후보 미리 섞기
          </button>
          <button type="button" onClick={resetAll} disabled={isDrawing || isPreviewing}>
            초기화
          </button>
        </div>

        <div className="tcm-assignment-panel" aria-live="polite">
          <strong>
            <span>최근 배정</span>
            <span>{assignments.length}건</span>
          </strong>
          <div className="tcm-assignment-list">
            {assignments.length === 0 ? (
              <div className="tcm-assignment-empty">아직 배정된 잡무가 없습니다.</div>
            ) : (
              assignments.slice(0, 6).map((assignment) => (
                <div className="tcm-assignment-item" key={assignment.id}>
                  <span>
                    {assignment.choreIcon} {assignment.choreTitle}
                  </span>
                  <em>{assignment.memberName}</em>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      <section className="tcm-machine-wrap">
        <div className={`tcm-machine ${isDrawing ? "is-drawing" : ""}`}>
          <div className="tcm-marquee">CHORE LUCKY MACHINE</div>
          <div className="tcm-light-strip is-left" />
          <div className="tcm-light-strip is-right" />

          <div className="tcm-playfield" ref={playfieldRef}>
            <div className="tcm-glass-shine" />
            <div className="tcm-selected-display">{selectedChore ? `${selectedChore.icon ?? "🎯"} ${selectedChore.title}` : "선택된 잡무가 여기에 표시됩니다"}</div>
            <div className="tcm-drop-gate" />

            <div className="tcm-mini-ball-row">
              <span />
              <span />
              <span />
            </div>

            <div className="tcm-gear is-g1" />
            <div className="tcm-gear is-g2" />
            <div className="tcm-gear is-g3" />

            <div className="tcm-turntable" />
            <div className="tcm-vertical-auger" />

            <div className="tcm-rail is-r1" data-tcm-rail />
            <div className="tcm-rail is-r2" data-tcm-rail />
            <div className="tcm-rail is-r3" data-tcm-rail />
            <div className="tcm-rail is-r4" data-tcm-rail />

            {["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"].map((peg) => (
              <span className={`tcm-peg is-${peg}`} data-tcm-peg key={peg} />
            ))}

            <div className="tcm-spiral-tube" />

            <div className="tcm-ball-layer">
              {rollingChore && (
                <div className="tcm-ball" ref={ballRef}>
                  <span>{rollingChore.icon ?? "🎯"}</span>
                  <em>{rollingChore.title}</em>
                </div>
              )}
            </div>

            <div
              className="tcm-basket-row"
              ref={basketRowRef}
              style={{ gridTemplateColumns: `repeat(${Math.max(1, activeCandidates.length)}, 1fr)` }}
            >
              {activeCandidates.map((member, index) => (
                <div className={`tcm-basket ${result?.memberId === member.id ? "is-winner" : ""}`} data-tcm-basket key={member.id}>
                  <span>{index + 1}</span>
                  <strong>
                    {member.avatar ?? "🙂"} {member.name}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {result && (
        <div className="tcm-result-modal" role="dialog" aria-modal="true" aria-labelledby={resultTitleId}>
          <div className="tcm-result-card">
            <span>ASSIGNED</span>
            <h2 id={resultTitleId}>{result.memberName}님 당첨!</h2>
            <p>공이 바구니에 들어가 배정이 확정됐습니다.</p>
            <div className="tcm-result-summary">
              <div>
                <span>담당자</span>
                <strong>
                  {result.memberAvatar} {result.memberName}
                </strong>
              </div>
              <div>
                <span>배정 업무</span>
                <strong>
                  {result.choreIcon} {result.choreTitle}
                </strong>
              </div>
            </div>
            <button type="button" onClick={() => setResult(null)}>
              확인
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const teamChoreMachineStyles = `
.tcm-root,
.tcm-root * {
  box-sizing: border-box;
}

.tcm-root {
  position: relative;
  width: min(1220px, 100%);
  min-height: 720px;
  display: grid;
  grid-template-columns: minmax(285px, 360px) minmax(0, 1fr);
  gap: clamp(14px, 2vw, 24px);
  padding: clamp(14px, 2.1vw, 24px);
  border-radius: 28px;
  background:
    radial-gradient(circle at 12% 8%, rgba(255,255,255,0.96), transparent 32%),
    linear-gradient(145deg, rgba(255,255,255,0.98), rgba(237,242,255,0.94) 54%, rgba(231,225,214,0.84));
  color: #111827;
  font-family: Inter, Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  overflow: hidden;
}

.tcm-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: 100%;
  overflow: auto;
  scrollbar-gutter: stable;
  padding: clamp(13px, 1.6vw, 18px);
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(249,250,251,0.88));
  border: 1px solid rgba(120,113,108,0.18);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.72), 0 18px 36px rgba(15,23,42,0.08);
}

.tcm-eyebrow {
  margin: 0 0 6px;
  color: #8b5a2b;
  font-size: 12px;
  font-weight: 1000;
}

.tcm-panel h2 {
  margin: 0;
  font-size: clamp(24px, 2.4vw, 30px);
  line-height: 1.15;
}

.tcm-desc {
  margin: 7px 0 12px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.38;
}

.tcm-section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 9px 0 6px;
  color: #374151;
  font-size: 13px;
  font-weight: 1000;
}

.tcm-section-title small {
  color: #8b5a2b;
  font-size: 11px;
  font-weight: 900;
  white-space: nowrap;
}

.tcm-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 62px;
  gap: 8px;
  margin-bottom: 8px;
}

.tcm-input-row input,
.tcm-task-picker select {
  min-width: 0;
  height: 40px;
  padding: 0 13px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  outline: none;
  background: #fff;
  color: #1f2937;
  font-size: 13px;
}

.tcm-input-row input:focus,
.tcm-task-picker select:focus {
  border-color: rgba(139,90,43,0.55);
  box-shadow: 0 0 0 4px rgba(139,90,43,0.13);
}

.tcm-input-row button,
.tcm-draw-btn,
.tcm-actions button,
.tcm-result-card button {
  border: 0;
  cursor: pointer;
  font-weight: 1000;
}

.tcm-input-row button {
  border-radius: 14px;
  background: #1f2937;
  color: #fff;
}

.tcm-input-row button:disabled,
.tcm-actions button:disabled,
.tcm-draw-btn:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.tcm-task-picker {
  display: grid;
  gap: 6px;
  margin-bottom: 8px;
}

.tcm-task-picker span {
  color: #57534e;
  font-size: 11px;
  font-weight: 1000;
}

.tcm-task-picker select {
  width: 100%;
  font-weight: 900;
}

.tcm-chore-list {
  display: grid;
  gap: 8px;
  max-height: clamp(74px, 13dvh, 116px);
  overflow: auto;
  padding: 0 2px 0 0;
  margin: 0;
  list-style: none;
}

.tcm-chore-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 8px;
  padding: 8px 9px;
  border-radius: 15px;
  background: rgba(255,255,255,0.86);
  border: 1px solid rgba(229,231,235,0.95);
  box-shadow: 0 6px 16px rgba(31,41,55,0.05);
  cursor: pointer;
}

.tcm-chore-item.is-selected {
  background: linear-gradient(135deg, rgba(255,248,225,0.92), rgba(236,229,218,0.96));
  border-color: rgba(139,90,43,0.45);
  box-shadow: 0 0 0 4px rgba(139,90,43,0.09), 0 10px 22px rgba(120,113,108,0.13);
}

.tcm-chore-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #f3f4f6;
  font-size: 15px;
}

.tcm-chore-text {
  min-width: 0;
}

.tcm-chore-text strong,
.tcm-chore-text span {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tcm-chore-text strong {
  font-size: 13px;
  line-height: 1.1;
}

.tcm-chore-text span {
  margin-top: 3px;
  color: #6b7280;
  font-size: 11px;
}

.tcm-chore-item button,
.tcm-member-chip button {
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 999px;
  background: rgba(239,68,68,0.1);
  color: #ef4444;
  cursor: pointer;
  font-weight: 1000;
}

.tcm-member-pool {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: clamp(46px, 8dvh, 66px);
  overflow: auto;
  padding: 8px;
  border-radius: 16px;
  background: rgba(248,250,252,0.9);
  border: 1px solid rgba(229,231,235,0.9);
}

.tcm-member-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 6px 8px;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-size: 12px;
  font-weight: 900;
  border: 1px solid #e5e7eb;
  box-shadow: 0 4px 10px rgba(15,23,42,0.05);
}

.tcm-member-chip button {
  width: 16px;
  height: 16px;
  color: #6b7280;
  background: rgba(17,24,39,0.08);
  font-size: 11px;
  line-height: 1;
}

.tcm-candidate-strip {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 6px;
  min-height: 40px;
  padding: 6px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255,248,225,0.7), rgba(237,242,255,0.82));
  border: 1px solid rgba(139,90,43,0.14);
}

.tcm-candidate-card {
  display: grid;
  place-items: center;
  min-width: 0;
  height: 30px;
  padding: 0 5px;
  border-radius: 12px;
  background: rgba(255,255,255,0.86);
  color: #4c1d95;
  font-size: 11px;
  font-weight: 1000;
  text-align: center;
  box-shadow: 0 5px 12px rgba(124,58,237,0.08);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tcm-candidate-card.is-shuffling {
  animation: tcmCandidateBlink 0.18s linear infinite;
}

.tcm-status-box {
  min-height: 0;
  padding: 11px 12px;
  border-radius: 18px;
  background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8), transparent 40%),
    linear-gradient(135deg, rgba(217,119,6,0.13), rgba(55,65,81,0.08));
  border: 1px solid rgba(139,90,43,0.14);
  margin: 9px 0 8px;
  overflow: hidden;
}

.tcm-status-box span {
  display: inline-flex;
  padding: 5px 9px;
  border-radius: 999px;
  background: rgba(139,90,43,0.12);
  color: #8b5a2b;
  font-size: 11px;
  font-weight: 1000;
}

.tcm-status-box strong {
  display: block;
  margin-top: 7px;
  font-size: 15px;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.tcm-status-box p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.tcm-draw-btn {
  width: 100%;
  height: 50px;
  border-radius: 18px;
  background: linear-gradient(135deg, #111827, #8b5a2b 48%, #d4af37);
  color: #fff;
  font-size: 18px;
  box-shadow: 0 14px 30px rgba(31,41,55,0.22), 0 8px 20px rgba(139,90,43,0.22);
}

.tcm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 8px;
}

.tcm-actions button {
  height: 39px;
  border: 1px solid rgba(139,90,43,0.18);
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  color: #8b5a2b;
  font-size: 12px;
}

.tcm-assignment-panel {
  margin-top: 9px;
  padding: 10px;
  border-radius: 16px;
  background: rgba(255,255,255,0.74);
  border: 1px solid rgba(139,90,43,0.14);
}

.tcm-assignment-panel > strong {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 7px;
  color: #374151;
  font-size: 12px;
}

.tcm-assignment-list {
  display: grid;
  gap: 6px;
  max-height: 74px;
  overflow: auto;
}

.tcm-assignment-empty,
.tcm-assignment-item {
  padding: 7px 8px;
  border-radius: 12px;
  background: rgba(248,250,252,0.88);
  color: #6b7280;
  font-size: 11px;
  font-weight: 900;
}

.tcm-assignment-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  color: #374151;
}

.tcm-assignment-item span {
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tcm-assignment-item em {
  color: #8b5a2b;
  font-style: normal;
  white-space: nowrap;
}

.tcm-machine-wrap {
  position: relative;
  min-height: 0;
  border-radius: 26px;
  overflow: hidden;
}

.tcm-machine {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 680px;
  padding: 58px 48px 36px;
  border-radius: 28px;
  overflow: hidden;
  background: linear-gradient(90deg, #1f2937 0 7%, #d4af37 7% 9%, #f8e7b1 9% 12%, #f6f0e7 12% 88%, #f8e7b1 88% 91%, #d4af37 91% 93%, #1f2937 93% 100%);
  border: 3px solid rgba(255,255,255,0.9);
  box-shadow: 0 30px 58px rgba(15,23,42,0.34), inset 0 0 0 2px rgba(255,255,255,0.72), inset 0 0 48px rgba(139,90,43,0.16);
}

.tcm-machine.is-drawing {
  animation: tcmMachineRumble 0.11s ease-in-out infinite;
}

.tcm-marquee {
  position: absolute;
  left: 50%;
  top: 13px;
  transform: translateX(-50%);
  width: 68%;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: linear-gradient(180deg, #fff8dc, #d4af37 54%, #9a6b22);
  color: #2f2418;
  font-size: 13px;
  font-weight: 1000;
  box-shadow: 0 12px 22px rgba(120,53,15,0.24), inset 0 2px 0 rgba(255,255,255,0.8), inset 0 -4px 0 rgba(120,53,15,0.12);
  z-index: 4;
}

.tcm-light-strip {
  position: absolute;
  top: 72px;
  bottom: 34px;
  width: 17px;
  border-radius: 999px;
  background: repeating-linear-gradient(to bottom, #fff8dc 0 8px, #d4af37 8px 16px, #93c5fd 16px 24px, #f8e7b1 24px 32px, #94a3b8 32px 40px);
  background-size: 100% 80px;
  box-shadow: 0 0 15px rgba(255,255,255,0.85), 0 0 30px rgba(250,204,21,0.4);
  animation: tcmLedFlow 0.7s linear infinite;
  z-index: 4;
}

.tcm-light-strip.is-left {
  left: 18px;
}

.tcm-light-strip.is-right {
  right: 18px;
  animation-direction: reverse;
}

.tcm-playfield {
  position: relative;
  height: 100%;
  min-height: 588px;
  border-radius: 24px;
  overflow: hidden;
  background: radial-gradient(circle at 18% 8%, rgba(255,255,255,0.24), transparent 18%),
    radial-gradient(circle at 78% 20%, rgba(248,231,177,0.19), transparent 16%),
    linear-gradient(160deg, #0f172a, #111827 54%, #2a211b);
  border: 4px solid rgba(255,255,255,0.76);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.24), inset 0 0 34px rgba(0,0,0,0.55), 0 12px 28px rgba(15,23,42,0.22);
}

.tcm-glass-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(105deg, transparent 0 18%, rgba(255,255,255,0.16) 19% 22%, transparent 23% 48%, rgba(255,255,255,0.11) 49% 54%, transparent 55%);
  z-index: 20;
  pointer-events: none;
  mix-blend-mode: screen;
}

.tcm-selected-display {
  position: absolute;
  left: 50%;
  top: 12px;
  transform: translateX(-50%);
  width: min(320px, 76%);
  min-height: 40px;
  display: grid;
  place-items: center;
  padding: 8px 14px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255,255,255,0.96), rgba(241,245,249,0.92));
  color: #2f2418;
  font-size: 13px;
  font-weight: 1000;
  text-align: center;
  box-shadow: 0 10px 18px rgba(0,0,0,0.24), inset 0 2px 0 rgba(255,255,255,0.9);
  z-index: 10;
}

.tcm-drop-gate {
  position: absolute;
  left: 50%;
  top: 62px;
  transform: translateX(-50%);
  width: 126px;
  height: 25px;
  border-radius: 999px;
  background: linear-gradient(180deg, #f8e7b1, #8b5a2b);
  box-shadow: 0 8px 16px rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.65);
  z-index: 8;
}

.tcm-mini-ball-row {
  position: absolute;
  left: 36px;
  top: 56px;
  display: flex;
  gap: 8px;
  z-index: 6;
  opacity: 0.8;
}

.tcm-mini-ball-row span {
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 25%, #fff 0 10%, #f8e7b1 11% 28%, #8b5a2b 72%);
  border: 1px solid rgba(255,255,255,0.8);
  box-shadow: 0 8px 12px rgba(0,0,0,0.28);
  animation: tcmMiniWobble 1.2s ease-in-out infinite;
}

.tcm-gear,
.tcm-turntable,
.tcm-vertical-auger,
.tcm-rail,
.tcm-peg,
.tcm-spiral-tube {
  position: absolute;
}

.tcm-gear {
  border-radius: 999px;
  background: radial-gradient(circle at center, #111827 0 14%, transparent 15% 31%, #fff 32% 38%, transparent 39%),
    repeating-conic-gradient(from 0deg, #d4af37 0 12deg, transparent 12deg 24deg);
  box-shadow: 0 10px 20px rgba(0,0,0,0.34), inset 0 2px 0 rgba(255,255,255,0.45);
  animation: tcmSpin 4.8s linear infinite;
  z-index: 3;
}

.tcm-gear.is-g1 { left: 54px; top: 115px; width: 94px; height: 94px; background-color: #cbd5e1; }
.tcm-gear.is-g2 { right: 58px; top: 132px; width: 108px; height: 108px; animation-duration: 6.4s; animation-direction: reverse; background-color: #f8e7b1; }
.tcm-gear.is-g3 { left: 210px; top: 250px; width: 70px; height: 70px; animation-duration: 3.2s; background-color: #b6a38a; }

.tcm-turntable {
  left: 50%;
  top: 195px;
  width: 162px;
  height: 162px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: radial-gradient(circle at center, #2f2418 0 18%, #fff 19% 23%, transparent 24%),
    conic-gradient(#d4af37 0 40deg, #f8e7b1 40deg 80deg, #94a3b8 80deg 120deg, #bfdbfe 120deg 160deg, #8b5a2b 160deg 200deg, #f6f0e7 200deg 240deg, #b45309 240deg 280deg, #cbd5e1 280deg 320deg, #1f2937 320deg 360deg);
  border: 8px solid rgba(255,255,255,0.82);
  box-shadow: 0 16px 28px rgba(0,0,0,0.35), inset 0 0 0 2px rgba(255,255,255,0.45);
  animation: tcmSpin 8s linear infinite;
  z-index: 2;
}

.tcm-vertical-auger {
  right: 170px;
  top: 88px;
  width: 38px;
  height: 235px;
  border-radius: 999px;
  background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.82) 0 10px, rgba(139,90,43,0.86) 10px 22px, rgba(212,175,55,0.88) 22px 34px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.3), inset 0 0 0 3px rgba(255,255,255,0.35);
  animation: tcmAugerMove 0.75s linear infinite;
  z-index: 4;
}

.tcm-rail {
  height: 13px;
  border-radius: 999px;
  background: linear-gradient(90deg, #f8e7b1, #cbd5e1, #8b5a2b);
  box-shadow: 0 8px 16px rgba(0,0,0,0.28), inset 0 2px 0 rgba(255,255,255,0.65);
  z-index: 4;
  opacity: 0.95;
}

.tcm-rail.is-r1 { left: 52px; top: 232px; width: 205px; transform: rotate(-13deg); }
.tcm-rail.is-r2 { right: 42px; top: 330px; width: 226px; transform: rotate(14deg); }
.tcm-rail.is-r3 { left: 64px; top: 455px; width: 260px; transform: rotate(-10deg); }
.tcm-rail.is-r4 { right: 54px; top: 505px; width: 180px; transform: rotate(12deg); background: linear-gradient(90deg, #cbd5e1, #fff8dc, #d4af37); }

.tcm-peg {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 25%, #fff, #d4af37 42%, #8b5a2b);
  box-shadow: 0 0 0 5px rgba(249,115,22,0.12), 0 8px 14px rgba(0,0,0,0.28);
  z-index: 5;
}

.tcm-peg.is-p1 { left: 98px; top: 300px; }
.tcm-peg.is-p2 { left: 176px; top: 350px; }
.tcm-peg.is-p3 { right: 120px; top: 274px; }
.tcm-peg.is-p4 { right: 82px; top: 408px; }
.tcm-peg.is-p5 { left: 78px; top: 406px; }
.tcm-peg.is-p6 { left: 260px; top: 405px; }
.tcm-peg.is-p7 { right: 198px; top: 465px; }
.tcm-peg.is-p8 { left: 190px; top: 510px; }

.tcm-spiral-tube {
  right: 38px;
  top: 360px;
  width: 118px;
  height: 156px;
  border-radius: 999px;
  border: 9px solid rgba(212,175,55,0.9);
  border-left-color: transparent;
  box-shadow: inset 0 0 0 3px rgba(255,255,255,0.25), 0 10px 18px rgba(0,0,0,0.25);
  transform: rotate(8deg);
  z-index: 3;
  opacity: 0.95;
}

.tcm-ball-layer {
  position: absolute;
  inset: 0;
  z-index: 14;
  pointer-events: none;
}

.tcm-ball {
  position: absolute;
  left: 0;
  top: 0;
  width: clamp(46px, 7.4vw, 58px);
  height: clamp(46px, 7.4vw, 58px);
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 32% 24%, #ffffff 0 9%, #fff8dc 10% 22%, #d4af37 45%, #8b5a2b 76%, #1f2937 100%);
  border: 2px solid rgba(255,255,255,0.9);
  box-shadow: 0 16px 28px rgba(0,0,0,0.38), inset 0 4px 6px rgba(255,255,255,0.74), inset -8px -10px 16px rgba(0,0,0,0.22);
  transform: translate(-120px, -120px);
  transform-origin: 50% 50%;
  will-change: transform;
}

.tcm-ball span {
  font-size: clamp(18px, 3vw, 24px);
  filter: drop-shadow(0 2px 2px rgba(0,0,0,0.22));
}

.tcm-ball em {
  position: absolute;
  left: 50%;
  top: calc(100% + 6px);
  max-width: 110px;
  padding: 4px 7px;
  border-radius: 999px;
  background: rgba(255,255,255,0.9);
  color: #1f2937;
  font-size: 10px;
  font-style: normal;
  font-weight: 1000;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 6px 14px rgba(0,0,0,0.22);
  transform: translateX(-50%);
}

.tcm-basket-row {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 14px;
  display: grid;
  gap: 8px;
  z-index: 12;
}

.tcm-basket {
  position: relative;
  height: 88px;
  border-radius: 18px 18px 28px 28px;
  border: 2px solid rgba(255,255,255,0.8);
  background: linear-gradient(180deg, rgba(212,175,55,0.28), rgba(31,41,55,0.12));
  box-shadow: inset 0 -20px 0 rgba(139,90,43,0.18), 0 10px 18px rgba(0,0,0,0.25);
  overflow: hidden;
}

.tcm-basket span {
  position: absolute;
  left: 8px;
  top: 7px;
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  color: #8b5a2b;
  font-size: 11px;
  font-weight: 1000;
  z-index: 2;
}

.tcm-basket strong {
  position: absolute;
  left: 7px;
  right: 7px;
  bottom: 7px;
  padding: 6px 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.92);
  color: #111827;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 10px rgba(0,0,0,0.16);
}

.tcm-basket.is-winner {
  background: linear-gradient(180deg, rgba(250,204,21,0.62), rgba(139,90,43,0.16));
  box-shadow: 0 0 0 7px rgba(250,204,21,0.22), 0 0 38px rgba(250,204,21,0.65), inset 0 -20px 0 rgba(250,204,21,0.25);
  animation: tcmWinnerPulse 0.78s ease-in-out 5;
}

.tcm-result-modal {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(15,23,42,0.52);
  z-index: 9999;
}

.tcm-result-card {
  width: min(430px, 92vw);
  padding: 24px;
  border-radius: 24px;
  background: radial-gradient(circle at 20% 10%, rgba(255,255,255,0.96), transparent 30%), linear-gradient(145deg, #ffffff, #f8f1e4);
  border: 1px solid rgba(212,175,55,0.36);
  box-shadow: 0 28px 70px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.92);
}

.tcm-result-card > span {
  display: inline-flex;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(139,90,43,0.12);
  color: #8b5a2b;
  font-size: 11px;
  font-weight: 1000;
}

.tcm-result-card h2 {
  margin: 12px 0 8px;
  color: #111827;
  font-size: 25px;
  line-height: 1.2;
}

.tcm-result-card p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.45;
}

.tcm-result-summary {
  display: grid;
  gap: 8px;
  margin: 18px 0;
  padding: 14px;
  border-radius: 18px;
  background: rgba(255,255,255,0.74);
  border: 1px solid rgba(139,90,43,0.14);
}

.tcm-result-summary div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  color: #374151;
  font-size: 13px;
  font-weight: 900;
}

.tcm-result-summary span {
  color: #6b7280;
  font-weight: 800;
}

.tcm-result-summary strong {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

.tcm-result-card button {
  width: 100%;
  height: 44px;
  border-radius: 15px;
  background: linear-gradient(135deg, #111827, #8b5a2b 58%, #d4af37);
  color: #fff;
  font-size: 14px;
}

@keyframes tcmCandidateBlink {
  50% { transform: translateY(-2px); filter: brightness(1.2); }
}

@keyframes tcmMachineRumble {
  25% { transform: translate(0.8px, -0.5px); }
  50% { transform: translate(-0.6px, 0.8px); }
  75% { transform: translate(0.4px, 0.5px); }
}

@keyframes tcmLedFlow {
  to { background-position-y: 80px; }
}

@keyframes tcmMiniWobble {
  50% { transform: rotate(6deg) translateY(-3px); }
}

@keyframes tcmSpin {
  to { transform: rotate(360deg); }
}

@keyframes tcmAugerMove {
  to { background-position-y: 34px; }
}

@keyframes tcmWinnerPulse {
  50% { transform: translateY(-11px) scale(1.045); }
}

@media (max-width: 980px) {
  .tcm-root {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .tcm-panel {
    max-height: none;
    overflow: visible;
  }

  .tcm-machine {
    min-height: 660px;
  }

  .tcm-playfield {
    min-height: 560px;
  }
}

@media (max-width: 680px) {
  .tcm-root {
    padding: 12px;
    border-radius: 22px;
  }

  .tcm-input-row,
  .tcm-actions {
    grid-template-columns: 1fr;
  }

  .tcm-machine {
    min-height: 600px;
    padding-left: 26px;
    padding-right: 26px;
  }

  .tcm-playfield {
    min-height: 500px;
  }

  .tcm-basket-row {
    left: 8px;
    right: 8px;
    gap: 5px;
  }

  .tcm-basket strong {
    font-size: 10px;
    padding-inline: 2px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tcm-root *,
  .tcm-root *::before,
  .tcm-root *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
