import type { LeafRenderProps } from "../types";
import type { SplitProps } from "@/types/layout";

export function SplitLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as SplitProps;
  const orientation = p.orientation ?? "horizontal";
  const style = p.style ?? "solid";
  const thickness = p.thickness ?? 1;
  const defaultColor = mode === "preview" ? (theme?.borderColor ?? "#525252") : "#525252";
  const color = p.color ?? defaultColor;
  if (orientation === "vertical") {
    return (
      <div
        aria-label="split"
        style={{
          borderLeftWidth: thickness,
          borderLeftStyle: style,
          borderLeftColor: color,
          minHeight: 24,
          alignSelf: "stretch",
        }}
      />
    );
  }
  return (
    <div
      aria-label="split"
      style={{
        borderTopWidth: thickness,
        borderTopStyle: style,
        borderTopColor: color,
        width: "100%",
      }}
    />
  );
}
