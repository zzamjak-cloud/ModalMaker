// 저장된 문서 목록에서 하나를 선택해 로드
import type { NodeDocument } from "@/types/layout";

export function LoadDialog({
  docs,
  onClose,
  onLoad,
}: {
  docs: NodeDocument[];
  onClose: () => void;
  onLoad: (d: NodeDocument) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[min(560px,92vw)] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="text-sm font-semibold">저장된 문서</div>
          <button onClick={onClose} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {docs.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-neutral-500">
              저장된 문서가 없습니다.
            </div>
          ) : (
            docs.map((d) => (
              <button
                key={d.id}
                onClick={() => onLoad(d)}
                className="block w-full border-b border-neutral-900 px-4 py-3 text-left text-sm hover:bg-neutral-900"
              >
                <div className="font-medium text-neutral-100">{d.title}</div>
                <div className="text-xs text-neutral-500">
                  {new Date(d.updatedAt).toLocaleString("ko-KR")}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
