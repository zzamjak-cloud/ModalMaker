import type { InspectorSectionProps } from "../types";
import type { ButtonProps } from "@/types/layout";
import {
  Field,
  SegmentedControl,
  Select,
  TextInput,
  Toggle,
} from "@/features/inspector/inspector-ui";
import { IconPicker } from "@/features/inspector/IconPicker";

export function ButtonInspector({ props, onChange }: InspectorSectionProps<ButtonProps>) {
  const p = props;
  return (
    <>
      <Field label="Label">
        <TextInput value={p.label} onChange={(v) => onChange({ label: v })} />
      </Field>
      <Field label="Variant">
        <Select
          value={p.variant ?? "primary"}
          options={["primary", "secondary", "destructive", "ghost", "plain"]}
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
      <Field label="Icon">
        <IconPicker value={p.iconName} onChange={(v) => onChange({ iconName: v || undefined })} />
      </Field>
      {p.iconName && (
        <Field label="Icon Position">
          <SegmentedControl
            value={p.iconPosition ?? "left"}
            options={[
              { value: "left", label: "왼쪽" },
              { value: "right", label: "오른쪽" },
            ]}
            onChange={(v) => onChange({ iconPosition: v })}
          />
        </Field>
      )}
      <Field label="Content Align">
        <SegmentedControl
          value={p.contentAlign ?? "center"}
          options={[
            { value: "left", label: "←" },
            { value: "center", label: "가운데" },
            { value: "right", label: "→" },
          ]}
          onChange={(v) => onChange({ contentAlign: v })}
        />
      </Field>
      <Field label="탭 그룹 ID">
        <TextInput
          value={p.tabGroupId ?? ""}
          onChange={(v) => onChange({ tabGroupId: v || undefined })}
        />
      </Field>
      {p.tabGroupId && (
        <>
          <Field label="기본 활성">
            <Toggle
              value={p.tabDefaultActive ?? false}
              onChange={(v) => onChange({ tabDefaultActive: v })}
            />
          </Field>
          <Field label="비활성 스타일">
            <Select
              value={p.tabInactiveVariant ?? "ghost"}
              options={["primary", "secondary", "destructive", "ghost", "plain"]}
              onChange={(v) => onChange({ tabInactiveVariant: v })}
            />
          </Field>
        </>
      )}
    </>
  );
}
