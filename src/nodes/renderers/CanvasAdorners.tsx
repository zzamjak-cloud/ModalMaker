// 캔버스 전용: 선택 링·DnD·리사이즈 핸들
import { useDraggable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { ResizeHandles } from "@/features/canvas/ResizeHandles";

type CanvasDraggableFrameProps = {
  nodeId: string;
  /** depth===0 이면 루트 드래그 비활성 */
  depth: number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: React.MouseEventHandler;
  onDoubleClick?: React.MouseEventHandler;
  children: React.ReactNode;
  /** true면 이 프레임에 ResizeHandles 표시(리프·module-ref·컨테이너 inner) */
  showResizeHandles?: boolean;
};

/** 드래그·선택·(옵션) 리사이즈가 붙는 외곽 프레임 */
export function CanvasDraggableFrame({
  nodeId,
  depth,
  className,
  style,
  onClick,
  onDoubleClick,
  children,
  showResizeHandles = true,
}: CanvasDraggableFrameProps) {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const selectedIds = useLayoutStore((s) => s.selectedIds);
  const select = useLayoutStore((s) => s.select);
  const toggleSelectMulti = useLayoutStore((s) => s.toggleSelectMulti);
  const clearMultiSelect = useLayoutStore((s) => s.clearMultiSelect);

  const isSelected = selectedId === nodeId;
  const isInMultiSelect = selectedIds.includes(nodeId);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${nodeId}`,
    data: { source: "canvas", nodeId },
    disabled: depth === 0,
  });

  const outline = cn(
    "relative rounded-md transition",
    isSelected || isInMultiSelect
      ? "ring-2 ring-sky-500/80"
      : "hover:ring-1 hover:ring-neutral-600",
    isDragging && "opacity-50",
    className,
  );

  const selectHandler = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      toggleSelectMulti(nodeId);
    } else {
      clearMultiSelect();
      select(nodeId);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onClick ?? selectHandler}
      onDoubleClick={onDoubleClick}
      className={outline}
      style={style}
    >
      {showResizeHandles ? <ResizeHandles nodeId={nodeId} show={isSelected} /> : null}
      {children}
    </div>
  );
}

type CanvasContainerInnerChromeProps = {
  nodeId: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/** 컨테이너 내부 박스 — 드래그 없음, 리사이즈만 */
export function CanvasContainerInnerChrome({
  nodeId,
  className,
  style,
  children,
}: CanvasContainerInnerChromeProps) {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const isSelected = selectedId === nodeId;
  return (
    <div className={cn("relative min-h-0 min-w-0", className)} style={style}>
      <ResizeHandles nodeId={nodeId} show={isSelected} />
      {children}
    </div>
  );
}
