// 재귀 노드 렌더러 — 트리 본체는 NodeHost(캔버스 모드), 리프는 레지스트리 Leaf.
// Immer가 변경되지 않은 서브트리의 LayoutNode 참조를 유지하므로 node 동일성 기반 memo가
// 대형 문서에서 큰 폭의 재렌더 감소를 준다.
import { memo, type ReactNode } from "react";
import type { ParentFlexDirection } from "@/lib/layoutSizing";
import type { LayoutNode } from "@/types/layout";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";

type NodeRendererProps = {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
};

function NodeRendererImpl({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: NodeRendererProps) {
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

/**
 * node 참조(= Immer 덕분에 부분 변경 시 바뀌지 않음)와 위치/방향 props 동일성만 확인.
 * renderChild는 인라인 콜백이라 비교 대상에서 제외한다 — 캡쳐 값은 props 중 일부(node·depth 등)
 * 뿐이라 위치/node가 같으면 동일 동작으로 간주해도 안전.
 */
export const NodeRenderer = memo(NodeRendererImpl, (prev, next) =>
  prev.node === next.node &&
  prev.depth === next.depth &&
  prev.visitedModuleIds === next.visitedModuleIds &&
  prev.parentDirection === next.parentDirection &&
  prev.parentIsFlexContainer === next.parentIsFlexContainer,
);

function renderLeafCanvas(node: LayoutNode): ReactNode {
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="canvas" />;
  }
  return null;
}
