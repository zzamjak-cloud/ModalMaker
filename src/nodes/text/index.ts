// Text 노드 descriptor 등록
import { Type } from "lucide-react";
import type { TextProps } from "@/types/layout";
import { register } from "../registry";
import { TextLeaf } from "./TextLeaf";
import { TextInspector } from "./TextInspector";

register<TextProps>({
  kind: "text",
  label: "Text",
  icon: Type,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ text: "Text", size: "md", weight: "normal" }),
  Leaf: TextLeaf,
  Inspector: TextInspector,
  exportMarkdown: (node) => `[Text: "${(node.props as TextProps).text ?? ""}"]`,
  exportMermaid: (node) => `Text: ${(node.props as TextProps).text ?? ""}`,
});
