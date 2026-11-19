import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Language } from '../types/hardware';
import { DEVICES } from '../data/devices';

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

interface Props {
  frames: string[];
  mobileFrames?: string[];
  deviceId: string;
  lang: Language;
  onClose: () => void;
}

interface Scene {
  from: number;
  to: number;
  kicker: string;
  title: string;
  text?: string;
  stats?: Array<{ v: string; l: string }>;
  swatches?: Array<{ hex: string; name: string }>;
}

/** Own full-screen window: scroll inside it to walk around the device while its parameters appear. */
export function DeviceScrollStory({ frames: desktopFrames, mobileFrames, deviceId, lang, onClose }: Props) {
  const hy = lang === 'hy';
  const device = DEVICES.find((d) => d.id === deviceId);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const frames = isMobile && mobileFrames ? mobileFrames : desktopFrames;
  const N = frames.length;
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const barRef = useRef<HTMLDivElement>(null);
  const bitmaps = useRef<(ImageBitmap | null)[]>([]);
  const lastIdx = useRef(-1);
  const [loaded, setLoaded] = useState(0);

  // all texts and numbers come from the device data of the site
  const scenes: Scene[] = useMemo(() => {
    if (!device) return [];
    const s = device.specs;
    const b = device.benchmarks;
    return [
      {
        from: -0.1,
        to: 0.16,
        kicker: 'Samsung · 2024',
        title: device.name,
        text: device.tagline[lang],
        stats: [
          { v: `$${device.basePriceUsd.toLocaleString('en-US')}`, l: hy ? 'սկսած' : 'from' },
          { v: `${device.weightGrams} g`, l: hy ? 'քաշ' : 'weight' },
        ],
      },
      {
        from: 0.17,
        to: 0.27,
        kicker: hy ? 'Էկրան' : 'Display',
        title: s.display[lang].split(' · ')[0],
        text: hy ? 'Հարթ Gorilla Armor ապակի՝ նվազեցված անդրադարձով։' : 'Flat Gorilla Armor glass with reduced reflections.',
        stats: [
          { v: `${device.numericMetrics.screenInches}"`, l: hy ? 'անկյունագիծ' : 'diagonal' },
          { v: '120 Hz', l: hy ? 'թարմացում' : 'refresh rate' },
          { v: `${b.peakNits}`, l: hy ? 'նիտ' : 'nits peak' },
        ],
      },
      {
        from: 0.28,
        to: 0.47,
        kicker: 'S Pen',
        title: hy ? 'Գրիչը՝ միշտ ձեռքի տակ' : 'The pen is always with you',
        text: hy
          ? 'Ներկառուցված S Pen՝ ներքևի եզրում։ Հանեք, գրեք կամ նկարեք անմիջապես էկրանին։'
          : 'Built-in S Pen in the bottom edge. Pull it out and write or draw right on the screen.',
        stats: [
          { v: '1.9x', l: hy ? 'ավելի մեծ հովացում' : 'larger cooling chamber' },
        ],
      },
      {
        from: 0.48,
        to: 0.58,
        kicker: hy ? 'Կորպուս' : 'Build',
        title: hy ? 'Տիտան և Gorilla Armor' : 'Titanium & Gorilla Armor',
        text: s.chassis[lang],
        stats: [
          { v: `${device.dimensionsMm.depth} mm`, l: hy ? 'հաստություն' : 'thickness' },
          { v: 'IP68', l: hy ? 'ջրակայուն' : 'water-resistant' },
        ],
      },
      {
        from: 0.59,
        to: 0.78,
        kicker: hy ? 'Տեսախցիկներ' : 'Cameras',
        title: s.camera[lang].split(' + ')[0],
        text: s.camera[lang],
        stats: [
          { v: '200 MP', l: hy ? 'հիմնական' : 'main' },
          { v: '50 MP', l: hy ? '5x պերիսկոպ' : '5x periscope' },
          { v: '10 MP', l: '3x' },
          { v: '12 MP', l: hy ? 'գերլայն' : 'ultra-wide' },
        ],
      },
      {
        from: 0.79,
        to: 0.89,
        kicker: hy ? 'Արտադրողականություն' : 'Performance',
        title: 'Snapdragon 8 Gen 3',
        text: `${s.memory[lang]} · ${s.battery[lang]}`,
        stats: [
          { v: `${b.multiCore}`, l: hy ? 'բազմամիջուկ' : 'multi-core' },
          { v: '12 GB', l: 'RAM' },
          { v: '5,000 mAh', l: hy ? 'մարտկոց' : 'battery' },
        ],
      },
      {
        from: 0.9,
        to: 9,
        kicker: hy ? 'Գույներ և հիշողություն' : 'Colors & storage',
        title: device.storageOptions.map((o) => o.label).join(' · '),
        swatches: device.finishes.map((f) => ({ hex: f.hex, name: f.name[lang] })),
      },
    ];
  }, [device, lang, hy]);


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
    // phone screens are tall: show the central part of the wide video frame
    const s = portrait
      ? Math.max(cw / bmp.width, (ch * 0.58) / bmp.height)
      : Math.max(cw / bmp.width, ch / bmp.height);
    const w = bmp.width * s;
    const h = bmp.height * s;
    const y = portrait ? ch * 0.36 - h / 2 : (ch - h) / 2;
    ctx.fillStyle = '#0b0805';
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(bmp, (cw - w) / 2, y, w, h);
  };

  // decode every frame once, nothing is decoded while scrolling
  useEffect(() => {
    let cancelled = false;
    bitmaps.current = new Array(N).fill(null);
    const maxW = isMobile ? 720 : 1280;
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
  }, [frames]);

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
      // slow zoom-in while scrolling
      canvas.style.transform = `scale(${1 + 0.06 * p})`;
      if (barRef.current) barRef.current.style.transform = `scaleX(${p})`;
      let cur = 0;
      scenes.forEach((sc, i) => {
        if (p >= sc.from - 0.005) cur = i;
      });
      scenes.forEach((_, i) => {
        const el = sceneRefs.current[i];
        if (el) {
          const from = scenes[i].from;
          const to = scenes[i].to;
          const fade = 0.02;
          const o = clamp(Math.min((p - from) / fade, (to - p) / fade), 0, 1);
          el.style.opacity = String(o);
          el.style.transform = `translateY(${(1 - o) * 28}px)`;
        }
        const dot = dotRefs.current[i];
        if (dot) {
          dot.style.opacity = i === cur ? '1' : '0.3';
          dot.style.transform = i === cur ? 'scale(1.5)' : 'scale(1)';
        }
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
  }, [loaded === N, frames, scenes]);

  // Esc closes the window
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!device) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-[#0b0805]">
      <div ref={boxRef} className="absolute inset-0 overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
        <div style={{ height: '800%' }}>
          <div className="sticky top-0" style={{ height: `${100 / 8}%` }}>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full will-change-transform" />
            {/* very light bottom fade only, so the picture stays bright */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0b0805]/70 to-transparent pointer-events-none" />

            {scenes.map((sc, i) => (
              <div
                key={i}
                ref={(el) => {
                  sceneRefs.current[i] = el;
                }}
                className="absolute inset-x-0 bottom-0 px-4 sm:px-12 pb-12 sm:pb-20 pointer-events-none"
                style={{ opacity: 0 }}
              >
                <div className="max-w-2xl text-white rounded-2xl bg-[#0b0805]/55 sm:bg-transparent border border-white/10 sm:border-0 p-4 sm:p-0 backdrop-blur-md sm:backdrop-blur-none">
                  <div className="text-[11px] sm:text-xs font-bold tracking-[0.3em] uppercase text-amber-400 mb-2">{sc.kicker}</div>
                  <h2 className="text-2xl sm:text-5xl font-extrabold leading-tight mb-2">{sc.title}</h2>
                  {sc.text && <p className="text-xs sm:text-base text-white/75 mb-3 line-clamp-3 sm:line-clamp-none">{sc.text}</p>}
                  {sc.stats && (
                    <div className="flex flex-wrap gap-2 sm:gap-3">
                      {sc.stats.map((st) => (
                        <div key={st.l} className="min-w-[76px] rounded-xl bg-white/[0.07] border border-white/10 px-3 py-2 backdrop-blur">
                          <div className="text-lg sm:text-2xl font-extrabold bg-gradient-to-b from-amber-200 to-amber-500 bg-clip-text text-transparent leading-none">{st.v}</div>
                          <div className="text-[10px] sm:text-xs text-white/60 mt-1">{st.l}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  {sc.swatches && (
                    <div className="flex flex-wrap gap-3 mt-1">
                      {sc.swatches.map((sw) => (
                        <div key={sw.name} className="flex items-center gap-2 rounded-full bg-white/[0.07] border border-white/10 pl-1.5 pr-3 py-1.5 backdrop-blur">
                          <span className="w-5 h-5 rounded-full border border-white/30" style={{ background: sw.hex }} />
                          <span className="text-[11px] sm:text-xs text-white/80">{sw.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* section dots */}
            <div className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 flex flex-col gap-2.5 pointer-events-none">
              {scenes.map((_, i) => (
                <span
                  key={i}
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  className="block w-1.5 h-1.5 rounded-full bg-amber-400 transition-all duration-300"
                  style={{ opacity: 0.3 }}
                />
              ))}
            </div>

            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white/10">
              <div ref={barRef} className="h-full bg-gradient-to-r from-amber-300 to-amber-500 origin-left" style={{ transform: 'scaleX(0)' }} />
            </div>

            {loaded < N && (
              <div className="absolute top-4 left-4 text-[11px] text-white/60 pointer-events-none">
                {hy ? 'Բեռնվում է' : 'Loading'} {Math.round((loaded / N) * 100)}%
              </div>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 z-10 p-2.5 rounded-full bg-white/15 text-white backdrop-blur cursor-pointer"
        aria-label={hy ? 'Փակել' : 'Close'}
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}
