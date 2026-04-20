// 최근 열람 문서 id 추적 — localStorage 기반 간단 FIFO
// 실제 문서 메타는 IndexedDB의 documents store에서 가져온다.
import { logger } from "@/lib/logger";

const KEY = "modalmaker:recent-docs";
const MAX_RECENT = 12;

export function getRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === "string").slice(0, MAX_RECENT);
  } catch (err) {
    logger.warn("persistence", "getRecentIds parse failed", err);
    return [];
  }
}

/** 최근 목록 맨 앞으로 id 이동 (중복 제거). 자주 호출돼도 부담 없음. */
export function pushRecent(id: string): void {
  try {
    const cur = getRecentIds().filter((v) => v !== id);
    cur.unshift(id);
    localStorage.setItem(KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
  } catch (err) {
    logger.warn("persistence", "pushRecent failed", err);
  }
}

/** 삭제된 문서 등에서 정리 */
export function removeRecent(id: string): void {
  try {
    const cur = getRecentIds().filter((v) => v !== id);
    localStorage.setItem(KEY, JSON.stringify(cur));
  } catch (err) {
    logger.warn("persistence", "removeRecent failed", err);
  }
}
