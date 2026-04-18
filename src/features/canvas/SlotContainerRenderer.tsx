// panel-layout 슬롯 container 전용 렌더러.
// 자식을 pinned("top"|"bottom"|"none")에 따라 3그룹으로 분할한다:
//   top pinned → 슬롯 상단에 고정
//   flow        → 중간 영역에서 세로 스크롤
//   bottom pinned → 슬롯 하단에 고정
// 슬롯 자체의 컨테이너 속성(padding/gap/border 등)은 기존 NodeRenderer와 동일 표현.
import { Fragment } from "react";
import { cn } from "@/lib/cn";
import type { ContainerProps, LayoutNode } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";
import { DropZone } from "./DropZone";

function containerFrame(p: ContainerProps): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
  };
  const fallback = p.padding ?? 12;
  if (p.uniformPadding === false) {
    base.paddingTop = p.paddingTop ?? fallback;
    base.paddingRight = p.paddingRight ?? fallback;
    base.paddingBottom = p.paddingBottom ?? fallback;
    base.paddingLeft = p.paddingLeft ?? fallback;
  } else {
    base.padding = fallback;
  }
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}

export function SlotContainerRenderer({
  node,
  depth,
}: {
  node: LayoutNode;
  depth: number;
}) {
  const p = node.props as ContainerProps;
  const gap = p.gap ?? 8;
  const children = node.children ?? [];

  const top: LayoutNode[] = [];
  const bottom: LayoutNode[] = [];
  const flow: LayoutNode[] = [];
  for (const c of children) {
    const pin = (c.props as ContainerProps).pinned;
    if (c.kind === "container" && pin === "top") top.push(c);
    else if (c.kind === "container" && pin === "bottom") bottom.push(c);
    else flow.push(c);
  }

  const empty = top.length + bottom.length + flow.length === 0;

  return (
    <div style={containerFrame(p)}>
      {top.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap, flexShrink: 0 }}>
          {top.map((c) => (
            <NodeRenderer key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}

      <div
        className={cn("flex-1 overflow-auto", empty ? "flex items-center justify-center" : "")}
        style={{ display: "flex", flexDirection: "column", gap }}
      >
        {empty ? (
          <DropZone containerId={node.id} variant="empty" />
        ) : (
          <>
            {(() => {
              const flowIndices = flow.map((f) => children.indexOf(f));
              const firstFlowIdx = flowIndices[0] ?? children.length;
              return (
                <>
                  <DropZone containerId={node.id} index={firstFlowIdx} direction="column" />
                  {flow.map((c, i) => (
                    <Fragment key={c.id}>
                      <NodeRenderer node={c} depth={depth + 1} />
                      <DropZone
                        containerId={node.id}
                        index={flowIndices[i] + 1}
                        direction="column"
                      />
                    </Fragment>
                  ))}
                </>
              );
            })()}
          </>
        )}
      </div>

      {bottom.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap, flexShrink: 0 }}>
          {bottom.map((c) => (
            <NodeRenderer key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
