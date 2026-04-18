// 공용 고정 크기 섹션 - 모든 kind에 적용.
// 'Fixed size' 토글 + W/H 입력. 토글 OFF 시 값은 보존하고 UI만 숨김.
import type { LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";

export function SizeSection({ node }: { node: LayoutNode }) {
  const updateSizing = useLayoutStore((s) => s.updateSizing);
  const s = node.sizing ?? {};
  const fixed = !!s.fixedSize;
  const w = s.width ?? 120;
  const h = s.height ?? 40;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Size</span>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(e) => {
              if (e.target.checked) {
                updateSizing(node.id, { fixedSize: true, width: w, height: h });
              } else {
                updateSizing(node.id, { fixedSize: false });
              }
            }}
            className="h-3.5 w-3.5 accent-sky-500"
          />
          Fixed size
        </label>
      </div>
      {fixed && (
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">W</span>
            <input
              type="number"
              value={w}
              min={0}
              max={4096}
              onChange={(e) => updateSizing(node.id, { width: Number(e.target.value) })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">H</span>
            <input
              type="number"
              value={h}
              min={0}
              max={4096}
              onChange={(e) => updateSizing(node.id, { height: Number(e.target.value) })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
