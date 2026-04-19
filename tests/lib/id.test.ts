import { describe, it, expect } from "vitest";
import { newId } from "@/lib/id";

describe("newId", () => {
  it("기본 prefix는 'n'", () => {
    const id = newId();
    expect(id).toMatch(/^n_[\w-]{10}$/);
  });

  it("prefix 지정 시 '<prefix>_<10자>' 포맷", () => {
    const id = newId("page");
    expect(id).toMatch(/^page_[\w-]{10}$/);
  });

  it("연속 호출이 서로 다른 값을 반환", () => {
    const set = new Set<string>();
    for (let i = 0; i < 500; i++) set.add(newId());
    expect(set.size).toBe(500);
  });
});
