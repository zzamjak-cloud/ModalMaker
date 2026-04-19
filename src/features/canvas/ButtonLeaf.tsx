// Button 리프 렌더러 (캔버스 표시 전용)
import { cn } from "@/lib/cn";
import type { ButtonProps, LayoutNode } from "@/types/layout";
import { getLucideIcon } from "./lucideLookup";
import { normalizeSizing } from "@/lib/layoutSizing";

export function ButtonLeaf({ node }: { node: LayoutNode }) {
  const p = node.props as ButtonProps;

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
  const fixedStyle: React.CSSProperties = {
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
