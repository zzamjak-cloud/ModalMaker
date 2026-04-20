// 문서 썸네일 렌더 공용 유틸 — Node View 카드 · Load 다이얼로그 · PresetGallery 공용
// 페이지 뷰포트 비율을 근거로 contentW/H + scale을 계산한다.
// 썸네일 영역 최대 크기는 caller가 MaxW/MaxH로 지정.
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";

/** 뷰포트 설정 → 실제 렌더할 가상 contentW/H */
export function resolveThumbContentSize(viewport?: ViewportSettings): {
  contentW: number;
  contentH: number;
  isFree: boolean;
} {
  const isFree = !viewport || viewport.preset === "free";
  if (isFree) return { contentW: 1280, contentH: 960, isFree: true };
  if (viewport!.preset === "custom") {
    return { contentW: viewport!.width ?? 1280, contentH: viewport!.height ?? 720, isFree: false };
  }
  if (viewport!.preset === "custom-w") {
    const w = viewport!.width ?? 1280;
    return { contentW: w, contentH: Math.round(w * 0.75), isFree: false };
  }
  const p = VIEWPORT_PRESETS[viewport!.preset as keyof typeof VIEWPORT_PRESETS];
  return { contentW: p.width, contentH: p.height, isFree: false };
}

/**
 * 썸네일 프레임(최대 maxW×maxH) 안에 contentW×contentH를 비율 유지로 끼워넣는 값.
 * scale은 두 축 중 더 작은 쪽을 사용 → 여백 있지만 잘리지 않음.
 */
export function resolveThumbFit(
  viewport: ViewportSettings | undefined,
  maxW: number,
  maxH: number,
): {
  contentW: number;
  contentH: number;
  frameW: number;
  frameH: number;
  scale: number;
  isFree: boolean;
} {
  const { contentW, contentH, isFree } = resolveThumbContentSize(viewport);
  const scale = Math.min(maxW / contentW, maxH / contentH);
  return {
    contentW,
    contentH,
    frameW: Math.round(contentW * scale),
    frameH: Math.round(contentH * scale),
    scale,
    isFree,
  };
}
