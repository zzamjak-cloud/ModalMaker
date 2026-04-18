// panel-layout 전용 렌더러 - 5개 슬롯 container를 CSS Grid 영역에 배치.
// 비활성 슬롯은 해당 행/열을 0px로 축소하고 grid-area에서 제외.
// 슬롯 container 자체는 SlotContainerRenderer가 pinned-aware로 그린다.
import { applySizing } from "./applySizing";
import { SlotContainerRenderer } from "./SlotContainerRenderer";
import type { LayoutNode, PanelLayoutProps } from "@/types/layout";

export function PanelLayoutRenderer({ node, depth }: { node: LayoutNode; depth: number }) {
  const p = node.props as PanelLayoutProps;
  const showHeader = p.showHeader ?? true;
  const showFooter = p.showFooter ?? false;
  const showLeft = p.showLeft ?? true;
  const showRight = p.showRight ?? false;
  const hH = showHeader ? (p.headerHeight ?? 48) : 0;
  const fH = showFooter ? (p.footerHeight ?? 40) : 0;
  const lW = showLeft ? (p.leftWidth ?? 220) : 0;
  const rW = showRight ? (p.rightWidth ?? 260) : 0;

  const areas = [
    showHeader ? `"h h h"` : null,
    `"${showLeft ? "l" : "m"} m ${showRight ? "r" : "m"}"`,
    showFooter ? `"f f f"` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const slots = node.children ?? [];
  const [header, left, main, right, footer] = [slots[0], slots[1], slots[2], slots[3], slots[4]];

  const style: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `${lW}px minmax(0,1fr) ${rW}px`,
    gridTemplateRows: [hH ? `${hH}px` : null, "minmax(0,1fr)", fH ? `${fH}px` : null]
      .filter(Boolean)
      .join(" "),
    gridTemplateAreas: areas,
    width: "100%",
    height: "100%",
    minHeight: 320,
    ...applySizing(node),
  };

  return (
    <div className="relative rounded-md bg-neutral-900/40" style={style}>
      {showHeader && header && (
        <div style={{ gridArea: "h", overflow: "hidden" }}>
          <SlotContainerRenderer node={header} depth={depth + 1} />
        </div>
      )}
      {showLeft && left && (
        <div style={{ gridArea: "l", overflow: "hidden" }}>
          <SlotContainerRenderer node={left} depth={depth + 1} />
        </div>
      )}
      {main && (
        <div style={{ gridArea: "m", overflow: "hidden" }}>
          <SlotContainerRenderer node={main} depth={depth + 1} />
        </div>
      )}
      {showRight && right && (
        <div style={{ gridArea: "r", overflow: "hidden" }}>
          <SlotContainerRenderer node={right} depth={depth + 1} />
        </div>
      )}
      {showFooter && footer && (
        <div style={{ gridArea: "f", overflow: "hidden" }}>
          <SlotContainerRenderer node={footer} depth={depth + 1} />
        </div>
      )}
      {depth === 0 && (
        <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
          Panel Layout
        </div>
      )}
    </div>
  );
}
