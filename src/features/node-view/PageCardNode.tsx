// Node View의 커스텀 노드 — 페이지 썸네일 카드
// 카드 헤더(제목 + 삭제) + 본문(축소 미리보기) + 양측 핸들
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { NodeRenderer } from "@/features/canvas/NodeRenderer";

const CARD_WIDTH = 320;
const CARD_HEIGHT = 200;
const PREVIEW_SCALE = 0.2;

// ReactFlow의 NodeProps는 Node 전체 타입을 제네릭 인자로 받는다.
type PageCardRFNode = Node<{ pageId: string }, "pageCard">;

export const PageCardNode = memo(function PageCardNode({
  data,
  selected,
}: NodeProps<PageCardRFNode>) {
  const page = useLayoutStore((s) =>
    s.document.pages.find((p) => p.id === data.pageId),
  );
  const currentPageId = useLayoutStore((s) => s.document.currentPageId);
  const removePage = useLayoutStore((s) => s.removePage);
  const updatePage = useLayoutStore((s) => s.updatePage);

  if (!page) return null;
  const isCurrent = page.id === currentPageId;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md border bg-neutral-950 shadow-lg",
        selected
          ? "border-sky-500 ring-2 ring-sky-500/40"
          : isCurrent
            ? "border-sky-500/50"
            : "border-neutral-800",
      )}
      style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
    >
      <Handle type="target" position={Position.Left} style={{ background: "#0ea5e9" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#0ea5e9" }} />

      {/* 헤더 */}
      <div className="flex items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-2 py-1.5">
        <input
          defaultValue={page.title}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== page.title) updatePage(page.id, { title: next });
          }}
          className="flex-1 truncate bg-transparent text-[11px] font-medium text-neutral-100 focus:outline-none"
          placeholder="Untitled page"
        />
        {isCurrent && (
          <span className="rounded-sm bg-sky-500/20 px-1.5 py-0.5 text-[9px] text-sky-300">
            열림
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`"${page.title}" 페이지를 삭제할까요?`)) removePage(page.id);
          }}
          className="rounded p-0.5 text-neutral-400 hover:bg-rose-950 hover:text-rose-200"
          title="페이지 삭제"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* 축소 썸네일 */}
      <div className="pointer-events-none relative h-[calc(100%-28px)] w-full overflow-hidden bg-neutral-900/40">
        <div
          className="origin-top-left"
          style={{
            transform: `scale(${PREVIEW_SCALE})`,
            width: `${100 / PREVIEW_SCALE}%`,
            height: `${100 / PREVIEW_SCALE}%`,
          }}
        >
          <NodeRenderer node={page.root} depth={0} />
        </div>
      </div>
    </div>
  );
});
