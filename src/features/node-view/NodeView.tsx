// Node View - 페이지들을 2D 다이어그램으로 표시하고 줌/팬/엣지 연결을 제공.
// ReactFlow로 랩핑. 노드는 PageCardNode 커스텀 타입 하나만 사용.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyNodeChanges,
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
import type { LayoutNode } from "@/types/layout";
import { PageCardNode } from "./PageCardNode";
import { AddPageDialog } from "./AddPageDialog";

type RFPage = Node<{ pageId: string }, "pageCard">;

const nodeTypes = { pageCard: PageCardNode } as const;

// 노드 트리 재귀 방문 (페이지 루트부터 모든 자손 순회)
function walkTree(node: LayoutNode, visit: (n: LayoutNode) => void) {
  visit(node);
  node.children?.forEach((c) => walkTree(c, visit));
}

// 자동 엣지 라벨 - 인터렉션 소스 노드의 대표 이름
function labelForNode(node: LayoutNode): string {
  switch (node.kind) {
    case "button":
      return (node.props as { label?: string }).label ?? "Button";
    case "icon":
      return (node.props as { name?: string }).name ?? "Icon";
    case "container":
      return (node.props as { label?: string }).label ?? "Container";
    default:
      return node.kind;
  }
}

export function NodeView() {
  const pages = useLayoutStore((s) => s.document.pages);
  const edges = useLayoutStore((s) => s.document.edges);

  const movePage = useLayoutStore((s) => s.movePage);
  const setCurrentPage = useLayoutStore((s) => s.setCurrentPage);
  const setMode = useLayoutStore((s) => s.setMode);
  const addEdge = useLayoutStore((s) => s.addEdge);
  const removeEdge = useLayoutStore((s) => s.removeEdge);

  const [showAddDialog, setShowAddDialog] = useState(false);

  function toRFNode(p: (typeof pages)[number]): RFPage {
    return { id: p.id, type: "pageCard", position: p.position, data: { pageId: p.id } };
  }

  const [rfNodes, setRfNodes] = useState<RFPage[]>(() => pages.map(toRFNode));

  // 페이지 추가/삭제 시 로컬 노드 목록을 동기화. 드래그 중 위치는 로컬 상태가 관리하므로 덮어쓰지 않는다.
  useEffect(() => {
    setRfNodes((current) => {
      const currentMap = new Map(current.map((n) => [n.id, n]));
      return pages.map((p) => currentMap.get(p.id) ?? toRFNode(p));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages]);

  // 인터렉션(click→navigate) 기반 자동 엣지 - document.edges에 저장하지 않고 파생.
  const autoEdges: Edge[] = useMemo(() => {
    const out: Edge[] = [];
    const seen = new Set<string>();
    for (const p of pages) {
      walkTree(p.root, (node) => {
        for (const it of node.interactions ?? []) {
          if (it.event !== "click") continue;
          if (it.action.type !== "navigate") continue;
          const tgt = it.action.targetPageId;
          if (!tgt || tgt === p.id) continue;
          if (!pages.some((pp) => pp.id === tgt)) continue;
          const id = `auto-${p.id}-${tgt}-${node.id}-${it.id}`;
          if (seen.has(id)) continue;
          seen.add(id);
          out.push({
            id,
            source: p.id,
            target: tgt,
            animated: true,
            label: labelForNode(node),
            style: { stroke: "#0ea5e9" },
            labelStyle: { fill: "#7dd3fc", fontSize: 10 },
            labelBgStyle: { fill: "#0c4a6e", opacity: 0.7 },
          });
        }
      });
    }
    return out;
  }, [pages]);

  const rfEdges: Edge[] = useMemo(
    () => [
      ...edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
      })),
      ...autoEdges,
    ],
    [edges, autoEdges],
  );

  // 드래그 중 로컬 상태를 즉시 갱신해 시각적 피드백 제공. 드래그 완료 시에만 store에 commit.
  const onNodesChange: OnNodesChange<RFPage> = useCallback(
    (changes) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds));
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
      eds.forEach((e) => {
        if (e.id.startsWith("auto-")) return; // 자동 엣지는 인터렉션 편집으로만 삭제 가능
        removeEdge(e.id);
      });
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
            onClick={() => setShowAddDialog(true)}
            className="flex items-center gap-1 rounded-md border border-sky-500/40 bg-sky-500/20 px-2.5 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/30"
          >
            <Plus size={12} />
            새 페이지
          </button>
        </Panel>
      </ReactFlow>

      {showAddDialog && <AddPageDialog onClose={() => setShowAddDialog(false)} />}
    </div>
  );
}
