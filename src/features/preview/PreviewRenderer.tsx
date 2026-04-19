// 프리뷰용 재귀 렌더러 — 편집 기능 제거 + 인터렉션 이벤트 부착 + 테마 토큰 적용.
import { useState, useMemo } from "react";
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import { applySizing } from "@/features/canvas/applySizing";
import { applyParentFit, type ParentFlexDirection } from "@/lib/layoutSizing";
import { useLayoutStore } from "@/stores/layoutStore";
import { getDescriptor } from "@/nodes/registry";
import { useTheme } from "./ThemeContext";
import {
  hasDisabledBehavior,
  runActions,
  styleForState,
  type PreviewContext,
} from "./previewRuntime";
import type {
  ButtonProps,
  ContainerProps,
  FoldableProps,
  InputProps,
  LayoutNode,
  ModuleRefProps,
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
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  // foldable 전용 토글 상태 (프리뷰에서만 동적, 다른 kind에선 무시)
  const [localOpen, setLocalOpen] = useState(
    node.kind === "foldable" ? (node.props as FoldableProps).open !== false : true,
  );
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

  // hover는 비주얼 피드백을 위해 항상 활성화, 클릭/프레스는 인터렉션 있을 때만
  const handlerProps = {
    onMouseEnter,
    onMouseLeave,
    ...(node.interactions?.length ? { onClick, onMouseDown, onMouseUp } : {}),
  };

  const sizing = applySizing(node);
  const parentFit = parentIsFlexContainer ? applyParentFit(node, parentDirection) : {};
  // depth=0이고 부모가 flex일 때 뷰포트 박스를 강제로 채움 (사용자 sizing 설정 무관)
  const isRoot = depth === 0 && parentIsFlexContainer;
  const rootFill: React.CSSProperties = isRoot
    ? { flex: 1, minHeight: 0, width: "100%", height: "100%" }
    : {};

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
      <div style={{ ...sizing, ...parentFit, ...rootFill, ...stateStyle, display: "flex", flexDirection: "column" }} {...handlerProps}>
        <PreviewRenderer
          node={mod.root}
          ctx={ctx}
          visitedModuleIds={nextVisited}
          depth={depth + 1}
          parentIsFlexContainer
          parentDirection="column"
        />
      </div>
    );
  }

  // container / foldable
  if (node.kind === "container" || node.kind === "foldable") {
    const p = node.props as ContainerProps & FoldableProps;
    const open = node.kind !== "foldable" || localOpen;
    const rgbStr = depth === 0 ? t.surfaceRGBStr : t.surfaceRGBStr2;
    const bg =
      p.backgroundOpacity !== undefined
        ? `rgba(${rgbStr},${p.backgroundOpacity / 100})`
        : depth === 0
          ? t.surfaceBg
          : t.surfaceBg2;
    const rawDir = p.direction ?? "column";
    const innerDir: ParentFlexDirection =
      rawDir === "grid" ? "grid" : rawDir === "row" ? "row" : "column";
    return (
      <div
        style={{
          ...containerLayoutStyle(p),
          ...sizing,
          ...parentFit,
          ...stateStyle,
          background: bg,
          ...rootFill,
        }}
        {...handlerProps}
      >
        {node.kind === "foldable" && (
          <div
            onClick={(e) => { e.stopPropagation(); setLocalOpen((v) => !v); }}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              borderBottom: `1px solid ${t.borderColor}`,
              padding: "6px 12px",
              fontSize: 13, fontWeight: 500, color: t.textSecondary,
              cursor: "pointer", userSelect: "none",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open && (
          node.kind === "foldable" ? (
            <div style={{ paddingLeft: 16, display: "flex", flexDirection: "column", gap: p.gap ?? 8 }}>
              {node.children?.map((c) => (
                <PreviewRenderer
                  key={c.id}
                  node={c}
                  ctx={ctx}
                  visitedModuleIds={visitedModuleIds}
                  depth={depth + 1}
                  parentDirection={innerDir}
                  parentIsFlexContainer
                />
              ))}
            </div>
          ) : (
            node.children?.map((c) => (
              <PreviewRenderer
                key={c.id}
                node={c}
                ctx={ctx}
                visitedModuleIds={visitedModuleIds}
                depth={depth + 1}
                parentDirection={innerDir}
                parentIsFlexContainer
              />
            ))
          )
        )}
      </div>
    );
  }

  // Input: wrapper 자체를 flex 컨테이너로 만들어 inline/stacked 모드와 고정 폭을 정확히 적용
  if (node.kind === "input") {
    const p = node.props as InputProps;
    const inputBaseStyle: React.CSSProperties = {
      borderRadius: 6,
      border: `1px solid ${t.inputBorder}`,
      backgroundColor: t.inputBg,
      color: t.textPrimary,
      padding: "6px 10px",
      fontSize: 14,
      outline: "none",
      boxSizing: "border-box",
      minWidth: 0,
    };
    if (p.inline) {
      const lw = p.labelWidth ?? 30;
      return (
        <div
          style={{ display: "flex", alignItems: "center", gap: 8, ...sizing, ...parentFit, ...stateStyle }}
          {...handlerProps}
        >
          {p.label && (
            <label style={{ fontSize: 14, color: t.textSecondary, flexShrink: 0, width: `${lw}%` }}>
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
      );
    }
    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: 4, ...sizing, ...parentFit, ...stateStyle }}
        {...handlerProps}
      >
        {p.label && (
          <label style={{ fontSize: 12, color: t.textSecondary }}>{p.label}</label>
        )}
        <input
          type={p.type ?? "text"}
          placeholder={p.placeholder}
          defaultValue={p.value}
          style={{ ...inputBaseStyle, width: "100%" }}
        />
      </div>
    );
  }

  // leaf nodes
  const leaf = (() => {
    // registry에 Leaf가 등록된 kind는 descriptor 경로 우선 사용 (점진 이관)
    const desc = getDescriptor(node.kind);
    if (desc?.Leaf) {
      const Leaf = desc.Leaf;
      return <Leaf node={node} mode="preview" theme={t} />;
    }
    switch (node.kind) {
      case "button": {
        const p = node.props as ButtonProps;
        // 탭 그룹: 활성/비활성 상태에 따라 effective variant 결정
        const isTabGroup = !!p.tabGroupId;
        const isTabActive = isTabGroup
          ? ctx.tabActiveMap[p.tabGroupId!] === node.id
          : true;
        const effectiveVariant = isTabGroup
          ? (isTabActive ? (p.variant ?? "primary") : (p.tabInactiveVariant ?? "ghost"))
          : (p.variant ?? "primary");
        const variantStyle: React.CSSProperties = (() => {
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
        const sizeStyle: React.CSSProperties = {
          sm: { padding: "4px 8px", fontSize: 12 },
          md: { padding: "6px 12px", fontSize: 14 },
          lg: { padding: "8px 16px", fontSize: 16 },
        }[p.size ?? "md"] ?? { padding: "6px 12px", fontSize: 14 };
        const Icon = getLucideIcon(p.iconName);
        const pos = p.iconPosition ?? "left";
        const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"] ?? 14;
        // fixed size가 있으면 버튼 요소 자체에 적용
        const btnSizeStyle: React.CSSProperties = {
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
              display: "inline-flex", alignItems: "center",
              justifyContent: btnJustify, gap: 6,
              borderRadius: 6, fontWeight: 500, cursor: "pointer",
              border: "none", transition: "filter 0.12s",
              filter: hover ? "brightness(1.15)" : undefined,
              opacity: isTabGroup && !isTabActive ? 0.6 : undefined,
              ...variantStyle, ...sizeStyle, ...btnSizeStyle,
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
  })();

  return (
    <div style={{ ...sizing, ...parentFit, ...stateStyle }} {...handlerProps}>
      {leaf}
    </div>
  );
}
