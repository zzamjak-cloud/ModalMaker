// Lucide 아이콘 선택기 - 인라인 확장 popover
// - 선택된 아이콘 미리보기 버튼 클릭 시 그리드 오픈
// - 검색어 없으면 POPULAR_ICONS(~64개), 있으면 전체에서 contains 매칭
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { getAllIconNames, getLucideIcon, POPULAR_ICONS } from "@/features/canvas/lucideLookup";

export function IconPicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (name: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const names = useMemo(() => {
    if (!query.trim()) return POPULAR_ICONS;
    const q = query.trim().toLowerCase();
    return getAllIconNames()
      .filter((n) => n.toLowerCase().includes(q))
      .slice(0, 120);
  }, [query]);

  const Current = getLucideIcon(value);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-left text-sm text-neutral-100 hover:border-sky-500"
      >
        {Current ? <Current size={16} /> : <span className="text-neutral-500">○</span>}
        <span className="flex-1 truncate">{value || "(없음)"}</span>
        <span className="text-[10px] text-neutral-500">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 rounded-md border border-neutral-800 bg-neutral-950 p-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="아이콘 검색 (예: heart, arrow, chevron)"
            className="rounded border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
          />
          <div className="grid max-h-52 grid-cols-8 gap-1 overflow-y-auto">
            {names.map((n) => {
              const Comp = getLucideIcon(n);
              if (!Comp) return null;
              const selected = n === value;
              return (
                <button
                  key={n}
                  type="button"
                  title={n}
                  onClick={() => {
                    onChange(n);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded border text-neutral-300 transition",
                    selected
                      ? "border-sky-500 bg-sky-500/20 text-sky-200"
                      : "border-neutral-800 hover:border-sky-500/60 hover:text-sky-200",
                  )}
                >
                  <Comp size={16} />
                </button>
              );
            })}
          </div>
          {names.length === 0 && (
            <div className="py-2 text-center text-[11px] text-neutral-500">결과 없음</div>
          )}
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="rounded border border-neutral-800 px-2 py-1 text-[10px] text-neutral-400 hover:bg-neutral-900"
          >
            아이콘 제거
          </button>
        </div>
      )}
    </div>
  );
}
