// 짧고 URL-safe한 노드 ID 생성기
import { nanoid } from "nanoid";

export function newId(prefix = "n"): string {
  return `${prefix}_${nanoid(10)}`;
}
