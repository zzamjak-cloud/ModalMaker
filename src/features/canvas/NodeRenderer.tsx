// 재귀 노드 렌더러 — 트리 본체는 NodeHost(캔버스 모드), 리프는 레지스트리 Leaf.
import type { ReactNode } from "react";
import type { ParentFlexDirection } from "@/lib/layoutSizing";
import type { LayoutNode } from "@/types/layout";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";

export function NodeRenderer({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
}) {
  return (
    <NodeHost
      mode="canvas"
      node={node}
      depth={depth}
      visitedModuleIds={visitedModuleIds}
      parentDirection={parentDirection}
      parentIsFlexContainer={parentIsFlexContainer}
      renderChild={(p) => (
        <NodeRenderer
          node={p.node}
          depth={p.depth}
          visitedModuleIds={p.visitedModuleIds}
          parentDirection={p.parentDirection}
          parentIsFlexContainer={p.parentIsFlexContainer}
        />
      )}
      renderLeafCanvas={renderLeafCanvas}
    />
  );
}

function renderLeafCanvas(node: LayoutNode): ReactNode {
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="canvas" />;
  }
  return null;
}
