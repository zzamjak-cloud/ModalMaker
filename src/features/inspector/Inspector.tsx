// 우측 속성 편집기 (Property Panel)
// 선택된 노드의 kind에 따라 적절한 필드를 표시.
import { useMemo } from "react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import type {
  ButtonProps,
  CheckboxProps,
  ContainerProps,
  FoldableProps,
  InputProps,
  LayoutNode,
  ProgressProps,
  TextProps,
} from "@/types/layout";

export function Inspector() {
  const doc = useLayoutStore((s) => s.document);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const updateProps = useLayoutStore((s) => s.updateProps);
  const removeNode = useLayoutStore((s) => s.removeNode);
  const duplicateNode = useLayoutStore((s) => s.duplicateNode);

  const node = useMemo(() => (selectedId ? findNode(doc.root, selectedId) : null), [doc, selectedId]);

  if (!node) {
    return (
      <div className="p-4 text-sm text-neutral-500">
        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          Inspector
        </div>
        캔버스에서 컴포넌트를 선택하세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {node.kind}
        </div>
        <div className="flex gap-1">
          <Btn onClick={() => duplicateNode(node.id)} disabled={node.id === doc.root.id}>
            복제
          </Btn>
          <Btn onClick={() => removeNode(node.id)} disabled={node.id === doc.root.id} danger>
            삭제
          </Btn>
        </div>
      </div>

      <KindFields node={node} onChange={(patch) => updateProps(node.id, patch)} />
    </div>
  );
}

function KindFields({
  node,
  onChange,
}: {
  node: LayoutNode;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  switch (node.kind) {
    case "container": {
      const p = node.props as ContainerProps;
      return (
        <>
          <Field label="Label">
            <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
          </Field>
          <Field label="Direction">
            <Select
              value={p.direction ?? "column"}
              options={["column", "row", "grid"]}
              onChange={(v) => onChange({ direction: v })}
            />
          </Field>
          {p.direction === "grid" && (
            <Field label="Columns">
              <NumberInput value={p.columns ?? 2} min={1} max={12} onChange={(v) => onChange({ columns: v })} />
            </Field>
          )}
          <Field label="Gap">
            <NumberInput value={p.gap ?? 8} min={0} max={64} onChange={(v) => onChange({ gap: v })} />
          </Field>
          <Field label="Padding">
            <NumberInput value={p.padding ?? 12} min={0} max={64} onChange={(v) => onChange({ padding: v })} />
          </Field>
        </>
      );
    }
    case "foldable": {
      const p = node.props as FoldableProps;
      return (
        <>
          <Field label="Title">
            <TextInput value={p.title} onChange={(v) => onChange({ title: v })} />
          </Field>
          <Field label="Open">
            <Toggle value={p.open ?? true} onChange={(v) => onChange({ open: v })} />
          </Field>
        </>
      );
    }
    case "text": {
      const p = node.props as TextProps;
      return (
        <>
          <Field label="Text">
            <TextArea value={p.text} onChange={(v) => onChange({ text: v })} />
          </Field>
          <Field label="Size">
            <Select
              value={p.size ?? "md"}
              options={["sm", "md", "lg", "xl", "2xl"]}
              onChange={(v) => onChange({ size: v })}
            />
          </Field>
          <Field label="Weight">
            <Select
              value={p.weight ?? "normal"}
              options={["normal", "medium", "bold"]}
              onChange={(v) => onChange({ weight: v })}
            />
          </Field>
        </>
      );
    }
    case "button": {
      const p = node.props as ButtonProps;
      return (
        <>
          <Field label="Label">
            <TextInput value={p.label} onChange={(v) => onChange({ label: v })} />
          </Field>
          <Field label="Variant">
            <Select
              value={p.variant ?? "primary"}
              options={["primary", "secondary", "destructive", "ghost"]}
              onChange={(v) => onChange({ variant: v })}
            />
          </Field>
          <Field label="Size">
            <Select
              value={p.size ?? "md"}
              options={["sm", "md", "lg"]}
              onChange={(v) => onChange({ size: v })}
            />
          </Field>
        </>
      );
    }
    case "input": {
      const p = node.props as InputProps;
      return (
        <>
          <Field label="Label">
            <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
          </Field>
          <Field label="Placeholder">
            <TextInput value={p.placeholder ?? ""} onChange={(v) => onChange({ placeholder: v })} />
          </Field>
          <Field label="Type">
            <Select
              value={p.type ?? "text"}
              options={["text", "email", "password", "number"]}
              onChange={(v) => onChange({ type: v })}
            />
          </Field>
        </>
      );
    }
    case "checkbox": {
      const p = node.props as CheckboxProps;
      return (
        <>
          <Field label="Label">
            <TextInput value={p.label} onChange={(v) => onChange({ label: v })} />
          </Field>
          <Field label="Checked">
            <Toggle value={p.checked ?? false} onChange={(v) => onChange({ checked: v })} />
          </Field>
        </>
      );
    }
    case "progress": {
      const p = node.props as ProgressProps;
      return (
        <>
          <Field label="Label">
            <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
          </Field>
          <Field label="Value">
            <NumberInput value={p.value} min={0} max={p.max ?? 100} onChange={(v) => onChange({ value: v })} />
          </Field>
          <Field label="Max">
            <NumberInput value={p.max ?? 100} min={1} onChange={(v) => onChange({ max: v })} />
          </Field>
        </>
      );
    }
  }
}

function findNode(root: LayoutNode, id: string): LayoutNode | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const c of root.children) {
    const hit = findNode(c, id);
    if (hit) return hit;
  }
  return null;
}

// === 공용 폼 프리미티브 ===
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

function TextInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    />
  );
}

function TextArea({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
    />
  );
}

function NumberInput({
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

function Select<T extends string>({
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
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

function Btn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
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
