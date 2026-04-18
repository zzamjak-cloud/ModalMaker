// panel-layout 슬롯 container 전용 렌더러.
// Task 13에서는 기본 NodeRenderer에 위임. Task 17에서 pinned-aware로 확장.
import { NodeRenderer } from "./NodeRenderer";
import type { LayoutNode } from "@/types/layout";

export function SlotContainerRenderer({
  node,
  depth,
}: {
  node: LayoutNode;
  depth: number;
  slotIndex: 0 | 1 | 2 | 3 | 4;
}) {
  return <NodeRenderer node={node} depth={depth} />;
}
