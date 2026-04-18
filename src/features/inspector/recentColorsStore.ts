// 최근 사용 색상 저장소 — ColorPicker에서 색상 선택 시 자동 기록
import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX_RECENT = 8;

interface RecentColorsState {
  colors: string[];
  push: (hex: string) => void;
}

export const useRecentColors = create<RecentColorsState>()(
  persist(
    (set) => ({
      colors: [],
      push: (hex: string) => {
        const normalized = hex.toLowerCase().trim();
        if (!normalized || normalized === "none") return;
        set((s) => {
          const next = [normalized, ...s.colors.filter((c) => c !== normalized)].slice(0, MAX_RECENT);
          return { colors: next };
        });
      },
    }),
    { name: "modalmaker-recent-colors" },
  ),
);
