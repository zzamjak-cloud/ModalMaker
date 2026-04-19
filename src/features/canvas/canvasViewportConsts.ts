// CanvasViewport 상수 + 순수 유틸. 훅 분해는 별도 PR(Phase 6-3 후속).

/** 10% 단위 스케일 스냅 스텝 */
export const SCALE_STEP = 0.1;
export const MIN_SCALE = 0.1;
export const MAX_SCALE = 4;

/** 트랙패드 핀치 줌 민감도 — ReactFlow 기본값에 맞춤 */
export const PINCH_SENSITIVITY = 0.008;

/** fit retry 최대 프레임 */
export const FIT_RETRY_MAX = 64;
/** reveal 안정화 최대 프레임 */
export const REVEAL_MAX_FRAMES = 24;
/** 컨테이너 리사이즈 디바운스(ms) */
export const RESIZE_DEBOUNCE_MS = 120;

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** ± 버튼·핀치 줌 시 10% 스냅 */
export function snapScale(s: number): number {
  return clamp(Math.round(s * 10) / 10, MIN_SCALE, MAX_SCALE);
}
