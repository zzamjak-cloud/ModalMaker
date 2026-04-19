// 좌측 컴포넌트 팔레트 — 2컬럼 그리드, 컴팩트 아이템
// registry에 등록된 kind는 descriptor에서 메타를 가져오고,
// 아직 이관되지 않은 kind는 로컬 LEGACY_ITEMS에서 보충한다 (점진 이관 중).
import { useDraggable } from "@dnd-kit/core";
import {
  Box,
  CheckSquare,
  ChevronsUpDown,
  Loader,
  Minus,
  MousePointerClick,
  Sparkles,
  TextCursorInput,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { NodeKind } from "@/types/layout";
import { getDescriptor } from "@/nodes/registry";

interface PaletteItem {
  kind: NodeKind;
  label: string;
  Icon: LucideIcon;
}

/** registry 이관 전까지 사용할 팔레트 메타 */
const LEGACY_ORDER: PaletteItem[] = [
  { kind: "container", label: "Container", Icon: Box },
  { kind: "foldable", label: "Foldable", Icon: ChevronsUpDown },
  { kind: "button", label: "Button", Icon: MousePointerClick },
  { kind: "input", label: "Input", Icon: TextCursorInput },
  { kind: "checkbox", label: "Checkbox", Icon: CheckSquare },
  { kind: "icon", label: "Icon", Icon: Sparkles },
  { kind: "progress", label: "Progress", Icon: Loader },
  { kind: "split", label: "Split", Icon: Minus },
];

// registry + legacy 병합 — registry에 있으면 우선, 순서는 LEGACY_ORDER + registry 추가분
function buildItems(): PaletteItem[] {
  const out: PaletteItem[] = [];
  // registry에 이관된 kind를 Container/Foldable 뒤·나머지 legacy 사이에 삽입하려면 순서 고민 필요 —
  // 현재 단계에서는 LEGACY_ORDER의 위치대로 나열하고, registry에 이관된 kind는 그 위치를 대체.
  const registryOrder: NodeKind[] = [
    "container", "foldable", "text", "button", "input", "checkbox", "icon", "progress", "split",
  ];
  for (const kind of registryOrder) {
    const desc = getDescriptor(kind);
    if (desc && desc.inPalette) {
      out.push({ kind: desc.kind, label: desc.label, Icon: desc.icon });
      continue;
    }
    const legacy = LEGACY_ORDER.find((l) => l.kind === kind);
    if (legacy) out.push(legacy);
  }
  return out;
}

export function Palette() {
  const items = buildItems();
  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Components
      </div>
      <div className="grid grid-cols-2 gap-1">
        {items.map((item) => (
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
