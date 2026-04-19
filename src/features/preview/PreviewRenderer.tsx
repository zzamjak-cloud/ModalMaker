// 프리뷰용 재귀 렌더러 — 트리 본체는 NodeHost(프리뷰 모드), 리프는 레지스트리 Leaf.
// Immer가 변경되지 않은 서브트리의 LayoutNode 참조를 유지하므로 node·ctx·theme 동일성 기반
// memo로 재렌더를 대폭 줄인다.
import { memo, type ReactNode } from "react";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";
import { useTheme } from "./ThemeContext";
import type { PreviewContext } from "./previewRuntime";
import type { ThemeTokens } from "./themes";
import type { LayoutNode } from "@/types/layout";
import type { ParentFlexDirection } from "@/lib/layoutSizing";

type PreviewRendererProps = {
  node: LayoutNode;
  ctx: PreviewContext;
  visitedModuleIds?: Set<string>;
  depth?: number;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
};

function PreviewRendererImpl({
  node,
  ctx,
  visitedModuleIds,
  depth = 0,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: PreviewRendererProps) {
  const t = useTheme();
  return (
    <NodeHost
      mode="preview"
      node={node}
      depth={depth}
      visitedModuleIds={visitedModuleIds}
      parentDirection={parentDirection}
      parentIsFlexContainer={parentIsFlexContainer}
      ctx={ctx}
      theme={t}
      renderChild={(p) => (
        <PreviewRenderer
          node={p.node}
          ctx={ctx}
          visitedModuleIds={p.visitedModuleIds}
          depth={p.depth}
          parentDirection={p.parentDirection}
          parentIsFlexContainer={p.parentIsFlexContainer}
        />
      )}
      renderLeafPreview={(n, { hover }) => renderLeafPreview(n, hover, ctx, t)}
    />
  );
}

/**
 * node 참조 + 위치/방향 props + ctx 참조 동일성 확인.
 * visitedModuleIds는 대부분 undefined, 모듈-ref 내부에서만 Set 인스턴스 전달.
 */
export const PreviewRenderer = memo(PreviewRendererImpl, (prev, next) =>
  prev.node === next.node &&
  prev.ctx === next.ctx &&
  prev.depth === next.depth &&
  prev.visitedModuleIds === next.visitedModuleIds &&
  prev.parentDirection === next.parentDirection &&
  prev.parentIsFlexContainer === next.parentIsFlexContainer,
);

function renderLeafPreview(
  node: LayoutNode,
  hover: boolean,
  ctx: PreviewContext,
  t: ThemeTokens,
): ReactNode {
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="preview" theme={t} previewCtx={ctx} hover={hover} />;
  }
  return null;
}
