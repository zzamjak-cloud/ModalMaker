// 공용 크기 — 가로/세로 각각 Auto / Fixed(px) / Anchored(부모 채우기)
import type { LayoutNode } from "@/types/layout";
import { normalizeSizing, roundSizingPx } from "@/lib/layoutSizing";
import { useLayoutStore } from "@/stores/layoutStore";

type SizeMode = "auto" | "fixed" | "anchored";

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

  const widthMode: SizeMode = s.widthAnchored ? "anchored" : widthFixed ? "fixed" : "auto";
  const heightMode: SizeMode = s.heightAnchored ? "anchored" : heightFixed ? "fixed" : "auto";

  function setWidthMode(mode: SizeMode) {
    patchNode(node.id, {
      sizing: {
        widthAnchored: mode === "anchored",
        widthFixed: mode === "fixed",
        fixedSize: undefined,
        ...(mode === "fixed" ? { width: typeof s.width === "number" ? s.width : width } : {}),
      },
    });
  }

  function setHeightMode(mode: SizeMode) {
    patchNode(node.id, {
      sizing: {
        heightAnchored: mode === "anchored",
        heightFixed: mode === "fixed",
        fixedSize: undefined,
        ...(mode === "fixed" ? { height: typeof s.height === "number" ? s.height : height } : {}),
      },
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Size</div>

      {/* Width */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">Width</span>
          <div className="flex items-center gap-1.5">
            {(["auto", "fixed", "anchored"] as SizeMode[]).map((m) => (
              <label key={m} className="flex items-center gap-1 text-[11px] text-neutral-400">
                <input
                  type="radio"
                  name={`w-${node.id}`}
                  checked={widthMode === m}
                  onChange={() => setWidthMode(m)}
                  className="h-3 w-3 accent-sky-500"
                />
                {m === "auto" ? "Auto" : m === "fixed" ? "Fixed" : "Fill"}
              </label>
            ))}
          </div>
        </div>
        {widthMode === "fixed" && (
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
        {widthMode === "anchored" && (
          <p className="text-[10px] text-neutral-500">부모 flex 가로 공간을 채웁니다</p>
        )}
      </div>

      {/* Height */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-neutral-400">Height</span>
          <div className="flex items-center gap-1.5">
            {(["auto", "fixed", "anchored"] as SizeMode[]).map((m) => (
              <label key={m} className="flex items-center gap-1 text-[11px] text-neutral-400">
                <input
                  type="radio"
                  name={`h-${node.id}`}
                  checked={heightMode === m}
                  onChange={() => setHeightMode(m)}
                  className="h-3 w-3 accent-sky-500"
                />
                {m === "auto" ? "Auto" : m === "fixed" ? "Fixed" : "Fill"}
              </label>
            ))}
          </div>
        </div>
        {heightMode === "fixed" && (
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
        {heightMode === "anchored" && (
          <p className="text-[10px] text-neutral-500">부모 flex 세로 공간을 채웁니다</p>
        )}
      </div>
    </div>
  );
}
