// Toolbar에서 쓰이는 작은 순수 함수들
import { currentPage } from "@/stores/layoutStore";
import type { LayoutDocument, NodeDocument } from "@/types/layout";

/**
 * 현재 페이지를 v1 LayoutDocument 형태로 synthesize.
 * Export 함수들이 아직 v1 입력을 받기 때문에 필요한 어댑터.
 */
export function currentPageAsLayoutDoc(doc: NodeDocument): LayoutDocument {
  const page = currentPage(doc) ?? doc.pages[0];
  return {
    id: doc.id,
    title: page?.title ?? doc.title,
    root: page?.root ?? {
      id: "empty",
      kind: "container",
      props: { direction: "column", gap: 0, padding: 0, label: "Empty" },
      children: [],
    },
    viewport: page?.viewport,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    ownerUid: doc.ownerUid,
  };
}

/** 사용자에게 보여줄 짧은 에러 메시지로 정규화 */
export function readableError(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.includes("permission")) return "권한 오류 (rules/로그인 확인)";
    if (err.message.includes("Unsupported field value")) return "지원하지 않는 필드 값";
    return err.message.slice(0, 80);
  }
  return String(err).slice(0, 80);
}
