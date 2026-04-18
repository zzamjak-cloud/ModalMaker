// Firestore 기반 원격 영속성 어댑터
// 스키마: /users/{uid}/documents/{docId}, /users/{uid}/presets/{presetId}
import {
  collection,
  deleteDoc,
  doc as docRef,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { cloneDocumentWithNewIds } from "@/stores/layoutStore";
import { migrateToV2 } from "@/lib/migrate";
import type { LayoutDocument, NodeDocument } from "@/types/layout";
import type { PersistenceAdapter } from "./local";

type AnyDoc = LayoutDocument | NodeDocument;

function userDocs(uid: string) {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  return collection(db, "users", uid, "documents");
}

function userPresets(uid: string) {
  const db = getDb();
  if (!db) throw new Error("Firebase not initialized");
  return collection(db, "users", uid, "presets");
}

export function createRemoteAdapter(uid: string): PersistenceAdapter {
  return {
    async listDocuments() {
      const q = query(userDocs(uid), orderBy("updatedAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => migrateToV2(d.data() as AnyDoc));
    },
    async saveDocument(doc) {
      const payload: NodeDocument = { ...doc, ownerUid: uid, updatedAt: Date.now() };
      await setDoc(docRef(userDocs(uid), doc.id), payload);
    },
    async loadDocument(id) {
      const snap = await getDoc(docRef(userDocs(uid), id));
      return snap.exists() ? migrateToV2(snap.data() as AnyDoc) : null;
    },
    async duplicateDocument(id) {
      const snap = await getDoc(docRef(userDocs(uid), id));
      if (!snap.exists()) return null;
      const src = migrateToV2(snap.data() as AnyDoc);
      const copy: NodeDocument = {
        ...cloneDocumentWithNewIds(src, `${src.title} (복제)`),
        ownerUid: uid,
      };
      await setDoc(docRef(userDocs(uid), copy.id), copy);
      return copy;
    },
    async deleteDocument(id) {
      await deleteDoc(docRef(userDocs(uid), id));
    },
    async listUserPresets() {
      const q = query(userPresets(uid), orderBy("updatedAt", "desc"));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as LayoutDocument);
    },
    async saveUserPreset(doc) {
      const payload: LayoutDocument = { ...doc, ownerUid: uid, updatedAt: Date.now() };
      await setDoc(docRef(userPresets(uid), doc.id), payload);
    },
    async deleteUserPreset(id) {
      await deleteDoc(docRef(userPresets(uid), id));
    },
  };
}
