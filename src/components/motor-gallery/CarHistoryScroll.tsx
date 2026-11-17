import { useEffect, useRef, useState } from 'react';
import type { Language } from '../../types/hardware';
import type { LuxuryCarSpec } from '../../data/luxuryCarsData';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Props {
  car: LuxuryCarSpec;
  lang: Language;
}

/** "History" tab of the car window: scroll inside the window to walk around the car while its story appears. */
export function CarHistoryScroll({ car, lang }: Props) {
  const frames = car.spinFrames ?? [];
  const N = frames.length;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const bitmaps = useRef<(ImageBitmap | null)[]>([]);
  const lastIdx = useRef(-1);
  const [loaded, setLoaded] = useState(0);
  const hy = lang === 'hy';

  const scenes = [
    {
      from: -0.1,
      to: 0.3,
      kicker: 'History',
      title: car.fullName,
      text: `${car.year} · ${car.make} · #${car.stockNumber}`,
    },
    {
      from: 0.36,
      to: 0.66,
      kicker: 'History',
      title: car.colorName[lang],
      text: car.description[lang],
    },
    {
      from: 0.72,
      to: 9,
      kicker: 'History',
      title: `${car.specs.horsepower} · ${car.specs.zeroToSixty}`,
      text: `${car.specs.engine} · ${car.specs.drivetrain} · ${car.specs.topSpeed}`,
    },
  ];

  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    const m = bitmaps.current;
    let bmp: ImageBitmap | null = null;
    for (let d = 0; d < N && !bmp; d++) bmp = m[idx - d] || m[idx + d] || null;
    if (!canvas || !bmp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const portrait = ch > cw;
    const s = portrait ? (ch / bmp.height) * 0.72 : Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    const y = portrait ? ch * 0.36 - h / 2 : (ch - h) / 2;
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - w) / 2, y, w, h);
  };

  // decode every frame once, nothing is decoded while scrolling
  useEffect(() => {
    let cancelled = false;
    bitmaps.current = new Array(N).fill(null);
    const maxW = window.innerWidth < 768 ? 640 : 960;
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (!cancelled) {
        const i = next++;
        if (i >= N) return;
        try {
          const blob = await (await fetch(frames[i])).blob();
          let bmp: ImageBitmap;
          try {
            bmp = await createImageBitmap(blob, { resizeWidth: maxW, resizeQuality: 'medium' });
          } catch {
            bmp = await createImageBitmap(blob);
          }
          if (cancelled) {
            bmp.close?.();
            return;
          }
          bitmaps.current[i] = bmp;
        } catch {
          /* skip a broken frame */
        }
        done++;
        if (!cancelled) {
          setLoaded(done);
          if (i < 8 && lastIdx.current <= 0) draw(0);
        }
      }
    };
    for (let k = 0; k < 4; k++) void worker();
    return () => {
      cancelled = true;
      bitmaps.current.forEach((b) => b?.close?.());
      bitmaps.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [car.id]);

  useEffect(() => {
    const box = boxRef.current;
    const canvas = canvasRef.current;
    if (!box || !canvas) return;
    let target = 0;
    let shown = -1;
    let ticking = false;
    let raf = 0;

    const update = (p: number) => {
      const idx = Math.round(p * (N - 1));
      if (idx !== lastIdx.current) {
        lastIdx.current = idx;
        draw(idx);
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      scenes.forEach((sc, i) => {
        const el = sceneRefs.current[i];
        if (!el) return;
        const fade = 0.06;
        const o = clamp(Math.min((p - sc.from) / fade, (sc.to - p) / fade), 0, 1);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 24}px)`;
      });
    };
    const readTarget = () => {
      const total = box.scrollHeight - box.clientHeight;
      target = clamp(box.scrollTop / Math.max(1, total), 0, 1);
    };
    const tick = () => {
      shown = shown < 0 ? target : shown + (target - shown) * 0.18;
      if (Math.abs(target - shown) < 0.0002) shown = target;
      update(shown);
      if (shown !== target) raf = requestAnimationFrame(tick);
      else ticking = false;
    };
    const onScroll = () => {
      readTarget();
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(tick);
      }
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      lastIdx.current = -1;
      readTarget();
      shown = target;
      update(shown);
    };
    resize();
    box.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      box.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded === N, car.id]);

  return (
    <div ref={boxRef} className="absolute inset-0 z-10 overflow-y-auto bg-[#090d14]" style={{ overscrollBehavior: 'contain' }}>
      <div style={{ height: '700%' }}>
        <div className="sticky top-0" style={{ height: `${100 / 7}%` }}>
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-[#090d14]/30 to-[#090d14]/60 pointer-events-none" />

          {scenes.map((sc, i) => (
            <div
              key={i}
              ref={(el) => {
                sceneRefs.current[i] = el;
              }}
              className="absolute inset-x-0 top-[236px] sm:top-auto sm:bottom-0 px-4 sm:px-12 sm:pb-28 lg:pr-[440px] pointer-events-none"
              style={{ opacity: 0 }}
            >
              <div className="max-w-2xl text-white rounded-xl bg-[#090d14]/70 sm:bg-transparent p-3 sm:p-0 backdrop-blur-sm sm:backdrop-blur-none">
                <div className="text-[11px] sm:text-xs font-bold tracking-[0.3em] uppercase text-amber-400 mb-2">{sc.kicker}</div>
                <h2 className="text-xl sm:text-4xl font-extrabold leading-tight mb-2">{sc.title}</h2>
                <p className="text-xs sm:text-base text-white/80 line-clamp-3 sm:line-clamp-none">{sc.text}</p>
              </div>
            </div>
          ))}

          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
            <div ref={barRef} className="h-full bg-amber-400 origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>

          {loaded < N && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d14] gap-3">
              <div className="text-xs tracking-[0.3em] uppercase text-white/60">{hy ? 'Բեռնվում է' : 'Loading'}</div>
              <div className="w-40 h-[3px] bg-white/10 rounded">
                <div className="h-full bg-amber-400 rounded transition-all" style={{ width: `${(loaded / N) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
