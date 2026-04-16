// 재귀 노드 렌더러
// 한 함수가 모든 NodeKind의 시각적 표현 + 중첩 children을 처리한다.
// 컨테이너(container/foldable)는 내부 DropZone을 열어 드롭 대상이 된다.
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { isContainerKind, type LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { DropZone } from "./DropZone";
import {
  ButtonProps,
  CheckboxProps,
  ContainerProps,
  FoldableProps,
  InputProps,
  ProgressProps,
  TextProps,
} from "@/types/layout";

function containerStyle(p: ContainerProps): React.CSSProperties {
  const isGrid = p.direction === "grid";
  return {
    display: isGrid ? "grid" : "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    gridTemplateColumns: isGrid ? `repeat(${p.columns ?? 2}, minmax(0,1fr))` : undefined,
    gap: p.gap ?? 8,
    padding: p.padding ?? 12,
    alignItems: p.align,
    justifyContent: p.justify === "between" ? "space-between" : p.justify,
  };
}

export function NodeRenderer({ node, depth = 0 }: { node: LayoutNode; depth?: number }) {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const select = useLayoutStore((s) => s.select);

  const isSelected = selectedId === node.id;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0, // 루트는 드래그 불가
  });

  const outline = cn(
    "relative rounded-md border transition",
    isSelected
      ? "border-sky-500 ring-2 ring-sky-500/40"
      : "border-transparent hover:border-neutral-700",
    isDragging && "opacity-50",
  );

  const selectHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    select(node.id);
  };

  // Leaf 렌더링
  const content = renderLeaf(node);

  if (isContainerKind(node.kind)) {
    const p = node.props as ContainerProps & FoldableProps;
    const isFoldable = node.kind === "foldable";
    const open = !isFoldable || p.open !== false;
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={selectHandler}
        className={cn(outline, depth === 0 ? "min-w-[320px] bg-neutral-900/80" : "bg-neutral-900/40")}
      >
        {isFoldable && (
          <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-medium text-neutral-300">
            <span>{open ? "▾" : "▸"}</span>
            <span>{p.title ?? "Section"}</span>
          </div>
        )}
        {open && (
          <div style={containerStyle(p)}>
            {node.children?.length ? (
              node.children.map((c) => <NodeRenderer key={c.id} node={c} depth={depth + 1} />)
            ) : (
              <DropZone containerId={node.id} variant="empty" />
            )}
          </div>
        )}
        {depth === 0 && (
          <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
            Canvas
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
      className={cn(outline, "px-1 py-0.5")}
    >
      {content}
    </div>
  );
}

function renderLeaf(node: LayoutNode): React.ReactNode {
  switch (node.kind) {
    case "text": {
      const p = node.props as TextProps;
      const size = {
        sm: "text-xs",
        md: "text-sm",
        lg: "text-base",
        xl: "text-lg",
        "2xl": "text-2xl",
      }[p.size ?? "md"];
      const weight = {
        normal: "font-normal",
        medium: "font-medium",
        bold: "font-bold",
      }[p.weight ?? "normal"];
      return (
        <span className={cn(size, weight, "text-neutral-100")} style={{ color: p.color }}>
          {p.text || "Text"}
        </span>
      );
    }
    case "button": {
      const p = node.props as ButtonProps;
      const variant = {
        primary: "bg-sky-500 text-white hover:bg-sky-400",
        secondary: "bg-neutral-700 text-neutral-100 hover:bg-neutral-600",
        destructive: "bg-rose-600 text-white hover:bg-rose-500",
        ghost: "bg-transparent text-neutral-300 border border-neutral-700 hover:bg-neutral-800",
      }[p.variant ?? "primary"];
      const size = {
        sm: "px-2 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      }[p.size ?? "md"];
      return <button className={cn("rounded-md font-medium transition", variant, size)}>{p.label}</button>;
    }
    case "input": {
      const p = node.props as InputProps;
      return (
        <div className="flex flex-col gap-1">
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
    case "checkbox": {
      const p = node.props as CheckboxProps;
      return (
        <label className="flex items-center gap-2 text-sm text-neutral-200">
          <input type="checkbox" checked={p.checked ?? false} readOnly className="h-4 w-4 accent-sky-500" />
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
    default:
      return null;
  }
}
