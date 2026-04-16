# ModalMaker

> 비주얼 캔버스에서 UI 모달/레이아웃을 구성하고, **AI가 바로 이해할 수 있는 Markdown / JSON**으로 내보내는 도구.

![status](https://img.shields.io/badge/status-alpha-orange) ![stack](https://img.shields.io/badge/stack-Tauri%20%2B%20React%20%2B%20Rust%20%2B%20Firebase-blue)

---

## 🎯 무엇을 해결하나요?

AI에게 UI 레이아웃을 설명할 때:
- 자연어로 설명 → 정확도·재현성이 낮음
- 스크린샷 전달 → 토큰·비용 부담
- **ModalMaker** → 드래그앤드롭으로 구조를 만들고 AI 친화적 텍스트로 변환

```
- [Container: Confirm Modal]
  - [Text: "저장하시겠습니까?"]
  - [Container: Row]
    - [Button: "취소"]
    - [Button: "확인"]
```

---

## ✨ 주요 기능

- 🧩 **재귀 캔버스**: 컨테이너/텍스트/버튼/체크박스/인풋/프로그레스/폴딩을 무한 중첩
- 🎨 **프리셋 갤러리**: 확인/알림/로그인/회원가입/폼/마법사 등 10종 내장 모달 템플릿
- 🖱️ **dnd-kit 기반 DnD**: 접근성 보장, 중첩 드롭존 자유 배치
- 📤 **Export**: Markdown / JSON / Mermaid + AI 프롬프트 템플릿 프리픽스 옵션
- 💾 **저장**: 로컬(IndexedDB) → 클라우드(Firestore) 단계 확장
- 🖥️ **하이브리드 배포**: Tauri 데스크톱(.app/.exe) + Firebase Hosting 웹

---

## 🏗️ 기술 스택

| 레이어 | 선택 |
|---|---|
| 데스크톱 쉘 | Tauri 2.x |
| 프레임워크 | React 19 + TypeScript 5 + Vite 6 |
| 상태 관리 | Zustand + immer |
| DnD | dnd-kit |
| 스타일링 | Tailwind CSS 4 + shadcn/ui |
| 인증/DB | Firebase Auth + Firestore |

---

## 🚀 실행

```bash
# 의존성 설치
npm install

# 웹 개발 서버
npm run dev

# 데스크톱 개발 (Tauri)
npm run tauri dev

# 프로덕션 빌드 (웹)
npm run build

# 데스크톱 빌드
npm run tauri build
```

---

## 🗺️ 로드맵

- **Phase 1–2** ✅ 저장소 부트스트랩 / 스택 세팅
- **Phase 3** ⏳ MVP: 캔버스 + 기본 컴포넌트 + Export + 프리셋 갤러리 + 로컬 저장
- **Phase 4** ⏳ Tauri 데스크톱 통합
- **Phase 5** ⏳ Firebase Auth / Firestore 동기화 / 공유 링크
- **Phase 6** ⏳ GitHub Actions CI/CD

상세 계획은 [`/Users/woody/.claude/plans/`]에 보관된 기획서 참고.

---

## 📄 라이선스

MIT © 2026 zzamjak-cloud
