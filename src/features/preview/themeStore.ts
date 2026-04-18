// 프리뷰 테마 선택 상태 — localStorage에 지속
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ThemeName } from "./themes";

interface ThemeState {
  theme: ThemeName;
  setTheme: (t: ThemeName) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "os" as ThemeName,
      setTheme: (theme) => set({ theme }),
    }),
    { name: "modalmaker-preview-theme" },
  ),
);
