// 프리뷰 오버레이 우측 상단의 테마 선택 드롭다운
import { useState } from "react";
import { Palette } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useThemeStore } from "./themeStore";
import { THEME_LABELS, type ThemeName, type ThemeTokens } from "./themes";

const THEME_OPTIONS: ThemeName[] = ["os", "dark", "light", "warm", "ocean"];

/** 테마 미리보기 dot 색상 — 현재 토큰 기반 */
function previewDot(opt: ThemeName, current: ThemeTokens): string {
  const map: Record<ThemeName, string> = {
    os: current.accentBg,
    dark: "#171717",
    light: "#f5f5f5",
    warm: "#f59e0b",
    ocean: "#0284c7",
  };
  return map[opt];
}

export function ThemePicker() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const t = useTheme();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
        title="테마 변경"
      >
        <Palette size={12} />
        {THEME_LABELS[theme]}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[110px] rounded-md border border-neutral-800 bg-neutral-900 py-1 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setTheme(opt); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800 ${theme === opt ? "text-sky-400" : "text-neutral-200"}`}
            >
              <span
                className="h-3 w-3 rounded-full border border-neutral-700"
                style={{ background: previewDot(opt, t) }}
              />
              {THEME_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
