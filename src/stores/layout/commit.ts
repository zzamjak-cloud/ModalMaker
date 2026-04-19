import { produce } from "immer";
import type { NodeDocument } from "@/types/layout";
import type { LayoutState } from "./types";

export const HISTORY_LIMIT = 100;

export function snapshot(doc: NodeDocument): NodeDocument {
  return JSON.parse(JSON.stringify(doc));
}

/** 매 호출이 새 history 엔트리를 만든다. */
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
  return { document: next, past, future: [], lastCoalesceKey: null };
}

/**
 * coalesceKey가 직전 commit과 같으면 past에 새 스냅샷을 추가하지 않고 문서만 교체.
 * 연속 텍스트 입력이 undo 스택에 1자마다 쌓이는 문제를 해결한다.
 * 다른 뮤테이션(다른 노드 선택·다른 액션)이 한번이라도 일어나면 lastCoalesceKey=null로 리셋되어
 * 다음 commit은 새 엔트리를 만든다.
 */
export function commitCoalesce(
  state: LayoutState,
  coalesceKey: string,
  mutate: (draft: NodeDocument) => void,
): Partial<LayoutState> {
  const next = produce(state.document, (draft) => {
    mutate(draft);
    draft.updatedAt = Date.now();
  });
  if (next === state.document) return {};

  // 직전과 같은 키 + 이미 coalesce 체인이 살아있는 상태 → 스냅샷 추가 없이 문서만 교체
  if (state.lastCoalesceKey === coalesceKey) {
    return { document: next, future: [], lastCoalesceKey: coalesceKey };
  }

  // 체인 시작(또는 키 변경) → 정상 히스토리 엔트리 추가
  const prev = snapshot(state.document);
  const past = [...state.past, prev].slice(-HISTORY_LIMIT);
  return { document: next, past, future: [], lastCoalesceKey: coalesceKey };
}
