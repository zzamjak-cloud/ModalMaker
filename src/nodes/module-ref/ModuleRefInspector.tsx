// module-ref 전용 인스펙터 필드 — 모듈 원본 이름 편집·편집 모드 진입·모듈 해제
import { useLayoutStore } from "@/stores/layoutStore";
import type { InspectorSectionProps } from "../types";
import type { ModuleRefProps } from "@/types/layout";
import { Field, TextInput } from "@/features/inspector/inspector-ui";

export function ModuleRefInspector({ node, props }: InspectorSectionProps<ModuleRefProps>) {
  const p = props;
  const mod = useLayoutStore((s) => s.document.modules.find((m) => m.id === p.moduleId));
  const updateModule = useLayoutStore((s) => s.updateModule);
  const enterModuleEdit = useLayoutStore((s) => s.enterModuleEdit);
  const unlinkModule = useLayoutStore((s) => s.unlinkModule);

  if (!mod) {
    return (
      <Field label="Module">
        <div className="text-xs text-rose-400">참조 모듈이 삭제되었습니다 (id: {p.moduleId}).</div>
      </Field>
    );
  }
  return (
    <>
      <Field label="Module Name">
        <TextInput value={mod.name} onChange={(v) => updateModule(mod.id, { name: v })} />
      </Field>
      <Field label="Action">
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => enterModuleEdit(mod.id)}
            className="rounded-md border border-sky-500/40 bg-sky-500/10 px-2 py-1.5 text-xs text-sky-200 hover:bg-sky-500/20"
          >
            모듈 편집으로 이동
          </button>
          <button
            onClick={() => unlinkModule(node.id)}
            className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200 hover:bg-amber-500/20"
            title="모듈 링크를 해제하고 편집 가능한 일반 컴포넌트로 변환"
          >
            모듈 해제
          </button>
        </div>
      </Field>
    </>
  );
}
