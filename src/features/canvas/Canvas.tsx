// 캔버스 루트 - 문서 트리의 루트 컨테이너를 렌더링한다.
// viewport가 설정되어 있으면 해당 해상도의 고정 박스로 표시하고,
// safeAreaPct로 안쪽 마진(%)을 적용한다. free는 기존처럼 자식 크기에 맞춘다.
import { useLayoutStore } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";

function resolveSize(v: ViewportSettings): { width: number; height: number } | null {
  if (v.preset === "free") return null;
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720 };
  const p = VIEWPORT_PRESETS[v.preset];
  return { width: p.width, height: p.height };
}

export function Canvas() {
  const root = useLayoutStore((s) => s.document.root);
  const viewport = useLayoutStore((s) => s.document.viewport) ?? { preset: "free" as const };

  const size = resolveSize(viewport);
  const safe = Math.max(0, Math.min(20, viewport.safeAreaPct ?? 0));

  if (!size) {
    return (
      <div className="relative">
        <NodeRenderer node={root} depth={0} />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-md bg-neutral-900/50 ring-1 ring-neutral-800"
      style={{ width: size.width, height: size.height }}
    >
      <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
        {size.width} × {size.height}
      </div>
      <div
        className="h-full w-full"
        style={{ padding: `${safe}%` }}
      >
        <NodeRenderer node={root} depth={0} />
      </div>
    </div>
  );
}
