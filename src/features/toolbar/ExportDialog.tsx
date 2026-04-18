// Export 다이얼로그 — 포맷 선택 + AI 프리픽스 옵션 + 미리보기 + 복사/다운로드
import { useMemo, useState } from "react";
import { Copy, Download, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  EXPORT_FORMAT_EXT,
  EXPORT_FORMAT_LABEL,
  toJson,
  toMarkdown,
  toMermaid,
  type ExportFormat,
} from "@/features/export";
import { saveTextFile } from "@/lib/tauri";
import type { LayoutDocument } from "@/types/layout";

function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "modalmaker"
  );
}

function render(doc: LayoutDocument, format: ExportFormat, includePrompt: boolean): string {
  switch (format) {
    case "json":
      return toJson(doc);
    case "markdown":
      return toMarkdown(doc, { includePrompt });
    case "mermaid":
      return toMermaid(doc);
  }
}

export function ExportDialog({
  doc,
  onClose,
  onFlash,
}: {
  doc: LayoutDocument; // 현재 페이지를 v1 형태로 synthesize한 값
  onClose: () => void;
  onFlash: (msg: string) => void;
}) {
  const [format, setFormat] = useState<ExportFormat>("markdown");
  const [includePrompt, setIncludePrompt] = useState(false);

  const output = useMemo(() => render(doc, format, includePrompt), [doc, format, includePrompt]);

  async function copy() {
    await navigator.clipboard.writeText(output);
    onFlash(`${EXPORT_FORMAT_LABEL[format]} 복사됨`);
    onClose();
  }

  async function download() {
    const filename = `${slug(doc.title)}.${EXPORT_FORMAT_EXT[format]}`;
    await saveTextFile(filename, output);
    onFlash(`${filename} 다운로드`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="flex h-[min(640px,86vh)] w-[min(720px,92vw)] flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="text-sm font-semibold">Export</div>
          <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>

        {/* 옵션 영역 */}
        <div className="flex items-center gap-3 border-b border-neutral-800 px-4 py-2.5">
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
          <label
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition",
              includePrompt
                ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                : "border-neutral-800 text-neutral-400 hover:text-neutral-200",
            )}
            title="AI에 넣기 좋은 프롬프트 프리픽스 포함 (Markdown에서 유효)"
          >
            <input
              type="checkbox"
              checked={includePrompt}
              onChange={(e) => setIncludePrompt(e.target.checked)}
              className="hidden"
            />
            <Sparkles size={12} />
            AI 프롬프트 프리픽스
          </label>
        </div>

        {/* 미리보기 */}
        <div className="flex-1 overflow-hidden p-3">
          <textarea
            value={output}
            readOnly
            spellCheck={false}
            className="h-full w-full resize-none rounded-md border border-neutral-800 bg-neutral-950 p-3 font-mono text-[11px] text-neutral-200 focus:outline-none"
          />
        </div>

        {/* 액션 */}
        <div className="flex justify-end gap-2 border-t border-neutral-800 px-4 py-3">
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-100 hover:bg-neutral-900"
          >
            <Copy size={12} />
            복사
          </button>
          <button
            onClick={download}
            className="inline-flex items-center gap-1.5 rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400"
          >
            <Download size={12} />
            파일로 저장
          </button>
        </div>
      </div>
    </div>
  );
}
