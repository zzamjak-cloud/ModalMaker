// 캔버스 루트 - 문서 트리의 루트 컨테이너를 렌더링한다.
// DndContext는 상위(App)에 있어 팔레트/캔버스를 모두 포괄한다.
import { useLayoutStore } from "@/stores/layoutStore";
import { NodeRenderer } from "./NodeRenderer";

export function Canvas() {
  const root = useLayoutStore((s) => s.document.root);
  return (
    <div className="relative">
      <NodeRenderer node={root} depth={0} />
    </div>
  );
}
