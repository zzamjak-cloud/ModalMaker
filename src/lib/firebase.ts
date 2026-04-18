// Firebase 초기화
// - env 변수가 없으면 `enabled = false` → 웹/데스크톱은 로컬 전용으로 동작
// - 실제 사용 시 .env.local에 VITE_FIREBASE_* 값을 채울 것
import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, type Firestore } from "firebase/firestore";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseEnabled) return null;
  if (!app) app = initializeApp(config);
  return app;
}

export function getFirebaseAuth(): Auth | null {
  const a = getFirebaseApp();
  if (!a) return null;
  if (!authInstance) authInstance = getAuth(a);
  return authInstance;
}

export function getDb(): Firestore | null {
  const a = getFirebaseApp();
  if (!a) return null;
  // ignoreUndefinedProperties: leaf 노드의 children/style 등 optional 필드가
  // undefined 상태로 올 때 Firestore가 예외 던지지 않도록 함.
  if (!dbInstance) dbInstance = initializeFirestore(a, { ignoreUndefinedProperties: true });
  return dbInstance;
}
