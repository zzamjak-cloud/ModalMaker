// '새 이름으로 저장' 다이얼로그 - Photoshop 스타일 Save As
// 제목 입력 후 확인 시 부모가 새 id로 저장을 처리하도록 콜백 호출.
import { useEffect, useRef, useState } from "react";

export function SaveAsDialog({
  initialTitle,
  onCancel,
  onConfirm,
  label = "새 파일 제목",
}: {
  initialTitle: string;
  onCancel: () => void;
  onConfirm: (title: string) => void;
  label?: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[min(420px,92vw)] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="text-sm font-semibold">다른 이름으로 저장</div>
          <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            {label}
            <input
              ref={ref}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  e.preventDefault();
                  onConfirm(title.trim());
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800"
            >
              취소
            </button>
            <button
              onClick={() => title.trim() && onConfirm(title.trim())}
              disabled={!title.trim()}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
