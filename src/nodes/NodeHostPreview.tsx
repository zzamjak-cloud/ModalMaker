import type { CSSProperties } from "react";
import { Fragment, useEffect, useState } from "react";
import { isContainerKind, type LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { applySizing } from "@/features/canvas/applySizing";
import { applyParentFit, type ParentFlexDirection } from "@/lib/layoutSizing";
import { containerBoxStyle } from "@/nodes/layout/containerLayoutStyle";
import {
  PreviewInteractionFrame,
  usePreviewInteractionShell,
} from "@/nodes/renderers/PreviewAdorners";
import type { PreviewContext } from "@/features/preview/previewRuntime";
import type { ThemeTokens } from "@/features/preview/themes";
import type { NodeHostChildRender, RenderLeafPreviewFn } from "@/nodes/nodeHostTypes";
import type { ContainerProps, FoldableProps, InputProps, ModuleRefProps } from "@/types/layout";

export type NodeHostPreviewProps = {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
  renderChild: NodeHostChildRender;
  renderLeafPreview: RenderLeafPreviewFn;
  ctx: PreviewContext;
  theme: ThemeTokens;
};

export function NodeHostPreview({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  parentIsFlexContainer = false,
  renderChild,
  renderLeafPreview,
  ctx,
  theme,
}: NodeHostPreviewProps) {
  const [localOpen, setLocalOpen] = useState(
    node.kind === "foldable" ? (node.props as FoldableProps).open !== false : true,
  );
  useEffect(() => {
    if (node.kind === "foldable") {
      setLocalOpen((node.props as FoldableProps).open !== false);
    }
  }, [node.kind, node.id, (node.props as FoldableProps)?.open]);

  const sizing = applySizing(node);
  const parentFit = parentIsFlexContainer ? applyParentFit(node, parentDirection) : {};
  const isRoot = depth === 0 && parentIsFlexContainer;
  const rootFill: CSSProperties = isRoot
    ? { flex: 1, minHeight: 0, width: "100%", height: "100%" }
    : {};

  if (node.kind === "module-ref") {
    const p = node.props as ModuleRefProps;
    const mod = useLayoutStore.getState().document.modules.find((m) => m.id === p.moduleId);
    const nextVisited = new Set(visitedModuleIds ?? []);
    const isCircular = nextVisited.has(p.moduleId);
    nextVisited.add(p.moduleId);
    if (!mod) return <span style={{ fontSize: 12, color: "#f87171" }}>[모듈 없음]</span>;
    if (isCircular) return <span style={{ fontSize: 12, color: "#fbbf24" }}>↻ 순환</span>;
    return (
      <PreviewInteractionFrame
        node={node}
        ctx={ctx}
        theme={theme}
        style={{
          ...sizing,
          ...parentFit,
          ...rootFill,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {renderChild({
          node: mod.root,
          depth: depth + 1,
          visitedModuleIds: nextVisited,
          parentDirection: "column",
          parentIsFlexContainer: true,
        })}
      </PreviewInteractionFrame>
    );
  }

  if (isContainerKind(node.kind)) {
    const p = node.props as ContainerProps & FoldableProps;
    const isFoldable = node.kind === "foldable";
    const open = !isFoldable || localOpen;
    const rawDir = p.direction ?? "column";
    const innerDir: ParentFlexDirection =
      rawDir === "grid" ? "grid" : rawDir === "row" ? "row" : "column";
    const rgbStr = depth === 0 ? theme.surfaceRGBStr : theme.surfaceRGBStr2;
    const bg =
      p.backgroundOpacity !== undefined
        ? `rgba(${rgbStr},${p.backgroundOpacity / 100})`
        : depth === 0
          ? theme.surfaceBg
          : theme.surfaceBg2;

    return (
      <PreviewInteractionFrame
        node={node}
        ctx={ctx}
        theme={theme}
        style={{
          ...containerBoxStyle(p),
          ...sizing,
          ...parentFit,
          background: bg,
          ...rootFill,
        }}
      >
        {isFoldable && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              setLocalOpen((v) => !v);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              borderBottom: `1px solid ${theme.borderColor}`,
              padding: "6px 12px",
              fontSize: 13,
              fontWeight: 500,
              color: theme.textSecondary,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open &&
          (isFoldable ? (
            <div
              style={{
                paddingLeft: 16,
                display: "flex",
                flexDirection: "column",
                gap: p.gap ?? 8,
              }}
            >
              {node.children?.map((c) => (
                <Fragment key={c.id}>
                  {renderChild({
                    node: c,
                    depth: depth + 1,
                    visitedModuleIds,
                    parentDirection: innerDir,
                    parentIsFlexContainer: true,
                  })}
                </Fragment>
              ))}
            </div>
          ) : (
            node.children?.map((c) => (
              <Fragment key={c.id}>
                {renderChild({
                  node: c,
                  depth: depth + 1,
                  visitedModuleIds,
                  parentDirection: innerDir,
                  parentIsFlexContainer: true,
                })}
              </Fragment>
            ))
          ))}
      </PreviewInteractionFrame>
    );
  }

  if (node.kind === "input") {
    const p = node.props as InputProps;
    const inputBaseStyle: CSSProperties = {
      borderRadius: 6,
      border: `1px solid ${theme.inputBorder}`,
      backgroundColor: theme.inputBg,
      color: theme.textPrimary,
      padding: "6px 10px",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      minWidth: 0,
    };
    const inner =
      p.inline ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            minWidth: 0,
          }}
        >
          {p.label && (
            <label
              style={{
                fontSize: 14,
                color: theme.textSecondary,
                flexShrink: 0,
                width: `${p.labelWidth ?? 30}%`,
              }}
            >
              {p.label}
            </label>
          )}
          <input
            type={p.type ?? "text"}
            placeholder={p.placeholder}
            defaultValue={p.value}
            style={{ ...inputBaseStyle, flex: 1 }}
          />
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", minWidth: 0 }}>
          {p.label && (
            <label style={{ fontSize: 12, color: theme.textSecondary }}>{p.label}</label>
          )}
          <input
            type={p.type ?? "text"}
            placeholder={p.placeholder}
            defaultValue={p.value}
            style={{ ...inputBaseStyle, width: "100%" }}
          />
        </div>
      );
    return (
      <PreviewInteractionFrame
        node={node}
        ctx={ctx}
        theme={theme}
        style={{ ...sizing, ...parentFit }}
      >
        {inner}
      </PreviewInteractionFrame>
    );
  }

  const { handlerProps, stateStyle, hover } = usePreviewInteractionShell(node, ctx);
  const leaf = renderLeafPreview(node, { hover });
  return (
    <div style={{ ...sizing, ...parentFit, ...stateStyle }} {...handlerProps}>
      {leaf}
    </div>
  );
}
