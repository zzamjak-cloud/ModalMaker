// useLayoutStore 상태·액션 타입 (Phase 3: 스토어 슬라이스 경계의 단일 소스)
import type {
  Interaction,
  InteractionAction,
  InteractionEvent,
  LayoutDocument,
  LayoutNode,
  Module,
  NodeDocument,
  NodeKind,
  NodeProps,
  Page,
  PageEdge,
  SizingProps,
  ViewportSettings,
} from "@/types/layout";

export type EditorMode = "canvas" | "node" | "preview";

export interface LayoutState {
  document: NodeDocument;
  mode: EditorMode;
  selectedId: string | null;
  selectedIds: string[];
  toggleSelectMulti: (id: string) => void;
  clearMultiSelect: () => void;
  updatePropsMulti: (ids: string[], patch: Partial<NodeProps>) => void;
  selectedPageId: string | null;
  editingModuleId: string | null;
  past: NodeDocument[];
  future: NodeDocument[];
  /**
   * 히스토리 coalesce 키 — 같은 키로 연속 커밋되면 past에 추가 스냅샷을 쌓지 않는다.
   * 예: `updateProps:<nodeId>` — 텍스트 입력 1자마다 undo 엔트리가 생기는 것을 방지.
   * 다른 뮤테이션이 발생하면 null이 되며 다음 commit은 새 엔트리를 만든다.
   */
  lastCoalesceKey: string | null;

  setDocument: (doc: LayoutDocument | NodeDocument) => void;
  resetDocument: () => void;
  select: (id: string | null) => void;
  addNode: (parentId: string, node: LayoutNode, index?: number) => void;
  addNewNode: (parentId: string, kind: NodeKind, index?: number) => LayoutNode;
  moveNode: (nodeId: string, targetParentId: string, index?: number) => void;
  updateProps: (id: string, patch: Partial<NodeProps>) => void;
  updateTitle: (title: string) => void;
  updateViewport: (patch: Partial<ViewportSettings>) => void;
  patchNode: (
    id: string,
    patch: {
      sizing?: Partial<SizingProps>;
      flexMainAxis?: LayoutNode["flexMainAxis"] | null;
    },
  ) => void;
  updateSizing: (id: string, patch: Partial<SizingProps>) => void;
  addInteraction: (
    nodeId: string,
    event: InteractionEvent,
    action: InteractionAction,
  ) => Interaction | null;
  updateInteraction: (
    nodeId: string,
    interactionId: string,
    patch: Partial<Omit<Interaction, "id">>,
  ) => void;
  removeInteraction: (nodeId: string, interactionId: string) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  addPage: (title?: string, root?: LayoutNode) => Page;
  duplicatePage: (pageId: string, x?: number, y?: number) => void;
  removePage: (pageId: string) => void;
  updatePage: (pageId: string, patch: Partial<Omit<Page, "id" | "root">>) => void;
  setCurrentPage: (pageId: string) => void;
  movePage: (pageId: string, x: number, y: number) => void;
  /** 지정 pageId를 Root로 설정. 다른 모든 페이지의 isRoot는 false로 해제 (라디오 동작). */
  setRootPage: (pageId: string) => void;

  registerModule: (sourceNodeId: string) => Module | null;
  unlinkModule: (nodeId: string) => void;
  updateModule: (moduleId: string, patch: Partial<Omit<Module, "id" | "root">>) => void;
  removeModule: (moduleId: string) => void;
  enterModuleEdit: (moduleId: string) => void;
  exitModuleEdit: () => void;

  addEdge: (source: string, target: string, sourceHandle?: string) => PageEdge;
  removeEdge: (edgeId: string) => void;

  setMode: (mode: EditorMode) => void;
}
