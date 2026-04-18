// Node View - 페이지들을 2D 다이어그램으로 표시하고 줌/팬/엣지 연결을 제공.
// ReactFlow로 랩핑. 노드는 PageCardNode 커스텀 타입 하나만 사용.
import { useCallback, useMemo } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  type Edge,
  type Node,
  type OnConnect,
  type OnNodesChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus } from "lucide-react";
import { useLayoutStore } from "@/stores/layoutStore";
import { PageCardNode } from "./PageCardNode";

type RFPage = Node<{ pageId: string }, "pageCard">;

const nodeTypes = { pageCard: PageCardNode } as const;

export function NodeView() {
  const pages = useLayoutStore((s) => s.document.pages);
  const edges = useLayoutStore((s) => s.document.edges);

  const movePage = useLayoutStore((s) => s.movePage);
  const setCurrentPage = useLayoutStore((s) => s.setCurrentPage);
  const setMode = useLayoutStore((s) => s.setMode);
  const addPage = useLayoutStore((s) => s.addPage);
  const addEdge = useLayoutStore((s) => s.addEdge);
  const removeEdge = useLayoutStore((s) => s.removeEdge);

  const rfNodes: RFPage[] = useMemo(
    () =>
      pages.map((p) => ({
        id: p.id,
        type: "pageCard",
        position: p.position,
        data: { pageId: p.id },
      })),
    [pages],
  );

  const rfEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
    [edges],
  );

  // 드래그 중 계속 position 반영하지 않고, stop에서만 store에 commit.
  const onNodesChange: OnNodesChange<RFPage> = useCallback(
    (changes) => {
      for (const c of changes) {
        if (c.type === "position" && !c.dragging && c.position) {
          movePage(c.id, c.position.x, c.position.y);
        }
      }
    },
    [movePage],
  );

  const onConnect: OnConnect = useCallback(
    (conn) => {
      if (conn.source && conn.target)
        addEdge(conn.source, conn.target, conn.sourceHandle ?? undefined);
    },
    [addEdge],
  );

  const onEdgesDelete = useCallback(
    (eds: Edge[]) => {
      eds.forEach((e) => removeEdge(e.id));
    },
    [removeEdge],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onConnect={onConnect}
        onEdgesDelete={onEdgesDelete}
        onNodeDoubleClick={(_, node) => {
          setCurrentPage(node.id);
          setMode("canvas");
        }}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-neutral-950"
      >
        <Background color="#262626" />
        <MiniMap pannable zoomable className="!bg-neutral-900" />
        <Controls className="!rounded-md !border !border-neutral-800 !bg-neutral-900" />
        <Panel position="top-left" className="!m-2">
          <button
            onClick={() => addPage("Page " + (pages.length + 1))}
            className="flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/20 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/30"
          >
            <Plus size={12} />
            새 페이지
          </button>
        </Panel>
      </ReactFlow>
    </div>
  );
}
