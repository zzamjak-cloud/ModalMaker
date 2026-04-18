# Multi-Select + Tab Group 구현 스펙

**Goal:** Canvas에서 같은 kind 노드 다중 선택 + 일괄 편집, 버튼 그룹에서 탭 동작 지원

**Architecture:** 기존 `selectedId` 유지 + `selectedIds` 추가(A안). 탭 그룹은 ButtonProps 확장(A안).

**Tech Stack:** React 18, TypeScript, Zustand + Immer, Tailwind CSS

---

## Feature 1: Multi-Select + Batch Edit

### 데이터 모델 (store)

```ts
// layoutStore.ts 추가 필드
selectedIds: string[];  // 다중 선택 목록. 단일 선택 시 []

// 추가 액션
selectMulti: (ids: string[]) => void;
toggleSelectMulti: (id: string) => void;   // Ctrl+click
clearMultiSelect: () => void;
updatePropsMulti: (ids: string[], patch: Partial<NodeProps>) => void;
```

- `selectedId` + `selectedIds` 병행: `selectedIds.length > 1` 이면 다중 선택 모드
- 단일 선택 → `selectedIds = []`, 다중 선택 → `selectedIds = [id1, id2, ...]`
- `selectedIds` 내 모든 노드는 **같은 kind**여야 함. 다른 kind 추가 시도는 무시.

### 선택 UX

| 조작 | 결과 |
|------|------|
| 클릭 | 단일 선택 (selectedIds 초기화) |
| Ctrl/Cmd + 클릭 | 같은 kind → 추가/제거 토글. 다른 kind → 무시 |
| ESC | 선택 전체 해제 |
| Canvas 바깥 클릭 | 선택 전체 해제 |

### NodeRenderer 변경

```tsx
// selectHandler 수정
const selectHandler = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (e.ctrlKey || e.metaKey) {
    toggleSelectMulti(node.id);  // kind 검증은 store에서
  } else {
    clearMultiSelect();
    select(node.id);
  }
};

// outline: selectedIds에 포함되면 ring 표시
const isInMultiSelect = selectedIds.includes(node.id);
const outline = cn(
  "relative rounded-md transition",
  (isSelected || isInMultiSelect) ? "ring-2 ring-sky-500/80" : "hover:ring-1 hover:ring-neutral-600",
  isDragging && "opacity-50",
);
```

### Inspector 변경

`selectedIds.length > 1` 일 때 다중 선택 모드 진입:

1. 헤더: "N개 선택됨 (button)" 표시
2. 표시 섹션: SizeSection + FlexChildSection (항상) + kind별 섹션 (같은 kind이므로 항상)
3. 값이 혼재된 필드(label, iconName 등 노드마다 다른 값): `placeholder="(혼재)"`, value는 빈 문자열
4. 사용자가 값을 입력/변경 → `updatePropsMulti(selectedIds, { fieldKey: newValue })` 즉시 적용
5. label·iconName·value(input) 등 **개별 고유값** 필드: 표시하되 placeholder로 "(혼재)" 표시, 빈 문자열로 저장되지 않도록 빈 제출 차단

#### 혼재값 판별 헬퍼
```ts
function getMixedValue<T>(nodes: LayoutNode[], getter: (n: LayoutNode) => T): T | undefined {
  const values = nodes.map(getter);
  return values.every(v => v === values[0]) ? values[0] : undefined;
  // undefined = 혼재 → placeholder 표시, 사용자가 변경 시에만 적용
}
```

onChange에서 `value === ""` 이면 skip (빈 제출 방지).

---

## Feature 2: Tab Button Group

### 데이터 모델 (layout.ts)

```ts
// ButtonProps 추가 필드
tabGroupId?: string;           // 같은 ID → 같은 그룹
tabDefaultActive?: boolean;    // 초기 활성 버튼 여부 (그룹당 하나)
tabInactiveVariant?: ButtonProps['variant'];  // 비활성 스타일, 기본 "ghost"
```

### Canvas (ButtonLeaf)

- `tabGroupId`가 있으면 버튼 오른쪽 상단에 작은 배지 `⊞` 표시 (그룹 소속 표시)
- `tabDefaultActive: true`이면 배지 색 강조

### Preview (PreviewOverlay/PreviewRenderer)

PreviewOverlay에서 탭 그룹 상태 관리:

```tsx
// PreviewOverlay 추가 상태
const [tabActiveMap, setTabActiveMap] = useState<Record<string, string>>(() =>
  initTabActiveMap(document)  // 각 groupId → tabDefaultActive:true인 nodeId
);

// PreviewContext에 추가
tabActiveMap: Record<string, string>;
setTabActive: (groupId: string, nodeId: string) => void;
```

PreviewRenderer에서 버튼 렌더링:

```tsx
// case "button"에서
if (p.tabGroupId) {
  const isActive = ctx.tabActiveMap[p.tabGroupId] === node.id;
  const effectiveVariant = isActive ? (p.variant ?? "primary") : (p.tabInactiveVariant ?? "ghost");
  // effectiveVariant로 variantStyle 계산
  // onClick: ctx.setTabActive(p.tabGroupId, node.id)
}
```

### Inspector 변경 (버튼 섹션 추가 필드)

```
탭 그룹 ID  [text input]          ← 빈칸이면 일반 버튼
기본 활성   [toggle]              ← tabGroupId가 있을 때만 표시
비활성 스타일 [select: ghost/secondary/plain/...]  ← tabGroupId가 있을 때만 표시
```

### 탭 그룹 초기화 헬퍼

```ts
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
  const page = doc.pages.find(p => p.id === doc.currentPageId);
  if (page) walk(page.root);
  return map;
}
```

---

## 파일별 변경 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/types/layout.ts` | ButtonProps에 tabGroupId, tabDefaultActive, tabInactiveVariant 추가 |
| `src/stores/layoutStore.ts` | selectedIds[], selectMulti, toggleSelectMulti, clearMultiSelect, updatePropsMulti 추가 |
| `src/features/canvas/NodeRenderer.tsx` | Ctrl+click 핸들러, isInMultiSelect ring 표시 |
| `src/features/canvas/ButtonLeaf.tsx` | 탭 그룹 배지 표시 |
| `src/features/inspector/Inspector.tsx` | 다중 선택 모드 UI, 탭 그룹 필드 추가 |
| `src/features/preview/PreviewOverlay.tsx` | tabActiveMap 상태, setTabActive, initTabActiveMap |
| `src/features/preview/PreviewRenderer.tsx` | 버튼 탭 그룹 분기 렌더링 |

---

## 검증 시나리오

1. 버튼 클릭 → 단일 선택. Ctrl+버튼 클릭 → 다중 선택 ring 표시
2. 다른 kind(컨테이너) Ctrl+클릭 → 무시 (기존 다중 선택 유지)
3. Inspector에서 Variant 변경 → 선택된 모든 버튼 동시 변경
4. Label 필드 → "(혼재)" placeholder, 빈 문자열 제출 시 변경 없음
5. ESC → 다중 선택 해제, Inspector 단일 선택으로 전환
6. tabGroupId 설정 후 프리뷰 → 클릭 시 나머지 비활성화 시각 확인
7. tabDefaultActive 설정 후 프리뷰 진입 → 해당 버튼이 활성 상태로 초기화
