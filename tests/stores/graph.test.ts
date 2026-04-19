import { describe, it, expect } from "vitest";
import {
  findLayoutNode,
  findLayoutParent,
  removeFromParent,
  isAncestor,
  pruneModuleRefs,
} from "@/stores/layout/graph";
import type { LayoutNode, ModuleRefProps } from "@/types/layout";

function tree(): LayoutNode {
  return {
    id: "root",
    kind: "container",
    props: {},
    children: [
      {
        id: "a",
        kind: "container",
        props: {},
        children: [
          { id: "a1", kind: "text", props: { text: "a1" } },
          { id: "a2", kind: "text", props: { text: "a2" } },
        ],
      },
      {
        id: "b",
        kind: "container",
        props: {},
        children: [
          {
            id: "mref1",
            kind: "module-ref",
            props: { moduleId: "M1" } as ModuleRefProps,
          },
          { id: "b2", kind: "text", props: { text: "b2" } },
        ],
      },
    ],
  };
}

describe("findLayoutNode", () => {
  it("루트·깊은 노드 모두 찾음", () => {
    const root = tree();
    expect(findLayoutNode(root, "root")).toBe(root);
    expect(findLayoutNode(root, "a1")?.id).toBe("a1");
    expect(findLayoutNode(root, "b2")?.id).toBe("b2");
  });

  it("없으면 null", () => {
    expect(findLayoutNode(tree(), "missing")).toBeNull();
  });
});

describe("findLayoutParent", () => {
  it("자식의 부모 반환", () => {
    const root = tree();
    expect(findLayoutParent(root, "a1")?.id).toBe("a");
    expect(findLayoutParent(root, "mref1")?.id).toBe("b");
    expect(findLayoutParent(root, "a")?.id).toBe("root");
  });

  it("루트는 부모 없음", () => {
    expect(findLayoutParent(tree(), "root")).toBeNull();
  });
});

describe("removeFromParent", () => {
  it("자식을 제거하고 반환", () => {
    const root = tree();
    const parent = findLayoutParent(root, "a1")!;
    const removed = removeFromParent(parent, "a1");
    expect(removed?.id).toBe("a1");
    expect(parent.children?.find((c) => c.id === "a1")).toBeUndefined();
  });

  it("존재하지 않는 자식 → null", () => {
    const root = tree();
    expect(removeFromParent(root, "nope")).toBeNull();
  });
});

describe("isAncestor", () => {
  it("직계·간접 후손 모두 인식", () => {
    const root = tree();
    expect(isAncestor(root, "a1")).toBe(true);
    expect(isAncestor(root, "b2")).toBe(true);
  });

  it("자기 자신은 후손 아님", () => {
    const a = findLayoutNode(tree(), "a")!;
    expect(isAncestor(a, "a")).toBe(false);
  });
});

describe("pruneModuleRefs", () => {
  it("특정 moduleId를 참조하는 module-ref 노드 제거", () => {
    const root = tree();
    pruneModuleRefs(root, "M1");
    const b = findLayoutNode(root, "b")!;
    expect(b.children?.find((c) => c.id === "mref1")).toBeUndefined();
    // 다른 노드는 유지
    expect(b.children?.find((c) => c.id === "b2")).toBeDefined();
  });

  it("다른 moduleId를 참조하는 module-ref는 유지", () => {
    const root = tree();
    pruneModuleRefs(root, "M_OTHER");
    const b = findLayoutNode(root, "b")!;
    expect(b.children?.find((c) => c.id === "mref1")).toBeDefined();
  });
});
