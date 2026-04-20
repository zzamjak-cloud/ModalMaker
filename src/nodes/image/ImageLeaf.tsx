// Image leaf — 캔버스·프리뷰 공용. src가 없으면 플레이스홀더.
import type { LeafRenderProps } from "../types";
import type { ImageProps } from "@/types/layout";

export function ImageLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as ImageProps;
  const fit: "cover" | "contain" | "fill" = p.fit ?? "cover";
  const outlineWidth = p.outlineWidth ?? 1;
  const outlineColor = p.outlineColor ?? "#525252";
  const hasOutline = p.outlineStyle && p.outlineStyle !== "none";
  const outline = hasOutline ? `${outlineWidth}px ${p.outlineStyle} ${outlineColor}` : undefined;
  const placeholderBg = mode === "preview" ? theme?.borderColor ?? "#262626" : "#262626";
  const placeholderFg = mode === "preview" ? theme?.textMuted ?? "#737373" : "#737373";

  const frame: React.CSSProperties = {
    width: "100%",
    minHeight: 60,
    height: "100%",
    borderRadius: 4,
    outline,
    outlineOffset: hasOutline ? -Math.min(outlineWidth, 2) : undefined,
    boxSizing: "border-box",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (p.src) {
    return (
      <div style={frame}>
        <img
          src={p.src}
          alt={p.alt ?? ""}
          style={{
            width: "100%",
            height: "100%",
            objectFit: fit,
            display: "block",
          }}
          draggable={false}
        />
      </div>
    );
  }

  // 빈 상태: 플레이스홀더 (대시 보더 + 이모지)
  return (
    <div
      style={{
        ...frame,
        background: placeholderBg,
        color: placeholderFg,
        outline: hasOutline ? outline : `1px dashed ${outlineColor}`,
        outlineOffset: -1,
        fontSize: 12,
        gap: 6,
      }}
    >
      <span role="img" aria-label="image" style={{ fontSize: 22 }}>🖼</span>
      <span>{p.alt || "이미지 없음"}</span>
    </div>
  );
}
