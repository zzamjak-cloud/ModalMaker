// 페이지 CRUD — addPage / duplicatePage / removePage / updatePage / setCurrentPage / movePage
// removePage는 commit 밖에서 produce하는 특수 경로라서 past/future 동기화를 직접 수행한다.
import { produce } from "immer";
import type { StoreApi } from "zustand";
import { newId } from "@/lib/id";
import type { LayoutNode, NodeDocument, Page } from "@/types/layout";
import type { LayoutState } from "./types";
import { findLayoutNode } from "./graph";
import { commit, snapshot, HISTORY_LIMIT } from "./commit";
import { cloneWithNewIds } from "./cloneTree";

type LayoutSet = StoreApi<LayoutState>["setState"];
type LayoutGet = StoreApi<LayoutState>["getState"];

export type PageActionsDeps = {
  createEmptyPage: (title: string, index: number) => Page;
};

export function buildPageActions(
  set: LayoutSet,
  get: LayoutGet,
  deps: PageActionsDeps,
): Pick<
  LayoutState,
  | "addPage"
  | "duplicatePage"
  | "removePage"
  | "updatePage"
  | "setCurrentPage"
  | "movePage"
> {
  const { createEmptyPage } = deps;

  return {
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
  };
}
