// 재귀 노드 렌더러
// 한 함수가 모든 NodeKind의 시각적 표현 + 중첩 children을 처리한다.
// 컨테이너(container/foldable)는 내부 DropZone을 열어 드롭 대상이 된다.
// 자식이 있을 때는 "자식 사이" 및 앞/뒤에 gap DropZone을 삽입해 원하는 index에 배치 가능.
// Text 노드는 더블 클릭으로 인라인 편집이 가능하며, 편집 중에는 드래그가 비활성화된다.
import { Fragment } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { isContainerKind, type LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { DropZone } from "./DropZone";
import { ButtonLeaf } from "./ButtonLeaf";
import { ResizeHandles } from "./ResizeHandles";
import { applySizing } from "./applySizing";
import {
  applyInnerFill,
  applyParentFit,
  flexMainAxisMarginStyle,
  justifyContentCss,
  type ParentFlexDirection,
} from "@/lib/layoutSizing";
import { getDescriptor } from "@/nodes/registry";
import {
  ContainerProps,
  FoldableProps,
  InputProps,
  ModuleRefProps,
} from "@/types/layout";

function containerStyle(p: ContainerProps): React.CSSProperties {
  const isGrid = p.direction === "grid";
  const base: React.CSSProperties = {
    display: isGrid ? "grid" : "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    gridTemplateColumns: isGrid ? `repeat(${p.columns ?? 2}, minmax(0,1fr))` : undefined,
    gap: p.gap ?? 8,
    alignItems: p.align,
    justifyContent: justifyContentCss(p.justify),
  };
  const fallback = p.padding ?? 12;
  if (p.uniformPadding === false) {
    base.paddingTop = p.paddingTop ?? fallback;
    base.paddingRight = p.paddingRight ?? fallback;
    base.paddingBottom = p.paddingBottom ?? fallback;
    base.paddingLeft = p.paddingLeft ?? fallback;
  } else {
    base.padding = fallback;
  }
  // Container 자체 경계선
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}

export function NodeRenderer({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  /** 루트·module-ref 직하위 등 부모가 flex가 아닐 때 false (기본 false) */
  parentIsFlexContainer = false,
}: {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  /** 직계 부모 flex/grid의 주축 방향 (자식 flex margin:auto에 사용) */
  parentDirection?: ParentFlexDirection;
  /** 직계 부모가 flex/grid 컨테이너일 때만 flexMainAxis 적용 */
  parentIsFlexContainer?: boolean;
}) {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const select = useLayoutStore((s) => s.select);
  const toggleSelectMulti = useLayoutStore((s) => s.toggleSelectMulti);
  const clearMultiSelect = useLayoutStore((s) => s.clearMultiSelect);
  const enterModuleEdit = useLayoutStore((s) => s.enterModuleEdit);

  const isSelected = selectedId === node.id;
  const isInMultiSelect = selectedIds.includes(node.id);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0, // 루트는 드래그 금지
  });

  // ring은 box-shadow 기반이라 레이아웃에 영향 없음 — border 대신 ring 사용
  const outline = cn(
    "relative rounded-md transition",
    isSelected || isInMultiSelect
      ? "ring-2 ring-sky-500/80"
      : "hover:ring-1 hover:ring-neutral-600",
    isDragging && "opacity-50",
  );

  const selectHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      toggleSelectMulti(node.id);
    } else {
      clearMultiSelect();
      select(node.id);
    }
  };

  // module-ref는 리프지만 내부적으로 다른 모듈 트리를 재귀 렌더하므로
  // 일반 리프 경로 전에 처리하고, visitedModuleIds로 순환 참조를 감지한다.
  if (node.kind === "module-ref") {
    const p = node.props as ModuleRefProps;
    const mod = useLayoutStore
      .getState()
      .document.modules.find((m) => m.id === p.moduleId);

    const isCircular = !!visitedModuleIds && visitedModuleIds.has(p.moduleId);
    const nextVisited = new Set(visitedModuleIds ?? []);
    nextVisited.add(p.moduleId);

    const content = !mod ? (
      <span className="text-xs text-rose-400">[모듈 없음: {p.moduleId}]</span>
    ) : isCircular ? (
      <span
        className="text-xs text-amber-400"
        title="순환 참조로 렌더 중단"
      >
        ↻ 순환 참조: {mod.name}
      </span>
    ) : (
      // 모듈 root에게 이 wrapper div가 flex 부모임을 알려 anchored sizing이 동작하도록 함
      <NodeRenderer
        node={mod.root}
        depth={depth + 1}
        visitedModuleIds={nextVisited}
        parentDirection="column"
        parentIsFlexContainer
      />
    );

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={selectHandler}
        onDoubleClick={(e) => { e.stopPropagation(); enterModuleEdit(p.moduleId); }}
        className={cn(outline)}
        style={{
          ...applySizing(node),
          display: "flex",
          flexDirection: "column",
          ...(parentIsFlexContainer ? {
            ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
            ...applyParentFit(node, parentDirection),
          } : {}),
          position: "relative",
        }}
      >
        <ResizeHandles nodeId={node.id} show={isSelected} />
        {/* 모듈 내부 NodeRenderer의 클릭 이벤트가 module-ref 선택을 가로채지 못하도록 차단 */}
        <div className="pointer-events-none" style={{ display: "contents" }}>
          {content}
        </div>
        <div className="pointer-events-none absolute -top-4 left-0 select-none text-[9px] uppercase tracking-wider text-neutral-500">
          {mod ? `⊚ ${mod.name}` : "⊚ ?"}
        </div>
      </div>
    );
  }

  if (isContainerKind(node.kind)) {
    const p = node.props as ContainerProps & FoldableProps;
    const isFoldable = node.kind === "foldable";
    const open = !isFoldable || p.open !== false;
    const rawDir = p.direction ?? "column";
    const innerDir: ParentFlexDirection =
      rawDir === "grid" ? "grid" : rawDir === "row" ? "row" : "column";
    // 캔버스에서 농도 변화가 시각적으로 보이도록 neutral-600(82,82,82) 기준색 사용
    const bgStyle: React.CSSProperties =
      p.backgroundOpacity !== undefined
        ? { background: `rgba(82,82,82,${p.backgroundOpacity / 100})` }
        : {};
    const flexStyle = parentIsFlexContainer
      ? {
          ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
          ...applyParentFit(node, parentDirection),
        }
      : {};
    // depth=0이고 부모가 flex일 때 뷰포트 박스를 강제로 채움 (사용자 sizing 설정 무관)
    const isRoot = depth === 0 && parentIsFlexContainer;
    const rootFill: React.CSSProperties = isRoot ? { flex: 1, minHeight: 0, width: "100%" } : {};
    const rootInnerFill: React.CSSProperties = isRoot ? { height: "100%", minHeight: 0 } : {};
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={selectHandler}
        className={cn(
          outline,
          depth === 0 ? "bg-neutral-900/80" : "bg-neutral-900/40",
          depth === 0 && !parentIsFlexContainer ? "min-w-[320px]" : "",
        )}
        style={{ ...flexStyle, ...bgStyle, ...rootFill }}
      >
        {isFoldable && (
          <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
            <span>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open && (
          <div
            className="relative min-h-0 min-w-0"
            style={{
              ...containerStyle(p),
              ...applySizing(node),
              ...applyInnerFill(node),
              ...rootInnerFill,
              position: "relative",
              ...(isFoldable ? { paddingLeft: (p.padding ?? 12) + 16 } : {}),
            }}
          >
            <ResizeHandles nodeId={node.id} show={isSelected} />
            {node.children?.length ? (
              <>
                <DropZone
                  containerId={node.id}
                  index={0}
                  direction={p.direction ?? "column"}
                />
                {node.children.map((c, i) => (
                  <Fragment key={c.id}>
                    <NodeRenderer
                      node={c}
                      depth={depth + 1}
                      visitedModuleIds={visitedModuleIds}
                      parentDirection={innerDir}
                      parentIsFlexContainer
                    />
                    <DropZone
                      containerId={node.id}
                      index={i + 1}
                      direction={p.direction ?? "column"}
                    />
                  </Fragment>
                ))}
              </>
            ) : (
              <DropZone containerId={node.id} variant="empty" />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={selectHandler}
      className={cn(outline)}
      style={{
        ...applySizing(node),
        ...(parentIsFlexContainer ? {
          ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
          ...applyParentFit(node, parentDirection),
        } : {}),
        position: "relative",
      }}
    >
      <ResizeHandles nodeId={node.id} show={isSelected} />
      {renderLeaf(node)}
    </div>
  );
}

function renderLeaf(node: LayoutNode): React.ReactNode {
  // registry에 Leaf가 등록된 kind는 descriptor 경로 우선 사용 (점진 이관)
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="canvas" />;
  }
  switch (node.kind) {
    case "button":
      return <ButtonLeaf node={node} />;
    case "input": {
      const p = node.props as InputProps;
      if (p.inline) {
        const lw = p.labelWidth ?? 30;
        return (
          <div className="flex w-full items-center gap-2">
            {p.label && (
              <label className="shrink-0 text-xs text-neutral-400" style={{ width: `${lw}%` }}>
                {p.label}
              </label>
            )}
            <input
              type={p.type ?? "text"}
              placeholder={p.placeholder}
              readOnly
              className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
        );
      }
      return (
        <div className="flex w-full flex-col gap-1">
          {p.label && <label className="text-xs text-neutral-400">{p.label}</label>}
          <input
            type={p.type ?? "text"}
            placeholder={p.placeholder}
            readOnly
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      );
    }
    default:
      return null;
  }
}

