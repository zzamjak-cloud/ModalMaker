// Canvas 모드: 고정 해상도 박스를 보이는 영역 안에서 확대·축소·패닝·맞춤
// 줌 버튼·표시는 툴바( canvasViewportControlsStore )에서만 다룬다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  registerCanvasViewportControls,
  resetCanvasViewportControls,
} from "@/features/canvas/canvasViewportControlsStore";

/** 10% 단위(0.1) 스케일, 100% = 1.0 */
const SCALE_STEP = 0.1;
const MIN_SCALE = 0.1;
const MAX_SCALE = 4;

/** 트랙패드 핀치 줌 민감도 — ReactFlow 기본값에 맞춤 */
const PINCH_SENSITIVITY = 0.008;

type CanvasViewState = {
  scale: number;
  panX: number;
  panY: number;
};

type CanvasViewportProps = {
  children: React.ReactNode;
  className?: string;
  contentWidth?: number | null;
  contentHeight?: number | null;
  fitTrigger?: string | number;
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function snapScale(s: number): number {
  return clamp(Math.round(s * 10) / 10, MIN_SCALE, MAX_SCALE);
}

export function CanvasViewport({
  children,
  className,
  contentWidth,
  contentHeight,
  fitTrigger,
}: CanvasViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** transform이 걸린 래퍼 — 포인터 줌 시 실제 중심 좌표용 */
  const transformInnerRef = useRef<HTMLDivElement>(null);
  const contentMeasureRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ w: 0, h: 0 });

  /** 둘 다 양수일 때만 고정 해상도 — 한쪽만 prop·한쪽만 measured 섞이면 맞춤 배율이 300%대로 튐 */
  const hasExplicitSize =
    typeof contentWidth === "number" &&
    contentWidth > 0 &&
    typeof contentHeight === "number" &&
    contentHeight > 0;

  const knownW = hasExplicitSize ? contentWidth : measured.w;
  const knownH = hasExplicitSize ? contentHeight : measured.h;

  const knownWRef = useRef(knownW);
  const knownHRef = useRef(knownH);
  knownWRef.current = knownW;
  knownHRef.current = knownH;
  const didImmediateFitRef = useRef(false);
  /** fitTrigger로 새 문서/페이지 로드 시: flex가 컨테이너 크기를 과대 측정하는 프레임이 있으면 fit이 과대 스케일 → 잠깐 3배처럼 보임. 표시는 크기가 연속 rAF에서 안정된 뒤에만. */
  const revealGenRef = useRef(0);
  const fitSessionGenRef = useRef(0);
  const revealArmedRef = useRef(false);
  /** fitTrigger 직후 초기 표시 전까지: 중간 fit(RO 등)이 setContentVisible을 켜면 과대 스케일이 노출됨 */
  const revealCompleteRef = useRef(false);

  const [view, setView] = useState<CanvasViewState>({ scale: 1, panX: 0, panY: 0 });
  /** 첫 성공 fit 전엔 scale=1이 한 프레임 그려져 깜빡임 → 맞춤 적용 후에만 표시 */
  const [contentVisible, setContentVisible] = useState(false);
  const viewRef = useRef(view);
  const gestureBaseScaleRef = useRef(1);
  const [isPanning, setIsPanning] = useState(false);
  const lastPanRef = useRef({ x: 0, y: 0 });
  const capturePidRef = useRef<number | null>(null);
  const fitRef = useRef<() => void>(() => {});
  /** fit()이 컨테이너/내용 크기 0으로 실패할 때 rAF 재시도 횟수 (flex 레이아웃 직후 한 프레임에 크기가 0인 경우가 많음) */
  const fitRetryCountRef = useRef(0);

  const scheduleRevealAfterStableContainer = useCallback((sessionGen: number) => {
    let prev: { w: number; h: number } | null = null;
    let frames = 0;
    const maxFrames = 24;

    const tick = () => {
      if (sessionGen !== revealGenRef.current) return;
      const el = containerRef.current;
      if (!el) {
        revealCompleteRef.current = true;
        setContentVisible(true);
        return;
      }
      const br = el.getBoundingClientRect();
      let cw = br.width;
      let ch = br.height;
      if (cw <= 0 || ch <= 0) {
        cw = el.clientWidth;
        ch = el.clientHeight;
      }
      const w = knownWRef.current;
      const h = knownHRef.current;
      if (cw <= 0 || ch <= 0 || w <= 0 || h <= 0) {
        frames++;
        if (frames < maxFrames) requestAnimationFrame(tick);
        else {
          revealCompleteRef.current = true;
          setContentVisible(true);
        }
        return;
      }

      fitRetryCountRef.current = 0;
      fitRef.current();

      const cur = { w: cw, h: ch };
      const stable =
        prev !== null &&
        Math.abs(cur.w - prev.w) < 0.5 &&
        Math.abs(cur.h - prev.h) < 0.5;

      if (stable) {
        revealCompleteRef.current = true;
        setContentVisible(true);
        return;
      }
      prev = cur;
      frames++;
      if (frames >= maxFrames) {
        revealCompleteRef.current = true;
        setContentVisible(true);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const br = el.getBoundingClientRect();
    let cw = br.width;
    let ch = br.height;
    if (cw <= 0 || ch <= 0) {
      cw = el.clientWidth;
      ch = el.clientHeight;
    }
    const w = knownW;
    const h = knownH;
    if (cw <= 0 || ch <= 0 || w <= 0 || h <= 0) {
      if (fitRetryCountRef.current < 64) {
        fitRetryCountRef.current += 1;
        requestAnimationFrame(() => {
          fitRef.current();
        });
      } else if (revealArmedRef.current) {
        revealArmedRef.current = false;
        scheduleRevealAfterStableContainer(fitSessionGenRef.current);
      }
      return;
    }
    fitRetryCountRef.current = 0;
    // 맞춤 = 100% 줌 + 캔버스 중앙 정렬 (flex center로 중앙, pan 0)
    setView({ scale: 1, panX: 0, panY: 0 });
    if (revealArmedRef.current) {
      revealArmedRef.current = false;
      scheduleRevealAfterStableContainer(fitSessionGenRef.current);
    }
  }, [knownW, knownH, scheduleRevealAfterStableContainer]);

  fitRef.current = fit;

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useLayoutEffect(() => {
    const el = contentMeasureRef.current;
    if (hasExplicitSize) return;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      setMeasured({ w: Math.ceil(r.width), h: Math.ceil(r.height) });
    });
    ro.observe(el);
    const r0 = el.getBoundingClientRect();
    setMeasured({ w: Math.ceil(r0.width), h: Math.ceil(r0.height) });
    return () => ro.disconnect();
  }, [hasExplicitSize]);

  // fitTrigger 변경 시에만 맞춤 — fit 함수 참조(knownW/H 변화)가 re-fit을 유발하지 않도록 fitRef 사용
  useLayoutEffect(() => {
    revealGenRef.current += 1;
    fitSessionGenRef.current = revealGenRef.current;
    revealArmedRef.current = true;
    revealCompleteRef.current = false;
    setContentVisible(false);
    fitRetryCountRef.current = 0;
    fitRef.current();
    const id = requestAnimationFrame(() => {
      fitRef.current();
    });
    return () => {
      cancelAnimationFrame(id);
      revealGenRef.current += 1;
    };
  }, [fitTrigger]);

  // fitTrigger가 바뀔 때마다 RO 재구독 + 즉시 맞춤 플래그 초기화. 첫 유효 contentRect에서 한 번 fit(창만 리사이즈는 디바운스 RO).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    didImmediateFitRef.current = false;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect;
      if (cr.width <= 0 || cr.height <= 0) return;
      if (knownWRef.current <= 0 || knownHRef.current <= 0) return;
      if (didImmediateFitRef.current) return;
      didImmediateFitRef.current = true;
      fitRetryCountRef.current = 0;
      fitRef.current();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitTrigger]);

  // 컨테이너 리사이즈 시 맞춤 — 연속 RO(로드·플렉스 안정화 중)마다 즉시 fit 하면 배율이 400%↔27%처럼 튐. 디바운스만 적용.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (debounceTimer != null) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        debounceTimer = null;
        fitRetryCountRef.current = 0;
        fitRef.current();
      }, 120);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (debounceTimer != null) clearTimeout(debounceTimer);
    };
  }, []);

  /** 뷰 중앙 기준 ±10% — transformOrigin center + flex 중앙 정렬이면 배율만 바꿔도 화면 중심이 고정됨 */
  const zoomStep = useCallback((deltaSteps: number) => {
    setView((v) => ({
      ...v,
      scale: snapScale(v.scale + deltaSteps * SCALE_STEP),
    }));
  }, []);

  /** 툴바 맞춤: 이전에 rAF 재시도 한도에 걸린 뒤에도 다시 맞춤되도록 카운터 리셋 */
  const fitFromToolbar = useCallback(() => {
    fitRetryCountRef.current = 0;
    revealCompleteRef.current = true;
    setContentVisible(true);
    fit();
  }, [fit]);

  useEffect(() => {
    registerCanvasViewportControls({
      percent: Math.round(view.scale * 100),
      zoomIn: () => zoomStep(1),
      zoomOut: () => zoomStep(-1),
      fit: fitFromToolbar,
    });
  }, [view.scale, zoomStep, fitFromToolbar]);

  useEffect(() => {
    return () => resetCanvasViewportControls();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      // macOS 트랙패드: 핀치 줌은 보통 ctrl+wheel, 두 손가락 스크롤은 deltaX/Y만 옴 → 패닝
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        let dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= el.clientHeight;
        // 누적 임계값 없이 deltaY에 비례해 연속 줌 — ReactFlow와 동일한 방식
        const outer = containerRef.current;
        const inner = transformInnerRef.current;
        if (!outer || !inner) return;
        const cr = outer.getBoundingClientRect();
        const ir = inner.getBoundingClientRect();
        const mx = e.clientX - cr.left;
        const my = e.clientY - cr.top;
        const cx = ir.left - cr.left + ir.width / 2;
        const cy = ir.top - cr.top + ir.height / 2;
        setView((v) => {
          const nextScale = clamp(v.scale * Math.pow(2, -dy * PINCH_SENSITIVITY), MIN_SCALE, MAX_SCALE);
          const ratio = nextScale / v.scale;
          return {
            scale: nextScale,
            panX: v.panX + (1 - ratio) * (mx - cx),
            panY: v.panY + (1 - ratio) * (my - cy),
          };
        });
        return;
      }
      e.preventDefault();
      let dx = e.deltaX;
      let dy = e.deltaY;
      if (e.deltaMode === 1) {
        dx *= 16;
        dy *= 16;
      } else if (e.deltaMode === 2) {
        dx *= el.clientWidth;
        dy *= el.clientHeight;
      }
      setView((v) => ({ ...v, panX: v.panX - dx, panY: v.panY - dy }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Safari: 트랙패드 핀치는 ctrl+wheel 대신 gesturechange 로 옴
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = window as unknown as {
      GestureEvent?: new () => Event;
    };
    if (typeof w.GestureEvent === "undefined") return;

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureBaseScaleRef.current = viewRef.current.scale;
    };

    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const g = e as unknown as { scale: number; clientX: number; clientY: number };
      const nextScale = clamp(gestureBaseScaleRef.current * g.scale, MIN_SCALE, MAX_SCALE);
      const inner = transformInnerRef.current;
      if (!inner) return;
      const cr = el.getBoundingClientRect();
      const ir = inner.getBoundingClientRect();
      const mx = g.clientX - cr.left;
      const my = g.clientY - cr.top;
      const cx = ir.left - cr.left + ir.width / 2;
      const cy = ir.top - cr.top + ir.height / 2;
      setView((v) => {
        const ratio = nextScale / v.scale;
        return {
          scale: nextScale,
          panX: v.panX + (1 - ratio) * (mx - cx),
          panY: v.panY + (1 - ratio) * (my - cy),
        };
      });
    };

    el.addEventListener("gesturestart", onGestureStart, false);
    el.addEventListener("gesturechange", onGestureChange, false);
    el.addEventListener("gestureend", onGestureStart, false);
    return () => {
      el.removeEventListener("gesturestart", onGestureStart, false);
      el.removeEventListener("gesturechange", onGestureChange, false);
      el.removeEventListener("gestureend", onGestureStart, false);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const endPan = (e: PointerEvent) => {
      if (capturePidRef.current == null || e.pointerId !== capturePidRef.current) return;
      setIsPanning(false);
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* noop */
      }
      capturePidRef.current = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      const isMiddle = e.button === 1;
      const isAltLeft = e.button === 0 && e.altKey;
      if (!isMiddle && !isAltLeft) return;
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      capturePidRef.current = e.pointerId;
      el.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (capturePidRef.current == null || e.pointerId !== capturePidRef.current) return;
      const dx = e.clientX - lastPanRef.current.x;
      const dy = e.clientY - lastPanRef.current.y;
      lastPanRef.current = { x: e.clientX, y: e.clientY };
      setView((v) => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
    };

    el.addEventListener("pointerdown", onPointerDown, true);
    el.addEventListener("pointermove", onPointerMove, true);
    el.addEventListener("pointerup", endPan, true);
    el.addEventListener("pointercancel", endPan, true);
    return () => {
      el.removeEventListener("pointerdown", onPointerDown, true);
      el.removeEventListener("pointermove", onPointerMove, true);
      el.removeEventListener("pointerup", endPan, true);
      el.removeEventListener("pointercancel", endPan, true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex min-h-0 w-full min-w-0 flex-1 items-center justify-center overflow-hidden rounded-md bg-neutral-950/80 outline-none",
        isPanning && "cursor-grabbing",
        className,
      )}
      tabIndex={0}
      role="application"
      aria-label="캔버스 뷰포트"
    >
      <div
        ref={transformInnerRef}
        className={cn(
          contentVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          transform: `translate(${view.panX}px, ${view.panY}px) scale(${view.scale})`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
        aria-hidden={!contentVisible}
      >
        <div ref={contentMeasureRef} className="inline-block">
          {children}
        </div>
      </div>
    </div>
  );
}
