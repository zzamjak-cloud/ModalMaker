// 문서 뮤테이션 슬라이스 — 4개 액션 모듈을 합성한다.
// 각 액션 그룹(node/page/module/edge)은 독립 파일로 분리되어 있다.
import type { StoreApi } from "zustand";
import type { LayoutNode, NodeKind, Page } from "@/types/layout";
import type { LayoutState } from "./types";
import { buildNodeActions } from "./nodeActions";
import { buildPageActions } from "./pageActions";
import { buildModuleActions } from "./moduleActions";
import { buildEdgeActions } from "./edgeActions";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export type DocumentSliceDeps = {
  createEmptyPage: (title: string, index: number) => Page;
  createNode: (kind: NodeKind, overrides?: Partial<LayoutNode>) => LayoutNode;
};

export function buildDocumentSlice(
  set: LayoutSet,
  get: LayoutGet,
  deps: DocumentSliceDeps,
) {
  return {
    ...buildNodeActions(set, get, { createNode: deps.createNode }),
    ...buildPageActions(set, get, { createEmptyPage: deps.createEmptyPage }),
    ...buildModuleActions(set, get),
    ...buildEdgeActions(set, get),
  };
}
