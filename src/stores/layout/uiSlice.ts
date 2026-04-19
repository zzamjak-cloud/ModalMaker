import type { StoreApi } from "zustand";
import type { EditorMode, LayoutState } from "./types";

type LayoutSet = StoreApi<LayoutState>["setState"];

export function buildUiSlice(set: LayoutSet) {
  return {
    enterModuleEdit: (moduleId: string) =>
      set((s) => {
        const exists = s.document.modules.some((m) => m.id === moduleId);
        if (!exists) return {};
        return { editingModuleId: moduleId, selectedId: null, selectedIds: [] };
      }),

    exitModuleEdit: () => set({ editingModuleId: null, selectedId: null, selectedIds: [] }),

    setMode: (mode: EditorMode) => set({ mode }),
  } satisfies Pick<LayoutState, "enterModuleEdit" | "exitModuleEdit" | "setMode">;
}
