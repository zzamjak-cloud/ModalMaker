// 캔버스 루트
// DndContext를 통합 관리하고, onDragEnd에서 드롭 의도를 해석해 스토어를 뮤테이션한다.
// - source="palette" + over.containerId → addNode
// - source="canvas" + over.containerId  → moveNode (자기 자식으로는 못 옮김)
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import { NodeRenderer } from "./NodeRenderer";
import type { NodeKind } from "@/types/layout";

export function Canvas() {
  const doc = useLayoutStore((s) => s.document);
  const addNewNode = useLayoutStore((s) => s.addNewNode);
  const moveNode = useLayoutStore((s) => s.moveNode);
  const select = useLayoutStore((s) => s.select);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const [activeLabel, setActiveLabel] = useState<string | null>(null);

  const onDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { source?: string; kind?: NodeKind; nodeId?: string };
    if (data?.source === "palette") {
      setActiveLabel(`+ ${data.kind}`);
    } else if (data?.source === "canvas") {
      setActiveLabel("이동 중…");
    }
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveLabel(null);
    const active = e.active.data.current as
      | { source?: "palette" | "canvas"; kind?: NodeKind; nodeId?: string }
      | undefined;
    const over = e.over?.data.current as { containerId?: string } | undefined;
    if (!active || !over?.containerId) return;

    if (active.source === "palette" && active.kind) {
      const created = addNewNode(over.containerId, active.kind);
      select(created.id);
      return;
    }
    if (active.source === "canvas" && active.nodeId) {
      moveNode(active.nodeId, over.containerId);
    }
  };

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="relative">
        <NodeRenderer node={doc.root} depth={0} />
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
