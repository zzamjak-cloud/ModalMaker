// 최초 진입 다이얼로그 (PresetGallery) — 3탭 구조
// [최근 사용] [저장된] [프리셋]
//  - 최근:   localStorage에 저장된 id를 IDB에서 로드해 썸네일 그리드
//  - 저장된: currentAdapter.listDocuments() 썸네일 그리드
//  - 프리셋: 내장 프리셋(카테고리 서브탭) + 내 프리셋 + 빈 캔버스
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  useLayoutStore,
  cloneDocumentWithNewIds,
  cloneWithNewIds,
  createEmptyDocument,
  currentPage as getCurrentPage,
} from "@/stores/layoutStore";
import {
  BUILTIN_PRESETS,
  PRESET_CATEGORIES,
  type PresetCategory,
  type PresetEntry,
} from "./presetRegistry";
import { currentAdapter } from "@/features/persistence";
import { getRecentIds, pushRecent } from "@/features/persistence/recentStore";
import { NodeRenderer } from "@/features/canvas/NodeRenderer";
import { resolveThumbFit } from "@/features/canvas/thumbnailUtils";
import { logger } from "@/lib/logger";
import type { LayoutDocument, NodeDocument } from "@/types/layout";
import { newId } from "@/lib/id";

type TopTab = "recent" | "saved" | "presets";
type PresetSubTab = "All" | PresetCategory | "My Presets";

/** 그리드 카드 썸네일 최대 */
const CARD_THUMB_W = 260;
const CARD_THUMB_H = 130;

export function PresetGallery({ onClose }: { onClose: () => void }) {
  const setDocument = useLayoutStore((s) => s.setDocument);

  const [topTab, setTopTab] = useState<TopTab>("recent");
  const [presetSubTab, setPresetSubTab] = useState<PresetSubTab>("All");

  // 최근 / 저장된 데이터 로딩
  const [recentDocs, setRecentDocs] = useState<NodeDocument[]>([]);
  const [savedDocs, setSavedDocs] = useState<NodeDocument[]>([]);
  const [userPresets, setUserPresets] = useState<LayoutDocument[]>([]);
  const [loading, setLoading] = useState<{ recent: boolean; saved: boolean }>({
    recent: true,
    saved: true,
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  // 첫 로드 완료 시점에 자동 탭 이동을 1회만 적용 — 이후 사용자 탭 클릭을 덮어쓰지 않음
  const didAutoSwitchRef = useRef(false);

  useEffect(() => {
    // 최근: id 목록을 유지 순서대로 IDB 조회 (null은 정리)
    (async () => {
      const ids = getRecentIds();
      logger.info("presets", `recent ids count=${ids.length}`);
      if (ids.length === 0) {
        setRecentDocs([]);
        setLoading((p) => ({ ...p, recent: false }));
        return;
      }
      const results = await Promise.all(
        ids.map((id) => currentAdapter().loadDocument(id).catch(() => null)),
      );
      const docs = results.filter((d): d is NodeDocument => !!d);
      logger.info("presets", `recent loaded=${docs.length}/${ids.length}`);
      setRecentDocs(docs);
      setLoading((p) => ({ ...p, recent: false }));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const docs = await currentAdapter().listDocuments();
        logger.info("presets", `listDocuments returned ${docs.length} docs`);
        setSavedDocs(docs);
      } catch (err) {
        logger.error("persistence", "listDocuments failed", err);
        setLoadError(err instanceof Error ? err.message : String(err));
      }
      setLoading((p) => ({ ...p, saved: false }));
    })();
  }, []);

  useEffect(() => {
    currentAdapter()
      .listUserPresets()
      .then(setUserPresets)
      .catch((err) => logger.error("presets", "listUserPresets failed", err));
  }, []);

  // 최초 로드 완료 후 빈 탭이면 자동으로 다른 탭으로 1회만 이동.
  // 이후 사용자가 '최근'을 다시 클릭하면 그대로 유지.
  useEffect(() => {
    if (didAutoSwitchRef.current) return;
    if (loading.recent || loading.saved) return;
    didAutoSwitchRef.current = true;
    if (recentDocs.length === 0) {
      setTopTab(savedDocs.length > 0 ? "saved" : "presets");
    }
  }, [loading.recent, loading.saved, recentDocs.length, savedDocs.length]);

  const visiblePresets = useMemo(() => {
    if (presetSubTab === "All") return BUILTIN_PRESETS;
    if (presetSubTab === "My Presets") return [];
    return BUILTIN_PRESETS.filter((p) => p.category === presetSubTab);
  }, [presetSubTab]);

  function loadNodeDoc(d: NodeDocument) {
    setDocument(d);
    pushRecent(d.id);
    onClose();
  }

  function loadPreset(entry: PresetEntry) {
    const cloned = cloneDocumentWithNewIds(entry.document, entry.document.title);
    setDocument(cloned);
    pushRecent(cloned.id);
    onClose();
  }

  function loadUserPreset(d: LayoutDocument) {
    const next = {
      ...d,
      id: newId("doc"),
      root: cloneWithNewIds(d.root),
      updatedAt: Date.now(),
    };
    setDocument(next);
    pushRecent(next.id);
    onClose();
  }

  function blank() {
    const empty = createEmptyDocument("Untitled");
    setDocument(empty);
    pushRecent(empty.id);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[82vh] w-[min(1100px,94vw)] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Start</div>
            <div className="text-lg font-semibold">시작할 문서를 선택하세요</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 hover:bg-neutral-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* 최상위 3탭 */}
        <div className="flex gap-1 border-b border-neutral-800 px-3 py-2">
          <TopTabBtn active={topTab === "recent"} onClick={() => setTopTab("recent")}>
            최근 ({recentDocs.length})
          </TopTabBtn>
          <TopTabBtn active={topTab === "saved"} onClick={() => setTopTab("saved")}>
            저장된 문서 ({savedDocs.length})
          </TopTabBtn>
          <TopTabBtn active={topTab === "presets"} onClick={() => setTopTab("presets")}>
            프리셋
          </TopTabBtn>
        </div>

        {/* 프리셋 탭 내부 서브탭 */}
        {topTab === "presets" && (
          <div className="flex flex-wrap gap-1 border-b border-neutral-800 px-3 py-2">
            <SubTabBtn active={presetSubTab === "All"} onClick={() => setPresetSubTab("All")}>
              All
            </SubTabBtn>
            {PRESET_CATEGORIES.map((c) => (
              <SubTabBtn
                key={c}
                active={presetSubTab === c}
                onClick={() => setPresetSubTab(c)}
              >
                {c}
              </SubTabBtn>
            ))}
            <SubTabBtn
              active={presetSubTab === "My Presets"}
              onClick={() => setPresetSubTab("My Presets")}
            >
              내 프리셋 ({userPresets.length})
            </SubTabBtn>
          </div>
        )}

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-5">
          {topTab === "recent" && (
            <DocGrid
              docs={recentDocs}
              loading={loading.recent}
              error={null}
              emptyMsg="최근 사용한 문서가 없습니다. '저장된 문서' 또는 '프리셋'에서 시작하세요."
              onPick={loadNodeDoc}
            />
          )}

          {topTab === "saved" && (
            <DocGrid
              docs={savedDocs}
              loading={loading.saved}
              error={loadError}
              emptyMsg="저장된 문서가 없습니다. 먼저 문서를 편집하고 File ▸ Save로 저장하세요."
              onPick={loadNodeDoc}
            />
          )}

          {topTab === "presets" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {presetSubTab === "All" && (
                <button
                  onClick={blank}
                  className="group flex h-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-900/40 text-neutral-400 transition hover:border-sky-500/60 hover:text-sky-300"
                >
                  <Plus size={24} />
                  <div className="text-sm font-medium">빈 캔버스</div>
                  <div className="text-[11px] text-neutral-500 group-hover:text-sky-400/70">
                    처음부터 직접 구성
                  </div>
                </button>
              )}

              {presetSubTab === "My Presets"
                ? userPresets.map((p) => (
                    <UserPresetCard key={p.id} doc={p} onClick={() => loadUserPreset(p)} />
                  ))
                : visiblePresets.map((p) => (
                    <PresetCard key={p.id} entry={p} onClick={() => loadPreset(p)} />
                  ))}

              {presetSubTab === "My Presets" && userPresets.length === 0 && (
                <div className="col-span-full text-center text-sm text-neutral-500">
                  저장된 내 프리셋이 없습니다. 캔버스에서 작업 후{" "}
                  <strong>File ▸ Save to Preset</strong>을 사용하세요.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 탭 버튼
// ============================================================
function TopTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition",
        active
          ? "bg-sky-500/20 text-sky-200"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
      )}
    >
      {children}
    </button>
  );
}

function SubTabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition",
        active
          ? "bg-sky-500/15 text-sky-200"
          : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
      )}
    >
      {children}
    </button>
  );
}

// ============================================================
// 문서 썸네일 그리드 (최근·저장된 공용)
// ============================================================
function DocGrid({
  docs,
  loading,
  error,
  emptyMsg,
  onPick,
}: {
  docs: NodeDocument[];
  loading: boolean;
  error: string | null;
  emptyMsg: string;
  onPick: (d: NodeDocument) => void;
}) {
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-neutral-500">
        불러오는 중…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-rose-300">
        <div>문서 목록을 불러오지 못했습니다.</div>
        <div className="text-xs text-rose-400/80">{error}</div>
        <div className="mt-2 text-[11px] text-neutral-500">
          브라우저 DevTools → Console에서 [persistence] 로그를 확인하세요.
        </div>
      </div>
    );
  }
  if (docs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-center text-sm text-neutral-500">
        {emptyMsg}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {docs.map((d) => (
        <DocCard key={d.id} doc={d} onClick={() => onPick(d)} />
      ))}
    </div>
  );
}

function DocCard({ doc, onClick }: { doc: NodeDocument; onClick: () => void }) {
  const page = getCurrentPage(doc);
  const thumb = page ? resolveThumbFit(page.viewport, CARD_THUMB_W, CARD_THUMB_H) : null;
  return (
    <ClickableCard onClick={onClick}>
      <div className="pointer-events-none flex flex-1 items-center justify-center overflow-hidden bg-neutral-950/60 p-2">
        {page && thumb ? (
          <div
            className="relative overflow-hidden rounded-sm"
            style={{ width: thumb.frameW, height: thumb.frameH }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: thumb.contentW,
                height: thumb.contentH,
                transformOrigin: "top left",
                transform: `scale(${thumb.scale})`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <NodeRenderer node={page.root} depth={0} parentIsFlexContainer parentDirection="column" />
            </div>
          </div>
        ) : (
          <div className="text-4xl text-neutral-600">📄</div>
        )}
      </div>
      <div className="border-t border-neutral-800 px-3 py-2">
        <div className="truncate text-sm font-medium text-neutral-100">{doc.title}</div>
        <div className="mt-0.5 text-[11px] text-neutral-500">
          {new Date(doc.updatedAt).toLocaleString("ko-KR")}
        </div>
      </div>
    </ClickableCard>
  );
}

// ============================================================
// 프리셋 카드
// ============================================================
function PresetCard({ entry, onClick }: { entry: PresetEntry; onClick: () => void }) {
  const firstPage = entry.document.pages[0];
  const thumb = firstPage ? resolveThumbFit(firstPage.viewport, CARD_THUMB_W, CARD_THUMB_H) : null;
  return (
    <ClickableCard onClick={onClick}>
      <div className="pointer-events-none flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950 p-2">
        {firstPage && thumb ? (
          <div
            className="relative overflow-hidden rounded-sm"
            style={{ width: thumb.frameW, height: thumb.frameH }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: thumb.contentW,
                height: thumb.contentH,
                transformOrigin: "top left",
                transform: `scale(${thumb.scale})`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <NodeRenderer node={firstPage.root} depth={0} parentIsFlexContainer parentDirection="column" />
            </div>
          </div>
        ) : (
          <div className="text-5xl">{entry.icon}</div>
        )}
      </div>
      <div className="border-t border-neutral-800 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="truncate text-sm font-medium text-neutral-100">{entry.name}</div>
          <div className="shrink-0 rounded-sm bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {entry.category}
          </div>
        </div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">{entry.description}</div>
      </div>
    </ClickableCard>
  );
}

function UserPresetCard({ doc, onClick }: { doc: LayoutDocument; onClick: () => void }) {
  const thumb = resolveThumbFit(doc.viewport, CARD_THUMB_W, CARD_THUMB_H);
  return (
    <ClickableCard onClick={onClick}>
      <div className="pointer-events-none flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-neutral-900 to-neutral-950 p-2">
        <div
          className="relative overflow-hidden rounded-sm"
          style={{ width: thumb.frameW, height: thumb.frameH }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: thumb.contentW,
              height: thumb.contentH,
              transformOrigin: "top left",
              transform: `scale(${thumb.scale})`,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <NodeRenderer node={doc.root} depth={0} parentIsFlexContainer parentDirection="column" />
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-800 px-3 py-2">
        <div className="truncate text-sm font-medium text-neutral-100">{doc.title}</div>
        <div className="mt-0.5 text-[11px] text-neutral-500">
          {new Date(doc.updatedAt).toLocaleString("ko-KR")}
        </div>
      </div>
    </ClickableCard>
  );
}

// 공용 카드 래퍼 — <button> 대신 role="button" div로 중첩 버튼 경고 방지.
// 카드 내부 Leaf가 실제 <button>을 렌더할 수 있기 때문.
function ClickableCard({
  onClick,
  className,
  children,
}: {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group flex h-44 cursor-pointer flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:border-sky-500/60 hover:shadow-[0_0_0_1px_rgba(14,165,233,0.25)] focus:outline-none focus:ring-2 focus:ring-sky-500/40",
        className,
      )}
    >
      {children}
    </div>
  );
}
