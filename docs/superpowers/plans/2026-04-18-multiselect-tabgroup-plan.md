# Multi-Select + Tab Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canvas에서 같은 kind 노드 다중 선택(Ctrl+클릭) + 일괄 속성 편집, 버튼에 탭 그룹(toggle group) 동작 추가

**Architecture:** `selectedIds: string[]`를 store에 추가해 멀티 선택 상태 관리. `ButtonProps`에 `tabGroupId/tabDefaultActive/tabInactiveVariant` 필드 추가. PreviewContext에 탭 그룹 상태 확장.

**Tech Stack:** React 18, TypeScript, Zustand + Immer, Tailwind CSS

---

## 파일 구조

| 파일 | 변경 |
|------|------|
| `src/types/layout.ts` | ButtonProps에 탭 그룹 필드 추가 |
| `src/stores/layoutStore.ts` | selectedIds, toggleSelectMulti, clearMultiSelect, updatePropsMulti 추가 |
| `src/features/canvas/NodeRenderer.tsx` | Ctrl+클릭 핸들러, 멀티 선택 ring 표시 |
| `src/features/canvas/Canvas.tsx` | ESC 키 + 캔버스 빈 영역 클릭 시 선택 해제 |
| `src/features/canvas/ButtonLeaf.tsx` | 탭 그룹 배지 표시 |
| `src/features/inspector/Inspector.tsx` | 멀티 선택 모드 UI + 탭 그룹 필드 |
| `src/features/preview/previewRuntime.ts` | PreviewContext에 tabActiveMap, setTabActive 추가 |
| `src/features/preview/PreviewOverlay.tsx` | 탭 그룹 상태 관리 |
| `src/features/preview/PreviewRenderer.tsx` | 버튼 탭 그룹 렌더링 분기 |

---

### Task 1: ButtonProps 탭 그룹 필드 추가

**Files:**
- Modify: `src/types/layout.ts:58-65`

- [ ] **Step 1: ButtonProps에 탭 그룹 필드 추가**

`src/types/layout.ts`의 `ButtonProps` 인터페이스를 다음으로 교체:

```ts
export interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "destructive" | "ghost" | "plain";
  size?: "sm" | "md" | "lg";
  iconName?: string;
  iconPosition?: "left" | "right";
  contentAlign?: "left" | "center" | "right";
  /** 탭 그룹 ID — 같은 값끼리 토글 그룹 형성 */
  tabGroupId?: string;
  /** 프리뷰 초기 활성 버튼 여부 (그룹당 하나) */
  tabDefaultActive?: boolean;
  /** 비활성 상태 variant, 기본 "ghost" */
  tabInactiveVariant?: "primary" | "secondary" | "destructive" | "ghost" | "plain";
}
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in` 메시지

- [ ] **Step 3: 커밋**

```bash
git add src/types/layout.ts
git commit -m "feat: ButtonProps에 탭 그룹 필드 추가 (tabGroupId, tabDefaultActive, tabInactiveVariant)"
```

---

### Task 2: Store에 멀티 선택 상태 및 액션 추가

**Files:**
- Modify: `src/stores/layoutStore.ts`

- [ ] **Step 1: LayoutState 인터페이스에 selectedIds와 액션 추가**

`src/stores/layoutStore.ts`에서 `LayoutState` 인터페이스(라인 251)를 수정. `selectedId: string | null;` 아래에 추가:

```ts
// 멀티 선택 목록. 2개 이상일 때만 멀티 선택 모드
selectedIds: string[];

// 멀티 선택 액션
toggleSelectMulti: (id: string) => void;
clearMultiSelect: () => void;
updatePropsMulti: (ids: string[], patch: Partial<NodeProps>) => void;
```

- [ ] **Step 2: 초기 상태에 selectedIds 추가**

라인 329 `selectedId: null,` 아래에 추가:

```ts
selectedIds: [],
```

- [ ] **Step 3: setDocument, resetDocument에서 selectedIds 초기화**

`setDocument` 액션(라인 335)의 set 반환 객체에 추가:

```ts
setDocument: (doc) =>
  set(() => ({
    document: migrateToV2(doc),
    past: [],
    future: [],
    selectedId: null,
    selectedIds: [],
    selectedPageId: null,
    editingModuleId: null,
  })),

resetDocument: () =>
  set(() => ({
    document: createEmptyNodeDocument(),
    past: [],
    future: [],
    selectedId: null,
    selectedIds: [],
    selectedPageId: null,
    editingModuleId: null,
  })),
```

- [ ] **Step 4: select 액션이 selectedIds를 초기화하도록 수정**

라인 355:

```ts
select: (id) => set({ selectedId: id, selectedIds: [] }),
```

- [ ] **Step 5: setCurrentPage, enterModuleEdit, exitModuleEdit에서 selectedIds 초기화**

각 `return { ... }` 블록에 `selectedIds: []` 추가:

```ts
// setCurrentPage (라인 618 부근)
return {
  document: { ...s.document, currentPageId: pageId },
  selectedId: null,
  selectedIds: [],
};

// enterModuleEdit (라인 693 부근)
return { editingModuleId: moduleId, selectedId: null, selectedIds: [] };

// exitModuleEdit (라인 696 부근)
exitModuleEdit: () => set({ editingModuleId: null, selectedId: null, selectedIds: [] }),
```

- [ ] **Step 6: 세 액션 구현 추가**

`select` 액션(라인 355) 아래에 삽입:

```ts
toggleSelectMulti: (id: string) =>
  set((s) => {
    const root = activeRoot(s);
    if (!root) return {};
    const clickedNode = findNode(root, id);
    if (!clickedNode) return {};

    // 현재 선택 목록 구성 (단일 선택 포함)
    const current =
      s.selectedIds.length > 0
        ? s.selectedIds
        : s.selectedId
          ? [s.selectedId]
          : [];

    // kind 일치 검사
    if (current.length > 0) {
      const firstNode = findNode(root, current[0]);
      if (firstNode && firstNode.kind !== clickedNode.kind) return {};
    }

    // 토글
    let next: string[];
    if (current.includes(id)) {
      next = current.filter((i) => i !== id);
    } else {
      next = [...current, id];
    }

    if (next.length === 0) return { selectedIds: [], selectedId: null };
    if (next.length === 1) return { selectedIds: [], selectedId: next[0] };
    return { selectedIds: next };
  }),

clearMultiSelect: () => set({ selectedIds: [], selectedId: null }),

updatePropsMulti: (ids, patch) =>
  set((s) =>
    commit(s, (draft) => {
      const root = activeRootInDraft(draft, s.editingModuleId);
      if (!root) return;
      for (const id of ids) {
        const node = findNode(root, id);
        if (!node) continue;
        Object.assign(node.props, patch);
      }
    }),
  ),
```

- [ ] **Step 7: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 8: 커밋**

```bash
git add src/stores/layoutStore.ts
git commit -m "feat: store에 멀티 선택 상태 및 액션 추가 (selectedIds, toggleSelectMulti, clearMultiSelect, updatePropsMulti)"
```

---

### Task 3: NodeRenderer 멀티 선택 클릭 + Ring 표시

**Files:**
- Modify: `src/features/canvas/NodeRenderer.tsx:78-104`

- [ ] **Step 1: selectedIds와 멀티 선택 액션 읽기**

라인 78-79의 기존 코드:
```ts
const selectedId = useLayoutStore((s) => s.selectedId);
const select = useLayoutStore((s) => s.select);
```

다음으로 교체:
```ts
const selectedId = useLayoutStore((s) => s.selectedId);
const selectedIds = useLayoutStore((s) => s.selectedIds);
const select = useLayoutStore((s) => s.select);
const toggleSelectMulti = useLayoutStore((s) => s.toggleSelectMulti);
const clearMultiSelect = useLayoutStore((s) => s.clearMultiSelect);
```

- [ ] **Step 2: isInMultiSelect 변수 추가 + outline 업데이트**

라인 84 `const isSelected = selectedId === node.id;` 아래에 추가:
```ts
const isInMultiSelect = selectedIds.includes(node.id);
```

라인 93-98의 `outline` 정의를 다음으로 교체:
```ts
const outline = cn(
  "relative rounded-md transition",
  isSelected || isInMultiSelect
    ? "ring-2 ring-sky-500/80"
    : "hover:ring-1 hover:ring-neutral-600",
  isDragging && "opacity-50",
);
```

- [ ] **Step 3: selectHandler에 Ctrl/Cmd 처리 추가**

라인 101-104의 `selectHandler`를 다음으로 교체:
```ts
const selectHandler = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    toggleSelectMulti(node.id);
  } else {
    clearMultiSelect();
    select(node.id);
  }
};
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 5: 커밋**

```bash
git add src/features/canvas/NodeRenderer.tsx
git commit -m "feat: NodeRenderer에 Ctrl+클릭 멀티 선택 및 ring 표시 추가"
```

---

### Task 4: Canvas — ESC 키 + 빈 영역 클릭 시 선택 해제

**Files:**
- Modify: `src/features/canvas/Canvas.tsx`

- [ ] **Step 1: useEffect import 추가 및 ESC + 클릭 핸들러 구현**

`Canvas.tsx`의 import 라인 1에 `useEffect` 추가:
```ts
import { useEffect } from "react";
import { useLayoutStore, currentPage, activeRoot } from "@/stores/layoutStore";
import { VIEWPORT_PRESETS, type ViewportSettings } from "@/types/layout";
import { NodeRenderer } from "./NodeRenderer";
import { CanvasViewport } from "./CanvasViewport";
```

`Canvas()` 함수 내에서 `const state = useLayoutStore();` 아래에 추가:
```ts
const clearMultiSelect = useLayoutStore((s) => s.clearMultiSelect);
const select = useLayoutStore((s) => s.select);

// ESC 키로 선택 전체 해제
useEffect(() => {
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      clearMultiSelect();
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [clearMultiSelect]);
```

- [ ] **Step 2: CanvasViewport 래퍼에 onClick 추가**

`Canvas.tsx` 하단의 `return` 블록에서 `<CanvasViewport ...>` 태그를 찾아, `CanvasViewport` 컴포넌트 바로 바깥을 래핑하거나 `CanvasViewport` 자체에 onClick prop 전달 방식 대신, 캔버스 영역 `<div>` 에 onClick 추가:

현재 Canvas.tsx return 구조(라인 62 부근):
```tsx
return (
  <div className="flex h-full flex-col items-center">
    {moduleBadge}
    <CanvasViewport ...>
      <NodeRenderer ... />
    </CanvasViewport>
  </div>
);
```

`<div className="flex h-full flex-col items-center">`를 다음으로 교체:
```tsx
return (
  <div
    className="flex h-full flex-col items-center"
    onClick={() => { clearMultiSelect(); select(null); }}
  >
    {moduleBadge}
    <CanvasViewport ...>
      <NodeRenderer ... />
    </CanvasViewport>
  </div>
);
```

NodeRenderer의 selectHandler에 이미 `e.stopPropagation()`이 있으므로 노드 클릭 시 이 핸들러까지 전파되지 않는다.

- [ ] **Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 4: 커밋**

```bash
git add src/features/canvas/Canvas.tsx
git commit -m "feat: Canvas에 ESC 키 및 빈 영역 클릭 시 멀티 선택 해제 추가"
```

---

### Task 5: Inspector 멀티 선택 모드 UI

**Files:**
- Modify: `src/features/inspector/Inspector.tsx`

- [ ] **Step 1: store에서 selectedIds와 필요 함수 읽기**

`Inspector.tsx`의 `Inspector()` 함수 내 기존 훅 선언 부분에 추가:
```ts
const selectedIds = useLayoutStore((s) => s.selectedIds);
const updatePropsMulti = useLayoutStore((s) => s.updatePropsMulti);
```

- [ ] **Step 2: findNode import 확인 및 멀티 선택 분기 추가**

`Inspector.tsx`에서 `findNode`가 사용되고 있는지 확인. 없으면 import에 추가:
```ts
import { useLayoutStore, activeRoot } from "@/stores/layoutStore";
```

현재 `findNode`는 같은 파일 내 로컬 함수로 선언되어 있음 (파일 하단 확인). 없으면 store에서 import.

- [ ] **Step 3: 멀티 선택 모드 분기 추가**

`Inspector()` 함수에서 `if (!node) { return ... }` 블록 다음, `return (...)` 블록 앞에 멀티 선택 분기 추가:

```ts
// 멀티 선택 모드
if (selectedIds.length > 1 && root) {
  const selectedNodes = selectedIds
    .map((id) => findNode(root, id))
    .filter((n): n is LayoutNode => n !== null);
  const allSameKind = selectedNodes.every((n) => n.kind === selectedNodes[0].kind);
  const kind = allSameKind ? selectedNodes[0].kind : null;

  // 혼재 값 계산: 모든 노드가 동일 값이면 그 값, 아니면 undefined(빈칸 표시)
  function getMixed<T>(getter: (n: LayoutNode) => T): T | undefined {
    const vals = selectedNodes.map(getter);
    return vals.every((v) => v === vals[0]) ? vals[0] : undefined;
  }

  // 대표 노드 구성 (혼재 값은 undefined)
  const repProps: Record<string, unknown> = {};
  if (allSameKind && kind === "button") {
    const first = selectedNodes[0].props as ButtonProps;
    repProps.label = getMixed((n) => (n.props as ButtonProps).label);
    repProps.variant = getMixed((n) => (n.props as ButtonProps).variant) ?? first.variant;
    repProps.size = getMixed((n) => (n.props as ButtonProps).size) ?? first.size;
    repProps.contentAlign = getMixed((n) => (n.props as ButtonProps).contentAlign) ?? first.contentAlign;
    repProps.tabGroupId = getMixed((n) => (n.props as ButtonProps).tabGroupId);
    repProps.tabInactiveVariant = getMixed((n) => (n.props as ButtonProps).tabInactiveVariant);
  }
  const repNode: LayoutNode = { ...selectedNodes[0], props: repProps as NodeProps };

  // 변경 적용: 빈 문자열은 skip (혼재 필드 미수정으로 간주)
  const onChangeMulti = (patch: Record<string, unknown>) => {
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== "" && v !== undefined),
    );
    if (Object.keys(filtered).length > 0) {
      updatePropsMulti(selectedIds, filtered as Partial<NodeProps>);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-sky-400">
        {selectedIds.length}개 선택됨{kind ? ` (${kind})` : " — 다른 종류 혼재"}
      </div>
      {allSameKind && kind === "button" && (
        <KindFields node={repNode} onChange={onChangeMulti} />
      )}
      <div className="h-px bg-neutral-800" />
      <SizeSection node={selectedNodes[0]} />
    </div>
  );
}
```

- [ ] **Step 4: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 5: 커밋**

```bash
git add src/features/inspector/Inspector.tsx
git commit -m "feat: Inspector 멀티 선택 모드 UI 추가 (N개 선택, 혼재 값 처리, 일괄 적용)"
```

---

### Task 6: Inspector 탭 그룹 필드 추가

**Files:**
- Modify: `src/features/inspector/Inspector.tsx` — `case "button":` 섹션

- [ ] **Step 1: 탭 그룹 필드를 버튼 섹션에 추가**

`Inspector.tsx`에서 현재 button case의 Content Align 필드 다음(`</>` 바로 전):

```tsx
<Field label="탭 그룹 ID">
  <TextInput
    value={p.tabGroupId ?? ""}
    placeholder="그룹 없음"
    onChange={(v) => onChange({ tabGroupId: v || undefined })}
  />
</Field>
{p.tabGroupId && (
  <>
    <Field label="기본 활성">
      <Toggle
        value={p.tabDefaultActive ?? false}
        onChange={(v) => onChange({ tabDefaultActive: v })}
      />
    </Field>
    <Field label="비활성 스타일">
      <Select
        value={p.tabInactiveVariant ?? "ghost"}
        options={["primary", "secondary", "destructive", "ghost", "plain"]}
        onChange={(v) => onChange({ tabInactiveVariant: v })}
      />
    </Field>
  </>
)}
```

`Toggle` 컴포넌트는 `Inspector.tsx` 하단에 이미 정의돼 있음.

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 3: 커밋**

```bash
git add src/features/inspector/Inspector.tsx
git commit -m "feat: Inspector에 탭 그룹 필드 추가 (tabGroupId, tabDefaultActive, tabInactiveVariant)"
```

---

### Task 7: ButtonLeaf 탭 그룹 배지 표시

**Files:**
- Modify: `src/features/canvas/ButtonLeaf.tsx`

- [ ] **Step 1: tabGroupId 배지 추가**

`ButtonLeaf.tsx`의 view mode return(라인 102 부근) `<button>` 요소를 래핑해 배지 추가:

현재:
```tsx
return (
  <button ... >
    {Icon && pos === "left" && <Icon size={iconPx} />}
    <span>{p.label}</span>
    {Icon && pos === "right" && <Icon size={iconPx} />}
  </button>
);
```

다음으로 교체:
```tsx
return (
  <div className="relative inline-flex">
    <button ... >
      {Icon && pos === "left" && <Icon size={iconPx} />}
      <span>{p.label}</span>
      {Icon && pos === "right" && <Icon size={iconPx} />}
    </button>
    {p.tabGroupId && (
      <span
        className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white"
        title={`탭 그룹: ${p.tabGroupId}`}
      >
        T
      </span>
    )}
  </div>
);
```

- [ ] **Step 2: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 3: 커밋**

```bash
git add src/features/canvas/ButtonLeaf.tsx
git commit -m "feat: ButtonLeaf에 탭 그룹 배지 표시 추가"
```

---

### Task 8: PreviewContext에 탭 그룹 상태 추가

**Files:**
- Modify: `src/features/preview/previewRuntime.ts`
- Modify: `src/features/preview/PreviewOverlay.tsx`

- [ ] **Step 1: PreviewContext 확장**

`src/features/preview/previewRuntime.ts`의 `PreviewContext` 인터페이스를 다음으로 교체:

```ts
export interface PreviewContext {
  navigate: (pageId: string) => void;
  close: (targetPageId?: string) => void;
  /** 탭 그룹 상태: groupId → 현재 활성 nodeId */
  tabActiveMap: Record<string, string>;
  setTabActive: (groupId: string, nodeId: string) => void;
}
```

- [ ] **Step 2: PreviewOverlay에 탭 그룹 상태 구현**

`src/features/preview/PreviewOverlay.tsx`에 `initTabActiveMap` 헬퍼 함수 추가 (파일 최상단 import 아래):

```ts
import type { LayoutNode, ButtonProps, NodeDocument } from "@/types/layout";

function initTabActiveMap(doc: NodeDocument): Record<string, string> {
  const map: Record<string, string> = {};
  function walk(node: LayoutNode) {
    if (node.kind === "button") {
      const p = node.props as ButtonProps;
      if (p.tabGroupId && p.tabDefaultActive) {
        map[p.tabGroupId] = node.id;
      }
    }
    node.children?.forEach(walk);
  }
  const page = doc.pages.find((p) => p.id === doc.currentPageId);
  if (page) walk(page.root);
  return map;
}
```

`PreviewContent()` 함수 내에서 `const [history, setHistory] = useState<string[]>([]);` 아래에 추가:

```ts
const [tabActiveMap, setTabActiveMapState] = useState<Record<string, string>>(
  () => initTabActiveMap(document),
);

const setTabActive = useCallback(
  (groupId: string, nodeId: string) =>
    setTabActiveMapState((prev) => ({ ...prev, [groupId]: nodeId })),
  [],
);
```

`ctx` 생성 부분(라인 128 `const ctx: PreviewContext = { navigate, close };`)을 다음으로 교체:

```ts
const ctx: PreviewContext = { navigate, close, tabActiveMap, setTabActive };
```

- [ ] **Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 4: 커밋**

```bash
git add src/features/preview/previewRuntime.ts src/features/preview/PreviewOverlay.tsx
git commit -m "feat: PreviewContext에 탭 그룹 상태 추가 (tabActiveMap, setTabActive)"
```

---

### Task 9: PreviewRenderer 탭 버튼 렌더링

**Files:**
- Modify: `src/features/preview/PreviewRenderer.tsx:180-232`

- [ ] **Step 1: button case에 탭 그룹 분기 추가**

`PreviewRenderer.tsx`의 `case "button":` 블록 내 `variantStyle` 계산 직전에 탭 그룹 분기 삽입.

현재 button case 상단:
```tsx
case "button": {
  const p = node.props as ButtonProps;
  const variantStyle: React.CSSProperties = (() => {
    switch (p.variant ?? "primary") {
```

다음으로 교체:
```tsx
case "button": {
  const p = node.props as ButtonProps;

  // 탭 그룹: 활성/비활성 상태에 따라 effective variant 결정
  const isTabGroup = !!p.tabGroupId;
  const isTabActive = isTabGroup
    ? ctx.tabActiveMap[p.tabGroupId!] === node.id
    : true; // 일반 버튼은 항상 "활성" 취급
  const effectiveVariant = isTabGroup
    ? (isTabActive ? (p.variant ?? "primary") : (p.tabInactiveVariant ?? "ghost"))
    : (p.variant ?? "primary");

  const variantStyle: React.CSSProperties = (() => {
    switch (effectiveVariant) {
```

이후 `switch` 내부의 `p.variant ?? "primary"` 참조는 이미 `effectiveVariant`로 바뀐 상태이므로 수정 필요 없음.

- [ ] **Step 2: 탭 버튼 onClick 연결**

`<button>` 요소의 `style` 속성 내 `filter: hover ? "brightness(1.15)" : undefined` 줄 찾기.

기존 `<button>` 반환 블록:
```tsx
return (
  <button
    type="button"
    style={{
      ...
      filter: hover ? "brightness(1.15)" : undefined,
      ...variantStyle, ...sizeStyle, ...btnSizeStyle,
    }}
  >
```

다음으로 교체 (onClick 추가):
```tsx
return (
  <button
    type="button"
    onClick={
      isTabGroup
        ? (e) => {
            e.stopPropagation();
            ctx.setTabActive(p.tabGroupId!, node.id);
            runActions(node.interactions ?? [], "click", ctx);
          }
        : undefined
    }
    style={{
      ...
      filter: hover ? "brightness(1.15)" : undefined,
      opacity: isTabGroup && !isTabActive ? 0.6 : undefined,
      ...variantStyle, ...sizeStyle, ...btnSizeStyle,
    }}
  >
```

탭 버튼이 비활성일 때 `opacity: 0.6`으로 추가 시각 구분.

- [ ] **Step 3: 빌드 확인**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`

- [ ] **Step 4: 커밋**

```bash
git add src/features/preview/PreviewRenderer.tsx
git commit -m "feat: PreviewRenderer 탭 버튼 그룹 렌더링 추가 (활성/비활성 variant, opacity)"
```

---

### Task 10: 전체 검증

- [ ] **Step 1: 개발 서버 실행 후 멀티 선택 시나리오 확인**

```bash
npm run dev
```

검증 항목:
1. 버튼 클릭 → 단일 선택 ring 표시
2. Ctrl+버튼 클릭 → 같은 kind 버튼 추가 선택됨 (ring 2개)
3. Ctrl+컨테이너 클릭 → 무시 (버튼만 선택된 상태 유지)
4. Inspector: "N개 선택됨 (button)" 헤더 표시
5. Variant 변경 → 선택된 모든 버튼 동시 변경
6. ESC → 다중 선택 해제
7. 캔버스 빈 영역 클릭 → 선택 해제

- [ ] **Step 2: 탭 그룹 시나리오 확인**

1. 버튼 Inspector에서 탭 그룹 ID 입력 (예: "nav") → 배지 `T` 표시
2. 다른 버튼에도 같은 그룹 ID 입력
3. 하나에 `기본 활성 = true` 설정
4. 프리뷰 진입 → 기본 활성 버튼이 primary variant, 나머지는 ghost
5. 다른 탭 버튼 클릭 → 해당 버튼이 활성화, 나머지 비활성화

- [ ] **Step 3: 최종 빌드**

```bash
npm run build 2>&1 | tail -5
```

Expected: `✓ built in`
