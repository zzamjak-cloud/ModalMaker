// IndexedDB 기반 로컬 영속성 어댑터
// Phase 5에서 Firestore로 확장 시 동일한 PersistenceAdapter 인터페이스를 구현하면 스왑 가능.
// 저장/로드는 v2 NodeDocument를 사용하되 레거시 LayoutDocument 형태도 migrateToV2로 승격.
import { createStore, get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import { cloneDocumentWithNewIds } from "@/stores/layoutStore";
import { migrateToV2 } from "@/lib/migrate";
import { logger } from "@/lib/logger";
import type { LayoutDocument, NodeDocument } from "@/types/layout";

// ⚠️ idb-keyval은 createStore를 같은 DB 이름으로 두 번 호출하면 version 1에 먼저 만들어진
// store만 존재해 이후 다른 store 접근 시 "object store not found" 에러가 발생한다.
// 또한 이전 빌드에서 DB가 version 2로 bump된 사용자는 version 1로 여는 현재 코드와 충돌.
// → DB 이름을 v2로 명시적으로 이동. 기존 "modalmaker-db" 데이터는 방치되며 브라우저
// DevTools의 Application → IndexedDB에서 수동 백업 가능.
const DOC_STORE = createStore("modalmaker-v2-docs", "documents");
const PRESET_STORE = createStore("modalmaker-v2-presets", "userPresets");

/** IDB 호출 방어막 — 스토어/DB 손상 시 에러 대신 빈 결과 반환 */
async function safe<T>(label: string, fallback: T, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error("persistence", `${label} failed`, err);
    return fallback;
  }
}

export interface PersistenceAdapter {
  listDocuments(): Promise<NodeDocument[]>;
  saveDocument(doc: NodeDocument): Promise<void>;
  loadDocument(id: string): Promise<NodeDocument | null>;
  duplicateDocument(id: string): Promise<NodeDocument | null>;
  deleteDocument(id: string): Promise<void>;
  // 사용자 프리셋은 레거시 LayoutDocument 호환 형태를 유지 (단일 페이지 스냅샷).
  listUserPresets(): Promise<LayoutDocument[]>;
  saveUserPreset(doc: LayoutDocument): Promise<void>;
  deleteUserPreset(id: string): Promise<void>;
}

type AnyDoc = LayoutDocument | NodeDocument;

async function listAllDocs(
  store: ReturnType<typeof createStore>,
): Promise<NodeDocument[]> {
  const ks = (await idbKeys(store)) as string[];
  const results = await Promise.all(ks.map((k) => idbGet<AnyDoc>(k, store)));
  return results
    .filter((r): r is AnyDoc => !!r)
    .map(migrateToV2)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

async function listAllPresets(
  store: ReturnType<typeof createStore>,
): Promise<LayoutDocument[]> {
  const ks = (await idbKeys(store)) as string[];
  const results = await Promise.all(ks.map((k) => idbGet<LayoutDocument>(k, store)));
  return results
    .filter((r): r is LayoutDocument => !!r)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export const localAdapter: PersistenceAdapter = {
  listDocuments: () => safe("listDocuments", [], () => listAllDocs(DOC_STORE)),

  saveDocument: (doc) =>
    safe("saveDocument", undefined, async () => {
      await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, DOC_STORE);
    }),

  loadDocument: (id) =>
    safe("loadDocument", null, async () => {
      const raw = (await idbGet<AnyDoc>(id, DOC_STORE)) ?? null;
      return raw ? migrateToV2(raw) : null;
    }),

  duplicateDocument: (id) =>
    safe("duplicateDocument", null, async () => {
      const raw = await idbGet<AnyDoc>(id, DOC_STORE);
      if (!raw) return null;
      const src = migrateToV2(raw);
      const copy = cloneDocumentWithNewIds(src, `${src.title} (복제)`);
      await idbSet(copy.id, copy, DOC_STORE);
      return copy;
    }),

  deleteDocument: (id) =>
    safe("deleteDocument", undefined, async () => {
      await idbDel(id, DOC_STORE);
    }),

  listUserPresets: () => safe("listUserPresets", [], () => listAllPresets(PRESET_STORE)),

  saveUserPreset: (doc) =>
    safe("saveUserPreset", undefined, async () => {
      await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, PRESET_STORE);
    }),

  deleteUserPreset: (id) =>
    safe("deleteUserPreset", undefined, async () => {
      await idbDel(id, PRESET_STORE);
    }),
};
