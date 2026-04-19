import { describe, it, expect } from "vitest";
import { migrateToV2 } from "@/lib/migrate";
import type { LayoutDocument, NodeDocument } from "@/types/layout";

describe("migrateToV2 (golden test)", () => {
  it("v1 LayoutDocument → 단일 페이지 NodeDocument로 감싼다", () => {
    const v1: LayoutDocument = {
      id: "doc_abc",
      title: "My Modal",
      root: {
        id: "root",
        kind: "container",
        props: { direction: "column", gap: 8, padding: 12, label: "Root" },
        children: [
          { id: "t1", kind: "text", props: { text: "Hi" } },
        ],
      },
      viewport: { preset: "desktop" },
      createdAt: 1000,
      updatedAt: 2000,
      ownerUid: "user1",
    };

    const v2 = migrateToV2(v1);
    expect(v2.schemaVersion).toBe(2);
    expect(v2.id).toBe("doc_abc");
    expect(v2.title).toBe("My Modal");
    expect(v2.pages).toHaveLength(1);
    expect(v2.pages[0].title).toBe("My Modal");
    expect(v2.pages[0].root).toBe(v1.root); // 참조 재사용
    expect(v2.pages[0].viewport).toEqual({ preset: "desktop" });
    expect(v2.pages[0].position).toEqual({ x: 0, y: 0 });
    expect(v2.currentPageId).toBe(v2.pages[0].id);
    expect(v2.modules).toEqual([]);
    expect(v2.edges).toEqual([]);
    expect(v2.createdAt).toBe(1000);
    expect(v2.updatedAt).toBe(2000);
    expect(v2.ownerUid).toBe("user1");
  });

  it("이미 v2면 그대로 반환 (idempotent)", () => {
    const v2: NodeDocument = {
      id: "doc_xyz",
      title: "Already v2",
      pages: [
        {
          id: "page_1",
          title: "Page 1",
          root: {
            id: "root",
            kind: "container",
            props: { direction: "column" },
            children: [],
          },
          position: { x: 0, y: 0 },
        },
      ],
      modules: [],
      edges: [],
      currentPageId: "page_1",
      createdAt: 100,
      updatedAt: 200,
      schemaVersion: 2,
    };
    expect(migrateToV2(v2)).toBe(v2);
  });

  it("title 비어있으면 'Page 1' fallback", () => {
    const v1 = {
      id: "d",
      title: "",
      root: { id: "r", kind: "container" as const, props: {}, children: [] },
      createdAt: 0,
      updatedAt: 0,
    } as LayoutDocument;
    const v2 = migrateToV2(v1);
    expect(v2.pages[0].title).toBe("Page 1");
  });
});
