// 프리뷰 풀스크린 오버레이 — 현재 페이지를 읽기 전용 인터렉티브로 렌더한다.
// 히스토리 스택을 유지해 뒤로 가기 지원.
import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, RotateCcw } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { PreviewRenderer } from "./PreviewRenderer";
import type { PreviewContext } from "./previewRuntime";

export function PreviewOverlay() {
  const document = useLayoutStore((s) => s.document);
  const setMode = useLayoutStore((s) => s.setMode);
  const initialPageId = document.currentPageId;

  const [currentPageId, setCurrentPageId] = useState(initialPageId);
  const [history, setHistory] = useState<string[]>([]);

  const page = document.pages.find((p) => p.id === currentPageId) ?? document.pages[0];

  const navigate = useCallback(
    (pageId: string) => {
      if (pageId === currentPageId) return;
      if (!document.pages.some((p) => p.id === pageId)) return;
      setHistory((h) => [...h, currentPageId]);
      setCurrentPageId(pageId);
    },
    [currentPageId, document.pages],
  );

  const close = useCallback(() => setMode("canvas"), [setMode]);
  const back = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrentPageId(prev);
      return h.slice(0, -1);
    });
  }, []);
  const reset = useCallback(() => {
    setCurrentPageId(initialPageId);
    setHistory([]);
  }, [initialPageId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const ctx: PreviewContext = { navigate, close };

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-950">
      {/* 상단 바 */}
      <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-4 py-2">
        <span className="text-xs uppercase tracking-wider text-sky-400">Preview</span>
        <div className="h-5 w-px bg-neutral-800" />
        <button
          onClick={back}
          disabled={history.length === 0}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={12} />
          뒤로
        </button>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
          title="시작 페이지로"
        >
          <RotateCcw size={12} />
          처음
        </button>
        <div className="mx-2 truncate text-sm text-neutral-200">{page?.title ?? "(빈 페이지)"}</div>
        <div className="flex-1" />
        <button
          onClick={close}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          <X size={12} />
          닫기 (Esc)
        </button>
      </div>

      {/* 렌더 영역 */}
      <div className="flex flex-1 items-start justify-center overflow-auto bg-neutral-950 p-8">
        {page ? <PreviewRenderer node={page.root} ctx={ctx} /> : null}
      </div>
    </div>
  );
}
