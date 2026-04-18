import { describe, expect, it } from "vitest";
import { mergeSizingPatch, normalizeSizing } from "./layoutSizing";

describe("mergeSizingPatch", () => {
  it("width 패치만 해도 레거시 fixedSize 제거 후 height 고정이 유지된다", () => {
    const existing = { fixedSize: true as const, width: 220.4, height: 680 };
    const merged = mergeSizingPatch(existing, {
      fixedSize: undefined,
      widthFixed: true,
      width: 221,
    });
    expect(normalizeSizing(merged).heightFixed).toBe(true);
    expect(normalizeSizing(merged).widthFixed).toBe(true);
    expect(merged.height).toBe(680);
    expect(merged.fixedSize).toBeUndefined();
  });

  it("height 패치만 해도 width 고정이 유지된다", () => {
    const existing = { fixedSize: true as const, width: 200, height: 600 };
    const merged = mergeSizingPatch(existing, {
      fixedSize: undefined,
      heightFixed: true,
      height: 400,
    });
    expect(normalizeSizing(merged).widthFixed).toBe(true);
    expect(merged.width).toBe(200);
  });
});
