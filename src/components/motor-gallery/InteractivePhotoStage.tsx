import React, { useState, useRef, useEffect, useCallback } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Compass, Play, Pause, DoorOpen } from 'lucide-react';
import { LuxuryCarSpec } from '../../data/luxuryCarsData';

type Language = 'en' | 'hy';

interface InteractivePhotoStageProps {
  car: LuxuryCarSpec;
  lotDayMode: boolean;
  isDoorsOpen: boolean;
  isTrunkOpen: boolean;
  isEngineRunning: boolean;
  lang: Language;
}

// Legacy 8-frame sets start on frame #8 (315°); dense frame sets (from ffmpeg) start at 0°
const homeYawFor = (frameCount?: number) => (frameCount && frameCount <= 8 ? 315 : 0);

// Set to true to show the 0°/45°/90°… quick-angle pills again
const SHOW_ANGLE_PILLS = false;

const ANGLE_LABELS = ['0°', '45°', '90°', '135°', '180°', '225°', '270°', '315°'];
const getTargetCacheFrames = () =>
  typeof window !== 'undefined' && window.innerWidth < 768 ? 36 : 60;

export const InteractivePhotoStage: React.FC<InteractivePhotoStageProps> = ({
  car,
  lotDayMode,
  isDoorsOpen,
  isTrunkOpen,
  isEngineRunning,
  lang,
}) => {
  const frames = car.spinFrames && car.spinFrames.length > 0 ? car.spinFrames : null;
  const hasDoorsVideo = Boolean(car.doorsSpinVideoUrl);
  const hasSpinVideo = Boolean(car.spinVideoUrl);

  const isOpenMode = isDoorsOpen || isTrunkOpen;
  const activeVideoSrc =
    isOpenMode && hasDoorsVideo
      ? car.doorsSpinVideoUrl
      : hasSpinVideo
        ? car.spinVideoUrl
        : undefined;

  const isVideoMode = Boolean(activeVideoSrc);

  const [yawDeg, setYawDeg] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDragging, setIsDragging] = useState(false);
  const [autoSpin, setAutoSpin] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(8);
  const [cacheProgress, setCacheProgress] = useState<number>(0);
  const [framesReady, setFramesReady] = useState<boolean>(false);
  const [showRear, setShowRear] = useState<boolean>(false);

  const dragStartRef = useRef<{ x: number; yaw: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const capturedFramesRef = useRef<HTMLCanvasElement[]>([]);
  const isCapturingRef = useRef<boolean>(false);
  const autoSpinRef = useRef<boolean>(false);
  autoSpinRef.current = autoSpin;

  // Reset angle and zoom when switching cars
  useEffect(() => {
    setYawDeg(car.spinVideoUrl ? 0 : homeYawFor(car.spinFrames?.length));
    setZoom(1.0);
    setAutoSpin(false);
    setShowRear(false);
  }, [car.id, car.spinVideoUrl, car.spinFrames]);

  // When toggling doors/trunk on a car with doorsSpinVideoUrl, auto-play so the user sees doors & frunk open smoothly
  useEffect(() => {
    if (isOpenMode && hasDoorsVideo) {
      setYawDeg(0);
      setAutoSpin(true);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [isOpenMode, hasDoorsVideo]);

  // Preload fallback image frames when not using video
  useEffect(() => {
    const urlsToPreload: string[] = [];
    if (car.heroPhotoUrl) urlsToPreload.push(car.heroPhotoUrl);
    if (car.rearPhotoUrl) urlsToPreload.push(car.rearPhotoUrl);
    if (car.doorsOpenPhotoUrl) urlsToPreload.push(car.doorsOpenPhotoUrl);
    if (car.spinFrames) urlsToPreload.push(...car.spinFrames);

    urlsToPreload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, [car]);

  // Capture frames from the MOUNTED <video> by playing once at 4x speed when video loads
  useEffect(() => {
    capturedFramesRef.current = [];
    setFramesReady(false);
    setCacheProgress(0);
    isCapturingRef.current = false;

    const video = videoRef.current;
    if (!activeVideoSrc || !video) return;

    let cancelled = false;
    let rafId = 0;

    const startFastCapture = async () => {
      if (cancelled || isCapturingRef.current) return;
      isCapturingRef.current = true;

      // Wait until video has enough data to play
      if (video.readyState < 2) {
        await new Promise<void>((resolve) => {
          const done = () => resolve();
          video.addEventListener('canplay', done, { once: true });
          window.setTimeout(done, 3000);
        });
      }
      if (cancelled || !video.duration || !Number.isFinite(video.duration)) return;

      const dur = video.duration;
      setVideoDuration(dur);

      const targetFrames = getTargetCacheFrames();
      const collected: (HTMLCanvasElement | null)[] = new Array(targetFrames).fill(null);
      let capturedCount = 0;

      video.currentTime = 0;
      video.playbackRate = 4.0;
      try {
        await video.play();
      } catch {
        isCapturingRef.current = false;
        return;
      }

      const captureTick = () => {
        if (cancelled) return;
        if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
          const progress = Math.min(0.999, Math.max(0, video.currentTime / dur));
          const slot = Math.floor(progress * targetFrames);
          if (!collected[slot]) {
            const maxW = typeof window !== 'undefined' && window.innerWidth < 768 ? 960 : video.videoWidth;
            const scale = Math.min(1, maxW / video.videoWidth);
            const off = document.createElement('canvas');
            off.width = Math.round(video.videoWidth * scale);
            off.height = Math.round(video.videoHeight * scale);
            const offCtx = off.getContext('2d');
            if (offCtx) {
              offCtx.drawImage(video, 0, 0, off.width, off.height);
              collected[slot] = off;
              capturedCount++;
              setCacheProgress(Math.round((capturedCount / targetFrames) * 100));
            }
          }
        }

        // Stop once we have most frames or ~2.5 seconds elapsed
        if (capturedCount >= targetFrames - 3) {
          finishCapture();
          return;
        }
        rafId = window.requestAnimationFrame(captureTick);
      };

      const finishCapture = () => {
        if (cancelled) return;
        window.cancelAnimationFrame(rafId);
        video.playbackRate = 1.0;
        if (!autoSpinRef.current) {
          video.pause();
          video.currentTime = isOpenMode ? Math.min(dur * 0.45, Math.max(0, dur - 0.1)) : 0;
        }
        // Fill any missing slots with nearest captured frame
        const compact: HTMLCanvasElement[] = [];
        let lastValid: HTMLCanvasElement | null = null;
        for (let i = 0; i < collected.length; i++) {
          if (collected[i]) lastValid = collected[i];
          if (lastValid) compact.push(lastValid);
        }
        if (compact.length > 0) {
          capturedFramesRef.current = compact;
          setFramesReady(true);
          setCacheProgress(100);
          if (isOpenMode && !autoSpinRef.current) {
            setYawDeg(160);
          }
        }
        isCapturingRef.current = false;
      };

      rafId = window.requestAnimationFrame(captureTick);
      window.setTimeout(finishCapture, 2600);
    };

    startFastCapture();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(rafId);
      if (video) {
        video.playbackRate = 1.0;
      }
      isCapturingRef.current = false;
    };
  }, [activeVideoSrc]);

  // Draw the cached frame onto <canvas> whenever yawDeg changes (and not autoSpinning)
  const drawCachedFrame = useCallback((deg: number) => {
    const canvas = canvasRef.current;
    const cached = capturedFramesRef.current;
    if (!canvas || cached.length === 0) return;

    const normalized = ((deg % 360) + 360) % 360;
    const idx = Math.round((normalized / 360) * cached.length) % cached.length;
    const frameCanvas = cached[idx];
    if (!frameCanvas) return;

    if (canvas.width !== frameCanvas.width || canvas.height !== frameCanvas.height) {
      canvas.width = frameCanvas.width;
      canvas.height = frameCanvas.height;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    if (framesReady && !autoSpin) {
      drawCachedFrame(yawDeg);
    }
  }, [framesReady, autoSpin, yawDeg, drawCachedFrame]);

  // Sync <video> play/pause with autoSpin (after capture finishes)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoMode || isCapturingRef.current) return;
    video.playbackRate = 1.0;
    if (autoSpin) {
      video.play().catch(() => {
        // autoplay blocked or interrupted
      });
    } else {
      video.pause();
    }
  }, [autoSpin, isVideoMode, activeVideoSrc]);

  // Sync yawDeg readout while video is auto-playing
  const handleVideoTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.duration || isDragging || !autoSpin) return;
    const progress = video.currentTime / video.duration;
    setYawDeg((progress * 360) % 360);
  }, [isDragging, autoSpin]);

  // Auto-spin fallback for 8-frame image turntable
  useEffect(() => {
    if (isVideoMode || !autoSpin || !frames || isOpenMode) return;
    const stepDeg = 360 / frames.length;
    const id = window.setInterval(() => {
      setYawDeg((prev) => (prev + stepDeg) % 360);
    }, frames.length > 12 ? 50 : 650);
    return () => window.clearInterval(id);
  }, [isVideoMode, autoSpin, frames, isOpenMode]);

  const scrubVideoFallback = useCallback(
    (nextYaw: number) => {
      const video = videoRef.current;
      if (!video || framesReady) return;
      const dur = video.duration && Number.isFinite(video.duration) ? video.duration : videoDuration;
      if (!dur || video.seeking) return;
      const normalized = ((nextYaw % 360) + 360) % 360;
      video.currentTime = Math.min(Math.max((normalized / 360) * dur, 0), Math.max(0, dur - 0.02));
    },
    [videoDuration, framesReady]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      setAutoSpin(false);
      setShowRear(false);
      if (videoRef.current && !isCapturingRef.current) videoRef.current.pause();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, yaw: yawDeg };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [yawDeg]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.x;
      const nextYaw = (((dragStartRef.current.yaw + dx * 0.45) % 360) + 360) % 360;
      setYawDeg(nextYaw);
      if (isVideoMode) {
        if (framesReady) {
          drawCachedFrame(nextYaw);
        } else {
          scrubVideoFallback(nextYaw);
        }
      }
    },
    [isDragging, isVideoMode, framesReady, drawCachedFrame, scrubVideoFallback]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(false);
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore if not captured
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    setZoom((prev) => Math.max(1.0, Math.min(1.65, prev - e.deltaY * 0.0008)));
  }, []);

  const normalizedYaw = ((yawDeg % 360) + 360) % 360;
  const isOpenImageActive = !isVideoMode && isOpenMode && Boolean(car.doorsOpenPhotoUrl);

  let activeFrameIndex = 0;
  let activePhotoSrc = car.heroPhotoUrl || '';

  if (showRear && !isVideoMode && car.rearPhotoUrl) {
    activePhotoSrc = car.rearPhotoUrl;
  } else if (isOpenImageActive && car.doorsOpenPhotoUrl) {
    activePhotoSrc = car.doorsOpenPhotoUrl;
  } else if (frames) {
    const sectorSize = 360 / frames.length;
    activeFrameIndex = Math.round(normalizedYaw / sectorSize) % frames.length;
    activePhotoSrc = frames[activeFrameIndex] || car.heroPhotoUrl || '';
  } else if (car.rearPhotoUrl) {
    const isRearView = normalizedYaw >= 90 && normalizedYaw <= 270;
    activePhotoSrc = isRearView ? car.rearPhotoUrl : car.heroPhotoUrl || '';
  }

  const brightnessClass = lotDayMode
    ? 'brightness-[1.42] contrast-[1.06] saturate-[1.14]'
    : 'brightness-[1.32] contrast-[1.06] saturate-[1.12]';

  const showCanvasLayer = isVideoMode && framesReady && !autoSpin;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className={`absolute inset-0 z-10 overflow-hidden select-none touch-none bg-zinc-900 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Flat, bright, undistorted photorealistic stage — upper half on mobile above bottom sheet */}
      <div
        className="w-full h-[46dvh] sm:h-full mt-12 sm:mt-0 relative transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${zoom.toFixed(3)})`,
        }}
      >
        {isVideoMode && activeVideoSrc ? (
          <>
            <video
              key={activeVideoSrc}
              ref={videoRef}
              src={activeVideoSrc}
              poster={car.heroPhotoUrl}
              autoPlay={autoSpin}
              muted
              loop
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (dur && Number.isFinite(dur)) setVideoDuration(dur);
              }}
              onTimeUpdate={handleVideoTimeUpdate}
              className={`absolute inset-0 w-full h-full object-contain sm:object-cover pointer-events-none ${brightnessClass} ${
                isEngineRunning ? 'animate-[pulse_0.16s_ease-in-out_infinite]' : ''
              } ${showCanvasLayer ? 'opacity-0' : 'opacity-100'}`}
            />
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-contain sm:object-cover pointer-events-none ${brightnessClass} ${
                isEngineRunning ? 'animate-[pulse_0.16s_ease-in-out_infinite]' : ''
              } ${showCanvasLayer ? 'opacity-100' : 'opacity-0'}`}
            />
          </>
        ) : (
          <img
            src={activePhotoSrc}
            alt={car.fullName}
            draggable={false}
            className={`absolute inset-0 w-full h-full object-contain sm:object-cover pointer-events-none ${brightnessClass} ${
              isEngineRunning ? 'animate-[pulse_0.16s_ease-in-out_infinite]' : ''
            }`}
          />
        )}
      </div>

      {/* Doors / Trunk Open indicator badge */}
      {(isOpenImageActive || (isOpenMode && hasDoorsVideo)) && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 text-zinc-950 font-semibold text-xs shadow-xl">
          <DoorOpen className="w-4 h-4" />
          <span>
            {lang === 'hy' ? 'Դռներն ու բագաժնիկը բաց են' : 'Doors & Frunk Open'}
          </span>
        </div>
      )}

      {/* Engine vibration & exhaust glow overlay when running */}
      {isEngineRunning && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[11px] font-semibold backdrop-blur-md">
          {lang === 'hy' ? 'Շարժիչը աշխատում է • IDLE' : 'Engine Running • IDLE'}
        </div>
      )}

      {/* Top-right HUD: 360° controls + zoom (offset left of right detail panel on desktop, compact on mobile) */}
      <div className="absolute top-[calc(46dvh-8px)] sm:top-24 right-2 sm:right-4 lg:right-[440px] z-20 flex flex-row sm:flex-col items-center sm:items-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/85 border border-white/15 backdrop-blur-md text-[11px] text-white/90 shadow-lg">
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono font-semibold">{Math.round(normalizedYaw)}°</span>

          {isVideoMode && !framesReady && cacheProgress > 0 && cacheProgress < 100 && (
            <>
              <span className="text-white/30">•</span>
              <span className="text-[10px] text-amber-300 font-mono">{cacheProgress}%</span>
            </>
          )}

          {(isVideoMode || frames) && (
            <>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={() => {
                  setShowRear(false);
                  setAutoSpin((v) => !v);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-colors cursor-pointer ${
                  autoSpin
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={lang === 'hy' ? 'Ավտոմատ 360° պտույտ' : 'Auto 360° Spin'}
              >
                {autoSpin ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>360°</span>
              </button>
            </>
          )}

          {!isVideoMode && !frames && car.rearPhotoUrl && (
            <>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={() =>
                  setYawDeg((prev) => (prev >= 90 && prev <= 270 ? 0 : 180))
                }
                className="text-amber-300 hover:text-amber-200 font-medium cursor-pointer"
              >
                {normalizedYaw >= 90 && normalizedYaw <= 270
                  ? lang === 'hy'
                    ? 'Հետևի 8K'
                    : 'Rear 8K'
                  : lang === 'hy'
                    ? 'Առջևի 8K'
                    : 'Front 8K'}
              </button>
            </>
          )}

          {!isVideoMode && frames && car.rearPhotoUrl && (
            <>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={() => {
                  setAutoSpin(false);
                  setShowRear((v) => !v);
                }}
                className={`font-medium cursor-pointer ${
                  showRear ? 'text-amber-300' : 'text-white/80 hover:text-white'
                }`}
              >
                {showRear
                  ? lang === 'hy'
                    ? 'Առջևի'
                    : 'Front'
                  : lang === 'hy'
                    ? 'Հետևի'
                    : 'Rear'}
              </button>
            </>
          )}
        </div>

        {/* 8-Angle Turntable Quick Selector Pills (hidden on narrow mobile to keep stage clean) */}
        {SHOW_ANGLE_PILLS && (isVideoMode || frames) && (
          <div className="hidden sm:flex flex-wrap justify-end gap-1 max-w-[260px] p-1.5 rounded-2xl bg-zinc-950/80 border border-white/15 backdrop-blur-md shadow-lg">
            {ANGLE_LABELS.map((label, idx) => {
              const targetYaw = idx * 45;
              const angleDiff = Math.abs(((normalizedYaw - targetYaw + 540) % 360) - 180);
              const isSelected = isVideoMode
                ? angleDiff < 22.5
                : !isOpenImageActive && angleDiff < 22.5;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setAutoSpin(false);
                    if (videoRef.current && !isCapturingRef.current) videoRef.current.pause();
                    setShowRear(false);
                    setYawDeg(targetYaw);
                    if (isVideoMode) {
                      if (framesReady) {
                        drawCachedFrame(targetYaw);
                      } else {
                        scrubVideoFallback(targetYaw);
                      }
                    }
                  }}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-semibold transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-zinc-950'
                      : 'text-white/75 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* Zoom & Reset buttons */}
        <div className="flex items-center gap-1 p-1 rounded-full bg-zinc-950/80 border border-white/15 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.65, z + 0.15))}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={lang === 'hy' ? 'Մոտեցնել' : 'Zoom in'}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1.0, z - 0.15))}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title={lang === 'hy' ? 'Հեռացնել' : 'Zoom out'}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              setAutoSpin(false);
              if (videoRef.current && !isCapturingRef.current) videoRef.current.pause();
              const resetDeg = isVideoMode ? 0 : frames ? homeYawFor(frames.length) : 0;
              setShowRear(false);
              setYawDeg(resetDeg);
              if (isVideoMode) {
                if (framesReady) {
                  drawCachedFrame(resetDeg);
                } else {
                  scrubVideoFallback(resetDeg);
                }
              }
              setZoom(1.0);
            }}
            className="p-1.5 rounded-full text-white/80 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
            title={lang === 'hy' ? 'Վերադարձնել դիտանկյունը' : 'Reset angle'}
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Drag hint at bottom center (hidden on small mobile where bottom sheet sits) */}
      <div className="hidden sm:block pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/55 border border-white/10 text-[11px] text-white/75 backdrop-blur-sm">
        {isVideoMode
          ? lang === 'hy'
            ? 'Քաշեք հորիզոնական՝ իրական 360° սահուն պտույտի համար • Սքրոլ՝ մոտեցնելու'
            : 'Drag horizontally for smooth 360° orbit • Scroll to zoom'
          : frames
            ? lang === 'hy'
              ? 'Քաշեք հորիզոնական՝ իրական 8K 360° պտույտի համար • Սքրոլ՝ մոտեցնելու'
              : 'Drag horizontally for true 8K 360° turntable • Scroll to zoom'
            : lang === 'hy'
              ? 'Քաշեք հորիզոնական՝ դիտանկյունը փոխելու համար • Սքրոլ՝ մոտեցնելու'
              : 'Drag horizontally to switch angle • Scroll to zoom'}
      </div>
    </div>
  );
};
