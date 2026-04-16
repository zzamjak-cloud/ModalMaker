// 컨테이너 내부의 드롭 영역
// "empty" 변형: 자식이 없을 때 표시되는 안내 박스
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/cn";

interface Props {
  containerId: string;
  variant?: "empty" | "gap";
}

export function DropZone({ containerId, variant = "gap" }: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: `drop-${containerId}`,
    data: { containerId },
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center justify-center rounded border-2 border-dashed text-xs transition",
        variant === "empty"
          ? "min-h-[72px] border-neutral-700 px-3 py-2 text-neutral-500"
          : "h-2 border-transparent",
        isOver && "border-sky-400 bg-sky-500/10 text-sky-300",
      )}
    >
      {variant === "empty" && (isOver ? "여기에 놓아주세요" : "여기에 컴포넌트를 드래그하세요")}
    </div>
  );
}
