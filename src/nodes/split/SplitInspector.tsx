import type { InspectorSectionProps } from "../types";
import type { SplitProps } from "@/types/layout";
import {
  Field,
  NumberInput,
  SegmentedControl,
  TextInput,
} from "@/features/editor/inspector/inspector-ui";
import { ColorPicker } from "@/features/editor/inspector/ColorPicker";

export function SplitInspector({ props, onChange }: InspectorSectionProps<SplitProps>) {
  const p = props;
  return (
    <>
      <Field label="Orientation">
        <SegmentedControl
          value={p.orientation ?? "horizontal"}
          options={[
            { value: "horizontal", label: "가로선" },
            { value: "vertical", label: "세로선" },
          ]}
          onChange={(v) => onChange({ orientation: v })}
        />
      </Field>
      <Field label="Style">
        <SegmentedControl
          value={p.style ?? "solid"}
          options={[
            { value: "solid", label: "실선" },
            { value: "dashed", label: "대시" },
            { value: "dotted", label: "점선" },
          ]}
          onChange={(v) => onChange({ style: v })}
        />
      </Field>
      <Field label="Thickness (px)">
        <NumberInput
          value={p.thickness ?? 1}
          min={1}
          max={16}
          onChange={(v) => onChange({ thickness: v })}
        />
      </Field>
      <Field label="Color">
        <ColorPicker value={p.color ?? "#525252"} onChange={(v) => onChange({ color: v })} />
      </Field>
      <Field label="Label (선택)">
        <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
      </Field>
    </>
  );
}
