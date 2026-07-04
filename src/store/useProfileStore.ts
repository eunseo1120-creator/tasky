import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { JobkoreaRole } from "@/lib/jobkorea";

export interface Profile {
  nickname: string;
  avatar: string;
  role: "manager" | "member";
  jobRole: JobkoreaRole;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

interface ProfileState {
  profile: Profile | null;
  profileRoomCode: string | null;
  profilesByRoom: Record<string, Profile>;
  score: number;
  dailyDate: string;
  dailyCount: number;
  lastLooterWeek: string;
  setProfile: (p: Profile) => void;
  setProfileForRoom: (roomCode: string, p: Profile) => void;
  getProfileForRoom: (roomCode: string) => Profile | null;
  clearProfile: () => void;
  addScore: (n: number) => void;
  resetScore: () => void;
  bumpDaily: () => number;
  setLastLooterWeek: (w: string) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      profileRoomCode: null,
      profilesByRoom: {},
      score: 0,
      dailyDate: todayKey(),
      dailyCount: 0,
      lastLooterWeek: "",
      setProfile: (p) => set({ profile: p }),
      setProfileForRoom: (roomCode, p) =>
        set((state) => ({
          profile: p,
          profileRoomCode: roomCode,
          profilesByRoom: {
            ...state.profilesByRoom,
            [roomCode]: p,
          },
        })),
      getProfileForRoom: (roomCode) => get().profilesByRoom[roomCode] ?? null,
      clearProfile: () => set({ profile: null }),
      addScore: (n) => set((s) => ({ score: s.score + n })),
      resetScore: () => set({ score: 0 }),
      bumpDaily: () => {
        const today = todayKey();
        const same = get().dailyDate === today;
        const next = (same ? get().dailyCount : 0) + 1;
        set({ dailyDate: today, dailyCount: next });
        return next;
      },
      setLastLooterWeek: (w) => set({ lastLooterWeek: w }),
    }),
    {
      name: "tasky-profile-v2",
    },
  ),
);

export function randomAvatarUrl(seed?: string): string {
  const s = seed ?? Math.random().toString(36).slice(2);
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(s)}`;
}
