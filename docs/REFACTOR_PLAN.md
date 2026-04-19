# ModalMaker 성능 최적화 & 리팩토링 계획

> 최초 작성: 2026-04-19, `main` @ `fab7568`
> 최종 갱신: 2026-04-19, `main` @ `aa4a21d` — Phase 1~5 대부분 완료
> 목표: **노드 타입·인터렉션·프리셋 확장이 쉬워지도록 구조화**하고, 복잡도 증가가 성능 붕괴로 이어지지 않게 기반을 강화한다.

---

## 0. 완료 요약 (스냅샷)

| 지표 | Before (fab7568) | After (aa4a21d) | 변화 |
|---|---|---|---|
| `Inspector.tsx` LOC | 872 | 225 | **-74%** |
| `layoutStore.ts` LOC | 858 | 222 (+ slice 7개 총 748) | 관심사 분리 |
| `NodeRenderer.tsx` LOC | 431 | 50 | **-88%** |
| `PreviewRenderer.tsx` LOC | 404 | 64 | **-84%** |
| 초기 JS 청크 | 1,843KB / gzip 432KB | 1,613KB / gzip 361KB | **-12% / -17%** |
| 청크 분할 | 1개 | 7개 (NodeView·Preview·Presets·Export·SaveAs·presetRegistry 등 lazy) | ✅ |
| 신규 kind 추가 비용 | 8~10 파일 수정 | `src/nodes/<kind>/` 1개 디렉토리 | **O(n)→O(1)** |

**Phase 1** (노드 레지스트리) ✅ 완료 — 10/10 kind, `NodeDescriptor` 정착
**Phase 2** (렌더러 통합) ✅ 완료 — `NodeHost`/`NodeHostCanvas`/`NodeHostPreview` + `CanvasAdorners`/`PreviewAdorners`
**Phase 3** (Store 분할, 옵션 A) ✅ 완료 — `stores/layout/` 슬라이스(`document`/`selection`/`history`/`ui` + `graph`/`commit`/`cloneTree`)
**Phase 4** (성능 최적화) ✅ 주요 완료 — `useShallow` 확산, lazy chunk 6개, button/input Leaf 이관, CanvasViewport RO 통합
**Phase 5** (폴더 재편) ✅ 부분 — `features/editor/{toolbar,palette,inspector,layer-tree}` 통합

---

## 1. 잔존 리팩토링 이슈 (Phase 6 이후 대상)

### 1-1. 여전히 큰 파일 (최대 LOC 상위)

| 파일 | LOC | 문제 |
|---|---|---|
| `features/presets/presetRegistry.ts` | 615 | 15개 프리셋 빌더가 한 파일에 집중, `doc()` 헬퍼·마이그레이션 로직 혼재 |
| `stores/layout/documentSlice.ts` | 459 | 노드·페이지·모듈·엣지 뮤테이션이 한 `buildDocumentSlice`에 집중 |
| `features/editor/toolbar/Toolbar.tsx` | 453 | 본체 + `LoadDialog` + `ToolbarButton` + 유틸이 한 파일에 — `LoadDialog`(200 LOC) 분리 가능 |
| `features/canvas/CanvasViewport.tsx` | 448 | fit/reveal/RO 재시도 로직 복잡 — `useRef` 28개 통계, 4개 `useLayoutEffect` |
| `features/preview/PreviewOverlay.tsx` | 337 | `ViewportFrame`/`PopupViewportFrame`/테마 선택기/탭 active map 초기화가 한 파일 |

### 1-2. 성능

1. **React.memo 미적용** — `NodeHost` 계열은 `memo()` 미사용. 대형 문서(200+ 노드)에서 하나의 props 변경이 전체 트리 재렌더를 유발할 가능성.
2. **`useLayoutStore(selector)` 최적화 범위 불균일** — 63회 사용 중 다수는 이미 세분 selector이지만 일부 컴포넌트는 여전히 큰 객체 구독.
3. **Immer produce 오버헤드** — 대형 문서에서 매 뮤테이션마다 전체 `document` draft. 일부 핫패스(매 키 입력으로 발생하는 `updateProps`)는 patch 기반 최적화 가능.
4. **`NodeView`의 ReactFlow 노드 매핑** — `useNodesState`/`useEdgesState` 연동부가 변경 횟수만큼 `setNodes` 호출. 많은 페이지일 때 프로파일 필요.

### 1-3. 확장성

1. **`NodeKind` union 수동 유지** — `types/layout.ts`의 `NodeKind` 타입은 여전히 문자열 union. 레지스트리에 자동 등록되지만 타입은 중복 선언 필요.
2. **`NodeProps` union** — 동일 문제. 새 kind 추가 시 `NodeProps` union에 추가해야 TypeScript가 props 판별.
3. **LayerTree의 kind 분기** — 아이콘/라벨 일부가 아직 `switch`로 남아 있을 수 있음(커밋 기록상 layerLabel descriptor는 있으나 소비부 확인 필요).
4. **인터렉션 액션 확장 구조** — `InteractionAction` union에 새 액션(스크롤·데이터 바인딩·애니메이션) 추가 시 Inspector/런타임 두 곳 수정.

### 1-4. 테스트/관측성

1. **테스트 인프라 부재** — 단위/통합 테스트 없음. 회귀 검증은 수동 시나리오에 의존. 마이그레이션 로직(`migrateToV2`)·commit snapshot 로직은 특히 위험.
2. **런타임 관측성 부재** — `console.warn`/`console.error`만 존재. 프로덕션에서 사용자 환경 버그 추적 수단 없음.

### 1-5. 타입 시스템

1. **`as never` 캐스트 잔존** — `Inspector.tsx`에서 `descriptor.Inspector` 호출 시 `as never`로 prop 타입 우회.
2. **`Record<string, unknown>` 의존** — `onChange` 콜백이 타입 안전하지 않은 경로가 일부 남아 있음.

---

## 2. Phase 6: 남은 거대 파일 분해 (저위험)

### 6-1. `toolbar/Toolbar.tsx` 분리 — 0.5일
- `LoadDialog` → `features/editor/toolbar/LoadDialog.tsx`
- `SaveAsDialog`는 이미 별도 파일
- `currentPageAsLayoutDoc`/`readableError` → `toolbar/toolbarUtils.ts`
- `ToolbarButton` → `toolbar/ToolbarButton.tsx`
- 목표: `Toolbar.tsx` 453 → ~200 LOC

### 6-2. `stores/layout/documentSlice.ts` 세분화 — 1일
현재 하나의 `buildDocumentSlice`에 **20+ 액션**이 집중. 논리적 그룹으로 분할:

```
stores/layout/
├── documentSlice.ts        # 기존 파일을 아래로 분해 후 import/compose
├── nodeActions.ts          # addNode/addNewNode/moveNode/updateProps/patchNode/removeNode/duplicateNode
├── pageActions.ts          # addPage/removePage/updatePage/setCurrentPage/movePage/duplicatePage
├── moduleActions.ts        # registerModule/unlinkModule/updateModule/removeModule/enterModuleEdit/exitModuleEdit
├── edgeActions.ts          # addEdge/removeEdge
└── interactionActions.ts   # addInteraction/updateInteraction/removeInteraction
```

각 액션 그룹은 `{ set, get, deps }`를 받아 `Pick<LayoutState, ...>`를 반환. `buildDocumentSlice`는 단순 합성자(`spread`).

### 6-3. `canvas/CanvasViewport.tsx` 훅 추출 — 1일
복잡한 ref/effect 로직을 커스텀 훅으로 분리:

```
features/canvas/
├── CanvasViewport.tsx          # UI + 이벤트 바인딩 (목표 ~150 LOC)
├── hooks/
│   ├── useFitTransform.ts      # fit()·scale·pan·revealAfterStable
│   ├── useContainerSize.ts     # ResizeObserver + measured 관리
│   └── usePointerPanZoom.ts    # wheel/trackpad/pinch/gesture 핸들러
```

리스크: 훅 경계를 잘못 그으면 기존 엣지 케이스(로드 직후 맞춤·모듈 편집 종료·`custom-w` free height) 회귀. 통합 전 수동 시나리오 체크리스트 필수.

### 6-4. `presets/presetRegistry.ts` 카테고리 분리 — 0.5일

```
features/presets/
├── presetRegistry.ts           # BUILTIN_PRESETS export + 헬퍼만
├── builders/
│   ├── doc.ts                  # doc()/text()/button() 등 빌더 헬퍼
│   ├── layouts.ts              # 5개 Layout 프리셋 (Row/Column/Grid/...)
│   └── modals.ts               # 10개 모달 프리셋 (Form/Confirm/...)
```

### 6-5. `preview/PreviewOverlay.tsx` 뷰포트 프레임 분리 — 0.5일
- `ViewportFrame`·`PopupViewportFrame` → `preview/ViewportFrame.tsx`
- `ThemePicker` → `preview/ThemePicker.tsx`
- `initTabActiveMap` → `preview/previewRuntime.ts`
- `PreviewOverlay.tsx` 337 → ~180 LOC

---

## 3. Phase 7: 성능 2차 패스 (중위험)

### 7-1. `NodeHost`에 `React.memo` 적용 — 0.5일
```ts
export const NodeHost = memo(NodeHostImpl, (prev, next) => {
  // Immer는 변경되지 않은 서브트리의 LayoutNode 참조를 유지하므로
  // node 참조 + mode + 선택 상태가 동일하면 재렌더 생략 가능.
  return prev.node === next.node
    && prev.mode === next.mode
    && prev.depth === next.depth
    && prev.parentDirection === next.parentDirection;
});
```
- **측정 전후 필수**: 200 노드 문서에서 Input 1자 입력 시 렌더 컴포넌트 수를 React Devtools Profiler로 비교.

### 7-2. Hot mutation 최적화
- `updateProps`는 텍스트 입력마다 호출 → 매번 `produce` + 전체 `commit` snapshot.
- 연속 입력은 **debounced snapshot**으로 그룹핑 (예: 타이핑 종료 후 500ms, 또는 blur 시점에만 snapshot).
- 저장된 히스토리 엔트리가 "K-K-Ka-Kat-Kate-Katie" 6개 → 1개로 축소.

### 7-3. `LayerTree` 가상화
- 큰 문서에서 깊은 트리 렌더 비용 측정 후 필요 시 `react-window` 또는 수동 가상화.
- 현재는 우선순위 낮음 (500+ 노드 이전엔 영향 미미).

### 7-4. `lucide-react` 트리셰이킹 확인
- 이미 named import 쓰지만 실제 번들에 몇 개 아이콘이 들어가는지 `vite-plugin-analyzer`로 측정.
- `IconPicker`가 전체 lucide를 참조한다면 동적 import로 지연.

---

## 4. Phase 8: 확장성·타입 강화 (중위험)

### 8-1. `NodeKind` / `NodeProps` 타입의 단일 진실 원천화
- 현재: `types/layout.ts`에 수동 union + `src/nodes/*/index.ts`에 register().
- 목표: **레지스트리 자체**가 타입 유도의 원천이 되도록 — `nodes/registry.ts`에서 `type NodeKind = keyof typeof RegistryMap` 형태로.
- 제약: register는 런타임 동적이므로 **컴파일타임 타입 유도에는 map 객체가 필요**. kind별 type assertion 대신 `declare module` 형태의 확장 시스템 도입.

### 8-2. 인터렉션 액션 레지스트리
- `InteractionAction` union을 `InteractionActionDescriptor` 레지스트리로 분해.
- Inspector 편집 UI·`runActions` 실행 구현을 한 모듈에서 짝지어 등록.
- 새 액션 추가 시 한 곳만 수정.

### 8-3. 테마 토큰 스키마 명문화
- `ThemeTokens`에 `accent`·`surface`·`text`·`border`·`input`·`button` 카테고리 그룹화.
- `ThemeContext`에서 runtime 검증 1회(개발 모드).

---

## 5. Phase 9: 테스트 인프라 (고 가치, 시작 비용 있음)

### 9-1. Vitest 도입 — 0.5일
- 단위 테스트: `lib/id`, `lib/layoutSizing`, `lib/migrate`, `stores/layout/cloneTree`, `graph` 함수.
- 리듀서 계열: `stores/layout/documentSlice` 각 액션을 초기 상태→기대 상태로 검증.

### 9-2. Component 테스트 — 1일
- `@testing-library/react`로 `NodeHostCanvas` + `TextLeaf`/`ButtonLeaf` 조합 스냅샷.
- 레지스트리 초기화는 테스트 setup에서 1회.

### 9-3. 마이그레이션 골든 테스트 — 0.5일
- v1 JSON fixture → `migrateToV2` → 기대 v2 snapshot. 향후 스키마 변경 회귀 방지.

---

## 6. Phase 10: 관측성 (장기)

- `console.error` 대신 중앙 로거(`lib/logger.ts`) 사용. 프로덕션은 no-op, 개발은 포맷팅.
- Firebase 환경이면 **Firestore write 실패/읽기 실패**를 자동 수집 버킷에 기록(옵션).
- UI에는 "저장 실패 시 재시도" 토스트 UX 통일.

---

## 7. 우선순위 로드맵

| Phase | 가치 | 위험 | 공수 | 순서 |
|---|---|---|---|---|
| **6** 거대 파일 분해 | ★★★ | 낮음 | 3일 | 1 |
| **7-1** React.memo + 측정 | ★★★ | 낮음 | 0.5일 | 2 |
| **7-2** Debounced snapshot | ★★★ | 중간 | 1일 | 3 |
| **9-1/9-3** Vitest + migration test | ★★★ | 낮음 | 1일 | 4 |
| **9-2** Component test | ★★ | 낮음 | 1일 | 5 |
| **8-1/8-2** 레지스트리 타입 강화 | ★★ | 중간 | 2일 | 6 |
| **6-3** CanvasViewport 훅 추출 | ★★ | 중간 | 1일 | 7 |
| **7-4** Icon 트리셰이킹 분석 | ★ | 낮음 | 0.5일 | 8 |
| **10** 관측성 | ★★ | 낮음 | 1일 | 후순위 |

합계 **~11일** — Phase 6과 7-1/7-2/9-1을 우선 묶어 **첫 번째 PR 5일치** 작업으로 정의하면 체감 개선이 크다.

---

## 8. 의도적 제외

- **원격 실시간 협업** (multi-cursor / CRDT): 단일 사용자 도구 전제 유지.
- **UI 국제화**: 한국어 UI 그대로.
- **새 기능**: Phase 6~10 동안 기능 추가 금지, 핫픽스만 허용.
- **Tauri 네이티브 배포**: Phase 10 이후 고려.

---

## 변경 이력

- 2026-04-19 초안 — Phase 1~5 목표 및 단계 설정.
- 2026-04-19 갱신 — Phase 1~5 완료 표시, Phase 6~10 추가.
