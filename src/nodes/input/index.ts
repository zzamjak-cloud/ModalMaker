// Input: Leaf 렌더는 특수 래퍼 레이아웃(프리뷰에서 wrapper 자체를 flex 컨테이너로 사용)이
// 필요해 현 단계에선 NodeRenderer/PreviewRenderer의 switch에 유지. descriptor로는
// Inspector·defaults·export만 이관.
import { TextCursorInput } from "lucide-react";
import type { InputProps } from "@/types/layout";
import { register } from "../registry";
import { InputInspector } from "./InputInspector";

register<InputProps>({
  kind: "input",
  label: "Input",
  icon: TextCursorInput,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ placeholder: "Enter…", type: "text" }),
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
