// Inspector용 컴팩트 컬러 피커
// 네이티브 color input + 최근 사용 8색 + 프리셋 팔레트
import { useRef, useId } from "react";
import { useRecentColors } from "./recentColorsStore";

// Tailwind 기본 스펙트럼에서 추출한 프리셋 팔레트
const PALETTE: string[] = [
  // 기본
  "#ffffff", "#f5f5f5", "#737373", "#404040", "#171717", "#000000",
  // 컬러
  "#ef4444", "#f97316", "#f59e0b", "#eab308",
  "#84cc16", "#22c55e", "#14b8a6", "#06b6d4",
  "#0ea5e9", "#3b82f6", "#8b5cf6", "#a855f7",
  "#ec4899", "#f43f5e",
];

interface Props {
  value?: string;
  onChange: (v: string) => void;
  allowEmpty?: boolean;
}

export function ColorPicker({ value, onChange, allowEmpty = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const { colors: recent, push } = useRecentColors();

  const current = value ?? "";

  function commit(hex: string) {
    onChange(hex);
    push(hex);
  }

  function handleNativeChange(e: React.ChangeEvent<HTMLInputElement>) {
    commit(e.target.value);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v); // 입력 중에는 push 안 함
  }

  function handleTextBlur() {
    if (current && /^#[0-9a-fA-F]{3,8}$/.test(current)) {
      push(current);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* 색상 스와치 + hex 텍스트 입력 */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={id}
          className="h-7 w-7 shrink-0 cursor-pointer overflow-hidden rounded-md border border-neutral-700 shadow-sm"
          style={{ backgroundColor: current || "transparent" }}
          title="클릭하여 색상 선택"
        >
          {!current && (
            <div className="h-full w-full" style={{
              backgroundImage: "linear-gradient(45deg,#888 25%,transparent 25%,transparent 75%,#888 75%),linear-gradient(45deg,#888 25%,transparent 25%,transparent 75%,#888 75%)",
              backgroundSize: "8px 8px",
              backgroundPosition: "0 0,4px 4px",
            }} />
          )}
        </label>
        <input
          ref={inputRef}
          id={id}
          type="color"
          value={current || "#000000"}
          onChange={handleNativeChange}
          className="sr-only"
        />
        <input
          type="text"
          value={current}
          placeholder="#000000"
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          className="min-w-0 flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 font-mono text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
          maxLength={9}
        />
        {allowEmpty && current && (
          <button
            onClick={() => onChange("")}
            className="text-[10px] text-neutral-500 hover:text-neutral-300"
            title="색상 제거"
          >
            ✕
          </button>
        )}
      </div>

      {/* 프리셋 팔레트 */}
      <div className="flex flex-wrap gap-1">
        {PALETTE.map((hex) => (
          <Swatch key={hex} hex={hex} active={current === hex} onClick={() => commit(hex)} />
        ))}
      </div>

      {/* 최근 사용 색상 */}
      {recent.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-neutral-600">최근 사용</span>
          <div className="flex flex-wrap gap-1">
            {recent.map((hex) => (
              <Swatch key={hex} hex={hex} active={current === hex} onClick={() => commit(hex)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Swatch({ hex, active, onClick }: { hex: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={hex}
      className="h-5 w-5 rounded-sm border transition"
      style={{
        backgroundColor: hex,
        borderColor: active ? "#0ea5e9" : "#525252",
        outline: active ? "2px solid #0ea5e9" : undefined,
        outlineOffset: active ? "1px" : undefined,
      }}
    />
  );
}
