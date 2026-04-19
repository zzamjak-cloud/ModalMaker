// NodeDocument(v2) 기반 전역 스토어
// - Zustand + immer: 깊은 트리 불변 업데이트
// - past/future 스냅샷으로 Undo/Redo 구현
// - "active edit target": editingModuleId가 있으면 해당 모듈 root, 아니면 currentPage.root
//   기존 뮤테이션 시그니처는 그대로 유지하되 activeRoot를 대상으로 동작한다.
import { create } from "zustand";
import { produce } from "immer";
import { newId } from "@/lib/id";
import { migrateToV2 } from "@/lib/migrate";
import { mergeSizingPatch } from "@/lib/layoutSizing";
import {
  isContainerKind,
  type Interaction,
  type InteractionAction,
  type InteractionEvent,
  type LayoutDocument,
  type LayoutNode,
  type Module,
  type ModuleRefProps,
  type NodeDocument,
  type NodeKind,
  type NodeProps,
  type Page,
  type PageEdge,
  type SizingProps,
  type ViewportSettings,
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

// 현재 페이지 조회 (currentPageId가 유효하지 않으면 첫 페이지 폴백).
export function currentPage(doc: NodeDocument): Page | null {
  if (!doc.pages.length) return null;
  return doc.pages.find((p) => p.id === doc.currentPageId) ?? doc.pages[0];
}

// 활성 편집 대상 root. 모듈 편집 중이면 모듈 root, 아니면 현재 페이지 root.
export function activeRoot(state: LayoutState): LayoutNode | null {
  if (state.editingModuleId) {
    return (
      state.document.modules.find((m) => m.id === state.editingModuleId)?.root ?? null
    );
  }
  return currentPage(state.document)?.root ?? null;
}

// Immer draft 환경에서 안전하게 activeRoot를 얻기 위한 헬퍼
function activeRootInDraft(
  draft: NodeDocument,
  editingModuleId: string | null,
): LayoutNode | null {
  if (editingModuleId) {
    return draft.modules.find((m) => m.id === editingModuleId)?.root ?? null;
  }
  const pg = draft.pages.find((p) => p.id === draft.currentPageId) ?? draft.pages[0];
  return pg?.root ?? null;
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

function isAncestor(node: LayoutNode, possibleDescendantId: string): boolean {
  if (!node.children) return false;
  for (const c of node.children) {
    if (c.id === possibleDescendantId) return true;
    if (isAncestor(c, possibleDescendantId)) return true;
  }
  return false;
}

// 서브트리를 재귀 복제하면서 모든 id를 새로 발급
export function cloneWithNewIds(node: LayoutNode): LayoutNode {
  return {
    ...node,
    id: newId(),
    props: { ...node.props },
    sizing: node.sizing ? { ...node.sizing } : undefined,
    // interactions도 새 id로 깊이 복사해 참조 충돌 방지
    interactions: node.interactions?.map((i) => ({ ...i, id: newId("int") })),
    children: node.children?.map(cloneWithNewIds),
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

// 재귀적으로 특정 module-ref를 제거 (removeModule에서 사용)
function pruneModuleRefs(node: LayoutNode, moduleId: string): void {
  if (!node.children) return;
  node.children = node.children.filter((c) => {
    if (c.kind === "module-ref" && (c.props as ModuleRefProps).moduleId === moduleId) {
      return false;
    }
    pruneModuleRefs(c, moduleId);
    return true;
  });
}

export type EditorMode = "canvas" | "node" | "preview";

export interface LayoutState {
  document: NodeDocument;
  mode: EditorMode;
  selectedId: string | null;
  selectedIds: string[];
  toggleSelectMulti: (id: string) => void;
  clearMultiSelect: () => void;
  updatePropsMulti: (ids: string[], patch: Partial<NodeProps>) => void;
  selectedPageId: string | null;
  editingModuleId: string | null;
  past: NodeDocument[];
  future: NodeDocument[];

  // 기존 액션 (시그니처 유지)
  setDocument: (doc: LayoutDocument | NodeDocument) => void;
  resetDocument: () => void;
  select: (id: string | null) => void;
  addNode: (parentId: string, node: LayoutNode, index?: number) => void;
  addNewNode: (parentId: string, kind: NodeKind, index?: number) => LayoutNode;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  updateProps: (id: string, patch: Partial<NodeProps>) => void;
  updateTitle: (title: string) => void;
  updateViewport: (patch: Partial<ViewportSettings>) => void;
  /** sizing·flexMainAxis 등 노드 프레임 필드 병합 */
  patchNode: (
    id: string,
    patch: {
      sizing?: Partial<SizingProps>;
      flexMainAxis?: LayoutNode["flexMainAxis"] | null;
    },
  ) => void;
  updateSizing: (id: string, patch: Partial<SizingProps>) => void;
  addInteraction: (nodeId: string, event: InteractionEvent, action: InteractionAction) => Interaction | null;
  updateInteraction: (nodeId: string, interactionId: string, patch: Partial<Omit<Interaction, "id">>) => void;
  removeInteraction: (nodeId: string, interactionId: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 신규 액션 (Phase A)
  addPage: (title?: string, root?: LayoutNode) => Page;
  duplicatePage: (pageId: string, x?: number, y?: number) => void;
  removePage: (pageId: string) => void;
  updatePage: (pageId: string, patch: Partial<Omit<Page, "id" | "root">>) => void;
  setCurrentPage: (pageId: string) => void;
  movePage: (pageId: string, x: number, y: number) => void;

  registerModule: (sourceNodeId: string) => Module | null;
  unlinkModule: (nodeId: string) => void;
  updateModule: (moduleId: string, patch: Partial<Omit<Module, "id" | "root">>) => void;
  removeModule: (moduleId: string) => void;
  enterModuleEdit: (moduleId: string) => void;
  exitModuleEdit: () => void;

  addEdge: (source: string, target: string, sourceHandle?: string) => PageEdge;
  removeEdge: (edgeId: string) => void;

  setMode: (mode: EditorMode) => void;
}

function snapshot(doc: NodeDocument): NodeDocument {
  return JSON.parse(JSON.stringify(doc));
}

function commit(
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

export const useLayoutStore = create<LayoutState>((set, get) => ({
  document: createEmptyNodeDocument(),
  mode: "canvas",
  selectedId: null,
  selectedIds: [],
  selectedPageId: null,
  editingModuleId: null,
  past: [],
  future: [],

  setDocument: (doc) =>
    set(() => ({
      document: migrateToV2(doc),
      past: [],
      future: [],
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
      selectedId: null,
      selectedIds: [],
      selectedPageId: null,
      editingModuleId: null,
    })),

  select: (id) => set({ selectedId: id, selectedIds: [] }),

  toggleSelectMulti: (id: string) =>
    set((s) => {
      const root = activeRoot(s);
      if (!root) return {};
      const clickedNode = findNode(root, id);
      if (!clickedNode) return {};
      const current =
        s.selectedIds.length > 0
          ? s.selectedIds
          : s.selectedId
            ? [s.selectedId]
            : [];
      if (current.length > 0) {
        const firstNode = findNode(root, current[0]);
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

  updatePropsMulti: (ids, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        for (const id of ids) {
          const node = findNode(root, id);
          if (!node) continue;
          Object.assign(node.props, patch);
        }
      }),
    ),

  addNode: (parentId, node, index) =>
    set((s) =>
      commit(s, (draft) => {
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        const parent = findNode(root, parentId);
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
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        if (nodeId === root.id) return; // 루트는 이동 불가
        const sourceParent = findParent(root, nodeId);
        const target = findNode(root, targetParentId);
        if (!sourceParent || !target || !isContainerKind(target.kind)) return;
        const srcNode = findNode(root, nodeId);
        if (!srcNode) return;
        if (isAncestor(srcNode, targetParentId)) return;
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
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        const node = findNode(root, id);
        if (!node) return;
        node.props = { ...node.props, ...patch } as NodeProps;
      }),
    ),

  patchNode: (id, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        const node = findNode(root, id);
        if (!node) return;
        if (patch.sizing !== undefined) {
          node.sizing = mergeSizingPatch(node.sizing ?? {}, patch.sizing);
        }
        if ("flexMainAxis" in patch) {
          if (patch.flexMainAxis !== undefined && patch.flexMainAxis !== null) {
            node.flexMainAxis = patch.flexMainAxis;
          } else {
            delete node.flexMainAxis;
          }
        }
      }),
    ),

  updateSizing: (id, patch) => get().patchNode(id, { sizing: patch }),

  addInteraction: (nodeId, event, action) => {
    let created: Interaction | null = null;
    set((s) =>
      commit(s, (draft) => {
        const draftRoot = activeRootInDraft(draft, s.editingModuleId);
        if (!draftRoot) return;
        const node = findNode(draftRoot, nodeId);
        if (!node) return;
        const entry: Interaction = {
          id: newId("int"),
          event,
          action,
        };
        node.interactions = [...(node.interactions ?? []), entry];
        created = entry;
      }),
    );
    return created;
  },

  updateInteraction: (nodeId, interactionId, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const draftRoot = activeRootInDraft(draft, s.editingModuleId);
        if (!draftRoot) return;
        const node = findNode(draftRoot, nodeId);
        if (!node?.interactions) return;
        const idx = node.interactions.findIndex((i) => i.id === interactionId);
        if (idx < 0) return;
        node.interactions[idx] = { ...node.interactions[idx], ...patch };
      }),
    ),

  removeInteraction: (nodeId, interactionId) =>
    set((s) =>
      commit(s, (draft) => {
        const draftRoot = activeRootInDraft(draft, s.editingModuleId);
        if (!draftRoot) return;
        const node = findNode(draftRoot, nodeId);
        if (!node?.interactions) return;
        node.interactions = node.interactions.filter((i) => i.id !== interactionId);
        if (node.interactions.length === 0) delete node.interactions;
      }),
    ),

  updateTitle: (title) =>
    set((s) =>
      commit(s, (draft) => {
        draft.title = title;
      }),
    ),

  // Phase A에서 viewport는 페이지 단위. 모듈 편집 중에는 no-op.
  updateViewport: (patch) =>
    set((s) =>
      commit(s, (draft) => {
        if (s.editingModuleId) return;
        const page = draft.pages.find((p) => p.id === draft.currentPageId) ?? draft.pages[0];
        if (!page) return;
        const prev = page.viewport ?? { preset: "free" as const };
        page.viewport = { ...prev, ...patch };
      }),
    ),

  removeNode: (id) =>
    set((s) =>
      commit(s, (draft) => {
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        if (id === root.id) return;
        const parent = findParent(root, id);
        if (!parent) return;
        removeFromParent(parent, id);
      }),
    ),

  duplicateNode: (id) =>
    set((s) =>
      commit(s, (draft) => {
        const root = activeRootInDraft(draft, s.editingModuleId);
        if (!root) return;
        if (id === root.id) return;
        const parent = findParent(root, id);
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

  // --- 신규 액션 ---

  addPage: (title = "New Page", root?: LayoutNode) => {
    const st = get();
    const base = createEmptyPage(title, st.document.pages.length);
    const page = root ? { ...base, root } : base;
    set((s) =>
      commit(s, (draft) => {
        draft.pages.push(page);
        draft.currentPageId = page.id;
      }),
    );
    // selectedId가 이전 페이지 노드를 가리키지 않도록 리셋
    set({ selectedId: null });
    return page;
  },

  duplicatePage: (pageId, x, y) => {
    const st = get();
    const src = st.document.pages.find((p) => p.id === pageId);
    if (!src) return;
    const newPage: Page = {
      id: newId("page"),
      title: `${src.title} 복사`,
      root: cloneWithNewIds(src.root),
      position: {
        x: x ?? src.position.x + 340,
        y: y ?? src.position.y + 40,
      },
      viewport: src.viewport,
      isPopup: src.isPopup,
    };
    set((s) => commit(s, (draft) => { draft.pages.push(newPage); }));
  },

  removePage: (pageId) =>
    set((s) => {
      const doc = s.document;
      const target = doc.pages.find((p) => p.id === pageId);
      if (!target) return {};
      // 히스토리 기록은 commit 안에서만. 여기선 새로 구성한 document를 set.
      const nextPages = doc.pages.filter((p) => p.id !== pageId);
      const prev = snapshot(doc);
      let finalDoc: NodeDocument;
      if (nextPages.length === 0) {
        // 최소 1페이지 보장: 빈 페이지 생성
        const blank = createEmptyPage("Page 1", 0);
        finalDoc = produce(doc, (draft) => {
          draft.pages = [blank];
          draft.currentPageId = blank.id;
          draft.edges = draft.edges.filter(
            (e) => e.source !== pageId && e.target !== pageId,
          );
          draft.updatedAt = Date.now();
        });
      } else {
        finalDoc = produce(doc, (draft) => {
          draft.pages = draft.pages.filter((p) => p.id !== pageId);
          if (draft.currentPageId === pageId) {
            draft.currentPageId = draft.pages[0].id;
          }
          draft.edges = draft.edges.filter(
            (e) => e.source !== pageId && e.target !== pageId,
          );
          draft.updatedAt = Date.now();
        });
      }
      // 제거된 페이지 내부 노드가 선택돼있었다면 clear
      const selectionBelongsToRemoved = s.selectedId
        ? findNode(target.root, s.selectedId) !== null
        : false;
      return {
        document: finalDoc,
        past: [...s.past, prev].slice(-HISTORY_LIMIT),
        future: [],
        selectedId: selectionBelongsToRemoved ? null : s.selectedId,
      };
    }),

  updatePage: (pageId, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const p = draft.pages.find((pg) => pg.id === pageId);
        if (!p) return;
        Object.assign(p, patch);
      }),
    ),

  setCurrentPage: (pageId) =>
    set((s) => {
      if (!s.document.pages.some((p) => p.id === pageId)) return {};
      return {
        document: { ...s.document, currentPageId: pageId },
        selectedId: null,
        selectedIds: [],
      };
    }),

  movePage: (pageId, x, y) =>
    set((s) =>
      commit(s, (draft) => {
        const p = draft.pages.find((pg) => pg.id === pageId);
        if (!p) return;
        p.position = { x, y };
      }),
    ),

  registerModule: (sourceNodeId) => {
    const st = get();
    const root = activeRoot(st);
    if (!root) return null;
    const src = findNode(root, sourceNodeId);
    if (!src) return null;
    // 조건: 컨테이너여야 하고, 루트/이미 module-ref는 금지
    if (!isContainerKind(src.kind)) return null;
    if (src.id === root.id) return null;
    if (src.kind === "module-ref") return null;

    const clonedRoot = cloneWithNewIds(src);
    const fallbackLabel =
      (src.props as { label?: string; title?: string }).label ??
      (src.props as { label?: string; title?: string }).title ??
      `Module ${st.document.modules.length + 1}`;
    const mod: Module = {
      id: newId("mod"),
      name: fallbackLabel,
      root: clonedRoot,
    };

    set((s) =>
      commit(s, (draft) => {
        draft.modules.push(mod);
        const activeRootDraft = activeRootInDraft(draft, s.editingModuleId);
        if (!activeRootDraft) return;
        const node = findNode(activeRootDraft, sourceNodeId);
        if (!node) return;
        node.kind = "module-ref";
        node.children = undefined;
        node.props = { moduleId: mod.id, label: mod.name } as ModuleRefProps;
      }),
    );
    return mod;
  },

  unlinkModule: (nodeId) => {
    const st = get();
    const root = activeRoot(st);
    if (!root) return;
    const node = findNode(root, nodeId);
    if (!node || node.kind !== "module-ref") return;
    const p = node.props as ModuleRefProps;
    const mod = st.document.modules.find((m) => m.id === p.moduleId);
    if (!mod) return;
    const replacement = cloneWithNewIds(mod.root);

    set((s) =>
      commit(s, (draft) => {
        const ar = activeRootInDraft(draft, s.editingModuleId);
        if (!ar) return;
        const parent = findParent(ar, nodeId);
        if (!parent?.children) return;
        const idx = parent.children.findIndex((c) => c.id === nodeId);
        if (idx < 0) return;
        parent.children[idx] = replacement;
      }),
    );
  },

  updateModule: (moduleId, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const m = draft.modules.find((mm) => mm.id === moduleId);
        if (!m) return;
        Object.assign(m, patch);
      }),
    ),

  removeModule: (moduleId) =>
    set((s) =>
      commit(s, (draft) => {
        draft.modules = draft.modules.filter((m) => m.id !== moduleId);
        // 모든 페이지 + 남은 모듈 root 내부의 module-ref 중 해당 id를 가리키는 노드 제거
        draft.pages.forEach((p) => pruneModuleRefs(p.root, moduleId));
        draft.modules.forEach((m) => pruneModuleRefs(m.root, moduleId));
      }),
    ),

  enterModuleEdit: (moduleId) =>
    set((s) => {
      const exists = s.document.modules.some((m) => m.id === moduleId);
      if (!exists) return {};
      return { editingModuleId: moduleId, selectedId: null, selectedIds: [] };
    }),

  exitModuleEdit: () => set({ editingModuleId: null, selectedId: null, selectedIds: [] }),

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

  setMode: (mode) => set({ mode }),
}));

/** 트리에서 id로 노드 조회 (인스펙터·리사이즈 핸들 등에서 사용) */
export function findLayoutNode(root: LayoutNode, id: string): LayoutNode | null {
  return findNode(root, id);
}

export function findLayoutParent(root: LayoutNode, childId: string): LayoutNode | null {
  return findParent(root, childId);
}
