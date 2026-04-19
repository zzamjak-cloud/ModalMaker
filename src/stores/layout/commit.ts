import { produce } from "immer";
import type { NodeDocument } from "@/types/layout";
import type { LayoutState } from "./types";

export const HISTORY_LIMIT = 100;

export function snapshot(doc: NodeDocument): NodeDocument {
  return JSON.parse(JSON.stringify(doc));
}

export function commit(
  state: LayoutState,
  mutate: (draft: NodeDocument) => void,
): Partial<LayoutState> {
  const prev = snapshot(state.document);
  const next = produce(state.document, (draft) => {
    mutate(draft);
    draft.updatedAt = Date.now();
  });
  if (next === state.document) return {};
  const past = [...state.past, prev].slice(-HISTORY_LIMIT);
  return { document: next, past, future: [] };
}
