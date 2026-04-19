// 프리뷰 뷰포트 프레임 — 페이지 뷰포트 설정에 따라 전체화면·고정 해상도·자유 크기로 렌더.
// ViewportFrame: 부모 안에서 transform:scale로 축소 표시.
// PopupViewportFrame: 팝업 페이지용 고정 크기 박스.
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { VIEWPORT_PRESETS, type Page, type ViewportSettings } from "@/types/layout";

/** 뷰포트 설정 → 픽셀 크기. free/undefined면 null 반환. custom-w면 height: null. */
export function resolveViewportSize(v?: ViewportSettings) {
  if (!v || v.preset === "free") return null;
  const safe = Math.max(0, Math.min(20, v.safeAreaPct ?? 0));
  if (v.preset === "custom") return { width: v.width ?? 1280, height: v.height ?? 720, safe };
  if (v.preset === "custom-w") return { width: v.width ?? 1280, height: null, safe };
  const p = VIEWPORT_PRESETS[v.preset as keyof typeof VIEWPORT_PRESETS];
  return { width: p.width, height: p.height, safe };
}

/**
 * 부모를 absolute inset-0으로 채우고, 뷰포트 콘텐츠를 transform:scale로 맞춤.
 * free 뷰포트면 overflow-auto + p-8 자유 스크롤 영역으로 대체.
 */
export function ViewportFrame({ page, children }: { page?: Page; children: ReactNode }) {
  const size = resolveViewportSize(page?.viewport);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const heightFree = !!size && size.height === null;

  useLayoutEffect(() => {
    if (!size) return;
    const el = outerRef.current;
    if (!el) return;
    const PAD = 64;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0) {
        const scaleW = (r.width - PAD) / size.width;
        const scaleH = heightFree ? 1 : r.height > 0 ? (r.height - PAD) / size.height! : 1;
        setScale(Math.min(scaleW, scaleH, 1));
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size?.width, size?.height, heightFree]);

  if (!size) {
    return (
      <div ref={outerRef} className="absolute inset-0 flex items-center justify-center overflow-auto p-8">
        {children}
      </div>
    );
  }

  if (heightFree) {
    // 너비 고정, 높이 자유: 너비 기준 스케일 후 y 스크롤
    return (
      <div ref={outerRef} className="absolute inset-0 overflow-auto p-8 flex justify-center">
        <div style={{ width: Math.round(size.width * scale), flexShrink: 0 }}>
          <div style={{
            width: size.width,
            transformOrigin: "top left",
            transform: `scale(${scale})`,
            display: "flex",
            flexDirection: "column",
            ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
          }}>
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={outerRef} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div style={{ width: Math.round(size.width * scale), height: Math.round(size.height! * scale), position: "relative", flexShrink: 0, overflow: "hidden" }}>
        <div style={{
          width: size.width,
          height: size.height!,
          position: "absolute",
          top: 0,
          left: 0,
          transformOrigin: "top left",
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
        }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** 팝업 전용: 고정 뷰포트 크기로 렌더링 (배경 위에 centered). free면 자연 크기. */
export function PopupViewportFrame({ page, children }: { page?: Page; children: ReactNode }) {
  const size = resolveViewportSize(page?.viewport);
  if (!size) return <>{children}</>;
  return (
    <div style={{
      width: size.width,
      ...(size.height !== null ? { height: size.height } : {}),
      overflow: "hidden",
      position: "relative",
      flexShrink: 0,
      display: "flex",
      flexDirection: "column",
      ...(size.safe > 0 ? { padding: `${size.safe}%`, boxSizing: "border-box" } : {}),
    }}>
      {children}
    </div>
  );
}
