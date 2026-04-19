import type { InspectorSectionProps } from "../types";
import type { ContainerProps } from "@/types/layout";
import {
  Field,
  NumberInput,
  PaddingField,
  SegmentedControl,
  Select,
  TextInput,
} from "@/features/editor/inspector/inspector-ui";
import { ColorPicker } from "@/features/editor/inspector/ColorPicker";

export function ContainerInspector({
  props,
  onChange,
}: InspectorSectionProps<ContainerProps>) {
  const p = props;
  const direction = p.direction ?? "column";
  const isRow = direction === "row";
  // "가로 정렬"/"세로 정렬"을 direction에 따라 justify/align에 매핑.
  // column: 가로=align(교차축), 세로=justify(주축) / row: 반대.
  const horizontalKey = isRow ? "justify" : "align";
  const verticalKey = isRow ? "align" : "justify";
  let horizontalValueRaw = (isRow ? p.justify : p.align) ?? "start";
  let verticalValueRaw = (isRow ? p.align : p.justify) ?? "start";
  if (horizontalKey === "justify" && horizontalValueRaw === "around") horizontalValueRaw = "between";
  if (verticalKey === "justify" && verticalValueRaw === "around") verticalValueRaw = "between";

  const horizontalJustifyOpts = [
    { value: "start", label: "좌측" },
    { value: "center", label: "중앙" },
    { value: "end", label: "우측" },
    { value: "between", label: "균등" },
  ] as const;
  const horizontalAlignOpts = [
    { value: "start", label: "좌측" },
    { value: "center", label: "중앙" },
    { value: "end", label: "우측" },
    { value: "stretch", label: "균등" },
  ] as const;
  const verticalJustifyOpts = [
    { value: "start", label: "상단" },
    { value: "center", label: "중앙" },
    { value: "end", label: "하단" },
    { value: "between", label: "균등" },
  ] as const;
  const verticalAlignOpts = [
    { value: "start", label: "상단" },
    { value: "center", label: "중앙" },
    { value: "end", label: "하단" },
    { value: "stretch", label: "균등" },
  ] as const;

  const horizontalOpts = horizontalKey === "justify" ? horizontalJustifyOpts : horizontalAlignOpts;
  const verticalOpts = verticalKey === "justify" ? verticalJustifyOpts : verticalAlignOpts;
  const horizontalValue = horizontalOpts.some((o) => o.value === horizontalValueRaw)
    ? horizontalValueRaw
    : "start";
  const verticalValue = verticalOpts.some((o) => o.value === verticalValueRaw)
    ? verticalValueRaw
    : "start";

  return (
    <>
      <Field label="Label">
        <TextInput value={p.label ?? ""} onChange={(v) => onChange({ label: v })} />
      </Field>
      <Field label="Direction">
        <Select
          value={direction}
          options={["column", "row", "grid"]}
          onChange={(v) => onChange({ direction: v })}
        />
      </Field>
      {direction === "grid" && (
        <Field label="Columns">
          <NumberInput
            value={p.columns ?? 2}
            min={1}
            max={12}
            onChange={(v) => onChange({ columns: v })}
          />
        </Field>
      )}
      <Field label="가로 정렬">
        <SegmentedControl
          value={horizontalValue}
          options={horizontalOpts.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => onChange({ [horizontalKey]: v })}
        />
      </Field>
      <Field label="세로 정렬">
        <SegmentedControl
          value={verticalValue}
          options={verticalOpts.map((o) => ({ value: o.value, label: o.label }))}
          onChange={(v) => onChange({ [verticalKey]: v })}
        />
      </Field>
      <Field label="Gap">
        <NumberInput value={p.gap ?? 8} min={0} max={64} onChange={(v) => onChange({ gap: v })} />
      </Field>
      <PaddingField
        uniform={p.uniformPadding !== false}
        uniformValue={p.padding ?? 12}
        top={p.paddingTop ?? p.padding ?? 12}
        right={p.paddingRight ?? p.padding ?? 12}
        bottom={p.paddingBottom ?? p.padding ?? 12}
        left={p.paddingLeft ?? p.padding ?? 12}
        onChange={(patch) => onChange(patch as Partial<ContainerProps>)}
      />
      <Field label="Border Style">
        <SegmentedControl
          value={p.borderStyle ?? "none"}
          options={[
            { value: "none", label: "없음" },
            { value: "solid", label: "실선" },
            { value: "dashed", label: "대시" },
            { value: "dotted", label: "점선" },
          ]}
          onChange={(v) => onChange({ borderStyle: v })}
        />
      </Field>
      {p.borderStyle && p.borderStyle !== "none" && (
        <>
          <Field label="Border Width (px)">
            <NumberInput
              value={p.borderWidth ?? 1}
              min={0}
              max={8}
              onChange={(v) => onChange({ borderWidth: v })}
            />
          </Field>
          <Field label="Border Color">
            <ColorPicker
              value={p.borderColor ?? "#525252"}
              onChange={(v) => onChange({ borderColor: v })}
            />
          </Field>
        </>
      )}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-400">배경 농도</span>
          {p.backgroundOpacity !== undefined && (
            <button
              type="button"
              onClick={() => onChange({ backgroundOpacity: undefined })}
              className="text-[10px] text-neutral-500 hover:text-neutral-300"
              title="테마 기본값으로 재설정"
            >
              초기화
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={100}
            value={p.backgroundOpacity ?? 80}
            onChange={(e) => onChange({ backgroundOpacity: Number(e.target.value) })}
            className="flex-1 accent-sky-500"
          />
          <span className="w-8 text-right text-xs tabular-nums text-neutral-300">
            {p.backgroundOpacity !== undefined ? `${p.backgroundOpacity}%` : "–"}
          </span>
        </div>
      </div>
    </>
  );
}
