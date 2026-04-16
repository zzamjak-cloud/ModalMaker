export { toJson } from "./toJson";
export { toMarkdown, type MarkdownOptions } from "./toMarkdown";
export { toMermaid } from "./toMermaid";

export type ExportFormat = "markdown" | "json" | "mermaid";

export const EXPORT_FORMAT_LABEL: Record<ExportFormat, string> = {
  markdown: "Markdown",
  json: "JSON",
  mermaid: "Mermaid",
};

export const EXPORT_FORMAT_EXT: Record<ExportFormat, string> = {
  markdown: "md",
  json: "json",
  mermaid: "mmd",
};
