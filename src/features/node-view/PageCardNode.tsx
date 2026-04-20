// Node View의 커스텀 노드 — 페이지 썸네일 카드
// 카드 크기는 페이지 뷰포트 비율에 맞춰 자동 계산된다.
// 팝업 페이지는 메인 페이지와 동일한 카드 크기를 사용하며, 딤 배경 위에 팝업 콘텐츠를 중앙 배치한다.
import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { NodeRenderer } from "@/features/canvas/NodeRenderer";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";

const HEADER_H = 24;
const COMMENT_H = 32;
const MAX_PREVIEW_W = 280;
const MAX_PREVIEW_H = 220;

const FREE_VIRTUAL_W = 1280;
const FREE_VIRTUAL_H = 960;

function resolveContentSize(viewport?: ViewportSettings): { w: number; h: number; isFree: boolean } {
  const isFree = !viewport || viewport.preset === "free";
  if (isFree) return { w: FREE_VIRTUAL_W, h: FREE_VIRTUAL_H, isFree: true };
  if (viewport!.preset === "custom") {
    return { w: viewport!.width ?? 1280, h: viewport!.height ?? 720, isFree: false };
  }
  if (viewport!.preset === "custom-w") {
    // Width 고정 + Height 자유: 썸네일은 4:3 비율로 대체
    const w = viewport!.width ?? 1280;
    return { w, h: Math.round(w * 0.75), isFree: false };
  }
  const p = VIEWPORT_PRESETS[viewport!.preset as keyof typeof VIEWPORT_PRESETS];
  return { w: p.width, h: p.height, isFree: false };
}

// 뷰포트 비율에 맞는 카드 미리보기 크기 계산
function resolvePreviewSize(viewport?: ViewportSettings): {
  cardW: number; previewH: number; contentW: number; contentH: number; scale: number; isFree: boolean;
} {
  const { w: contentW, h: contentH, isFree } = resolveContentSize(viewport);
  const ratio = contentW / contentH;

  let previewW = MAX_PREVIEW_W;
  let previewH = previewW / ratio;
  if (previewH > MAX_PREVIEW_H) {
    previewH = MAX_PREVIEW_H;
    previewW = previewH * ratio;
  }

  return {
    cardW: Math.round(previewW),
    previewH: Math.round(previewH),
    contentW,
    contentH,
    scale: previewW / contentW,
    isFree,
  };
}

type PageCardRFNode = Node<{ pageId: string; isDuplicating?: boolean }, "pageCard">;

export const PageCardNode = memo(function PageCardNode({
  data,
  selected,
  dragging,
}: NodeProps<PageCardRFNode>) {
  const isDuplicating = data.isDuplicating ?? false;
  const page = useLayoutStore((s) =>
    s.document.pages.find((p) => p.id === data.pageId),
  );
  const currentPageId = useLayoutStore((s) => s.document.currentPageId);
  // 팝업 카드의 backdrop 크기를 메인 페이지 기준으로 맞추기 위해 첫 번째 비팝업 페이지 조회
  const rootPageViewport = useLayoutStore((s) =>
    s.document.pages.find((p) => !p.isPopup)?.viewport,
  );
  const removePage = useLayoutStore((s) => s.removePage);
  const updatePage = useLayoutStore((s) => s.updatePage);
  const setRootPage = useLayoutStore((s) => s.setRootPage);

  if (!page) return null;
  const isCurrent = page.id === currentPageId;

  // 팝업: backdrop은 루트 페이지 비율, 팝업 콘텐츠는 팝업 자체 비율로 중앙 배치
  // 일반: 자신의 뷰포트 비율로 카드 크기 결정
  const backdropSize = resolvePreviewSize(page.isPopup ? rootPageViewport : page.viewport);
  const { cardW, previewH, isFree } = backdropSize;
  const cardH = previewH + HEADER_H + COMMENT_H;

  // 팝업 콘텐츠 크기: 팝업 자체 뷰포트, backdrop의 65%×70% 안에 맞게 축소
  let popupSlot: { contentW: number; contentH: number; popW: number; popH: number; popScale: number } | null = null;
  if (page.isPopup) {
    const { w: contentW, h: contentH } = resolveContentSize(page.viewport);
    const ratio = contentW / contentH;
    const maxW = cardW * 0.65;
    const maxH = previewH * 0.70;
    let popW = maxW;
    let popH = popW / ratio;
    if (popH > maxH) { popH = maxH; popW = popH * ratio; }
    popupSlot = { contentW, contentH, popW: Math.round(popW), popH: Math.round(popH), popScale: popW / contentW };
  }

  const cardClass = cn(
    "relative overflow-hidden rounded-md border bg-neutral-950 shadow-lg transition-shadow",
    isDuplicating
      ? "border-violet-400 shadow-2xl shadow-violet-500/30 opacity-80 ring-2 ring-violet-400/60"
      : dragging
        ? "border-sky-400 shadow-2xl shadow-sky-500/30 opacity-90 ring-2 ring-sky-400/50"
        : selected
          ? "border-sky-500 ring-2 ring-sky-500/40"
          : isCurrent
            ? "border-sky-500/50"
            : "border-neutral-800",
  );

  return (
    <div className={cardClass} style={{ width: cardW, height: cardH }}>
      <Handle type="target" position={Position.Left} style={{ background: "#0ea5e9" }} />
      <Handle type="source" position={Position.Right} style={{ background: "#0ea5e9" }} />

      {/* 헤더 — 제목 / Root / Popup / 삭제 (컴팩트) */}
      <div className="flex items-center gap-1 border-b border-neutral-800 bg-neutral-900 px-1.5" style={{ height: HEADER_H }}>
        <input
          defaultValue={page.title}
          onBlur={(e) => {
            const next = e.target.value.trim();
            if (next && next !== page.title) updatePage(page.id, { title: next });
          }}
          className="flex-1 truncate bg-transparent text-[10px] font-medium text-neutral-100 focus:outline-none"
          placeholder="Untitled"
        />
        <label
          className="flex cursor-pointer items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
          title="Root 페이지(시작 페이지)로 지정 — 한 문서에 하나만"
        >
          <input
            type="checkbox"
            checked={page.isRoot ?? false}
            onChange={(e) => {
              if (e.target.checked) setRootPage(page.id);
              else updatePage(page.id, { isRoot: false });
            }}
            className="h-2.5 w-2.5 cursor-pointer accent-sky-400"
          />
          <span className="text-[9px] text-neutral-400">Root</span>
        </label>
        <label
          className="flex cursor-pointer items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
          title="팝업 페이지 — 프리뷰에서 이전 페이지 위에 오버레이로 표시"
        >
          <input
            type="checkbox"
            checked={page.isPopup ?? false}
            onChange={(e) => updatePage(page.id, { isPopup: e.target.checked })}
            className="h-2.5 w-2.5 cursor-pointer accent-violet-400"
          />
          <span className="text-[9px] text-neutral-400">Popup</span>
        </label>
        {isFree && (
          <span className="rounded-sm bg-neutral-700/60 px-1 py-0.5 text-[8px] text-neutral-400">Free</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(`"${page.title}" 페이지를 삭제할까요?`)) removePage(page.id); }}
          className="rounded p-0.5 text-neutral-400 hover:bg-rose-950 hover:text-rose-200"
          title="페이지 삭제"
        >
          <Trash2 size={10} />
        </button>
      </div>

      {/* Alt+드래그 복제 피드백 오버레이 */}
      {isDuplicating && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-violet-900/40">
          <span className="rounded-md bg-violet-500 px-2 py-1 text-[10px] font-bold text-white shadow">
            복제 중
          </span>
        </div>
      )}

      {/* 썸네일 영역 */}
      <div className="pointer-events-none relative w-full overflow-hidden bg-neutral-900/40" style={{ height: previewH }}>
        {popupSlot ? (
          // 팝업: backdrop(루트 페이지 비율) 위에 딤 처리 + 팝업 콘텐츠 중앙 배치
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }}>
            <div style={{ width: popupSlot.popW, height: popupSlot.popH, position: "relative", overflow: "hidden", borderRadius: 4, boxShadow: "0 4px 20px rgba(0,0,0,0.6)" }}>
              <div style={{
                position: "absolute", top: 0, left: 0,
                width: popupSlot.contentW, height: popupSlot.contentH,
                transformOrigin: "top left",
                transform: `scale(${popupSlot.popScale})`,
                display: "flex", flexDirection: "column",
              }}>
                <NodeRenderer node={page.root} depth={0} parentIsFlexContainer parentDirection="column" />
              </div>
            </div>
          </div>
        ) : (
          // 일반: 뷰포트 크기로 렌더 후 scale 축소
          <div style={{
            position: "absolute", top: 0, left: 0,
            width: backdropSize.contentW, height: backdropSize.contentH,
            transformOrigin: "top left",
            transform: `scale(${backdropSize.scale})`,
            display: "flex", flexDirection: "column",
          }}>
            <NodeRenderer node={page.root} depth={0} parentIsFlexContainer parentDirection="column" />
          </div>
        )}
      </div>

      {/* 페이지 하단 코멘트 영역 */}
      <div
        className="border-t border-neutral-800 bg-neutral-900/70 px-2 py-1"
        style={{ height: COMMENT_H }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          defaultValue={page.comment ?? ""}
          onBlur={(e) => {
            const next = e.target.value;
            if (next !== (page.comment ?? "")) updatePage(page.id, { comment: next });
          }}
          placeholder="페이지 메모 (선택)"
          className="w-full bg-transparent text-[10px] leading-none text-neutral-300 placeholder:text-neutral-600 focus:outline-none"
          title={page.comment}
        />
      </div>
    </div>
  );
});
