// 좌측 하단 계층 트리
// 트리 펼치기/접기, 선택, 삭제, 부모 내 순서 변경(↑/↓) 지원
import { useState } from "react";
import { ChevronDown, ChevronRight, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import type { LayoutNode } from "@/types/layout";

export function LayerTree() {
  return (
    <div className="flex flex-col gap-1 p-3">
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">Layers</div>
      <TreeNodeRoot />
    </div>
  );
}

function TreeNodeRoot() {
  const root = useLayoutStore((s) => s.document.root);
  return <TreeNode node={root} depth={0} />;
}

function TreeNode({
  node,
  depth,
}: {
  node: LayoutNode;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const select = useLayoutStore((s) => s.select);
  const removeNode = useLayoutStore((s) => s.removeNode);

  const isSelected = selectedId === node.id;
  const hasChildren = !!node.children?.length;
  const isRoot = depth === 0;

  const label = nodeLabel(node);

  return (
    <div>
      <div
        onClick={() => select(node.id)}
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-xs",
          isSelected ? "bg-sky-500/20 text-sky-200" : "text-neutral-300 hover:bg-neutral-800",
        )}
        style={{ paddingLeft: 8 + depth * 12 }}
      >
        <button
          type="button"
          className="h-4 w-4 shrink-0 text-neutral-500"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setOpen(!open);
          }}
        >
          {hasChildren ? open ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : <span />}
        </button>
        <span className="flex-1 truncate">{label}</span>
        <span className="opacity-0 transition group-hover:opacity-100 flex items-center gap-0.5">
          {!isRoot && (
            <>
              <IconButton
                title="위로"
                onClick={(e) => {
                  e.stopPropagation();
                  reorder(node.id, -1);
                }}
              >
                <ArrowUp size={11} />
              </IconButton>
              <IconButton
                title="아래로"
                onClick={(e) => {
                  e.stopPropagation();
                  reorder(node.id, 1);
                }}
              >
                <ArrowDown size={11} />
              </IconButton>
              <IconButton
                title="삭제"
                onClick={(e) => {
                  e.stopPropagation();
                  removeNode(node.id);
                }}
              >
                <Trash2 size={11} />
              </IconButton>
            </>
          )}
        </span>
      </div>
      {hasChildren && open && (
        <div>
          {node.children!.map((c) => (
            <TreeNode key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );

  // 인덱스 기반 형제 순서 변경: moveNode를 활용하되 같은 부모 내에서는 idx ±1 위치로 이동
  function reorder(id: string, delta: 1 | -1) {
    const { document: doc, moveNode } = useLayoutStore.getState();
    const parent = findParent(doc.root, id);
    if (!parent?.children) return;
    const idx = parent.children.findIndex((c) => c.id === id);
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= parent.children.length) return;
    moveNode(id, parent.id, nextIdx);
  }
}

function nodeLabel(node: LayoutNode): string {
  switch (node.kind) {
    case "container":
      return `◼ ${(node.props as { label?: string }).label ?? "Container"}`;
    case "foldable":
      return `▸ ${(node.props as { title?: string }).title ?? "Section"}`;
    case "text":
      return `T: ${((node.props as { text?: string }).text ?? "").slice(0, 24)}`;
    case "button":
      return `⏺ ${(node.props as { label?: string }).label ?? "Button"}`;
    case "input":
      return `⌨ ${(node.props as { label?: string }).label ?? (node.props as { placeholder?: string }).placeholder ?? "Input"}`;
    case "checkbox":
      return `☑ ${(node.props as { label?: string }).label ?? "Checkbox"}`;
    case "progress":
      return `◐ Progress`;
  }
}

function findParent(root: LayoutNode, childId: string): LayoutNode | null {
  if (!root.children) return null;
  for (const c of root.children) {
    if (c.id === childId) return root;
    const hit = findParent(c, childId);
    if (hit) return hit;
  }
  return null;
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-0.5 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100"
    >
      {children}
    </button>
  );
}
