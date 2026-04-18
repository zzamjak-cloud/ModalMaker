// 인터렉션 상태(hover/press/disabled 등)에 적용할 CSS 스타일 프리셋.
// 사용자 지정 저장은 후속 작업; 현재는 내장 프리셋만 제공.
import type { CSSProperties } from "react";

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  style: Partial<CSSProperties>;
}

export const BUILTIN_STYLE_PRESETS: StylePreset[] = [
  { id: "hover-brighten",   name: "밝아짐",       description: "필터를 살짝 밝게", style: { filter: "brightness(1.15)" } },
  { id: "hover-bg-sky",     name: "파란 강조",     description: "배경에 파란 톤",   style: { backgroundColor: "rgba(14,165,233,0.2)" } },
  { id: "hover-outline",    name: "외곽선",       description: "외곽선 추가",      style: { outline: "2px solid rgba(14,165,233,0.7)", outlineOffset: "2px" } },
  { id: "press-darken",     name: "어두워짐",     description: "필터를 어둡게",    style: { filter: "brightness(0.85)" } },
  { id: "press-scale-down", name: "축소",         description: "살짝 작아짐",      style: { transform: "scale(0.97)" } },
  { id: "disabled-fade",    name: "흐림(disabled)", description: "투명도 + 입력 차단", style: { opacity: 0.4, pointerEvents: "none" } },
  { id: "disabled-gray",    name: "회색(disabled)", description: "회색톤으로",     style: { filter: "grayscale(1)", opacity: 0.6, pointerEvents: "none" } },
];

export function getStylePreset(id: string | undefined): StylePreset | null {
  if (!id) return null;
  return BUILTIN_STYLE_PRESETS.find((p) => p.id === id) ?? null;
}
