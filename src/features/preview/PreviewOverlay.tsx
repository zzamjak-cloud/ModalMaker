// 프리뷰 풀스크린 오버레이 — 히스토리 스택 + 테마 선택 지원
import { Fragment, useEffect, useLayoutEffect } from "react";
import { X, ChevronLeft, RotateCcw } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { usePreviewSessionStore } from "./previewSessionStore";
import { PreviewRenderer } from "./PreviewRenderer";
import { ThemeProvider, useTheme } from "./ThemeContext";
import type { PreviewContext } from "./previewRuntime";
import { ViewportFrame, PopupViewportFrame, resolveViewportSize } from "./ViewportFrame";
import { ThemePicker } from "./ThemePicker";

function PreviewContent() {
  const document = useLayoutStore((s) => s.document);
  const setMode = useLayoutStore((s) => s.setMode);
  const t = useTheme();

  const currentPageId = usePreviewSessionStore((s) => s.currentPageId);
  const history = usePreviewSessionStore((s) => s.history);
  const tabActiveMap = usePreviewSessionStore((s) => s.tabActiveMap);
  const navigate = usePreviewSessionStore((s) => s.navigate);
  const close = usePreviewSessionStore((s) => s.close);
  const back = usePreviewSessionStore((s) => s.back);
  const jumpToHistory = usePreviewSessionStore((s) => s.jumpToHistory);
  const reset = usePreviewSessionStore((s) => s.reset);
  const setTabActive = usePreviewSessionStore((s) => s.setTabActive);
  const hydrate = usePreviewSessionStore((s) => s.hydrate);
  const clearSession = usePreviewSessionStore((s) => s.clear);

  useLayoutEffect(() => {
    hydrate(useLayoutStore.getState().document);
    return () => clearSession();
  }, [hydrate, clearSession]);

  const page =
    currentPageId != null
      ? (document.pages.find((p) => p.id === currentPageId) ?? document.pages[0])
      : document.pages[0];
  const isCurrentPopup = page?.isPopup ?? false;
  const bgPage = isCurrentPopup && history.length > 0
    ? (document.pages.find((p) => p.id === history[history.length - 1]) ?? null)
    : null;

  const exitPreview = () => {
    clearSession();
    setMode("canvas");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitPreview();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [exitPreview]);

  const ctx: PreviewContext = { navigate, close, tabActiveMap, setTabActive };

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
        <Breadcrumbs
          history={history}
          currentPageId={currentPageId ?? page?.id ?? ""}
          pages={document.pages}
          onJump={jumpToHistory}
        />
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

      {/* 렌더 영역 — 테마 배경 적용. ViewportFrame이 absolute inset-0으로 채움. */}
      <div className="relative min-h-0 flex-1" style={{ backgroundColor: t.canvasBg }}>
        {/* 기본 페이지: 팝업이면 배경 페이지, 아니면 현재 페이지 */}
        {isCurrentPopup
          ? (bgPage
              ? <ViewportFrame page={bgPage}><PreviewRenderer node={bgPage.root} ctx={ctx} depth={0} parentIsFlexContainer={resolveViewportSize(bgPage.viewport) !== null} parentDirection="column" /></ViewportFrame>
              : null)
          : (page
              ? <ViewportFrame page={page}><PreviewRenderer node={page.root} ctx={ctx} depth={0} parentIsFlexContainer={resolveViewportSize(page.viewport) !== null} parentDirection="column" /></ViewportFrame>
              : null)
        }

        {/* 팝업 오버레이: 딤머 + 팝업 콘텐츠 (팝업 고유 뷰포트 크기로 중앙 표시) */}
        {isCurrentPopup && page && (
          <>
            <div className="absolute inset-0 z-10 cursor-pointer bg-black/50" onClick={back} />
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
              <div className="pointer-events-auto">
                <PopupViewportFrame page={page}>
                  <PreviewRenderer node={page.root} ctx={ctx} depth={0} parentIsFlexContainer={resolveViewportSize(page.viewport) !== null} parentDirection="column" />
                </PopupViewportFrame>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// OS 탐색기 스타일 경로 네비게이션 — 히스토리 항목 클릭 시 해당 지점으로 바로 이동
function Breadcrumbs({
  history,
  currentPageId,
  pages,
  onJump,
}: {
  history: string[];
  currentPageId: string;
  pages: { id: string; title: string }[];
  onJump: (idx: number) => void;
}) {
  function getTitle(id: string) {
    return pages.find((p) => p.id === id)?.title ?? "(빈 페이지)";
  }
  return (
    <div className="mx-2 flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto text-xs">
      {history.map((id, idx) => (
        <Fragment key={id + idx}>
          <button
            onClick={() => onJump(idx)}
            className="max-w-[100px] shrink-0 truncate text-neutral-400 hover:text-neutral-100"
            title={getTitle(id)}
          >
            {getTitle(id)}
          </button>
          <span className="shrink-0 select-none text-neutral-700">/</span>
        </Fragment>
      ))}
      <span
        className="max-w-[140px] truncate font-medium text-neutral-100"
        title={getTitle(currentPageId)}
      >
        {getTitle(currentPageId)}
      </span>
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
