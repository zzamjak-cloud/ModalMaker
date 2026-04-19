// 저장된 문서 로드 다이얼로그
// - 썸네일 카드 그리드 (Root 페이지 미니 렌더)
// - 상단 검색 필드 (제목 부분 일치)
// - 그룹 탭 (구조만 준비, 기본 "전체" 하나)
// - 페이지네이션 (페이지당 PAGE_SIZE개)
// - 카드 hover 시 연필(이름 변경) + 휴지통(삭제) 아이콘
// - 키보드: ↑/↓/←/→ 이동, Enter 로드, Esc 닫기 (편집/삭제 다이얼로그 열렸을 때 무시)
// - 외곽 클릭 시 닫기
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil,
  Check,
  X,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { NodeRenderer } from "@/features/canvas/NodeRenderer";
import { currentPage } from "@/stores/layoutStore";
import type { NodeDocument } from "@/types/layout";

/** 카드 그리드 컬럼 수 — ↑/↓ 이동 시 행 계산에 사용 */
const GRID_COLS = 3;
/** 페이지당 카드 수 — 추후 사용자 설정 가능하게 확장 */
const PAGE_SIZE = 9;

// ============================================================
// 그룹 구조 — 추후 문서 메타에 group 필드 도입 시 여기만 확장
// ============================================================
type LoadGroup = {
  id: string;
  name: string;
  filter: (doc: NodeDocument) => boolean;
};
const DEFAULT_GROUPS: LoadGroup[] = [
  { id: "all", name: "전체", filter: () => true },
  // 예: { id: "recent", name: "최근", filter: (d) => Date.now() - d.updatedAt < 7 * 86400_000 },
];

export function LoadDialog({
  docs,
  onClose,
  onLoad,
  onRename,
  onDelete,
}: {
  docs: NodeDocument[];
  onClose: () => void;
  onLoad: (d: NodeDocument) => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>(DEFAULT_GROUPS[0].id);
  const [page, setPage] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<NodeDocument | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 필터링 + 검색 + 그룹 적용
  const groupDef = DEFAULT_GROUPS.find((g) => g.id === activeGroup) ?? DEFAULT_GROUPS[0];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs
      .filter(groupDef.filter)
      .filter((d) => (q ? d.title.toLowerCase().includes(q) : true));
  }, [docs, groupDef, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageDocs = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // 필터/페이지 변경 시 selectedIdx 보정
  useEffect(() => {
    if (pageDocs.length === 0) setSelectedIdx(-1);
    else if (selectedIdx < 0 || selectedIdx >= pageDocs.length) setSelectedIdx(0);
  }, [pageDocs, selectedIdx]);

  // 검색어 변경 시 페이지 0으로
  useEffect(() => {
    setPage(0);
  }, [query, activeGroup]);

  // 현재 페이지 범위 벗어나면 클램프
  useEffect(() => {
    if (page >= totalPages) setPage(Math.max(0, totalPages - 1));
  }, [page, totalPages]);

  function startEdit(d: NodeDocument) {
    setEditingId(d.id);
    setDraft(d.title);
  }
  function commitEdit(d: NodeDocument) {
    const next = draft.trim();
    if (next && next !== d.title) onRename(d.id, next);
    setEditingId(null);
  }
  function cancelEdit() {
    setEditingId(null);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    onDelete(deleteTarget.id);
    setDeleteTarget(null);
  }

  // 키보드 네비게이션
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingId) return; // 이름 편집 중엔 input이 우선 처리
      if (deleteTarget) {
        if (e.key === "Escape") {
          e.preventDefault();
          setDeleteTarget(null);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      // 검색 input 포커스 중엔 화살표/Enter가 caret/폼 기본 동작과 충돌 — 탐색 스킵
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const inInput = tag === "input" || tag === "textarea";
      if (inInput) return;
      if (pageDocs.length === 0) return;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setSelectedIdx((i) => Math.min(pageDocs.length - 1, (i < 0 ? -1 : i) + 1));
          return;
        case "ArrowLeft":
          e.preventDefault();
          setSelectedIdx((i) => Math.max(0, (i < 0 ? pageDocs.length : i) - 1));
          return;
        case "ArrowDown":
          e.preventDefault();
          setSelectedIdx((i) => Math.min(pageDocs.length - 1, (i < 0 ? -1 : i) + GRID_COLS));
          return;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIdx((i) => Math.max(0, (i < 0 ? pageDocs.length : i) - GRID_COLS));
          return;
        case "Enter":
          e.preventDefault();
          if (selectedIdx >= 0 && selectedIdx < pageDocs.length) {
            onLoad(pageDocs[selectedIdx]);
          }
          return;
        case "PageDown":
          e.preventDefault();
          setPage((p) => Math.min(totalPages - 1, p + 1));
          return;
        case "PageUp":
          e.preventDefault();
          setPage((p) => Math.max(0, p - 1));
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, deleteTarget, pageDocs, selectedIdx, totalPages, onClose, onLoad]);

  // 선택된 항목 scroll into view
  useEffect(() => {
    if (selectedIdx < 0) return;
    const d = pageDocs[selectedIdx];
    if (!d) return;
    itemRefs.current.get(d.id)?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx, pageDocs]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-[min(960px,94vw)] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Load</div>
            <div className="text-base font-semibold">저장된 문서</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 hover:bg-neutral-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* 검색 + 그룹 */}
        <div className="flex items-center gap-3 border-b border-neutral-800 px-5 py-3">
          <div className="relative flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500"
            />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="제목 검색…"
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 py-1.5 pl-8 pr-3 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </div>
          {DEFAULT_GROUPS.length > 1 && (
            <div className="flex gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-0.5">
              {DEFAULT_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g.id)}
                  className={cn(
                    "rounded px-2 py-1 text-xs",
                    activeGroup === g.id
                      ? "bg-sky-500/20 text-sky-200"
                      : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
                  )}
                >
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 그리드 */}
        <div className="flex-1 overflow-y-auto p-5">
          {pageDocs.length === 0 ? (
            <div className="flex h-full items-center justify-center text-center text-sm text-neutral-500">
              {query ? "검색 결과가 없습니다." : "저장된 문서가 없습니다."}
            </div>
          ) : (
            <div
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${GRID_COLS}, minmax(0, 1fr))` }}
            >
              {pageDocs.map((d, i) => {
                const editing = editingId === d.id;
                const selected = !editing && i === selectedIdx;
                return (
                  <DocCard
                    key={d.id}
                    doc={d}
                    selected={selected}
                    editing={editing}
                    draft={draft}
                    onDraftChange={setDraft}
                    onHover={() => !editing && setSelectedIdx(i)}
                    onLoad={() => onLoad(d)}
                    onStartEdit={() => startEdit(d)}
                    onCommitEdit={() => commitEdit(d)}
                    onCancelEdit={cancelEdit}
                    onDelete={() => setDeleteTarget(d)}
                    registerRef={(el) => {
                      if (el) itemRefs.current.set(d.id, el);
                      else itemRefs.current.delete(d.id);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-800 px-5 py-2.5">
            <div className="text-xs text-neutral-500">
              {filtered.length}개 중 {pageStart + 1}–{Math.min(filtered.length, pageStart + PAGE_SIZE)}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-neutral-800 p-1 text-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-700 hover:bg-neutral-900"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className={cn(
                    "min-w-[26px] rounded-md px-2 py-1 text-xs",
                    i === page
                      ? "bg-sky-500/20 text-sky-200"
                      : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200",
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md border border-neutral-800 p-1 text-neutral-300 disabled:cursor-not-allowed disabled:text-neutral-700 hover:bg-neutral-900"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 삭제 확인 */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70"
          onClick={(e) => {
            e.stopPropagation();
            setDeleteTarget(null);
          }}
        >
          <div
            className="w-[min(400px,92vw)] rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-neutral-800 px-4 py-3 text-sm font-semibold text-neutral-100">
              문서 삭제
            </div>
            <div className="px-4 py-4 text-sm text-neutral-300">
              <strong className="text-neutral-100">"{deleteTarget.title}"</strong>을 삭제하시겠습니까?
              <div className="mt-1 text-xs text-neutral-500">되돌릴 수 없습니다.</div>
            </div>
            <div className="flex justify-end gap-2 border-t border-neutral-800 px-4 py-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="rounded-md border border-rose-700 bg-rose-600/20 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-600/30"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 개별 카드 — 썸네일 + 제목 + 날짜 + hover 액션
// ============================================================
function DocCard({
  doc,
  selected,
  editing,
  draft,
  onDraftChange,
  onHover,
  onLoad,
  onStartEdit,
  onCommitEdit,
  onCancelEdit,
  onDelete,
  registerRef,
}: {
  doc: NodeDocument;
  selected: boolean;
  editing: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  onHover: () => void;
  onLoad: () => void;
  onStartEdit: () => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) {
  const page = currentPage(doc);
  return (
    <div
      ref={registerRef}
      onMouseEnter={onHover}
      className={cn(
        "group relative flex h-44 flex-col overflow-hidden rounded-lg border bg-neutral-900 transition",
        selected ? "border-sky-500 shadow-[0_0_0_1px_rgba(14,165,233,0.4)]" : "border-neutral-800 hover:border-sky-500/50",
      )}
    >
      {/* 썸네일 */}
      <button
        type="button"
        onClick={onLoad}
        disabled={editing}
        className="pointer-events-auto flex flex-1 items-center justify-center overflow-hidden bg-neutral-950/60 p-2 text-left"
      >
        {page ? (
          <div className="pointer-events-none origin-top-left" style={{ transform: "scale(0.22)", width: `${100 / 0.22}%`, height: `${100 / 0.22}%` }}>
            <NodeRenderer node={page.root} depth={0} />
          </div>
        ) : (
          <div className="text-4xl text-neutral-600">📋</div>
        )}
      </button>

      {/* 메타 */}
      <div className="border-t border-neutral-800 px-3 py-2">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onCommitEdit();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  onCancelEdit();
                }
              }}
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
            <button
              onClick={onCommitEdit}
              title="확정 (Enter)"
              className="rounded p-1 text-sky-300 hover:bg-neutral-800"
            >
              <Check size={12} />
            </button>
            <button
              onClick={onCancelEdit}
              title="취소 (Esc)"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <>
            <div className="truncate text-sm font-medium text-neutral-100">{doc.title}</div>
            <div className="mt-0.5 text-[11px] text-neutral-500">
              {new Date(doc.updatedAt).toLocaleString("ko-KR")}
            </div>
          </>
        )}
      </div>

      {/* hover 액션 — 편집·삭제 */}
      {!editing && (
        <div
          className={cn(
            "absolute right-2 top-2 flex gap-1 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onStartEdit(); }}
            title="이름 변경"
            className="rounded-md border border-neutral-800 bg-neutral-950/80 p-1.5 text-neutral-300 hover:border-sky-500/60 hover:text-sky-200"
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="삭제"
            className="rounded-md border border-neutral-800 bg-neutral-950/80 p-1.5 text-neutral-300 hover:border-rose-700 hover:bg-rose-950/60 hover:text-rose-200"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
