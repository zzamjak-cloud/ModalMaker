// 프리뷰 전용: hover/press/disabled + 인터랙션 핸들러 병합
import { useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { LayoutNode } from "@/types/layout";
import {
  hasDisabledBehavior,
  runActions,
  styleForState,
  type PreviewContext,
} from "@/features/preview/previewRuntime";
import type { ThemeTokens } from "@/features/preview/themes";

export function usePreviewInteractionShell(
  node: LayoutNode,
  ctx: PreviewContext,
): {
  handlerProps: Record<string, unknown>;
  stateStyle: CSSProperties;
  hover: boolean;
} {
  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);
  const disabled = hasDisabledBehavior(node.interactions);

  const stateStyle = useMemo(
    () => styleForState(node.interactions, { hover, pressed, disabled }),
    [node.interactions, hover, pressed, disabled],
  );

  const onClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    runActions(node.interactions ?? [], "click", ctx);
  };
  const onMouseEnter = () => {
    if (disabled) return;
    setHover(true);
    runActions(node.interactions ?? [], "hover", ctx);
  };
  const onMouseLeave = () => {
    setHover(false);
    setPressed(false);
  };
  const onMouseDown = () => {
    if (disabled) return;
    setPressed(true);
    runActions(node.interactions ?? [], "press", ctx);
  };
  const onMouseUp = () => {
    if (!pressed) return;
    setPressed(false);
    runActions(node.interactions ?? [], "release", ctx);
  };

  const handlerProps = {
    onMouseEnter,
    onMouseLeave,
    ...(node.interactions?.length ? { onClick, onMouseDown, onMouseUp } : {}),
  };

  return { handlerProps, stateStyle, hover };
}

type PreviewInteractionFrameProps = {
  node: LayoutNode;
  ctx: PreviewContext;
  theme: ThemeTokens;
  style?: CSSProperties;
  children: ReactNode;
};

/** 인터랙션 스타일·이벤트가 붙는 래퍼 */
export function PreviewInteractionFrame({
  node,
  ctx,
  theme: _theme,
  style,
  children,
}: PreviewInteractionFrameProps) {
  const { handlerProps, stateStyle } = usePreviewInteractionShell(node, ctx);
  return (
    <div style={{ ...style, ...stateStyle }} {...handlerProps}>
      {children}
    </div>
  );
}
