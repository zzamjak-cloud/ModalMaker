// 컨테이너 내부의 드롭 영역
// - "empty": 자식이 없을 때 중앙에 표시되는 안내 박스
// - "gap":  자식들 사이/앞/뒤에 배치되어 특정 index로 삽입할 수 있게 함
//           부모 direction(row|column|grid)에 맞춰 얇은 수직/수평 막대로 표시
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { cn } from "@/lib/cn";

interface Props {
  containerId: string;
  variant?: "empty" | "gap";
  index?: number;
  direction?: "row" | "column" | "grid";
}

export function DropZone({ containerId, variant = "gap", index, direction = "column" }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${containerId}-${index ?? "empty"}`,
    data: { containerId, index },
  });

  if (variant === "empty") {
    return (
      <div
        ref={setNodeRef}
        className={cn(
          "flex min-h-[72px] items-center justify-center rounded border-2 border-dashed px-3 py-2 text-xs transition",
          isOver
            ? "border-sky-400 bg-sky-500/10 text-sky-300"
            : "border-neutral-700 text-neutral-500",
        )}
      >
        {isOver ? "여기에 놓아주세요" : "여기에 컴포넌트를 드래그하세요"}
      </div>
    );
  }

  // 드래그 중이 아닐 때는 크기를 0으로 줄여 편집기 갭/패딩이 프리뷰와 일치하도록 한다
  const { active } = useDndContext();
  const isDragging = !!active;

  const isRow = direction === "row";
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded transition-all",
        isRow ? "self-stretch" : "w-full",
        isRow
          ? isOver
            ? "w-2 bg-sky-500"
            : isDragging
              ? "w-1 bg-neutral-700/40"
              : "w-0 overflow-hidden"
          : isOver
            ? "h-2 bg-sky-500"
            : isDragging
              ? "h-1 bg-neutral-700/40"
              : "h-0 overflow-hidden",
      )}
    />
  );
}
