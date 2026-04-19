// 새 페이지 추가 다이얼로그 - 빈 페이지 또는 내장/사용자 프리셋에서 선택
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BUILTIN_PRESETS, type PresetCategory } from "@/features/presets/presetRegistry";
import { cloneWithNewIds } from "@/stores/layoutStore";
import { useLayoutStore } from "@/stores/layoutStore";
import { currentAdapter } from "@/features/persistence";
import { logger } from "@/lib/logger";
import type { LayoutDocument } from "@/types/layout";

const CATEGORIES: PresetCategory[] = ["Confirmation", "Alert", "Info", "Auth", "Form", "Flow", "Utility", "Layout"];

type TabId = "builtin" | "user";

interface Props {
  onClose: () => void;
}

export function AddPageDialog({ onClose }: Props) {
  const addPage = useLayoutStore((s) => s.addPage);
  const pages = useLayoutStore((s) => s.document.pages);
  const [activeTab, setActiveTab] = useState<TabId>("builtin");
  const [activeCategory, setActiveCategory] = useState<PresetCategory | "All">("All");
  const [userPresets, setUserPresets] = useState<LayoutDocument[]>([]);

  useEffect(() => {
    currentAdapter()
      .listUserPresets()
      .then(setUserPresets)
      .catch((err) => logger.error("presets", "listUserPresets failed", err));
  }, []);

  function handleBlank() {
    addPage("Page " + (pages.length + 1));
    onClose();
  }

  function handlePreset(id: string) {
    const entry = BUILTIN_PRESETS.find((p) => p.id === id);
    if (!entry) return;
    const templateRoot = entry.document.pages[0]?.root;
    if (!templateRoot) return;
    addPage(entry.name, cloneWithNewIds(templateRoot));
    onClose();
  }

  function handleUserPreset(doc: LayoutDocument) {
    addPage(doc.title, cloneWithNewIds(doc.root));
    onClose();
  }

  const filtered =
    activeCategory === "All"
      ? BUILTIN_PRESETS
      : BUILTIN_PRESETS.filter((p) => p.category === activeCategory);

  return (
    // 배경 오버레이
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex h-[520px] w-[680px] flex-col rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-3">
          <span className="text-sm font-semibold text-neutral-200">새 페이지 추가</span>
          <button onClick={onClose} className="text-neutral-500 hover:text-neutral-300">
            <X size={16} />
          </button>
        </div>

        {/* 상단 탭: 기본 프리셋 / 내 프리셋 */}
        <div className="flex border-b border-neutral-800 px-4">
          {([["builtin", "기본 프리셋"], ["user", "내 프리셋"]] as [TabId, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === id
                  ? "border-sky-500 text-sky-300"
                  : "border-transparent text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {label}
              {id === "user" && userPresets.length > 0 && (
                <span className="ml-1 rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-400">
                  {userPresets.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 카테고리 탭 (기본 프리셋 탭일 때만) */}
        {activeTab === "builtin" && (
          <div className="flex gap-1 overflow-x-auto border-b border-neutral-800 px-4 py-2">
            {(["All", ...CATEGORIES] as (PresetCategory | "All")[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? "bg-sky-600 text-white"
                    : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* 그리드 */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === "builtin" ? (
            <div className="grid grid-cols-4 gap-3">
              {/* 빈 페이지 옵션 */}
              <button
                onClick={handleBlank}
                className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-neutral-700 p-4 text-center hover:border-sky-500 hover:bg-sky-500/10"
              >
                <span className="text-2xl">＋</span>
                <span className="text-xs font-medium text-neutral-300">빈 페이지</span>
                <span className="text-[10px] text-neutral-500">빈 컨테이너로 시작</span>
              </button>

              {/* 기본 프리셋 카드들 */}
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => handlePreset(entry.id)}
                  className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center hover:border-sky-500/60 hover:bg-neutral-800"
                >
                  <span className="text-2xl">{entry.icon}</span>
                  <span className="text-xs font-medium text-neutral-200 leading-tight">{entry.name}</span>
                  <span className="text-[10px] text-neutral-500 leading-tight">{entry.description}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {userPresets.length === 0 ? (
                <div className="col-span-4 py-12 text-center text-sm text-neutral-500">
                  저장된 사용자 프리셋이 없습니다.
                </div>
              ) : (
                userPresets.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => handleUserPreset(doc)}
                    className="flex flex-col items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center hover:border-sky-500/60 hover:bg-neutral-800"
                  >
                    <span className="text-2xl">⊞</span>
                    <span className="text-xs font-medium text-neutral-200 leading-tight">{doc.title}</span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(doc.updatedAt).toLocaleDateString("ko-KR")}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
