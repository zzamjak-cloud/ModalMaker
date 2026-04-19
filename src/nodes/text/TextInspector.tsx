// Text Inspector 섹션 — Inspector.tsx에서 분리
import type { InspectorSectionProps } from "../types";
import type { TextProps } from "@/types/layout";
import {
  Field,
  Select,
  SegmentedControl,
  TextArea,
} from "@/features/editor/inspector/inspector-ui";
import { ColorPicker } from "@/features/editor/inspector/ColorPicker";

export function TextInspector({ props, onChange }: InspectorSectionProps<TextProps>) {
  const p = props;
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
      <Field label="Align">
        <SegmentedControl
          value={p.align ?? "left"}
          options={[
            { value: "left", label: "←" },
            { value: "center", label: "가운데" },
            { value: "right", label: "→" },
          ]}
          onChange={(v) => onChange({ align: v })}
        />
      </Field>
      <Field label="Color">
        <ColorPicker
          value={p.color ?? ""}
          onChange={(v) => onChange({ color: v || undefined })}
          allowEmpty
        />
      </Field>
    </>
  );
}
