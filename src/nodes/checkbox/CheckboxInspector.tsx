import type { InspectorSectionProps } from "../types";
import type { CheckboxProps } from "@/types/layout";
import { Field, TextInput, Toggle } from "@/features/inspector/inspector-ui";

export function CheckboxInspector({ props, onChange }: InspectorSectionProps<CheckboxProps>) {
  const p = props;
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
