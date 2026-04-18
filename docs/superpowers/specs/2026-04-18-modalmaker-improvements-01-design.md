# ModalMaker 개선안 01 설계

- 작성일: 2026-04-18
- 소스: `1_0_0_개선_01.md`
- 대상 브랜치: `main`
- 대상 버전: 1.0.x 패치 누적 → 다음 마이너 릴리즈

## 개요

사용자 MVP 사용 경험에서 파생된 9개 개선 항목을 한 번의 릴리즈에 묶는다. 브레인스토밍 결과 1개 항목(라벨 한국어화)은 "피그마 컨벤션 유지" 방침에 따라 **드롭**되어 최종 8개 항목이 범위에 포함된다.

## 목표

- 저장 워크플로우를 "Photoshop 스타일(Save / Save As)"로 단순화한다.
- 드래그 성공/실패 피드백이 상반되게 보이도록 교정한다.
- 키보드 단축키(Delete/Backspace)로 빠른 삭제를 가능하게 한다.
- Text뿐 아니라 Button도 캔버스 위에서 직접 라벨을 편집할 수 있게 한다.
- Canvas에 해상도(뷰포트) 개념을 도입해 반응형 검수가 가능하게 한다.
- Container 자체의 보더 스타일(실선/대시/점선)을 노출한다.
- 앱 UI 설계에 적합한 5-슬롯 패널 레이아웃 노드를 도입한다.
- 스크롤 흐름과 독립적으로 유지되는 "고정 영역" 개념을 도입한다.
- 모든 노드(container + 모든 leaf)에 공용 "고정 크기(width/height)" 설정을 제공한다.

## 비범위(Non-goals)

- 파일 버전 이력 보존: 설계에서 제외(항상 최신 덮어쓰기).
- 한국어 라벨 번역: 피그마 컨벤션 유지 방침으로 드롭.
- Canvas Zoom 배율 컨트롤: 후속 릴리즈로 연기(필요 시 스크롤로 대체).
- 드래그 중 노드 미리보기 레이아웃 시각화: 기존 DragOverlay 텍스트 배지 유지.

## 타입/데이터 모델 변경

### 0. `LayoutNode`에 `sizing` 공용 필드 추가

모든 노드에 적용되는 공용 크기 제어:

```ts
export interface SizingProps {
  fixedSize?: boolean; // 기본 false → 자동 크기
  width?: number;      // px, fixedSize=true일 때만 사용
  height?: number;     // px, fixedSize=true일 때만 사용
}

export interface LayoutNode {
  id: string;
  kind: NodeKind;
  props: NodeProps;
  sizing?: SizingProps; // NEW
  style?: Partial<CSSProperties>;
  children?: LayoutNode[];
}
```

`kind`별 해석 규칙은 Feature 10 참조.

### 1. `LayoutDocument`에 `viewport` 추가

```ts
export interface ViewportSettings {
  preset: "free" | "desktop" | "laptop" | "tablet" | "mobile" | "custom";
  width?: number;   // preset=custom일 때만 사용
  height?: number;  // preset=custom일 때만 사용
  safeAreaPct?: number; // 0~20, 기본 0, 뷰포트 안쪽 마진 비율(%)
}

export interface LayoutDocument {
  id: string;
  title: string;
  root: LayoutNode;
  viewport?: ViewportSettings; // NEW
  createdAt: number;
  updatedAt: number;
  ownerUid?: string;
}
```

프리셋 해상도 상수:

```ts
export const VIEWPORT_PRESETS = {
  desktop: { width: 1920, height: 1080 },
  laptop:  { width: 1440, height: 900 },
  tablet:  { width: 768,  height: 1024 },
  mobile:  { width: 375,  height: 812 },
} as const;
```

`free`는 자식 크기에 맞춰 늘어나는 기존 동작(후방 호환).

### 2. `NodeKind`에 `panel-layout` 추가

```ts
export type NodeKind =
  | "container"
  | "panel-layout" // NEW: 5-슬롯 고정 패널 레이아웃
  | "text"
  | "button"
  | "input"
  | "checkbox"
  | "progress"
  | "split"
  | "foldable";

export const CONTAINER_KINDS: NodeKind[] = ["container", "foldable", "panel-layout"];
```

`PanelLayoutProps`:

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

**자식 표현**: `children`은 항상 **정확히 5개**의 container로 구성되며, **배열 인덱스가 곧 슬롯 ID**다.

| 인덱스 | 슬롯 | 기본 label |
|---|---|---|
| 0 | header | "Header" |
| 1 | left | "Left" |
| 2 | main | "Main" |
| 3 | right | "Right" |
| 4 | footer | "Footer" |

`createNode("panel-layout")`가 호출되면 5개 container 자식을 고정으로 생성한다. 슬롯 토글(`showHeader` 등)이 false여도 자식 배열의 해당 인덱스 container는 데이터상 보존되고 **렌더링 시 skip**한다(토글 복원 시 데이터 손실 방지).

사용자는 자식 container의 label을 자유롭게 변경할 수 있으나, 슬롯 정체성은 **인덱스로만** 판별한다. label은 레이어 트리 표기용일 뿐 식별자로 쓰지 않는다. 슬롯 container 이동/삭제는 UI에서 막는다(레이어 트리의 ↑/↓/🗑 버튼 비활성, DnD 드래그 비활성).

**슬롯 container 판정 헬퍼**:

```ts
// parent가 panel-layout이면 자식 container는 슬롯 container.
export function findPanelLayoutSlot(
  root: LayoutNode, childId: string,
): { slotIndex: 0|1|2|3|4 } | null {
  const parent = findParent(root, childId);
  if (!parent || parent.kind !== "panel-layout") return null;
  const idx = parent.children?.findIndex((c) => c.id === childId) ?? -1;
  if (idx < 0 || idx > 4) return null;
  return { slotIndex: idx as 0|1|2|3|4 };
}
```

이 헬퍼를 Feature 9의 pinned 판정과 Inspector의 Pin 섹션 노출 여부 판단에 공용으로 사용한다.

### 3. `ContainerProps`에 보더/고정 속성 추가

```ts
export interface ContainerProps {
  // 기존 필드 유지
  direction?: "row" | "column" | "grid";
  gap?: number;
  uniformPadding?: boolean;
  padding?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
  columns?: number;
  label?: string;

  // NEW: 보더 (Container 라인 옵션 - 항목 7)
  borderStyle?: "none" | "solid" | "dashed" | "dotted"; // 기본 "none"
  borderWidth?: number; // 기본 1, 0~8
  borderColor?: string; // 기본 "#525252"

  // NEW: 고정 영역 (항목 9)
  // 부모가 panel-layout 슬롯 container일 때만 의미 있음.
  // 슬롯의 상/하에 고정되고, 나머지 자식들은 가운데 영역에서 스크롤된다.
  pinned?: "none" | "top" | "bottom"; // 기본 "none"
}
```

## 기능 명세

### Feature 1 — Save / Save As

변경점:

- 기존 Load 동작에서 `setDocument({ ...d, id: newId("doc") })`로 id를 재할당하던 부분을 **제거**한다. Load한 문서는 원본 id를 그대로 유지한다.
- 기존 Save는 `currentAdapter().saveDocument(doc)`로 doc.id를 키로 그대로 저장 → 자동으로 **덮어쓰기**가 된다.
- 툴바에 **Save As** 버튼 신설. 클릭 시 `SaveAsDialog` 표시:
  - 텍스트 입력: "새 파일 제목" (기본값은 `${currentTitle} (사본)`)
  - 확인 시 `currentAdapter().saveDocument({ ...doc, id: newId("doc"), title: newTitle, createdAt: now, updatedAt: now })`, 그리고 store의 현재 문서도 이 새 문서로 전환 (저장 후 사용자는 "사본"을 계속 편집하는 게 자연스러움)
  - 취소 시 아무 변화 없음
- Toolbar의 제목 input은 그대로 유지(실시간 제목 편집). Save As는 "다른 파일로 분기"할 때만 사용하는 명시적 액션.

Load 다이얼로그는 기존 리스트 UI 그대로(더는 "버전 이력" 확장 없음). 단, Load 항목에 **삭제 버튼** 추가는 선택적으로 포함한다(이 설계에서는 범위 외로 둠 — 기존 동작 유지).

### Feature 2 — 드래그 성공/실패 피드백 교정

`DndContext`의 `onDragEnd` 핸들러에서 `e.over`가 유효한 드롭 타겟(`containerId` 있음)인지 확인하여 `dropAnimation`을 분기:

- 성공(`over.containerId` 있음) → `DragOverlay`의 `dropAnimation={null}` 처리 (즉시 사라짐)
- 실패(`over` 없음 or `containerId` 없음) → 기본 애니메이션 유지 (원위치 피드백)

구현은 `DragOverlay` 컴포넌트에 `dropAnimation` prop을 `useState`로 관리하여 dragEnd 직전에 세팅, dragStart 시점에 다시 기본으로 복원한다.

### Feature 3 — Delete / Backspace 단축키 + Undo

`useGlobalShortcuts` 확장:

```ts
if (e.key === "Delete" || e.key === "Backspace") {
  const t = e.target as HTMLElement | null;
  const tag = t?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  if (t?.isContentEditable) return;
  const { selectedId, removeNode, document: doc } = useLayoutStore.getState();
  if (!selectedId || selectedId === doc.root.id) return;
  e.preventDefault();
  removeNode(selectedId);
}
```

- `Undo/Redo`는 이미 `useGlobalShortcuts`에 구현되어 있음. `removeNode`는 `commit()`을 통해 past에 push되므로 자동으로 Undo 대상이 됨. 추가 작업 없음.

### Feature 4 — Button 인라인 편집

`NodeRenderer`의 Button 렌더 분기를 `ButtonLeaf` 컴포넌트로 분리. 패턴은 기존 `TextLeaf`와 동일:

- 평소: `<button>` 렌더, `onDoubleClick` → `setEditing(true)`
- 편집 모드: 같은 크기/변형을 유지한 채 `<input>`으로 전환. `value = draft`
- Enter(shift 없음) / blur → `updateProps(node.id, { label: draft })`, `setEditing(false)`
- Escape → `setDraft(p.label)`, `setEditing(false)`
- 편집 중 `disabled: editing`으로 Draggable 비활성 (Text와 동일)
- `onPointerDown`/`onClick` 이벤트는 `stopPropagation`으로 드래그/선택 방해 방지

### Feature 5 (원래 항목 5) — 드롭

라벨 한국어화 작업은 수행하지 않는다. 기존 Inspector의 `Select`/`SegmentedControl` 표기(영어 키)를 그대로 둔다.

### Feature 6 — Canvas 뷰포트

변경점:

1. Toolbar에 **Viewport 드롭다운** 추가:
   - Free / Desktop 1920×1080 / Laptop 1440×900 / Tablet 768×1024 / Mobile 375×812 / Custom
   - Custom 선택 시 오른쪽에 가로·세로 숫자 입력 2개 노출
2. 동일한 드롭다운 옆에 **Safe Area %** 숫자 입력(0~20, 기본 0) 추가
3. `Canvas` 컴포넌트가 `viewport`를 읽어 다음과 같이 렌더:
   - `free`: 현재 동작 유지(자식 크기 기반)
   - 그 외: 고정 크기 `div`(`width/height = preset값 또는 custom값`)를 만들고, 내부에 `padding: safeAreaPct%` 적용 후 root container 렌더
   - 뷰포트 박스는 중앙 정렬(기존 `main` wrapper의 `items-center justify-center`가 그대로 작동)
   - 본문 영역이 뷰포트보다 작으면 `main`의 `overflow-auto`(기존)가 스크롤바를 노출
4. Toolbar의 제목 옆에 "현재 뷰포트: …" 툴팁 or 작은 배지 노출(선택, UX 개선)
5. 뷰포트 박스에는 미세한 border(예: `ring-1 ring-neutral-800`) + 좌상단에 `1440 × 900` 라벨 배지를 표시

### Feature 7 — Container 라인 옵션

`ContainerProps.borderStyle | borderWidth | borderColor`를 추가하고 다음을 수정:

- `containerStyle(p)`에서 `borderStyle !== "none" && borderStyle !== undefined`일 때만 `borderStyle/borderWidth/borderColor`를 CSS에 반영
- Inspector의 container 편집 영역에 새 섹션 "Border":
  - Style: `SegmentedControl` (실선/대시/점선/없음 → solid/dashed/dotted/none)
  - Width: `NumberInput` (0~8)
  - Color: `TextInput` (hex)

Split 노드와의 역할 분담:
- **Split**: 구분선 역할의 독립 노드 (형제 사이에 놓임)
- **Container border**: 컨테이너 자체의 경계를 시각화

### Feature 8 — Panel Layout 노드

신규 `NodeKind: "panel-layout"` 도입.

**Palette**: "Panel Layout" 항목을 추가(기본 5-슬롯 중 header/left/main만 활성). 아이콘은 `LayoutGrid`(lucide-react).

**생성 시 기본 자식 구조**:

```
panel-layout
├── container (label: "Header", direction: "row")
├── container (label: "Left", direction: "column")
├── container (label: "Main", direction: "column")
├── container (label: "Right", direction: "column")
└── container (label: "Footer", direction: "row")
```

각 슬롯 container는 기본적으로 존재하지만 `showHeader/showLeft/...` 플래그가 false면 렌더 시 건너뛴다. 이 때 해당 container는 데이터상으로는 살아 있어, 토글을 다시 켜면 복원된다.

**렌더링**: CSS Grid 기반 5-영역 레이아웃

```
┌─────────────┐
│   Header    │ headerHeight
├────┬───┬────┤
│Left│Main│Rgt│ flex-1
├────┴───┴────┤
│   Footer    │ footerHeight
└─────────────┘
```

```css
display: grid;
grid-template-columns: ${leftWidth}px minmax(0,1fr) ${rightWidth}px;
grid-template-rows: ${headerHeight}px minmax(0,1fr) ${footerHeight}px;
grid-template-areas:
  "header header header"
  "left   main   right"
  "footer footer footer";
```

비활성 슬롯은 해당 row/col을 `0px`로 축소하고 영역 이름을 제거하는 방식으로 처리.

**Inspector**: panel-layout이 선택되면
- 상단 Toggle 5개: Header / Left / Main(항상 true, 비활성) / Right / Footer
- 크기 NumberInput 4개: Header H / Footer H / Left W / Right W

**드롭 동작**: panel-layout의 직접 자식은 고정 5개이므로, Palette에서 panel-layout 자식 container에는 드롭 가능하지만 panel-layout 자체에는 드롭이 막힌다(즉, `panel-layout.id`는 DropZone 타겟이 되지 않는다).

**레이어 트리**: panel-layout 아래에 `◼ Header / Left / Main / Right / Footer` 컨테이너들이 슬롯 순으로 항상 노출된다(비활성 슬롯도 회색 처리되어 보이지만 "Hidden"으로 표기).

### Feature 9 — 고정 영역 (pinned container)

`ContainerProps.pinned = "top" | "bottom" | "none"` 추가.

**의미있는 컨텍스트**: pinned 속성은 자식이 **슬롯 container 안에 1단 깊이로** 배치되었을 때만 동작한다(슬롯 container는 `findPanelLayoutSlot`로 판정). 그 외 위치(일반 container, 중첩된 container)에서는 `pinned` 값은 무시되고 평범한 flow 자식처럼 렌더된다.

**슬롯 container 내부 렌더링 규칙**:

- 자식들을 3그룹으로 분할:
  - **top 그룹**: `pinned: "top"`인 자식들 (순서 유지)
  - **bottom 그룹**: `pinned: "bottom"`인 자식들 (순서 유지)
  - **flow 그룹**: 나머지
- CSS flex column + 각 그룹을 별도 wrap div로 구성:

```
┌────────────────────┐
│ top pinned (고정)  │
├────────────────────┤
│ flow area (스크롤) │  flex-1, overflow-auto
│                    │
├────────────────────┤
│ bottom pinned (고정)│
└────────────────────┘
```

- Inspector에서 container 편집 시 부모가 "panel-layout 슬롯 container"라고 판단되면 **Pin** 섹션 노출 (상/하/없음 segmented)
- 일반 container 안에서는 Pin 필드를 UI에서도 숨긴다.

### Feature 10 — 공용 고정 크기

모든 노드에서 "자동 크기 / 고정 크기"를 전환할 수 있다.

**데이터:** `LayoutNode.sizing = { fixedSize, width, height }` (타입 변경 §0 참조)

**렌더 규칙:**

| Kind | 해석 |
|---|---|
| container | `fixedSize=true`면 `style.width = width; style.height = height`. flex 자식에서 `flex-shrink: 0`을 추가해 부모 레이아웃이 축소시키지 않게 함. |
| panel-layout | 지원함. Canvas viewport와 함께 사용하면 고정 해상도 프레임의 일부로 고정 크기 panel-layout이 들어갈 수 있음. |
| text | `fixedSize=true`면 감싸는 `<span>` 대신 `<div style={{ width, height, overflow:"hidden" }}>`로 렌더. 텍스트가 넘치면 잘림(`text-overflow`: 기본 `clip`). |
| button | `<button style={{ width, height }}>`. 기존 `size`(sm/md/lg)의 padding은 유지되지만 버튼 박스 크기는 width/height가 우선. |
| input | 감싸는 flex-column은 그대로, 내부 `<input>`에 `width/height` 적용. label 영역은 height에서 제외(width만 영향). |
| checkbox | 감싸는 `<label>`에 `width/height` 적용. 체크박스 아이콘 크기는 건드리지 않음. |
| progress | `<div className="w-full">` 대신 `<div style={{ width }}>` 사용, height는 게이지의 track 높이로 덮어쓰기(기본 h-2 대신 height px). label 영역은 여전히 위쪽에 노출(있을 때). |
| split | horizontal: `width`가 선 길이, `height`는 무시(thickness가 이미 있음). vertical: 반대. `fixedSize=false`면 기존 stretch 동작. |
| foldable | 접힘 섹션 전체에 `width/height`. 열릴 때도 height를 넘어서면 내부 overflow 처리(여기서는 단순 `overflow: hidden`). |

**Inspector UX:**

각 노드의 kind-fields 하단에 공용 섹션 **"Size"**를 일관된 위치에 렌더한다:

```
┌ Size ────────────────────────┐
│ [☐ Fixed size]               │
│ ┌─────────┐ ┌─────────┐      │
│ │ W:  120 │ │ H:   40 │ (Fixed ON일 때만)
│ └─────────┘ └─────────┘      │
└──────────────────────────────┘
```

- "Fixed size" 토글이 OFF(기본)면 W/H 입력 숨김. 값은 데이터에 남겨둠(토글 복원 시 이전 값 유지).
- W/H 입력: `NumberInput` (min 0, max 4096, 빈 값 허용하지 않음. 토글 켤 때 해당 노드의 실제 렌더 크기를 기본값으로 초기화).
- Container의 기존 Padding/Gap 섹션과 별개로 Size 섹션을 둔다.
- panel-layout 슬롯 container의 경우 슬롯 크기는 panel-layout 쪽 `leftWidth/headerHeight`가 우선권을 가지므로, 슬롯 container의 Size 섹션은 그대로 노출하되 "상위에서 관리됨" 힌트 텍스트(툴팁)를 덧붙인다.

**호환성**: 기존 문서는 `sizing === undefined` 또는 `fixedSize !== true` → 완전한 후방 호환.

## 구현 순서/의존성

1. **Type & Store 토대** (항목 1 동작 반영 포함)
   - `types/layout.ts`: Viewport/PanelLayoutProps/ContainerProps 확장
   - `stores/layoutStore.ts`: `createNode("panel-layout")`에서 5개 슬롯 container 자동 생성 로직, `defaultPropsFor`, Viewport helper
2. **Persistence 영향 없음 확인** (Firestore `ignoreUndefinedProperties` 설정으로 신규 optional 필드 자동 호환 — 재확인만)
3. **렌더링 파이프라인**
   - `NodeRenderer`에 `panel-layout` 분기 (슬롯 container에 대한 특수 pinned 렌더링 포함)
   - `containerStyle`에 border 속성 반영
   - 공용 `applySizing(node)` 헬퍼 — `sizing.fixedSize`가 true면 `{width, height, flexShrink: 0}`를 반환. 각 kind 렌더 함수가 이 스타일을 해당 DOM 요소에 머지
4. **툴바 / 뷰포트**
   - `Toolbar`에 Viewport 드롭다운, Safe Area 입력, Save As 버튼, SaveAsDialog
   - `Canvas` 컴포넌트가 viewport를 기반으로 고정 박스/프레임 렌더
   - Load 시 id 재할당 제거
5. **Inspector 확장**
   - container: Border 섹션, (슬롯 내부일 때) Pin 섹션
   - panel-layout: 슬롯 토글/크기 필드
   - button: 기존 그대로 유지 (편집은 캔버스에서)
   - 모든 kind 공용: **Size 섹션** (Fixed size 토글 + W/H) — KindFields 아래 공용 렌더러로 삽입
6. **키보드 & DnD 피드백**
   - `useGlobalShortcuts`에 Delete/Backspace
   - `App.tsx`의 DragOverlay에 `dropAnimation` 상태 관리 (성공/실패 분기)
7. **인라인 편집**
   - `NodeRenderer`의 Button 분기를 `ButtonLeaf`로 교체
8. **Palette**
   - Panel Layout 항목 추가
9. **Export 영향 확인**
   - `toMarkdown`/`toMermaid`/`toJson`에서 panel-layout을 children 순회 대상으로 포함 (기본 container 경로를 타므로 대부분 자동, 라벨 표기만 보강)

## 호환성 & 마이그레이션

- 기존 저장 문서(IndexedDB/Firestore)에는 `viewport` 필드가 없음 → `undefined`를 `free`로 해석
- 기존 container에 `borderStyle`/`pinned`가 없으면 `"none"` / `"none"`으로 해석
- 기존 노드에 `sizing`이 없으면 `fixedSize=false`로 해석 → 자동 크기(현재 동작과 동일)
- `panel-layout`은 신규 타입이므로 기존 문서에 존재할 수 없음 → 마이그레이션 불필요

## 테스트 전략

현재 프로젝트에 단위 테스트 인프라가 없으므로(package.json 기준) 이번 스펙 구현에서는:

- **수동 회귀 시나리오 문서**(구현 플랜 단계에 체크리스트 형태로 포함)로 대체
- 9개 개선 항목 각각에 대해 "의도대로 동작 / 기존 기능 미회귀" 체크 포인트 정의
- 차후 테스트 인프라 도입 시 이 설계 문서가 테스트 케이스 명세로 재활용될 수 있음

핵심 회귀 체크 포인트(요약):

- Save → 덮어쓰기 (동일 id 유지)
- Save As → 새 id + 새 title, 현재 편집 대상이 사본으로 전환
- Load 후 바로 Save → 원본 덮어쓰기(중복 생성 X)
- 드래그 성공 시 즉시 사라짐 / 실패 시 원위치
- Delete/Backspace 선택 삭제 + Undo(⌘Z) 복원
- Button 더블클릭 → 인라인 편집 → Enter/Blur 커밋
- Viewport 프리셋 전환 시 Canvas 박스 크기 즉시 변경
- Viewport가 화면보다 크면 스크롤바 노출
- Container Border 실선/대시/점선 전환 반영
- panel-layout 생성 후 5개 슬롯 container 자동 존재
- 슬롯 토글로 비활성 슬롯 공간 축소
- pinned:top 자식이 슬롯 상단에 고정되고, flow 영역만 스크롤
- 모든 kind에서 Fixed size 토글 → Width/Height 입력 노출 → 값 반영
- Fixed size OFF 시 자동 크기(기존 동작)로 돌아가고, 재토글 시 이전 값 복원
- Container fixed size가 부모 flex에서 축소되지 않음(`flex-shrink: 0` 확인)

## 열린 이슈(향후)

- Canvas Zoom 배율 (50/75/100/Fit) — 후속 릴리즈
- Load 리스트 항목 삭제 버튼 — 이 스펙 범위 외
- panel-layout을 중첩(예: Main 안에 또 다른 panel-layout) 허용 여부 — 현재는 기술적으로 막지 않음. 렌더/Export 상에서 동작은 하지만 공식 UX는 "1개 문서당 최상위 1개"로 안내
