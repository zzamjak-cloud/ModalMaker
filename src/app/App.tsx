// ModalMaker 앱 최상위 셸
// - DndContext가 팔레트와 캔버스를 동시에 감싸야 팔레트 → 캔버스 드래그가 성립한다.
// - 좌측 사이드바는 Palette(상단) + LayerTree(하단), 사이에 수직 리사이저 존재.
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Toolbar } from "@/features/toolbar/Toolbar";
import { Palette } from "@/features/palette/Palette";
import { Canvas } from "@/features/canvas/Canvas";
import { Inspector } from "@/features/inspector/Inspector";
import { LayerTree } from "@/features/layer-tree/LayerTree";
import { PresetGallery } from "@/features/presets/PresetGallery";
import { useLayoutStore } from "@/stores/layoutStore";
import type { NodeKind } from "@/types/layout";

export default function App() {
  const addNewNode = useLayoutStore((s) => s.addNewNode);
  const moveNode = useLayoutStore((s) => s.moveNode);
  const select = useLayoutStore((s) => s.select);

  const [galleryOpen, setGalleryOpen] = useState(true);
  const [layerHeight, setLayerHeight] = useState(260);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { source?: string; kind?: NodeKind; nodeId?: string };
    if (data?.source === "palette") setActiveLabel(`+ ${data.kind}`);
    else if (data?.source === "canvas") setActiveLabel("이동 중…");
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveLabel(null);
    const active = e.active.data.current as
      | { source?: "palette" | "canvas"; kind?: NodeKind; nodeId?: string }
      | undefined;
    const over = e.over?.data.current as { containerId?: string; index?: number } | undefined;
    if (!active || !over?.containerId) return;

    if (active.source === "palette" && active.kind) {
      const created = addNewNode(over.containerId, active.kind, over.index);
      select(created.id);
      return;
    }
    if (active.source === "canvas" && active.nodeId) {
      moveNode(active.nodeId, over.containerId, over.index);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
        <Toolbar onNewClick={() => setGalleryOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 팔레트 + 수직 리사이저 + 계층 트리 */}
          <aside className="flex w-64 flex-col border-r border-neutral-800 bg-neutral-900">
            <div className="flex-1 overflow-y-auto">
              <Palette />
            </div>
            <VerticalResizer
              onResize={(absY, containerBottom) => {
                const next = containerBottom - absY;
                setLayerHeight(clamp(next, 100, 720));
              }}
            />
            <div
              className="overflow-y-auto border-t border-neutral-800"
              style={{ height: layerHeight }}
            >
              <LayerTree />
            </div>
          </aside>

          {/* 중앙: 캔버스 */}
          <main className="flex flex-1 items-center justify-center overflow-auto bg-neutral-950 p-8">
            <Canvas />
          </main>

          {/* 우측: 인스펙터 */}
          <aside className="w-80 overflow-y-auto border-l border-neutral-800 bg-neutral-900">
            <Inspector />
          </aside>
        </div>

        {galleryOpen && <PresetGallery onClose={() => setGalleryOpen(false)} />}
      </div>

      <DragOverlay>
        {activeLabel && (
          <div className="rounded-md bg-sky-500/90 px-3 py-1.5 text-sm text-white shadow-lg">
            {activeLabel}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// 사이드바 내부 상하 리사이저
// 드래그 중에는 전역 마우스 이벤트를 청취해 부모가 LayerTree 높이를 계산하도록 callback을 부른다.
function VerticalResizer({
  onResize,
}: {
  onResize: (absoluteY: number, asideBottom: number) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    function handleDown(e: MouseEvent) {
      e.preventDefault();
      const aside = el?.closest("aside");
      if (!aside) return;
      const asideBottom = aside.getBoundingClientRect().bottom;
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";

      function onMove(ev: MouseEvent) {
        onResize(ev.clientY, asideBottom);
      }
      function onUp() {
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      }
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    }
    el.addEventListener("mousedown", handleDown);
    return () => el.removeEventListener("mousedown", handleDown);
  }, [onResize]);

  return (
    <div
      ref={elRef}
      title="드래그해서 Layers 패널 크기 조절"
      className="group flex h-1.5 shrink-0 cursor-ns-resize items-center justify-center bg-neutral-800 transition hover:bg-sky-500/50"
    >
      <div className="h-0.5 w-8 rounded-full bg-neutral-600 group-hover:bg-sky-400" />
    </div>
  );
}
