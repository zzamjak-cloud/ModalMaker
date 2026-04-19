// Sizing / flex 자식 앵커 → CSS 변환 (캔버스·인스펙터 공용)
import type { CSSProperties } from "react";
import type { ContainerProps, LayoutNode, SizingProps } from "@/types/layout";

export function normalizeSizing(s?: SizingProps): {
  widthFixed: boolean;
  heightFixed: boolean;
  width: number;
  height: number;
} {
  const legacyBoth = s?.fixedSize === true;
  const widthFixed = s?.widthFixed ?? legacyBoth;
  const heightFixed = s?.heightFixed ?? legacyBoth;
  return {
    widthFixed,
    heightFixed,
    width: typeof s?.width === "number" ? s.width : 120,
    height: typeof s?.height === "number" ? s.height : 40,
  };
}

const PX_MAX = 4096;

/** 캔버스·인스펙터 공통: px 정수, 최소 1 */
export function roundSizingPx(n: number): number {
  return Math.round(Math.max(1, Math.min(PX_MAX, n)));
}

/**
 * sizing 병합: 레거시 fixedSize만 있던 문서에서 한 축만 패치할 때 다른 축이 풀리는 것을 방지.
 * (fixedSize 제거 시 widthFixed/heightFixed가 객체에 없으면 normalize 기준으로 명시)
 */
export function mergeSizingPatch(
  existing: SizingProps | undefined,
  patch: Partial<SizingProps>,
): SizingProps {
  const base = normalizeSizing(existing);
  const out: SizingProps = { ...(existing ?? {}), ...patch };

  if (existing?.fixedSize === true && patch.fixedSize === undefined) {
    if (out.widthFixed === undefined) out.widthFixed = base.widthFixed;
    if (out.heightFixed === undefined) out.heightFixed = base.heightFixed;
  }

  if (out.widthFixed === undefined) out.widthFixed = base.widthFixed;
  if (out.heightFixed === undefined) out.heightFixed = base.heightFixed;

  if ("width" in patch && patch.width !== undefined) {
    if (typeof patch.width === "number" && Number.isFinite(patch.width)) {
      out.width = roundSizingPx(patch.width);
    } else {
      out.width = typeof existing?.width === "number" ? existing.width : base.width;
    }
  } else if (typeof out.width !== "number" || Number.isNaN(out.width)) {
    out.width = typeof existing?.width === "number" ? existing.width : base.width;
  }

  if ("height" in patch && patch.height !== undefined) {
    if (typeof patch.height === "number" && Number.isFinite(patch.height)) {
      out.height = roundSizingPx(patch.height);
    } else {
      out.height = typeof existing?.height === "number" ? existing.height : base.height;
    }
  } else if (typeof out.height !== "number" || Number.isNaN(out.height)) {
    out.height = typeof existing?.height === "number" ? existing.height : base.height;
  }

  delete out.fixedSize;
  return out;
}

/** 고정 축만 width/height·flex-shrink 적용. 앵커드 축은 고정 크기 무시. */
export function applySizing(node: LayoutNode): CSSProperties {
  const { widthFixed, heightFixed, width, height } = normalizeSizing(node.sizing);
  const wa = node.sizing?.widthAnchored;
  const ha = node.sizing?.heightAnchored;
  const effectiveWFixed = widthFixed && !wa;
  const effectiveHFixed = heightFixed && !ha;
  if (!effectiveWFixed && !effectiveHFixed) return {};
  const out: CSSProperties = { flexShrink: 0 };
  if (effectiveWFixed) {
    out.width = width;
    // 부모 align-items:stretch가 width를 무시하지 못하도록 교차축 정렬 고정
    out.alignSelf = "flex-start";
  }
  if (effectiveHFixed) out.height = height;
  return out;
}

/**
 * 부모 flex/grid 안에서 앵커드 노드의 성장 스타일을 반환.
 * 컨테이너의 outer div 또는 리프의 단일 div에 적용한다.
 */
export function applyParentFit(
  node: LayoutNode,
  parentDirection: ParentFlexDirection,
): CSSProperties {
  const wa = node.sizing?.widthAnchored;
  const ha = node.sizing?.heightAnchored;
  if (!wa && !ha) return {};

  const out: CSSProperties = {};
  if (wa) {
    if (parentDirection === "row") {
      out.flexGrow = 1;
      out.flexShrink = 1;
      out.minWidth = 0;
    } else {
      // column/grid: 교차축 stretch
      out.alignSelf = "stretch";
    }
  }
  if (ha) {
    if (parentDirection === "column") {
      out.flexGrow = ((out.flexGrow as number) || 0) + 1;
      out.flexShrink = 1;
      out.minHeight = 0;
    } else {
      // row/grid: 교차축 stretch
      out.alignSelf = "stretch";
    }
  }
  return out;
}

/**
 * 컨테이너 inner div가 앵커드 outer div에 맞춰 채우도록 하는 스타일.
 * width/height 100%로 outer div를 완전히 채운다.
 */
export function applyInnerFill(node: LayoutNode): CSSProperties {
  const wa = node.sizing?.widthAnchored;
  const ha = node.sizing?.heightAnchored;
  if (!wa && !ha) return {};
  return {
    ...(wa ? { width: "100%" } : {}),
    ...(ha ? { height: "100%", minHeight: 0 } : {}),
  };
}

/** justify 값 → 유효한 CSS justify-content (around/between 등 매핑) */
export function justifyContentCss(
  justify?: ContainerProps["justify"],
): CSSProperties["justifyContent"] {
  switch (justify) {
    case "between":
      return "space-between";
    case "around":
      return "space-around";
    case "start":
      return "flex-start";
    case "end":
      return "flex-end";
    case "center":
      return "center";
    default:
      return undefined;
  }
}

export type ParentFlexDirection = "row" | "column" | "grid";

/** Flex 컨테이너 자식: 주축 margin auto로 끝/시작 쪽으로 밀기 */
export function flexMainAxisMarginStyle(
  parentDirection: ParentFlexDirection,
  flexMainAxis?: LayoutNode["flexMainAxis"],
): CSSProperties {
  if (!flexMainAxis || parentDirection === "grid") return {};
  if (parentDirection === "row") {
    if (flexMainAxis === "push-end") return { marginLeft: "auto" };
    if (flexMainAxis === "push-start") return { marginRight: "auto" };
  }
  if (parentDirection === "column") {
    if (flexMainAxis === "push-end") return { marginTop: "auto" };
    if (flexMainAxis === "push-start") return { marginBottom: "auto" };
  }
  return {};
}
