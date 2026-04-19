# Phase 3: 스토어 분할 설계 초안

> 목표: `useLayoutStore` 단일 객체 구독을 줄이고, 테스트·변경 단위를 명확히 한다.  
> 제약: **Undo/Redo는 `document` 스냅샷**과 동기화되어야 하며, selection·UI는 히스토리에 포함하지 않는 현재 정책을 유지한다.

## 현재 상태 (요약)

- `layoutStore` 안에 `buildDocumentSlice` / `buildSelectionSlice` / `buildHistorySlice` / `buildUiSlice`로 **논리적 슬라이스**는 이미 분리됨.
- 런타임은 여전히 **하나의 Zustand 스토어** 하나로 합성(`create<LayoutState>()`).

## 옵션 A — 단일 스토어 유지 + 구독만 분리 (저위험)

- 지금처럼 `useShallow` / 세분 선택자로 재렌더만 줄인다.
- 슬라이스 파일 구조는 유지, `document` 관련 액션만 `useDocumentStore` 같은 **selector 훅**으로 래핑해 제공(내부는 동일 `useLayoutStore`).

## 옵션 B — Zustand 미들웨어로 스토어 2개 + 동기화 (중위험)

1. **`useDocumentStore`**: `document` + 문서 뮤테이션만. `commit`은 여기서 `produce` 후 `updatedAt` 갱신.
2. **`useEditorChromeStore`**: `selectedId`, `selectedIds`, `mode`, `editingModuleId`, `past`, `future` 등.
3. **히스토리**: `undo` 시 `past`에서 꺼낸 스냅샷을 `documentStore.setState`로 넣고, chrome store의 `past`/`future`만 맞춘다.  
   - 두 스토어 업데이트를 **한 트랜잭션**처럼 쓰려면 `undo` 구현부에서 둘 다 동기 호출 또는 작은 오케스트레이터 모듈(`applyUndo()`).

리스크: 구독 순서·초기 hydrate·테스트 더블이 늘어남.

## 옵션 C — `zustand/middleware` combine + slice 네임스페이스 (중위험)

- 공식 `combine` 또는 커스텀 ` immer ` 한 겹으로 `state.document` / `state.selection`을 **타입만** 네임스페이스 분리.
- 런타임은 단일 store 유지 → Undo 구현 단순, 컴포넌트는 `useLayoutStore(s => s.selection...)` 형태로 읽기.

## 권장 진로 (단계)

1. **단기**: 옵션 A + 기존 슬라이스 유지 (이미 진행 중).
2. **중기**: 옵션 C로 타입·selector 정리 후, 필요 시 옵션 B로 `document`만 분리.
3. **장기**: 원격 협업·time-travel 디버그가 필요해지면 `document` 전용 store + 이벤트 소싱 검토.

## Undo와의 계약 (변경 금지 조건)

- `commit` 전 `snapshot(document)`는 **동일한 `NodeDocument` 참조 규칙**을 따라야 함.
- `removePage` 등 `commit` 밖에서 `produce`하는 경로는 `past`/`future`와 함께 **원자적**으로 유지.

## 체크리스트 (분할 PR 전)

- [ ] `undo`/`redo` 후 `selectedId`가 존재하지 않는 노드를 가리키지 않는지 (기존 동작 회귀).
- [ ] 모듈 편집 모드 진입/종료 시 `editingModuleId`와 `document` 일관성.
- [ ] Vitest 또는 수동: 저장/로드, 페이지 삭제, 프리뷰 진입.
