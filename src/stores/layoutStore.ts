// 레이아웃 트리 전역 스토어
// - Zustand + immer: 깊은 트리 불변 업데이트
// - past/future 스냅샷으로 Undo/Redo 구현
// - 모든 뮤테이션은 커밋 직전 현재 document를 past에 push
import { create } from "zustand";
import { produce } from "immer";
import { newId } from "@/lib/id";
import {
  isContainerKind,
  type LayoutDocument,
  type LayoutNode,
  type NodeKind,
  type NodeProps,
} from "@/types/layout";

const HISTORY_LIMIT = 100;

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

export function createEmptyDocument(title = "Untitled"): LayoutDocument {
  const now = Date.now();
  return {
    id: newId("doc"),
    title,
    root: createNode("container", { props: { direction: "column", gap: 8, padding: 16, label: "Root" } }),
    createdAt: now,
    updatedAt: now,
  };
}

// 트리 순회: id로 노드 찾기 (Immer draft 호환)
function findNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

function findParent(root: LayoutNode, childId: string): LayoutNode | null {
  if (!root.children) return null;
  for (const c of root.children) {
    if (c.id === childId) return root;
    const hit = findParent(c, childId);
    if (hit) return hit;
  }
  return null;
}

function removeFromParent(parent: LayoutNode, childId: string): LayoutNode | null {
  if (!parent.children) return null;
  const idx = parent.children.findIndex((c) => c.id === childId);
  if (idx < 0) return null;
  const [removed] = parent.children.splice(idx, 1);
  return removed;
}

interface LayoutState {
  document: LayoutDocument;
  selectedId: string | null;
  past: LayoutDocument[];
  future: LayoutDocument[];

  // 문서 교체 (로드/리셋)
  setDocument: (doc: LayoutDocument) => void;
  resetDocument: () => void;

  // 선택
  select: (id: string | null) => void;

  // 트리 뮤테이션
  addNode: (parentId: string, node: LayoutNode, index?: number) => void;
  addNewNode: (parentId: string, kind: NodeKind, index?: number) => LayoutNode;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  updateProps: (id: string, patch: Partial<NodeProps>) => void;
  updateSizing: (id: string, patch: Partial<import("@/types/layout").SizingProps>) => void;
  updateTitle: (title: string) => void;
  updateViewport: (patch: Partial<import("@/types/layout").ViewportSettings>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;

  // 히스토리
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

function snapshot(doc: LayoutDocument): LayoutDocument {
  return JSON.parse(JSON.stringify(doc));
}

function commit(
  state: LayoutState,
  mutate: (draft: LayoutDocument) => void,
): Partial<LayoutState> {
  const prev = snapshot(state.document);
  const next = produce(state.document, (draft) => {
    mutate(draft);
    draft.updatedAt = Date.now();
  });
  // 동일 참조면 no-op
  if (next === state.document) return {};
  const past = [...state.past, prev].slice(-HISTORY_LIMIT);
  return { document: next, past, future: [] };
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  document: createEmptyDocument(),
  selectedId: null,
  past: [],
  future: [],

  setDocument: (doc) =>
    set((s) => ({
      past: [...s.past, snapshot(s.document)].slice(-HISTORY_LIMIT),
      document: doc,
      future: [],
      selectedId: null,
    })),

  resetDocument: () =>
    set((s) => ({
      past: [...s.past, snapshot(s.document)].slice(-HISTORY_LIMIT),
      document: createEmptyDocument(),
      future: [],
      selectedId: null,
    })),

  select: (id) => set({ selectedId: id }),

  addNode: (parentId, node, index) =>
    set((s) =>
      commit(s, (draft) => {
        const parent = findNode(draft.root, parentId);
        if (!parent || !isContainerKind(parent.kind)) return;
        parent.children ??= [];
        const i = index ?? parent.children.length;
        parent.children.splice(i, 0, node);
      }),
    ),

  addNewNode: (parentId, kind, index) => {
    const node = createNode(kind);
    get().addNode(parentId, node, index);
    return node;
  },

  moveNode: (nodeId, targetParentId, index) =>
    set((s) =>
      commit(s, (draft) => {
        if (nodeId === draft.root.id) return; // 루트는 이동 불가
        const sourceParent = findParent(draft.root, nodeId);
        const target = findNode(draft.root, targetParentId);
        if (!sourceParent || !target || !isContainerKind(target.kind)) return;
        // 자기 자신의 자손으로 이동하는 것 방지
        if (isAncestor(findNode(draft.root, nodeId)!, targetParentId)) return;
        const removed = removeFromParent(sourceParent, nodeId);
        if (!removed) return;
        target.children ??= [];
        const i = Math.max(0, Math.min(index ?? target.children.length, target.children.length));
        target.children.splice(i, 0, removed);
      }),
    ),

  updateProps: (id, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const node = findNode(draft.root, id);
        if (!node) return;
        node.props = { ...node.props, ...patch };
      }),
    ),

  updateSizing: (id, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const node = findNode(draft.root, id);
        if (!node) return;
        node.sizing = { ...(node.sizing ?? {}), ...patch };
      }),
    ),

  updateTitle: (title) =>
    set((s) =>
      commit(s, (draft) => {
        draft.title = title;
      }),
    ),

  updateViewport: (patch) =>
    set((s) =>
      commit(s, (draft) => {
        const prev = draft.viewport ?? { preset: "free" };
        draft.viewport = { ...prev, ...patch };
      }),
    ),

  removeNode: (id) =>
    set((s) =>
      commit(s, (draft) => {
        if (id === draft.root.id) return;
        const parent = findParent(draft.root, id);
        if (!parent) return;
        removeFromParent(parent, id);
      }),
    ),

  duplicateNode: (id) =>
    set((s) =>
      commit(s, (draft) => {
        if (id === draft.root.id) return;
        const parent = findParent(draft.root, id);
        if (!parent?.children) return;
        const idx = parent.children.findIndex((c) => c.id === id);
        if (idx < 0) return;
        const clone = cloneWithNewIds(parent.children[idx]);
        parent.children.splice(idx + 1, 0, clone);
      }),
    ),

  undo: () =>
    set((s) => {
      const prev = s.past[s.past.length - 1];
      if (!prev) return {};
      return {
        past: s.past.slice(0, -1),
        future: [snapshot(s.document), ...s.future],
        document: prev,
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
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));

function isAncestor(node: LayoutNode, possibleDescendantId: string): boolean {
  if (!node.children) return false;
  for (const c of node.children) {
    if (c.id === possibleDescendantId) return true;
    if (isAncestor(c, possibleDescendantId)) return true;
  }
  return false;
}

export function cloneWithNewIds(node: LayoutNode): LayoutNode {
  return {
    ...node,
    id: newId(),
    props: { ...node.props },
    sizing: node.sizing ? { ...node.sizing } : undefined,
    children: node.children?.map(cloneWithNewIds),
  };
}
