// 공용 sizing → CSS 변환 헬퍼
// fixedSize=true면 width/height 스타일 및 flex-shrink:0을 반환. 그 외에는 빈 객체.
import type { CSSProperties } from "react";
import type { LayoutNode } from "@/types/layout";

export function applySizing(node: LayoutNode): CSSProperties {
  const s = node.sizing;
  if (!s?.fixedSize) return {};
  const out: CSSProperties = { flexShrink: 0 };
  if (typeof s.width === "number") out.width = s.width;
  if (typeof s.height === "number") out.height = s.height;
  return out;
}
