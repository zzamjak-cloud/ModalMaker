// 프리뷰 풀스크린 오버레이 — 히스토리 스택 + 테마 선택 지원
import { Fragment, useState, useCallback, useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { X, ChevronLeft, RotateCcw, Palette } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { PreviewRenderer } from "./PreviewRenderer";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { useThemeStore } from "./themeStore";
import { THEME_LABELS, type ThemeName, type ThemeTokens } from "./themes";
import type { PreviewContext } from "./previewRuntime";
import { VIEWPORT_PRESETS } from "@/types/layout";
import type { LayoutNode, ButtonProps, ModuleRefProps, NodeDocument, Page, ViewportSettings } from "@/types/layout";

// 뷰포트 설정 → 픽셀 크기. free/undefined면 null 반환.
function resolveViewportSize(v?: ViewportSettings) {
  if (!v || v.preset === "free") return null;
  const safe = Math.max(0, Math.min(20, v.safeAreaPct ?? 0));
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720, safe };
  if (v.preset === "custom-w") return { width: v.width ?? 1280, height: null, safe };
  const p = VIEWPORT_PRESETS[v.preset as keyof typeof VIEWPORT_PRESETS];
  return { width: p.width, height: p.height, safe };
}

/**
 * 부모를 absolute inset-0으로 채우고, 뷰포트 콘텐츠를 transform:scale로 맞춤.
 * free 뷰포트면 overflow-auto + p-8 자유 스크롤 영역으로 대체.
 */
function ViewportFrame({ page, children }: { page?: Page; children: ReactNode }) {
  const size = resolveViewportSize(page?.viewport);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const heightFree = !!size && size.height === null;

  useLayoutEffect(() => {
    if (!size) return;
    const el = outerRef.current;
    if (!el) return;
    const PAD = 64;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        const scaleW = (r.width - PAD) / size.width;
        const scaleH = heightFree ? 1 : r.height > 0 ? (r.height - PAD) / size.height! : 1;
        setScale(Math.min(scaleW, scaleH, 1));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size?.width, size?.height, heightFree]);

  if (!size) {
    return (
      <div ref={outerRef} className="absolute inset-0 flex items-center justify-center overflow-auto p-8">
        {children}
      </div>
    );
  }

  if (heightFree) {
    // 너비 고정, 높이 자유: 너비 기준 스케일 후 y 스크롤
    return (
      <div ref={outerRef} className="absolute inset-0 overflow-auto p-8 flex justify-center">
        <div style={{ width: Math.round(size.width * scale), flexShrink: 0 }}>
          <div style={{
            width: size.width,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            display: "flex",
            flexDirection: "column",
            ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
          }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div style={{ width: Math.round(size.width * scale), height: Math.round(size.height! * scale), position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <div style={{
          width: size.width,
          height: size.height!,
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 팝업 전용: 고정 뷰포트 크기로 렌더링 (배경 위에 centered). free면 자연 크기. */
function PopupViewportFrame({ page, children }: { page?: Page; children: ReactNode }) {
  const size = resolveViewportSize(page?.viewport);
  if (!size) return <>{children}</>;
  return (
    <div style={{
      width: size.width,
      ...(size.height !== null ? { height: size.height } : {}),
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
    }}>
      {children}
    </div>
  );
}

function initTabActiveMap(doc: NodeDocument): Record<string, string> {
  const map: Record<string, string> = {};
  const moduleMap = new Map(doc.modules.map((m) => [m.id, m.root]));

  function walk(node: LayoutNode, visited: Set<string> = new Set()) {
    if (node.kind === "button") {
      const p = node.props as ButtonProps;
      if (p.tabGroupId && p.tabDefaultActive) {
        map[p.tabGroupId] = node.id;
      }
    } else if (node.kind === "module-ref") {
      // module-ref 내부를 순환 참조 방지하며 탐색
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

  // 모든 페이지 탐색 — 페이지 이동 후에도 기본 활성 상태가 올바르게 설정됨
  doc.pages.forEach((page) => walk(page.root));
  return map;
}

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
  // 항상 첫 번째 비팝업 페이지에서 시작 (마지막 편집 페이지가 아닌 홈 페이지)
  const initialPageId =
    document.pages.find((p) => !p.isPopup)?.id ?? document.currentPageId;
  const t = useTheme();

  const [currentPageId, setCurrentPageId] = useState(initialPageId);
  const [history, setHistory] = useState<string[]>([]);

  const [tabActiveMap, setTabActiveMapState] = useState<Record<string, string>>(
    () => initTabActiveMap(document),
  );

  const setTabActive = useCallback(
    (groupId: string, nodeId: string) =>
      setTabActiveMapState((prev) => ({ ...prev, [groupId]: nodeId })),
    [],
  );

  const page = document.pages.find((p) => p.id === currentPageId) ?? document.pages[0];
  const isCurrentPopup = page?.isPopup ?? false;
  const bgPage = isCurrentPopup && history.length > 0
    ? (document.pages.find((p) => p.id === history[history.length - 1]) ?? null)
    : null;

  const navigate = useCallback(
    (pageId: string, replace?: boolean) => {
      if (pageId === currentPageId) return;
      if (!document.pages.some((p) => p.id === pageId)) return;
      if (replace) {
        setCurrentPageId(pageId);
      } else {
        setHistory((h) => [...h, currentPageId]);
        setCurrentPageId(pageId);
      }
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

  // 히스토리 특정 인덱스 항목으로 직접 이동
  const jumpToHistory = useCallback((idx: number) => {
    setCurrentPageId(history[idx]);
    setHistory(history.slice(0, idx));
  }, [history]);

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
          currentPageId={currentPageId}
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
