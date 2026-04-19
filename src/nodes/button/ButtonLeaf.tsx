// Button — 캔버스·프리뷰 공용 리프 (탭 그룹·테마·인터랙션은 프리뷰에서만 활성)
import { memo, type CSSProperties } from "react";
import { cn } from "@/lib/cn";
import type { LeafRenderProps } from "../types";
import type { ButtonProps } from "@/types/layout";
import { getLucideIcon } from "@/features/canvas/lucideLookup";
import { applySizing } from "@/features/canvas/applySizing";
import { normalizeSizing } from "@/lib/layoutSizing";
import { runActions } from "@/features/preview/previewRuntime";

function ButtonLeafImpl({ node, mode, theme, previewCtx, hover }: LeafRenderProps) {
  const p = node.props as ButtonProps;

  if (mode === "canvas") {
    const variantClass = ({
      primary: "bg-sky-500 text-white",
      secondary: "bg-neutral-700 text-neutral-100",
      destructive: "bg-rose-600 text-white",
      ghost: "bg-transparent text-neutral-300 border border-neutral-700",
      plain: "bg-transparent text-neutral-300",
    } as Record<string, string>)[p.variant ?? "primary"] ?? "bg-sky-500 text-white";

    const sizeClass = {
      sm: "px-2 py-1 text-xs",
      md: "px-3 py-1.5 text-sm",
      lg: "px-4 py-2 text-base",
    }[p.size ?? "md"];

    const { widthFixed, heightFixed, width, height } = normalizeSizing(node.sizing);
    const fixedStyle: CSSProperties = {
      ...(widthFixed && width != null ? { width } : {}),
      ...(heightFixed && height != null ? { height } : {}),
    };

    const Icon = getLucideIcon(p.iconName);
    const pos = p.iconPosition ?? "left";
    const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"];

    const justifyContent = {
      left: "flex-start",
      center: "center",
      right: "flex-end",
    }[p.contentAlign ?? "center"];

    return (
      <div className="relative inline-flex">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md font-medium transition",
            variantClass,
            sizeClass,
          )}
          style={{ ...fixedStyle, justifyContent }}
        >
          {Icon && pos === "left" && <Icon size={iconPx} />}
          <span>{p.label}</span>
          {Icon && pos === "right" && <Icon size={iconPx} />}
        </button>
        {p.tabGroupId && (
          <span
            className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white"
            title={`탭 그룹: ${p.tabGroupId}`}
          >
            T
          </span>
        )}
      </div>
    );
  }

  const t = theme!;
  const ctx = previewCtx!;
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

export const ButtonLeaf = memo(ButtonLeafImpl, (a, b) => {
  return (
    a.node === b.node &&
    a.mode === b.mode &&
    a.hover === b.hover &&
    a.theme === b.theme &&
    a.previewCtx === b.previewCtx
  );
});
