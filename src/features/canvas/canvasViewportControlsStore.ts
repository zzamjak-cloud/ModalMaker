// 캔버스 뷰포트(CanvasViewport)가 마운트될 때 등록하고, 툴바에서 줌 UI를 구동한다.
import { create } from "zustand";

const noop = () => {};

export type CanvasViewportControlsState = {
  /** CanvasViewport이 살아 있을 때만 true */
  active: boolean;
  percent: number;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
};

export const useCanvasViewportControlsStore = create<CanvasViewportControlsState>(() => ({
  active: false,
  percent: 100,
  zoomIn: noop,
  zoomOut: noop,
  fit: noop,
}));

export function registerCanvasViewportControls(
  patch: Partial<Pick<CanvasViewportControlsState, "percent" | "zoomIn" | "zoomOut" | "fit">>,
): void {
  useCanvasViewportControlsStore.setState({ active: true, ...patch });
}

export function resetCanvasViewportControls(): void {
  useCanvasViewportControlsStore.setState({
    active: false,
    percent: 100,
    zoomIn: noop,
    zoomOut: noop,
    fit: noop,
  });
}
