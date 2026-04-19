import type { StoreApi } from "zustand";
import type { LayoutState } from "./types";
import { snapshot } from "./commit";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export function buildHistorySlice(set: LayoutSet, get: LayoutGet) {
  return {
    undo: () =>
      set((s) => {
        const prev = s.past[s.past.length - 1];
        if (!prev) return {};
        return {
          past: s.past.slice(0, -1),
          future: [snapshot(s.document), ...s.future],
          document: prev,
          // undo 후 같은 키로 들어오는 뮤테이션은 새 엔트리로 취급
          lastCoalesceKey: null,
        };
      }),

    redo: () =>
      set((s) => {
        const nxt = s.future[0];
        if (!nxt) return {};
        return {
          past: [...s.past, snapshot(s.document)],
          future: s.future.slice(1),
          document: nxt,
          lastCoalesceKey: null,
        };
      }),

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  } satisfies Pick<LayoutState, "undo" | "redo" | "canUndo" | "canRedo">;
}
