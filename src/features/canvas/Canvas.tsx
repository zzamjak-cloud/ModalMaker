// 캔버스 루트 - 활성 편집 대상(현재 페이지 또는 편집 중 모듈)의 root를 렌더링.
// viewport가 설정되어 있으면 해당 해상도의 고정 박스로 표시하고,
// safeAreaPct로 안쪽 마진(%)을 적용한다. 모듈 편집 중에는 free 뷰포트로 간주.
import { useEffect } from "react";
import { useLayoutStore, currentPage, activeRoot } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";
import { CanvasViewport } from "./CanvasViewport";

function resolveSize(v: ViewportSettings): { width: number; height: number | null } | null {
  if (v.preset === "free") return null;
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720 };
  if (v.preset === "custom-w") return { width: v.width ?? 1280, height: null };
  const p = VIEWPORT_PRESETS[v.preset];
  return { width: p.width, height: p.height };
}

export function Canvas() {
  const state = useLayoutStore();
  const clearMultiSelect = useLayoutStore((s) => s.clearMultiSelect);
  const select = useLayoutStore((s) => s.select);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearMultiSelect();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearMultiSelect]);

  const root = activeRoot(state);
  const editingModule = state.editingModuleId
    ? state.document.modules.find((m) => m.id === state.editingModuleId) ?? null
    : null;
  const viewport: ViewportSettings = editingModule
    ? { preset: "free" }
    : currentPage(state.document)?.viewport ?? { preset: "free" };

  if (!root) {
    return (
      <div className="text-sm text-neutral-500">
        활성 편집 대상이 없습니다. 페이지를 추가하세요.
      </div>
    );
  }

  const size = resolveSize(viewport);
  const safe = Math.max(0, Math.min(20, viewport.safeAreaPct ?? 0));

  const exitModuleEdit = useLayoutStore.getState().exitModuleEdit;

  const moduleBadge = editingModule ? (
    <div className="mb-2 flex shrink-0 items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
      <span>모듈 편집 중: {editingModule.name}</span>
      <button
        type="button"
        onClick={() => exitModuleEdit()}
        className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/30"
      >
        완료
      </button>
    </div>
  ) : null;

  // 문서/페이지가 바뀌면 반드시 맞춤이 다시 돌아가야 함(해상도 문자열만으로는 Load 후 동일해 보일 수 있음)
  const fitTrigger = [
    state.document.id,
    state.document.currentPageId,
    viewport.preset,
    size?.width ?? 0,
    size?.height ?? 0,
    safe,
    state.editingModuleId ?? "",
  ].join("|");

  if (!size) {
    return (
      <div
        className="flex min-h-0 flex-1 flex-col"
        onClick={() => {
          clearMultiSelect();
          select(null);
        }}
      >
        {moduleBadge}
        <CanvasViewport
          key={`${state.document.id}|free|${state.editingModuleId ?? ""}`}
          className="min-h-0 w-full flex-1"
          fitTrigger={fitTrigger}
        >
          <NodeRenderer node={root} depth={0} />
        </CanvasViewport>
      </div>
    );
  }

  const heightFree = size.height === null;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onClick={() => {
        clearMultiSelect();
        select(null);
      }}
    >
      {moduleBadge}
      <CanvasViewport
        key={`${state.document.id}|fixed|${state.editingModuleId ?? ""}|${size.width}|${size.height ?? "free"}`}
        className="min-h-0 w-full flex-1"
        contentWidth={size.width}
        contentHeight={heightFree ? undefined : size.height}
        fitTrigger={fitTrigger}
      >
        <div
          className="relative rounded-md bg-neutral-900/50 ring-1 ring-neutral-800"
          style={{ width: size.width, ...(heightFree ? {} : { height: size.height as number }) }}
        >
          <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
            {heightFree ? `${size.width}px (높이 자유)` : `${size.width} × ${size.height}`}
          </div>
          <div
            className={heightFree ? "flex w-full flex-col" : "flex h-full w-full flex-col"}
            style={{ padding: `${safe}%`, boxSizing: "border-box" }}
          >
            <NodeRenderer node={root} depth={0} parentIsFlexContainer parentDirection="column" />
          </div>
        </div>
      </CanvasViewport>
    </div>
  );
}
