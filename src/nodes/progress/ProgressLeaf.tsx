import type { LeafRenderProps } from "../types";
import type { ProgressProps } from "@/types/layout";

export function ProgressLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as ProgressProps;
  const pct = Math.max(0, Math.min(100, ((p.value ?? 0) / (p.max ?? 100)) * 100));
  const trackBg = mode === "preview" ? (theme?.borderColor ?? "#262626") : "#262626"; // neutral-800
  const barBg = mode === "preview" ? (theme?.accentBg ?? "#0ea5e9") : "#0ea5e9"; // sky-500
  const labelColor = mode === "preview" ? theme?.textSecondary : "#a3a3a3"; // neutral-400
  return (
    <div style={{ width: "100%" }}>
      {p.label && (
        <div style={{ marginBottom: 4, fontSize: 12, color: labelColor }}>{p.label}</div>
      )}
      <div
        style={{
          height: 8,
          width: "100%",
          overflow: "hidden",
          borderRadius: 9999,
          background: trackBg,
        }}
      >
        <div
          style={{
            height: "100%",
            background: barBg,
            width: `${pct}%`,
            transition: "width 0.2s",
          }}
        />
      </div>
    </div>
  );
}
