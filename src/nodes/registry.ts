// 노드 타입 레지스트리 — 런타임 Map 기반
// 각 kind 모듈이 import 시점에 register()를 호출해 자신을 등록한다.
// 앱 진입 시 `src/nodes/index.ts`가 모든 kind를 import하므로 어느 컴포넌트에서든
// getDescriptor/allDescriptors로 조회 가능.

import { logger } from "@/lib/logger";
import type { NodeKind, NodeProps } from "@/types/layout";
import type { NodeDescriptor } from "./types";

const registry = new Map<NodeKind, NodeDescriptor>();

export function register<P extends NodeProps>(descriptor: NodeDescriptor<P>): void {
  if (registry.has(descriptor.kind)) {
    // 동일 kind 중복 등록은 핫리로드/테스트 외에는 버그 → 경고 후 덮어쓰기
    logger.warn("nodes/registry", `duplicate register for kind="${descriptor.kind}"`);
  }
  registry.set(descriptor.kind, descriptor as unknown as NodeDescriptor);
}

export function getDescriptor(kind: NodeKind): NodeDescriptor | undefined {
  return registry.get(kind);
}

export function allDescriptors(): NodeDescriptor[] {
  return Array.from(registry.values());
}

/** 팔레트에 노출할 descriptor만 필터 */
export function paletteDescriptors(): NodeDescriptor[] {
  return allDescriptors().filter((d) => d.inPalette);
}
