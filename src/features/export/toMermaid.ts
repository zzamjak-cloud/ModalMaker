// LayoutDocument → Mermaid flowchart (graph TD)
// AI가 구조/위계 파악에 용이
import type { LayoutDocument, LayoutNode } from "@/types/layout";

function safeLabel(node: LayoutNode): string {
  const base = (() => {
    switch (node.kind) {
      case "container":
        return (node.props as { label?: string }).label ?? "Container";
      case "panel-layout":
        return (node.props as { label?: string }).label ?? "Panel Layout";
      case "foldable":
        return (node.props as { title?: string }).title ?? "Foldable";
      case "text":
        return `Text: ${(node.props as { text?: string }).text ?? ""}`;
      case "button":
        return `Button: ${(node.props as { label?: string }).label ?? ""}`;
      case "input":
        return `Input: ${
          (node.props as { placeholder?: string; label?: string }).label ??
          (node.props as { placeholder?: string }).placeholder ??
          ""
        }`;
      case "checkbox":
        return `Checkbox: ${(node.props as { label?: string }).label ?? ""}`;
      case "progress": {
        const p = node.props as { value?: number; max?: number };
        const pct = Math.round(((p.value ?? 0) / (p.max ?? 100)) * 100);
        return `Progress: ${pct}%`;
      }
      case "split": {
        const p = node.props as { style?: string; orientation?: string };
        return `Split: ${p.style ?? "solid"}${p.orientation === "vertical" ? " v" : ""}`;
      }
    }
  })();
  // Mermaid 예약 문자 이스케이프
  return base.replace(/"/g, "'").replace(/[\[\]]/g, "");
}

function renderEdges(node: LayoutNode, lines: string[]): void {
  const parentLabel = `${node.id}["${safeLabel(node)}"]`;
  lines.push(`  ${parentLabel}`);
  if (!node.children) return;
  for (const c of node.children) {
    lines.push(`  ${node.id} --> ${c.id}`);
    renderEdges(c, lines);
  }
}

export function toMermaid(doc: LayoutDocument): string {
  const lines: string[] = ["graph TD"];
  renderEdges(doc.root, lines);
  return lines.join("\n");
}
