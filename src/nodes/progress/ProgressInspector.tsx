import type { InspectorSectionProps } from "../types";
import type { ProgressProps } from "@/types/layout";
import { Field, NumberInput, TextInput } from "@/features/inspector/inspector-ui";

export function ProgressInspector({ props, onChange }: InspectorSectionProps<ProgressProps>) {
  const p = props;
  return (
    <>
      <Field label="Label">
        <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
      </Field>
      <Field label="Value">
        <NumberInput
          value={p.value}
          min={0}
          max={p.max ?? 100}
          onChange={(v) => onChange({ value: v })}
        />
      </Field>
      <Field label="Max">
        <NumberInput value={p.max ?? 100} min={1} onChange={(v) => onChange({ max: v })} />
      </Field>
    </>
  );
}
