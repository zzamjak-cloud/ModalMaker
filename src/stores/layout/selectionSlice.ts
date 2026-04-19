import type { StoreApi } from "zustand";
import type { LayoutState } from "./types";
import { activeRoot, findLayoutNode } from "./graph";

type LayoutSet = StoreApi<LayoutState>["setState"];

export function buildSelectionSlice(set: LayoutSet) {
  return {
    select: (id: string | null) => set({ selectedId: id, selectedIds: [] }),

    toggleSelectMulti: (id: string) =>
      set((s) => {
        const root = activeRoot(s);
        if (!root) return {};
        const clickedNode = findLayoutNode(root, id);
        if (!clickedNode) return {};
        const current =
          s.selectedIds.length > 0 ? s.selectedIds : s.selectedId ? [s.selectedId] : [];
        if (current.length > 0) {
          const firstNode = findLayoutNode(root, current[0]);
          if (firstNode && firstNode.kind !== clickedNode.kind) return {};
        }
        let next: string[];
        if (current.includes(id)) {
          next = current.filter((i) => i !== id);
        } else {
          next = [...current, id];
        }
        if (next.length === 0) return { selectedIds: [], selectedId: null };
        if (next.length === 1) return { selectedIds: [], selectedId: next[0] };
        return { selectedIds: next };
      }),

    clearMultiSelect: () => set({ selectedIds: [], selectedId: null }),
  } satisfies Pick<LayoutState, "select" | "toggleSelectMulti" | "clearMultiSelect">;
}
