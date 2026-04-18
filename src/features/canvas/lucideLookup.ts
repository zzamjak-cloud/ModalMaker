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

// lucide-react 아이콘은 React.forwardRef 결과라 typeof가 "object"이므로
// function만 허용하면 null 반환 → 전체 아이콘 미렌더. forwardRef/memo/function 모두 허용.
export function getLucideIcon(name: string | undefined): LucideIconComponent | null {
  if (!name) return null;
  const Comp = (LucideIcons as Record<string, unknown>)[name];
  if (!Comp) return null;
  const t = typeof Comp;
  if (t !== "function" && t !== "object") return null;
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
// forwardRef 아이콘은 object 타입이므로 function+object 둘 다 허용.
// 'Icon'/'LucideIcon' 등 일반 재노출 이름과 'Lucide'/'Create' 접두 팩토리는 제외.
const EXCLUDED = new Set(["Icon", "LucideIcon"]);
export function getAllIconNames(): string[] {
  return Object.keys(LucideIcons).filter((k) => {
    if (!/^[A-Z]/.test(k)) return false;
    if (EXCLUDED.has(k)) return false;
    if (k.startsWith("Lucide") || k.startsWith("Create")) return false;
    // lucide-react 0.460+는 'XxxIcon' 별칭을 동일 컴포넌트로 중복 export한다.
    // 정식 이름(별칭 없는 쪽)만 남기기 위해 "Icon"으로 끝나면서 접미사 제거 시
    // 같은 export가 존재하는 경우는 제외한다.
    if (k.endsWith("Icon") && k.length > 4) {
      const base = k.slice(0, -4);
      if (base in LucideIcons) return false;
    }
    const v = (LucideIcons as Record<string, unknown>)[k];
    if (!v) return false;
    const t = typeof v;
    return t === "function" || t === "object";
  });
}
