// 내장 프리셋 레지스트리
// JSON 파일 대신 TS로 구성해 타입 안전성 + 번들 최적화를 확보.
// 각 프리셋은 LayoutDocument 포맷을 그대로 따르며, 로드 시 cloneWithNewIds로 ID만 재발급.
import type { LayoutDocument, LayoutNode, NodeKind, NodeProps } from "@/types/layout";
import { newId } from "@/lib/id";

export type PresetCategory = "Confirmation" | "Alert" | "Info" | "Auth" | "Form" | "Flow" | "Utility";

export interface PresetEntry {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  // 썸네일 대신 emoji 심볼 (Phase 7에서 이미지 자동 생성 예정)
  icon: string;
  document: LayoutDocument;
}

// 간결한 노드 빌더
function n(kind: NodeKind, props: NodeProps, children?: LayoutNode[]): LayoutNode {
  const isContainer = kind === "container" || kind === "foldable";
  return {
    id: newId(),
    kind,
    props,
    children: isContainer ? (children ?? []) : undefined,
  };
}

function doc(title: string, root: LayoutNode): LayoutDocument {
  const now = Date.now();
  return { id: newId("doc"), title, root, createdAt: now, updatedAt: now };
}

// --- 프리셋 정의 ---

export const BUILTIN_PRESETS: PresetEntry[] = [
  {
    id: "confirm-yes-no",
    name: "Yes/No 확인 모달",
    description: "저장/삭제 등 일반 확인 동작용",
    category: "Confirmation",
    icon: "✅",
    document: doc(
      "Confirm Modal",
      n("container", { direction: "column", gap: 16, padding: 20, label: "Confirm Modal" }, [
        n("text", { text: "저장하시겠습니까?", size: "lg", weight: "bold" }),
        n("text", { text: "변경 사항을 적용하면 되돌릴 수 없습니다.", size: "sm", weight: "normal" }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "취소", variant: "ghost", size: "md" }),
          n("button", { label: "확인", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "alert-error",
    name: "경고/에러 다이얼로그",
    description: "에러 발생을 사용자에게 알림",
    category: "Alert",
    icon: "⚠️",
    document: doc(
      "Alert Dialog",
      n("container", { direction: "column", gap: 14, padding: 20, label: "Alert Dialog" }, [
        n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Header" }, [
          n("text", { text: "⚠", size: "2xl", weight: "bold", color: "#f87171" }),
          n("text", { text: "문제가 발생했습니다", size: "lg", weight: "bold" }),
        ]),
        n("text", {
          text: "서버와의 연결이 실패했습니다. 잠시 후 다시 시도해주세요.",
          size: "sm",
          weight: "normal",
        }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "확인", variant: "destructive", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "info-success",
    name: "성공/안내 다이얼로그",
    description: "작업 완료 알림",
    category: "Info",
    icon: "✨",
    document: doc(
      "Info Dialog",
      n("container", { direction: "column", gap: 14, padding: 20, label: "Info Dialog" }, [
        n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Header" }, [
          n("text", { text: "✓", size: "2xl", weight: "bold", color: "#34d399" }),
          n("text", { text: "저장되었습니다", size: "lg", weight: "bold" }),
        ]),
        n("text", { text: "변경 사항이 성공적으로 반영되었습니다.", size: "sm", weight: "normal" }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "확인", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "auth-login",
    name: "로그인 모달",
    description: "이메일/비밀번호 기반 로그인",
    category: "Auth",
    icon: "🔐",
    document: doc(
      "Login Modal",
      n("container", { direction: "column", gap: 14, padding: 24, label: "Login Modal" }, [
        n("text", { text: "로그인", size: "xl", weight: "bold" }),
        n("input", { label: "이메일", placeholder: "you@example.com", type: "email" }),
        n("input", { label: "비밀번호", placeholder: "••••••••", type: "password" }),
        n("checkbox", { label: "로그인 상태 유지", checked: false }),
        n("container", { direction: "column", gap: 6, padding: 0, label: "Actions" }, [
          n("button", { label: "로그인", variant: "primary", size: "lg" }),
          n("button", { label: "회원가입", variant: "ghost", size: "lg" }),
        ]),
      ]),
    ),
  },

  {
    id: "auth-signup",
    name: "회원가입 모달",
    description: "약관 동의 포함 회원가입",
    category: "Auth",
    icon: "📝",
    document: doc(
      "Signup Modal",
      n("container", { direction: "column", gap: 14, padding: 24, label: "Signup Modal" }, [
        n("text", { text: "회원가입", size: "xl", weight: "bold" }),
        n("input", { label: "이메일", placeholder: "you@example.com", type: "email" }),
        n("input", { label: "비밀번호", placeholder: "8자 이상", type: "password" }),
        n("input", { label: "비밀번호 확인", placeholder: "다시 입력", type: "password" }),
        n("checkbox", { label: "이용 약관에 동의합니다", checked: false }),
        n("checkbox", { label: "마케팅 정보 수신에 동의합니다 (선택)", checked: false }),
        n("button", { label: "가입하기", variant: "primary", size: "lg" }),
      ]),
    ),
  },

  {
    id: "form-contact",
    name: "연락처/문의 폼",
    description: "일반 문의 입력 폼",
    category: "Form",
    icon: "✉️",
    document: doc(
      "Contact Form",
      n("container", { direction: "column", gap: 14, padding: 24, label: "Contact Form" }, [
        n("text", { text: "문의하기", size: "xl", weight: "bold" }),
        n("input", { label: "이름", placeholder: "홍길동", type: "text" }),
        n("input", { label: "이메일", placeholder: "you@example.com", type: "email" }),
        n("input", { label: "문의 내용", placeholder: "자세한 내용을 입력해주세요", type: "text" }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "취소", variant: "ghost", size: "md" }),
          n("button", { label: "전송", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "form-preferences",
    name: "설정(Preferences) 모달",
    description: "다중 옵션 토글 설정",
    category: "Form",
    icon: "⚙️",
    document: doc(
      "Preferences",
      n("container", { direction: "column", gap: 12, padding: 24, label: "Preferences" }, [
        n("text", { text: "설정", size: "xl", weight: "bold" }),
        n("foldable", { title: "알림 설정", open: true }, [
          n("checkbox", { label: "이메일 알림 받기", checked: true }),
          n("checkbox", { label: "데스크톱 푸시 알림", checked: false }),
          n("checkbox", { label: "주간 요약 메일", checked: true }),
        ]),
        n("foldable", { title: "개인정보 보호", open: false }, [
          n("checkbox", { label: "활동 내역 기록", checked: true }),
          n("checkbox", { label: "맞춤 추천 사용", checked: true }),
        ]),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "취소", variant: "ghost", size: "md" }),
          n("button", { label: "저장", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "flow-wizard",
    name: "단계 마법사(Wizard)",
    description: "다단계 온보딩/설정 플로우",
    category: "Flow",
    icon: "🧭",
    document: doc(
      "Wizard",
      n("container", { direction: "column", gap: 16, padding: 24, label: "Wizard" }, [
        n("text", { text: "2/4 단계: 프로젝트 정보", size: "sm", weight: "medium" }),
        n("progress", { value: 50, max: 100, label: "진행률" }),
        n("text", { text: "프로젝트 이름을 알려주세요", size: "lg", weight: "bold" }),
        n("input", { label: "프로젝트 이름", placeholder: "예: Modal Maker 리뉴얼", type: "text" }),
        n("input", { label: "설명 (선택)", placeholder: "간단한 한 줄 설명", type: "text" }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "between", label: "Nav" }, [
          n("button", { label: "이전", variant: "ghost", size: "md" }),
          n("button", { label: "다음", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "utility-upload",
    name: "파일 업로드 모달",
    description: "드롭존 + 진행률 표시",
    category: "Utility",
    icon: "📤",
    document: doc(
      "File Upload",
      n("container", { direction: "column", gap: 14, padding: 24, label: "File Upload" }, [
        n("text", { text: "파일 업로드", size: "xl", weight: "bold" }),
        n("container", { direction: "column", gap: 6, padding: 28, align: "center", label: "Dropzone" }, [
          n("text", { text: "여기에 파일을 드래그하거나 클릭하여 선택", size: "sm", weight: "normal" }),
          n("button", { label: "파일 선택", variant: "secondary", size: "sm" }),
        ]),
        n("progress", { value: 0, max: 100, label: "업로드 중" }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "취소", variant: "ghost", size: "md" }),
          n("button", { label: "업로드", variant: "primary", size: "md" }),
        ]),
      ]),
    ),
  },

  {
    id: "utility-destructive",
    name: "삭제 확인 (Destructive)",
    description: "되돌릴 수 없는 작업의 최종 확인",
    category: "Utility",
    icon: "🗑",
    document: doc(
      "Delete Confirm",
      n("container", { direction: "column", gap: 14, padding: 20, label: "Delete Confirm" }, [
        n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Header" }, [
          n("text", { text: "⚠", size: "2xl", weight: "bold", color: "#f87171" }),
          n("text", { text: "정말 삭제하시겠습니까?", size: "lg", weight: "bold" }),
        ]),
        n("text", {
          text: "이 작업은 되돌릴 수 없습니다. 항목의 모든 데이터가 영구적으로 삭제됩니다.",
          size: "sm",
          weight: "normal",
        }),
        n("checkbox", { label: "삭제 사실을 이해했습니다", checked: false }),
        n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
          n("button", { label: "취소", variant: "ghost", size: "md" }),
          n("button", { label: "영구 삭제", variant: "destructive", size: "md" }),
        ]),
      ]),
    ),
  },
];

export const PRESET_CATEGORIES: PresetCategory[] = [
  "Confirmation",
  "Alert",
  "Info",
  "Auth",
  "Form",
  "Flow",
  "Utility",
];
