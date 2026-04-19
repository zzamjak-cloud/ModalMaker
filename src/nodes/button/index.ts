// Button: Leaf 렌더는 탭 그룹 ctx·hover·tab 상태를 요구해 현 단계에선 기존 ButtonLeaf/
// PreviewRenderer switch 유지. descriptor로는 Inspector·defaults·export만 이관.
import { MousePointerClick } from "lucide-react";
import type { ButtonProps } from "@/types/layout";
import { register } from "../registry";
import { ButtonInspector } from "./ButtonInspector";

register<ButtonProps>({
  kind: "button",
  label: "Button",
  icon: MousePointerClick,
  isContainer: false,
  inPalette: true,
  defaultProps: () => ({ label: "Button", variant: "primary", size: "md" }),
  Inspector: ButtonInspector,
  exportMarkdown: (node) => {
    const p = node.props as ButtonProps;
    const v = p.variant && p.variant !== "primary" ? ` (${p.variant})` : "";
    return `[Button: "${p.label ?? ""}"${v}]`;
  },
  exportMermaid: (node) => `Button: ${(node.props as ButtonProps).label ?? ""}`,
});
