import { create } from "zustand";
import { persist } from "zustand/middleware";

type Tab = "home" | "calendar";

export interface Track {
  id: string;
  name: string;
  url: string;
}

export const TRACKS: Track[] = [
  {
    id: "commute-refusal",
    name: "출근 거부 선언",
    url: "/bgm/commute-refusal.mp3",
  },
  {
    id: "kart-rush",
    name: "카트 질주",
    url: "/bgm/kart-rush.mp3",
  },
  {
    id: "window-afternoon",
    name: "창가의 오후",
    url: "/bgm/window-afternoon.mp3",
  },
  {
    id: "moonlight-leaf",
    name: "달빛 리프",
    url: "/bgm/moonlight-leaf.mp3",
  },
  {
    id: "dashboard-groove",
    name: "Dashboard Groove",
    url: "/bgm/dashboard-groove.mp3",
  },
  {
    id: "spreadsheet-siesta",
    name: "Spreadsheet Siesta",
    url: "/bgm/spreadsheet-siesta.mp3",
  },
  {
    id: "office-window-01",
    name: "Office Window 01",
    url: "/bgm/office-window-01.mp3",
  },
  {
    id: "smoke-waltz",
    name: "담배 연기 왈츠",
    url: "/bgm/smoke-waltz.mp3",
  },
];

export interface SlingshotConfig {
  gravity: number;
  power: number;
  bandStrength: number;
  settleMs: number;
  maxPull: number;
  dailyLimit: number;
  bombDays: number;
}

export const DEFAULT_SLINGSHOT: SlingshotConfig = {
  gravity: 0.35,
  power: 0.22,
  bandStrength: 3,
  settleMs: 1100,
  maxPull: 220,
  dailyLimit: 8,
  bombDays: 3,
};

export const TEAM_GACHA_POOL = [
  "간식 채우기",
  "장비대 정리",
  "프린터 토너 교체",
  "공용 캘린더 비우기",
  "주간 회의록 작성",
  "물병 주우기",
  "점심 메뉴 정하기",
  "영수증 모으기",
  "복합기 용지 보충",
  "회의실 책상 정리",
];

interface UIState {
  tab: Tab;
  setTab: (t: Tab) => void;
  gameMode: boolean;
  toggleGame: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  bgm: boolean;
  toggleBgm: () => void;
  trackId: string;
  setTrackId: (id: string) => void;
  showDeleted: boolean;
  setShowDeleted: (v: boolean) => void;
  slingshot: SlingshotConfig;
  setSlingshot: (patch: Partial<SlingshotConfig>) => void;
  resetSlingshot: () => void;
  pendingShot: string | null;
  setPendingShot: (s: string | null) => void;
  bossSighTick: number;
  triggerBossSigh: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      tab: "home",
      setTab: (t) => set({ tab: t }),
      gameMode: false,
      toggleGame: () => set((s) => ({ gameMode: !s.gameMode })),
      theme: "light",
      toggleTheme: () => set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),
      bgm: false,
      toggleBgm: () => set((s) => ({ bgm: !s.bgm })),
      trackId: TRACKS[0].id,
      setTrackId: (id) => set({ trackId: id }),
      showDeleted: false,
      setShowDeleted: (v) => set({ showDeleted: v }),
      slingshot: DEFAULT_SLINGSHOT,
      setSlingshot: (patch) => set((s) => ({ slingshot: { ...s.slingshot, ...patch } })),
      resetSlingshot: () => set({ slingshot: DEFAULT_SLINGSHOT }),
      pendingShot: null,
      setPendingShot: (s) => set({ pendingShot: s }),
      bossSighTick: 0,
      triggerBossSigh: () => set((s) => ({ bossSighTick: s.bossSighTick + 1 })),
    }),
    {
      name: "tasky-ui-v2",
      partialize: (s) => ({
        tab: s.tab,
        theme: s.theme,
        showDeleted: s.showDeleted,
        trackId: s.trackId,
        slingshot: { ...DEFAULT_SLINGSHOT, ...s.slingshot },
      }),
    },
  ),
);
