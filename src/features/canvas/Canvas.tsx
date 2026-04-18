// 캔버스 루트 - 활성 편집 대상(현재 페이지 또는 편집 중 모듈)의 root를 렌더링.
// viewport가 설정되어 있으면 해당 해상도의 고정 박스로 표시하고,
// safeAreaPct로 안쪽 마진(%)을 적용한다. 모듈 편집 중에는 free 뷰포트로 간주.
import { useLayoutStore, currentPage, activeRoot } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";

function resolveSize(v: ViewportSettings): { width: number; height: number } | null {
  if (v.preset === "free") return null;
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720 };
  const p = VIEWPORT_PRESETS[v.preset];
  return { width: p.width, height: p.height };
}

export function Canvas() {
  const state = useLayoutStore();
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
    <div className="mb-2 flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
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

  if (!size) {
    return (
      <div className="relative flex flex-col">
        {moduleBadge}
        <NodeRenderer node={root} depth={0} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {moduleBadge}
      <div
        className="relative rounded-md bg-neutral-900/50 ring-1 ring-neutral-800"
        style={{ width: size.width, height: size.height }}
      >
        <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
          {size.width} × {size.height}
        </div>
        <div className="h-full w-full" style={{ padding: `${safe}%` }}>
          <NodeRenderer node={root} depth={0} />
        </div>
      </div>
    </div>
  );
}
