import { Minus } from "lucide-react";
import type { SplitProps } from "@/types/layout";
import { register } from "../registry";
import { SplitLeaf } from "./SplitLeaf";
import { SplitInspector } from "./SplitInspector";

register<SplitProps>({
  kind: "split",
  label: "Split",
  icon: Minus,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ orientation: "horizontal", style: "solid", thickness: 1 }),
  Leaf: SplitLeaf,
  Inspector: SplitInspector,
  exportMarkdown: (node) => {
    const p = node.props as SplitProps;
    const parts: string[] = [p.style ?? "solid"];
    if (p.orientation === "vertical") parts.push("vertical");
    if (p.label) parts.push(`"${p.label}"`);
    return `[Split: ${parts.join(", ")}]`;
  },
  exportMermaid: (node) => {
    const p = node.props as SplitProps;
    return `Split: ${p.style ?? "solid"}${p.orientation === "vertical" ? " v" : ""}`;
  },
});
