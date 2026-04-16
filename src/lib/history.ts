// 전역 단축키 (Undo/Redo) 바인딩 훅
import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layoutStore";

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        useLayoutStore.getState().undo();
      } else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
        e.preventDefault();
        useLayoutStore.getState().redo();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
