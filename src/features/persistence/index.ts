// 현재 활성 영속성 어댑터 선택
// - 로그인 상태 + Firebase 활성화 시: Firestore 원격 어댑터
// - 그 외: IndexedDB 로컬 어댑터
import { useAuthStore } from "@/features/auth/authStore";
import { firebaseEnabled } from "@/lib/firebase";
import { localAdapter, type PersistenceAdapter } from "./local";
import { createRemoteAdapter } from "./remote";

export function currentAdapter(): PersistenceAdapter {
  const user = useAuthStore.getState().user;
  if (firebaseEnabled && user) return createRemoteAdapter(user.uid);
  return localAdapter;
}

export { localAdapter } from "./local";
export type { PersistenceAdapter } from "./local";
