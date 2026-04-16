// Export 직렬화 유닛 테스트
// AI가 처리할 포맷이므로 정확한 구조 유지가 매우 중요하다.
import { describe, expect, it } from "vitest";
import { toJson } from "./toJson";
import { toMarkdown } from "./toMarkdown";
import { toMermaid } from "./toMermaid";
import type { LayoutDocument } from "@/types/layout";

const sample: LayoutDocument = {
  id: "doc_test",
  title: "Confirm Modal",
  createdAt: 0,
  updatedAt: 0,
  root: {
    id: "n_root",
    kind: "container",
    props: { direction: "column", gap: 16, padding: 20, label: "Confirm Modal" },
    children: [
      {
        id: "n_title",
        kind: "text",
        props: { text: "저장하시겠습니까?", size: "lg", weight: "bold" },
      },
      {
        id: "n_actions",
        kind: "container",
        props: { direction: "row", gap: 8, padding: 0, label: "Actions" },
        children: [
          {
            id: "n_cancel",
            kind: "button",
            props: { label: "취소", variant: "ghost", size: "md" },
          },
          {
            id: "n_ok",
            kind: "button",
            props: { label: "확인", variant: "primary", size: "md" },
          },
        ],
      },
    ],
  },
};

describe("toJson", () => {
  it("round-trips through JSON parse/stringify", () => {
    const json = toJson(sample);
    const parsed = JSON.parse(json);
    expect(parsed).toEqual(sample);
  });
});

describe("toMarkdown", () => {
  it("produces the AI-friendly tree format from the plan", () => {
    const md = toMarkdown(sample, { title: false });
    expect(md).toBe(
      [
        "- [Container: Confirm Modal]",
        '  - [Text: "저장하시겠습니까?"]',
        "  - [Container: Actions (Row)]",
        '    - [Button: "취소" (ghost)]',
        '    - [Button: "확인"]',
      ].join("\n"),
    );
  });

  it("prepends AI prompt when includePrompt is true", () => {
    const md = toMarkdown(sample, { includePrompt: true, title: false });
    expect(md.startsWith("아래는 내가 설계한 UI 레이아웃 구조")).toBe(true);
    expect(md).toContain("- [Container: Confirm Modal]");
  });

  it("includes the document title as H1 by default", () => {
    const md = toMarkdown(sample);
    expect(md).toContain("# Confirm Modal");
  });
});

describe("toMermaid", () => {
  it("emits graph TD with parent->child edges", () => {
    const mmd = toMermaid(sample);
    expect(mmd.startsWith("graph TD")).toBe(true);
    expect(mmd).toContain("n_root --> n_title");
    expect(mmd).toContain("n_root --> n_actions");
    expect(mmd).toContain("n_actions --> n_cancel");
  });
});
