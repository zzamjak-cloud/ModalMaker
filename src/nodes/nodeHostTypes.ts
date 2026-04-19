import type { ReactNode } from "react";
import type { LayoutNode } from "@/types/layout";
import type { ParentFlexDirection } from "@/lib/layoutSizing";

export type NodeHostChildRender = (p: {
  node: LayoutNode;
  depth: number;
  visitedModuleIds?: Set<string>;
  parentDirection: ParentFlexDirection;
  parentIsFlexContainer: boolean;
}) => ReactNode;

export type RenderLeafPreviewFn = (node: LayoutNode, ui: { hover: boolean }) => ReactNode;
