// NodeDocument(v2) 기반 전역 스토어
// - Zustand + immer: 깊은 트리 불변 업데이트
// - past/future 스냅샷으로 Undo/Redo 구현
// - "active edit target": editingModuleId가 있으면 해당 모듈 root, 아니면 currentPage.root
//   기존 뮤테이션 시그니처는 그대로 유지하되 activeRoot를 대상으로 동작한다.
import { create } from "zustand";
import { newId } from "@/lib/id";
import { migrateToV2 } from "@/lib/migrate";
import { getDescriptor } from "@/nodes/registry";
import {
  isContainerKind,
  type LayoutNode,
  type ModuleRefProps,
  type NodeDocument,
  type NodeKind,
  type NodeProps,
  type Page,
} from "@/types/layout";
import type { LayoutState } from "./layout/types";
import { buildSelectionSlice } from "./layout/selectionSlice";
import { buildHistorySlice } from "./layout/historySlice";
import { buildUiSlice } from "./layout/uiSlice";
import { buildDocumentSlice } from "./layout/documentSlice";
import { cloneWithNewIds } from "./layout/cloneTree";

// 기본 노드 템플릿
export function createNode(kind: NodeKind, overrides: Partial<LayoutNode> = {}): LayoutNode {
  const base: LayoutNode = {
    id: newId(),
    kind,
    props: defaultPropsFor(kind),
    children: isContainerKind(kind) ? [] : undefined,
    ...overrides,
  };
  return base;
}

export function defaultPropsFor(kind: NodeKind): NodeProps {
  // registry에 defaultProps가 등록된 kind는 descriptor 우선 (점진 이관)
  const desc = getDescriptor(kind);
  if (desc) return desc.defaultProps();
  switch (kind) {
    case "container":
      return { direction: "column", gap: 8, padding: 12, label: "Container" };
    case "foldable":
      return { title: "Section", open: true };
    case "text":
      return { text: "Text", size: "md", weight: "normal" };
    case "button":
      return { label: "Button", variant: "primary", size: "md" };
    case "input":
      return { placeholder: "Enter…", type: "text" };
    case "checkbox":
      return { label: "Option", checked: false };
    case "progress":
      return { value: 50, max: 100 };
    case "split":
      return { orientation: "horizontal", style: "solid", thickness: 1 };
    case "icon":
      return { name: "Star", size: 20 };
    case "module-ref":
      return { moduleId: "" }; // moduleId는 생성 호출부에서 덮어씌움
  }
}

// 빈 v2 NodeDocument 생성. 하나의 빈 Container 루트를 가진 Page 한 개.
export function createEmptyNodeDocument(title = "Untitled"): NodeDocument {
  const now = Date.now();
  const page = createEmptyPage("Page 1", 0);
  return {
    id: newId("doc"),
    title,
    pages: [page],
    modules: [],
    edges: [],
    currentPageId: page.id,
    createdAt: now,
    updatedAt: now,
    schemaVersion: 2,
  };
}

// 레거시 호환 래퍼 - 반환 타입은 NodeDocument (setDocument가 수용).
export function createEmptyDocument(title = "Untitled"): NodeDocument {
  return createEmptyNodeDocument(title);
}

function createEmptyPage(title: string, index: number): Page {
  return {
    id: newId("page"),
    title,
    root: createNode("container", {
      props: { direction: "column", gap: 8, padding: 16, label: "Root" },
    }),
    position: { x: index * 360, y: 0 },
  };
}

// 트리 내 모든 module-ref를 모듈 내용으로 재귀 인라인. 순환 참조는 빈 컨테이너로 대체.
// 프리셋 저장 시 링크 관계를 제거해 독립 사용 가능하도록 만들 때 사용.
export function unlinkAllModuleRefs(
  node: LayoutNode,
  moduleMap: Map<string, LayoutNode>,
  visited: Set<string> = new Set(),
): LayoutNode {
  if (node.kind === "module-ref") {
    const p = node.props as ModuleRefProps;
    if (!moduleMap.has(p.moduleId) || visited.has(p.moduleId)) {
      return {
        id: node.id,
        kind: "container",
        props: { direction: "column" as const, gap: 0, padding: 0, label: (p as ModuleRefProps & { label?: string }).label ?? "Unlinked" },
        children: [],
      };
    }
    const modRoot = moduleMap.get(p.moduleId)!;
    const next = new Set(visited);
    next.add(p.moduleId);
    return unlinkAllModuleRefs(modRoot, moduleMap, next);
  }
  if (!node.children?.length) return node;
  return { ...node, children: node.children.map((c) => unlinkAllModuleRefs(c, moduleMap, visited)) };
}

// 전체 문서를 새 id로 복제 (Save As). 페이지/모듈/엣지 id 재매핑과
// module-ref.props.moduleId 동기화도 함께 처리.
export function cloneDocumentWithNewIds(
  doc: NodeDocument,
  newTitle: string,
): NodeDocument {
  const pageIdMap = new Map<string, string>();
  const modIdMap = new Map<string, string>();
  doc.pages.forEach((p) => pageIdMap.set(p.id, newId("page")));
  doc.modules.forEach((m) => modIdMap.set(m.id, newId("mod")));

  // 서브트리를 cloneWithNewIds한 뒤 내부 module-ref의 moduleId를 신규 id로 치환
  const cloneAndRemap = (node: LayoutNode): LayoutNode => {
    const cloned = cloneWithNewIds(node);
    const walk = (n: LayoutNode) => {
      if (n.kind === "module-ref") {
        const p = n.props as ModuleRefProps;
        const next = modIdMap.get(p.moduleId);
        if (next) (n.props as ModuleRefProps).moduleId = next;
      }
      n.children?.forEach(walk);
    };
    walk(cloned);
    return cloned;
  };

  const now = Date.now();
  const firstNewPageId = pageIdMap.get(doc.currentPageId) ?? [...pageIdMap.values()][0];
  return {
    id: newId("doc"),
    title: newTitle,
    pages: doc.pages.map((p) => ({
      ...p,
      id: pageIdMap.get(p.id) ?? newId("page"),
      root: cloneAndRemap(p.root),
      position: { ...p.position },
      viewport: p.viewport ? { ...p.viewport } : undefined,
    })),
    modules: doc.modules.map((m) => ({
      ...m,
      id: modIdMap.get(m.id) ?? newId("mod"),
      root: cloneAndRemap(m.root),
    })),
    edges: doc.edges.map((e) => ({
      ...e,
      id: newId("edge"),
      source: pageIdMap.get(e.source) ?? e.source,
      target: pageIdMap.get(e.target) ?? e.target,
    })),
    currentPageId: firstNewPageId ?? doc.currentPageId,
    createdAt: now,
    updatedAt: now,
    ownerUid: doc.ownerUid,
    schemaVersion: 2,
  };
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  document: createEmptyNodeDocument(),
  mode: "node",
  selectedId: null,
  selectedIds: [],
  selectedPageId: null,
  editingModuleId: null,
  past: [],
  future: [],
  lastCoalesceKey: null,

  ...buildSelectionSlice(set),
  ...buildHistorySlice(set, get),
  ...buildUiSlice(set),
  ...buildDocumentSlice(set, get, { createEmptyPage, createNode }),

  setDocument: (doc) =>
    set(() => ({
      document: migrateToV2(doc),
      past: [],
      future: [],
      lastCoalesceKey: null,
      selectedId: null,
      selectedIds: [],
      selectedPageId: null,
      editingModuleId: null,
    })),

  resetDocument: () =>
    set(() => ({
      document: createEmptyNodeDocument(),
      past: [],
      future: [],
      lastCoalesceKey: null,
      selectedId: null,
      selectedIds: [],
      selectedPageId: null,
      editingModuleId: null,
    })),
}));

export { cloneWithNewIds } from "./layout/cloneTree";
export { currentPage, activeRoot, findLayoutNode, findLayoutParent } from "./layout/graph";
export type { EditorMode, LayoutState } from "./layout/types";
