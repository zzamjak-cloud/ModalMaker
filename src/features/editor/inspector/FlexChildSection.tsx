// Flex 컨테이너의 직계 자식: 주축 margin:auto로 한쪽 끝에 붙이기
import type { ContainerProps, LayoutNode } from "@/types/layout";
import { isContainerKind } from "@/types/layout";
import { activeRoot, findLayoutParent, useLayoutStore } from "@/stores/layoutStore";

export function FlexChildSection({ node }: { node: LayoutNode }) {
  const root = useLayoutStore((s) => activeRoot(s));
  const patchNode = useLayoutStore((s) => s.patchNode);

  if (!root || node.id === root.id) return null;

  const parent = findLayoutParent(root, node.id);
  if (!parent || !isContainerKind(parent.kind)) return null;

  const dir = (parent.props as ContainerProps).direction ?? "column";
  if (dir === "grid") {
    return (
      <div className="rounded-md border border-neutral-800/80 bg-neutral-950/50 px-2 py-1.5 text-[11px] text-neutral-500">
        Grid 부모에서는 자식 주축 앵커를 쓸 수 없습니다.
      </div>
    );
  }

  const value = node.flexMainAxis;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
        Flex 자식 (주축)
      </div>
      <p className="text-[10px] leading-snug text-neutral-500">
        좌·우(또는 상·하)를 각각 끝에 붙이려면 한쪽 자식에「끝으로 밀기」를 지정하세요.
      </p>
      <select
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") patchNode(node.id, { flexMainAxis: null });
          else if (v === "push-end" || v === "push-start") patchNode(node.id, { flexMainAxis: v });
        }}
        className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      >
        <option value="">기본</option>
        <option value="push-end">끝으로 밀기 (margin auto)</option>
        <option value="push-start">시작으로 밀기</option>
      </select>
    </div>
  );
}
