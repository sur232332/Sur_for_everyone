import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { LUXURY_CARS } from '../data/luxuryCarsData';
import type { Language } from '../types/hardware';

interface Props {
  lang: Language;
  onOpenCar: (carId: string) => void;
}

interface Scene {
  from: number;
  to: number;
  kicker: { en: string; hy: string };
  title: { en: string; hy: string };
  text: { en: string; hy: string };
  align: 'left' | 'right' | 'center';
}

const SCENES: Scene[] = [
  {
    from: -0.1,
    to: 0.2,
    kicker: { en: '01 / The icon', hy: '01 / Խորհրդանիշը' },
    title: { en: 'Porsche 911 GT3', hy: 'Porsche 911 GT3' },
    text: {
      en: 'Scroll down and walk around the car, frame by frame.',
      hy: 'Ոլորիր ներքև և պտտվիր մեքենայի շուրջը՝ կադր առ կադր։',
    },
    align: 'left',
  },
  {
    from: 0.27,
    to: 0.47,
    kicker: { en: '02 / The engine', hy: '02 / Շարժիչը' },
    title: { en: '502 hp. 9,000 rpm.', hy: '502 ձիուժ. 9,000 պտ/րոպե' },
    text: {
      en: 'A naturally aspirated 4.0 L flat-six that sings all the way to the redline.',
      hy: '4.0 լ ատմոսֆերային շարժիչ, որը երգում է մինչև վերջին պտույտը։',
    },
    align: 'right',
  },
  {
    from: 0.54,
    to: 0.74,
    kicker: { en: '03 / Every angle', hy: '03 / Ամեն անկյուն' },
    title: { en: '0–60 in 3.2 s', hy: '0–100 կմ/ժ՝ 3.2 վրկ' },
    text: {
      en: 'Carbon wing, ceramic brakes, top speed 197 mph. Nothing hidden.',
      hy: 'Ածխածնային թև, կերամիկական արգելակներ, առավելագույն արագությունը՝ 317 կմ/ժ։',
    },
    align: 'left',
  },
  {
    from: 0.8,
    to: 9,
    kicker: { en: '04 / Yours', hy: '04 / Քոնն է' },
    title: { en: 'Step into the gallery', hy: 'Մտիր սրահ' },
    text: {
      en: 'Spin it with your finger, check the price and try the financing.',
      hy: 'Պտտիր մատով, տես գինը և փորձիր վարկի հաշվիչը։',
    },
    align: 'center',
  },
];

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function ScrollStoryPage({ lang, onOpenCar }: Props) {
  const car = LUXURY_CARS.find((c) => c.id === 'porsche-911-gt3') ?? LUXURY_CARS[0];
  const frames = car.spinFrames ?? [];
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapsRef = useRef<(ImageBitmap | null)[]>([]);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const lastIdxRef = useRef(-1);
  const [loaded, setLoaded] = useState(0);

  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    const bmp = bitmapsRef.current[idx] ?? bitmapsRef.current.find(Boolean) ?? null;
    if (!canvas || !bmp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const portrait = ch > cw;
    // Phones: keep the whole car in view (fit by width) and lift it above the text
    const s = portrait ? (cw / bmp.width) * 1.3 : Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    const y = portrait ? ch * 0.36 - h / 2 : (ch - h) / 2;
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - w) / 2, y, w, h);
  };

  // Load + decode frames
  useEffect(() => {
    let cancelled = false;
    const maxW = window.innerWidth < 768 ? 880 : 1280;
    bitmapsRef.current = new Array(frames.length).fill(null);
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (!cancelled) {
        const i = next++;
        if (i >= frames.length) return;
        try {
          const blob = await (await fetch(frames[i])).blob();
          const probe = await createImageBitmap(blob);
          const scale = Math.min(1, maxW / probe.width);
          const bmp =
            scale < 1
              ? await createImageBitmap(blob, {
                  resizeWidth: Math.round(probe.width * scale),
                  resizeQuality: 'high',
                })
              : probe;
          if (scale < 1) probe.close();
          if (cancelled) {
            bmp.close();
            return;
          }
          bitmapsRef.current[i] = bmp;
        } catch {
          /* skip broken frame */
        }
        done++;
        if (!cancelled) {
          setLoaded(done);
          if (i === 0) draw(0);
        }
      }
    };
    for (let k = 0; k < 6; k++) void worker();
    return () => {
      cancelled = true;
      bitmapsRef.current.forEach((b) => b?.close());
      bitmapsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Canvas size + scroll loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      lastIdxRef.current = -1;
      update();
    };

    const update = () => {
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      const p = clamp(-rect.top / Math.max(1, total * 0.93), 0, 1);
      const idx = Math.round(p * (frames.length - 1));
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        draw(idx);
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (hintRef.current) hintRef.current.style.opacity = p < 0.04 ? '1' : '0';
      SCENES.forEach((sc, i) => {
        const el = sceneRefs.current[i];
        if (!el) return;
        const fade = 0.04;
        const o = clamp(Math.min((p - sc.from) / fade, (sc.to - p) / fade), 0, 1);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 24}px)`;
        el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      });
    };

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    resize();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded === frames.length]);

  const ready = loaded >= Math.min(frames.length, 12);

  return (
    <div className="bg-[#090d14] text-white">
      <div ref={wrapRef} className="relative" style={{ height: '520vh' }}>
        <div className="sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* readability gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-[#090d14]/25 to-[#090d14]/70 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090d14]/70 via-transparent to-[#090d14]/70 pointer-events-none" />

          {/* brand strip */}
          <div className="absolute top-3 sm:top-5 left-4 sm:left-8 flex items-center gap-2 tracking-[0.18em] text-xs sm:text-sm font-bold">
            <span className="text-amber-400">KALBERA</span>
            <span className="text-white/30">|</span>
            <span className="text-white/70 font-medium uppercase">
              {lang === 'hy' ? 'Պատմություն' : 'Story'}
            </span>
          </div>

          {/* scenes */}
          {SCENES.map((sc, i) => (
            <div
              key={i}
              ref={(el) => {
                sceneRefs.current[i] = el;
              }}
              style={{ opacity: 0 }}
              className={`absolute inset-x-0 bottom-[14%] sm:bottom-[18%] px-5 sm:px-12 flex ${
                sc.align === 'left'
                  ? 'justify-start text-left'
                  : sc.align === 'right'
                    ? 'justify-end text-left sm:text-right'
                    : 'justify-center text-center'
              }`}
            >
              <div className="max-w-md sm:max-w-lg [text-shadow:0_2px_18px_rgba(0,0,0,0.85)]">
                <div className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-amber-400 mb-2">
                  {sc.kicker[lang]}
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">
                  {sc.title[lang]}
                </h2>
                <p className="mt-3 text-sm sm:text-base text-white/75 leading-relaxed">
                  {sc.text[lang]}
                </p>
                {i === SCENES.length - 1 && (
                  <button
                    type="button"
                    onClick={() => onOpenCar(car.id)}
                    className="mt-5 inline-flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-semibold text-sm px-6 py-3 transition-colors cursor-pointer"
                  >
                    {lang === 'hy' ? 'Բացել սրահում' : 'Open in the gallery'}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* scroll hint */}
          <div
            ref={hintRef}
            className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-1 text-[10px] tracking-[0.3em] uppercase text-white/60 transition-opacity duration-300 pointer-events-none"
          >
            {lang === 'hy' ? 'Ոլորիր' : 'Scroll'}
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>

          {/* progress bar */}
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
            <div
              ref={barRef}
              className="h-full bg-amber-400 origin-left"
              style={{ transform: 'scaleX(0)' }}
            />
          </div>

          {/* loader */}
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d14] gap-3">
              <div className="text-xs tracking-[0.3em] uppercase text-white/60">
                {lang === 'hy' ? 'Բեռնվում է' : 'Loading'}
              </div>
              <div className="w-40 h-[3px] bg-white/10 rounded">
                <div
                  className="h-full bg-amber-400 rounded transition-all"
                  style={{ width: `${(loaded / Math.max(1, frames.length)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
