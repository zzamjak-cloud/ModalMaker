// 우측 속성 편집기 (Property Panel)
// 선택된 노드의 kind에 따라 적절한 필드를 표시.
import { useMemo } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore, activeRoot } from "@/stores/layoutStore";
import { SizeSection } from "./SizeSection";
import { FlexChildSection } from "./FlexChildSection";
import { InteractionSection } from "./InteractionSection";
import { getDescriptor } from "@/nodes/registry";
import type {
  ButtonProps,
  LayoutNode,
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
  // 모든 kind가 이관됨: descriptor가 없으면 null 반환
  return null;
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
