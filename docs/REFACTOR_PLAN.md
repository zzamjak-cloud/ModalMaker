# ModalMaker 성능 최적화 & 리팩토링 계획

> 기준: 2026-04-19, `main` @ `fab7568`
> 규모: 58개 TS/TSX, 약 8,900 LOC, 번들 ~1.84MB(gzip 432KB)
> 목표: **노드 타입·인터렉션·프리셋 확장이 쉬워지도록 구조화**하고, 복잡도 증가가 성능 붕괴로 이어지지 않게 기반을 강화한다.

---

## 1. 현재 구조 진단

### 코드 집중 영역 (LOC 상위)
| 파일 | LOC | 문제 |
|---|---|---|
| `features/inspector/Inspector.tsx` | 872 | kind별 섹션이 한 파일에 몰려 있음 — 노드 추가 시 이 파일이 부풀어 오름 |
| `stores/layoutStore.ts` | 858 | 문서/선택/히스토리/모듈/프리뷰/뷰포트 액션이 한 스토어에 혼재 |
| `features/presets/presetRegistry.ts` | 615 | 프리셋 빌더 전부 집중, v1/v2 마이그레이션 로직 섞임 |
| `features/canvas/NodeRenderer.tsx` | 431 | `switch (node.kind)` 중심, 모듈-ref·컨테이너·리프 분기 섞임 |
| `features/preview/PreviewRenderer.tsx` | 404 | NodeRenderer와 60~70% 로직 중복 (컨테이너 처리·리프 switch) |
| `features/canvas/CanvasViewport.tsx` | 455 | fit/reveal/RO 재시도 로직 복잡 — useLayoutEffect 4개, ref 10개 |

### 구조적 부채
1. **노드 타입 추가 비용이 O(n)** — 새 kind 하나 추가 시 수정 필요한 파일:
   - `types/layout.ts` (Props 인터페이스 + NodeProps union + NodeKind)
   - `NodeRenderer.tsx` (renderLeaf switch case)
   - `PreviewRenderer.tsx` (leaf IIFE case + 가끔 최상위 분기)
   - `Inspector.tsx` (kind별 섹션)
   - `Palette.tsx` (팔레트 아이템)
   - `LayerTree.tsx` (nodeLabel + 아이콘)
   - `export/toMarkdown.ts`·`toMermaid.ts` (직렬화)
   - `presets/presetRegistry.ts` (디폴트 props)
   - 총 **8~10개 파일** 동시 수정

2. **Canvas ↔ Preview 렌더러 중복** — container/foldable/module-ref 분기·sizing 처리·flex 부모 전달이 거의 동일하나 각자 구현. Canvas에만 있거나 Preview에만 있는 치우친 동작(인터렉션·드래그·인라인 편집) 때문에 통합 실패한 상태.

3. **거대 Store** — `set((s) => commit(s, draft => ...))` 패턴은 일관되지만, selection / history / preview / module-edit / viewport 등 관심사가 한 곳에 섞여 수정 시 영향범위가 넓다. 훅 단위로 분리가 가능한데 통째로 구독하는 컴포넌트가 존재.

4. **번들 분할 없음** — 1.84MB 단일 청크. `@xyflow/react`, `lucide-react` 아이콘 전체, Firebase, Export 다이얼로그 등이 항상 로드됨.

5. **재렌더 가드 없음** — NodeRenderer·PreviewRenderer·TextLeaf·ButtonLeaf 어느 것도 `React.memo` 미적용. 루트 document 변경 시 전체 트리 재구성.

---

## 2. 단계별 계획 (우선순위순)

### Phase 1: 노드 타입 레지스트리 (최우선, 확장성 근본 해결)

> **가장 먼저 해야 할 이유**: 앞으로 추가될 노드 타입(예: Tab, Slider, Dropdown, Image, Code block…)마다 8~10개 파일을 건드리는 비용이 눈덩이처럼 커진다. 레지스트리 도입 후에는 1개 모듈 = 1개 노드 타입.

#### 목표 구조

```
src/nodes/
├── registry.ts              # 모든 NodeDescriptor를 등록. NodeKind → NodeDescriptor.
├── types.ts                 # NodeDescriptor 인터페이스
├── text/
│   ├── index.ts             # register({ kind: "text", ...descriptor })
│   ├── TextLeaf.tsx         # 캔버스/프리뷰 공용 렌더러 (props: node, mode)
│   ├── TextInspector.tsx    # kind별 Inspector 섹션
│   ├── textExport.ts        # Markdown/Mermaid 직렬화
│   └── defaults.ts          # createDefaultProps()
├── button/ ...
├── input/ ...
└── (각 kind별 디렉토리)
```

#### NodeDescriptor 인터페이스 (초안)

```ts
interface NodeDescriptor<P = NodeProps> {
  kind: NodeKind;
  label: string;                              // 팔레트·레이어 트리 표기
  icon: LucideIcon;
  isContainer: boolean;
  paletteCategory?: "layout" | "input" | "display" | "misc";
  defaultProps: () => P;
  renderLeaf: (ctx: RenderCtx<P>) => React.ReactNode;    // 캔버스·프리뷰 공용
  renderInspector: (ctx: InspectorCtx<P>) => React.ReactNode;
  exportMarkdown?: (node: LayoutNode, children: string) => string;
  exportMermaid?: (node: LayoutNode) => string;
  layerLabel?: (node: LayoutNode) => string;  // LayerTree 표기 커스터마이즈
}
```

`RenderCtx`에 `mode: "canvas" | "preview"`·사이즈 스타일·테마 토큰·인터렉션 핸들러를 주입해, 한 컴포넌트가 두 모드를 모두 처리.

#### 이관 순서
1. `types.ts` + `registry.ts` 신설 (비어 있어도 OK)
2. 가장 단순한 kind부터: `text` → `icon` → `progress` → `checkbox` → `split` → `input` → `button`
3. 각 이관 시 NodeRenderer/PreviewRenderer/Inspector/export의 해당 case를 레지스트리 호출로 치환
4. 마지막으로 컨테이너계(`container`, `foldable`, `module-ref`) — 자식 재귀 훅을 레지스트리에서 호출하도록 구성
5. 이관 완료 후 `Inspector.tsx`는 "선택된 노드의 descriptor.renderInspector 호출 + 공용 섹션(Size·Interaction·Layout)"만 남김 → 예상 200~300 LOC로 축소

**가드레일**: 각 kind 이관 후 수동 시나리오(팔레트에서 드래그, 프리뷰 표시, 레이어 트리, Export, 저장/로드) 점검.

---

### Phase 2: Canvas/Preview 렌더러 통합 (Phase 1 위에서 자연스럽게)

Phase 1의 `renderLeaf(ctx)`가 `mode` 인자를 받으면, NodeRenderer와 PreviewRenderer는 **공통 프레임**(선택 outline, drop zone, 인터렉션)만 자신의 모드로 덧씌우고 내부는 공용 렌더러로 위임.

#### 제안 구조
```
src/nodes/
├── NodeHost.tsx              # 재귀 본체. mode별 가드(선택·DnD·드래그·핸들러)
├── renderers/
│   ├── CanvasAdorners.tsx    # ResizeHandles, outline, DropZone 주입
│   └── PreviewAdorners.tsx   # hover/press/disabled state style, onClick 핸들러 주입
```

NodeRenderer / PreviewRenderer는 얇은 래퍼로 축소 (~50 LOC). 중복 60% 제거 목표.

---

### Phase 3: Store 분할 (관심사 분리)

단일 `useLayoutStore` → 아래 슬라이스로 분할 (Zustand의 `slices` 패턴 또는 여러 store로):

| 슬라이스 | 책임 |
|---|---|
| `documentStore` | `document`, `addNode`, `updateProps`, `updateViewport`, `moveNode` … 문서 변형 전용 |
| `selectionStore` | `selectedId`, `selectedIds`, `select`, `toggleSelectMulti`, `clearMultiSelect` |
| `historyStore` | `past`, `future`, `undo`, `redo`, `commit` — documentStore의 snapshot을 구독 |
| `uiStore` | `mode`, `editingModuleId`, `enterModuleEdit`, `leftTab` … 편집 UI 상태 |
| `previewStore` | 프리뷰 상태(탭 active map, 페이지 history) — 프리뷰 오버레이가 단독 소유 |

**이득**
- 컴포넌트가 필요한 슬라이스만 구독 → 불필요 재렌더 감소.
- 테스트·확장 단위가 명확해짐(히스토리 로직을 변경해도 뮤테이션 코드 영향 없음).

---

### Phase 4: 성능 최적화 (Phase 1·2 기반 위에서)

#### 4-1. 메모이제이션
- `NodeHost`는 `React.memo`로 감싸고 `arePropsEqual`로 **node 참조 변경 + mode**만 체크.
- Immer 덕분에 자식이 바뀌지 않은 노드는 참조 유지 → `React.memo`가 대규모 트리에서 잘 동작.
- 컨테이너의 `containerStyle`·`applySizing` 결과를 `useMemo`로 고정(현재는 매 렌더 재계산).

#### 4-2. Store 선택자 세분화
- 현재 Canvas.tsx는 `useLayoutStore()`로 전체 state 구독 → 어떤 키가 바뀌어도 재렌더. 필요한 키만 shallow compare로:
  ```ts
  const { root, viewport } = useLayoutStore(useShallow(s => ({
    root: activeRoot(s),
    viewport: currentPage(s.document)?.viewport,
  })));
  ```
- 비슷한 패턴을 Toolbar·Inspector·PreviewOverlay에도 적용.

#### 4-3. 번들 코드 스플릿
- `PreviewOverlay` — 동적 import로 분리 (프리뷰 진입 시에만 로드)
- `PresetGallery`·`ExportDialog`·`SaveAsDialog` — 각각 모달 진입 시 lazy
- `@xyflow/react` — 노드 뷰 진입 시 lazy
- `lucide-react` — `iconLookup`은 이미 lazy 패턴이 있으면 유지, 없으면 동적 import로 전환
- 목표: 초기 청크 800KB 이하(gzip 220KB 이하)

#### 4-4. 재연산 핫스팟 정리
- `CanvasViewport`의 fit/reveal 로직 단순화 후 ref 개수 감소 (현재 10여 개 → 4~5개).
- RO + useLayoutEffect 중복 관찰(현재 3개) 통합.

#### 4-5. 측정 전략
- `npm run build` 번들 크기 비교를 매 PR 체크포인트로 기록.
- `performance.mark`로 대형 문서(200+ 노드) 편집 시 Input one-char 입력 → commit → 재렌더 시간 측정.
- React Devtools Profiler로 메모이제이션 전/후 renders 수 비교.

---

### Phase 5: 폴더 구조 정리 (리팩토링 마무리)

Phase 1~4가 끝나면 현재의 기능 중심(`features/canvas`, `features/preview`)과 새 도메인 중심(`nodes/*`)이 섞여 있게 된다. 아래로 재편:

```
src/
├── app/                    # App.tsx, 전역 레이아웃
├── core/                   # types, lib/id, lib/cn, lib/layoutSizing — 도메인 비의존
├── stores/                 # 분할된 slices
├── nodes/                  # Phase 1 결과 — 노드 타입별 모듈
├── features/
│   ├── editor/             # palette, layer-tree, inspector, toolbar
│   ├── canvas/             # Canvas, CanvasViewport, DnD, ResizeHandles
│   ├── node-view/
│   ├── preview/
│   ├── export/
│   ├── presets/
│   ├── persistence/        # local, remote, migrate
│   └── auth/
└── index.css, main.tsx
```

---

## 3. 로드맵 요약

| Phase | 이득 | 위험 | 공수(대략) |
|---|---|---|---|
| **1. 노드 레지스트리** | 신규 노드 추가 비용 O(n)→O(1), 파일별 분할로 리뷰 쉬움 | kind별 이관 중 회귀 가능 → kind 단위로 PR | 3~5일 |
| **2. 렌더러 통합** | NodeRenderer/PreviewRenderer 중복 60% 제거 | canvas 전용(DnD·선택)·preview 전용(state style) 섞임 주의 | 2일 |
| **3. Store 분할** | 컴포넌트 구독 최소화, 관심사 분리 | Undo/Redo가 여러 슬라이스를 spans → history 설계 신중히 | 2~3일 |
| **4. 성능 최적화** | 초기 로드 절반, 대형 문서 재렌더 1/5 목표 | 메모 비교 누락 시 stale UI 버그 | 2~3일 |
| **5. 폴더 재편** | 신규 기여자 진입 장벽 ↓ | git blame 유실(한 번의 rename PR로 최소화) | 0.5일 |

총 **10~14일**의 단일 담당자 공수. 각 Phase는 독립 PR로 분리하고, Phase 1은 `kind` 단위로 다시 쪼개 기능 브랜치(`refactor/nodes-registry-text`, `-button`…) 순차 머지.

---

## 4. 착수 직전 체크리스트

- [ ] 현 상태에서 수동 회귀 시나리오 스크립트화 (저장/로드, 팔레트→드롭, 모듈 등록/편집, 프리뷰, Export 4종)
- [ ] 번들 크기 베이스라인 기록 (`dist/assets/*.js` 현재 1,843KB 기록)
- [ ] 렌더 시간 베이스라인 (200 노드 문서에서 Input 타이핑 FPS)
- [ ] `feature/refactor-nodes-registry-foundation` 브랜치 생성 후 Phase 1 시작

## 5. 의도적 제외 (현재 범위 밖)

- **Firestore 스키마 변경**: 현 v2 유지, 레지스트리는 직렬화 포맷 동일.
- **테스트 인프라 도입**: 테스트 프레임워크(Vitest 등) 도입은 별도 프로젝트 — 현재는 수동 시나리오 유지.
- **국제화**: 한국어 UI·주석은 그대로.
- **새 기능**: 리팩토링 중에는 기능 추가 보류. 버그 핫픽스만 허용.
