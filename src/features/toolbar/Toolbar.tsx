// 상단 툴바 — 두 줄 레이아웃
// Row 1 (파일·모드·계정 — 전역): 로고, Canvas/Node 토글, New/Save/Save As/Load/프리셋으로 저장, Auth
// Row 2 (편집·문서 속성 — 현재 문서): Undo/Redo, 제목, Viewport(Canvas 모드), 상태, Export
import { useState } from "react";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  Plus,
  Minus,
  Bookmark,
  Layers,
  LayoutGrid,
  Maximize2,
  Play,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { useGlobalShortcuts } from "@/lib/history";
import { currentAdapter } from "@/features/persistence";
import { AuthButton } from "@/features/auth/AuthButton";
import {
  cloneDocumentWithNewIds,
  cloneWithNewIds,
  currentPage,
} from "@/stores/layoutStore";
import type { LayoutDocument, NodeDocument } from "@/types/layout";
import { newId } from "@/lib/id";
import { SaveAsDialog } from "./SaveAsDialog";
import { ViewportSelector } from "./ViewportSelector";
import { ExportDialog } from "./ExportDialog";
import { useCanvasViewportControlsStore } from "@/features/canvas/canvasViewportControlsStore";

interface Props {
  onNewClick: () => void;
}

export function Toolbar({ onNewClick }: Props) {
  useGlobalShortcuts();
  const doc = useLayoutStore((s) => s.document);
  const canUndo = useLayoutStore((s) => s.past.length > 0);
  const canRedo = useLayoutStore((s) => s.future.length > 0);
  const undo = useLayoutStore((s) => s.undo);
  const redo = useLayoutStore((s) => s.redo);
  const updateTitle = useLayoutStore((s) => s.updateTitle);
  const setDocument = useLayoutStore((s) => s.setDocument);
  const mode = useLayoutStore((s) => s.mode);
  const setMode = useLayoutStore((s) => s.setMode);
  const canvasZoom = useCanvasViewportControlsStore();

  const [status, setStatus] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState<NodeDocument[]>([]);
  const [openLoad, setOpenLoad] = useState(false);
  const [openSaveAs, setOpenSaveAs] = useState(false);
  const [openExport, setOpenExport] = useState(false);

  async function save() {
    try {
      await currentAdapter().saveDocument(doc);
      flash(`저장됨: ${doc.title}`);
    } catch (err) {
      console.error("Save failed:", err);
      flash(`저장 실패: ${readableError(err)}`);
    }
  }

  async function saveAs(newTitle: string) {
    const copy = cloneDocumentWithNewIds(doc, newTitle);
    try {
      await currentAdapter().saveDocument(copy);
      setDocument(copy); // 이후 사용자가 사본을 계속 편집
      flash(`새 파일로 저장됨: ${newTitle}`);
    } catch (err) {
      console.error("Save As failed:", err);
      flash(`다른 이름으로 저장 실패: ${readableError(err)}`);
    } finally {
      setOpenSaveAs(false);
    }
  }

  async function saveAsPreset() {
    // 프리셋은 현재 페이지 단독 레거시 LayoutDocument 포맷으로 저장 (호환성 유지).
    const page = currentPage(doc);
    if (!page) {
      flash("프리셋 저장 실패: 활성 페이지가 없습니다");
      return;
    }
    const now = Date.now();
    const copy: LayoutDocument = {
      id: newId("doc"),
      title: `${page.title} (프리셋)`,
      root: cloneWithNewIds(page.root),
      createdAt: now,
      updatedAt: now,
      viewport: page.viewport,
    };
    try {
      await currentAdapter().saveUserPreset(copy);
      flash("내 프리셋에 저장되었습니다");
    } catch (err) {
      console.error("Save preset failed:", err);
      flash(`프리셋 저장 실패: ${readableError(err)}`);
    }
  }

  async function openLoadDialog() {
    const docs = await currentAdapter().listDocuments();
    setSavedDocs(docs);
    setOpenLoad(true);
  }

  function load(d: NodeDocument) {
    // id/원본 root id를 그대로 유지해야 이후 Save가 '원본 덮어쓰기'로 동작한다.
    setDocument(d);
    setOpenLoad(false);
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  return (
    <>
      <div className="flex flex-col border-b border-neutral-800 bg-neutral-900">
        {/* Row 1 — 파일·모드·계정 */}
        <div className="flex items-center gap-3 border-b border-neutral-800/60 px-4 py-2">
          <div className="text-sm font-bold tracking-tight">
            <span className="text-sky-400">▤</span> ModalMaker
          </div>

          <div className="h-5 w-px bg-neutral-800" />

          {/* Canvas / Node 모드 토글 */}
          <div className="flex items-center gap-0.5 rounded-md border border-neutral-800 bg-neutral-950 p-0.5">
            <button
              onClick={() => setMode("canvas")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs",
                mode === "canvas"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
              title="Canvas 편집 모드"
            >
              <Layers size={12} />
              Canvas
            </button>
            <button
              onClick={() => setMode("node")}
              className={cn(
                "inline-flex items-center gap-1 rounded px-2 py-1 text-xs",
                mode === "node"
                  ? "bg-sky-500/20 text-sky-200"
                  : "text-neutral-400 hover:text-neutral-200",
              )}
              title="Node View (페이지 다이어그램)"
            >
              <LayoutGrid size={12} />
              Node
            </button>
          </div>

          <div className="h-5 w-px bg-neutral-800" />

          <ToolbarButton onClick={onNewClick} title="새 문서 / 프리셋 선택">
            <Plus size={14} />
            <span>New</span>
          </ToolbarButton>
          <ToolbarButton onClick={save} title="로컬에 저장 (IndexedDB)">
            <Save size={14} />
            <span>Save</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => setOpenSaveAs(true)} title="다른 이름으로 저장">
            <Save size={14} />
            <span>Save As</span>
          </ToolbarButton>
          <ToolbarButton onClick={openLoadDialog} title="저장된 문서 불러오기">
            <FolderOpen size={14} />
            <span>Load</span>
          </ToolbarButton>
          <ToolbarButton onClick={saveAsPreset} title="현재 캔버스를 프리셋으로 저장">
            <Bookmark size={14} />
            <span>프리셋으로 저장</span>
          </ToolbarButton>

          <div className="flex-1" />

          <AuthButton />
        </div>

        {/* Row 2 — 편집·문서 속성 */}
        <div className="flex items-center gap-3 px-4 py-2">
          <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
            <Undo2 size={14} />
          </ToolbarButton>
          <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
            <Redo2 size={14} />
          </ToolbarButton>

          <div className="h-5 w-px bg-neutral-800" />

          <input
            value={doc.title}
            onChange={(e) => updateTitle(e.target.value)}
            className="w-56 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
            placeholder="제목"
          />

          {mode === "canvas" && (
            <>
              <div className="h-5 w-px bg-neutral-800" />
              <ViewportSelector />
            </>
          )}

          <div className="flex-1" />

          {status && <div className="text-xs text-sky-400">{status}</div>}

          {mode === "canvas" && canvasZoom.active && (
            <>
              <div className="h-5 w-px bg-neutral-800" />
              <div
                className="flex flex-wrap items-center gap-0.5 rounded-md border border-neutral-800 bg-neutral-950 px-1 py-0.5"
                role="group"
                aria-label="캔버스 줌"
              >
                <button
                  type="button"
                  className="rounded p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  title="10% 축소"
                  onClick={() => canvasZoom.zoomOut()}
                >
                  <Minus size={14} />
                </button>
                <span className="min-w-[2.75rem] px-0.5 text-center text-[11px] tabular-nums text-neutral-400">
                  {canvasZoom.percent}%
                </span>
                <button
                  type="button"
                  className="rounded p-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100"
                  title="10% 확대"
                  onClick={() => canvasZoom.zoomIn()}
                >
                  <Plus size={14} />
                </button>
                <div className="mx-0.5 h-4 w-px bg-neutral-700" />
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800 hover:text-sky-200"
                  title="화면에 맞춤"
                  onClick={() => canvasZoom.fit()}
                >
                  <Maximize2 size={12} />
                  맞춤
                </button>
              </div>
            </>
          )}

          <ToolbarButton onClick={() => setMode("preview")} title="프리뷰 실행">
            <Play size={14} />
            <span>Preview</span>
          </ToolbarButton>
          <ToolbarButton onClick={() => setOpenExport(true)} title="Export (MD / JSON / Mermaid)">
            <Download size={14} />
            <span>Export</span>
          </ToolbarButton>
        </div>
      </div>

      {openLoad && (
        <LoadDialog docs={savedDocs} onClose={() => setOpenLoad(false)} onLoad={load} />
      )}
      {openSaveAs && (
        <SaveAsDialog
          initialTitle={`${doc.title} (사본)`}
          onCancel={() => setOpenSaveAs(false)}
          onConfirm={saveAs}
        />
      )}
      {openExport && (
        <ExportDialog
          doc={currentPageAsLayoutDoc(doc)}
          onClose={() => setOpenExport(false)}
          onFlash={flash}
        />
      )}
    </>
  );
}

// 현재 페이지를 v1 LayoutDocument 형태로 synthesize해 Export 모듈로 전달한다.
// Phase A 기준으로 Export 함수들이 아직 v1 입력을 받기 때문이다.
function currentPageAsLayoutDoc(doc: NodeDocument): LayoutDocument {
  const page = currentPage(doc) ?? doc.pages[0];
  return {
    id: doc.id,
    title: page?.title ?? doc.title,
    root: page?.root ?? {
      id: "empty",
      kind: "container",
      props: { direction: "column", gap: 0, padding: 0, label: "Empty" },
      children: [],
    },
    viewport: page?.viewport,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ownerUid: doc.ownerUid,
  };
}

function readableError(err: unknown): string {
  if (err instanceof Error) {
    // Firestore permission-denied 에러 메시지를 짧게
    if (err.message.includes("permission")) return "권한 오류 (rules/로그인 확인)";
    if (err.message.includes("Unsupported field value")) return "지원하지 않는 필드 값";
    return err.message.slice(0, 80);
  }
  return String(err).slice(0, 80);
}

function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition",
        disabled
          ? "cursor-not-allowed border-neutral-900 text-neutral-600"
          : active
            ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
            : "border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800",
      )}
    >
      {children}
    </button>
  );
}

function LoadDialog({
  docs,
  onClose,
  onLoad,
}: {
  docs: NodeDocument[];
  onClose: () => void;
  onLoad: (d: NodeDocument) => void;
}) {
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
            docs.map((d) => (
              <button
                key={d.id}
                onClick={() => onLoad(d)}
                className="block w-full border-b border-neutral-900 px-4 py-3 text-left text-sm hover:bg-neutral-900"
              >
                <div className="font-medium text-neutral-100">{d.title}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(d.updatedAt).toLocaleString("ko-KR")}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
