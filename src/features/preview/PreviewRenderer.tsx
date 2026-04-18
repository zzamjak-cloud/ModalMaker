// 프리뷰용 재귀 렌더러 — 편집 기능 제거 + 인터렉션 이벤트 부착 + 테마 토큰 적용.
import { useState, useMemo } from "react";
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import { applySizing } from "@/features/canvas/applySizing";
import { useLayoutStore } from "@/stores/layoutStore";
import { useTheme } from "./ThemeContext";
import {
  hasDisabledBehavior,
  runActions,
  styleForState,
  type PreviewContext,
} from "./previewRuntime";
import type {
  ButtonProps,
  CheckboxProps,
  ContainerProps,
  FoldableProps,
  IconProps,
  InputProps,
  LayoutNode,
  ModuleRefProps,
  ProgressProps,
  SplitProps,
  TextProps,
} from "@/types/layout";

function containerLayoutStyle(p: ContainerProps): React.CSSProperties {
  const isGrid = p.direction === "grid";
  const base: React.CSSProperties = {
    display: isGrid ? "grid" : "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    gridTemplateColumns: isGrid ? `repeat(${p.columns ?? 2}, minmax(0,1fr))` : undefined,
    gap: p.gap ?? 8,
    alignItems: p.align,
    justifyContent: p.justify === "between" ? "space-between" : p.justify,
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
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor;
  }
  return base;
}

export function PreviewRenderer({
  node,
  ctx,
  visitedModuleIds,
  depth = 0,
}: {
  node: LayoutNode;
  ctx: PreviewContext;
  visitedModuleIds?: Set<string>;
  depth?: number;
}) {
  const t = useTheme();
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const disabled = hasDisabledBehavior(node.interactions);

  const stateStyle = useMemo(
    () => styleForState(node.interactions, { hover, pressed, disabled }),
    [node.interactions, hover, pressed, disabled],
  );

  const onClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    runActions(node.interactions ?? [], "click", ctx);
  };
  const onMouseEnter = () => {
    if (disabled) return;
    setHover(true);
    runActions(node.interactions ?? [], "hover", ctx);
  };
  const onMouseLeave = () => { setHover(false); setPressed(false); };
  const onMouseDown = () => {
    if (disabled) return;
    setPressed(true);
    runActions(node.interactions ?? [], "press", ctx);
  };
  const onMouseUp = () => {
    if (!pressed) return;
    setPressed(false);
    runActions(node.interactions ?? [], "release", ctx);
  };

  const handlerProps = node.interactions?.length
    ? { onClick, onMouseEnter, onMouseLeave, onMouseDown, onMouseUp }
    : {};

  const sizing = applySizing(node);

  // module-ref
  if (node.kind === "module-ref") {
    const p = node.props as ModuleRefProps;
    const mod = useLayoutStore.getState().document.modules.find((m) => m.id === p.moduleId);
    const nextVisited = new Set(visitedModuleIds ?? []);
    const isCircular = nextVisited.has(p.moduleId);
    nextVisited.add(p.moduleId);
    if (!mod) return <span style={{ fontSize: 12, color: "#f87171" }}>[모듈 없음]</span>;
    if (isCircular) return <span style={{ fontSize: 12, color: "#fbbf24" }}>↻ 순환</span>;
    return (
      <div style={{ ...sizing, ...stateStyle }} {...handlerProps}>
        <PreviewRenderer node={mod.root} ctx={ctx} visitedModuleIds={nextVisited} depth={depth} />
      </div>
    );
  }

  // container / foldable
  if (node.kind === "container" || node.kind === "foldable") {
    const p = node.props as ContainerProps & FoldableProps;
    const open = node.kind !== "foldable" || p.open !== false;
    const bg = depth === 0 ? t.surfaceBg : t.surfaceBg2;
    return (
      <div
        style={{
          ...containerLayoutStyle(p),
          ...sizing,
          ...stateStyle,
          backgroundColor: p.borderColor ? undefined : bg,
          // borderColor prop이 명시된 경우 컨테이너 배경은 별도 래퍼로 분리하지 않음
          background: bg,
        }}
        {...handlerProps}
      >
        {node.kind === "foldable" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            borderBottom: `1px solid ${t.borderColor}`,
            padding: "6px 12px",
            fontSize: 12, fontWeight: 500, color: t.textSecondary,
          }}>
            <span>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open && node.children?.map((c) => (
          <PreviewRenderer
            key={c.id}
            node={c}
            ctx={ctx}
            visitedModuleIds={visitedModuleIds}
            depth={depth + 1}
          />
        ))}
      </div>
    );
  }

  // leaf nodes
  const leaf = (() => {
    switch (node.kind) {
      case "text": {
        const p = node.props as TextProps;
        const fontSize = { sm: 12, md: 14, lg: 16, xl: 18, "2xl": 24 }[p.size ?? "md"];
        const fontWeight = { normal: 400, medium: 500, bold: 700 }[p.weight ?? "normal"];
        return (
          <span style={{ fontSize, fontWeight, color: p.color ?? t.textPrimary }}>
            {p.text || "Text"}
          </span>
        );
      }
      case "button": {
        const p = node.props as ButtonProps;
        const variantStyle: React.CSSProperties = (() => {
          switch (p.variant ?? "primary") {
            case "primary":
              return { backgroundColor: t.accentBg, color: t.accentText };
            case "secondary":
              return { backgroundColor: t.secondaryBg, color: t.secondaryText };
            case "destructive":
              return { backgroundColor: t.destructiveBg, color: t.destructiveText };
            case "ghost":
              return { backgroundColor: t.ghostBg, color: t.ghostText, border: `1px solid ${t.ghostBorder}` };
            default:
              return {};
          }
        })();
        const sizeStyle: React.CSSProperties = {
          sm: { padding: "4px 8px", fontSize: 12 },
          md: { padding: "6px 12px", fontSize: 14 },
          lg: { padding: "8px 16px", fontSize: 16 },
        }[p.size ?? "md"] ?? { padding: "6px 12px", fontSize: 14 };
        const Icon = getLucideIcon(p.iconName);
        const pos = p.iconPosition ?? "left";
        const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"] ?? 14;
        return (
          <button
            type="button"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              borderRadius: 6, fontWeight: 500, cursor: "pointer",
              border: "none", ...variantStyle, ...sizeStyle,
            }}
          >
            {Icon && pos === "left" && <Icon size={iconPx} />}
            <span>{p.label}</span>
            {Icon && pos === "right" && <Icon size={iconPx} />}
          </button>
        );
      }
      case "input": {
        const p = node.props as InputProps;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {p.label && (
              <label style={{ fontSize: 12, color: t.textSecondary }}>{p.label}</label>
            )}
            <input
              type={p.type ?? "text"}
              placeholder={p.placeholder}
              defaultValue={p.value}
              style={{
                width: "100%", borderRadius: 6,
                border: `1px solid ${t.inputBorder}`,
                backgroundColor: t.inputBg,
                color: t.textPrimary,
                padding: "6px 10px", fontSize: 14,
                outline: "none",
              }}
            />
          </div>
        );
      }
      case "checkbox": {
        const p = node.props as CheckboxProps;
        return (
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: t.textPrimary, cursor: "pointer" }}>
            <input type="checkbox" defaultChecked={p.checked ?? false} style={{ width: 16, height: 16, accentColor: t.accentBg }} />
            {p.label}
          </label>
        );
      }
      case "progress": {
        const p = node.props as ProgressProps;
        const pct = Math.max(0, Math.min(100, ((p.value ?? 0) / (p.max ?? 100)) * 100));
        return (
          <div style={{ width: "100%" }}>
            {p.label && <div style={{ marginBottom: 4, fontSize: 12, color: t.textSecondary }}>{p.label}</div>}
            <div style={{ height: 8, width: "100%", overflow: "hidden", borderRadius: 9999, backgroundColor: t.borderColor }}>
              <div style={{ height: "100%", backgroundColor: t.accentBg, width: `${pct}%`, transition: "width 0.2s" }} />
            </div>
          </div>
        );
      }
      case "split": {
        const p = node.props as SplitProps;
        const orientation = p.orientation ?? "horizontal";
        const style = p.style ?? "solid";
        const thickness = p.thickness ?? 1;
        const color = p.color ?? t.borderColor;
        if (orientation === "vertical") {
          return <div style={{ borderLeftWidth: thickness, borderLeftStyle: style, borderLeftColor: color, minHeight: 24, alignSelf: "stretch" }} />;
        }
        return <div style={{ borderTopWidth: thickness, borderTopStyle: style, borderTopColor: color, width: "100%" }} />;
      }
      case "icon": {
        const p = node.props as IconProps;
        const Comp = getLucideIcon(p.name);
        if (!Comp) return <span style={{ fontSize: 12, color: t.textMuted }}>?</span>;
        return <Comp size={p.size ?? 20} color={p.color ?? t.textPrimary} />;
      }
      default:
        return null;
    }
  })();

  return (
    <div style={{ ...sizing, ...stateStyle }} {...handlerProps}>
      {leaf}
    </div>
  );
}
