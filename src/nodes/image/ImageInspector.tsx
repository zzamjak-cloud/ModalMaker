// Image Inspector — 파일 첨부(버튼/드래그 앤 드롭) + fit + outline 설정
import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { InspectorSectionProps } from "../types";
import type { ImageProps } from "@/types/layout";
import {
  Field,
  NumberInput,
  SegmentedControl,
  Select,
  TextInput,
} from "@/features/editor/inspector/inspector-ui";
import { ColorPicker } from "@/features/editor/inspector/ColorPicker";
import { logger } from "@/lib/logger";

/** base64 DataURL 최대 크기 경고 임계 (IDB는 이상적으론 작은 게 좋음) */
const MAX_WARN_BYTES = 2 * 1024 * 1024; // 2MB

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result ?? ""));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(file);
  });
}

export function ImageInspector({ props, onChange }: InspectorSectionProps<ImageProps>) {
  const p = props;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function importFile(file: File) {
    if (!file.type.startsWith("image/")) {
      logger.warn("image", "non-image file rejected", { type: file.type });
      return;
    }
    try {
      const dataURL = await readFileAsDataURL(file);
      if (dataURL.length > MAX_WARN_BYTES * 1.4) {
        logger.warn("image", "large image embedded", { sizeKB: Math.round(dataURL.length / 1024) });
      }
      onChange({ src: dataURL });
    } catch (err) {
      logger.error("image", "readFileAsDataURL failed", err);
    }
  }

  return (
    <>
      <Field label="이미지">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={async (e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) await importFile(file);
          }}
          className={cn(
            "flex flex-col items-center gap-1.5 rounded-md border px-3 py-3 text-center transition",
            dragOver
              ? "border-sky-500 bg-sky-500/10"
              : "border-dashed border-neutral-700 bg-neutral-950 hover:border-neutral-600",
          )}
        >
          {p.src ? (
            <div className="relative w-full overflow-hidden rounded-sm border border-neutral-800 bg-neutral-900">
              <img
                src={p.src}
                alt={p.alt ?? ""}
                className="max-h-24 w-full object-contain"
                draggable={false}
              />
              <button
                type="button"
                onClick={() => onChange({ src: undefined })}
                title="이미지 제거"
                className="absolute right-1 top-1 rounded-md border border-neutral-700 bg-neutral-900/90 p-1 text-neutral-300 hover:border-rose-700 hover:text-rose-200"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Upload size={14} />
              드래그 앤 드롭하거나 첨부
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1 text-xs text-neutral-200 hover:border-sky-500/60 hover:bg-neutral-800"
          >
            파일 첨부…
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await importFile(file);
              e.target.value = ""; // 같은 파일 재선택 허용
            }}
          />
        </div>
      </Field>

      <Field label="Alt 텍스트 (선택)">
        <TextInput value={p.alt ?? ""} onChange={(v) => onChange({ alt: v || undefined })} />
      </Field>

      <Field label="Fit">
        <Select
          value={p.fit ?? "cover"}
          options={["cover", "contain", "fill"]}
          onChange={(v) => onChange({ fit: v })}
        />
      </Field>

      <Field label="Outline">
        <SegmentedControl
          value={p.outlineStyle ?? "none"}
          options={[
            { value: "none", label: "없음" },
            { value: "solid", label: "실선" },
            { value: "dashed", label: "대시" },
            { value: "dotted", label: "점선" },
          ]}
          onChange={(v) => onChange({ outlineStyle: v })}
        />
      </Field>

      {p.outlineStyle && p.outlineStyle !== "none" && (
        <>
          <Field label="Outline 두께 (px)">
            <NumberInput
              value={p.outlineWidth ?? 1}
              min={0}
              max={16}
              onChange={(v) => onChange({ outlineWidth: v })}
            />
          </Field>
          <Field label="Outline 색상">
            <ColorPicker
              value={p.outlineColor ?? "#525252"}
              onChange={(v) => onChange({ outlineColor: v })}
            />
          </Field>
        </>
      )}
    </>
  );
}
