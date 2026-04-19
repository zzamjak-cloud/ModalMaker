import { memo } from "react";
import { MousePointerClick } from "lucide-react";
import type { ButtonProps } from "@/types/layout";
import { register } from "../registry";
import { ButtonInspector } from "./ButtonInspector";
import { ButtonLeaf as ButtonLeafBase } from "./ButtonLeaf";
import type { LeafRenderProps } from "../types";

const ButtonLeaf = memo(
  ButtonLeafBase,
  (a: LeafRenderProps, b: LeafRenderProps) =>
    a.node === b.node &&
    a.mode === b.mode &&
    a.hover === b.hover &&
    a.theme === b.theme &&
    a.previewCtx === b.previewCtx,
);

register<ButtonProps>({
  kind: "button",
  label: "Button",
  icon: MousePointerClick,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ label: "Button", variant: "primary", size: "md" }),
  Leaf: ButtonLeaf,
  Inspector: ButtonInspector,
  exportMarkdown: (node) => {
    const p = node.props as ButtonProps;
    const v = p.variant && p.variant !== "primary" ? ` (${p.variant})` : "";
    return `[Button: "${p.label ?? ""}"${v}]`;
  },
  exportMermaid: (node) => `Button: ${(node.props as ButtonProps).label ?? ""}`,
});
