// 문서 트리 순회·부모/자식 관계 (스토어 슬라이스와 무관한 순수 유틸)
import type { LayoutNode, ModuleRefProps, NodeDocument, Page } from "@/types/layout";
import type { LayoutState } from "./types";

export function currentPage(doc: NodeDocument): Page | null {
  if (!doc.pages.length) return null;
  return doc.pages.find((p) => p.id === doc.currentPageId) ?? doc.pages[0];
}

export function activeRoot(
  state: Pick<LayoutState, "document" | "editingModuleId">,
): LayoutNode | null {
  if (state.editingModuleId) {
    return state.document.modules.find((m) => m.id === state.editingModuleId)?.root ?? null;
  }
  return currentPage(state.document)?.root ?? null;
}

export function activeRootInDraft(
  draft: NodeDocument,
  editingModuleId: string | null,
): LayoutNode | null {
  if (editingModuleId) {
    return draft.modules.find((m) => m.id === editingModuleId)?.root ?? null;
  }
  const pg = draft.pages.find((p) => p.id === draft.currentPageId) ?? draft.pages[0];
  return pg?.root ?? null;
}

export function findLayoutNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const hit = findLayoutNode(c, id);
    if (hit) return hit;
  }
  return null;
}

export function findLayoutParent(root: LayoutNode, childId: string): LayoutNode | null {
  if (!root.children) return null;
  for (const c of root.children) {
    if (c.id === childId) return root;
    const hit = findLayoutParent(c, childId);
    if (hit) return hit;
  }
  return null;
}

export function removeFromParent(parent: LayoutNode, childId: string): LayoutNode | null {
  if (!parent.children) return null;
  const idx = parent.children.findIndex((c) => c.id === childId);
  if (idx < 0) return null;
  const [removed] = parent.children.splice(idx, 1);
  return removed;
}

export function isAncestor(node: LayoutNode, possibleDescendantId: string): boolean {
  if (!node.children) return false;
  for (const c of node.children) {
    if (c.id === possibleDescendantId) return true;
    if (isAncestor(c, possibleDescendantId)) return true;
  }
  return false;
}

export function pruneModuleRefs(node: LayoutNode, moduleId: string): void {
  if (!node.children) return;
  node.children = node.children.filter((c) => {
    if (c.kind === "module-ref" && (c.props as ModuleRefProps).moduleId === moduleId) {
      return false;
    }
    pruneModuleRefs(c, moduleId);
    return true;
  });
}
