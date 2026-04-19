// 공용 툴바 버튼 — disabled/active 상태 스타일 통일
import { cn } from "@/lib/cn";

export function ToolbarButton({
  children,
  onClick,
  disabled,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs transition",
        disabled
          ? "cursor-not-allowed border-neutral-900 text-neutral-600"
          : active
            ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
            : "border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-800",
      )}
    >
      {children}
    </button>
  );
}
