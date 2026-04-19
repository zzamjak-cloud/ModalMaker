// 전역 단축키 (Undo/Redo, 삭제, 복제) 바인딩 훅
import { useEffect } from "react";
import { useLayoutStore, activeRoot } from "@/stores/layoutStore";

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
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
        if (e.key.toLowerCase() === "d" && !isEditing) {
          e.preventDefault();
          const state = useLayoutStore.getState();
          const root = activeRoot(state);
          const { selectedId } = state;
          if (!selectedId || !root || selectedId === root.id) return;
          state.duplicateNode(selectedId);
          return;
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        const state = useLayoutStore.getState();
        const root = activeRoot(state);
        const { selectedId, removeNode } = state;
        if (!selectedId || !root || selectedId === root.id) return;
        e.preventDefault();
        removeNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
