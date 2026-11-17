import { useEffect, useRef, useState } from 'react';

interface SpinViewerProps {
  frames: string[];
  alt?: string;
  className?: string;
}

/** Drag-to-rotate 360° viewer for a list of frame URLs (smooth canvas drawing). */
export const SpinViewer: React.FC<SpinViewerProps> = ({ frames, alt, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapsRef = useRef<(ImageBitmap | null)[]>([]);
  const idxRef = useRef(0);
  const posRef = useRef(0); // fractional frame position
  const dragRef = useRef<{ x: number; pos: number } | null>(null);
  const interactedRef = useRef(false);
  const [loaded, setLoaded] = useState(0);

  const draw = (i: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const bmp = bitmapsRef.current[i] ?? bitmapsRef.current.find(Boolean) ?? null;
    if (!bmp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const s = Math.min(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - w) / 2, (ch - h) / 2, w, h);
  };

  useEffect(() => {
    let cancelled = false;
    bitmapsRef.current = new Array(frames.length).fill(null);
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (!cancelled) {
        const i = next++;
        if (i >= frames.length) return;
        try {
          const blob = await (await fetch(frames[i])).blob();
          const bmp = await createImageBitmap(blob);
          if (cancelled) {
            bmp.close();
            return;
          }
          bitmapsRef.current[i] = bmp;
          if (i === 0) draw(0);
        } catch {
          /* skip a broken frame */
        }
        done++;
        if (!cancelled) setLoaded(done);
      }
    };
    for (let k = 0; k < 6; k++) void worker();
    return () => {
      cancelled = true;
      bitmapsRef.current.forEach((b) => b?.close());
      bitmapsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.join('|')]);

  // Canvas size + gentle auto-rotation until the user touches it
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      draw(idxRef.current);
    };
    resize();
    window.addEventListener('resize', resize);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!interactedRef.current && loaded >= frames.length * 0.5 && !dragRef.current) {
        posRef.current = (posRef.current + dt * 6) % frames.length; // ~6 frames / s
        const i = Math.floor(posRef.current);
        if (i !== idxRef.current) {
          idxRef.current = i;
          draw(i);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded >= frames.length * 0.5, frames.length]);

  // Mouse wheel / trackpad scroll over the viewer also rotates the item
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      interactedRef.current = true;
      const step = (e.deltaY + e.deltaX) / 40; // ~1 frame per wheel notch
      const p = (((posRef.current + step) % frames.length) + frames.length) % frames.length;
      posRef.current = p;
      const i = Math.floor(p);
      if (i !== idxRef.current) {
        idxRef.current = i;
        draw(i);
      }
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames.length]);

  const onDown = (e: React.PointerEvent) => {
    interactedRef.current = true;
    dragRef.current = { x: e.clientX, pos: posRef.current };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const width = (e.currentTarget as HTMLElement).clientWidth || 1;
    const delta = ((e.clientX - d.x) / width) * frames.length * 1.2;
    const p = (((d.pos - delta) % frames.length) + frames.length) % frames.length;
    posRef.current = p;
    const i = Math.floor(p);
    if (i !== idxRef.current) {
      idxRef.current = i;
      draw(i);
    }
  };
  const onUp = () => {
    dragRef.current = null;
  };

  return (
    <div className={`relative ${className ?? ''}`}>
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={alt}
        className="w-full h-full touch-pan-y cursor-grab active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
      />
      {loaded < frames.length && (
        <div className="absolute bottom-2 inset-x-6 h-1 rounded bg-white/15 pointer-events-none">
          <div className="h-full rounded bg-amber-400" style={{ width: `${(loaded / frames.length) * 100}%` }} />
        </div>
      )}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] tracking-widest text-white/80 pointer-events-none">
        360°
      </div>
    </div>
  );
};
