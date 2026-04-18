// 프리뷰 풀스크린 오버레이 — 히스토리 스택 + 테마 선택 지원
import { useState, useCallback, useEffect } from "react";
import { X, ChevronLeft, RotateCcw, Palette } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { PreviewRenderer } from "./PreviewRenderer";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { useThemeStore } from "./themeStore";
import { THEME_LABELS, type ThemeName, type ThemeTokens } from "./themes";
import type { PreviewContext } from "./previewRuntime";

const THEME_OPTIONS: ThemeName[] = ["os", "dark", "light", "warm", "ocean"];

function ThemePicker() {
  const { theme, setTheme } = useThemeStore();
  const [open, setOpen] = useState(false);
  const t = useTheme();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
        title="테마 변경"
      >
        <Palette size={12} />
        {THEME_LABELS[theme]}
      </button>
      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 min-w-[110px] rounded-md border border-neutral-800 bg-neutral-900 py-1 shadow-xl"
          onMouseLeave={() => setOpen(false)}
        >
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { setTheme(opt); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-neutral-800 ${theme === opt ? "text-sky-400" : "text-neutral-200"}`}
            >
              <span
                className="h-3 w-3 rounded-full border border-neutral-700"
                style={{ background: previewDot(opt, t) }}
              />
              {THEME_LABELS[opt]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// 테마 미리보기 dot 색상 — 현재 토큰 기반
function previewDot(opt: ThemeName, current: ThemeTokens): string {
  const map: Record<ThemeName, string> = {
    os: current.accentBg,
    dark: "#171717",
    light: "#f5f5f5",
    warm: "#f59e0b",
    ocean: "#0284c7",
  };
  return map[opt];
}

function PreviewContent() {
  const document = useLayoutStore((s) => s.document);
  const setMode = useLayoutStore((s) => s.setMode);
  const initialPageId = document.currentPageId;
  const t = useTheme();

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

  const exitPreview = useCallback(() => setMode("canvas"), [setMode]);

  const back = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setCurrentPageId(prev);
      return h.slice(0, -1);
    });
  }, []);

  // 인터렉션 close 액션: 프리뷰 종료 대신 뒤로 가기 또는 지정 페이지 이동
  const close = useCallback(
    (targetPageId?: string) => {
      if (targetPageId && document.pages.some((p) => p.id === targetPageId)) {
        setHistory((h) => [...h, currentPageId]);
        setCurrentPageId(targetPageId);
      } else {
        back();
      }
    },
    [back, document.pages, currentPageId],
  );

  const reset = useCallback(() => {
    setCurrentPageId(initialPageId);
    setHistory([]);
  }, [initialPageId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPreview]);

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
        <ThemePicker />
        <button
          onClick={exitPreview}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-200 hover:bg-neutral-800"
        >
          <X size={12} />
          닫기 (Esc)
        </button>
      </div>

      {/* 렌더 영역 — 테마 배경 적용 */}
      <div
        className="flex flex-1 items-start justify-center overflow-auto p-8"
        style={{ backgroundColor: t.canvasBg }}
      >
        {page ? <PreviewRenderer node={page.root} ctx={ctx} depth={0} /> : null}
      </div>
    </div>
  );
}

export function PreviewOverlay() {
  return (
    <ThemeProvider>
      <PreviewContent />
    </ThemeProvider>
  );
}
