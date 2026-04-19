// module-ref: 렌더는 NodeRenderer/PreviewRenderer의 특수 분기에서 처리 (모듈 원본을
// 재귀 렌더 + 순환 감지). descriptor로는 Inspector·defaults·export만 이관.
// 팔레트 노출은 false (모듈 패널에서 드래그).
import { Package } from "lucide-react";
import type { ModuleRefProps } from "@/types/layout";
import { register } from "../registry";
import { ModuleRefInspector } from "./ModuleRefInspector";

register<ModuleRefProps>({
  kind: "module-ref",
  label: "Module",
  icon: Package,
  isContainer: false,
  inPalette: false,
  defaultProps: () => ({ moduleId: "" }), // moduleId는 생성 호출부에서 덮어쓰임
  Inspector: ModuleRefInspector,
  exportMarkdown: (node) => {
    const p = node.props as ModuleRefProps;
    const n = p.label ?? `Module ${p.moduleId ?? ""}`;
    return `[Module: ${n}]`;
  },
  exportMermaid: (node) => (node.props as ModuleRefProps).label ?? "Module",
});
