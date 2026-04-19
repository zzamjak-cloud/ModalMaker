// 캔버스 루트 - 활성 편집 대상(현재 페이지 또는 편집 중 모듈)의 root를 렌더링.
// viewport가 설정되어 있으면 해당 해상도의 고정 박스로 표시하고,
// safeAreaPct로 안쪽 마진(%)을 적용한다. 모듈 편집 중에는 free 뷰포트로 간주.
// 상단 오버레이 바에 좌측=페이지 제목 편집 / 우측=줌·맞춤 컨트롤을 둔다.
import { useEffect } from "react";
import { Minus, Plus, Maximize2 } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useLayoutStore, currentPage, activeRoot } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";
import { CanvasViewport } from "./CanvasViewport";
import { useCanvasViewportControlsStore } from "./canvasViewportControlsStore";

function resolveSize(v: ViewportSettings): { width: number; height: number | null } | null {
  if (v.preset === "free") return null;
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720 };
  if (v.preset === "custom-w") return { width: v.width ?? 1280, height: null };
  const p = VIEWPORT_PRESETS[v.preset];
  return { width: p.width, height: p.height };
}

export function Canvas() {
  const { document, editingModuleId, clearMultiSelect, select, updatePage } = useLayoutStore(
    useShallow((s) => ({
      document: s.document,
      editingModuleId: s.editingModuleId,
      clearMultiSelect: s.clearMultiSelect,
      select: s.select,
      updatePage: s.updatePage,
    })),
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        clearMultiSelect();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearMultiSelect]);

  const root = activeRoot({ document, editingModuleId });
  const editingModule = editingModuleId
    ? document.modules.find((m) => m.id === editingModuleId) ?? null
    : null;
  const page = currentPage(document);
  const viewport: ViewportSettings = editingModule
    ? { preset: "free" }
    : page?.viewport ?? { preset: "free" };

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

  // 상단 바: 좌측은 페이지 제목 입력(또는 모듈 편집 배지), 우측은 줌 컨트롤
  const topBar = (
    <div
      className="flex shrink-0 items-center gap-2 border-b border-neutral-800 bg-neutral-900/70 px-3 py-1.5"
      onClick={(e) => e.stopPropagation()}
    >
      {editingModule ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
          <span>모듈 편집 중: {editingModule.name}</span>
          <button
            type="button"
            onClick={() => exitModuleEdit()}
            className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-100 hover:bg-amber-500/30"
          >
            완료
          </button>
        </div>
      ) : page ? (
        <input
          value={page.title}
          onChange={(e) => updatePage(page.id, { title: e.target.value })}
          className="w-56 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
          placeholder="페이지 제목"
          title="페이지 제목"
        />
      ) : null}
      <div className="flex-1" />
      <CanvasZoomControl />
    </div>
  );

  // 문서/페이지가 바뀌면 반드시 맞춤이 다시 돌아가야 함(해상도 문자열만으로는 Load 후 동일해 보일 수 있음)
  const fitTrigger = [
    document.id,
    document.currentPageId,
    viewport.preset,
    size?.width ?? 0,
    size?.height ?? 0,
    safe,
    editingModuleId ?? "",
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
        {topBar}
        <CanvasViewport
          key={`${document.id}|free|${editingModuleId ?? ""}`}
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
      {topBar}
      <CanvasViewport
        key={`${document.id}|fixed|${editingModuleId ?? ""}|${size.width}|${size.height ?? "free"}`}
        className="min-h-0 w-full flex-1"
        contentWidth={size.width}
        contentHeight={heightFree ? undefined : size.height}
        fitTrigger={fitTrigger}
      >
        <div
          className="relative rounded-md bg-neutral-900/50 ring-1 ring-neutral-800"
          style={{ width: size.width, ...(heightFree ? {} : { height: size.height as number }) }}
        >
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

/** Canvas 우측 상단 줌·맞춤 컨트롤 — CanvasViewport의 register* 훅으로 active 상태 공유 */
function CanvasZoomControl() {
  const zoom = useCanvasViewportControlsStore();
  if (!zoom.active) return null;
  return (
    <div
      className="flex flex-wrap items-center gap-0.5 rounded-md border border-neutral-800 bg-neutral-950 px-1 py-0.5"
      role="group"
      aria-label="캔버스 줌"
    >
      <button
        type="button"
        className="rounded p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
        title="10% 축소"
        onClick={() => zoom.zoomOut()}
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[2.75rem] px-0.5 text-center text-[11px] tabular-nums text-neutral-400">
        {zoom.percent}%
      </span>
      <button
        type="button"
        className="rounded p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
        title="10% 확대"
        onClick={() => zoom.zoomIn()}
      >
        <Plus size={14} />
      </button>
      <div className="mx-0.5 h-4 w-px bg-neutral-700" />
      <button
        type="button"
        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-sky-200"
        title="화면에 맞춤"
        onClick={() => zoom.fit()}
      >
        <Maximize2 size={12} />
        맞춤
      </button>
    </div>
  );
}
