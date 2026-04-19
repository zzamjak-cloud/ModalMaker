import { MousePointerClick } from "lucide-react";
import type { ButtonProps } from "@/types/layout";
import { register } from "../registry";
import { ButtonInspector } from "./ButtonInspector";
import { ButtonLeaf } from "./ButtonLeaf";

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
