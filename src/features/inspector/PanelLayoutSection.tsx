// panel-layout 노드 전용 Inspector 필드: 슬롯 토글 + 크기 입력.
import type { LayoutNode, PanelLayoutProps } from "@/types/layout";

export function PanelLayoutSection({
  node,
  onChange,
}: {
  node: LayoutNode;
  onChange: (patch: Partial<PanelLayoutProps>) => void;
}) {
  const p = node.props as PanelLayoutProps;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-400">Slots</div>
      <div className="grid grid-cols-2 gap-1">
        {(
          [
            ["Header", "showHeader", p.showHeader ?? true],
            ["Footer", "showFooter", p.showFooter ?? false],
            ["Left", "showLeft", p.showLeft ?? true],
            ["Right", "showRight", p.showRight ?? false],
          ] as const
        ).map(([label, key, val]) => (
          <label
            key={key}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
          >
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="h-3.5 w-3.5 accent-sky-500"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="text-xs text-neutral-400">Sizes (px)</div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumLabel label="Header H" value={p.headerHeight ?? 48} onChange={(v) => onChange({ headerHeight: v })} />
        <NumLabel label="Footer H" value={p.footerHeight ?? 40} onChange={(v) => onChange({ footerHeight: v })} />
        <NumLabel label="Left W"   value={p.leftWidth   ?? 220} onChange={(v) => onChange({ leftWidth: v })} />
        <NumLabel label="Right W"  value={p.rightWidth  ?? 260} onChange={(v) => onChange({ rightWidth: v })} />
      </div>
    </div>
  );
}

function NumLabel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={4096}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
}
