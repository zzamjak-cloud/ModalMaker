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
  | "foldable"; // 접힘 가능한 섹션. children 보유

// 컨테이너/폴딩만 자식을 가진다. 그 외는 leaf.
export const CONTAINER_KINDS: NodeKind[] = ["container", "foldable"];

export function isContainerKind(kind: NodeKind): boolean {
  return CONTAINER_KINDS.includes(kind);
}

// kind별 props 형태 (자유 확장 가능)
export interface ContainerProps {
  direction?: "row" | "column" | "grid";
  gap?: number;
  padding?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  columns?: number; // grid 전용
  label?: string; // Export 시 [Container: <label>] 형태로 노출
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

export type NodeProps =
  | ContainerProps
  | TextProps
  | ButtonProps
  | InputProps
  | CheckboxProps
  | ProgressProps
  | FoldableProps;

export interface LayoutNode {
  id: string; // nanoid
  kind: NodeKind;
  props: NodeProps;
  style?: Partial<CSSProperties>;
  children?: LayoutNode[]; // container/foldable만 사용
}

export interface LayoutDocument {
  id: string;
  title: string;
  root: LayoutNode; // 항상 container 루트
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}
