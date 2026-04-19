import type { CSSProperties } from "react";
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import { isContainerKind, type LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { DropZone } from "@/features/canvas/DropZone";
import { applySizing } from "@/features/canvas/applySizing";
import {
  applyInnerFill,
  applyParentFit,
  flexMainAxisMarginStyle,
  type ParentFlexDirection,
} from "@/lib/layoutSizing";
import { containerBoxStyle } from "@/nodes/layout/containerLayoutStyle";
import { CanvasContainerInnerChrome, CanvasDraggableFrame } from "@/nodes/renderers/CanvasAdorners";
import type { NodeHostChildRender } from "@/nodes/nodeHostTypes";
import type { ContainerProps, FoldableProps, ModuleRefProps } from "@/types/layout";

export type NodeHostCanvasProps = {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
  renderChild: NodeHostChildRender;
  renderLeafCanvas: (node: LayoutNode) => React.ReactNode;
};

export function NodeHostCanvas({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  parentIsFlexContainer = false,
  renderChild,
  renderLeafCanvas,
}: NodeHostCanvasProps) {
  const enterModuleEdit = useLayoutStore((s) => s.enterModuleEdit);

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
      <span className="text-xs text-amber-400" title="순환 참조로 렌더 중단">
        ↻ 순환 참조: {mod.name}
      </span>
    ) : (
      <div className="pointer-events-none" style={{ display: "contents" }}>
        {renderChild({
          node: mod.root,
          depth: depth + 1,
          visitedModuleIds: nextVisited,
          parentDirection: "column",
          parentIsFlexContainer: true,
        })}
      </div>
    );

    return (
      <CanvasDraggableFrame
        nodeId={node.id}
        depth={depth}
        onDoubleClick={(e) => {
          e.stopPropagation();
          enterModuleEdit(p.moduleId);
        }}
        style={{
          ...applySizing(node),
          display: "flex",
          flexDirection: "column",
          ...(parentIsFlexContainer
            ? {
                ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
                ...applyParentFit(node, parentDirection),
              }
            : {}),
          position: "relative",
        }}
      >
        {content}
        <div className="pointer-events-none absolute -top-4 left-0 select-none text-[9px] uppercase tracking-wider text-neutral-500">
          {mod ? `⊚ ${mod.name}` : "⊚ ?"}
        </div>
      </CanvasDraggableFrame>
    );
  }

  if (isContainerKind(node.kind)) {
    const p = node.props as ContainerProps & FoldableProps;
    const isFoldable = node.kind === "foldable";
    const open = !isFoldable || p.open !== false;
    const rawDir = p.direction ?? "column";
    const innerDir: ParentFlexDirection =
      rawDir === "grid" ? "grid" : rawDir === "row" ? "row" : "column";
    const bgStyle: CSSProperties =
      p.backgroundOpacity !== undefined
        ? { background: `rgba(82,82,82,${p.backgroundOpacity / 100})` }
        : {};
    const flexStyle = parentIsFlexContainer
      ? {
          ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
          ...applyParentFit(node, parentDirection),
        }
      : {};
    const isRoot = depth === 0 && parentIsFlexContainer;
    const rootFill: CSSProperties = isRoot ? { flex: 1, minHeight: 0, width: "100%" } : {};
    const rootInnerFill: CSSProperties = isRoot ? { height: "100%", minHeight: 0 } : {};

    return (
      <CanvasDraggableFrame
        nodeId={node.id}
        depth={depth}
        showResizeHandles={false}
        className={cn(
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
          <CanvasContainerInnerChrome
            nodeId={node.id}
            style={{
              ...containerBoxStyle(p),
              ...applySizing(node),
              ...applyInnerFill(node),
              ...rootInnerFill,
              position: "relative",
              ...(isFoldable ? { paddingLeft: (p.padding ?? 12) + 16 } : {}),
            }}
          >
            {node.children?.length ? (
              <>
                <DropZone
                  containerId={node.id}
                  index={0}
                  direction={p.direction ?? "column"}
                />
                {node.children.map((c, i) => (
                  <Fragment key={c.id}>
                    {renderChild({
                      node: c,
                      depth: depth + 1,
                      visitedModuleIds,
                      parentDirection: innerDir,
                      parentIsFlexContainer: true,
                    })}
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
          </CanvasContainerInnerChrome>
        )}
      </CanvasDraggableFrame>
    );
  }

  return (
    <CanvasDraggableFrame
      nodeId={node.id}
      depth={depth}
      style={{
        ...applySizing(node),
        ...(parentIsFlexContainer
          ? {
              ...flexMainAxisMarginStyle(parentDirection, node.flexMainAxis),
              ...applyParentFit(node, parentDirection),
            }
          : {}),
        position: "relative",
      }}
    >
      {renderLeafCanvas(node)}
    </CanvasDraggableFrame>
  );
}
