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

/**
 * 기존 'modalmaker-db' DB에서 문서·프리셋을 신규 v2 DB로 일회성 마이그레이션.
 * idb-keyval 경유 시 version 충돌로 실패하므로 raw IndexedDB API를 직접 사용.
 * 신규 DB에 이미 데이터가 있으면 skip (사용자가 이미 새로 저장함).
 */
let legacyMigrationPromise: Promise<void> | null = null;
function ensureLegacyMigrated(): Promise<void> {
  if (!legacyMigrationPromise) legacyMigrationPromise = migrateLegacy();
  return legacyMigrationPromise;
}

async function migrateLegacy(): Promise<void> {
  try {
    // 신규 DB에 데이터가 있으면 이미 사용자가 새로 작업 중 → skip
    const [existingDocs, existingPresets] = await Promise.all([
      safe("docs count", [], () => idbKeys(DOC_STORE) as Promise<string[]>),
      safe("presets count", [], () => idbKeys(PRESET_STORE) as Promise<string[]>),
    ]);
    if (existingDocs.length > 0 && existingPresets.length > 0) return;

    const legacyDB = await openRawDB("modalmaker-db");
    if (!legacyDB) return;

    let migratedDocs = 0;
    let migratedPresets = 0;
    try {
      if (existingDocs.length === 0 && legacyDB.objectStoreNames.contains("documents")) {
        const items = await readAllFromStore(legacyDB, "documents");
        for (const raw of items) {
          if (raw && typeof (raw as { id?: unknown }).id === "string") {
            const id = (raw as { id: string }).id;
            await safe("migrate doc", undefined, async () => {
              await idbSet(id, raw, DOC_STORE);
              migratedDocs++;
            });
          }
        }
      }
      if (existingPresets.length === 0 && legacyDB.objectStoreNames.contains("userPresets")) {
        const items = await readAllFromStore(legacyDB, "userPresets");
        for (const raw of items) {
          if (raw && typeof (raw as { id?: unknown }).id === "string") {
            const id = (raw as { id: string }).id;
            await safe("migrate preset", undefined, async () => {
              await idbSet(id, raw, PRESET_STORE);
              migratedPresets++;
            });
          }
        }
      }
    } finally {
      legacyDB.close();
    }
    if (migratedDocs + migratedPresets > 0) {
      logger.info(
        "persistence",
        `legacy migration: ${migratedDocs} docs, ${migratedPresets} presets from modalmaker-db`,
      );
    }
  } catch (err) {
    logger.error("persistence", "legacy migration failed", err);
  }
}

/** version 지정 없이 IndexedDB를 열어 기존 DB의 현재 version을 그대로 사용 */
function openRawDB(dbName: string): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(dbName);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
      req.onupgradeneeded = () => {
        // 기존 DB가 존재하지 않으면 빈 DB가 생성됨 — 그대로 resolve
      };
    } catch {
      resolve(null);
    }
  });
}

function readAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result ?? []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
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
  listDocuments: () =>
    safe("listDocuments", [], async () => {
      await ensureLegacyMigrated();
      return listAllDocs(DOC_STORE);
    }),

  saveDocument: (doc) =>
    safe("saveDocument", undefined, async () => {
      await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, DOC_STORE);
    }),

  loadDocument: (id) =>
    safe("loadDocument", null, async () => {
      await ensureLegacyMigrated();
      const raw = (await idbGet<AnyDoc>(id, DOC_STORE)) ?? null;
      return raw ? migrateToV2(raw) : null;
    }),

  duplicateDocument: (id) =>
    safe("duplicateDocument", null, async () => {
      await ensureLegacyMigrated();
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

  listUserPresets: () =>
    safe("listUserPresets", [], async () => {
      await ensureLegacyMigrated();
      return listAllPresets(PRESET_STORE);
    }),

  saveUserPreset: (doc) =>
    safe("saveUserPreset", undefined, async () => {
      await idbSet(doc.id, { ...doc, updatedAt: Date.now() }, PRESET_STORE);
    }),

  deleteUserPreset: (id) =>
    safe("deleteUserPreset", undefined, async () => {
      await idbDel(id, PRESET_STORE);
    }),
};
