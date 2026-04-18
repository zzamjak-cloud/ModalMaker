// 전역 단축키 (Undo/Redo, 삭제) 바인딩 훅
import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layoutStore";

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 텍스트 입력 포커스 시 삭제 단축키 무시 (편집 방해 방지)
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isEditing =
        tag === "input" || tag === "textarea" || t?.isContentEditable === true;

      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) {
          e.preventDefault();
          useLayoutStore.getState().undo();
          return;
        }
        if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
          e.preventDefault();
          useLayoutStore.getState().redo();
          return;
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        const { selectedId, removeNode, document: doc } = useLayoutStore.getState();
        if (!selectedId || selectedId === doc.root.id) return;
        e.preventDefault();
        removeNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
