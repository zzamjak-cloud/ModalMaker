import { describe, it, expect } from "vitest";
import { cloneWithNewIds } from "@/stores/layout/cloneTree";
import type { LayoutNode } from "@/types/layout";

describe("cloneWithNewIds", () => {
  it("모든 노드가 새 id를 받고, 원본과 구조가 동일", () => {
    const src: LayoutNode = {
      id: "r",
      kind: "container",
      props: { direction: "column" },
      children: [
        { id: "a", kind: "text", props: { text: "A" } },
        { id: "b", kind: "text", props: { text: "B" } },
      ],
    };
    const clone = cloneWithNewIds(src);
    expect(clone.id).not.toBe(src.id);
    expect(clone.children?.[0].id).not.toBe("a");
    expect(clone.children?.[1].id).not.toBe("b");
    // 구조 보존
    expect(clone.kind).toBe("container");
    expect(clone.children?.[0].props).toEqual({ text: "A" });
    expect(clone.children?.[1].props).toEqual({ text: "B" });
  });

  it("props는 얕은 복사 (원본·클론이 독립)", () => {
    const src: LayoutNode = {
      id: "r",
      kind: "text",
      props: { text: "x" },
    };
    const clone = cloneWithNewIds(src);
    (clone.props as { text: string }).text = "changed";
    expect((src.props as { text: string }).text).toBe("x");
  });

  it("sizing 객체는 독립 복사", () => {
    const src: LayoutNode = {
      id: "r",
      kind: "text",
      props: { text: "x" },
      sizing: { widthFixed: true, width: 200 },
    };
    const clone = cloneWithNewIds(src);
    expect(clone.sizing).not.toBe(src.sizing);
    expect(clone.sizing?.width).toBe(200);
  });

  it("interactions는 새 id로 복제", () => {
    const src: LayoutNode = {
      id: "r",
      kind: "button",
      props: { label: "OK" },
      interactions: [
        { id: "int_1", event: "click", action: { type: "close" } },
      ],
    };
    const clone = cloneWithNewIds(src);
    expect(clone.interactions?.[0].id).not.toBe("int_1");
    expect(clone.interactions?.[0].event).toBe("click");
  });
});
