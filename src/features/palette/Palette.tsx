// 좌측 컴포넌트 팔레트 — 2컬럼 그리드, 컴팩트 아이템
import { useDraggable } from "@dnd-kit/core";
import {
  Box,
  CheckSquare,
  ChevronsUpDown,
  Loader,
  Minus,
  MousePointerClick,
  Sparkles,
  Type,
  TextCursorInput,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { NodeKind } from "@/types/layout";

interface PaletteItem {
  kind: NodeKind;
  label: string;
  Icon: typeof Box;
}

const ITEMS: PaletteItem[] = [
  { kind: "container", label: "Container", Icon: Box },
  { kind: "foldable", label: "Foldable", Icon: ChevronsUpDown },
  { kind: "text", label: "Text", Icon: Type },
  { kind: "button", label: "Button", Icon: MousePointerClick },
  { kind: "input", label: "Input", Icon: TextCursorInput },
  { kind: "checkbox", label: "Checkbox", Icon: CheckSquare },
  { kind: "icon", label: "Icon", Icon: Sparkles },
  { kind: "progress", label: "Progress", Icon: Loader },
  { kind: "split", label: "Split", Icon: Minus },
];

export function Palette() {
  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Components
      </div>
      <div className="grid grid-cols-2 gap-1">
        {ITEMS.map((item) => (
          <PaletteButton key={item.kind} item={item} />
        ))}
      </div>
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
        "flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-left transition",
        "hover:border-sky-500/60 hover:bg-neutral-900 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50",
      )}
    >
      <item.Icon size={13} className="shrink-0 text-neutral-400" />
      <span className="truncate text-xs text-neutral-200">{item.label}</span>
    </button>
  );
}
