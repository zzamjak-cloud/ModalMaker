# ModalMaker 개선안 01 구현 플랜

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 MVP 피드백 기반 9개 개선 항목(= 스펙에서 확장된 10개 Feature)을 ModalMaker 1.x 릴리즈에 통합한다.

**Architecture:** 기존 Zustand + Immer 기반 단일 노드 트리 모델을 유지하면서, `LayoutNode`에 공용 `sizing`을 추가하고 `LayoutDocument`에 `viewport`를 추가한다. 신규 `panel-layout` NodeKind가 5-슬롯 고정 레이아웃을 제공하고, 슬롯 내부 container는 `pinned` 속성을 통해 스크롤 고정 영역을 표현한다.

**Tech Stack:** React 18, TypeScript, Zustand + Immer, @dnd-kit/core, Tailwind CSS, Vite, idb-keyval/Firestore

**Spec:** `docs/superpowers/specs/2026-04-18-modalmaker-improvements-01-design.md`

**Testing strategy:** 프로젝트에 단위 테스트 인프라가 없어 각 Task의 검증은 (1) `npm run build` 타입체크·번들 통과, (2) `npm run dev` 후 수동 시나리오 체크로 대체한다. Task마다 "검증 시나리오"를 명시한다.

---

## File Structure

**수정 대상:**
- `src/types/layout.ts` — 타입 확장(`SizingProps`, `ViewportSettings`, `PanelLayoutProps`, `ContainerProps` 확장, `NodeKind` 확장)
- `src/stores/layoutStore.ts` — `defaultPropsFor` 확장, panel-layout 자동 슬롯 생성, `findPanelLayoutSlot` 헬퍼, `VIEWPORT_PRESETS`, 문서 viewport 업데이트
- `src/lib/history.ts` — Delete/Backspace 바인딩 추가
- `src/app/App.tsx` — DragOverlay의 `dropAnimation`을 성공/실패로 분기
- `src/features/canvas/Canvas.tsx` — viewport 박스/Safe Area 적용
- `src/features/canvas/NodeRenderer.tsx` — panel-layout 분기, pinned 렌더, ButtonLeaf 분리, 공용 sizing 적용
- `src/features/canvas/DropZone.tsx` — panel-layout 직계 드롭 차단(부모 타입 확인)
- `src/features/inspector/Inspector.tsx` — Border 섹션, Pin 섹션, Panel Layout 섹션, 공용 Size 섹션
- `src/features/palette/Palette.tsx` — `panel-layout` 팔레트 항목 추가
- `src/features/layer-tree/LayerTree.tsx` — 슬롯 container 이동/삭제 비활성
- `src/features/toolbar/Toolbar.tsx` — Save As 버튼, viewport 드롭다운, Safe Area 입력, Load id 재할당 제거

**새 파일:**
- `src/features/canvas/applySizing.ts` — 공용 sizing→CSS 변환 헬퍼
- `src/features/canvas/PanelLayoutRenderer.tsx` — panel-layout 전용 그리드 렌더러
- `src/features/canvas/SlotContainerRenderer.tsx` — 슬롯 container의 pinned 렌더링
- `src/features/canvas/ButtonLeaf.tsx` — 인라인 편집 가능한 Button 리프
- `src/features/inspector/SizeSection.tsx` — 공용 고정 크기 섹션
- `src/features/inspector/PanelLayoutSection.tsx` — panel-layout 슬롯 토글/크기 섹션
- `src/features/toolbar/SaveAsDialog.tsx` — 새 이름으로 저장 다이얼로그
- `src/features/toolbar/ViewportSelector.tsx` — 뷰포트 드롭다운 + Custom 입력

---

## Conventions

- **한국어 주석** (CLAUDE.md 규칙)
- **식별자는 영어** (변수/함수/타입)
- **커밋 스타일**: 기존 히스토리(`feat:`, `chore:`)를 따른다
- **각 Task 끝에 커밋** 단, 동일 Feature 내부 step은 한 커밋으로 묶어도 됨(명시된 커밋 스텝만 커밋)

---

## Task 1 — Type 확장: SizingProps, ViewportSettings, NodeKind, ContainerProps, PanelLayoutProps

**Files:**
- Modify: `src/types/layout.ts`

- [ ] **Step 1.1: `NodeKind`에 `panel-layout` 추가 + `CONTAINER_KINDS` 업데이트**

수정 전:
```ts
export type NodeKind =
  | "container"
  | "text"
  | "button"
  | "input"
  | "checkbox"
  | "progress"
  | "split"
  | "foldable";

export const CONTAINER_KINDS: NodeKind[] = ["container", "foldable"];
```

수정 후:
```ts
export type NodeKind =
  | "container"
  | "panel-layout" // 5-슬롯 고정 패널 레이아웃 (header/left/main/right/footer)
  | "text"
  | "button"
  | "input"
  | "checkbox"
  | "progress"
  | "split"
  | "foldable";

export const CONTAINER_KINDS: NodeKind[] = ["container", "foldable", "panel-layout"];
```

- [ ] **Step 1.2: `ContainerProps`에 border와 pinned 필드 추가**

수정 전 (기존 ContainerProps 말미):
```ts
  columns?: number; // grid 전용
  label?: string; // Export 시 [Container: <label>] 형태로 노출
}
```

수정 후:
```ts
  columns?: number; // grid 전용
  label?: string; // Export 시 [Container: <label>] 형태로 노출

  // Container 자체의 경계선
  borderStyle?: "none" | "solid" | "dashed" | "dotted"; // 기본 "none"
  borderWidth?: number; // 기본 1, 허용 범위 0~8
  borderColor?: string; // 기본 "#525252"

  // panel-layout 슬롯 container 1단 자식일 때만 유효한 고정 영역 표시
  pinned?: "none" | "top" | "bottom"; // 기본 "none"
}
```

- [ ] **Step 1.3: `PanelLayoutProps` 인터페이스 추가**

`SplitProps` 선언부 뒤에 추가:
```ts
export interface PanelLayoutProps {
  showHeader?: boolean;   // 기본 true
  showFooter?: boolean;   // 기본 false
  showLeft?: boolean;     // 기본 true
  showRight?: boolean;    // 기본 false
  headerHeight?: number;  // 기본 48
  footerHeight?: number;  // 기본 40
  leftWidth?: number;     // 기본 220
  rightWidth?: number;    // 기본 260
  label?: string;         // 기본 "Panel Layout"
}
```

- [ ] **Step 1.4: `NodeProps` union에 `PanelLayoutProps` 추가**

수정 전:
```ts
export type NodeProps =
  | ContainerProps
  | TextProps
  | ButtonProps
  | InputProps
  | CheckboxProps
  | ProgressProps
  | SplitProps
  | FoldableProps;
```

수정 후:
```ts
export type NodeProps =
  | ContainerProps
  | PanelLayoutProps
  | TextProps
  | ButtonProps
  | InputProps
  | CheckboxProps
  | ProgressProps
  | SplitProps
  | FoldableProps;
```

- [ ] **Step 1.5: `SizingProps` 추가 + `LayoutNode`에 `sizing` 필드 추가**

`LayoutNode` 위에 추가:
```ts
// 모든 노드에 공용 적용되는 고정 크기 제어.
// fixedSize=false(기본) 혹은 undefined면 자동 크기.
export interface SizingProps {
  fixedSize?: boolean;
  width?: number;  // px, fixedSize=true일 때만 적용
  height?: number; // px, fixedSize=true일 때만 적용
}
```

`LayoutNode` 수정:
```ts
export interface LayoutNode {
  id: string;
  kind: NodeKind;
  props: NodeProps;
  sizing?: SizingProps; // 공용 고정 크기
  style?: Partial<CSSProperties>;
  children?: LayoutNode[];
}
```

- [ ] **Step 1.6: `LayoutDocument`에 `viewport` 필드 + `VIEWPORT_PRESETS` export**

파일 말미(또는 적절한 위치)에 추가:
```ts
export interface ViewportSettings {
  preset: "free" | "desktop" | "laptop" | "tablet" | "mobile" | "custom";
  width?: number;   // preset="custom"일 때만 사용
  height?: number;  // preset="custom"일 때만 사용
  safeAreaPct?: number; // 0~20, 기본 0
}

export const VIEWPORT_PRESETS = {
  desktop: { width: 1920, height: 1080 },
  laptop:  { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
} as const;
```

`LayoutDocument` 수정:
```ts
export interface LayoutDocument {
  id: string;
  title: string;
  root: LayoutNode;
  viewport?: ViewportSettings; // 뷰포트(해상도) 설정
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}
```

- [ ] **Step 1.7: 타입체크 통과 확인**

Run: `npm run build`
Expected: 오류 없음 (`panel-layout` 소비처는 아직 없으므로 기존 코드는 영향 없음)

- [ ] **Step 1.8: 커밋**

```bash
git add src/types/layout.ts
git commit -m "feat: extend LayoutNode types with sizing, viewport, panel-layout, border, pinned"
```

---

## Task 2 — Store 확장: defaultProps, panel-layout 자동 슬롯, findPanelLayoutSlot 헬퍼, viewport 업데이트

**Files:**
- Modify: `src/stores/layoutStore.ts`

- [ ] **Step 2.1: `defaultPropsFor`에 `panel-layout` 케이스 추가**

수정 전 (switch 안):
```ts
    case "container":
      return { direction: "column", gap: 8, padding: 12, label: "Container" };
    case "foldable":
      return { title: "Section", open: true };
```

수정 후:
```ts
    case "container":
      return { direction: "column", gap: 8, padding: 12, label: "Container" };
    case "panel-layout":
      return {
        showHeader: true,
        showFooter: false,
        showLeft: true,
        showRight: false,
        headerHeight: 48,
        footerHeight: 40,
        leftWidth: 220,
        rightWidth: 260,
        label: "Panel Layout",
      };
    case "foldable":
      return { title: "Section", open: true };
```

- [ ] **Step 2.2: `createNode`에 panel-layout 자동 자식 5개 생성 로직 추가**

기존:
```ts
export function createNode(kind: NodeKind, overrides: Partial<LayoutNode> = {}): LayoutNode {
  const base: LayoutNode = {
    id: newId(),
    kind,
    props: defaultPropsFor(kind),
    children: isContainerKind(kind) ? [] : undefined,
    ...overrides,
  };
  return base;
}
```

수정 후:
```ts
export function createNode(kind: NodeKind, overrides: Partial<LayoutNode> = {}): LayoutNode {
  const base: LayoutNode = {
    id: newId(),
    kind,
    props: defaultPropsFor(kind),
    children: isContainerKind(kind) ? [] : undefined,
    ...overrides,
  };
  if (kind === "panel-layout" && (!overrides.children || overrides.children.length === 0)) {
    // 슬롯 container를 고정 5개 생성. 인덱스 = 슬롯 ID.
    // 0=header, 1=left, 2=main, 3=right, 4=footer
    base.children = [
      createNode("container", { props: { direction: "row",    gap: 8, padding: 12, label: "Header" } }),
      createNode("container", { props: { direction: "column", gap: 8, padding: 12, label: "Left"   } }),
      createNode("container", { props: { direction: "column", gap: 8, padding: 12, label: "Main"   } }),
      createNode("container", { props: { direction: "column", gap: 8, padding: 12, label: "Right"  } }),
      createNode("container", { props: { direction: "row",    gap: 8, padding: 12, label: "Footer" } }),
    ];
  }
  return base;
}
```

- [ ] **Step 2.3: `findPanelLayoutSlot` 헬퍼 export 추가**

파일 하단(`cloneWithNewIds` 근처)에 추가:
```ts
// 주어진 childId가 panel-layout의 직접 자식(슬롯 container)이면 인덱스를 리턴.
// 그 외(일반 container 자식, 슬롯 container 내부 자식 등)는 null.
export function findPanelLayoutSlot(
  root: LayoutNode,
  childId: string,
): { slotIndex: 0 | 1 | 2 | 3 | 4; parent: LayoutNode } | null {
  const parent = findParentPublic(root, childId);
  if (!parent || parent.kind !== "panel-layout") return null;
  const idx = parent.children?.findIndex((c) => c.id === childId) ?? -1;
  if (idx < 0 || idx > 4) return null;
  return { slotIndex: idx as 0 | 1 | 2 | 3 | 4, parent };
}

// findParent는 파일 상단의 내부 함수. 외부 사용을 위해 공개 래퍼 제공.
function findParentPublic(root: LayoutNode, childId: string): LayoutNode | null {
  return findParent(root, childId);
}
```

- [ ] **Step 2.4: `updateViewport` 액션 추가**

`LayoutState` 인터페이스에 선언 추가(상단 선언부):
```ts
  updateViewport: (patch: Partial<import("@/types/layout").ViewportSettings>) => void;
```

store 본체에 구현 추가 (`updateTitle` 근처):
```ts
  updateViewport: (patch) =>
    set((s) =>
      commit(s, (draft) => {
        const prev = draft.viewport ?? { preset: "free" };
        draft.viewport = { ...prev, ...patch };
      }),
    ),
```

- [ ] **Step 2.5: 타입체크 및 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 2.6: 커밋**

```bash
git add src/stores/layoutStore.ts
git commit -m "feat: add panel-layout auto-slots, viewport action, findPanelLayoutSlot helper"
```

---

## Task 3 — 키보드 단축키: Delete / Backspace 삭제

**Files:**
- Modify: `src/lib/history.ts`

- [ ] **Step 3.1: `useGlobalShortcuts`에 Delete/Backspace 케이스 추가**

전체 교체:
```ts
// 전역 단축키 (Undo/Redo, 삭제) 바인딩 훅
import { useEffect } from "react";
import { useLayoutStore } from "@/stores/layoutStore";

export function useGlobalShortcuts(): void {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // 텍스트 입력 포커스 시 삭제 단축키 무시 (편집 방해 방지)
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isEditing =
        tag === "input" || tag === "textarea" || t?.isContentEditable === true;

      const mod = e.metaKey || e.ctrlKey;
      if (mod) {
        if (e.key.toLowerCase() === "z" && !e.shiftKey) {
          e.preventDefault();
          useLayoutStore.getState().undo();
          return;
        }
        if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") {
          e.preventDefault();
          useLayoutStore.getState().redo();
          return;
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !isEditing) {
        const { selectedId, removeNode, document: doc } = useLayoutStore.getState();
        if (!selectedId || selectedId === doc.root.id) return;
        e.preventDefault();
        removeNode(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
```

- [ ] **Step 3.2: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 3.3: 수동 검증 (dev)**

Run: `npm run dev`, 브라우저 열어 아래 시나리오 실행:
1. 컨테이너에 Text 추가 → Text 클릭으로 선택 → Delete 키 → 삭제됨 ✅
2. Cmd/Ctrl+Z → Text 복구됨 ✅
3. Text 더블클릭 후 편집 모드에서 Backspace → 텍스트 문자만 지워지고 노드는 유지됨 ✅
4. 루트 컨테이너 선택 후 Delete → 아무 일도 일어나지 않음 ✅

- [ ] **Step 3.4: 커밋**

```bash
git add src/lib/history.ts
git commit -m "feat: delete/backspace shortcut to remove selected node"
```

---

## Task 4 — DnD 성공/실패 드롭 애니메이션 분기

**Files:**
- Modify: `src/app/App.tsx`

- [ ] **Step 4.1: `DragOverlay`의 `dropAnimation` 상태 관리 도입**

기존 import 구문에 `defaultDropAnimation`, `type DropAnimation`이 필요하면 추가:
```ts
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  defaultDropAnimation,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DropAnimation,
} from "@dnd-kit/core";
```

컴포넌트 내부 상태 추가 (기존 `activeLabel` 근처):
```ts
  const [dropAnim, setDropAnim] = useState<DropAnimation | null>(defaultDropAnimation);
```

`onDragStart` 맨 위에 reset 추가:
```ts
  const onDragStart = (e: DragStartEvent) => {
    setDropAnim(defaultDropAnimation); // 새 드래그 시작 시 기본 애니메이션으로 복원
    const data = e.active.data.current as { source?: string; kind?: NodeKind; nodeId?: string };
    if (data?.source === "palette") setActiveLabel(`+ ${data.kind}`);
    else if (data?.source === "canvas") setActiveLabel("이동 중…");
  };
```

`onDragEnd`를 아래처럼 수정:
```ts
  const onDragEnd = (e: DragEndEvent) => {
    const active = e.active.data.current as
      | { source?: "palette" | "canvas"; kind?: NodeKind; nodeId?: string }
      | undefined;
    const over = e.over?.data.current as { containerId?: string; index?: number } | undefined;

    // 드롭 성공: 원위치 애니메이션 없이 즉시 제거
    if (active && over?.containerId) {
      setDropAnim(null);
    } else {
      // 드롭 실패: 기본 애니메이션으로 원위치 복귀 (시각적 실패 피드백)
      setDropAnim(defaultDropAnimation);
    }
    setActiveLabel(null);

    if (!active || !over?.containerId) return;

    if (active.source === "palette" && active.kind) {
      const created = addNewNode(over.containerId, active.kind, over.index);
      select(created.id);
      return;
    }
    if (active.source === "canvas" && active.nodeId) {
      moveNode(active.nodeId, over.containerId, over.index);
    }
  };
```

`DragOverlay` JSX에 prop 전달:
```tsx
      <DragOverlay dropAnimation={dropAnim}>
        {activeLabel && (
          <div className="rounded-md bg-sky-500/90 px-3 py-1.5 text-sm text-white shadow-lg">
            {activeLabel}
          </div>
        )}
      </DragOverlay>
```

- [ ] **Step 4.2: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 4.3: 수동 검증**

1. 팔레트 → 캔버스 드롭존: Overlay가 즉시 사라짐 ✅
2. 팔레트 → 빈 공간(캔버스 바깥): Overlay가 원위치로 튕겨 돌아가며 사라짐 ✅
3. 캔버스 내 노드 이동 성공: 즉시 사라짐 ✅

- [ ] **Step 4.4: 커밋**

```bash
git add src/app/App.tsx
git commit -m "feat: suppress drop animation on successful drop, keep it on failure"
```

---

## Task 5 — ButtonLeaf 컴포넌트 + Button 인라인 편집

**Files:**
- Create: `src/features/canvas/ButtonLeaf.tsx`
- Modify: `src/features/canvas/NodeRenderer.tsx`

- [ ] **Step 5.1: `ButtonLeaf.tsx` 생성**

파일 내용:
```tsx
// 인라인 편집 가능한 Button 리프
// - 더블 클릭으로 편집 모드 진입
// - Enter(shift 없이) / blur로 커밋, Escape으로 취소
// - 편집 중에는 드래그/선택 방해 방지를 위해 이벤트 stopPropagation
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { ButtonProps, LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";

export function ButtonLeaf({
  node,
  editing,
  setEditing,
}: {
  node: LayoutNode;
  editing: boolean;
  setEditing: (v: boolean) => void;
}) {
  const p = node.props as ButtonProps;
  const updateProps = useLayoutStore((s) => s.updateProps);
  const [draft, setDraft] = useState(p.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(p.label);
  }, [p.label, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const variantClass = {
    primary: "bg-sky-500 text-white hover:bg-sky-400",
    secondary: "bg-neutral-700 text-neutral-100 hover:bg-neutral-600",
    destructive: "bg-rose-600 text-white hover:bg-rose-500",
    ghost: "bg-transparent text-neutral-300 border border-neutral-700 hover:bg-neutral-800",
  }[p.variant ?? "primary"];
  const sizeClass = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
    lg: "px-4 py-2 text-base",
  }[p.size ?? "md"];

  if (editing) {
    const commit = () => {
      updateProps(node.id, { label: draft });
      setEditing(false);
    };
    return (
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setDraft(p.label);
            setEditing(false);
          }
          e.stopPropagation();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "rounded-md font-medium outline-none ring-2 ring-sky-500",
          variantClass,
          sizeClass,
        )}
      />
    );
  }

  return (
    <button
      onDoubleClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className={cn("rounded-md font-medium transition", variantClass, sizeClass)}
      title="더블 클릭하여 편집"
    >
      {p.label}
    </button>
  );
}
```

- [ ] **Step 5.2: `NodeRenderer.tsx`에서 ButtonLeaf 사용**

상단 import 추가:
```ts
import { ButtonLeaf } from "./ButtonLeaf";
```

기존 `renderLeaf` 시그니처를 아래처럼 수정(edit 상태를 Button도 공유):
```ts
function renderLeaf(
  node: LayoutNode,
  editing: boolean,
  setEditing: (v: boolean) => void,
): React.ReactNode {
  switch (node.kind) {
    case "text":
      return <TextLeaf node={node} editing={editing} setEditing={setEditing} />;
    case "button":
      return <ButtonLeaf node={node} editing={editing} setEditing={setEditing} />;
    // ... 기존 분기 그대로
```

`NodeRenderer`의 `useDraggable` 조건에서 `editingText`를 `editingLeaf`로 리네임(Text/Button 공용 의미로 사용):

수정 전:
```ts
  const [editingText, setEditingText] = useState(false);
  ...
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0 || editingText,
  });
```

수정 후:
```ts
  const [editingLeaf, setEditingLeaf] = useState(false);
  ...
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0 || editingLeaf,
  });
```

그리고 `renderLeaf` 호출부를 수정:
```tsx
      {renderLeaf(node, editingLeaf, setEditingLeaf)}
```

- [ ] **Step 5.3: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 5.4: 수동 검증**

1. Button 추가 → 더블클릭 → 인라인 입력 등장 → 텍스트 변경 → Enter → 반영됨 ✅
2. 편집 중 Escape → 원복 ✅
3. 편집 중 마우스 드래그 시도 → 드래그되지 않음 ✅

- [ ] **Step 5.5: 커밋**

```bash
git add src/features/canvas/ButtonLeaf.tsx src/features/canvas/NodeRenderer.tsx
git commit -m "feat: inline-edit button label via double-click"
```

---

## Task 6 — Load 시 id 재할당 제거 (덮어쓰기 활성화)

**Files:**
- Modify: `src/features/toolbar/Toolbar.tsx`

- [ ] **Step 6.1: `load` 함수 수정**

수정 전:
```ts
  function load(d: LayoutDocument) {
    setDocument({
      ...d,
      id: newId("doc"),
      root: cloneWithNewIds(d.root),
      updatedAt: Date.now(),
    });
    setOpenLoad(false);
  }
```

수정 후:
```ts
  function load(d: LayoutDocument) {
    // id/원본 root id를 그대로 유지해야 이후 Save가 '원본 덮어쓰기'로 동작한다.
    setDocument(d);
    setOpenLoad(false);
  }
```

그리고 상단의 `cloneWithNewIds` import가 load에서만 쓰였다면 그대로 두고 다른 호출(saveAsPreset)이 남아 있는지 확인. 현 Toolbar에서는 `saveAsPreset`에서도 사용하므로 import는 유지.

- [ ] **Step 6.2: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 6.3: 수동 검증**

1. 새 문서 → Save → Load 다이얼로그 열어 확인: 1건 ✅
2. 내용 수정 → Save → Load 다이얼로그: 여전히 **1건** (중복 생성 없음) ✅

- [ ] **Step 6.4: 커밋**

```bash
git add src/features/toolbar/Toolbar.tsx
git commit -m "fix: preserve original doc id on load so subsequent save overwrites"
```

---

## Task 7 — Save As 다이얼로그 + 툴바 버튼

**Files:**
- Create: `src/features/toolbar/SaveAsDialog.tsx`
- Modify: `src/features/toolbar/Toolbar.tsx`

- [ ] **Step 7.1: `SaveAsDialog.tsx` 생성**

파일 내용:
```tsx
// '새 이름으로 저장' 다이얼로그 - Photoshop 스타일 Save As
// 제목 입력 후 확인 시 부모가 새 id로 저장을 처리하도록 콜백 호출.
import { useEffect, useRef, useState } from "react";

export function SaveAsDialog({
  initialTitle,
  onCancel,
  onConfirm,
}: {
  initialTitle: string;
  onCancel: () => void;
  onConfirm: (title: string) => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[min(420px,92vw)] overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="text-sm font-semibold">다른 이름으로 저장</div>
          <button onClick={onCancel} className="text-xs text-neutral-400 hover:text-neutral-200">
            닫기
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1 text-xs text-neutral-400">
            새 파일 제목
            <input
              ref={ref}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && title.trim()) {
                  e.preventDefault();
                  onConfirm(title.trim());
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  onCancel();
                }
              }}
              className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-xs text-neutral-200 hover:bg-neutral-800"
            >
              취소
            </button>
            <button
              onClick={() => title.trim() && onConfirm(title.trim())}
              disabled={!title.trim()}
              className="rounded-md bg-sky-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.2: Toolbar에 Save As 버튼 및 핸들러 연결**

import 추가:
```ts
import { SaveAsDialog } from "./SaveAsDialog";
```

state 추가 (`openLoad` 근처):
```ts
  const [openSaveAs, setOpenSaveAs] = useState(false);
```

저장 함수 추가 (`save` 아래):
```ts
  async function saveAs(newTitle: string) {
    const now = Date.now();
    const copy: LayoutDocument = {
      ...doc,
      id: newId("doc"),
      title: newTitle,
      root: cloneWithNewIds(doc.root),
      createdAt: now,
      updatedAt: now,
    };
    try {
      await currentAdapter().saveDocument(copy);
      setDocument(copy); // 이후 사용자가 사본을 계속 편집
      flash(`새 파일로 저장됨: ${newTitle}`);
    } catch (err) {
      console.error("Save As failed:", err);
      flash(`다른 이름으로 저장 실패: ${readableError(err)}`);
    } finally {
      setOpenSaveAs(false);
    }
  }
```

툴바 JSX의 Save 버튼 바로 뒤에 Save As 버튼 추가:
```tsx
        <ToolbarButton onClick={save} title="로컬에 저장 (IndexedDB)">
          <Save size={14} />
          <span>Save</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => setOpenSaveAs(true)} title="다른 이름으로 저장">
          <Save size={14} />
          <span>Save As</span>
        </ToolbarButton>
```

하단 Portal(LoadDialog 옆)에 다이얼로그 렌더:
```tsx
      {openLoad && (
        <LoadDialog docs={savedDocs} onClose={() => setOpenLoad(false)} onLoad={load} />
      )}
      {openSaveAs && (
        <SaveAsDialog
          initialTitle={`${doc.title} (사본)`}
          onCancel={() => setOpenSaveAs(false)}
          onConfirm={saveAs}
        />
      )}
```

- [ ] **Step 7.3: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 7.4: 수동 검증**

1. Save As 클릭 → 다이얼로그 → 확인 → Load 목록에 2건 존재 ✅
2. 새로 생긴 사본을 계속 편집 후 Save → Load 목록에 여전히 2건(사본만 갱신) ✅
3. 다이얼로그에서 Escape → 취소 ✅

- [ ] **Step 7.5: 커밋**

```bash
git add src/features/toolbar/SaveAsDialog.tsx src/features/toolbar/Toolbar.tsx
git commit -m "feat: save-as dialog to branch current doc into a new file"
```

---

## Task 8 — Viewport 선택기 (툴바 UI)

**Files:**
- Create: `src/features/toolbar/ViewportSelector.tsx`
- Modify: `src/features/toolbar/Toolbar.tsx`

- [ ] **Step 8.1: `ViewportSelector.tsx` 생성**

파일 내용:
```tsx
// 뷰포트 프리셋 드롭다운 + Custom 입력 + Safe Area % 입력
import { Monitor } from "lucide-react";
import { cn } from "@/lib/cn";
import { useLayoutStore } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";

type Preset = ViewportSettings["preset"];

const PRESET_LABEL: Record<Preset, string> = {
  free: "Free",
  desktop: "Desktop 1920×1080",
  laptop: "Laptop 1440×900",
  tablet: "Tablet 768×1024",
  mobile: "Mobile 375×812",
  custom: "Custom",
};

export function ViewportSelector() {
  const viewport = useLayoutStore((s) => s.document.viewport) ?? { preset: "free" as Preset };
  const updateViewport = useLayoutStore((s) => s.updateViewport);

  const preset = viewport.preset;
  const isCustom = preset === "custom";
  const customW = viewport.width ?? 1280;
  const customH = viewport.height ?? 720;
  const safe = viewport.safeAreaPct ?? 0;

  return (
    <div className="flex items-center gap-2">
      <Monitor size={14} className="text-neutral-400" />
      <select
        value={preset}
        onChange={(e) => updateViewport({ preset: e.target.value as Preset })}
        className="rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      >
        {(Object.keys(PRESET_LABEL) as Preset[]).map((p) => (
          <option key={p} value={p}>
            {PRESET_LABEL[p]}
          </option>
        ))}
      </select>

      {isCustom && (
        <>
          <NumberField
            label="W"
            value={customW}
            min={100}
            max={4096}
            onChange={(v) => updateViewport({ width: v })}
          />
          <NumberField
            label="H"
            value={customH}
            min={100}
            max={4096}
            onChange={(v) => updateViewport({ height: v })}
          />
        </>
      )}

      <NumberField
        label="Safe%"
        value={safe}
        min={0}
        max={20}
        onChange={(v) => updateViewport({ safeAreaPct: v })}
      />
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className={cn("flex items-center gap-1 text-[10px] text-neutral-400")}>
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-14 rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 8.2: Toolbar에 ViewportSelector 삽입**

import 추가:
```ts
import { ViewportSelector } from "./ViewportSelector";
```

JSX에서 Title input 이후, `<div className="flex-1" />` 앞에 삽입:
```tsx
        <input
          value={doc.title}
          onChange={(e) => updateTitle(e.target.value)}
          className="w-48 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-sm text-neutral-100 focus:border-sky-500 focus:outline-none"
          placeholder="제목"
        />

        <div className="h-5 w-px bg-neutral-800" />
        <ViewportSelector />

        <div className="flex-1" />
```

- [ ] **Step 8.3: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 8.4: 수동 검증 (UI만 확인; Canvas 반영은 Task 9에서)**

1. 드롭다운 열고 각 프리셋 선택 → store `viewport.preset` 값 변경 (React DevTools에서 확인) ✅
2. Custom 선택 시 W/H 입력 노출 ✅
3. Safe% 입력 0~20 범위 ✅

- [ ] **Step 8.5: 커밋**

```bash
git add src/features/toolbar/ViewportSelector.tsx src/features/toolbar/Toolbar.tsx
git commit -m "feat: toolbar viewport selector (preset, custom, safe area)"
```

---

## Task 9 — Canvas가 viewport/safe area 반영

**Files:**
- Modify: `src/features/canvas/Canvas.tsx`

- [ ] **Step 9.1: `Canvas.tsx` 전체 교체**

```tsx
// 캔버스 루트 - 문서 트리의 루트 컨테이너를 렌더링한다.
// viewport가 설정되어 있으면 해당 해상도의 고정 박스로 표시하고,
// safeAreaPct로 안쪽 마진(%)을 적용한다. free는 기존처럼 자식 크기에 맞춘다.
import { useLayoutStore } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";

function resolveSize(v: ViewportSettings): { width: number; height: number } | null {
  if (v.preset === "free") return null;
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720 };
  const p = VIEWPORT_PRESETS[v.preset];
  return { width: p.width, height: p.height };
}

export function Canvas() {
  const root = useLayoutStore((s) => s.document.root);
  const viewport = useLayoutStore((s) => s.document.viewport) ?? { preset: "free" as const };

  const size = resolveSize(viewport);
  const safe = Math.max(0, Math.min(20, viewport.safeAreaPct ?? 0));

  if (!size) {
    return (
      <div className="relative">
        <NodeRenderer node={root} depth={0} />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-md bg-neutral-900/50 ring-1 ring-neutral-800"
      style={{ width: size.width, height: size.height }}
    >
      <div className="pointer-events-none absolute -top-6 left-0 select-none text-[10px] uppercase tracking-wider text-neutral-500">
        {size.width} × {size.height}
      </div>
      <div
        className="h-full w-full"
        style={{ padding: `${safe}%` }}
      >
        <NodeRenderer node={root} depth={0} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 9.3: 수동 검증**

1. 뷰포트 Desktop 선택 → Canvas가 1920×1080 고정 박스로 표시되고 좌상단 라벨 노출 ✅
2. 본문 영역이 Canvas보다 작으면 `main`의 `overflow-auto`로 스크롤바 노출 ✅
3. Safe% 5 설정 → 프레임 안쪽에 5% 패딩 ✅
4. Free 선택 → 기존 동작(자식 크기에 맞춤) 복원 ✅

- [ ] **Step 9.4: 커밋**

```bash
git add src/features/canvas/Canvas.tsx
git commit -m "feat: canvas renders fixed-size viewport frame with safe-area padding"
```

---

## Task 10 — Container 보더 스타일 옵션

**Files:**
- Modify: `src/features/canvas/NodeRenderer.tsx`
- Modify: `src/features/inspector/Inspector.tsx`

- [ ] **Step 10.1: `containerStyle` 함수에 border 반영**

NodeRenderer.tsx의 `containerStyle` 함수를 아래로 교체:
```ts
function containerStyle(p: ContainerProps): React.CSSProperties {
  const isGrid = p.direction === "grid";
  const base: React.CSSProperties = {
    display: isGrid ? "grid" : "flex",
    flexDirection: p.direction === "row" ? "row" : "column",
    gridTemplateColumns: isGrid ? `repeat(${p.columns ?? 2}, minmax(0,1fr))` : undefined,
    gap: p.gap ?? 8,
    alignItems: p.align,
    justifyContent: p.justify === "between" ? "space-between" : p.justify,
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
  // Container 자체 경계선
  if (p.borderStyle && p.borderStyle !== "none") {
    base.borderStyle = p.borderStyle;
    base.borderWidth = p.borderWidth ?? 1;
    base.borderColor = p.borderColor ?? "#525252";
  }
  return base;
}
```

- [ ] **Step 10.2: Inspector container 섹션에 Border 필드 추가**

Inspector.tsx의 `case "container"` 분기 내, `PaddingField` 바로 아래에 추가:
```tsx
          <Field label="Border Style">
            <SegmentedControl
              value={p.borderStyle ?? "none"}
              options={[
                { value: "none", label: "없음" },
                { value: "solid", label: "실선" },
                { value: "dashed", label: "대시" },
                { value: "dotted", label: "점선" },
              ]}
              onChange={(v) => onChange({ borderStyle: v })}
            />
          </Field>
          {p.borderStyle && p.borderStyle !== "none" && (
            <>
              <Field label="Border Width (px)">
                <NumberInput
                  value={p.borderWidth ?? 1}
                  min={0}
                  max={8}
                  onChange={(v) => onChange({ borderWidth: v })}
                />
              </Field>
              <Field label="Border Color (hex)">
                <TextInput
                  value={p.borderColor ?? "#525252"}
                  onChange={(v) => onChange({ borderColor: v })}
                />
              </Field>
            </>
          )}
```

- [ ] **Step 10.3: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 10.4: 수동 검증**

1. Container 선택 → Border Style에서 실선/대시/점선/없음 전환 반영 ✅
2. Width/Color 입력 반영 ✅

- [ ] **Step 10.5: 커밋**

```bash
git add src/features/canvas/NodeRenderer.tsx src/features/inspector/Inspector.tsx
git commit -m "feat: container border style/width/color options"
```

---

## Task 11 — 공용 `applySizing` 헬퍼 + NodeRenderer 적용

**Files:**
- Create: `src/features/canvas/applySizing.ts`
- Modify: `src/features/canvas/NodeRenderer.tsx`

- [ ] **Step 11.1: `applySizing.ts` 생성**

```ts
// 공용 sizing → CSS 변환 헬퍼
// fixedSize=true면 width/height 스타일 및 flex-shrink:0을 반환. 그 외에는 빈 객체.
import type { CSSProperties } from "react";
import type { LayoutNode } from "@/types/layout";

export function applySizing(node: LayoutNode): CSSProperties {
  const s = node.sizing;
  if (!s?.fixedSize) return {};
  const out: CSSProperties = { flexShrink: 0 };
  if (typeof s.width === "number") out.width = s.width;
  if (typeof s.height === "number") out.height = s.height;
  return out;
}
```

- [ ] **Step 11.2: NodeRenderer에서 container / leaf wrapper에 sizing 스타일 병합**

상단 import 추가:
```ts
import { applySizing } from "./applySizing";
```

Container 렌더 부분: 기존 `style={containerStyle(p)}` → `style={{ ...containerStyle(p), ...applySizing(node) }}`

Leaf wrapper 렌더 부분: 기존
```tsx
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={selectHandler}
      className={cn(outline, "px-1 py-0.5")}
    >
      {renderLeaf(node, editingLeaf, setEditingLeaf)}
    </div>
  );
```

수정 후:
```tsx
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={selectHandler}
      className={cn(outline, "px-1 py-0.5")}
      style={applySizing(node)}
    >
      {renderLeaf(node, editingLeaf, setEditingLeaf)}
    </div>
  );
```

참고: leaf wrapper가 고정 크기를 가지면 내부 Leaf 자체는 wrapper를 채운다. 각 leaf가 개별적으로 추가 조정이 필요한 경우는 Task 11.3에서 커스터마이즈한다.

- [ ] **Step 11.3: `text` 리프가 고정 크기일 때 넘침 처리**

`TextLeaf` 컴포넌트(NodeRenderer.tsx 하단)의 비편집 분기를 수정. 기존:
```tsx
  return (
    <span
      className={cn(size, weight, "cursor-text text-neutral-100 select-text")}
      style={{ color: p.color }}
      onDoubleClick={...}
```

수정 후:
```tsx
  const fixed = !!node.sizing?.fixedSize;
  if (fixed) {
    // 고정 크기일 때 감싼 div에 width/height를 받고 텍스트는 overflow: hidden
    return (
      <div
        className={cn(size, weight, "cursor-text text-neutral-100 select-text")}
        style={{
          color: p.color,
          width: node.sizing?.width,
          height: node.sizing?.height,
          overflow: "hidden",
        }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
        onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); setEditing(true); } }}
        tabIndex={0}
        title="더블 클릭하여 편집"
      >
        {p.text || "Text"}
      </div>
    );
  }
  return (
    <span
      className={cn(size, weight, "cursor-text text-neutral-100 select-text")}
      style={{ color: p.color }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      onKeyDown={(e) => { if (e.key === "F2") { e.preventDefault(); setEditing(true); } }}
      tabIndex={0}
      title="더블 클릭하여 편집"
    >
      {p.text || "Text"}
    </span>
  );
```

- [ ] **Step 11.4: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음 (Inspector 쪽은 Task 12에서 UI 연결)

- [ ] **Step 11.5: 커밋**

```bash
git add src/features/canvas/applySizing.ts src/features/canvas/NodeRenderer.tsx
git commit -m "feat: applySizing helper + fixed-size rendering for container and text"
```

---

## Task 12 — Inspector 공용 `SizeSection`

**Files:**
- Create: `src/features/inspector/SizeSection.tsx`
- Modify: `src/features/inspector/Inspector.tsx`
- Modify: `src/stores/layoutStore.ts`

- [ ] **Step 12.1: Store에 `updateSizing` 액션 추가**

`LayoutState` 타입 선언에 추가:
```ts
  updateSizing: (id: string, patch: Partial<import("@/types/layout").SizingProps>) => void;
```

store 본체 구현 추가 (`updateProps` 근처):
```ts
  updateSizing: (id, patch) =>
    set((s) =>
      commit(s, (draft) => {
        const node = findNode(draft.root, id);
        if (!node) return;
        node.sizing = { ...(node.sizing ?? {}), ...patch };
      }),
    ),
```

- [ ] **Step 12.2: `SizeSection.tsx` 생성**

```tsx
// 공용 고정 크기 섹션 - 모든 kind에 적용.
// 'Fixed size' 토글 + W/H 입력. 토글 OFF 시 값은 보존하고 UI만 숨김.
import type { LayoutNode } from "@/types/layout";
import { useLayoutStore } from "@/stores/layoutStore";

export function SizeSection({ node }: { node: LayoutNode }) {
  const updateSizing = useLayoutStore((s) => s.updateSizing);
  const s = node.sizing ?? {};
  const fixed = !!s.fixedSize;
  const w = s.width ?? 120;
  const h = s.height ?? 40;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Size</span>
        <label className="flex items-center gap-1.5 text-[11px] text-neutral-400">
          <input
            type="checkbox"
            checked={fixed}
            onChange={(e) => {
              if (e.target.checked) {
                updateSizing(node.id, { fixedSize: true, width: w, height: h });
              } else {
                updateSizing(node.id, { fixedSize: false });
              }
            }}
            className="h-3.5 w-3.5 accent-sky-500"
          />
          Fixed size
        </label>
      </div>
      {fixed && (
        <div className="grid grid-cols-2 gap-1.5">
          <label className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">W</span>
            <input
              type="number"
              value={w}
              min={0}
              max={4096}
              onChange={(e) => updateSizing(node.id, { width: Number(e.target.value) })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="w-6 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">H</span>
            <input
              type="number"
              value={h}
              min={0}
              max={4096}
              onChange={(e) => updateSizing(node.id, { height: Number(e.target.value) })}
              className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
            />
          </label>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 12.3: Inspector에서 SizeSection 공용 렌더**

Inspector.tsx import 추가:
```ts
import { SizeSection } from "./SizeSection";
```

`Inspector` 컴포넌트의 렌더 부분 수정. 기존:
```tsx
      <KindFields node={node} onChange={(patch) => updateProps(node.id, patch)} />
    </div>
```

수정 후:
```tsx
      <KindFields node={node} onChange={(patch) => updateProps(node.id, patch)} />
      <div className="h-px bg-neutral-800" />
      <SizeSection node={node} />
    </div>
```

- [ ] **Step 12.4: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 12.5: 수동 검증**

1. Button 선택 → Inspector 하단 Size 섹션 → Fixed size ON → W/H 입력 노출 → 반영 확인 ✅
2. Container 선택 → Fixed size ON → 다른 flex 자식 옆에서 크기 유지(shrink 없음) ✅
3. Fixed size OFF → 원래 자동 크기로 복원, 재ON 시 이전 값 유지 ✅

- [ ] **Step 12.6: 커밋**

```bash
git add src/features/inspector/SizeSection.tsx src/features/inspector/Inspector.tsx src/stores/layoutStore.ts
git commit -m "feat: common fixed-size section in inspector with updateSizing action"
```

---

## Task 13 — PanelLayoutRenderer (5-슬롯 CSS Grid)

**Files:**
- Create: `src/features/canvas/PanelLayoutRenderer.tsx`
- Modify: `src/features/canvas/NodeRenderer.tsx`

- [ ] **Step 13.1: `PanelLayoutRenderer.tsx` 생성**

```tsx
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
          <SlotContainerRenderer node={header} depth={depth + 1} slotIndex={0} />
        </div>
      )}
      {showLeft && left && (
        <div style={{ gridArea: "l", overflow: "hidden" }}>
          <SlotContainerRenderer node={left} depth={depth + 1} slotIndex={1} />
        </div>
      )}
      {main && (
        <div style={{ gridArea: "m", overflow: "hidden" }}>
          <SlotContainerRenderer node={main} depth={depth + 1} slotIndex={2} />
        </div>
      )}
      {showRight && right && (
        <div style={{ gridArea: "r", overflow: "hidden" }}>
          <SlotContainerRenderer node={right} depth={depth + 1} slotIndex={3} />
        </div>
      )}
      {showFooter && footer && (
        <div style={{ gridArea: "f", overflow: "hidden" }}>
          <SlotContainerRenderer node={footer} depth={depth + 1} slotIndex={4} />
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
```

- [ ] **Step 13.2: NodeRenderer에서 `panel-layout` 분기로 PanelLayoutRenderer 호출**

import 추가:
```ts
import { PanelLayoutRenderer } from "./PanelLayoutRenderer";
```

`isContainerKind(node.kind)` 분기 맨 위에 조기 반환 추가:
```tsx
  if (node.kind === "panel-layout") {
    return <PanelLayoutRenderer node={node} depth={depth} />;
  }
  if (isContainerKind(node.kind)) {
    // ... 기존 container 렌더 로직 그대로
```

- [ ] **Step 13.3: `SlotContainerRenderer` 스텁 생성** (pinned 미지원, 기본 container 렌더 위임; Task 17에서 pinned-aware로 확장)

`src/features/canvas/SlotContainerRenderer.tsx`:
```tsx
// panel-layout 슬롯 container 전용 렌더러.
// Task 13에서는 기본 NodeRenderer에 위임. Task 17에서 pinned-aware로 확장.
import { NodeRenderer } from "./NodeRenderer";
import type { LayoutNode } from "@/types/layout";

export function SlotContainerRenderer({
  node,
  depth,
}: {
  node: LayoutNode;
  depth: number;
  slotIndex: 0 | 1 | 2 | 3 | 4;
}) {
  return <NodeRenderer node={node} depth={depth} />;
}
```

- [ ] **Step 13.4: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음 (아직 Palette에 항목이 없어 사용자 접근 불가)

- [ ] **Step 13.5: 커밋**

```bash
git add src/features/canvas/PanelLayoutRenderer.tsx src/features/canvas/SlotContainerRenderer.tsx src/features/canvas/NodeRenderer.tsx
git commit -m "feat: panel-layout grid renderer with 5 slot areas"
```

---

## Task 14 — Palette에 Panel Layout 항목 추가

**Files:**
- Modify: `src/features/palette/Palette.tsx`

- [ ] **Step 14.1: Panel Layout 항목 추가**

import 수정:
```ts
import {
  Box,
  CheckSquare,
  ChevronsUpDown,
  LayoutGrid,
  Loader,
  Minus,
  MousePointerClick,
  Type,
  TextCursorInput,
} from "lucide-react";
```

`ITEMS` 배열에 추가(Container 바로 아래):
```ts
  { kind: "container", label: "Container", Icon: Box, hint: "Row / Column / Grid" },
  { kind: "panel-layout", label: "Panel Layout", Icon: LayoutGrid, hint: "Header / Sides / Footer" },
  { kind: "foldable", label: "Foldable", Icon: ChevronsUpDown, hint: "접힘 섹션" },
```

- [ ] **Step 14.2: 빌드 및 수동 검증**

Run: `npm run build && npm run dev`
Expected: Palette에 Panel Layout 항목 노출, 드래그로 root 컨테이너에 넣으면 5-slot grid 표시 ✅
(비활성 슬롯 Right/Footer는 화면에 표시되지 않음)

- [ ] **Step 14.3: 커밋**

```bash
git add src/features/palette/Palette.tsx
git commit -m "feat: add Panel Layout to component palette"
```

---

## Task 15 — LayerTree: 슬롯 container 이동/삭제 보호

**Files:**
- Modify: `src/features/layer-tree/LayerTree.tsx`
- Modify: `src/features/canvas/NodeRenderer.tsx`

- [ ] **Step 15.1: LayerTree 슬롯 container 버튼 비활성**

`LayerTree.tsx` 상단 import 추가:
```ts
import { findPanelLayoutSlot } from "@/stores/layoutStore";
```

`TreeNode` 내부에서 슬롯 여부 판정:
```ts
  const doc = useLayoutStore((s) => s.document);
  const slotInfo = findPanelLayoutSlot(doc.root, node.id);
  const isSlot = !!slotInfo;
```

버튼 묶음에서 `isSlot`도 `isRoot`와 같이 숨김:
```tsx
        <span className="opacity-0 transition group-hover:opacity-100 flex items-center gap-0.5">
          {!isRoot && !isSlot && (
            <>
              {/* 기존 ↑ ↓ 🗑 버튼들 그대로 */}
            </>
          )}
        </span>
```

라벨 표기에 슬롯 이름 보조 표기(선택):
```ts
function nodeLabel(node: LayoutNode): string {
  // 기존 스위치 위에 아래 추가
  // (호출부에서 slot info를 직접 쓰지 못하므로, 현 단계는 기존 label 유지)
  // ...
}
```
(슬롯 이름 표기는 선택적; 원 계획 유지)

- [ ] **Step 15.2: Canvas 드래그 차단**

`NodeRenderer.tsx`의 useDraggable `disabled` 조건을 확장:
```ts
import { findPanelLayoutSlot } from "@/stores/layoutStore";
```

```ts
  const rootDoc = useLayoutStore((s) => s.document.root);
  const isSlotContainer = !!findPanelLayoutSlot(rootDoc, node.id);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `canvas-${node.id}`,
    data: { source: "canvas", nodeId: node.id },
    disabled: depth === 0 || editingLeaf || isSlotContainer,
  });
```

또한 Inspector의 "복제/삭제" 버튼이 슬롯에서 비활성화되도록 `Inspector.tsx`도 함께 수정(Task 15.3).

- [ ] **Step 15.3: Inspector에서 슬롯 container의 복제/삭제 버튼 비활성**

`Inspector.tsx` 상단 import:
```ts
import { findPanelLayoutSlot } from "@/stores/layoutStore";
```

`Inspector` 컴포넌트 내:
```ts
  const isSlot = !!findPanelLayoutSlot(doc.root, node.id);
```

버튼 JSX 수정:
```tsx
          <Btn onClick={() => duplicateNode(node.id)} disabled={node.id === doc.root.id || isSlot}>
            복제
          </Btn>
          <Btn onClick={() => removeNode(node.id)} disabled={node.id === doc.root.id || isSlot} danger>
            삭제
          </Btn>
```

- [ ] **Step 15.4: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 15.5: 수동 검증**

1. Panel Layout 추가 후 LayerTree에서 Header/Left/Main 아이콘 옆 버튼들 안 보임 ✅
2. 슬롯 container를 캔버스에서 드래그 시도 → 안 움직임 ✅
3. 슬롯 container 선택 후 Inspector의 복제/삭제 비활성 ✅

- [ ] **Step 15.6: 커밋**

```bash
git add src/features/layer-tree/LayerTree.tsx src/features/canvas/NodeRenderer.tsx src/features/inspector/Inspector.tsx
git commit -m "feat: protect panel-layout slot containers from move/delete/duplicate"
```

---

## Task 16 — Inspector에 Panel Layout 섹션

**Files:**
- Create: `src/features/inspector/PanelLayoutSection.tsx`
- Modify: `src/features/inspector/Inspector.tsx`

- [ ] **Step 16.1: `PanelLayoutSection.tsx` 생성**

```tsx
// panel-layout 노드 전용 Inspector 필드: 슬롯 토글 + 크기 입력.
import type { LayoutNode, PanelLayoutProps } from "@/types/layout";

export function PanelLayoutSection({
  node,
  onChange,
}: {
  node: LayoutNode;
  onChange: (patch: Partial<PanelLayoutProps>) => void;
}) {
  const p = node.props as PanelLayoutProps;
  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-neutral-400">Slots</div>
      <div className="grid grid-cols-2 gap-1">
        {(
          [
            ["Header", "showHeader", p.showHeader ?? true],
            ["Footer", "showFooter", p.showFooter ?? false],
            ["Left", "showLeft", p.showLeft ?? true],
            ["Right", "showRight", p.showRight ?? false],
          ] as const
        ).map(([label, key, val]) => (
          <label
            key={key}
            className="flex items-center gap-1.5 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1 text-xs text-neutral-200"
          >
            <input
              type="checkbox"
              checked={val}
              onChange={(e) => onChange({ [key]: e.target.checked })}
              className="h-3.5 w-3.5 accent-sky-500"
            />
            {label}
          </label>
        ))}
      </div>
      <div className="text-xs text-neutral-400">Sizes (px)</div>
      <div className="grid grid-cols-2 gap-1.5">
        <NumLabel label="Header H" value={p.headerHeight ?? 48} onChange={(v) => onChange({ headerHeight: v })} />
        <NumLabel label="Footer H" value={p.footerHeight ?? 40} onChange={(v) => onChange({ footerHeight: v })} />
        <NumLabel label="Left W"   value={p.leftWidth   ?? 220} onChange={(v) => onChange({ leftWidth: v })} />
        <NumLabel label="Right W"  value={p.rightWidth  ?? 260} onChange={(v) => onChange({ rightWidth: v })} />
      </div>
    </div>
  );
}

function NumLabel({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={4096}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-1.5 py-1 text-xs text-neutral-100 focus:border-sky-500 focus:outline-none"
      />
    </label>
  );
}
```

- [ ] **Step 16.2: Inspector에서 `panel-layout` kind 분기 추가**

`KindFields` 함수 switch에 추가(case "container" 위):
```tsx
    case "panel-layout": {
      return (
        <PanelLayoutSection
          node={node}
          onChange={(patch) => onChange(patch as Record<string, unknown>)}
        />
      );
    }
```

상단 import:
```ts
import { PanelLayoutSection } from "./PanelLayoutSection";
```

- [ ] **Step 16.3: 빌드 및 수동 검증**

1. Panel Layout 노드 선택 → Inspector에 Slots 4개 토글 + Sizes 4개 입력 ✅
2. Left 토글 OFF → 캔버스에서 Left 열이 0으로 축소 ✅
3. Header H 96 변경 → 반영 ✅

- [ ] **Step 16.4: 커밋**

```bash
git add src/features/inspector/PanelLayoutSection.tsx src/features/inspector/Inspector.tsx
git commit -m "feat: panel-layout slot toggles and size fields in inspector"
```

---

## Task 17 — 슬롯 container의 pinned-aware 렌더

**Files:**
- Modify: `src/features/canvas/SlotContainerRenderer.tsx`

- [ ] **Step 17.1: `SlotContainerRenderer` 전체 교체**

```tsx
// panel-layout 슬롯 container 전용 렌더러.
// 자식을 pinned("top"|"bottom"|"none")에 따라 3그룹으로 분할한다:
//   top pinned → 슬롯 상단에 고정
//   flow        → 중간 영역에서 세로 스크롤
//   bottom pinned → 슬롯 하단에 고정
// 슬롯 자체의 컨테이너 속성(padding/gap/border 등)은 기존 NodeRenderer와 동일 표현.
import { Fragment } from "react";
import { useDroppable } from "@dnd-kit/core";
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
  slotIndex: 0 | 1 | 2 | 3 | 4;
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

  // 비어있을 때 DropZone 노출 (기존 container 동작과 일관)
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
            <DropZone containerId={node.id} index={0} direction="column" />
            {flow.map((c, i) => (
              <Fragment key={c.id}>
                <NodeRenderer node={c} depth={depth + 1} />
                <DropZone containerId={node.id} index={flowIndexInParent(children, c.id, i) + 1} direction="column" />
              </Fragment>
            ))}
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

// flow 자식의 index는 원본 children 배열에서의 위치로 계산해 드롭 삽입 인덱스가 일관되게 유지되도록 함.
function flowIndexInParent(all: LayoutNode[], id: string, _flowOrder: number): number {
  return all.findIndex((c) => c.id === id);
}
```

`useDroppable`을 직접 호출하지 않고 기존 `DropZone`을 재사용한다(DropZone이 이미 `useDroppable`로 처리).

- [ ] **Step 17.2: 빌드 확인**

Run: `npm run build`
Expected: 오류 없음

- [ ] **Step 17.3: 수동 검증 (Pin UI는 Task 18에서, 임시 JSON으로 확인)**

브라우저 devtools에서 Zustand store를 열어 슬롯 container 자식 중 하나의 `props.pinned`를 `"top"`으로 수동 설정한 뒤 렌더 확인.

대체 방법: Task 18 이후 통합 검증.

- [ ] **Step 17.4: 커밋**

```bash
git add src/features/canvas/SlotContainerRenderer.tsx
git commit -m "feat: slot container renders pinned-top/bottom sections with flow scroll area"
```

---

## Task 18 — Inspector: container `pinned` 섹션 (슬롯 1단 자식일 때만)

**Files:**
- Modify: `src/features/inspector/Inspector.tsx`

- [ ] **Step 18.1: Pin 섹션 추가**

`Inspector.tsx` 내 `KindFields`의 `case "container"` 분기 하단(Border 필드 다음)에 조건부 섹션 추가:
```tsx
          <PinField node={node} onChange={onChange} />
```

`Inspector.tsx` 하단에 헬퍼 컴포넌트 추가:
```tsx
function PinField({
  node,
  onChange,
}: {
  node: LayoutNode;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const doc = useLayoutStore((s) => s.document);
  // 슬롯 container의 1단 자식 container만 pinned가 유효
  const parent = findParent(doc.root, node.id);
  const grand = parent ? findParent(doc.root, parent.id) : null;
  const isInsideSlot = !!(grand && grand.kind === "panel-layout");
  if (!isInsideSlot) return null;

  const p = node.props as ContainerProps;
  return (
    <Field label="Pin">
      <SegmentedControl
        value={p.pinned ?? "none"}
        options={[
          { value: "none", label: "없음" },
          { value: "top", label: "상단" },
          { value: "bottom", label: "하단" },
        ]}
        onChange={(v) => onChange({ pinned: v })}
      />
    </Field>
  );
}
```

참고: `findParent`는 Inspector.tsx 하단에 이미 존재하는 `findNode`와 같은 위치에 동일한 유틸이 없다면 아래를 추가:
```ts
function findParent(root: LayoutNode, childId: string): LayoutNode | null {
  if (!root.children) return null;
  for (const c of root.children) {
    if (c.id === childId) return root;
    const hit = findParent(c, childId);
    if (hit) return hit;
  }
  return null;
}
```
(LayerTree.tsx에 이미 있으므로 동일한 패턴을 옮겨온다)

상단 import가 이미 `useLayoutStore`를 가지고 있음을 확인. `ContainerProps`도 import 유지.

- [ ] **Step 18.2: 빌드 및 수동 검증**

1. Panel Layout의 Main 슬롯 안에 Container 추가 → 선택 → Pin 섹션 노출 ✅
2. Pin=상단 → 해당 container가 Main 상단에 고정, 나머지 자식은 가운데 영역에서 스크롤 ✅
3. Pin=없음 → 일반 자식과 동일하게 스크롤 흐름 안으로 ✅
4. Panel Layout 바깥의 Container에서는 Pin 섹션 숨김 ✅

- [ ] **Step 18.3: 커밋**

```bash
git add src/features/inspector/Inspector.tsx
git commit -m "feat: pin segmented control for containers inside panel-layout slots"
```

---

## Task 19 — 전체 회귀 체크리스트 & 스펙 반영 확인

**Files:** 없음 (검증 단계)

- [ ] **Step 19.1: `npm run build` 최종 통과**

Run: `npm run build`
Expected: 타입 오류·린트 오류 없음

- [ ] **Step 19.2: `npm run dev` 수동 회귀 시나리오 실행**

체크리스트(하나씩 확인하며 ✅):

- [ ] Save → 같은 id로 덮어쓰기 (Load 목록 건수 증가 없음)
- [ ] Save As → 새 id, 새 제목으로 저장 → 현재 편집 문서가 사본으로 전환
- [ ] Load 후 즉시 Save → 원본 덮어쓰기(중복 없음)
- [ ] 드롭 성공 시 DragOverlay 즉시 사라짐
- [ ] 드롭 실패(바깥) 시 Overlay가 튕겨 되돌아감
- [ ] Delete/Backspace → 선택 노드 삭제, 단 텍스트 편집 포커스 시 무시
- [ ] Cmd/Ctrl+Z로 삭제 복원
- [ ] Button 더블클릭 → 인라인 편집 → Enter/Blur 커밋, Escape 취소
- [ ] Viewport 프리셋/Custom/Free 전환 반영
- [ ] Viewport 박스가 본문보다 크면 스크롤바 노출
- [ ] Safe Area 5% 적용
- [ ] Container Border 실선/대시/점선/없음 전환
- [ ] Panel Layout 추가 시 슬롯 5개 container 자동 생성
- [ ] 슬롯 토글 OFF 시 해당 영역이 0px로 축소 (데이터 보존, 재토글 시 복원)
- [ ] 슬롯 container 이동/삭제/복제 불가
- [ ] 슬롯 내부 container에 Pin 상/하 설정 → 해당 container가 슬롯 상/하에 고정, flow 영역 스크롤
- [ ] 모든 kind에서 Fixed size 토글 → W/H 입력 → 반영, OFF 시 복원
- [ ] Container Fixed size가 flex 부모에서 축소되지 않음
- [ ] Export(MD/JSON/Mermaid)가 panel-layout을 포함해 정상 생성

- [ ] **Step 19.3: Export 영향 확인**

Export 3개 포맷(JSON/MD/Mermaid)이 panel-layout 루트 또는 자식을 가진 문서에서도 오류 없이 출력되는지 수동 확인. JSON은 그대로 구조 보존, MD/Mermaid는 container 유사 형태로 순회됨.

- [ ] **Step 19.4: 최종 커밋(없으면 생략)**

회귀 중 발견된 잔여 수정이 있다면:
```bash
git add -A
git commit -m "chore: regression fixes from improvements-01 validation"
```

---

## Self-Review

**Spec coverage 점검:**
- Feature 1 (Save/Save As): Task 6, 7 ✅
- Feature 2 (드롭 피드백): Task 4 ✅
- Feature 3 (Delete/Backspace): Task 3 ✅
- Feature 4 (Button 인라인 편집): Task 5 ✅
- Feature 5 (라벨 드롭): 구현 없음(의도적) ✅
- Feature 6 (Viewport): Task 8, 9 ✅
- Feature 7 (Container 보더): Task 10 ✅
- Feature 8 (Panel Layout): Task 1, 2, 13, 14, 15, 16 ✅
- Feature 9 (pinned): Task 1, 17, 18 ✅
- Feature 10 (공용 sizing): Task 1, 11, 12 ✅

**Placeholder 스캔:** TBD/TODO 없음, "similar to" 없음, 모든 코드 블록 포함.

**Type 일관성:**
- `SizingProps` / `ViewportSettings` / `PanelLayoutProps` / `ContainerProps` 확장 필드 → Task 1에서 정의된 이름을 이후 Task에서 그대로 사용
- `updateSizing` / `updateViewport` 액션 → 각각 Task 12, 2에서 정의되고 해당 Task 내 UI에서 호출
- `findPanelLayoutSlot` → Task 2에서 정의, Task 15·18에서 사용
- `applySizing` → Task 11에서 정의, Task 11·13에서 사용

---

## Execution Handoff

Plan 작성/저장 완료. 두 가지 실행 옵션:

1. **Subagent-Driven(권장)** — Task 단위로 신선한 서브에이전트를 띄우고, Task 사이에 두 단계 리뷰. 반복 속도가 빠르고 중간 개입이 용이.
2. **Inline Execution** — 현재 세션에서 `executing-plans` 스킬로 배치 실행하되 체크포인트에서 리뷰.

어느 쪽으로 진행할까?
