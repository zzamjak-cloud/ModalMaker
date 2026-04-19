import type { InspectorSectionProps } from "../types";
import type { FoldableProps } from "@/types/layout";
import { Field, TextInput, Toggle } from "@/features/inspector/inspector-ui";

export function FoldableInspector({ props, onChange }: InspectorSectionProps<FoldableProps>) {
  const p = props;
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
