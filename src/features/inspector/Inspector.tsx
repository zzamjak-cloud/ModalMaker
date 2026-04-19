// 우측 속성 편집기 (Property Panel)
// 선택된 노드의 kind에 따라 적절한 필드를 표시.
import { useMemo } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore, activeRoot } from "@/stores/layoutStore";
import { SizeSection } from "./SizeSection";
import { FlexChildSection } from "./FlexChildSection";
import { IconPicker } from "./IconPicker";
import { InteractionSection } from "./InteractionSection";
import { ColorPicker } from "./ColorPicker";
import { getDescriptor } from "@/nodes/registry";
import type {
  ButtonProps,
  ContainerProps,
  FoldableProps,
  InputProps,
  LayoutNode,
  ModuleRefProps,
  NodeProps,
} from "@/types/layout";

export function Inspector() {
  const root = useLayoutStore((s) => activeRoot(s));
  const selectedId = useLayoutStore((s) => s.selectedId);
  const editingModuleId = useLayoutStore((s) => s.editingModuleId);
  const updateProps = useLayoutStore((s) => s.updateProps);
  const removeNode = useLayoutStore((s) => s.removeNode);
  const duplicateNode = useLayoutStore((s) => s.duplicateNode);
  const registerModule = useLayoutStore((s) => s.registerModule);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const updatePropsMulti = useLayoutStore((s) => s.updatePropsMulti);

  const node = useMemo(
    () => (selectedId && root ? findNode(root, selectedId) : null),
    [root, selectedId],
  );

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

  // 멀티 선택 모드 (2개 이상 선택 시)
  if (selectedIds.length > 1 && root) {
    const selectedNodes = selectedIds
      .map((id) => findNode(root, id))
      .filter((n): n is LayoutNode => n !== null);
    const allSameKind = selectedNodes.length > 0 &&
      selectedNodes.every((n) => n.kind === selectedNodes[0].kind);
    const kind = allSameKind ? selectedNodes[0].kind : null;

    // 혼재 값 계산: 모든 노드가 동일하면 그 값, 아니면 undefined
    function getMixed<T>(getter: (n: LayoutNode) => T): T | undefined {
      const vals = selectedNodes.map(getter);
      return vals.every((v) => v === vals[0]) ? vals[0] : undefined;
    }

    // 버튼 대표 노드 구성 (혼재 값은 undefined → 빈칸으로 표시)
    const repNode: LayoutNode | null = (allSameKind && kind === "button" && selectedNodes.length > 0)
      ? {
          ...selectedNodes[0],
          props: {
            label: getMixed((n) => (n.props as ButtonProps).label) ?? "",
            variant: getMixed((n) => (n.props as ButtonProps).variant) ?? (selectedNodes[0].props as ButtonProps).variant,
            size: getMixed((n) => (n.props as ButtonProps).size) ?? (selectedNodes[0].props as ButtonProps).size,
            contentAlign: getMixed((n) => (n.props as ButtonProps).contentAlign) ?? (selectedNodes[0].props as ButtonProps).contentAlign,
            tabGroupId: getMixed((n) => (n.props as ButtonProps).tabGroupId),
            tabDefaultActive: getMixed((n) => (n.props as ButtonProps).tabDefaultActive),
            tabInactiveVariant: getMixed((n) => (n.props as ButtonProps).tabInactiveVariant),
          } as ButtonProps,
        }
      : null;

    // 변경 적용: 빈 문자열은 skip (혼재 표시용 빈값은 전파 안 함)
    const onChangeMulti = (patch: Record<string, unknown>) => {
      const filtered = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => v !== "" && v !== undefined),
      );
      if (Object.keys(filtered).length > 0) {
        updatePropsMulti(selectedIds, filtered as Partial<NodeProps>);
      }
    };

    return (
      <div className="flex flex-col gap-3 p-4">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
          {selectedIds.length}개 선택됨{kind ? ` (${kind})` : " — 다른 종류 혼재"}
        </div>
        {repNode && (
          <>
            <KindFields node={repNode} onChange={onChangeMulti} />
            <div className="h-px bg-neutral-800" />
            <SizeSection node={selectedNodes[0]} />
          </>
        )}
        {!repNode && (
          <div className="text-xs text-neutral-500">
            같은 종류 노드를 선택하면 일괄 편집할 수 있습니다.
          </div>
        )}
      </div>
    );
  }

  // 모듈로 등록 가능 조건: 컨테이너 && 루트가 아님 && 이미 module-ref가 아님 && 모듈 편집 중이 아님
  const canRegisterModule =
    node.kind === "container" &&
    node.id !== root?.id &&
    !editingModuleId;

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
          {node.kind}
        </div>
        <div className="flex gap-1">
          <Btn
            onClick={() => registerModule(node.id)}
            disabled={!canRegisterModule}
            title="이 컨테이너를 공용 모듈로 등록"
          >
            <Package size={12} className="mr-1 inline" />
            모듈로 등록
          </Btn>
          <Btn onClick={() => duplicateNode(node.id)} disabled={node.id === root?.id}>
            복제
          </Btn>
          <Btn onClick={() => removeNode(node.id)} disabled={node.id === root?.id} danger>
            삭제
          </Btn>
        </div>
      </div>

      <KindFields node={node} onChange={(patch) => updateProps(node.id, patch)} />
      <div className="h-px bg-neutral-800" />
      <SizeSection node={node} />
      <div className="h-px bg-neutral-800" />
      <FlexChildSection node={node} />
      <div className="h-px bg-neutral-800" />
      <InteractionSection node={node} />
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
  // registry에 Inspector가 등록된 kind는 descriptor 경로 우선 사용 (점진 이관)
  const desc = getDescriptor(node.kind);
  if (desc?.Inspector) {
    const InspectorSection = desc.Inspector;
    return (
      <InspectorSection
        node={node}
        props={node.props as never}
        onChange={onChange as never}
      />
    );
  }
  switch (node.kind) {
    case "container": {
      const p = node.props as ContainerProps;
      const direction = p.direction ?? "column";
      const isRow = direction === "row";
      // "가로 정렬"/"세로 정렬"을 direction에 따라 justify/align에 매핑.
      // column: 가로=align(교차축), 세로=justify(주축) / row: 반대.
      const horizontalKey = isRow ? "justify" : "align";
      const verticalKey = isRow ? "align" : "justify";
      // UI 라벨 통일: 가로=좌/중/우/균등, 세로=상/중/하/균등 — justify 네 번째는 between, align 네 번째는 stretch
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
              <NumberInput value={p.columns ?? 2} min={1} max={12} onChange={(v) => onChange({ columns: v })} />
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
            onChange={onChange}
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
                <ColorPicker value={p.borderColor ?? "#525252"} onChange={(v) => onChange({ borderColor: v })} />
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
    case "input": {
      const p = node.props as InputProps;
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
    case "module-ref": {
      return <ModuleRefFields node={node} />;
    }
  }
}

// module-ref 전용 인스펙터 필드 - 모듈 원본 이름 편집과 편집 모드 진입.
function ModuleRefFields({ node }: { node: LayoutNode }) {
  const p = node.props as ModuleRefProps;
  const mod = useLayoutStore((s) => s.document.modules.find((m) => m.id === p.moduleId));
  const updateModule = useLayoutStore((s) => s.updateModule);
  const enterModuleEdit = useLayoutStore((s) => s.enterModuleEdit);
  const unlinkModule = useLayoutStore((s) => s.unlinkModule);

  if (!mod) {
    return (
      <Field label="Module">
        <div className="text-xs text-rose-400">참조 모듈이 삭제되었습니다 (id: {p.moduleId}).</div>
      </Field>
    );
  }
  return (
    <>
      <Field label="Module Name">
        <TextInput value={mod.name} onChange={(v) => updateModule(mod.id, { name: v })} />
      </Field>
      <Field label="Action">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => enterModuleEdit(mod.id)}
            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
          >
            모듈 편집으로 이동
          </button>
          <button
            onClick={() => unlinkModule(node.id)}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20"
            title="모듈 링크를 해제하고 편집 가능한 일반 컴포넌트로 변환"
          >
            모듈 해제
          </button>
        </div>
      </Field>
    </>
  );
}

// Uniform 체크박스 + 단일/4방향 입력을 동시에 처리하는 Padding 편집기
function PaddingField({
  uniform,
  uniformValue,
  top,
  right,
  bottom,
  left,
  onChange,
}: {
  uniform: boolean;
  uniformValue: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Padding</span>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={uniform}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? { uniformPadding: true }
                  : {
                      uniformPadding: false,
                      paddingTop: top,
                      paddingRight: right,
                      paddingBottom: bottom,
                      paddingLeft: left,
                    },
              )
            }
            className="h-3.5 w-3.5 accent-sky-500"
          />
          Uniform
        </label>
      </div>
      {uniform ? (
        <NumberInput
          value={uniformValue}
          min={0}
          max={64}
          onChange={(v) => onChange({ padding: v })}
        />
      ) : (
        <div className="grid grid-cols-2 gap-1.5">
          <LabeledNumber label="Top" value={top} onChange={(v) => onChange({ paddingTop: v })} />
          <LabeledNumber label="Right" value={right} onChange={(v) => onChange({ paddingRight: v })} />
          <LabeledNumber label="Bottom" value={bottom} onChange={(v) => onChange({ paddingBottom: v })} />
          <LabeledNumber label="Left" value={left} onChange={(v) => onChange({ paddingLeft: v })} />
        </div>
      )}
    </div>
  );
}

function LabeledNumber({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-10 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={0}
        max={64}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
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

// 토글 그룹 - 짧은 라벨의 상호 배타 선택
function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded px-1.5 py-1 text-xs transition",
            value === o.value
              ? "bg-sky-500/25 text-sky-100 shadow-inner"
              : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
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
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
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
