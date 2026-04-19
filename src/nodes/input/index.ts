import { memo } from "react";
import { TextCursorInput } from "lucide-react";
import type { InputProps } from "@/types/layout";
import { register } from "../registry";
import { InputInspector } from "./InputInspector";
import { InputLeaf as InputLeafBase } from "./InputLeaf";
import type { LeafRenderProps } from "../types";

const InputLeaf = memo(
  InputLeafBase,
  (a: LeafRenderProps, b: LeafRenderProps) =>
    a.node === b.node && a.mode === b.mode && a.theme === b.theme,
);

register<InputProps>({
  kind: "input",
  label: "Input",
  icon: TextCursorInput,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ placeholder: "Enter…", type: "text" }),
  Leaf: InputLeaf,
  Inspector: InputInspector,
  exportMarkdown: (node) => {
    const p = node.props as InputProps;
    const parts: string[] = [p.label ?? p.placeholder ?? "Input"];
    if (p.type && p.type !== "text") parts.push(`type=${p.type}`);
    return `[Input: ${parts.join(", ")}]`;
  },
  exportMermaid: (node) => {
    const p = node.props as InputProps;
    return `Input: ${p.label ?? p.placeholder ?? ""}`;
  },
});
