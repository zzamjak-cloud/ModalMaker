// 노드 트리 뮤테이션 — 선택된 루트(페이지 또는 편집 중 모듈)의 하위 트리를 조작.
// addNode/updateProps/moveNode/removeNode/duplicateNode/인터렉션/뷰포트/제목 등.
import type { StoreApi } from "zustand";
import { newId } from "@/lib/id";
import { mergeSizingPatch } from "@/lib/layoutSizing";
import {
  isContainerKind,
  type Interaction,
  type LayoutNode,
  type NodeKind,
  type NodeProps,
} from "@/types/layout";
import type { LayoutState } from "./types";
import {
  activeRootInDraft,
  findLayoutNode,
  findLayoutParent,
  isAncestor,
  removeFromParent,
} from "./graph";
import { commit } from "./commit";
import { cloneWithNewIds } from "./cloneTree";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export type NodeActionsDeps = {
  createNode: (kind: NodeKind, overrides?: Partial<LayoutNode>) => LayoutNode;
};

export function buildNodeActions(
  set: LayoutSet,
  get: LayoutGet,
  deps: NodeActionsDeps,
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
> {
  const { createNode } = deps;

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
  };
}
