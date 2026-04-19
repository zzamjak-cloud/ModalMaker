// 저장된 문서 목록 팝업
// - ↑/↓ 화살표로 선택 이동, Enter로 로드
// - Esc / 외곽 클릭으로 닫기
// - 각 아이템 우측에 연필 아이콘 → 인라인 이름 변경 (Enter 확정 / Esc 취소)
import { useEffect, useRef, useState } from "react";
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
  const [selectedIdx, setSelectedIdx] = useState(() => (docs.length > 0 ? 0 : -1));
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // docs가 줄어들면 selectedIdx 보정
  useEffect(() => {
    if (docs.length === 0) {
      setSelectedIdx(-1);
      return;
    }
    if (selectedIdx >= docs.length) setSelectedIdx(docs.length - 1);
    if (selectedIdx < 0 && docs.length > 0) setSelectedIdx(0);
  }, [docs.length, selectedIdx]);

  // 전역 keydown — ↑/↓/Enter/Esc (편집 모드일 땐 하위 input이 우선 처리)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return; // 이름 편집 중엔 input onKeyDown이 처리
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (docs.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(docs.length - 1, (i < 0 ? -1 : i) + 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(0, (i < 0 ? docs.length : i) - 1));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        if (selectedIdx >= 0 && selectedIdx < docs.length) {
          onLoad(docs[selectedIdx]);
        }
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [docs, selectedIdx, editingId, onClose, onLoad]);

  // 선택된 항목을 스크롤 영역에 보이도록
  useEffect(() => {
    if (selectedIdx < 0) return;
    const id = docs[selectedIdx]?.id;
    if (!id) return;
    const el = itemRefs.current.get(id);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, docs]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-[min(560px,92vw)] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
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
            docs.map((d, i) => {
              const editing = editingId === d.id;
              const selected = !editing && i === selectedIdx;
              return (
                <div
                  key={d.id}
                  ref={(el) => {
                    if (el) itemRefs.current.set(d.id, el);
                    else itemRefs.current.delete(d.id);
                  }}
                  className={cn(
                    "group flex items-center gap-2 border-b border-neutral-900 px-4 py-3 text-sm",
                    !editing && (selected ? "bg-sky-500/10" : "hover:bg-neutral-900"),
                  )}
                  onMouseEnter={() => {
                    if (!editing) setSelectedIdx(i);
                  }}
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
                            e.stopPropagation(); // 다이얼로그 닫힘 방지
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
                        <div className={cn("font-medium", selected ? "text-sky-100" : "text-neutral-100")}>
                          {d.title}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {new Date(d.updatedAt).toLocaleString("ko-KR")}
                        </div>
                      </button>
                      <button
                        onClick={() => startEdit(d)}
                        title="이름 변경"
                        className={cn(
                          "rounded-md p-1.5 text-neutral-500 transition hover:bg-neutral-800 hover:text-neutral-200",
                          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        )}
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
