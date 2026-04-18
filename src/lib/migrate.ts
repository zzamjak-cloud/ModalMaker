// v1 LayoutDocument → v2 NodeDocument 마이그레이션.
// persistence 로드/프리셋 로드 경로에서 호출된다.
import { newId } from "@/lib/id";
import type { LayoutDocument, NodeDocument, Page } from "@/types/layout";

export function migrateToV2(doc: LayoutDocument | NodeDocument): NodeDocument {
  if ((doc as NodeDocument).schemaVersion === 2) {
    return doc as NodeDocument;
  }
  const legacy = doc as LayoutDocument;
  const pageId = newId("page");
  const page: Page = {
    id: pageId,
    title: legacy.title || "Page 1",
    root: legacy.root,
    position: { x: 0, y: 0 },
    viewport: legacy.viewport,
  };
  return {
    id: legacy.id,
    title: legacy.title,
    pages: [page],
    modules: [],
    edges: [],
    currentPageId: pageId,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
    ownerUid: legacy.ownerUid,
    schemaVersion: 2,
  };
}
