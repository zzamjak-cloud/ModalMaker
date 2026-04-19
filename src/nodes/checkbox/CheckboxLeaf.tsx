import type { LeafRenderProps } from "../types";
import type { CheckboxProps } from "@/types/layout";

export function CheckboxLeaf({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as CheckboxProps;
  const textColor = mode === "preview" ? (theme?.textPrimary ?? "#f5f5f5") : "#e5e5e5";
  const accent = mode === "preview" ? (theme?.accentBg ?? "#0ea5e9") : "#0ea5e9";
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 14,
        color: textColor,
        cursor: "pointer",
      }}
    >
      <input
        type="checkbox"
        {...(mode === "preview"
          ? { defaultChecked: p.checked ?? false }
          : { checked: p.checked ?? false, readOnly: true })}
        style={{ width: 16, height: 16, accentColor: accent }}
      />
      {p.label}
    </label>
  );
}
