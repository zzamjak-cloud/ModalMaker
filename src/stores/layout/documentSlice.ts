// 문서·트리 뮤테이션 + 페이지/모듈/엣지 (commit 기반) — Phase 3 document 슬라이스
import { produce } from "immer";
import type { StoreApi } from "zustand";
import { newId } from "@/lib/id";
import { mergeSizingPatch } from "@/lib/layoutSizing";
import {
  isContainerKind,
  type Interaction,
  type LayoutNode,
  type Module,
  type ModuleRefProps,
  type NodeDocument,
  type NodeKind,
  type NodeProps,
  type Page,
  type PageEdge,
} from "@/types/layout";
import type { LayoutState } from "./types";
import {
  activeRoot,
  activeRootInDraft,
  findLayoutNode,
  findLayoutParent,
  isAncestor,
  pruneModuleRefs,
  removeFromParent,
} from "./graph";
import { commit, snapshot, HISTORY_LIMIT } from "./commit";
import { cloneWithNewIds } from "./cloneTree";

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
): Pick<
  LayoutState,
  | "updatePropsMulti"
  | "addNode"
  | "addNewNode"
  | "moveNode"
  | "updateProps"
  | "patchNode"
  | "updateSizing"
  | "addInteraction"
  | "updateInteraction"
  | "removeInteraction"
  | "updateTitle"
  | "updateViewport"
  | "removeNode"
  | "duplicateNode"
  | "addPage"
  | "duplicatePage"
  | "removePage"
  | "updatePage"
  | "setCurrentPage"
  | "movePage"
  | "registerModule"
  | "unlinkModule"
  | "updateModule"
  | "removeModule"
  | "addEdge"
  | "removeEdge"
> {
  const { createEmptyPage, createNode } = deps;

  return {
    updatePropsMulti: (ids, patch) =>
      set((s) =>
        commit(s, (draft) => {
          const root = activeRootInDraft(draft, s.editingModuleId);
          if (!root) return;
          for (const id of ids) {
            const node = findLayoutNode(root, id);
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
          const parent = findLayoutNode(root, parentId);
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
          if (nodeId === root.id) return;
          const sourceParent = findLayoutParent(root, nodeId);
          const target = findLayoutNode(root, targetParentId);
          if (!sourceParent || !target || !isContainerKind(target.kind)) return;
          const srcNode = findLayoutNode(root, nodeId);
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
          const node = findLayoutNode(root, id);
          if (!node) return;
          node.props = { ...node.props, ...patch } as NodeProps;
        }),
      ),

    patchNode: (id, patch) =>
      set((s) =>
        commit(s, (draft) => {
          const root = activeRootInDraft(draft, s.editingModuleId);
          if (!root) return;
          const node = findLayoutNode(root, id);
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
          const node = findLayoutNode(draftRoot, nodeId);
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
          const node = findLayoutNode(draftRoot, nodeId);
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
          const node = findLayoutNode(draftRoot, nodeId);
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
          const parent = findLayoutParent(root, id);
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
          const parent = findLayoutParent(root, id);
          if (!parent?.children) return;
          const idx = parent.children.findIndex((c) => c.id === id);
          if (idx < 0) return;
          const clone = cloneWithNewIds(parent.children[idx]);
          parent.children.splice(idx + 1, 0, clone);
        }),
      ),

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
        const nextPages = doc.pages.filter((p) => p.id !== pageId);
        const prev = snapshot(doc);
        let finalDoc: NodeDocument;
        if (nextPages.length === 0) {
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
        const selectionBelongsToRemoved = s.selectedId
          ? findLayoutNode(target.root, s.selectedId) !== null
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
      const src = findLayoutNode(root, sourceNodeId);
      if (!src) return null;
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
          const node = findLayoutNode(activeRootDraft, sourceNodeId);
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
      const node = findLayoutNode(root, nodeId);
      if (!node || node.kind !== "module-ref") return;
      const p = node.props as ModuleRefProps;
      const mod = st.document.modules.find((m) => m.id === p.moduleId);
      if (!mod) return;
      const replacement = cloneWithNewIds(mod.root);

      set((s) =>
        commit(s, (draft) => {
          const ar = activeRootInDraft(draft, s.editingModuleId);
          if (!ar) return;
          const parent = findLayoutParent(ar, nodeId);
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
          draft.pages.forEach((p) => pruneModuleRefs(p.root, moduleId));
          draft.modules.forEach((m) => pruneModuleRefs(m.root, moduleId));
        }),
      ),

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
