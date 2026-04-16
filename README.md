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
- **Phase 3** ✅ MVP: 캔버스 + 기본 컴포넌트 + Export + 프리셋 갤러리 + 로컬 저장
- **Phase 4** ✅ Tauri 데스크톱 통합 (커맨드 + 멀티 플랫폼 아이콘)
- **Phase 5** ✅ Firebase Auth / Firestore 동기화 어댑터 (프로젝트 연결은 수동)
- **Phase 6** ✅ GitHub Actions CI/CD

---

## 🔥 Firebase 설정 (선택)

Firebase 없이도 IndexedDB 로컬 저장만으로 완전히 동작합니다. 클라우드 동기화가 필요하면:

```bash
# 1. 로그인 + 프로젝트 생성
firebase login
firebase projects:create modalmaker-app

# 2. 웹 앱 등록 (콘솔 > 프로젝트 설정 > 앱 추가)
# 발급된 설정값을 .env.local에 복사
cp .env.example .env.local
# VITE_FIREBASE_* 값 편집

# 3. Firestore + Hosting 초기화
firebase init firestore hosting
# firestore.rules / firebase.json은 이미 커밋되어 있으므로 기존 파일 유지 선택

# 4. 로컬 테스트
firebase emulators:start --only firestore,auth

# 5. 배포 (수동)
npm run build
firebase deploy
```

---

## 🚀 GitHub Actions

- `main` 푸시 → `.github/workflows/web-deploy.yml`이 Firebase Hosting에 자동 배포
- `v*` 태그 푸시 → `.github/workflows/desktop-build.yml`이 macOS(arm/x86)/Windows/Linux 바이너리를 빌드하고 Release 드래프트에 첨부

필요한 GitHub Secrets:
- `FIREBASE_SERVICE_ACCOUNT` — Firebase Hosting 배포용
- `VITE_FIREBASE_*` — Firebase 웹 설정 6종 (빌드 시 주입)

---

## 📄 라이선스

MIT © 2026 zzamjak-cloud
