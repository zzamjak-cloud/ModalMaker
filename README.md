# ModalMaker

> 비주얼 캔버스에서 멀티 페이지 앱 구조를 설계하고, **AI가 바로 이해할 수 있는 Markdown / JSON / Mermaid**로 내보내는 도구.

![status](https://img.shields.io/badge/status-alpha-orange) ![stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Firebase-blue) ![tests](https://img.shields.io/badge/tests-47%20passing-green)

---

## 무엇을 해결하나요?

AI에게 UI 레이아웃을 설명할 때:
- 자연어로 설명 → 정확도·재현성이 낮음
- 스크린샷 전달 → 토큰·비용 부담
- **ModalMaker** → 드래그 앤 드롭으로 구조를 만들고 AI 친화적 텍스트로 변환

```
- [Container: Confirm Modal]
  - [Text: "저장하시겠습니까?"]
  - [Container: Row]
    - [Button: "취소"]
    - [Button: "확인"]
```

---

## 주요 기능

### 캔버스 편집
- 드래그 앤 드롭으로 컴포넌트 배치 및 재정렬 (dnd-kit)
- 지원 컴포넌트: Container / Foldable / Text / Button / Input / Checkbox / Progress / Split / Icon / Module-ref
- Text 정렬(←/가운데/→), 고정 크기(Fixed Size), Flex 자식 정렬, 배경 농도 제어
- Input 레이아웃 옵션: 2줄(stacked) / 1줄(inline) + 라벨 너비 비율
- 단축키: `Ctrl/Cmd + D` 복제, `Delete` 삭제, `Ctrl/Cmd + Z`/`Shift+Z` undo/redo
- **멀티 선택**: `Ctrl/Cmd + 클릭`으로 같은 종류 노드 동시 선택 → Inspector에서 일괄 속성 변경
- **뷰포트 프리셋**: Free / Desktop / Laptop / Tablet / Mobile / Custom(W+H) / Custom W only (너비 고정·높이 자유)
- 맞춤 버튼: 100% 줌 + 캔버스 중앙 정렬

### 멀티 페이지 & Node View
- 한 문서에 여러 페이지를 담는 **Node View** (ReactFlow 기반 2D 캔버스)
- 페이지 카드 더블클릭 → 해당 페이지 편집 전환
- `Ctrl/Cmd + D` 또는 `Alt + drag`로 페이지 복제
- 페이지 간 수동 연결(엣지), 카드 드래그로 레이아웃 조정
- 노드 뷰에서는 좌/우 사이드바 자동 숨김 → 넓은 편집 공간 확보

### 모듈 시스템
- 컨테이너를 **공용 모듈**로 등록 → 모든 페이지에서 `module-ref`로 재사용
- 원본 한 곳만 수정하면 전체 인스턴스에 즉시 반영
- 모듈 편집 모드: 완료 버튼으로 원본 페이지로 복귀
- 모듈 해제(unlink) 지원: 링크를 끊고 편집 가능한 일반 트리로 전환
- 순환 참조 자동 감지

### 인터렉션 & 프리뷰
- 노드에 이벤트(click / hover / press / disabled)와 액션(페이지 이동, 닫기, 스타일 프리셋) 연결
- **프리뷰 모드**: 실제 앱처럼 동작하는 풀스크린 오버레이
  - 히스토리 스택, 브레드크럼 네비게이션 (클릭으로 과거 페이지 바로 이동)
  - hover / press 시각적 피드백 (brightness 필터)
  - Foldable 인터렉티브 토글
- **탭 버튼 그룹**: `tabGroupId`로 버튼을 묶으면 클릭 시 토글 동작, 활성/비활성 스타일 자동 적용
- 5가지 프리뷰 테마: Dark / Light / Warm / Ocean / OS 시스템

### Inspector
- 선택 노드의 모든 속성을 우측 패널에서 실시간 편집
- 컬러 피커 (네이티브 color input + 프리셋 팔레트 + 최근 사용 색상)
- 크기/패딩(균일 or 4방향)/갭/정렬 세밀 제어
- Interaction 섹션 (이벤트 → 액션 연결 UI)
- 모듈 편집 진입·해제 버튼 (module-ref 선택 시)

### 내보내기 & 프리셋
- **Markdown**: AI 프롬프트에 바로 붙여넣기 가능한 구조화 텍스트
- **JSON**: 전체 `NodeDocument` v2 스키마 직렬화
- **Mermaid**: 페이지 연결 흐름도
- 10개+ 내장 프리셋 (Confirm / Alert / Auth / Form / Flow / Layout 카테고리)
- 사용자 프리셋 저장 및 새 페이지 생성 시 재사용

### 저장 & 인증
- IndexedDB 로컬 저장 (오프라인 우선, 자동 legacy 마이그레이션 포함)
- Firebase 연동 시 구글 계정으로 클라우드 저장 / 불러오기
- 모든 IDB 호출은 방어막으로 감싸져 실패 시 앱 크래시 없이 로거로 기록

---

## 아키텍처

### 노드 타입 레지스트리 (Phase 1 리팩토링)

각 노드 종류(`text`·`button`·`container` 등)는 `src/nodes/<kind>/` 아래에 자립 모듈로 존재합니다. 신규 노드 추가 비용은 **한 디렉토리 생성**으로 축소됐습니다.

```
src/nodes/<kind>/
├── <Kind>Leaf.tsx          # 캔버스·프리뷰 공용 리프 렌더러
├── <Kind>Inspector.tsx     # Inspector 섹션
└── index.ts                # register<NodeDescriptor>({ kind, label, icon, defaultProps,
                            #                            Leaf, Inspector, exportMarkdown,
                            #                            exportMermaid, ... })
```

`src/nodes/index.ts`가 각 kind 모듈을 side-effect import하여 레지스트리를 초기화합니다. NodeRenderer/PreviewRenderer/Inspector/Palette/Export는 모두 `getDescriptor(kind)` 조회 경로로 일원화됩니다.

### 렌더러 통합 (Phase 2)

```
NodeHost (dispatcher)
├── NodeHostCanvas   — 편집 모드: 선택·DnD·ResizeHandles (CanvasAdorners)
└── NodeHostPreview  — 프리뷰 모드: hover·press·disabled 상태 (PreviewAdorners)
```

공용 레이아웃 처리(container/foldable/module-ref 재귀)는 호스트가 담당하고, 리프 콘텐츠는 레지스트리 Leaf가 렌더합니다.

### Store 슬라이스 (Phase 3)

```
src/stores/layout/
├── types.ts              LayoutState 단일 소스
├── commit.ts             commit() / commitCoalesce() / snapshot() + HISTORY_LIMIT
├── graph.ts              findLayoutNode/Parent·isAncestor·pruneModuleRefs
├── cloneTree.ts          cloneWithNewIds (interactions 새 id 포함)
├── documentSlice.ts      합성자 (29 LOC)
├── nodeActions.ts        노드 트리·인터렉션·뷰포트·제목
├── pageActions.ts        페이지 CRUD
├── moduleActions.ts      모듈 등록/해제/업데이트/삭제
├── edgeActions.ts        페이지 간 연결
├── selectionSlice.ts     단일/멀티 선택
├── historySlice.ts       undo/redo (coalesce 리셋 포함)
└── uiSlice.ts            mode / editingModuleId
```

`commitCoalesce`는 연속 타이핑이 undo 스택에 1자마다 쌓이는 문제를 해결 (updateProps·updateTitle 적용).

### 성능 최적화 (Phase 4/7)
- `NodeRenderer` / `PreviewRenderer`에 `React.memo` + custom comparator (`node` 참조 + 위치/방향/ctx)
- Immer의 참조 유지 정책과 결합 → 변경된 서브트리만 재렌더
- `useShallow` 선택자 63회 사용으로 store 구독 최소화
- 번들 코드 스플릿: PreviewOverlay / NodeView / PresetGallery / ExportDialog / SaveAsDialog / presetRegistry는 lazy chunk
- 초기 번들 **~1,615 KB (gzip 362 KB)**

### 관측성 (Phase 10)
- `src/lib/logger.ts` 중앙 로거 — 개발은 debug 이상, 프로덕션은 warn 이상 통과
- 모든 영속성 에러를 `logger.error`로 기록하며 fallback 반환 → 앱 크래시 방지

---

## 기술 스택

| 레이어 | 라이브러리 |
|--------|-----------|
| UI 프레임워크 | React 19, TypeScript 5, Vite 6 |
| 스타일링 | Tailwind CSS 4 |
| 상태 관리 | Zustand 5 + Immer (슬라이스 합성) |
| 드래그 앤 드롭 | @dnd-kit/core, @dnd-kit/sortable |
| Node View | @xyflow/react 12 |
| 아이콘 | lucide-react |
| 로컬 저장 | idb-keyval (IndexedDB) + raw IDB 마이그레이션 |
| 클라우드 | Firebase Auth + Firestore |
| 데스크톱 | Tauri 2 (선택사항) |
| 테스트 | Vitest 2 (47 tests) |

---

## 시작하기

```bash
# 의존성 설치
npm install

# 웹 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 타입 체크
npm run typecheck

# 테스트 (1회 실행)
npm test

# 테스트 watch 모드
npm run test:watch

# 데스크톱 개발 (Tauri 선택사항)
npm run tauri dev
```

---

## 프로젝트 구조

```
src/
├── app/                          # App.tsx, 전역 레이아웃
├── nodes/                        # ★ 노드 타입 레지스트리 (Phase 1)
│   ├── registry.ts               # register/getDescriptor/allDescriptors
│   ├── types.ts                  # NodeDescriptor 인터페이스
│   ├── index.ts                  # 각 kind 모듈 side-effect import
│   ├── NodeHost.tsx              # 캔버스·프리뷰 모드 디스패처
│   ├── NodeHostCanvas.tsx        # 편집용 호스트 (DnD·선택·리사이즈)
│   ├── NodeHostPreview.tsx       # 프리뷰용 호스트 (hover·press·state style)
│   ├── nodeHostTypes.ts          # 렌더 콜백 타입
│   ├── renderers/                # CanvasAdorners / PreviewAdorners
│   ├── layout/                   # containerLayoutStyle 공용
│   ├── text/ button/ input/ checkbox/ progress/ split/ icon/
│   │   container/ foldable/ module-ref/   # 각 kind 자립 모듈
├── features/
│   ├── canvas/                   # Canvas, CanvasViewport(+consts), NodeRenderer 래퍼, DropZone, ResizeHandles
│   ├── editor/                   # toolbar, palette, inspector(+inspector-ui), layer-tree
│   ├── modules/                  # ModulePanel
│   ├── node-view/                # NodeView(ReactFlow), PageCardNode, AddPageDialog
│   ├── preview/                  # PreviewOverlay, PreviewRenderer 래퍼, ViewportFrame, ThemePicker,
│   │                             # previewRuntime, previewSessionStore, ThemeContext, themes/themeStore
│   ├── interactions/             # stylePresets
│   ├── presets/                  # BUILTIN_PRESETS + PresetGallery (10+ 프리셋)
│   ├── persistence/              # local(IDB + 자동 마이그레이션) / remote(Firestore)
│   ├── export/                   # toMarkdown / toJson / toMermaid
│   └── auth/                     # AuthButton (Firebase)
├── stores/
│   ├── layoutStore.ts            # 슬라이스 합성 + 공용 헬퍼 export (222 LOC)
│   └── layout/                   # ★ 슬라이스 (Phase 3)
├── types/
│   └── layout.ts                 # NodeDocument v2, LayoutNode, 각 Props 인터페이스
└── lib/                          # migrate, layoutSizing, id, cn, firebase, logger, history

tests/                            # Vitest 단위 테스트
├── lib/                          # id / layoutSizing / migrate
└── stores/                       # graph / cloneTree / commit

docs/
├── REFACTOR_PLAN.md              # 리팩토링 완료 요약 + 잔여 과제
└── PHASE3_STORE_SPLIT_PLAN.md    # Store 분할 설계
```

---

## 새 노드 종류 추가하기

1. `src/nodes/<kind>/` 디렉토리 생성
2. `<Kind>Leaf.tsx` — `LeafRenderProps` 기반 렌더러 (필요 시)
3. `<Kind>Inspector.tsx` — `InspectorSectionProps<Props>` 기반 섹션
4. `index.ts` — `register<Props>({ kind, label, icon, defaultProps, Leaf, Inspector, exportMarkdown, exportMermaid })`
5. `src/nodes/index.ts`에 `import "./<kind>";` 한 줄 추가
6. `src/types/layout.ts`의 `NodeKind` union과 `NodeProps` union에 타입 추가

이게 전부입니다. NodeRenderer·PreviewRenderer·Inspector·Palette·Export는 레지스트리를 통해 자동으로 새 kind를 인식합니다.

---

## 데이터 모델

최상위 타입은 `NodeDocument` (schema v2):

```
NodeDocument
├── pages: Page[]           각 페이지 = root LayoutNode 트리 + 뷰포트 + 좌표 + isPopup
├── modules: Module[]       공용 컴포넌트 (module-ref로 참조)
├── edges: PageEdge[]       페이지 간 연결
└── currentPageId: string
```

각 `LayoutNode`는 `kind`, `props`, `sizing`, `interactions`, `children`을 가집니다.

v1 `LayoutDocument`는 로드 시점에 자동으로 v2로 마이그레이션됩니다.

---

## Firebase 설정 (선택)

Firebase 없이도 IndexedDB 로컬 저장만으로 완전히 동작합니다. 클라우드 동기화가 필요하면:

```bash
# 1. Firebase 콘솔에서 프로젝트 생성 후 웹 앱 등록
# 2. 발급된 설정값을 src/lib/firebase.ts에 입력
# 3. Firestore + Hosting 초기화
firebase init firestore hosting

# 4. 배포
npm run build && firebase deploy
```

필요한 GitHub Secrets (CI/CD 자동 배포용):
- `FIREBASE_SERVICE_ACCOUNT` — Firebase Hosting 배포용
- `VITE_FIREBASE_*` — Firebase 웹 설정 6종

---

## 라이선스

MIT © 2026 zzamjak-cloud
