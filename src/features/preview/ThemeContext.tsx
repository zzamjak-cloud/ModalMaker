// 프리뷰 테마 컨텍스트 — ThemeProvider로 감싼 트리에서 useTheme()으로 토큰 소비
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { THEMES, type ThemeName, type ThemeTokens } from "./themes";
import { useThemeStore } from "./themeStore";

const ThemeContext = createContext<ThemeTokens>(THEMES.dark);

export function useTheme(): ThemeTokens {
  return useContext(ThemeContext);
}

function resolveTokens(name: ThemeName, prefersDark: boolean): ThemeTokens {
  if (name === "os") return THEMES[prefersDark ? "dark" : "light"];
  return THEMES[name];
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const [prefersDark, setPrefersDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const tokens = resolveTokens(theme, prefersDark);
  return <ThemeContext.Provider value={tokens}>{children}</ThemeContext.Provider>;
}
