// 노드 타입 레지스트리 — NodeDescriptor
// 각 NodeKind는 자신의 렌더러·Inspector·직렬화 등을 descriptor로 등록한다.
// 렌더 호스트(NodeRenderer/PreviewRenderer)는 공통 프레임(선택·DnD·인터렉션)만 담당하고
// 내부 콘텐츠는 descriptor.Leaf로 위임 → 신규 kind 추가 비용이 1개 모듈로 축소.

import type { ComponentType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { LayoutNode, NodeKind, NodeProps } from "@/types/layout";
import type { ThemeTokens } from "@/features/preview/themes";

/** 리프 렌더 컨텍스트 — 호스트(NodeRenderer/PreviewRenderer)가 전달 */
export interface LeafRenderProps {
  node: LayoutNode;
  /** 렌더 모드: 캔버스 편집 vs 프리뷰 실행 */
  mode: "canvas" | "preview";
  /** 프리뷰 테마 토큰 (mode="preview"일 때만 전달) */
  theme?: ThemeTokens;
}

/** Inspector 섹션 컨텍스트 */
export interface InspectorSectionProps<P extends NodeProps = NodeProps> {
  node: LayoutNode;
  props: P;
  /** 선택 노드의 props에 patch 적용 */
  onChange: (patch: Partial<P>) => void;
}

/** 한 NodeKind의 통합 설명자 */
export interface NodeDescriptor<P extends NodeProps = NodeProps> {
  kind: NodeKind;
  /** 팔레트·레이어 트리 표기용 사람이 읽는 라벨 */
  label: string;
  /** 팔레트 아이콘 */
  icon: LucideIcon;
  /** 자식을 가질 수 있는 컨테이너 여부 (container/foldable: true) */
  isContainer: boolean;
  /** 팔레트에 노출할지 (module-ref처럼 특수 생성 경로가 있는 kind는 false) */
  inPalette: boolean;
  /** 신규 노드 생성 시 기본 props */
  defaultProps: () => P;
  /** 리프 콘텐츠 렌더러 (container/foldable/module-ref는 호스트가 직접 처리하므로 선택) */
  Leaf?: ComponentType<LeafRenderProps>;
  /** kind별 Inspector 섹션 (필드들) */
  Inspector?: ComponentType<InspectorSectionProps<P>>;
  /** Export: Markdown 라벨. 미지정 시 `[${kind}]` */
  exportMarkdown?: (node: LayoutNode) => string;
  /** Export: Mermaid 라벨. 미지정 시 kind 문자열 */
  exportMermaid?: (node: LayoutNode) => string;
  /** LayerTree 라벨 커스터마이즈 (예: "⊚ 모듈명") */
  layerLabel?: (node: LayoutNode) => ReactNode;
}
