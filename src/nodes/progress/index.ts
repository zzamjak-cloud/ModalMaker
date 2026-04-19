import { Loader } from "lucide-react";
import type { ProgressProps } from "@/types/layout";
import { register } from "../registry";
import { ProgressLeaf } from "./ProgressLeaf";
import { ProgressInspector } from "./ProgressInspector";

register<ProgressProps>({
  kind: "progress",
  label: "Progress",
  icon: Loader,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ value: 50, max: 100 }),
  Leaf: ProgressLeaf,
  Inspector: ProgressInspector,
  exportMarkdown: (node) => {
    const p = node.props as ProgressProps;
    const pct = Math.round(((p.value ?? 0) / (p.max ?? 100)) * 100);
    return `[ProgressBar: ${pct}%${p.label ? ` "${p.label}"` : ""}]`;
  },
  exportMermaid: (node) => {
    const p = node.props as ProgressProps;
    const pct = Math.round(((p.value ?? 0) / (p.max ?? 100)) * 100);
    return `Progress: ${pct}%`;
  },
});
