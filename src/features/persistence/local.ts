// IndexedDB 기반 로컬 영속성 어댑터
// Phase 5에서 Firestore로 확장 시 동일한 PersistenceAdapter 인터페이스를 구현하면 스왑 가능.
// 저장/로드는 v2 NodeDocument를 사용하되 레거시 LayoutDocument 형태도 migrateToV2로 승격.
import { createStore, get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import { cloneDocumentWithNewIds } from "@/stores/layoutStore";
import { migrateToV2 } from "@/lib/migrate";
import type { LayoutDocument, NodeDocument } from "@/types/layout";

const DOC_STORE = createStore("modalmaker-db", "documents");
const PRESET_STORE = createStore("modalmaker-db", "userPresets");

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
  async listDocuments() {
    return listAllDocs(DOC_STORE);
  },
  async saveDocument(doc) {
    await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, DOC_STORE);
  },
  async loadDocument(id) {
    const raw = (await idbGet<AnyDoc>(id, DOC_STORE)) ?? null;
    return raw ? migrateToV2(raw) : null;
  },
  async duplicateDocument(id) {
    const raw = await idbGet<AnyDoc>(id, DOC_STORE);
    if (!raw) return null;
    const src = migrateToV2(raw);
    const copy = cloneDocumentWithNewIds(src, `${src.title} (복제)`);
    await idbSet(copy.id, copy, DOC_STORE);
    return copy;
  },
  async deleteDocument(id) {
    await idbDel(id, DOC_STORE);
  },
  async listUserPresets() {
    return listAllPresets(PRESET_STORE);
  },
  async saveUserPreset(doc) {
    await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, PRESET_STORE);
  },
  async deleteUserPreset(id) {
    await idbDel(id, PRESET_STORE);
  },
};
