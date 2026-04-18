// lucide-react 아이콘을 이름(PascalCase)으로 동적 조회.
// 번들에 전체 아이콘 포함되지만 구현 단순성 우선. 필요 시 dynamic import로 최적화.
import * as LucideIcons from "lucide-react";
import type { ComponentType } from "react";

export type LucideIconComponent = ComponentType<{
  size?: number | string;
  color?: string;
  className?: string;
  strokeWidth?: number;
}>;

export function getLucideIcon(name: string | undefined): LucideIconComponent | null {
  if (!name) return null;
  const Comp = (LucideIcons as Record<string, unknown>)[name];
  if (!Comp || typeof Comp !== "function") return null;
  return Comp as LucideIconComponent;
}

// 자주 쓰는 아이콘 (IconPicker 기본 표시용)
export const POPULAR_ICONS: string[] = [
  "Star","Heart","Home","Settings","User","Users","Search","Bell","Mail","Menu",
  "Plus","Minus","X","Check","Edit","Edit2","Trash2","Save","Download","Upload",
  "Copy","Share2","Link","Image","File","Folder","Calendar","Clock","MapPin","Globe",
  "Camera","Video","Music","Lock","Unlock","Eye","EyeOff","Sun","Moon","Coffee",
  "Gift","Flag","Bookmark","Filter","Tag","MoreHorizontal","ChevronLeft","ChevronRight",
  "ChevronUp","ChevronDown","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Send","Play",
  "Pause","Square","Circle","Info","AlertTriangle","AlertCircle","CheckCircle","HelpCircle",
];

// lucide-react 전체 export 중 컴포넌트로 보이는 이름 목록 (검색용)
export function getAllIconNames(): string[] {
  return Object.keys(LucideIcons).filter((k) => {
    const v = (LucideIcons as Record<string, unknown>)[k];
    return typeof v === "function" && /^[A-Z]/.test(k);
  });
}
