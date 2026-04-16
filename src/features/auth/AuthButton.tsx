// 툴바에 표시할 인증 버튼
// - Firebase 비활성화 시 렌더되지 않음
// - 로그인 시 아바타 + 로그아웃 메뉴, 비로그인 시 "Google 로그인" 버튼
import { useEffect } from "react";
import { LogIn, LogOut } from "lucide-react";
import { cn } from "@/lib/cn";
import { firebaseEnabled } from "@/lib/firebase";
import { useAuthStore } from "./authStore";

export function AuthButton() {
  const init = useAuthStore((s) => s.init);
  const user = useAuthStore((s) => s.user);
  const ready = useAuthStore((s) => s.ready);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const signOut = useAuthStore((s) => s.signOut);

  useEffect(() => {
    init();
  }, [init]);

  if (!firebaseEnabled || !ready) return null;

  if (!user) {
    return (
      <button
        onClick={signInWithGoogle}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-neutral-800 px-2 py-1 text-xs text-neutral-300",
          "hover:border-sky-500/50 hover:bg-neutral-800",
        )}
        title="Google 로그인하여 클라우드 동기화"
      >
        <LogIn size={14} />
        <span>로그인</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.photoURL && (
        <img
          src={user.photoURL}
          alt={user.displayName ?? "user"}
          className="h-6 w-6 rounded-full border border-neutral-700"
        />
      )}
      <span className="max-w-[100px] truncate text-xs text-neutral-300">
        {user.displayName ?? user.email}
      </span>
      <button
        onClick={signOut}
        className="rounded-md border border-neutral-800 p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        title="로그아웃"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
