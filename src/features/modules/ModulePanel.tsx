// 모듈 패널 — 문서에 등록된 공용 모듈 목록과 조작 UI
// - 편집(enterModuleEdit), 드래그(Canvas drop → module-ref 삽입), 삭제
// - 이름은 더블클릭 인라인 편집
import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Edit3, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import type { Module } from "@/types/layout";
import { NodeRenderer } from "@/features/canvas/NodeRenderer";

export function ModulePanel() {
  const modules = useLayoutStore((s) => s.document.modules);
  const editingModuleId = useLayoutStore((s) => s.editingModuleId);

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Modules
      </div>
      {modules.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-800 bg-neutral-950/40 p-3 text-[11px] leading-relaxed text-neutral-500">
          컨테이너를 선택하고 <strong>Inspector의 '모듈로 등록'</strong>을 눌러
          공용 모듈을 만드세요.
        </div>
      ) : (
        modules.map((m) => (
          <ModuleCard key={m.id} module={m} isEditing={m.id === editingModuleId} />
        ))
      )}
    </div>
  );
}

function ModuleCard({ module: mod, isEditing }: { module: Module; isEditing: boolean }) {
  const enterModuleEdit = useLayoutStore((s) => s.enterModuleEdit);
  const removeModule = useLayoutStore((s) => s.removeModule);
  const updateModule = useLayoutStore((s) => s.updateModule);

  const [editingName, setEditingName] = useState(false);
  const [draft, setDraft] = useState(mod.name);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `module-${mod.id}`,
    data: { source: "module", moduleId: mod.id, moduleName: mod.name },
  });

  function commitName() {
    const next = draft.trim();
    if (next && next !== mod.name) updateModule(mod.id, { name: next });
    else setDraft(mod.name);
    setEditingName(false);
  }

  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border bg-neutral-950 transition",
        isEditing ? "border-sky-500/70" : "border-neutral-800 hover:border-neutral-700",
        isDragging && "opacity-50",
      )}
    >
      {/* 헤더 */}
      <div className="flex items-center gap-1 border-b border-neutral-800 px-2 py-1.5">
        <button
          ref={setNodeRef}
          {...listeners}
          {...attributes}
          className="flex cursor-grab items-center text-neutral-500 hover:text-neutral-200 active:cursor-grabbing"
          title="드래그해서 캔버스에 삽입"
        >
          <GripVertical size={12} />
        </button>
        {editingName ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitName();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setDraft(mod.name);
                setEditingName(false);
              }
            }}
            className="flex-1 rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
          />
        ) : (
          <button
            onDoubleClick={() => {
              setDraft(mod.name);
              setEditingName(true);
            }}
            className="flex-1 truncate text-left text-xs text-neutral-100"
            title="더블 클릭하여 이름 변경"
          >
            {mod.name}
          </button>
        )}
        <button
          onClick={() => enterModuleEdit(mod.id)}
          className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-sky-200"
          title="모듈 편집"
        >
          <Edit3 size={12} />
        </button>
        <button
          onClick={() => {
            if (
              confirm(
                `"${mod.name}" 모듈을 삭제할까요? 모든 사용처의 module-ref도 함께 제거됩니다.`,
              )
            ) {
              removeModule(mod.id);
            }
          }}
          className="rounded p-1 text-neutral-400 hover:bg-rose-950 hover:text-rose-200"
          title="모듈 삭제"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* 미니 프리뷰 */}
      <div className="pointer-events-none h-20 overflow-hidden bg-neutral-900/60 p-1">
        <div
          className="origin-top-left"
          style={{ transform: "scale(0.18)", width: `${100 / 0.18}%` }}
        >
          <NodeRenderer node={mod.root} depth={0} />
        </div>
      </div>
    </div>
  );
}
