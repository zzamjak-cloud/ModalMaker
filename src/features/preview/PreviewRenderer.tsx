// 프리뷰용 재귀 렌더러 — 편집 기능 제거 + 인터렉션 이벤트 부착.
// 기본 시각 표현은 NodeRenderer와 일치시키되 최소 구현을 유지.
import { useState, useMemo } from "react";
import { cn } from "@/lib/cn";
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import { applySizing } from "@/features/canvas/applySizing";
import { useLayoutStore } from "@/stores/layoutStore";
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

function containerStyle(p: ContainerProps): React.CSSProperties {
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
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}

export function PreviewRenderer({
  node,
  ctx,
  visitedModuleIds,
}: {
  node: LayoutNode;
  ctx: PreviewContext;
  visitedModuleIds?: Set<string>;
}) {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const disabled = hasDisabledBehavior(node.interactions);

  const stateStyle = useMemo(
    () => styleForState(node.interactions, { hover, pressed, disabled }),
    [node.interactions, hover, pressed, disabled],
  );

  const onClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation(); // 레이어 뎁스 우선순위: 상위로 전파 X
    runActions(node.interactions ?? [], "click", ctx);
  };
  const onMouseEnter = () => {
    if (disabled) return;
    setHover(true);
    runActions(node.interactions ?? [], "hover", ctx);
  };
  const onMouseLeave = () => {
    setHover(false);
    setPressed(false);
  };
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
    if (!mod) return <span className="text-xs text-rose-400">[모듈 없음]</span>;
    if (isCircular) return <span className="text-xs text-amber-400">↻ 순환</span>;
    return (
      <div style={{ ...sizing, ...stateStyle }} {...handlerProps}>
        <PreviewRenderer node={mod.root} ctx={ctx} visitedModuleIds={nextVisited} />
      </div>
    );
  }

  // container / foldable
  if (node.kind === "container" || node.kind === "foldable") {
    const p = node.props as ContainerProps & FoldableProps;
    const open = node.kind !== "foldable" || p.open !== false;
    return (
      <div style={{ ...containerStyle(p), ...sizing, ...stateStyle }} {...handlerProps}>
        {node.kind === "foldable" && (
          <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
            <span>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open &&
          node.children?.map((c) => (
            <PreviewRenderer key={c.id} node={c} ctx={ctx} visitedModuleIds={visitedModuleIds} />
          ))}
      </div>
    );
  }

  // leaf nodes
  const leaf = (() => {
    switch (node.kind) {
      case "text": {
        const p = node.props as TextProps;
        const size = { sm: "text-xs", md: "text-sm", lg: "text-base", xl: "text-lg", "2xl": "text-2xl" }[p.size ?? "md"];
        const weight = { normal: "font-normal", medium: "font-medium", bold: "font-bold" }[p.weight ?? "normal"];
        return (
          <span className={cn(size, weight, "text-neutral-100")} style={{ color: p.color }}>
            {p.text || "Text"}
          </span>
        );
      }
      case "button": {
        const p = node.props as ButtonProps;
        const variantClass = {
          primary: "bg-sky-500 text-white hover:bg-sky-400",
          secondary: "bg-neutral-700 text-neutral-100 hover:bg-neutral-600",
          destructive: "bg-rose-600 text-white hover:bg-rose-500",
          ghost: "bg-transparent text-neutral-300 border border-neutral-700 hover:bg-neutral-800",
        }[p.variant ?? "primary"];
        const sizeClass = { sm: "px-2 py-1 text-xs", md: "px-3 py-1.5 text-sm", lg: "px-4 py-2 text-base" }[p.size ?? "md"];
        const Icon = getLucideIcon(p.iconName);
        const pos = p.iconPosition ?? "left";
        const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"];
        return (
          <button type="button" className={cn("inline-flex items-center gap-1.5 rounded-md font-medium transition", variantClass, sizeClass)}>
            {Icon && pos === "left" && <Icon size={iconPx} />}
            <span>{p.label}</span>
            {Icon && pos === "right" && <Icon size={iconPx} />}
          </button>
        );
      }
      case "input": {
        const p = node.props as InputProps;
        return (
          <div className="flex flex-col gap-1">
            {p.label && <label className="text-xs text-neutral-400">{p.label}</label>}
            <input
              type={p.type ?? "text"}
              placeholder={p.placeholder}
              defaultValue={p.value}
              className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>
        );
      }
      case "checkbox": {
        const p = node.props as CheckboxProps;
        return (
          <label className="flex items-center gap-2 text-sm text-neutral-200">
            <input type="checkbox" defaultChecked={p.checked ?? false} className="h-4 w-4 accent-sky-500" />
            {p.label}
          </label>
        );
      }
      case "progress": {
        const p = node.props as ProgressProps;
        const pct = Math.max(0, Math.min(100, ((p.value ?? 0) / (p.max ?? 100)) * 100));
        return (
          <div className="w-full">
            {p.label && <div className="mb-1 text-xs text-neutral-400">{p.label}</div>}
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-800">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      }
      case "split": {
        const p = node.props as SplitProps;
        const orientation = p.orientation ?? "horizontal";
        const style = p.style ?? "solid";
        const thickness = p.thickness ?? 1;
        const color = p.color ?? "#525252";
        if (orientation === "vertical") {
          return (
            <div style={{ borderLeftWidth: thickness, borderLeftStyle: style, borderLeftColor: color, minHeight: 24, alignSelf: "stretch" }} />
          );
        }
        return (
          <div style={{ borderTopWidth: thickness, borderTopStyle: style, borderTopColor: color, width: "100%" }} />
        );
      }
      case "icon": {
        const p = node.props as IconProps;
        const Comp = getLucideIcon(p.name);
        if (!Comp) return <span className="text-xs text-neutral-500">?</span>;
        return <Comp size={p.size ?? 20} color={p.color ?? "currentColor"} />;
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
