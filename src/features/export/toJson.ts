// LayoutDocument → pretty-printed JSON
import type { LayoutDocument } from "@/types/layout";

export function toJson(doc: LayoutDocument): string {
  return JSON.stringify(doc, null, 2);
}
