import { Sparkles } from "lucide-react";
import type { IconProps } from "@/types/layout";
import { register } from "../registry";
import { IconLeaf } from "./IconLeaf";
import { IconInspector } from "./IconInspector";

register<IconProps>({
  kind: "icon",
  label: "Icon",
  icon: Sparkles,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ name: "Star", size: 20 }),
  Leaf: IconLeaf,
  Inspector: IconInspector,
  exportMarkdown: (node) => {
    const n = (node.props as IconProps).name ?? "Icon";
    return `[Icon: ${n}]`;
  },
  exportMermaid: (node) => (node.props as IconProps).name ?? "Icon",
});
