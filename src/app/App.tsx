// ModalMaker 앱 최상위 셸
// - DndContext가 팔레트와 캔버스를 동시에 감싸야 팔레트 → 캔버스 드래그가 성립한다.
// - 좌측 사이드바는 Palette(상단) + LayerTree/ModulePanel 탭(하단), 사이에 수직 리사이저 존재.
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimation,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
import { Toolbar } from "@/features/toolbar/Toolbar";
import { Palette } from "@/features/palette/Palette";
import { Canvas } from "@/features/canvas/Canvas";
import { Inspector } from "@/features/inspector/Inspector";
import { LayerTree } from "@/features/layer-tree/LayerTree";
import { ModulePanel } from "@/features/modules/ModulePanel";
import { NodeView } from "@/features/node-view/NodeView";
import { PresetGallery } from "@/features/presets/PresetGallery";
import { PreviewOverlay } from "@/features/preview/PreviewOverlay";
import { useLayoutStore, createNode } from "@/stores/layoutStore";
import { cn } from "@/lib/cn";
import type { NodeKind } from "@/types/layout";

export default function App() {
  const addNewNode = useLayoutStore((s) => s.addNewNode);
  const addNode = useLayoutStore((s) => s.addNode);
  const moveNode = useLayoutStore((s) => s.moveNode);
  const select = useLayoutStore((s) => s.select);
  const mode = useLayoutStore((s) => s.mode);

  const [galleryOpen, setGalleryOpen] = useState(true);
  const [layerHeight, setLayerHeight] = useState(260);
  const [leftTab, setLeftTab] = useState<"layers" | "modules">("layers");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [activeLabel, setActiveLabel] = useState<string | null>(null);
  const [dropAnim, setDropAnim] = useState<DropAnimation | null>(defaultDropAnimation);

  const onDragStart = (e: DragStartEvent) => {
    setDropAnim(defaultDropAnimation); // 새 드래그 시작 시 기본 애니메이션으로 복원
    const data = e.active.data.current as {
      source?: string;
      kind?: NodeKind;
      nodeId?: string;
      moduleId?: string;
      moduleName?: string;
    };
    if (data?.source === "palette") setActiveLabel(`+ ${data.kind}`);
    else if (data?.source === "canvas") setActiveLabel("이동 중…");
    else if (data?.source === "module") setActiveLabel(`⊚ ${data.moduleName ?? "Module"}`);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const active = e.active.data.current as
      | {
          source?: "palette" | "canvas" | "module";
          kind?: NodeKind;
          nodeId?: string;
          moduleId?: string;
          moduleName?: string;
        }
      | undefined;
    const over = e.over?.data.current as { containerId?: string; index?: number } | undefined;

    // 드롭 성공: 원위치 애니메이션 없이 즉시 제거
    if (active && over?.containerId) {
      setDropAnim(null);
    } else {
      // 드롭 실패: 기본 애니메이션으로 원위치 복귀 (시각적 실패 피드백)
      setDropAnim(defaultDropAnimation);
    }
    setActiveLabel(null);

    if (!active || !over?.containerId) return;

    if (active.source === "palette" && active.kind) {
      const created = addNewNode(over.containerId, active.kind, over.index);
      select(created.id);
      return;
    }
    if (active.source === "canvas" && active.nodeId) {
      moveNode(active.nodeId, over.containerId, over.index);
      return;
    }
    if (active.source === "module" && active.moduleId) {
      const ref = createNode("module-ref", {
        props: { moduleId: active.moduleId, label: active.moduleName },
      });
      addNode(over.containerId, ref, over.index);
      select(ref.id);
      return;
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-neutral-950 text-neutral-100">
        <Toolbar onNewClick={() => setGalleryOpen(true)} />

        <div className="flex flex-1 overflow-hidden">
          {/* 좌측: 팔레트 + 수직 리사이저 + 계층 트리 (프리뷰 모드에서는 숨김) */}
          {mode !== "preview" && (
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
                className="flex flex-col overflow-hidden border-t border-neutral-800"
                style={{ height: layerHeight }}
              >
                <div className="flex gap-1 border-b border-neutral-800 bg-neutral-900/60 px-2 py-1">
                  <TabButton active={leftTab === "layers"} onClick={() => setLeftTab("layers")}>
                    Layers
                  </TabButton>
                  <TabButton active={leftTab === "modules"} onClick={() => setLeftTab("modules")}>
                    Modules
                  </TabButton>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {leftTab === "layers" ? <LayerTree /> : <ModulePanel />}
                </div>
              </div>
            </aside>
          )}

          {/* 중앙: 캔버스 / 노드 뷰 / 프리뷰 */}
          <main className="flex min-h-0 flex-1 overflow-hidden bg-neutral-950">
            {mode === "preview" ? (
              <PreviewOverlay />
            ) : mode === "node" ? (
              <NodeView />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
                <Canvas />
              </div>
            )}
          </main>

          {/* 우측: 인스펙터 (프리뷰 모드에서는 숨김) */}
          {mode !== "preview" && (
            <aside className="w-80 overflow-y-auto border-l border-neutral-800 bg-neutral-900">
              <Inspector />
            </aside>
          )}
        </div>

        {galleryOpen && <PresetGallery onClose={() => setGalleryOpen(false)} />}
      </div>

      <DragOverlay dropAnimation={dropAnim}>
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

// 좌측 하단 Layers/Modules 탭 버튼
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded px-2 py-1 text-[11px]",
        active
          ? "bg-sky-500/20 text-sky-200"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
      )}
    >
      {children}
    </button>
  );
}
