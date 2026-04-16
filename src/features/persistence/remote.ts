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
import { newId } from "@/lib/id";
import { cloneWithNewIds } from "@/stores/layoutStore";
import type { LayoutDocument } from "@/types/layout";
import type { PersistenceAdapter } from "./local";

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
      return snap.docs.map((d) => d.data() as LayoutDocument);
    },
    async saveDocument(doc) {
      const payload: LayoutDocument = { ...doc, ownerUid: uid, updatedAt: Date.now() };
      await setDoc(docRef(userDocs(uid), doc.id), payload);
    },
    async loadDocument(id) {
      const snap = await getDoc(docRef(userDocs(uid), id));
      return snap.exists() ? (snap.data() as LayoutDocument) : null;
    },
    async duplicateDocument(id) {
      const snap = await getDoc(docRef(userDocs(uid), id));
      if (!snap.exists()) return null;
      const src = snap.data() as LayoutDocument;
      const now = Date.now();
      const copy: LayoutDocument = {
        ...src,
        id: newId("doc"),
        title: `${src.title} (복제)`,
        root: cloneWithNewIds(src.root),
        createdAt: now,
        updatedAt: now,
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
