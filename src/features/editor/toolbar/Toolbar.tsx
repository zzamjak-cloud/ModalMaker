// 상단 툴바 — 1줄 레이아웃
// File 드롭다운(New/Save/Save As/Load/프리셋 저장/Export/로그인·로그아웃)
// View 드롭다운(Canvas/Node/Preview) + Info + Undo/Redo + Viewport(Canvas만) + Status
// Tab 단축키로 뷰 전환 (크롬 기본 포커스 이동을 preventDefault로 우선)
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Undo2,
  Redo2,
  Save,
  FolderOpen,
  Download,
  Plus,
  Bookmark,
  Layers,
  LayoutGrid,
  Play,
  Menu,
  ChevronDown,
  Info,
  LogIn,
  LogOut,
  Check,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { useGlobalShortcuts } from "@/lib/history";
import { currentAdapter } from "@/features/persistence";
import { firebaseEnabled } from "@/lib/firebase";
import { useAuthStore } from "@/features/auth/authStore";
import {
  cloneDocumentWithNewIds,
  cloneWithNewIds,
  currentPage,
  unlinkAllModuleRefs,
} from "@/stores/layoutStore";
import type { EditorMode } from "@/stores/layout/types";
import type { LayoutDocument, NodeDocument } from "@/types/layout";
import { newId } from "@/lib/id";
import { ViewportSelector } from "./ViewportSelector";
import { ToolbarButton } from "./ToolbarButton";
import { LoadDialog } from "./LoadDialog";
import { currentPageAsLayoutDoc, readableError } from "./toolbarUtils";
import { logger } from "@/lib/logger";

const SaveAsDialog = lazy(() =>
  import("./SaveAsDialog").then((m) => ({ default: m.SaveAsDialog })),
);
const ExportDialog = lazy(() =>
  import("./ExportDialog").then((m) => ({ default: m.ExportDialog })),
);

interface Props {
  onNewClick: () => void;
}

function ToolbarDialogFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-xs text-neutral-400">
      다이얼로그 로딩…
    </div>
  );
}

const NEXT_MODE: Record<EditorMode, EditorMode> = {
  canvas: "node",
  node: "preview",
  preview: "canvas",
};

export function Toolbar({ onNewClick }: Props) {
  useGlobalShortcuts();
  const {
    doc,
    canUndo,
    canRedo,
    undo,
    redo,
    setDocument,
    mode,
    setMode,
  } = useLayoutStore(
    useShallow((s) => ({
      doc: s.document,
      canUndo: s.past.length > 0,
      canRedo: s.future.length > 0,
      undo: s.undo,
      redo: s.redo,
      setDocument: s.setDocument,
      mode: s.mode,
      setMode: s.setMode,
    })),
  );

  const [status, setStatus] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState<NodeDocument[]>([]);
  const [openLoad, setOpenLoad] = useState(false);
  const [openSaveAs, setOpenSaveAs] = useState(false);
  const [openSavePreset, setOpenSavePreset] = useState(false);
  const [openExport, setOpenExport] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);

  // Tab 키로 뷰 전환 — 입력 중이 아닐 때만 적용 (브라우저 기본 포커스 이동 preventDefault)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isEditing =
        tag === "input" || tag === "textarea" || t?.isContentEditable === true;
      if (isEditing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      e.preventDefault();
      setMode(e.shiftKey ? prevMode(mode) : NEXT_MODE[mode]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, setMode]);

  async function save() {
    try {
      await currentAdapter().saveDocument(doc);
      flash(`저장됨: ${doc.title}`);
    } catch (err) {
      logger.error("persistence", "Save failed", err);
      flash(`저장 실패: ${readableError(err)}`);
    }
  }

  async function saveAs(newTitle: string) {
    const copy = cloneDocumentWithNewIds(doc, newTitle);
    try {
      await currentAdapter().saveDocument(copy);
      setDocument(copy);
      flash(`새 파일로 저장됨: ${newTitle}`);
    } catch (err) {
      logger.error("persistence", "Save As failed", err);
      flash(`다른 이름으로 저장 실패: ${readableError(err)}`);
    } finally {
      setOpenSaveAs(false);
    }
  }

  function saveAsPreset() {
    const page = currentPage(doc);
    if (!page) {
      flash("프리셋 저장 실패: 활성 페이지가 없습니다");
      return;
    }
    setOpenSavePreset(true);
  }

  async function doSavePreset(title: string) {
    const page = currentPage(doc);
    if (!page) return;
    const now = Date.now();
    const moduleMap = new Map(doc.modules.map((m) => [m.id, m.root]));
    const unlinkedRoot = unlinkAllModuleRefs(page.root, moduleMap);
    const copy: LayoutDocument = {
      id: newId("doc"),
      title,
      root: cloneWithNewIds(unlinkedRoot),
      createdAt: now,
      updatedAt: now,
      viewport: page.viewport,
    };
    try {
      await currentAdapter().saveUserPreset(copy);
      flash("내 프리셋에 저장되었습니다");
    } catch (err) {
      logger.error("presets", "Save preset failed", err);
      flash(`프리셋 저장 실패: ${readableError(err)}`);
    } finally {
      setOpenSavePreset(false);
    }
  }

  async function openLoadDialog() {
    const docs = await currentAdapter().listDocuments();
    setSavedDocs(docs);
    setOpenLoad(true);
  }

  function load(d: NodeDocument) {
    setDocument(d);
    setOpenLoad(false);
  }

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-3">
        <span className="mr-1 text-sm text-sky-400" title="ModalMaker">▤</span>

        <FileMenu
          onNew={onNewClick}
          onSave={save}
          onSaveAs={() => setOpenSaveAs(true)}
          onLoad={openLoadDialog}
          onSavePreset={saveAsPreset}
          onExport={() => setOpenExport(true)}
        />
        <ViewMenu mode={mode} setMode={setMode} />
        <button
          type="button"
          onClick={() => setOpenInfo(true)}
          className="inline-flex items-center gap-1 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800"
          title="ModalMaker 정보"
        >
          <Info size={14} />
          Info
        </button>

        <div className="mx-1 h-5 w-px bg-neutral-800" />

        <ToolbarButton onClick={undo} disabled={!canUndo} title="Undo (⌘Z)">
          <Undo2 size={14} />
        </ToolbarButton>
        <ToolbarButton onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)">
          <Redo2 size={14} />
        </ToolbarButton>

        {mode === "canvas" && (
          <>
            <div className="mx-1 h-5 w-px bg-neutral-800" />
            <ViewportSelector />
          </>
        )}

        <div className="flex-1" />

        {status && <div className="text-xs text-sky-400">{status}</div>}
      </div>

      {openLoad && (
        <LoadDialog docs={savedDocs} onClose={() => setOpenLoad(false)} onLoad={load} />
      )}
      {openSaveAs && (
        <Suspense fallback={<ToolbarDialogFallback />}>
          <SaveAsDialog
            initialTitle={`${doc.title} (사본)`}
            onCancel={() => setOpenSaveAs(false)}
            onConfirm={saveAs}
          />
        </Suspense>
      )}
      {openSavePreset && (
        <Suspense fallback={<ToolbarDialogFallback />}>
          <SaveAsDialog
            initialTitle={`${currentPage(doc)?.title ?? doc.title} (프리셋)`}
            onCancel={() => setOpenSavePreset(false)}
            onConfirm={doSavePreset}
            label="프리셋 이름"
          />
        </Suspense>
      )}
      {openExport && (
        <Suspense fallback={<ToolbarDialogFallback />}>
          <ExportDialog
            doc={currentPageAsLayoutDoc(doc)}
            onClose={() => setOpenExport(false)}
            onFlash={flash}
          />
        </Suspense>
      )}
      {openInfo && <InfoDialog onClose={() => setOpenInfo(false)} />}
    </>
  );
}

function prevMode(m: EditorMode): EditorMode {
  return m === "canvas" ? "preview" : m === "node" ? "canvas" : "node";
}

// ============================================================
// File 메뉴 — 드롭다운
// ============================================================
function FileMenu({
  onNew,
  onSave,
  onSaveAs,
  onLoad,
  onSavePreset,
  onExport,
}: {
  onNew: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoad: () => void;
  onSavePreset: () => void;
  onExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));
  const user = useAuthStore((s) => s.user);
  const initAuth = useAuthStore((s) => s.init);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);
  useEffect(() => { initAuth(); }, [initAuth]);

  const wrap = (fn: () => void) => () => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <MenuTrigger open={open} onClick={() => setOpen((v) => !v)} icon={<Menu size={14} />}>
        File
      </MenuTrigger>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[220px] rounded-md border border-neutral-800 bg-neutral-950 py-1 shadow-xl">
          <MenuItem onClick={wrap(onNew)} icon={<Plus size={14} />}>New</MenuItem>
          <MenuItem onClick={wrap(onSave)} icon={<Save size={14} />} shortcut="⌘S">Save</MenuItem>
          <MenuItem onClick={wrap(onSaveAs)} icon={<Save size={14} />}>Save As</MenuItem>
          <MenuItem onClick={wrap(onLoad)} icon={<FolderOpen size={14} />}>Load</MenuItem>
          <MenuItem onClick={wrap(onSavePreset)} icon={<Bookmark size={14} />}>Save to Preset</MenuItem>
          <MenuItem onClick={wrap(onExport)} icon={<Download size={14} />}>Export</MenuItem>
          {firebaseEnabled && (
            <>
              <MenuDivider />
              {user ? (
                <MenuItem onClick={wrap(signOut)} icon={<LogOut size={14} />}>
                  Logout ({user.displayName ?? user.email})
                </MenuItem>
              ) : (
                <MenuItem onClick={wrap(signInWithGoogle)} icon={<LogIn size={14} />}>
                  Google 로그인
                </MenuItem>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// View 메뉴 — 드롭다운 (현재 모드 체크마크, Tab 안내)
// ============================================================
function ViewMenu({ mode, setMode }: { mode: EditorMode; setMode: (m: EditorMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));
  const sel = (m: EditorMode) => { setMode(m); setOpen(false); };
  return (
    <div ref={ref} className="relative">
      <MenuTrigger open={open} onClick={() => setOpen((v) => !v)}>
        View
      </MenuTrigger>
      {open && (
        <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-md border border-neutral-800 bg-neutral-950 py-1 shadow-xl">
          <ViewMenuItem active={mode === "node"} onClick={() => sel("node")} icon={<LayoutGrid size={14} />}>Node</ViewMenuItem>
          <ViewMenuItem active={mode === "canvas"} onClick={() => sel("canvas")} icon={<Layers size={14} />}>Canvas</ViewMenuItem>
          <ViewMenuItem active={mode === "preview"} onClick={() => sel("preview")} icon={<Play size={14} />}>Preview</ViewMenuItem>
          <MenuDivider />
          <div className="px-3 py-1 text-[10px] text-neutral-500">
            Tab / Shift+Tab 키로 순환 전환
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 공용 메뉴 프리미티브
// ============================================================
function MenuTrigger({
  children,
  open,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  open: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition",
        open
          ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
          : "border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800",
      )}
    >
      {icon}
      <span>{children}</span>
      <ChevronDown size={12} className="text-neutral-500" />
    </button>
  );
}

function MenuItem({
  children,
  onClick,
  icon,
  shortcut,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-neutral-200 hover:bg-neutral-800"
    >
      <span className="w-4 shrink-0 text-neutral-400">{icon}</span>
      <span className="flex-1 truncate">{children}</span>
      {shortcut && <span className="text-[10px] text-neutral-500">{shortcut}</span>}
    </button>
  );
}

function ViewMenuItem({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs",
        active ? "bg-sky-500/10 text-sky-200" : "text-neutral-200 hover:bg-neutral-800",
      )}
    >
      <span className="w-4 shrink-0 text-neutral-400">{icon}</span>
      <span className="flex-1">{children}</span>
      {active && <Check size={12} className="text-sky-300" />}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-neutral-800" />;
}

function useOutsideClick(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onOutside]);
}

// ============================================================
// Info 다이얼로그 — ModalMaker 정보 / 버전
// ============================================================
const APP_VERSION = "1.0.1";

function InfoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-[min(420px,92vw)] rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="text-sky-400">▤</span> ModalMaker
          </div>
          <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>
        <div className="space-y-3 px-4 py-4 text-xs text-neutral-300">
          <div className="flex justify-between">
            <span className="text-neutral-500">버전</span>
            <span className="tabular-nums">{APP_VERSION}</span>
          </div>
          <div className="leading-relaxed text-neutral-400">
            비주얼 캔버스에서 멀티 페이지 UI 구조를 설계하고 AI 친화적 Markdown /
            JSON / Mermaid로 내보내는 도구.
          </div>
          <div className="pt-2 text-[10px] text-neutral-500">MIT © 2026 zzamjak-cloud</div>
        </div>
      </div>
    </div>
  );
}
