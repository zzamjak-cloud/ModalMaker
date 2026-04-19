// 중앙 로거 — 개발 모드에서는 console을 포맷팅해 호출하고,
// 프로덕션 번들에서는 warn 이상만 통과. 향후 원격 수집 훅은 여기서 확장.
//
// 사용법:
//   import { logger } from "@/lib/logger";
//   logger.warn("persistence", "Load failed", err);
//   logger.error("store", "Invalid snapshot", { docId });

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// import.meta.env는 Vite 환경에서만 존재 — 테스트(Node)는 NODE_ENV로 판별
const isDev =
  (typeof import.meta !== "undefined" && (import.meta as { env?: { DEV?: boolean } }).env?.DEV) ||
  process.env.NODE_ENV !== "production";

// 프로덕션에서는 warn 이상만 콘솔로 통과
const MIN_LEVEL: Level = isDev ? "debug" : "warn";

function shouldLog(level: Level): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
}

function format(level: Level, scope: string, args: unknown[]): unknown[] {
  const tag = `[${level}:${scope}]`;
  return [tag, ...args];
}

function emit(level: Level, scope: string, args: unknown[]): void {
  if (!shouldLog(level)) return;
  const formatted = format(level, scope, args);
  switch (level) {
    case "debug":
      console.debug(...formatted);
      break;
    case "info":
      console.info(...formatted);
      break;
    case "warn":
      console.warn(...formatted);
      break;
    case "error":
      console.error(...formatted);
      break;
  }
}

export const logger = {
  debug: (scope: string, ...args: unknown[]) => emit("debug", scope, args),
  info: (scope: string, ...args: unknown[]) => emit("info", scope, args),
  warn: (scope: string, ...args: unknown[]) => emit("warn", scope, args),
  error: (scope: string, ...args: unknown[]) => emit("error", scope, args),
};
