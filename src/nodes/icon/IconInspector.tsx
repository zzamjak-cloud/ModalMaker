import type { InspectorSectionProps } from "../types";
import type { IconProps } from "@/types/layout";
import { Field, NumberInput } from "@/features/inspector/inspector-ui";
import { IconPicker } from "@/features/inspector/IconPicker";
import { ColorPicker } from "@/features/inspector/ColorPicker";

export function IconInspector({ props, onChange }: InspectorSectionProps<IconProps>) {
  const p = props;
  return (
    <>
      <Field label="Icon">
        <IconPicker value={p.name} onChange={(v) => onChange({ name: v || "HelpCircle" })} />
      </Field>
      <Field label="Size (px)">
        <NumberInput value={p.size ?? 20} min={8} max={128} onChange={(v) => onChange({ size: v })} />
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
