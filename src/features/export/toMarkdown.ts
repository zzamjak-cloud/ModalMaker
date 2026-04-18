// LayoutDocument → AI 친화적 Markdown 트리
// 예:
//   # UI Layout Structure
//   - [Container: Header]
//     - [Text: Logo]
//     - [Button: Login]
import type { LayoutDocument, LayoutNode } from "@/types/layout";

function nodeLine(node: LayoutNode): string {
  switch (node.kind) {
    case "container": {
      const p = node.props as { label?: string; direction?: string; columns?: number };
      const label = p.label ?? "Container";
      const hint =
        p.direction === "grid"
          ? ` (Grid${p.columns ? `: ${p.columns} cols` : ""})`
          : p.direction === "row"
            ? " (Row)"
            : p.direction === "column"
              ? ""
              : "";
      return `[Container: ${label}${hint}]`;
    }
    case "foldable": {
      const p = node.props as { title?: string };
      return `[Foldable: ${p.title ?? "Section"}]`;
    }
    case "text": {
      const p = node.props as { text?: string };
      return `[Text: "${p.text ?? ""}"]`;
    }
    case "button": {
      const p = node.props as { label?: string; variant?: string };
      const v = p.variant && p.variant !== "primary" ? ` (${p.variant})` : "";
      return `[Button: "${p.label ?? ""}"${v}]`;
    }
    case "input": {
      const p = node.props as { placeholder?: string; type?: string; label?: string };
      const parts = [p.label ?? p.placeholder ?? "Input"];
      if (p.type && p.type !== "text") parts.push(`type=${p.type}`);
      return `[Input: ${parts.join(", ")}]`;
    }
    case "checkbox": {
      const p = node.props as { label?: string; checked?: boolean };
      return `[Checkbox: "${p.label ?? ""}"${p.checked ? " (checked)" : ""}]`;
    }
    case "progress": {
      const p = node.props as { value?: number; max?: number; label?: string };
      const pct = Math.round(((p.value ?? 0) / (p.max ?? 100)) * 100);
      return `[ProgressBar: ${pct}%${p.label ? ` "${p.label}"` : ""}]`;
    }
    case "split": {
      const p = node.props as { style?: string; orientation?: string; label?: string };
      const parts: string[] = [p.style ?? "solid"];
      if (p.orientation === "vertical") parts.push("vertical");
      if (p.label) parts.push(`"${p.label}"`);
      return `[Split: ${parts.join(", ")}]`;
    }
    case "icon": {
      const n = (node.props as { name?: string }).name ?? "Icon";
      return `[Icon: ${n}]`;
    }
  }
}

function renderNode(node: LayoutNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const lines = [`${indent}- ${nodeLine(node)}`];
  if (node.children?.length) {
    for (const c of node.children) {
      lines.push(renderNode(c, depth + 1));
    }
  }
  return lines.join("\n");
}

export interface MarkdownOptions {
  includePrompt?: boolean;
  promptTemplate?: string;
  title?: boolean;
}

const DEFAULT_PROMPT =
  "아래는 내가 설계한 UI 레이아웃 구조입니다. 이 구조를 그대로 반영해 React + TailwindCSS 컴포넌트로 구현해주세요.";

export function toMarkdown(doc: LayoutDocument, opts: MarkdownOptions = {}): string {
  const sections: string[] = [];
  if (opts.includePrompt) {
    sections.push(opts.promptTemplate?.trim() || DEFAULT_PROMPT);
    sections.push("");
  }
  if (opts.title !== false) {
    sections.push(`# ${doc.title || "UI Layout Structure"}`);
    sections.push("");
  }
  sections.push(renderNode(doc.root, 0));
  return sections.join("\n");
}
