// 저장된 문서 목록에서 하나를 선택해 로드
// 각 아이템 우측에 연필 아이콘 → 인라인 이름 변경 (Enter 확정 / Esc 취소)
import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NodeDocument } from "@/types/layout";

export function LoadDialog({
  docs,
  onClose,
  onLoad,
  onRename,
}: {
  docs: NodeDocument[];
  onClose: () => void;
  onLoad: (d: NodeDocument) => void;
  onRename: (id: string, newTitle: string) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function startEdit(d: NodeDocument) {
    setEditingId(d.id);
    setDraft(d.title);
  }

  function commit(d: NodeDocument) {
    const next = draft.trim();
    if (next && next !== d.title) onRename(d.id, next);
    setEditingId(null);
  }

  function cancel() {
    setEditingId(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[min(560px,92vw)] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="text-sm font-semibold">저장된 문서</div>
          <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {docs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-500">
              저장된 문서가 없습니다.
            </div>
          ) : (
            docs.map((d) => {
              const editing = editingId === d.id;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "group flex items-center gap-2 border-b border-neutral-900 px-4 py-3 text-sm",
                    !editing && "hover:bg-neutral-900",
                  )}
                >
                  {editing ? (
                    <>
                      <input
                        autoFocus
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commit(d);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancel();
                          }
                        }}
                        className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
                      />
                      <button
                        onClick={() => commit(d)}
                        title="확정 (Enter)"
                        className="rounded-md border border-neutral-700 bg-neutral-900 p-1.5 text-sky-300 hover:bg-neutral-800"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={cancel}
                        title="취소 (Esc)"
                        className="rounded-md border border-neutral-700 bg-neutral-900 p-1.5 text-neutral-400 hover:bg-neutral-800"
                      >
                        <X size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => onLoad(d)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium text-neutral-100">{d.title}</div>
                        <div className="text-xs text-neutral-500">
                          {new Date(d.updatedAt).toLocaleString("ko-KR")}
                        </div>
                      </button>
                      <button
                        onClick={() => startEdit(d)}
                        title="이름 변경"
                        className="rounded-md p-1.5 text-neutral-500 opacity-0 transition hover:bg-neutral-800 hover:text-neutral-200 group-hover:opacity-100"
                      >
                        <Pencil size={14} />
                      </button>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
