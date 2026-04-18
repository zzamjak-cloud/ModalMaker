// 프리뷰 런타임 컨텍스트와 액션 실행기.
import type { CSSProperties } from "react";
import { getStylePreset } from "@/features/interactions/stylePresets";
import type { Interaction, InteractionAction, InteractionEvent } from "@/types/layout";

export interface PreviewContext {
  navigate: (pageId: string) => void;
  close: () => void;
}

export function runActions(
  interactions: Interaction[],
  event: InteractionEvent,
  ctx: PreviewContext,
): void {
  for (const it of interactions) {
    if (it.event !== event) continue;
    runAction(it.action, ctx);
  }
}

export function runAction(action: InteractionAction, ctx: PreviewContext): void {
  switch (action.type) {
    case "navigate":
      if (action.targetPageId) ctx.navigate(action.targetPageId);
      break;
    case "close":
      ctx.close();
      break;
    case "applyStyle":
      // applyStyle은 단일 발사형이 아니라 상태 기반이므로 여기서 아무것도 하지 않는다.
      // (hover/press 상태에서 스타일로 병합되는 식으로 렌더러가 처리)
      break;
  }
}

export function styleForState(
  interactions: Interaction[] | undefined,
  states: { hover: boolean; pressed: boolean; disabled: boolean },
): CSSProperties {
  if (!interactions?.length) return {};
  const merged: CSSProperties = {};
  const applyFor = (event: InteractionEvent) => {
    for (const it of interactions) {
      if (it.event !== event) continue;
      if (it.action.type !== "applyStyle") continue;
      const preset = getStylePreset(it.action.stylePresetId);
      if (preset) Object.assign(merged, preset.style);
    }
  };
  if (states.disabled) applyFor("disabled");
  if (states.hover) applyFor("hover");
  if (states.pressed) applyFor("press");
  return merged;
}

export function hasDisabledBehavior(interactions: Interaction[] | undefined): boolean {
  return !!interactions?.some((i) => i.event === "disabled");
}
