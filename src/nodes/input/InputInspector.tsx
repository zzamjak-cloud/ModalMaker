import type { InspectorSectionProps } from "../types";
import type { InputProps } from "@/types/layout";
import {
  Field,
  NumberInput,
  SegmentedControl,
  Select,
  TextInput,
} from "@/features/editor/inspector/inspector-ui";

export function InputInspector({ props, onChange }: InspectorSectionProps<InputProps>) {
  const p = props;
  return (
    <>
      <Field label="Layout">
        <SegmentedControl
          value={p.inline ? "inline" : "stack"}
          options={[
            { value: "stack", label: "2줄" },
            { value: "inline", label: "1줄" },
          ]}
          onChange={(v) => onChange({ inline: v === "inline" })}
        />
      </Field>
      <Field label="Label">
        <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
      </Field>
      {p.inline && (
        <Field label="Label 비율 (%)">
          <NumberInput
            value={p.labelWidth ?? 30}
            min={10}
            max={70}
            onChange={(v) => onChange({ labelWidth: v })}
          />
        </Field>
      )}
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
