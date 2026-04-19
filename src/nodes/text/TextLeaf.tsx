// Text leaf — 캔버스·프리뷰 공용 렌더러
// 캔버스는 고정 프레임 처리·기본 텍스트색(neutral-100)만 다르고 나머지는 동일.
import type { LeafRenderProps } from "../types";
import type { TextProps } from "@/types/layout";
import { normalizeSizing } from "@/lib/layoutSizing";

const SIZE_PX: Record<NonNullable<TextProps["size"]>, number> = {
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  "2xl": 24,
};

const WEIGHT_NUM: Record<NonNullable<TextProps["weight"]>, number> = {
  normal: 400,
  medium: 500,
  bold: 700,
};

export function TextLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as TextProps;
  const fontSize = SIZE_PX[p.size ?? "md"];
  const fontWeight = WEIGHT_NUM[p.weight ?? "normal"];
  const textAlign = p.align ?? "left";

  // 캔버스 기본 색: neutral-100(#f5f5f5), 프리뷰 기본 색: 테마 텍스트 컬러
  const defaultColor = mode === "preview" ? theme?.textPrimary : "#f5f5f5";
  const color = p.color ?? defaultColor;

  // 고정 프레임은 캔버스에서만 지원 (프리뷰는 상위 wrapper가 sizing 처리)
  const { widthFixed, heightFixed, width, height } = normalizeSizing(node.sizing);
  const fixedFrame = mode === "canvas" && (widthFixed || heightFixed);

  return (
    <div
      style={{
        fontSize,
        fontWeight,
        color,
        textAlign,
        display: "block",
        width: fixedFrame && widthFixed ? width : "100%",
        ...(fixedFrame && heightFixed ? { height, overflow: "hidden" } : {}),
      }}
    >
      {p.text || "Text"}
    </div>
  );
}
