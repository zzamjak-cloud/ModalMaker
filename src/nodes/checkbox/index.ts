import { CheckSquare } from "lucide-react";
import type { CheckboxProps } from "@/types/layout";
import { register } from "../registry";
import { CheckboxLeaf } from "./CheckboxLeaf";
import { CheckboxInspector } from "./CheckboxInspector";

register<CheckboxProps>({
  kind: "checkbox",
  label: "Checkbox",
  icon: CheckSquare,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ label: "Option", checked: false }),
  Leaf: CheckboxLeaf,
  Inspector: CheckboxInspector,
  exportMarkdown: (node) => {
    const p = node.props as CheckboxProps;
    return `[Checkbox: "${p.label ?? ""}"${p.checked ? " (checked)" : ""}]`;
  },
  exportMermaid: (node) => `Checkbox: ${(node.props as CheckboxProps).label ?? ""}`,
});
