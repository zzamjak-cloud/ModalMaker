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
  | "icon" // Lucide 아이콘 leaf
  | "module-ref"; // 모듈 인스턴스 (내부 편집 불가, 원본만 수정)

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

export interface ModuleRefProps {
  moduleId: string;   // NodeDocument.modules의 id
  label?: string;     // 레이어 트리/보조 표기
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
  | IconProps
  | ModuleRefProps;

// 모든 노드에 공용 적용되는 크기 제어.
// 레거시 fixedSize=true는 widthFixed·heightFixed가 없을 때 양축 모두 고정으로 간주.
export interface SizingProps {
  /** @deprecated widthFixed/heightFixed로 대체 */
  fixedSize?: boolean;
  /** true면 width(px) 고정, false/undefined면 가로는 내용·플렉스에 따름 */
  widthFixed?: boolean;
  /** true면 height(px) 고정 */
  heightFixed?: boolean;
  width?: number;
  height?: number;
}

export interface LayoutNode {
  id: string; // nanoid
  kind: NodeKind;
  props: NodeProps;
  sizing?: SizingProps; // 공용 고정 크기
  /**
   * Flex 컨테이너의 직계 자식일 때만 의미 있음.
   * push-end: 주축 끝 방향으로 margin:auto (예: row에서 우측 정렬)
   * push-start: 주축 시작 방향으로 margin:auto
   */
  flexMainAxis?: "push-end" | "push-start";
  style?: Partial<CSSProperties>;
  children?: LayoutNode[]; // container/foldable만 사용
}

// ⚠️ Legacy v1 스키마. 저장 경로에서는 더 이상 직접 쓰이지 않으며
// 로드 시 migrateToV2()로 NodeDocument로 변환된다. 타입 자체는 마이그레이션
// 입력 형태로만 유지.
export interface LayoutDocument {
  id: string;
  title: string;
  root: LayoutNode; // 항상 container 루트
  viewport?: ViewportSettings; // 뷰포트(해상도) 설정
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}

// 단일 페이지 + 루트 컨테이너 (Node View의 카드 하나에 대응)
export interface Page {
  id: string;
  title: string;
  root: LayoutNode;
  position: { x: number; y: number }; // Node View 2D 좌표
  viewport?: ViewportSettings;        // 페이지별 Canvas 해상도
}

// 공용 컴포넌트(헤더/사이드바 등). 원본만 수정하면 모든 module-ref에 반영.
export interface Module {
  id: string;
  name: string;
  root: LayoutNode; // Container 루트 권장
}

// 페이지 간 연결 (수동 + Phase B에서 인터렉션 기반 자동 생성)
export interface PageEdge {
  id: string;
  source: string;       // sourcePageId
  sourceHandle?: string; // Phase B에서 버튼 노드 id
  target: string;       // targetPageId
  label?: string;
}

// 최상위 문서 (v2). 여러 페이지 + 모듈 + 엣지를 묶는다.
export interface NodeDocument {
  id: string;
  title: string;
  pages: Page[];
  modules: Module[];
  edges: PageEdge[];
  currentPageId: string;
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
  schemaVersion: 2;
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
