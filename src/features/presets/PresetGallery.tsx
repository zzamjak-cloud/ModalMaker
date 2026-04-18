// 프리셋 갤러리 모달
// - 카테고리 탭 (전체/카테고리별/내 프리셋)
// - 그리드에서 선택 시 layoutStore.setDocument로 캔버스에 로드 (ID 재발급)
// - 빈 상태에서 시작하려면 "Blank Canvas" 선택
import { useEffect, useMemo, useState } from "react";
import { X, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  useLayoutStore,
  cloneDocumentWithNewIds,
  cloneWithNewIds,
  createEmptyDocument,
} from "@/stores/layoutStore";
import { BUILTIN_PRESETS, PRESET_CATEGORIES, type PresetCategory, type PresetEntry } from "./presetRegistry";
import { currentAdapter } from "@/features/persistence";
import type { LayoutDocument } from "@/types/layout";
import { newId } from "@/lib/id";

type TabKey = "All" | PresetCategory | "My Presets";

export function PresetGallery({ onClose }: { onClose: () => void }) {
  const setDocument = useLayoutStore((s) => s.setDocument);
  const [tab, setTab] = useState<TabKey>("All");
  const [userPresets, setUserPresets] = useState<LayoutDocument[]>([]);

  useEffect(() => {
    currentAdapter().listUserPresets().then(setUserPresets);
  }, [tab]);

  const visible = useMemo(() => {
    if (tab === "All") return BUILTIN_PRESETS;
    if (tab === "My Presets") return [];
    return BUILTIN_PRESETS.filter((p) => p.category === tab);
  }, [tab]);

  function loadPreset(entry: PresetEntry) {
    // v2 NodeDocument → 전체 페이지/모듈/엣지 id를 한 번에 재매핑해 다중 로드 충돌 방지
    const cloned = cloneDocumentWithNewIds(entry.document, entry.document.title);
    setDocument(cloned);
    onClose();
  }

  function loadUserPreset(d: LayoutDocument) {
    // 사용자 프리셋은 여전히 v1 구조로 저장됨. setDocument가 자동으로 v2 마이그레이션 수행.
    setDocument({
      ...d,
      id: newId("doc"),
      root: cloneWithNewIds(d.root),
      updatedAt: Date.now(),
    });
    onClose();
  }

  function blank() {
    setDocument(createEmptyDocument("Untitled"));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="flex h-[80vh] w-[min(1100px,92vw)] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-500">Preset Gallery</div>
            <div className="text-lg font-semibold">시작할 모달을 선택하세요</div>
          </div>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-800 p-1.5 text-neutral-400 hover:bg-neutral-900"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-neutral-800 px-3 py-2">
          <TabBtn active={tab === "All"} onClick={() => setTab("All")}>
            All
          </TabBtn>
          {PRESET_CATEGORIES.map((c) => (
            <TabBtn key={c} active={tab === c} onClick={() => setTab(c)}>
              {c}
            </TabBtn>
          ))}
          <TabBtn active={tab === "My Presets"} onClick={() => setTab("My Presets")}>
            내 프리셋 ({userPresets.length})
          </TabBtn>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* 빈 캔버스 카드 - All 탭에만 표시 */}
            {tab === "All" && (
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

            {tab === "My Presets"
              ? userPresets.map((p) => (
                  <UserPresetCard key={p.id} doc={p} onClick={() => loadUserPreset(p)} />
                ))
              : visible.map((p) => <PresetCard key={p.id} entry={p} onClick={() => loadPreset(p)} />)}

            {tab === "My Presets" && userPresets.length === 0 && (
              <div className="col-span-full text-center text-sm text-neutral-500">
                저장된 내 프리셋이 없습니다. 캔버스에서 작업 후 <strong>툴바 ▸ 프리셋으로 저장</strong>을 사용하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TabBtn({
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
        "rounded-md px-3 py-1.5 text-sm transition",
        active ? "bg-sky-500/20 text-sky-200" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200",
      )}
    >
      {children}
    </button>
  );
}

function PresetCard({ entry, onClick }: { entry: PresetEntry; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex h-44 flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:border-sky-500/60 hover:shadow-[0_0_0_1px_rgba(14,165,233,0.25)]"
    >
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 text-5xl">
        {entry.icon}
      </div>
      <div className="border-t border-neutral-800 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-neutral-100">{entry.name}</div>
          <div className="rounded-sm bg-neutral-800 px-1.5 py-0.5 text-[10px] text-neutral-400">
            {entry.category}
          </div>
        </div>
        <div className="mt-0.5 truncate text-xs text-neutral-500">{entry.description}</div>
      </div>
    </button>
  );
}

function UserPresetCard({ doc, onClick }: { doc: LayoutDocument; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="group flex h-44 flex-col overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-left transition hover:border-sky-500/60"
    >
      <div className="flex flex-1 items-center justify-center text-4xl text-neutral-600">📋</div>
      <div className="border-t border-neutral-800 px-3 py-2">
        <div className="text-sm font-medium text-neutral-100">{doc.title}</div>
        <div className="mt-0.5 text-xs text-neutral-500">
          {new Date(doc.updatedAt).toLocaleString("ko-KR")}
        </div>
      </div>
    </button>
  );
}
