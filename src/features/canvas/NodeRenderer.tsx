// 재귀 노드 렌더러 — 트리 본체는 NodeHost(캔버스 모드), 리프 fallback만 이 파일에 둔다.
import type { ReactNode } from "react";
import { ButtonLeaf } from "./ButtonLeaf";
import type { ParentFlexDirection } from "@/lib/layoutSizing";
import type { LayoutNode } from "@/types/layout";
import { getDescriptor } from "@/nodes/registry";
import { NodeHost } from "@/nodes/NodeHost";
import type { InputProps } from "@/types/layout";

export function NodeRenderer({
  node,
  depth = 0,
  visitedModuleIds,
  parentDirection = "column",
  parentIsFlexContainer = false,
}: {
  node: LayoutNode;
  depth?: number;
  visitedModuleIds?: Set<string>;
  parentDirection?: ParentFlexDirection;
  parentIsFlexContainer?: boolean;
}) {
  return (
    <NodeHost
      mode="canvas"
      node={node}
      depth={depth}
      visitedModuleIds={visitedModuleIds}
      parentDirection={parentDirection}
      parentIsFlexContainer={parentIsFlexContainer}
      renderChild={(p) => (
        <NodeRenderer
          node={p.node}
          depth={p.depth}
          visitedModuleIds={p.visitedModuleIds}
          parentDirection={p.parentDirection}
          parentIsFlexContainer={p.parentIsFlexContainer}
        />
      )}
      renderLeafCanvas={renderLeafCanvas}
    />
  );
}

function renderLeafCanvas(node: LayoutNode): ReactNode {
  const desc = getDescriptor(node.kind);
  if (desc?.Leaf) {
    const Leaf = desc.Leaf;
    return <Leaf node={node} mode="canvas" />;
  }
  switch (node.kind) {
    case "button":
      return <ButtonLeaf node={node} />;
    case "input": {
      const p = node.props as InputProps;
      if (p.inline) {
        const lw = p.labelWidth ?? 30;
        return (
          <div className="flex w-full items-center gap-2">
            {p.label && (
              <label className="shrink-0 text-xs text-neutral-400" style={{ width: `${lw}%` }}>
                {p.label}
              </label>
            )}
            <input
              type={p.type ?? "text"}
              placeholder={p.placeholder}
              readOnly
              className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
            />
          </div>
        );
      }
      return (
        <div className="flex w-full flex-col gap-1">
          {p.label && <label className="text-xs text-neutral-400">{p.label}</label>}
          <input
            type={p.type ?? "text"}
            placeholder={p.placeholder}
            readOnly
            className="w-full rounded-md border border-neutral-700 bg-neutral-950 px-2.5 py-1.5 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      );
    }
    default:
      return null;
  }
}
