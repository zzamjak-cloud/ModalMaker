import { describe, it, expect } from "vitest";
import {
  normalizeSizing,
  mergeSizingPatch,
  applySizing,
  applyParentFit,
  roundSizingPx,
} from "@/lib/layoutSizing";
import type { LayoutNode, SizingProps } from "@/types/layout";

function makeNode(sizing?: SizingProps): LayoutNode {
  return {
    id: "n_test",
    kind: "text",
    props: { text: "x" },
    sizing,
  };
}

describe("normalizeSizing", () => {
  it("undefined sizing → 기본값 (미고정, 120x40)", () => {
    expect(normalizeSizing(undefined)).toEqual({
      widthFixed: false,
      heightFixed: false,
      width: 120,
      height: 40,
    });
  });

  it("레거시 fixedSize=true → width/height 모두 고정으로 간주", () => {
    expect(normalizeSizing({ fixedSize: true })).toEqual({
      widthFixed: true,
      heightFixed: true,
      width: 120,
      height: 40,
    });
  });

  it("widthFixed/heightFixed가 명시되면 그것이 우선", () => {
    const r = normalizeSizing({ widthFixed: true, heightFixed: false, width: 300 });
    expect(r.widthFixed).toBe(true);
    expect(r.heightFixed).toBe(false);
    expect(r.width).toBe(300);
  });
});

describe("roundSizingPx", () => {
  it("최소 1, 최대 4096으로 클램프", () => {
    expect(roundSizingPx(0)).toBe(1);
    expect(roundSizingPx(-5)).toBe(1);
    expect(roundSizingPx(9999)).toBe(4096);
    expect(roundSizingPx(123.6)).toBe(124);
  });
});

describe("mergeSizingPatch", () => {
  it("fixedSize만 있던 문서에 widthFixed 패치 시, heightFixed도 true로 유지", () => {
    const existing: SizingProps = { fixedSize: true, width: 200, height: 80 };
    const out = mergeSizingPatch(existing, { widthFixed: false });
    expect(out.widthFixed).toBe(false);
    expect(out.heightFixed).toBe(true);
    expect(out.fixedSize).toBeUndefined();
  });

  it("width 숫자 패치는 roundSizingPx 적용", () => {
    const out = mergeSizingPatch({ width: 100, height: 100 }, { width: 300.7 });
    expect(out.width).toBe(301);
  });

  it("유효하지 않은 값은 기존 값으로 복구", () => {
    const out = mergeSizingPatch({ width: 200, height: 100 }, { width: NaN });
    expect(out.width).toBe(200);
  });
});

describe("applySizing", () => {
  it("고정 없음 → 빈 스타일", () => {
    expect(applySizing(makeNode())).toEqual({});
  });

  it("widthFixed=true → width + flexShrink:0 + alignSelf:flex-start", () => {
    const out = applySizing(makeNode({ widthFixed: true, width: 300 }));
    expect(out.width).toBe(300);
    expect(out.flexShrink).toBe(0);
    expect(out.alignSelf).toBe("flex-start");
  });

  it("widthAnchored가 true면 widthFixed 무시", () => {
    const out = applySizing(makeNode({ widthFixed: true, widthAnchored: true, width: 300 }));
    expect(out).toEqual({});
  });

  it("heightFixed만 → height + flexShrink:0 (alignSelf 없음)", () => {
    const out = applySizing(makeNode({ heightFixed: true, height: 200 }));
    expect(out.height).toBe(200);
    expect(out.flexShrink).toBe(0);
    expect(out.alignSelf).toBeUndefined();
  });
});

describe("applyParentFit", () => {
  it("앵커 없음 → 빈", () => {
    expect(applyParentFit(makeNode(), "column")).toEqual({});
  });

  it("widthAnchored + column 부모 → alignSelf:stretch", () => {
    const out = applyParentFit(makeNode({ widthAnchored: true }), "column");
    expect(out.alignSelf).toBe("stretch");
  });

  it("widthAnchored + row 부모 → flexGrow:1 + minWidth:0", () => {
    const out = applyParentFit(makeNode({ widthAnchored: true }), "row");
    expect(out.flexGrow).toBe(1);
    expect(out.flexShrink).toBe(1);
    expect(out.minWidth).toBe(0);
  });

  it("heightAnchored + column 부모 → flexGrow:1 + minHeight:0", () => {
    const out = applyParentFit(makeNode({ heightAnchored: true }), "column");
    expect(out.flexGrow).toBe(1);
    expect(out.minHeight).toBe(0);
  });
});
