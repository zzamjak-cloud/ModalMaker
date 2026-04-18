// 좌측 컴포넌트 팔레트
// 각 항목은 useDraggable로 드래그 소스가 되고, onDragEnd에서 addNewNode로 생성됨.
import { useDraggable } from "@dnd-kit/core";
import {
  Box,
  CheckSquare,
  ChevronsUpDown,
  LayoutGrid,
  Loader,
  Minus,
  MousePointerClick,
  Type,
  TextCursorInput,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { NodeKind } from "@/types/layout";

interface PaletteItem {
  kind: NodeKind;
  label: string;
  Icon: typeof Box;
  hint?: string;
}

const ITEMS: PaletteItem[] = [
  { kind: "container", label: "Container", Icon: Box, hint: "Row / Column / Grid" },
  { kind: "panel-layout", label: "Panel Layout", Icon: LayoutGrid, hint: "Header / Sides / Footer" },
  { kind: "foldable", label: "Foldable", Icon: ChevronsUpDown, hint: "접힘 섹션" },
  { kind: "text", label: "Text", Icon: Type, hint: "더블 클릭으로 편집" },
  { kind: "button", label: "Button", Icon: MousePointerClick },
  { kind: "input", label: "Input", Icon: TextCursorInput },
  { kind: "checkbox", label: "Checkbox", Icon: CheckSquare },
  { kind: "progress", label: "Progress", Icon: Loader },
  { kind: "split", label: "Split", Icon: Minus, hint: "실선 / 대시 / 점선" },
];

export function Palette() {
  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Components
      </div>
      {ITEMS.map((item) => (
        <PaletteButton key={item.kind} item={item} />
      ))}
    </div>
  );
}

function PaletteButton({ item }: { item: PaletteItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.kind}`,
    data: { source: "palette", kind: item.kind },
  });

  return (
    <button
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-left text-sm text-neutral-200 transition",
        "hover:border-sky-500/60 hover:bg-neutral-900 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <item.Icon size={16} className="text-neutral-400" />
      <div className="flex-1">
        <div className="text-sm">{item.label}</div>
        {item.hint && <div className="text-[10px] text-neutral-500">{item.hint}</div>}
      </div>
    </button>
  );
}
