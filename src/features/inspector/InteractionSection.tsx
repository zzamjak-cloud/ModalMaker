// 공용 Interaction 섹션 — 선택된 노드의 interactions 배열을 관리.
// 각 항목: event 선택 + action 타입 선택 + 액션별 파라미터 + 삭제.
// + 추가 버튼으로 기본 click+close 인터렉션 생성.
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { BUILTIN_STYLE_PRESETS } from "@/features/interactions/stylePresets";
import type { Interaction, InteractionAction, InteractionEvent, LayoutNode } from "@/types/layout";

const EVENT_LABELS: Record<InteractionEvent, string> = {
  click: "클릭",
  hover: "호버",
  press: "프레스",
  release: "릴리스",
  disabled: "비활성화",
};

type ActionType = InteractionAction["type"];
const ACTION_LABELS: Record<ActionType, string> = {
  navigate: "페이지 이동",
  close: "닫기",
  applyStyle: "스타일 적용",
};

function defaultAction(type: ActionType): InteractionAction {
  switch (type) {
    case "navigate":
      return { type: "navigate", targetPageId: "" };
    case "close":
      return { type: "close" };
    case "applyStyle":
      return { type: "applyStyle", stylePresetId: BUILTIN_STYLE_PRESETS[0].id };
  }
}

export function InteractionSection({ node }: { node: LayoutNode }) {
  const pages = useLayoutStore((s) => s.document.pages);
  const addInteraction = useLayoutStore((s) => s.addInteraction);
  const updateInteraction = useLayoutStore((s) => s.updateInteraction);
  const removeInteraction = useLayoutStore((s) => s.removeInteraction);

  const interactions = node.interactions ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Interactions</span>
        <button
          onClick={() => addInteraction(node.id, "click", { type: "close" })}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-0.5 text-[11px] text-neutral-200 hover:bg-neutral-800"
          title="새 인터렉션 추가 (기본: 클릭 → 닫기)"
        >
          <Plus size={11} />
          추가
        </button>
      </div>

      {interactions.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-800 px-2 py-2 text-[11px] text-neutral-500">
          등록된 인터렉션이 없습니다. <strong>+ 추가</strong>로 시작하세요.
        </div>
      ) : (
        interactions.map((it) => (
          <InteractionRow
            key={it.id}
            nodeId={node.id}
            it={it}
            pages={pages}
            onChange={(patch) => updateInteraction(node.id, it.id, patch)}
            onRemove={() => removeInteraction(node.id, it.id)}
          />
        ))
      )}
    </div>
  );
}

function InteractionRow({
  nodeId: _nodeId,
  it,
  pages,
  onChange,
  onRemove,
}: {
  nodeId: string;
  it: Interaction;
  pages: { id: string; title: string }[];
  onChange: (patch: Partial<Omit<Interaction, "id">>) => void;
  onRemove: () => void;
}) {
  const actionType = it.action.type;
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-neutral-800 bg-neutral-950/40 p-2">
      <div className="flex items-center gap-1.5">
        <select
          value={it.event}
          onChange={(e) => onChange({ event: e.target.value as InteractionEvent })}
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
        >
          {(Object.keys(EVENT_LABELS) as InteractionEvent[]).map((e) => (
            <option key={e} value={e}>
              {EVENT_LABELS[e]} ({e})
            </option>
          ))}
        </select>
        <span className="text-neutral-500">→</span>
        <select
          value={actionType}
          onChange={(e) => {
            const next = e.target.value as ActionType;
            onChange({ action: defaultAction(next) });
          }}
          className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
        >
          {(Object.keys(ACTION_LABELS) as ActionType[]).map((t) => (
            <option key={t} value={t}>
              {ACTION_LABELS[t]}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          className="rounded p-1 text-neutral-400 hover:bg-rose-950 hover:text-rose-200"
          title="삭제"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {actionType === "navigate" && (
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="w-14 shrink-0">대상 페이지</span>
          <select
            value={(it.action as { targetPageId: string }).targetPageId}
            onChange={(e) =>
              onChange({
                action: { type: "navigate", targetPageId: e.target.value },
              })
            }
            className={cn(
              "w-full rounded-md border px-1.5 py-1 text-xs focus:border-sky-500 focus:outline-none",
              (it.action as { targetPageId: string }).targetPageId
                ? "border-neutral-800 bg-neutral-950 text-neutral-100"
                : "border-rose-500/50 bg-neutral-950 text-rose-200",
            )}
          >
            <option value="">(선택하세요)</option>
            {pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
      )}

      {actionType === "applyStyle" && (
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <span className="w-14 shrink-0">스타일</span>
          <select
            value={(it.action as { stylePresetId: string }).stylePresetId}
            onChange={(e) =>
              onChange({
                action: { type: "applyStyle", stylePresetId: e.target.value },
              })
            }
            className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
          >
            {BUILTIN_STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}
