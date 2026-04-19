// Inspector UI 공용 프리미티브
// Field/TextInput/TextArea/NumberInput/Select/SegmentedControl/Toggle/Btn —
// nodes/<kind>/Inspector 모듈에서도 공유할 수 있도록 export.
import { cn } from "@/lib/cn";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    />
  );
}

export function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    />
  );
}

export function NumberInput({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    />
  );
}

export function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: T[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

/** 짧은 라벨의 상호 배타 선택 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded px-1.5 py-1 text-xs transition",
            value === o.value
              ? "bg-sky-500/25 text-sky-100 shadow-inner"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full border transition",
        value ? "border-sky-500 bg-sky-500" : "border-neutral-700 bg-neutral-800",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
          value ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

/** 레이블 좌측 + 작은 숫자 입력 (Padding·Margin 4-방향 그리드용) */
export function LabeledNumber({
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
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={0}
        max={64}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
}

/** 균일 / 4방향 개별 값 토글을 지원하는 Padding 필드 */
export function PaddingField({
  uniform,
  uniformValue,
  top,
  right,
  bottom,
  left,
  onChange,
}: {
  uniform: boolean;
  uniformValue: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Padding</span>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={uniform}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { uniformPadding: true }
                  : {
                      uniformPadding: false,
                      paddingTop: top,
                      paddingRight: right,
                      paddingBottom: bottom,
                      paddingLeft: left,
                    },
              )
            }
            className="h-3.5 w-3.5 accent-sky-500"
          />
          Uniform
        </label>
      </div>
      {uniform ? (
        <NumberInput
          value={uniformValue}
          min={0}
          max={64}
          onChange={(v) => onChange({ padding: v })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <LabeledNumber label="Top" value={top} onChange={(v) => onChange({ paddingTop: v })} />
          <LabeledNumber label="Right" value={right} onChange={(v) => onChange({ paddingRight: v })} />
          <LabeledNumber label="Bottom" value={bottom} onChange={(v) => onChange({ paddingBottom: v })} />
          <LabeledNumber label="Left" value={left} onChange={(v) => onChange({ paddingLeft: v })} />
        </div>
      )}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "rounded-md border px-2 py-1 text-xs transition",
        disabled
          ? "cursor-not-allowed border-neutral-800 text-neutral-600"
          : danger
            ? "border-rose-700 text-rose-300 hover:bg-rose-950/40"
            : "border-neutral-700 text-neutral-200 hover:bg-neutral-800",
      )}
    >
      {children}
    </button>
  );
}
