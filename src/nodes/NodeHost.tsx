import type { ReactNode } from "react";
import type { LayoutNode } from "@/types/layout";
import type { ParentFlexDirection } from "@/lib/layoutSizing";
import type { PreviewContext } from "@/features/preview/previewRuntime";
import type { ThemeTokens } from "@/features/preview/themes";
import { NodeHostCanvas } from "@/nodes/NodeHostCanvas";
import { NodeHostPreview } from "@/nodes/NodeHostPreview";
import type { NodeHostChildRender, RenderLeafPreviewFn } from "@/nodes/nodeHostTypes";

export type { NodeHostChildRender, RenderLeafPreviewFn } from "@/nodes/nodeHostTypes";

type NodeHostBase = {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
  renderChild: NodeHostChildRender;
};

export type NodeHostProps =
  | (NodeHostBase & {
      mode: "canvas";
      renderLeafCanvas: (node: LayoutNode) => ReactNode;
    })
  | (NodeHostBase & {
      mode: "preview";
      ctx: PreviewContext;
      theme: ThemeTokens;
      renderLeafPreview: RenderLeafPreviewFn;
    });

export function NodeHost(props: NodeHostProps) {
  if (props.mode === "canvas") {
    return (
      <NodeHostCanvas
        node={props.node}
        depth={props.depth}
        visitedModuleIds={props.visitedModuleIds}
        parentDirection={props.parentDirection}
        parentIsFlexContainer={props.parentIsFlexContainer}
        renderChild={props.renderChild}
        renderLeafCanvas={props.renderLeafCanvas}
      />
    );
  }
  return (
    <NodeHostPreview
      node={props.node}
      depth={props.depth}
      visitedModuleIds={props.visitedModuleIds}
      parentDirection={props.parentDirection}
      parentIsFlexContainer={props.parentIsFlexContainer}
      renderChild={props.renderChild}
      renderLeafPreview={props.renderLeafPreview}
      ctx={props.ctx}
      theme={props.theme}
    />
  );
}
