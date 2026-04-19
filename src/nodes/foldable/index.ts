// Foldable: 컨테이너 계열이라 Leaf는 사용하지 않음(호스트가 자식 재귀 처리).
// descriptor로는 Inspector·defaults·export만 이관.
import { ChevronsUpDown } from "lucide-react";
import type { FoldableProps } from "@/types/layout";
import { register } from "../registry";
import { FoldableInspector } from "./FoldableInspector";

register<FoldableProps>({
  kind: "foldable",
  label: "Foldable",
  icon: ChevronsUpDown,
  isContainer: true,
  inPalette: true,
  defaultProps: () => ({ title: "Section", open: true }),
  Inspector: FoldableInspector,
  exportMarkdown: (node) => {
    const p = node.props as FoldableProps;
    return `[Foldable: ${p.title ?? "Section"}]`;
  },
  exportMermaid: (node) => (node.props as FoldableProps).title ?? "Foldable",
});
