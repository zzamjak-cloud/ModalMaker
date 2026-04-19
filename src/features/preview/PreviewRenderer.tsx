// 프리뷰용 재귀 렌더러 — 트리 본체는 NodeHost(프리뷰 모드), 리프는 레지스트리 Leaf.
import type { ReactNode } from "react";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";
import { useTheme } from "./ThemeContext";
import type { PreviewContext } from "./previewRuntime";
import type { ThemeTokens } from "./themes";
import type { LayoutNode } from "@/types/layout";
import type { ParentFlexDirection } from "@/lib/layoutSizing";

export function PreviewRenderer({
  node,
  ctx,
  visitedModuleIds,
  depth = 0,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: {
  node: LayoutNode;
  ctx: PreviewContext;
  visitedModuleIds?: Set<string>;
  depth?: number;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
}) {
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
