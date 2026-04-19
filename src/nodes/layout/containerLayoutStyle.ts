// 캔버스·프리뷰 공통: container / foldable 의 flex·grid 박스 스타일
import type { CSSProperties } from "react";
import type { ContainerProps } from "@/types/layout";
import { justifyContentCss } from "@/lib/layoutSizing";

export function containerBoxStyle(p: ContainerProps): CSSProperties {
  const isGrid = p.direction === "grid";
  const base: CSSProperties = {
    display: isGrid ? "grid" : "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    gridTemplateColumns: isGrid ? `repeat(${p.columns ?? 2}, minmax(0,1fr))` : undefined,
    gap: p.gap ?? 8,
    alignItems: p.align,
    justifyContent: justifyContentCss(p.justify),
  };
  const fallback = p.padding ?? 12;
  if (p.uniformPadding === false) {
    base.paddingTop = p.paddingTop ?? fallback;
    base.paddingRight = p.paddingRight ?? fallback;
    base.paddingBottom = p.paddingBottom ?? fallback;
    base.paddingLeft = p.paddingLeft ?? fallback;
  } else {
    base.padding = fallback;
  }
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}
