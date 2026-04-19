// 뷰포트 프리셋 드롭다운 + Custom 입력 + Safe Area % 입력
import { useState, useEffect } from "react";
import { Monitor } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore, currentPage } from "@/stores/layoutStore";
import { type ViewportSettings } from "@/types/layout";

type Preset = ViewportSettings["preset"];

const PRESET_LABEL: Record<Preset, string> = {
  free: "Free",
  desktop: "Desktop 1920×1080",
  laptop: "Laptop 1440×900",
  tablet: "Tablet 768×1024",
  mobile: "Mobile 375×812",
  custom: "Custom (W+H)",
  "custom-w": "Custom W only",
};

export function ViewportSelector() {
  const viewport =
    useLayoutStore((s) => currentPage(s.document)?.viewport) ??
    ({ preset: "free" as Preset });
  const updateViewport = useLayoutStore((s) => s.updateViewport);

  const preset = viewport.preset;
  const isCustom = preset === "custom";
  const isCustomW = preset === "custom-w";
  const customW = viewport.width ?? 1280;
  const customH = viewport.height ?? 720;
  const safe = viewport.safeAreaPct ?? 0;

  return (
    <div className="flex items-center gap-2">
      <Monitor size={14} className="text-neutral-400" />
      <select
        value={preset}
        onChange={(e) => updateViewport({ preset: e.target.value as Preset })}
        className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      >
        {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
          <option key={p} value={p}>
            {PRESET_LABEL[p]}
          </option>
        ))}
      </select>

      {(isCustom || isCustomW) && (
        <NumberField
          label="W"
          value={customW}
          min={100}
          max={4096}
          onChange={(v) => updateViewport({ width: v })}
        />
      )}
      {isCustom && (
        <NumberField
          label="H"
          value={customH}
          min={100}
          max={4096}
          onChange={(v) => updateViewport({ height: v })}
        />
      )}

      <NumberField
        label="Safe%"
        value={safe}
        min={0}
        max={20}
        onChange={(v) => updateViewport({ safeAreaPct: v })}
      />
    </div>
  );
}

// 입력 중에는 draft를 유지하고, blur 또는 Enter 시에만 store에 커밋.
// 이로써 매 keystroke마다 fitTrigger가 변경되어 zoom이 리셋되는 현상을 방지.
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  // 외부 값(store)이 바뀌면 draft 동기화 (blur 커밋 이후)
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  function commit() {
    const n = Number(draft);
    if (!Number.isFinite(n)) { setDraft(String(value)); return; }
    const clamped = Math.round(Math.max(min ?? 1, Math.min(max ?? 9999, n)));
    onChange(clamped);
    setDraft(String(clamped));
  }

  return (
    <label className={cn("flex items-center gap-1 text-[10px] text-neutral-400")}>
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
        className="w-14 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
}
