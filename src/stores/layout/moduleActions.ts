// 모듈 CRUD — registerModule(컨테이너를 모듈로 추출), unlinkModule(모듈 참조를 일반 트리로 복원),
// updateModule, removeModule(모든 참조 제거).
import type { StoreApi } from "zustand";
import { newId } from "@/lib/id";
import {
  isContainerKind,
  type Module,
  type ModuleRefProps,
} from "@/types/layout";
import type { LayoutState } from "./types";
import {
  activeRoot,
  activeRootInDraft,
  findLayoutNode,
  findLayoutParent,
  pruneModuleRefs,
} from "./graph";
import { commit } from "./commit";
import { cloneWithNewIds } from "./cloneTree";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export function buildModuleActions(
  set: LayoutSet,
  get: LayoutGet,
): Pick<
  LayoutState,
  | "registerModule"
  | "unlinkModule"
  | "updateModule"
  | "removeModule"
> {
  return {
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
  };
}
