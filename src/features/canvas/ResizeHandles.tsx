// 선택된 노드에 고정 축이 있을 때 캔버스에서 드래그로 크기 조절
import { useCallback } from "react";
import { normalizeSizing, roundSizingPx } from "@/lib/layoutSizing";
import type { SizingProps } from "@/types/layout";
import { activeRoot, findLayoutNode, useLayoutStore } from "@/stores/layoutStore";

const MIN = 24;

export function ResizeHandles({
  nodeId,
  show,
}: {
  nodeId: string;
  show: boolean;
}) {
  const sizing = useLayoutStore((s) => {
    const root = activeRoot(s);
    if (!root) return undefined;
    return findLayoutNode(root, nodeId)?.sizing;
  });
  const patchNode = useLayoutStore((s) => s.patchNode);
  const norm = normalizeSizing(sizing);
  const { widthFixed, heightFixed } = norm;

  const onPointerDown = useCallback(
    (edge: "e" | "s" | "se") => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = norm.width;
      const startH = norm.height;
      const onMove = (ev: PointerEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const patch: Partial<SizingProps> = {};
        if ((edge === "e" || edge === "se") && widthFixed) {
          patch.width = roundSizingPx(Math.max(MIN, startW + dx));
        }
        if ((edge === "s" || edge === "se") && heightFixed) {
          patch.height = roundSizingPx(Math.max(MIN, startH + dy));
        }
        if (Object.keys(patch).length) patchNode(nodeId, { sizing: patch });
      };
      const onUp = (ev: PointerEvent) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        try {
          (ev.target as HTMLElement).releasePointerCapture(ev.pointerId);
        } catch {
          /* noop */
        }
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [nodeId, patchNode, norm.width, norm.height, widthFixed, heightFixed],
  );

  if (!show || (!widthFixed && !heightFixed)) return null;

  const showE = widthFixed;
  const showS = heightFixed;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {showE && (
        <button
          type="button"
          aria-label="너비 조절"
          className="pointer-events-auto absolute -right-1 top-1/2 h-6 w-2 -translate-y-1/2 cursor-ew-resize rounded-sm border border-sky-500/80 bg-neutral-900 shadow"
          onPointerDown={onPointerDown("e")}
        />
      )}
      {showS && (
        <button
          type="button"
          aria-label="높이 조절"
          className="pointer-events-auto absolute -bottom-1 left-1/2 h-2 w-6 -translate-x-1/2 cursor-ns-resize rounded-sm border border-sky-500/80 bg-neutral-900 shadow"
          onPointerDown={onPointerDown("s")}
        />
      )}
      {showE && showS && (
        <button
          type="button"
          aria-label="너비·높이 조절"
          className="pointer-events-auto absolute -bottom-1 -right-1 h-3 w-3 cursor-nwse-resize rounded-sm border border-sky-500 bg-sky-500/30 shadow"
          onPointerDown={onPointerDown("se")}
        />
      )}
    </div>
  );
}
