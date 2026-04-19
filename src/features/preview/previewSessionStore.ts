// 프리뷰 오버레이 전용 세션 상태 (페이지 네비·히스토리·탭 그룹 활성 맵)
import { create } from "zustand";
import type { LayoutNode, ButtonProps, ModuleRefProps, NodeDocument } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";

export function initTabActiveMap(doc: NodeDocument): Record<string, string> {
  const map: Record<string, string> = {};
  const moduleMap = new Map(doc.modules.map((m) => [m.id, m.root]));

  function walk(node: LayoutNode, visited: Set<string> = new Set()) {
    if (node.kind === "button") {
      const p = node.props as ButtonProps;
      if (p.tabGroupId && p.tabDefaultActive) {
        map[p.tabGroupId] = node.id;
      }
    } else if (node.kind === "module-ref") {
      const p = node.props as ModuleRefProps;
      if (!visited.has(p.moduleId)) {
        const modRoot = moduleMap.get(p.moduleId);
        if (modRoot) {
          const next = new Set(visited);
          next.add(p.moduleId);
          walk(modRoot, next);
        }
      }
    }
    node.children?.forEach((c) => walk(c, visited));
  }

  doc.pages.forEach((page) => walk(page.root));
  return map;
}

type SessionFields = {
  initialPageId: string | null;
  currentPageId: string | null;
  history: string[];
  tabActiveMap: Record<string, string>;
};

const emptySession = (): SessionFields => ({
  initialPageId: null,
  currentPageId: null,
  history: [],
  tabActiveMap: {},
});

export type PreviewSessionStore = SessionFields & {
  hydrate: (doc: NodeDocument) => void;
  clear: () => void;
  setTabActive: (groupId: string, nodeId: string) => void;
  navigate: (pageId: string, replace?: boolean) => void;
  back: () => void;
  jumpToHistory: (idx: number) => void;
  close: (targetPageId?: string) => void;
  reset: () => void;
};

export const usePreviewSessionStore = create<PreviewSessionStore>((set, get) => ({
  ...emptySession(),

  hydrate: (doc) => {
    const initial =
      doc.pages.find((p) => !p.isPopup)?.id ?? doc.currentPageId;
    set({
      initialPageId: initial,
      currentPageId: initial,
      history: [],
      tabActiveMap: initTabActiveMap(doc),
    });
  },

  clear: () => set(emptySession()),

  setTabActive: (groupId, nodeId) =>
    set((s) => ({ tabActiveMap: { ...s.tabActiveMap, [groupId]: nodeId } })),

  navigate: (pageId, replace) => {
    const doc = useLayoutStore.getState().document;
    const { currentPageId } = get();
    if (!currentPageId || pageId === currentPageId) return;
    if (!doc.pages.some((p) => p.id === pageId)) return;
    if (replace) {
      set({ currentPageId: pageId });
    } else {
      set((s) => ({
        currentPageId: pageId,
        history: [...s.history, currentPageId],
      }));
    }
  },

  back: () => {
    set((s) => {
      if (s.history.length === 0) return s;
      const prev = s.history[s.history.length - 1];
      return {
        currentPageId: prev,
        history: s.history.slice(0, -1),
      };
    });
  },

  jumpToHistory: (idx) => {
    const s = get();
    if (idx < 0 || idx >= s.history.length) return;
    const pageId = s.history[idx];
    set({
      currentPageId: pageId,
      history: s.history.slice(0, idx),
    });
  },

  close: (targetPageId) => {
    const doc = useLayoutStore.getState().document;
    const s = get();
    const cur = s.currentPageId;
    if (!cur) return;
    if (targetPageId && doc.pages.some((p) => p.id === targetPageId)) {
      set({
        currentPageId: targetPageId,
        history: [...s.history, cur],
      });
    } else {
      if (s.history.length === 0) return;
      const prev = s.history[s.history.length - 1];
      set({
        currentPageId: prev,
        history: s.history.slice(0, -1),
      });
    }
  },

  reset: () => {
    const { initialPageId } = get();
    if (!initialPageId) return;
    set({ currentPageId: initialPageId, history: [] });
  },
}));
