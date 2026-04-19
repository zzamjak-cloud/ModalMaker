// 노드 트리 복제 — documentSlice·layoutStore 공용 (순환 import 방지)
import { newId } from "@/lib/id";
import type { LayoutNode } from "@/types/layout";

export function cloneWithNewIds(node: LayoutNode): LayoutNode {
  return {
    ...node,
    id: newId(),
    props: { ...node.props },
    sizing: node.sizing ? { ...node.sizing } : undefined,
    interactions: node.interactions?.map((i) => ({ ...i, id: newId("int") })),
    children: node.children?.map(cloneWithNewIds),
  };
}
