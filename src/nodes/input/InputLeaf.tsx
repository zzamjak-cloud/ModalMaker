// Input — 캔버스(읽기 전용 스켈레톤) + 프리뷰(테마 입력)
import { memo, type CSSProperties } from "react";
import type { LeafRenderProps } from "../types";
import type { InputProps } from "@/types/layout";

function InputLeafImpl({ node, mode, theme }: LeafRenderProps) {
  const p = node.props as InputProps;

  if (mode === "canvas") {
    if (p.inline) {
      const lw = p.labelWidth ?? 30;
      return (
        <div className="flex w-full items-center gap-2">
          {p.label && (
            <label className="shrink-0 text-xs text-neutral-400" style={{ width: `${lw}%` }}>
              {p.label}
            </label>
          )}
          <input
            type={p.type ?? "text"}
            placeholder={p.placeholder}
            readOnly
            className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
          />
        </div>
      );
    }
    return (
      <div className="flex w-full flex-col gap-1">
        {p.label && <label className="text-xs text-neutral-400">{p.label}</label>}
        <input
          type={p.type ?? "text"}
          placeholder={p.placeholder}
          readOnly
          className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
        />
      </div>
    );
  }

  const t = theme!;
  const inputBaseStyle: CSSProperties = {
    borderRadius: 6,
    border: `1px solid ${t.inputBorder}`,
    backgroundColor: t.inputBg,
    color: t.textPrimary,
    padding: "6px 10px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
    minWidth: 0,
  };
  if (p.inline) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minWidth: 0,
        }}
      >
        {p.label && (
          <label
            style={{
              fontSize: 14,
              color: t.textSecondary,
              flexShrink: 0,
              width: `${p.labelWidth ?? 30}%`,
            }}
          >
            {p.label}
          </label>
        )}
        <input
          type={p.type ?? "text"}
          placeholder={p.placeholder}
          defaultValue={p.value}
          style={{ ...inputBaseStyle, flex: 1 }}
        />
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", minWidth: 0 }}>
      {p.label && (
        <label style={{ fontSize: 12, color: t.textSecondary }}>{p.label}</label>
      )}
      <input
        type={p.type ?? "text"}
        placeholder={p.placeholder}
        defaultValue={p.value}
        style={{ ...inputBaseStyle, width: "100%" }}
      />
    </div>
  );
}

export const InputLeaf = memo(InputLeafImpl, (a, b) => a.node === b.node && a.mode === b.mode && a.theme === b.theme);
