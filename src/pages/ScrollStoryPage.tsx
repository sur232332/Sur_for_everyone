import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import type { Language, PageRoute } from '../types/hardware';

interface Props {
  lang: Language;
  onNavigate: (route: PageRoute) => void;
}

type L = { en: string; hy: string };
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** One cinematic journey (10 s video, every frame). Scrolling moves the camera through the whole site. */
const FRAME_COUNT = 240;
const FRAMES = Array.from({ length: FRAME_COUNT }, (_, i) => `/story/f240/${String(i + 1).padStart(3, '0')}.jpg`);

interface Cta {
  label: L;
  route: PageRoute;
  primary?: boolean;
}

interface Scene {
  from: number;
  to: number;
  kicker: L;
  title: L;
  text: L;
  align: 'left' | 'right' | 'center';
  chips?: L[];
  ctas?: Cta[];
}

const SCENES: Scene[] = [
  {
    from: -0.1,
    to: 0.12,
    kicker: { en: 'Silicon Pulse', hy: 'Silicon Pulse' },
    title: { en: 'Cars, tech and home. All in 3D.', hy: 'Մեքենաներ, տեխնիկա և տուն։ Բոլորը 3D-ով։' },
    text: {
      en: 'Scroll down. The camera walks you through the whole site.',
      hy: 'Ոլորիր ներքև. տեսախցիկը քեզ կտանի ամբողջ կայքով։',
    },
    align: 'left',
  },
  {
    from: 0.15,
    to: 0.3,
    kicker: { en: '01 / Cars', hy: '01 / Մեքենաներ' },
    title: { en: 'Walk around every car in 360°', hy: 'Պտտվիր ամեն մեքենայի շուրջ՝ 360°' },
    text: {
      en: 'Real photos, price, specs, engine sound and a financing calculator. Each car opens in its own window.',
      hy: 'Իրական նկարներ, գին, բնութագրեր, շարժիչի ձայն և վարկի հաշվիչ։ Ամեն մեքենա բացվում է իր սեփական պատուհանում։',
    },
    align: 'right',
    ctas: [{ label: { en: 'Open the car gallery', hy: 'Բացել ավտոսրահը' }, route: 'motor-gallery', primary: true }],
  },
  {
    from: 0.34,
    to: 0.47,
    kicker: { en: '02 / Tech', hy: '02 / Տեխնիկա' },
    title: { en: 'Phones and laptops in 3D and AR', hy: 'Հեռախոսներ և լաբթոփներ՝ 3D և AR' },
    text: {
      en: 'Samsung, Apple and Huawei devices you can spin, open up and compare side by side.',
      hy: 'Samsung, Apple և Huawei սարքեր, որոնք կարելի է պտտել, ապամոնտաժել և համեմատել կողք կողքի։',
    },
    align: 'left',
    ctas: [{ label: { en: 'Open the tech showroom', hy: 'Բացել տեխնիկայի սրահը' }, route: 'showroom', primary: true }],
  },
  {
    from: 0.5,
    to: 0.62,
    kicker: { en: '03 / Home', hy: '03 / Տուն' },
    title: { en: 'Walk through a 3D apartment', hy: 'Շրջիր 3D բնակարանում' },
    text: {
      en: 'Fridges, washers and stoves with real market prices, placed in a real-looking home.',
      hy: 'Սառնարաններ, լվացքի մեքենաներ և վառարաններ՝ իրական գներով, իրական տան մեջ։',
    },
    align: 'left',
    ctas: [{ label: { en: 'Open the home walkthrough', hy: 'Բացել տան շրջայցը' }, route: 'home-guide', primary: true }],
  },
  {
    from: 0.66,
    to: 0.79,
    kicker: { en: '04 / Catalog', hy: '04 / Կատալոգ' },
    title: { en: 'Anyone can sell. Film once, get a 360°.', hy: 'Ցանկացածը կարող է վաճառել։ Մեկ տեսանյութ՝ և ստացիր 360°։' },
    text: {
      en: 'Walk around your item with your phone, upload the video, and the site builds the turn-around view for you.',
      hy: 'Պտտվիր ապրանքի շուրջ հեռախոսով, վերբեռնիր տեսանյութը, և կայքն ինքը կսարքի պտտվող տեսքը։',
    },
    align: 'right',
    chips: [
      { en: '1 Film', hy: '1 Նկարիր' },
      { en: '2 Upload', hy: '2 Վերբեռնիր' },
      { en: '3 Get a 360°', hy: '3 Ստացիր 360°' },
    ],
    ctas: [{ label: { en: 'Open the catalog', hy: 'Բացել կատալոգը' }, route: 'catalog', primary: true }],
  },
  {
    from: 0.83,
    to: 9,
    kicker: { en: '05 / My Lot', hy: '05 / Իմ Լոտ' },
    title: { en: 'Your own garage', hy: 'Քո սեփական ավտոտնակը' },
    text: {
      en: 'Keep your cars, get reminders for insurance, inspection and oil, and sell with one tap.',
      hy: 'Պահիր քո մեքենաները, ստացիր հիշեցումներ ապահովագրության, զննման և յուղի մասին, վաճառիր մեկ սեղմումով։',
    },
    align: 'center',
    chips: [
      { en: 'Insurance', hy: 'Ապահովագրություն' },
      { en: 'Inspection', hy: 'Զննում' },
      { en: 'Oil change', hy: 'Յուղի փոխում' },
    ],
    ctas: [
      { label: { en: 'Open My Lot', hy: 'Բացել Իմ Լոտը' }, route: 'my-lot', primary: true },
      { label: { en: 'Car gallery', hy: 'Ավտոսրահ' }, route: 'motor-gallery' },
    ],
  },
];

/** decode a JPEG blob; falls back for browsers (iOS Safari) without resize options */
async function decodeBlob(blob: Blob, maxW: number): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(blob, { resizeWidth: maxW, resizeQuality: 'medium' });
  } catch {
    /* try plain decode */
  }
  try {
    return await createImageBitmap(blob);
  } catch {
    /* try <img> decode */
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img as unknown as ImageBitmap;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ScrollStoryPage({ lang, onNavigate }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bitmapsRef = useRef<(ImageBitmap | null)[]>([]);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const lastIdxRef = useRef(-1);
  const [loaded, setLoaded] = useState(0);

  // Frames stay as small compressed files in memory; only the ones near the current scroll position are decoded
  const blobsRef = useRef<(Blob | null)[]>([]);
  const pendingRef = useRef<Set<number>>(new Set());

  const nearest = (idx: number): ImageBitmap | null => {
    const m = bitmapsRef.current;
    for (let d = 0; d < FRAME_COUNT; d++) {
      const a = m[idx - d];
      if (a) return a;
      const b = m[idx + d];
      if (b) return b;
    }
    return null;
  };

  const draw = (idx: number) => {
    const canvas = canvasRef.current;
    const bmp = nearest(idx);
    if (!canvas || !bmp) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cw = canvas.width;
    const ch = canvas.height;
    const portrait = ch > cw;
    // Phones are tall: fit by height so the centre of the scene stays visible
    const s = portrait ? (ch / bmp.height) * 0.72 : Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    const y = portrait ? ch * 0.36 - h / 2 : (ch - h) / 2;
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - w) / 2, y, w, h);
  };

  /** decode the frames around idx and free the far ones */
  const ensureAround = (idx: number) => {
    const m = bitmapsRef.current;
    const maxW = window.innerWidth < 768 ? 720 : 1280;
    for (let d = 0; d <= 30; d++) {
      for (const k of d === 0 ? [idx] : [idx - d, idx + d]) {
        if (k < 0 || k >= FRAME_COUNT || m[k] || pendingRef.current.has(k)) continue;
        const blob = blobsRef.current[k];
        if (!blob) continue;
        pendingRef.current.add(k);
        void decodeBlob(blob, maxW)
          .then((bmp) => {
            pendingRef.current.delete(k);
            if (bitmapsRef.current.length === 0) {
              (bmp as ImageBitmap).close?.();
              return;
            }
            bitmapsRef.current[k] = bmp;
            if (Math.abs(k - lastIdxRef.current) <= 1) draw(lastIdxRef.current);
          })
          .catch(() => pendingRef.current.delete(k));
      }
    }
    for (let k = 0; k < FRAME_COUNT; k++) {
      if (m[k] && Math.abs(k - idx) > 70) {
        m[k]?.close?.();
        m[k] = null;
      }
    }
  };

  // download all frames (small JPEG files) in parallel
  useEffect(() => {
    let cancelled = false;
    bitmapsRef.current = new Array(FRAME_COUNT).fill(null);
    blobsRef.current = new Array(FRAME_COUNT).fill(null);
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (!cancelled) {
        const i = next++;
        if (i >= FRAME_COUNT) return;
        try {
          blobsRef.current[i] = await (await fetch(FRAMES[i])).blob();
        } catch {
          /* skip a broken frame */
        }
        done++;
        if (!cancelled) {
          setLoaded(done);
          const cur = lastIdxRef.current < 0 ? 0 : lastIdxRef.current;
          if (Math.abs(i - cur) <= 30) {
            ensureAround(cur);
            if (lastIdxRef.current <= 0) draw(0);
          }
        }
      }
    };
    for (let k = 0; k < 6; k++) void worker();
    return () => {
      cancelled = true;
      bitmapsRef.current.forEach((b) => b?.close?.());
      bitmapsRef.current = [];
      blobsRef.current = [];
      pendingRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // scroll loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    let target = 0;
    let shown = -1;
    let ticking = false;
    const readTarget = () => {
      const rect = wrap.getBoundingClientRect();
      const total = wrap.offsetHeight - window.innerHeight;
      target = clamp(-rect.top / Math.max(1, total * 0.97), 0, 1);
    };
    const tick = () => {
      // ease toward the scroll position so frames glide instead of jumping
      shown = shown < 0 ? target : shown + (target - shown) * 0.18;
      if (Math.abs(target - shown) < 0.00015) shown = target;
      update(shown);
      if (shown !== target) requestAnimationFrame(tick);
      else ticking = false;
    };
    const update = (p: number) => {
      const idx = Math.round(p * (FRAME_COUNT - 1));
      if (idx !== lastIdxRef.current) {
        lastIdxRef.current = idx;
        ensureAround(idx);
        draw(idx);
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      if (hintRef.current) hintRef.current.style.opacity = p < 0.03 ? '1' : '0';
      SCENES.forEach((sc, i) => {
        const el = sceneRefs.current[i];
        if (!el) return;
        const fade = 0.03;
        const o = clamp(Math.min((p - sc.from) / fade, (sc.to - p) / fade), 0, 1);
        el.style.opacity = String(o);
        el.style.transform = `translateY(${(1 - o) * 24}px)`;
        el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      });
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      lastIdxRef.current = -1;
      readTarget();
      shown = target;
      update(shown);
    };

    let raf = 0;
    const onScroll = () => {
      readTarget();
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(tick);
      }
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
  }, [loaded === FRAME_COUNT]);

  const ready = loaded >= FRAME_COUNT;
  const hy = lang === 'hy';

  return (
    <div className="bg-[#090d14] text-white">
      <div ref={wrapRef} className="relative" style={{ height: '2000vh' }}>
        <div className="sticky top-14 sm:top-16 h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

          {/* readability gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d14] via-[#090d14]/30 to-[#090d14]/60 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090d14]/60 via-transparent to-[#090d14]/60 pointer-events-none" />

          <div className="absolute top-3 sm:top-5 left-4 sm:left-8 text-xs sm:text-sm font-bold tracking-[0.18em] text-amber-400">
            SILICON PULSE
          </div>

          {SCENES.map((sc, i) => (
            <div
              key={i}
              ref={(el) => {
                sceneRefs.current[i] = el;
              }}
              style={{ opacity: 0 }}
              className={`absolute inset-x-0 bottom-[10%] sm:bottom-[14%] px-5 sm:px-12 flex ${
                sc.align === 'left'
                  ? 'justify-start text-left'
                  : sc.align === 'right'
                    ? 'justify-end text-left sm:text-right'
                    : 'justify-center text-center'
              }`}
            >
              <div className="max-w-md sm:max-w-xl [text-shadow:0_2px_18px_rgba(0,0,0,0.9)]">
                <div className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-amber-400 mb-2">{sc.kicker[lang]}</div>
                <h2 className="text-3xl sm:text-5xl font-bold leading-tight tracking-tight">{sc.title[lang]}</h2>
                <p className="mt-3 text-sm sm:text-base text-white/80 leading-relaxed">{sc.text[lang]}</p>
                {sc.chips && (
                  <div
                    className={`mt-3 flex flex-wrap gap-2 ${
                      sc.align === 'center' ? 'justify-center' : sc.align === 'right' ? 'sm:justify-end' : ''
                    }`}
                  >
                    {sc.chips.map((c) => (
                      <span
                        key={c.en}
                        className="rounded-full border border-white/25 bg-black/40 backdrop-blur px-3 py-1 text-xs sm:text-sm"
                      >
                        {c[lang]}
                      </span>
                    ))}
                  </div>
                )}
                {sc.ctas && (
                  <div
                    className={`mt-5 flex flex-wrap gap-3 ${
                      sc.align === 'center' ? 'justify-center' : sc.align === 'right' ? 'sm:justify-end' : ''
                    }`}
                  >
                    {sc.ctas.map((c) => (
                      <button
                        key={c.route}
                        type="button"
                        onClick={() => onNavigate(c.route)}
                        className={`inline-flex items-center gap-2 rounded-full font-semibold text-sm px-6 py-3 transition-colors cursor-pointer [text-shadow:none] ${
                          c.primary
                            ? 'bg-amber-400 hover:bg-amber-300 text-black'
                            : 'border border-white/40 hover:border-amber-400 text-white bg-black/30'
                        }`}
                      >
                        {c.label[lang]}
                        {c.primary && <ArrowRight className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div
            ref={hintRef}
            className="absolute bottom-6 inset-x-0 flex flex-col items-center gap-1 text-[10px] tracking-[0.3em] uppercase text-white/60 transition-opacity duration-300 pointer-events-none"
          >
            {hy ? 'Ոլորիր' : 'Scroll'}
            <ChevronDown className="w-4 h-4 animate-bounce" />
          </div>

          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
            <div ref={barRef} className="h-full bg-amber-400 origin-left" style={{ transform: 'scaleX(0)' }} />
          </div>

          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d14] gap-3">
              <div className="text-xs tracking-[0.3em] uppercase text-white/60">{hy ? 'Բեռնվում է' : 'Loading'}</div>
              <div className="w-40 h-[3px] bg-white/10 rounded">
                <div className="h-full bg-amber-400 rounded transition-all" style={{ width: `${(loaded / FRAME_COUNT) * 100}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
