// Container: 컨테이너 계열이라 Leaf는 사용하지 않음(호스트가 자식 재귀 처리).
// descriptor로는 Inspector·defaults·export만 이관.
import { Box } from "lucide-react";
import type { ContainerProps } from "@/types/layout";
import { register } from "../registry";
import { ContainerInspector } from "./ContainerInspector";

register<ContainerProps>({
  kind: "container",
  label: "Container",
  icon: Box,
  isContainer: true,
  inPalette: true,
  defaultProps: () => ({ direction: "column", gap: 8, padding: 12, label: "Container" }),
  Inspector: ContainerInspector,
  exportMarkdown: (node) => {
    const p = node.props as ContainerProps;
    const label = p.label ?? "Container";
    const hint =
      p.direction === "grid"
        ? ` (Grid${p.columns ? `: ${p.columns} cols` : ""})`
        : p.direction === "row"
          ? " (Row)"
          : "";
    return `[Container: ${label}${hint}]`;
  },
  exportMermaid: (node) => (node.props as ContainerProps).label ?? "Container",
});
