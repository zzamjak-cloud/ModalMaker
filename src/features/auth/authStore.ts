// 인증 상태 전역 스토어
// - Firebase Auth 초기화 후 onAuthStateChanged로 동기화
// - Firebase 비활성화 시 user는 항상 null
import { create } from "zustand";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as fbSignOut,
  type User,
} from "firebase/auth";
import { firebaseEnabled, getFirebaseAuth } from "@/lib/firebase";

interface AuthState {
  user: User | null;
  ready: boolean;
  init: () => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  ready: !firebaseEnabled, // Firebase 비활성화 시 즉시 ready
  init: () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      set({ ready: true });
      return;
    }
    onAuthStateChanged(auth, (u) => set({ user: u, ready: true }));
  },
  signInWithGoogle: async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await signInWithPopup(auth, new GoogleAuthProvider());
  },
  signOut: async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    await fbSignOut(auth);
  },
}));
