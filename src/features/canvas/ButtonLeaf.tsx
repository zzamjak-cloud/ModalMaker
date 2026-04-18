// 인라인 편집 가능한 Button 리프
// - 더블 클릭으로 편집 모드 진입
// - Enter(shift 없이) / blur로 커밋, Escape으로 취소
// - 편집 중에는 드래그/선택 방해 방지를 위해 이벤트 stopPropagation
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ButtonProps, LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { getLucideIcon } from "./lucideLookup";

export function ButtonLeaf({
  node,
  editing,
  setEditing,
}: {
  node: LayoutNode;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const p = node.props as ButtonProps;
  const updateProps = useLayoutStore((s) => s.updateProps);
  const [draft, setDraft] = useState(p.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(p.label);
  }, [p.label, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const variantClass = {
    primary: "bg-sky-500 text-white hover:bg-sky-400",
    secondary: "bg-neutral-700 text-neutral-100 hover:bg-neutral-600",
    destructive: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "bg-transparent text-neutral-300 border border-neutral-700 hover:bg-neutral-800",
  }[p.variant ?? "primary"];
  const sizeClass = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }[p.size ?? "md"];

  if (editing) {
    const commit = () => {
      updateProps(node.id, { label: draft });
      setEditing(false);
    };
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(p.label);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "rounded-md font-medium outline-none ring-2 ring-sky-500",
          variantClass,
          sizeClass,
        )}
      />
    );
  }

  const Icon = getLucideIcon(p.iconName);
  const pos = p.iconPosition ?? "left";
  const iconPx = { sm: 12, md: 14, lg: 16 }[p.size ?? "md"];

  return (
    <button
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn("inline-flex items-center gap-1.5 rounded-md font-medium transition", variantClass, sizeClass)}
      title="더블 클릭하여 편집"
    >
      {Icon && pos === "left" && <Icon size={iconPx} />}
      <span>{p.label}</span>
      {Icon && pos === "right" && <Icon size={iconPx} />}
    </button>
  );
}
