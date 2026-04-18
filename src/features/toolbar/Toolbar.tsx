// 상단 툴바
// - 문서 제목 편집
// - Undo / Redo / Save / Load
// - Export (Markdown / JSON / Mermaid) + 복사 / 다운로드 + AI 프롬프트 토글
// - 프리셋으로 저장
import { useState } from "react";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  Copy,
  Sparkles,
  Plus,
  Bookmark,
  Layers,
  LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { useGlobalShortcuts } from "@/lib/history";
import {
  EXPORT_FORMAT_EXT,
  EXPORT_FORMAT_LABEL,
  toJson,
  toMarkdown,
  toMermaid,
  type ExportFormat,
} from "@/features/export";
import { currentAdapter } from "@/features/persistence";
import { AuthButton } from "@/features/auth/AuthButton";
import { saveTextFile } from "@/lib/tauri";
import {
  cloneDocumentWithNewIds,
  cloneWithNewIds,
  currentPage,
} from "@/stores/layoutStore";
import type { LayoutDocument, NodeDocument } from "@/types/layout";
import { newId } from "@/lib/id";
import { SaveAsDialog } from "./SaveAsDialog";
import { ViewportSelector } from "./ViewportSelector";

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

  const [includePrompt, setIncludePrompt] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [status, setStatus] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState<NodeDocument[]>([]);
  const [openLoad, setOpenLoad] = useState(false);
  const [openSaveAs, setOpenSaveAs] = useState(false);

  const exported = renderExport(doc, format, includePrompt);

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

  async function copyExport() {
    await navigator.clipboard.writeText(exported);
    flash(`${EXPORT_FORMAT_LABEL[format]} 복사됨`);
  }

  async function downloadExport() {
    const filename = `${slug(doc.title)}.${EXPORT_FORMAT_EXT[format]}`;
    await saveTextFile(filename, exported);
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="text-sm font-bold tracking-tight">
            <span className="text-sky-400">▤</span> ModalMaker
          </div>
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

        <div className="h-5 w-px bg-neutral-800" />

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
          className="w-48 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
          placeholder="제목"
        />

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

        {mode === "canvas" && (
          <>
            <div className="h-5 w-px bg-neutral-800" />
            <ViewportSelector />
          </>
        )}

        <div className="flex-1" />

        {status && <div className="text-xs text-sky-400">{status}</div>}

        <div className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950 p-0.5">
          {(Object.keys(EXPORT_FORMAT_LABEL) as ExportFormat[]).map((f) => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              className={cn(
                "rounded px-2 py-1 text-xs",
                format === f ? "bg-sky-500/20 text-sky-200" : "text-neutral-400 hover:text-neutral-200",
              )}
            >
              {EXPORT_FORMAT_LABEL[f]}
            </button>
          ))}
        </div>

        <ToolbarButton
          onClick={() => setIncludePrompt((v) => !v)}
          title="AI 프롬프트 프리픽스 포함"
          active={includePrompt}
        >
          <Sparkles size={14} />
        </ToolbarButton>

        <ToolbarButton onClick={copyExport} title="Export 내용 복사">
          <Copy size={14} />
          <span>복사</span>
        </ToolbarButton>
        <ToolbarButton onClick={downloadExport} title="파일로 다운로드/저장">
          <Download size={14} />
          <span>Export</span>
        </ToolbarButton>

        <div className="h-5 w-px bg-neutral-800" />

        <AuthButton />
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
    </>
  );
}

// Export 함수들은 아직 v1 LayoutDocument 형태를 입력으로 받는다.
// Phase A에서는 현재 페이지를 LayoutDocument로 축약해 전달 (모듈/엣지 미포함).
function renderExport(doc: NodeDocument, format: ExportFormat, includePrompt: boolean): string {
  const page = currentPage(doc);
  const legacy: LayoutDocument = {
    id: doc.id,
    title: doc.title,
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
  switch (format) {
    case "json":
      return toJson(legacy);
    case "markdown":
      return toMarkdown(legacy, { includePrompt });
    case "mermaid":
      return toMermaid(legacy);
  }
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

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "modalmaker";
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
