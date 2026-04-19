import { describe, it, expect } from "vitest";
import { commit, commitCoalesce } from "@/stores/layout/commit";
import type { LayoutState } from "@/stores/layout/types";
import type { NodeDocument } from "@/types/layout";

function makeDoc(title = "Doc"): NodeDocument {
  return {
    id: "d",
    title,
    pages: [
      {
        id: "p1",
        title: "P1",
        root: { id: "r", kind: "container", props: {}, children: [] },
        position: { x: 0, y: 0 },
      },
    ],
    modules: [],
    edges: [],
    currentPageId: "p1",
    createdAt: 1,
    updatedAt: 1,
    schemaVersion: 2,
  };
}

function baseState(): LayoutState {
  return {
    document: makeDoc(),
    mode: "canvas",
    selectedId: null,
    selectedIds: [],
    selectedPageId: null,
    editingModuleId: null,
    past: [],
    future: [],
    lastCoalesceKey: null,
  } as unknown as LayoutState;
}

describe("commit", () => {
  it("변경 시 past에 이전 스냅샷 push, future 비움", () => {
    const s = baseState();
    const patch = commit(s, (d) => {
      d.title = "Updated";
    });
    expect(patch.document?.title).toBe("Updated");
    expect(patch.past).toHaveLength(1);
    expect(patch.past?.[0].title).toBe("Doc");
    expect(patch.future).toEqual([]);
    expect(patch.lastCoalesceKey).toBeNull();
  });

  it("updatedAt은 매 커밋마다 갱신", () => {
    const s = baseState();
    const before = s.document.updatedAt;
    const patch = commit(s, (d) => {
      d.title = "X";
    });
    expect(patch.document?.updatedAt).toBeGreaterThanOrEqual(before);
  });
});

describe("commitCoalesce", () => {
  it("첫 호출은 past에 스냅샷 추가 + lastCoalesceKey 설정", () => {
    const s = baseState();
    const patch = commitCoalesce(s, "updateProps:r", (d) => {
      d.title = "A";
    });
    expect(patch.past).toHaveLength(1);
    expect(patch.lastCoalesceKey).toBe("updateProps:r");
    expect(patch.document?.title).toBe("A");
  });

  it("같은 키로 연속 호출 시 past에 새 스냅샷을 추가하지 않음", () => {
    let s = baseState();
    let patch = commitCoalesce(s, "updateProps:r", (d) => { d.title = "A"; });
    s = { ...s, ...patch } as LayoutState;
    expect(s.past).toHaveLength(1);

    patch = commitCoalesce(s, "updateProps:r", (d) => { d.title = "AB"; });
    // past 길이는 그대로
    expect(patch.past).toBeUndefined(); // 변경 없음
    expect(patch.document?.title).toBe("AB");
    expect(patch.lastCoalesceKey).toBe("updateProps:r");
  });

  it("키가 달라지면 새 스냅샷 추가", () => {
    let s = baseState();
    let patch = commitCoalesce(s, "updateProps:r", (d) => { d.title = "A"; });
    s = { ...s, ...patch } as LayoutState;

    patch = commitCoalesce(s, "updateProps:OTHER", (d) => { d.title = "B"; });
    expect(patch.past).toHaveLength(2);
    expect(patch.lastCoalesceKey).toBe("updateProps:OTHER");
  });
});
