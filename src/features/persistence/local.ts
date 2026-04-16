// IndexedDB 기반 로컬 영속성 어댑터
// Phase 5에서 Firestore로 확장 시 동일한 PersistenceAdapter 인터페이스를 구현하면 스왑 가능.
import { createStore, get as idbGet, set as idbSet, del as idbDel, keys as idbKeys } from "idb-keyval";
import { cloneWithNewIds } from "@/stores/layoutStore";
import { newId } from "@/lib/id";
import type { LayoutDocument } from "@/types/layout";

const DOC_STORE = createStore("modalmaker-db", "documents");
const PRESET_STORE = createStore("modalmaker-db", "userPresets");

export interface PersistenceAdapter {
  listDocuments(): Promise<LayoutDocument[]>;
  saveDocument(doc: LayoutDocument): Promise<void>;
  loadDocument(id: string): Promise<LayoutDocument | null>;
  duplicateDocument(id: string): Promise<LayoutDocument | null>;
  deleteDocument(id: string): Promise<void>;
  listUserPresets(): Promise<LayoutDocument[]>;
  saveUserPreset(doc: LayoutDocument): Promise<void>;
  deleteUserPreset(id: string): Promise<void>;
}

async function listAll(store: ReturnType<typeof createStore>): Promise<LayoutDocument[]> {
  const ks = (await idbKeys(store)) as string[];
  const results = await Promise.all(ks.map((k) => idbGet<LayoutDocument>(k, store)));
  return results.filter((r): r is LayoutDocument => !!r).sort((a, b) => b.updatedAt - a.updatedAt);
}

export const localAdapter: PersistenceAdapter = {
  async listDocuments() {
    return listAll(DOC_STORE);
  },
  async saveDocument(doc) {
    await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, DOC_STORE);
  },
  async loadDocument(id) {
    return (await idbGet<LayoutDocument>(id, DOC_STORE)) ?? null;
  },
  async duplicateDocument(id) {
    const src = await idbGet<LayoutDocument>(id, DOC_STORE);
    if (!src) return null;
    const now = Date.now();
    const copy: LayoutDocument = {
      ...src,
      id: newId("doc"),
      title: `${src.title} (복제)`,
      root: cloneWithNewIds(src.root),
      createdAt: now,
      updatedAt: now,
    };
    await idbSet(copy.id, copy, DOC_STORE);
    return copy;
  },
  async deleteDocument(id) {
    await idbDel(id, DOC_STORE);
  },
  async listUserPresets() {
    return listAll(PRESET_STORE);
  },
  async saveUserPreset(doc) {
    await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, PRESET_STORE);
  },
  async deleteUserPreset(id) {
    await idbDel(id, PRESET_STORE);
  },
};
