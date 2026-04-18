// 프리뷰 테마 정의 — 토큰 기반으로 인라인 스타일에 직접 적용
export type ThemeName = "os" | "dark" | "light" | "warm" | "ocean";

export interface ThemeTokens {
  // 배경
  canvasBg: string;
  surfaceBg: string;
  surfaceBg2: string;
  /** rgba() 생성용 RGB 문자열 (depth===0). 예: "23,23,23" */
  surfaceRGBStr: string;
  /** rgba() 생성용 RGB 문자열 (depth>0). 예: "23,23,23" */
  surfaceRGBStr2: string;
  // 텍스트
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  // 경계선
  borderColor: string;
  // 입력
  inputBg: string;
  inputBorder: string;
  // 버튼 변형
  accentBg: string;
  accentText: string;
  secondaryBg: string;
  secondaryText: string;
  destructiveBg: string;
  destructiveText: string;
  ghostBorder: string;
  ghostText: string;
  ghostBg: string;
}

const DARK: ThemeTokens = {
  canvasBg: "#0a0a0a",
  surfaceBg: "rgba(23,23,23,0.92)",
  surfaceBg2: "rgba(23,23,23,0.55)",
  surfaceRGBStr: "50,50,50",
  surfaceRGBStr2: "40,40,40",
  textPrimary: "#f5f5f5",
  textSecondary: "#a3a3a3",
  textMuted: "#737373",
  borderColor: "#404040",
  inputBg: "#0a0a0a",
  inputBorder: "#525252",
  accentBg: "#0ea5e9",
  accentText: "#ffffff",
  secondaryBg: "#404040",
  secondaryText: "#f5f5f5",
  destructiveBg: "#e11d48",
  destructiveText: "#ffffff",
  ghostBorder: "#525252",
  ghostText: "#d4d4d4",
  ghostBg: "transparent",
};

const LIGHT: ThemeTokens = {
  canvasBg: "#f5f5f5",
  surfaceBg: "#ffffff",
  surfaceBg2: "#f9fafb",
  surfaceRGBStr: "210,210,210",
  surfaceRGBStr2: "220,220,220",
  textPrimary: "#171717",
  textSecondary: "#525252",
  textMuted: "#a3a3a3",
  borderColor: "#e5e5e5",
  inputBg: "#ffffff",
  inputBorder: "#d4d4d4",
  accentBg: "#0ea5e9",
  accentText: "#ffffff",
  secondaryBg: "#e5e5e5",
  secondaryText: "#171717",
  destructiveBg: "#e11d48",
  destructiveText: "#ffffff",
  ghostBorder: "#d4d4d4",
  ghostText: "#404040",
  ghostBg: "transparent",
};

const WARM: ThemeTokens = {
  canvasBg: "#1c1410",
  surfaceBg: "rgba(42,28,18,0.95)",
  surfaceBg2: "rgba(42,28,18,0.6)",
  surfaceRGBStr: "85,58,32",
  surfaceRGBStr2: "68,46,25",
  textPrimary: "#fef3c7",
  textSecondary: "#fbbf24",
  textMuted: "#92400e",
  borderColor: "#78350f",
  inputBg: "#1c1410",
  inputBorder: "#92400e",
  accentBg: "#f59e0b",
  accentText: "#1c1410",
  secondaryBg: "#78350f",
  secondaryText: "#fef3c7",
  destructiveBg: "#dc2626",
  destructiveText: "#ffffff",
  ghostBorder: "#78350f",
  ghostText: "#fef3c7",
  ghostBg: "transparent",
};

const OCEAN: ThemeTokens = {
  canvasBg: "#0c1a2e",
  surfaceBg: "rgba(14,30,55,0.95)",
  surfaceBg2: "rgba(14,30,55,0.6)",
  surfaceRGBStr: "26,70,115",
  surfaceRGBStr2: "20,55,90",
  textPrimary: "#e0f2fe",
  textSecondary: "#7dd3fc",
  textMuted: "#38bdf8",
  borderColor: "#1e3a5f",
  inputBg: "#0c1a2e",
  inputBorder: "#1e4976",
  accentBg: "#0284c7",
  accentText: "#ffffff",
  secondaryBg: "#1e3a5f",
  secondaryText: "#e0f2fe",
  destructiveBg: "#e11d48",
  destructiveText: "#ffffff",
  ghostBorder: "#1e4976",
  ghostText: "#bae6fd",
  ghostBg: "transparent",
};

export const THEMES: Record<Exclude<ThemeName, "os">, ThemeTokens> = {
  dark: DARK,
  light: LIGHT,
  warm: WARM,
  ocean: OCEAN,
};

export const THEME_LABELS: Record<ThemeName, string> = {
  os: "OS 테마",
  dark: "다크",
  light: "라이트",
  warm: "웜",
  ocean: "오션",
};
