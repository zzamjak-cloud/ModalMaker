# ModalMaker

> 비주얼 캔버스에서 멀티 페이지 앱 구조를 설계하고, **AI가 바로 이해할 수 있는 Markdown / JSON / Mermaid**로 내보내는 도구.

![status](https://img.shields.io/badge/status-alpha-orange) ![stack](https://img.shields.io/badge/stack-React%20%2B%20TypeScript%20%2B%20Firebase-blue)

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
- 지원 컴포넌트: Container / Text / Button / Input / Checkbox / Progress / Split / Icon / Foldable
- 인라인 더블클릭 편집 (텍스트, 버튼 레이블)
- 고정 크기(Fixed Size), Flex 자식 정렬, 배경 농도 제어
- **멀티 선택**: `Ctrl/Cmd + 클릭`으로 같은 종류 노드 동시 선택 → Inspector에서 일괄 속성 변경

### 멀티 페이지 & Node View
- 한 문서에 여러 페이지를 담는 **Node View** (ReactFlow 기반 2D 캔버스)
- 페이지 카드 더블클릭 → 해당 페이지 편집 전환
- 페이지 간 수동 연결(엣지), 카드 드래그로 레이아웃 조정

### 모듈 시스템
- 컨테이너를 **공용 모듈**로 등록 → 모든 페이지에서 `module-ref`로 재사용
- 원본 한 곳만 수정하면 전체 인스턴스에 즉시 반영
- 순환 참조 자동 감지

### 인터렉션 & 프리뷰
- 노드에 이벤트(click / hover / press / disabled)와 액션(페이지 이동, 닫기, 스타일 프리셋) 연결
- **프리뷰 모드**: 실제 앱처럼 동작하는 풀스크린 오버레이
  - 히스토리 스택, 브레드크럼 네비게이션 (클릭으로 과거 페이지 바로 이동)
  - hover / press 시각적 피드백 (brightness 필터)
- **탭 버튼 그룹**: `tabGroupId`로 버튼을 묶으면 클릭 시 토글 동작, 활성/비활성 스타일 자동 적용
- 5가지 프리뷰 테마: Dark / Light / Warm / Ocean / OS 시스템

### Inspector
- 선택 노드의 모든 속성을 우측 패널에서 실시간 편집
- 컬러 피커 (네이티브 color input + 프리셋 팔레트 + 최근 사용 색상)
- 크기/패딩/갭/정렬 세밀 제어
- Interaction 섹션 (이벤트 → 액션 연결 UI)

### 내보내기
- **Markdown**: AI 프롬프트에 바로 붙여넣기 가능한 구조화 텍스트
- **JSON**: 전체 `NodeDocument` v2 스키마 직렬화
- **Mermaid**: 페이지 연결 흐름도

### 저장 & 인증
- IndexedDB 로컬 저장 (오프라인 우선)
- Firebase 연동 시 구글 계정으로 클라우드 저장 / 불러오기

---

## 기술 스택

| 레이어 | 라이브러리 |
|--------|-----------|
| UI 프레임워크 | React 19, TypeScript 5, Vite 6 |
| 스타일링 | Tailwind CSS 4 |
| 상태 관리 | Zustand 5 + Immer |
| 드래그 앤 드롭 | @dnd-kit/core, @dnd-kit/sortable |
| Node View | @xyflow/react 12 |
| 아이콘 | lucide-react |
| 로컬 저장 | idb-keyval (IndexedDB) |
| 클라우드 | Firebase Auth + Firestore |
| 데스크톱 | Tauri 2 (선택사항) |
| 테스트 | Vitest |

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

# 테스트
npm test

# 데스크톱 개발 (Tauri 선택사항)
npm run tauri dev
```

---

## 프로젝트 구조

```
src/
├── app/                        # 앱 루트, 레이아웃
├── features/
│   ├── canvas/                 # 캔버스 렌더러, DnD, 리사이즈 핸들
│   ├── inspector/              # 속성 편집 패널 (ColorPicker, SizeSection 등)
│   ├── interactions/           # 인터렉션 스타일 프리셋
│   ├── layer-tree/             # 레이어 트리 패널
│   ├── modules/                # 공용 모듈 패널
│   ├── node-view/              # 멀티 페이지 Node View (ReactFlow)
│   ├── palette/                # 컴포넌트 팔레트
│   ├── persistence/            # 로컬(IndexedDB) / 원격(Firestore) 저장
│   ├── presets/                # 프리셋 갤러리 (10종+ 내장 템플릿)
│   ├── preview/                # 프리뷰 오버레이, 테마, 런타임
│   ├── toolbar/                # 툴바, 뷰포트 선택기, 내보내기 다이얼로그
│   └── export/                 # Markdown / JSON / Mermaid 내보내기
├── stores/
│   └── layoutStore.ts          # 전역 상태 (Zustand + Immer, undo/redo 포함)
├── types/
│   └── layout.ts               # 핵심 데이터 타입 (NodeDocument v2)
└── lib/                        # 유틸리티 (migrate, layoutSizing, id 등)
```

---

## 데이터 모델

최상위 타입은 `NodeDocument` (schema v2):

```
NodeDocument
├── pages: Page[]          각 페이지 = root LayoutNode 트리
├── modules: Module[]      공용 컴포넌트 (module-ref로 참조)
├── edges: PageEdge[]      페이지 간 연결
└── currentPageId: string
```

각 `LayoutNode`는 `kind` (container / text / button / input / checkbox / progress / split / icon / foldable / module-ref), `props`, `sizing`, `interactions`, `children`을 가집니다.

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
