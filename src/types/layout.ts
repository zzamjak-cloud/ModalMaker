// ModalMaker 핵심 데이터 타입
// 모든 UI 블록을 동일 노드 형태로 표현 → 재귀 렌더링 / 재귀 직렬화 단일 처리.

import type { CSSProperties } from "react";

export type NodeKind =
  | "container" // 자식을 담는 래퍼. direction으로 row/column/grid 선택
  | "text"
  | "button"
  | "input"
  | "checkbox"
  | "progress"
  | "split" // 구분선 (solid/dashed/dotted, 가로/세로)
  | "foldable" // 접힘 가능한 섹션. children 보유
  | "icon"; // Lucide 아이콘 leaf

// 컨테이너/폴딩만 자식을 가진다. 그 외는 leaf.
export const CONTAINER_KINDS: NodeKind[] = ["container", "foldable"];

export function isContainerKind(kind: NodeKind): boolean {
  return CONTAINER_KINDS.includes(kind);
}

// kind별 props 형태 (자유 확장 가능)
export interface ContainerProps {
  direction?: "row" | "column" | "grid";
  gap?: number;
  // Padding: uniformPadding=true(기본)이면 padding 한 값을 전 방향에 적용,
  // false면 paddingTop/Right/Bottom/Left 개별 값 사용.
  uniformPadding?: boolean;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  columns?: number; // grid 전용
  label?: string; // Export 시 [Container: <label>] 형태로 노출

  // Container 자체의 경계선
  borderStyle?: "none" | "solid" | "dashed" | "dotted"; // 기본 "none"
  borderWidth?: number; // 기본 1, 허용 범위 0~8
  borderColor?: string; // 기본 "#525252"
}

export interface TextProps {
  text: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  weight?: "normal" | "medium" | "bold";
  color?: string;
}

export interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "destructive" | "ghost";
  size?: "sm" | "md" | "lg";
  iconName?: string;                 // Lucide 아이콘 이름 (선택)
  iconPosition?: "left" | "right";   // 기본 "left"
}

export interface InputProps {
  placeholder?: string;
  type?: "text" | "email" | "password" | "number";
  label?: string;
  value?: string;
}

export interface CheckboxProps {
  label: string;
  checked?: boolean;
}

export interface ProgressProps {
  value: number;
  max?: number;
  label?: string;
}

export interface FoldableProps {
  title: string;
  open?: boolean;
}

export interface SplitProps {
  orientation?: "horizontal" | "vertical";
  style?: "solid" | "dashed" | "dotted";
  thickness?: number;
  color?: string;
  label?: string;
}

export interface IconProps {
  name: string;    // Lucide 아이콘의 PascalCase 이름 (예: "Star", "Heart", "Settings")
  size?: number;   // 기본 20
  color?: string;  // hex, 기본 currentColor
}

export type NodeProps =
  | ContainerProps
  | TextProps
  | ButtonProps
  | InputProps
  | CheckboxProps
  | ProgressProps
  | SplitProps
  | FoldableProps
  | IconProps;

// 모든 노드에 공용 적용되는 고정 크기 제어.
// fixedSize=false(기본) 혹은 undefined면 자동 크기.
export interface SizingProps {
  fixedSize?: boolean;
  width?: number;  // px, fixedSize=true일 때만 적용
  height?: number; // px, fixedSize=true일 때만 적용
}

export interface LayoutNode {
  id: string; // nanoid
  kind: NodeKind;
  props: NodeProps;
  sizing?: SizingProps; // 공용 고정 크기
  style?: Partial<CSSProperties>;
  children?: LayoutNode[]; // container/foldable만 사용
}

export interface LayoutDocument {
  id: string;
  title: string;
  root: LayoutNode; // 항상 container 루트
  viewport?: ViewportSettings; // 뷰포트(해상도) 설정
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}

export interface ViewportSettings {
  preset: "free" | "desktop" | "laptop" | "tablet" | "mobile" | "custom";
  width?: number;   // preset="custom"일 때만 사용
  height?: number;  // preset="custom"일 때만 사용
  safeAreaPct?: number; // 0~20, 기본 0
}

export const VIEWPORT_PRESETS = {
  desktop: { width: 1920, height: 1080 },
  laptop:  { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
} as const;
