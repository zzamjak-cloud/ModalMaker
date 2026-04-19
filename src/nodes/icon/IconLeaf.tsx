// Icon leaf — Lucide 아이콘 렌더. 캔버스·프리뷰 동일.
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import type { LeafRenderProps } from "../types";
import type { IconProps } from "@/types/layout";

export function IconLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as IconProps;
  const Comp = getLucideIcon(p.name);
  if (!Comp) {
    return (
      <span
        style={{
          fontSize: 12,
          color: mode === "preview" ? theme?.textMuted : "#737373",
        }}
      >
        ?{mode === "canvas" ? p.name ?? "" : ""}
      </span>
    );
  }
  const defaultColor =
    mode === "preview" ? (theme?.textPrimary ?? "currentColor") : "currentColor";
  return <Comp size={p.size ?? 20} color={p.color ?? defaultColor} />;
}
