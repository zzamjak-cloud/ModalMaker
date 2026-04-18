// 공용 크기 — 가로/세로 각각 Auto vs Fixed(px)
import type { LayoutNode } from "@/types/layout";
import { normalizeSizing, roundSizingPx } from "@/lib/layoutSizing";
import { useLayoutStore } from "@/stores/layoutStore";

function parsePxInput(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return roundSizingPx(n);
}

export function SizeSection({ node }: { node: LayoutNode }) {
  const patchNode = useLayoutStore((s) => s.patchNode);
  const s = node.sizing ?? {};
  const { widthFixed, heightFixed, width, height } = normalizeSizing(s);

  function setWidthFixed(next: boolean) {
    patchNode(node.id, {
      sizing: {
        widthFixed: next,
        fixedSize: undefined,
        ...(next ? { width: typeof s.width === "number" ? s.width : width } : {}),
      },
    });
  }

  function setHeightFixed(next: boolean) {
    patchNode(node.id, {
      sizing: {
        heightFixed: next,
        fixedSize: undefined,
        ...(next ? { height: typeof s.height === "number" ? s.height : height } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Size</div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">Width</span>
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 text-[11px] text-neutral-400">
              <input
                type="radio"
                name={`w-${node.id}`}
                checked={!widthFixed}
                onChange={() => setWidthFixed(false)}
                className="h-3 w-3 accent-sky-500"
              />
              Auto
            </label>
            <label className="flex items-center gap-1 text-[11px] text-neutral-400">
              <input
                type="radio"
                name={`w-${node.id}`}
                checked={widthFixed}
                onChange={() => setWidthFixed(true)}
                className="h-3 w-3 accent-sky-500"
              />
              Fixed
            </label>
          </div>
        </div>
        {widthFixed && (
          <label className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">px</span>
            <input
              type="number"
              value={Math.round(width)}
              min={1}
              max={4096}
              onChange={(e) => {
                const v = parsePxInput(e.target.value);
                if (v === null) return;
                patchNode(node.id, {
                  sizing: { widthFixed: true, fixedSize: undefined, width: v },
                });
              }}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">Height</span>
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1 text-[11px] text-neutral-400">
              <input
                type="radio"
                name={`h-${node.id}`}
                checked={!heightFixed}
                onChange={() => setHeightFixed(false)}
                className="h-3 w-3 accent-sky-500"
              />
              Auto
            </label>
            <label className="flex items-center gap-1 text-[11px] text-neutral-400">
              <input
                type="radio"
                name={`h-${node.id}`}
                checked={heightFixed}
                onChange={() => setHeightFixed(true)}
                className="h-3 w-3 accent-sky-500"
              />
              Fixed
            </label>
          </div>
        </div>
        {heightFixed && (
          <label className="flex items-center gap-1.5">
            <span className="w-8 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">px</span>
            <input
              type="number"
              value={Math.round(height)}
              min={1}
              max={4096}
              onChange={(e) => {
                const v = parsePxInput(e.target.value);
                if (v === null) return;
                patchNode(node.id, {
                  sizing: { heightFixed: true, fixedSize: undefined, height: v },
                });
              }}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
        )}
      </div>
    </div>
  );
}
