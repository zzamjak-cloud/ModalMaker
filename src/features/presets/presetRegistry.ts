// 내장 프리셋 레지스트리
// JSON 파일 대신 TS로 구성해 타입 안전성 + 번들 최적화를 확보.
// 각 프리셋은 LayoutDocument 포맷을 그대로 따르며, 로드 시 cloneWithNewIds로 ID만 재발급.
import type { LayoutDocument, LayoutNode, NodeKind, NodeProps, SizingProps } from "@/types/layout";
import { newId } from "@/lib/id";

export type PresetCategory = "Confirmation" | "Alert" | "Info" | "Auth" | "Form" | "Flow" | "Utility" | "Layout";

export interface PresetEntry {
  id: string;
  name: string;
  description: string;
  category: PresetCategory;
  // 썸네일 대신 emoji 심볼 (Phase 7에서 이미지 자동 생성 예정)
  icon: string;
  document: LayoutDocument;
}

// 간결한 노드 빌더 (선택적 sizing 인자 지원)
function n(kind: NodeKind, props: NodeProps, children?: LayoutNode[], sizing?: SizingProps): LayoutNode {
  const isContainer = kind === "container" || kind === "foldable";
  const node: LayoutNode = {
    id: newId(),
    kind,
    props,
    children: isContainer ? (children ?? []) : undefined,
  };
  if (sizing) node.sizing = sizing;
  return node;
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

  // --- Layout 카테고리: 웹 화면 구조 프리셋 ---

  {
    id: "layout-dashboard",
    name: "Dashboard",
    description: "헤더 + 사이드바 + 본문 스탯",
    category: "Layout",
    icon: "🧭",
    document: doc(
      "Dashboard",
      n("container", { direction: "column", gap: 0, padding: 0, label: "Shell" }, [
        n("container", {
          direction: "row", gap: 8, padding: 12, justify: "between", align: "center",
          label: "Header", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Brand" }, [
            n("icon", { name: "LayoutDashboard", size: 18, color: "#38bdf8" }),
            n("text", { text: "Dashboard", size: "lg", weight: "bold" }),
          ]),
          n("container", { direction: "row", gap: 4, padding: 0, label: "Header Actions" }, [
            n("button", { label: "", iconName: "Search", variant: "ghost", size: "sm" }),
            n("button", { label: "", iconName: "Bell", variant: "ghost", size: "sm" }),
            n("button", { label: "", iconName: "User", variant: "ghost", size: "sm" }),
          ]),
        ]),
        n("container", { direction: "row", gap: 0, padding: 0, label: "Body" }, [
          n("container", {
            direction: "column", gap: 4, padding: 12,
            label: "Sidebar", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "Navigation", size: "sm", weight: "bold", color: "#a1a1aa" }),
            n("button", { label: "Overview",  iconName: "LayoutDashboard", variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Analytics", iconName: "BarChart3",       variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Orders",    iconName: "ShoppingBag",     variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Customers", iconName: "Users",           variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Settings",  iconName: "Settings",        variant: "ghost", size: "sm", iconPosition: "left" }),
          ], { fixedSize: true, width: 220, height: 680 }),
          n("container", { direction: "column", gap: 16, padding: 20, label: "Main" }, [
            n("text", { text: "Welcome back!", size: "xl", weight: "bold" }),
            n("container", { direction: "row", gap: 12, padding: 0, label: "Stats" }, [
              n("container", {
                direction: "column", gap: 4, padding: 16, label: "Stat A",
                borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
              }, [
                n("text", { text: "월간 매출", size: "sm", weight: "medium", color: "#a1a1aa" }),
                n("text", { text: "₩12.4M", size: "2xl", weight: "bold" }),
              ]),
              n("container", {
                direction: "column", gap: 4, padding: 16, label: "Stat B",
                borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
              }, [
                n("text", { text: "신규 가입", size: "sm", weight: "medium", color: "#a1a1aa" }),
                n("text", { text: "1,284", size: "2xl", weight: "bold" }),
              ]),
              n("container", {
                direction: "column", gap: 4, padding: 16, label: "Stat C",
                borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
              }, [
                n("text", { text: "주문", size: "sm", weight: "medium", color: "#a1a1aa" }),
                n("text", { text: "562", size: "2xl", weight: "bold" }),
              ]),
            ]),
            n("foldable", { title: "Recent Activity", open: true }, [
              n("text", { text: "✓ 주문 #1024가 배송 완료되었습니다", size: "sm", weight: "normal" }),
              n("text", { text: "✓ 신규 사용자 홍길동님이 가입했습니다", size: "sm", weight: "normal" }),
              n("text", { text: "! 재고 임박: Product-A (5개 남음)", size: "sm", weight: "normal", color: "#f59e0b" }),
            ]),
          ]),
        ]),
      ]),
    ),
  },

  {
    id: "layout-admin-console",
    name: "Admin Console",
    description: "3컬럼 관리자 콘솔",
    category: "Layout",
    icon: "🛠",
    document: doc(
      "Admin Console",
      n("container", { direction: "column", gap: 0, padding: 0, label: "Shell" }, [
        n("container", {
          direction: "row", gap: 8, padding: 12, justify: "between", align: "center",
          label: "Header", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Brand" }, [
            n("icon", { name: "ShieldCheck", size: 18, color: "#22c55e" }),
            n("text", { text: "Admin Console", size: "lg", weight: "bold" }),
          ]),
          n("container", { direction: "row", gap: 4, padding: 0, label: "Header Actions" }, [
            n("button", { label: "", iconName: "HelpCircle", variant: "ghost", size: "sm" }),
            n("button", { label: "", iconName: "Bell", variant: "ghost", size: "sm" }),
            n("button", { label: "", iconName: "User", variant: "ghost", size: "sm" }),
          ]),
        ]),
        n("container", { direction: "row", gap: 0, padding: 0, label: "Body" }, [
          n("container", {
            direction: "column", gap: 4, padding: 12,
            label: "Left Nav", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "Manage", size: "sm", weight: "bold", color: "#a1a1aa" }),
            n("button", { label: "Users",       iconName: "Users",       variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Roles",       iconName: "Key",         variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Billing",     iconName: "CreditCard",  variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Audit Log",   iconName: "FileText",    variant: "ghost", size: "sm", iconPosition: "left" }),
          ], { fixedSize: true, width: 200, height: 680 }),
          n("container", { direction: "column", gap: 12, padding: 20, label: "Main" }, [
            n("text", { text: "Users", size: "xl", weight: "bold" }),
            n("input", { label: "검색", placeholder: "이름 또는 이메일로 검색", type: "text" }),
            n("container", {
              direction: "column", gap: 6, padding: 12, label: "User Row 1",
              borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
            }, [
              n("text", { text: "홍길동", size: "md", weight: "bold" }),
              n("text", { text: "hong@example.com · Admin", size: "sm", weight: "normal", color: "#a1a1aa" }),
            ]),
            n("container", {
              direction: "column", gap: 6, padding: 12, label: "User Row 2",
              borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
            }, [
              n("text", { text: "김영희", size: "md", weight: "bold" }),
              n("text", { text: "kim@example.com · Editor", size: "sm", weight: "normal", color: "#a1a1aa" }),
            ]),
          ]),
          n("container", {
            direction: "column", gap: 10, padding: 16,
            label: "Right Panel", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "Details", size: "md", weight: "bold" }),
            n("text", { text: "선택한 항목의 상세 정보가 여기에 표시됩니다.", size: "sm", weight: "normal", color: "#a1a1aa" }),
            n("input", { label: "Display Name", placeholder: "홍길동", type: "text" }),
            n("input", { label: "Role", placeholder: "Admin", type: "text" }),
            n("button", { label: "저장", variant: "primary", size: "sm" }),
          ], { fixedSize: true, width: 260, height: 680 }),
        ]),
      ]),
    ),
  },

  {
    id: "layout-app-shell",
    name: "App Shell",
    description: "헤더 + 사이드바 + 본문 + 푸터",
    category: "Layout",
    icon: "📱",
    document: doc(
      "App Shell",
      n("container", { direction: "column", gap: 0, padding: 0, label: "Shell" }, [
        n("container", {
          direction: "row", gap: 8, padding: 12, justify: "between", align: "center",
          label: "Header", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("container", { direction: "row", gap: 8, padding: 0, align: "center", label: "Brand" }, [
            n("icon", { name: "Sparkles", size: 18, color: "#a855f7" }),
            n("text", { text: "MyApp", size: "lg", weight: "bold" }),
          ]),
          n("container", { direction: "row", gap: 4, padding: 0, label: "Header Actions" }, [
            n("button", { label: "", iconName: "Search", variant: "ghost", size: "sm" }),
            n("button", { label: "", iconName: "User", variant: "ghost", size: "sm" }),
          ]),
        ]),
        n("container", { direction: "row", gap: 0, padding: 0, label: "Body" }, [
          n("container", {
            direction: "column", gap: 4, padding: 12,
            label: "Sidebar", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("button", { label: "Home",     iconName: "Home",     variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Inbox",    iconName: "Inbox",    variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Projects", iconName: "Folder",   variant: "ghost", size: "sm", iconPosition: "left" }),
            n("button", { label: "Calendar", iconName: "Calendar", variant: "ghost", size: "sm", iconPosition: "left" }),
          ], { fixedSize: true, width: 200, height: 600 }),
          n("container", { direction: "column", gap: 12, padding: 20, label: "Main" }, [
            n("text", { text: "Home", size: "xl", weight: "bold" }),
            n("text", { text: "오늘 할 일과 최근 활동이 이곳에 표시됩니다.", size: "sm", weight: "normal", color: "#a1a1aa" }),
            n("container", {
              direction: "column", gap: 6, padding: 16, label: "Card",
              borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
            }, [
              n("text", { text: "오늘의 작업", size: "md", weight: "bold" }),
              n("checkbox", { label: "디자인 리뷰 준비", checked: false }),
              n("checkbox", { label: "배포 브랜치 머지", checked: true }),
              n("checkbox", { label: "팀 미팅 (15:00)", checked: false }),
            ]),
          ]),
        ]),
        n("container", {
          direction: "row", gap: 8, padding: 12, justify: "between", align: "center",
          label: "Footer", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("text", { text: "© 2026 MyApp Inc.", size: "sm", weight: "normal", color: "#a1a1aa" }),
          n("container", { direction: "row", gap: 8, padding: 0, label: "Footer Links" }, [
            n("button", { label: "Privacy", variant: "ghost", size: "sm" }),
            n("button", { label: "Terms",   variant: "ghost", size: "sm" }),
          ]),
        ]),
      ]),
    ),
  },

  {
    id: "layout-settings",
    name: "Settings",
    description: "좌측 탭 + 우측 섹션 접힘",
    category: "Layout",
    icon: "⚙️",
    document: doc(
      "Settings",
      n("container", { direction: "row", gap: 0, padding: 0, label: "Shell" }, [
        n("container", {
          direction: "column", gap: 4, padding: 12,
          label: "Tabs", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("text", { text: "Settings", size: "md", weight: "bold" }),
          n("button", { label: "General",       iconName: "Settings",    variant: "ghost", size: "sm", iconPosition: "left" }),
          n("button", { label: "Account",       iconName: "User",        variant: "ghost", size: "sm", iconPosition: "left" }),
          n("button", { label: "Notifications", iconName: "Bell",        variant: "ghost", size: "sm", iconPosition: "left" }),
          n("button", { label: "Security",      iconName: "ShieldCheck", variant: "ghost", size: "sm", iconPosition: "left" }),
          n("button", { label: "Billing",       iconName: "CreditCard",  variant: "ghost", size: "sm", iconPosition: "left" }),
        ], { fixedSize: true, width: 200, height: 720 }),
        n("container", { direction: "column", gap: 12, padding: 20, label: "Details" }, [
          n("text", { text: "General", size: "xl", weight: "bold" }),
          n("foldable", { title: "프로필", open: true }, [
            n("input", { label: "이름", placeholder: "홍길동", type: "text" }),
            n("input", { label: "이메일", placeholder: "you@example.com", type: "email" }),
          ]),
          n("foldable", { title: "환경설정", open: true }, [
            n("checkbox", { label: "다크 모드 사용", checked: true }),
            n("checkbox", { label: "애니메이션 효과 줄이기", checked: false }),
          ]),
          n("foldable", { title: "알림", open: false }, [
            n("checkbox", { label: "이메일 알림 받기", checked: true }),
            n("checkbox", { label: "데스크톱 알림", checked: false }),
          ]),
          n("container", { direction: "row", gap: 8, padding: 0, justify: "end", label: "Actions" }, [
            n("button", { label: "취소", variant: "ghost", size: "md" }),
            n("button", { label: "저장", variant: "primary", size: "md" }),
          ]),
        ]),
      ]),
    ),
  },

  {
    id: "layout-split-view",
    name: "Split View",
    description: "좌측 리스트 + 우측 상세",
    category: "Layout",
    icon: "📑",
    document: doc(
      "Split View",
      n("container", { direction: "row", gap: 0, padding: 0, label: "Shell" }, [
        n("container", {
          direction: "column", gap: 6, padding: 12,
          label: "List", borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
        }, [
          n("input", { label: "", placeholder: "검색...", type: "text" }),
          n("container", {
            direction: "column", gap: 2, padding: 10, label: "Item 1",
            borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "홍길동", size: "md", weight: "bold" }),
            n("text", { text: "안녕하세요, 문의드립니다...", size: "sm", weight: "normal", color: "#a1a1aa" }),
          ]),
          n("container", {
            direction: "column", gap: 2, padding: 10, label: "Item 2",
            borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "김영희", size: "md", weight: "bold" }),
            n("text", { text: "프로젝트 일정 조율 요청", size: "sm", weight: "normal", color: "#a1a1aa" }),
          ]),
          n("container", {
            direction: "column", gap: 2, padding: 10, label: "Item 3",
            borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "이철수", size: "md", weight: "bold" }),
            n("text", { text: "결제 관련 문의", size: "sm", weight: "normal", color: "#a1a1aa" }),
          ]),
          n("container", {
            direction: "column", gap: 2, padding: 10, label: "Item 4",
            borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "박민지", size: "md", weight: "bold" }),
            n("text", { text: "피드백 감사합니다!", size: "sm", weight: "normal", color: "#a1a1aa" }),
          ]),
          n("container", {
            direction: "column", gap: 2, padding: 10, label: "Item 5",
            borderStyle: "solid", borderWidth: 1, borderColor: "#27272a",
          }, [
            n("text", { text: "최지훈", size: "md", weight: "bold" }),
            n("text", { text: "버그 리포트 - 로그인 실패", size: "sm", weight: "normal", color: "#a1a1aa" }),
          ]),
        ], { fixedSize: true, width: 320, height: 720 }),
        n("container", { direction: "column", gap: 12, padding: 20, label: "Detail" }, [
          n("container", { direction: "row", gap: 8, padding: 0, justify: "between", align: "center", label: "Detail Header" }, [
            n("text", { text: "홍길동", size: "xl", weight: "bold" }),
            n("container", { direction: "row", gap: 4, padding: 0, label: "Detail Actions" }, [
              n("button", { label: "", iconName: "Star",  variant: "ghost", size: "sm" }),
              n("button", { label: "", iconName: "Reply", variant: "ghost", size: "sm" }),
              n("button", { label: "", iconName: "Trash2", variant: "ghost", size: "sm" }),
            ]),
          ]),
          n("text", { text: "hong@example.com · 2026-04-18 10:12", size: "sm", weight: "normal", color: "#a1a1aa" }),
          n("text", { text: "제목: 안녕하세요, 문의드립니다", size: "md", weight: "medium" }),
          n("text", {
            text: "안녕하세요. 제품 기능에 대해 몇 가지 문의드립니다. 먼저, 다중 사용자 동시 편집 기능이 지원되는지 궁금합니다...",
            size: "sm", weight: "normal",
          }),
          n("text", { text: "— 홍길동 드림", size: "sm", weight: "normal", color: "#a1a1aa" }),
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
  "Layout",
];
