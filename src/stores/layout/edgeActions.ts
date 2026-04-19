// 페이지 간 Edge CRUD — addEdge(중복 방지), removeEdge.
import type { StoreApi } from "zustand";
import { newId } from "@/lib/id";
import type { PageEdge } from "@/types/layout";
import type { LayoutState } from "./types";
import { commit } from "./commit";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export function buildEdgeActions(
  set: LayoutSet,
  get: LayoutGet,
): Pick<LayoutState, "addEdge" | "removeEdge"> {
  return {
    addEdge: (source, target, sourceHandle) => {
      const st = get();
      const existing = st.document.edges.find(
        (e) =>
          e.source === source &&
          e.target === target &&
          (e.sourceHandle ?? undefined) === (sourceHandle ?? undefined),
      );
      if (existing) return existing;
      const edge: PageEdge = {
        id: newId("edge"),
        source,
        target,
        sourceHandle,
      };
      set((s) =>
        commit(s, (draft) => {
          draft.edges.push(edge);
        }),
      );
      return edge;
    },

    removeEdge: (edgeId) =>
      set((s) =>
        commit(s, (draft) => {
          draft.edges = draft.edges.filter((e) => e.id !== edgeId);
        }),
      ),
  };
}
