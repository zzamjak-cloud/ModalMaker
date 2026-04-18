// 재귀 노드 렌더러
// 한 함수가 모든 NodeKind의 시각적 표현 + 중첩 children을 처리한다.
// 컨테이너(container/foldable)는 내부 DropZone을 열어 드롭 대상이 된다.
// 자식이 있을 때는 "자식 사이" 및 앞/뒤에 gap DropZone을 삽입해 원하는 index에 배치 가능.
// Text 노드는 더블 클릭으로 인라인 편집이 가능하며, 편집 중에는 드래그가 비활성화된다.
import { Fragment, useEffect, useRef, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { isContainerKind, type LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";
import { DropZone } from "./DropZone";
import { ButtonLeaf } from "./ButtonLeaf";
import { applySizing } from "./applySizing";
import { getLucideIcon } from "./lucideLookup";
import {
  CheckboxProps,
  ContainerProps,
  FoldableProps,
  IconProps,
  InputProps,
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
  // Container 자체 경계선
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}

export function NodeRenderer({ node, depth = 0 }: { node: LayoutNode; depth?: number }) {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const select = useLayoutStore((s) => s.select);

  // 리프 인라인 편집 상태 (Text/Button 공유) - 활성 시 드래그 비활성
  const [editingLeaf, setEditingLeaf] = useState(false);

  const isSelected = selectedId === node.id;

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0 || editingLeaf, // 루트/편집 중은 드래그 금지
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
          <div style={{ ...containerStyle(p), ...applySizing(node) }}>
            {node.children?.length ? (
              <>
                <DropZone
                  containerId={node.id}
                  index={0}
                  direction={p.direction ?? "column"}
                />
                {node.children.map((c, i) => (
                  <Fragment key={c.id}>
                    <NodeRenderer node={c} depth={depth + 1} />
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
      style={applySizing(node)}
    >
      {renderLeaf(node, editingLeaf, setEditingLeaf)}
    </div>
  );
}

function renderLeaf(
  node: LayoutNode,
  editing: boolean,
  setEditing: (v: boolean) => void,
): React.ReactNode {
  switch (node.kind) {
    case "text":
      return <TextLeaf node={node} editing={editing} setEditing={setEditing} />;
    case "button":
      return <ButtonLeaf node={node} editing={editing} setEditing={setEditing} />;
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
    case "split": {
      const p = node.props as SplitProps;
      const orientation = p.orientation ?? "horizontal";
      const style = p.style ?? "solid";
      const thickness = p.thickness ?? 1;
      const color = p.color ?? "#525252"; // neutral-600
      if (orientation === "vertical") {
        return (
          <div
            aria-label="split"
            style={{
              borderLeftWidth: thickness,
              borderLeftStyle: style,
              borderLeftColor: color,
              minHeight: 24,
              alignSelf: "stretch",
            }}
          />
        );
      }
      return (
        <div
          aria-label="split"
          style={{
            borderTopWidth: thickness,
            borderTopStyle: style,
            borderTopColor: color,
            width: "100%",
          }}
        />
      );
    }
    case "icon": {
      const p = node.props as IconProps;
      const Comp = getLucideIcon(p.name);
      if (!Comp) {
        return <span className="text-xs text-neutral-500">?{p.name ?? ""}</span>;
      }
      return <Comp size={p.size ?? 20} color={p.color ?? "currentColor"} />;
    }
    default:
      return null;
  }
}

// 인라인 편집 가능한 Text 리프
// - 더블 클릭 또는 F2 키로 편집 모드 진입
// - Enter(shift 없이) / blur로 커밋, Escape으로 취소
// - 포인터 이벤트는 stopPropagation으로 드래그 방해 방지
function TextLeaf({
  node,
  editing,
  setEditing,
}: {
  node: LayoutNode;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const p = node.props as TextProps;
  const updateProps = useLayoutStore((s) => s.updateProps);
  const [draft, setDraft] = useState(p.text);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // prop.text가 외부에서 변경되면 draft 동기화 (편집 중이 아닐 때만)
    if (!editing) setDraft(p.text);
  }, [p.text, editing]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editing]);

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

  if (editing) {
    const commit = () => {
      updateProps(node.id, { text: draft });
      setEditing(false);
    };
    return (
      <textarea
        ref={ref}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(p.text);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        rows={Math.max(1, draft.split("\n").length)}
        className={cn(
          size,
          weight,
          "w-full resize-none rounded border border-sky-500 bg-neutral-950 px-1.5 py-0.5 text-neutral-100 outline-none",
        )}
        style={{ color: p.color }}
      />
    );
  }

  const fixed = !!node.sizing?.fixedSize;
  if (fixed) {
    return (
      <div
        className={cn(size, weight, "cursor-text text-neutral-100 select-text")}
        style={{
          color: p.color,
          width: node.sizing?.width,
          height: node.sizing?.height,
          overflow: "hidden",
        }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); setEditing(true); } }}
        tabIndex={0}
        title="더블 클릭하여 편집"
      >
        {p.text || "Text"}
      </div>
    );
  }
  return (
    <span
      className={cn(size, weight, "cursor-text text-neutral-100 select-text")}
      style={{ color: p.color }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "F2") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      tabIndex={0}
      title="더블 클릭하여 편집"
    >
      {p.text || "Text"}
    </span>
  );
}
