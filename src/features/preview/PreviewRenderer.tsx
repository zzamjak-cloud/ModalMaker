// 프리뷰용 재귀 렌더러 — 트리 본체는 NodeHost(프리뷰 모드).
import type { CSSProperties, ReactNode } from "react";
import { applySizing } from "@/features/canvas/applySizing";
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";
import { useTheme } from "./ThemeContext";
import { runActions, type PreviewContext } from "./previewRuntime";
import type { ButtonProps, LayoutNode } from "@/types/layout";
import type { ThemeTokens } from "@/features/preview/themes";
import type { ParentFlexDirection } from "@/lib/layoutSizing";

export function PreviewRenderer({
  node,
  ctx,
  visitedModuleIds,
  depth = 0,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: {
  node: LayoutNode;
  ctx: PreviewContext;
  visitedModuleIds?: Set<string>;
  depth?: number;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
}) {
  const t = useTheme();
  return (
    <NodeHost
      mode="preview"
      node={node}
      depth={depth}
      visitedModuleIds={visitedModuleIds}
      parentDirection={parentDirection}
      parentIsFlexContainer={parentIsFlexContainer}
      ctx={ctx}
      theme={t}
      renderChild={(p) => (
        <PreviewRenderer
          node={p.node}
          ctx={ctx}
          visitedModuleIds={p.visitedModuleIds}
          depth={p.depth}
          parentDirection={p.parentDirection}
          parentIsFlexContainer={p.parentIsFlexContainer}
        />
      )}
      renderLeafPreview={(n, { hover }) => renderLeafPreview(n, hover, ctx, t)}
    />
  );
}

function renderLeafPreview(
  node: LayoutNode,
  hover: boolean,
  ctx: PreviewContext,
  t: ThemeTokens,
): ReactNode {
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="preview" theme={t} />;
  }
  switch (node.kind) {
    case "button": {
      const p = node.props as ButtonProps;
      const isTabGroup = !!p.tabGroupId;
      const isTabActive = isTabGroup ? ctx.tabActiveMap[p.tabGroupId!] === node.id : true;
      const effectiveVariant = isTabGroup
        ? isTabActive
          ? (p.variant ?? "primary")
          : (p.tabInactiveVariant ?? "ghost")
        : (p.variant ?? "primary");
      const variantStyle: CSSProperties = (() => {
        switch (effectiveVariant) {
          case "primary":
            return { backgroundColor: t.accentBg, color: t.accentText };
          case "secondary":
            return { backgroundColor: t.secondaryBg, color: t.secondaryText };
          case "destructive":
            return { backgroundColor: t.destructiveBg, color: t.destructiveText };
          case "ghost":
            return { backgroundColor: t.ghostBg, color: t.ghostText, border: `1px solid ${t.ghostBorder}` };
          case "plain":
            return { backgroundColor: "transparent", color: t.ghostText, border: "none" };
          default:
            return {};
        }
      })();
      const sizeStyle: CSSProperties = {
        sm: { padding: "4px 8px", fontSize: 12 },
        md: { padding: "6px 12px", fontSize: 14 },
        lg: { padding: "8px 16px", fontSize: 16 },
      }[p.size ?? "md"] ?? { padding: "6px 12px", fontSize: 14 };
      const Icon = getLucideIcon(p.iconName);
      const pos = p.iconPosition ?? "left";
      const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"] ?? 14;
      const sizing = applySizing(node);
      const btnSizeStyle: CSSProperties = {
        ...(sizing.width ? { width: sizing.width } : {}),
        ...(sizing.height ? { height: sizing.height } : {}),
      };
      const btnJustify = {
        left: "flex-start",
        center: "center",
        right: "flex-end",
      }[p.contentAlign ?? "center"];
      return (
        <button
          type="button"
          onClick={
            isTabGroup
              ? (e) => {
                  e.stopPropagation();
                  ctx.setTabActive(p.tabGroupId!, node.id);
                  runActions(node.interactions ?? [], "click", ctx);
                }
              : undefined
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: btnJustify,
            gap: 6,
            borderRadius: 6,
            fontWeight: 500,
            cursor: "pointer",
            border: "none",
            transition: "filter 0.12s",
            filter: hover ? "brightness(1.15)" : undefined,
            opacity: isTabGroup && !isTabActive ? 0.6 : undefined,
            ...variantStyle,
            ...sizeStyle,
            ...btnSizeStyle,
          }}
        >
          {Icon && pos === "left" && <Icon size={iconPx} />}
          <span>{p.label}</span>
          {Icon && pos === "right" && <Icon size={iconPx} />}
        </button>
      );
    }
    default:
      return null;
  }
}
