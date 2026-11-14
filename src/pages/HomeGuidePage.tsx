import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import {
  ArrowDown,
  Box,
  CheckCircle2,
  Cpu,
  ExternalLink,
  Eye,
  Flame,
  Grid,
  Layers,
  Link2,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import {
  APPLIANCE_MODELS,
  APPLIANCE_SCENE_ITEMS,
  ApplianceCategoryId,
  ApplianceModelSpec,
  GroundedExchangeRate,
  GroundedPriceResult,
  HOME_ZONES,
  HomeZoneId,
  SKETCHFAB_APPLIANCE_CONFIG,
  parseSketchfabConfig,
} from '../data/homeGuideData';
import { DEVICES } from '../data/devices';
import { ApplianceInteractiveState } from '../three/buildHomeAppliances';
import { HomeApartment3D } from '../components/HomeApartment3D';
import { ApplianceCloseup3D } from '../components/ApplianceCloseup3D';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { BrandId, DeviceSpec, Language, LivePriceEntry } from '../types/hardware';
import { formatDevicePrice } from '../hooks/useLivePricing';

interface HomeGuidePageProps {
  lang: Language;
  darkMode: boolean;
  onOpenGalleryView: () => void;
  onNavigateDevice?: (brand: BrandId, deviceId: string) => void;
  onOpenAR?: (device: DeviceSpec, finishId?: string) => void;
  devicePrices?: Record<string, LivePriceEntry>;
}

const PRICE_CACHE_KEY = 'sp_home_guide_prices_v1';
const FX_CACHE_KEY = 'sp_home_guide_fx_v1';
const SKETCHFAB_OVERRIDES_KEY = 'sp_sketchfab_urls_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Baseline MSRP fallback for floating Scrollytelling story cards when live lookup hasn't resolved yet
const APPLIANCE_REF_PRICE_USD: Record<ApplianceCategoryId, number> = {
  refrigerator: 2299,
  gas_stove: 1499,
  microwave: 349,
  washing_machine: 1149,
  dryer: 1099,
  laptop: 3499,
};

const ZONE_SCROLL_RATIOS: Record<HomeZoneId, number> = {
  all: 0.03,
  kitchen: 0.36,
  laundry: 0.62,
  office: 0.89,
};

function loadPriceCache(): Record<string, GroundedPriceResult> {
  try {
    const raw = localStorage.getItem(PRICE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, GroundedPriceResult>;
    const now = Date.now();
    const valid: Record<string, GroundedPriceResult> = {};
    for (const [k, val] of Object.entries(parsed)) {
      if (val && val.updatedAt) {
        const age = now - new Date(val.updatedAt).getTime();
        if (age < CACHE_TTL_MS) {
          valid[k] = val;
        }
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function savePriceCache(cache: Record<string, GroundedPriceResult>) {
  try {
    localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage errors
  }
}

function loadFxCache(): GroundedExchangeRate | null {
  try {
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GroundedExchangeRate;
    if (parsed && parsed.updatedAt) {
      const age = Date.now() - new Date(parsed.updatedAt).getTime();
      if (age < CACHE_TTL_MS && parsed.found && parsed.rate) {
        return parsed;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function saveFxCache(fx: GroundedExchangeRate) {
  try {
    localStorage.setItem(FX_CACHE_KEY, JSON.stringify(fx));
  } catch {
    // ignore
  }
}

function loadSketchfabOverrides(): Partial<Record<ApplianceCategoryId, string>> {
  try {
    const raw = localStorage.getItem(SKETCHFAB_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<ApplianceCategoryId, string>>;
  } catch {
    return {};
  }
}

export const HomeGuidePage: React.FC<HomeGuidePageProps> = ({
  lang,
  darkMode,
  onOpenGalleryView,
  onNavigateDevice,
  onOpenAR,
  devicePrices,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  const [activeZone, setActiveZone] = useState<HomeZoneId>('all');
  const [selectedCategory, setSelectedCategory] = useState<ApplianceCategoryId | null>(null);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  // Scrollytelling scroll container & progress tracking
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const { scrollYProgress } = useScroll({
    target: scrollContainerRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const clamped = Math.max(0, Math.min(1, latest));
    setScrollProgress(clamped);

    if (viewMode === '3d') {
      const nextZone: HomeZoneId =
        clamped < 0.25
          ? 'all'
          : clamped < 0.5
          ? 'kitchen'
          : clamped < 0.75
          ? 'laundry'
          : 'office';
      setActiveZone((prev) => (prev === nextZone ? prev : nextZone));
    }
  });

  // Motion transforms for the 4 Scrollytelling stages:
  // Stage 1 (0.00 - 0.25): Wide Overview of All Rooms
  const stage1Opacity = useTransform(scrollYProgress, [0, 0.03, 0.19, 0.25], [1, 1, 1, 0]);
  const stage1Y = useTransform(scrollYProgress, [0, 0.19, 0.25], [0, 0, -48]);

  // Stage 2 (0.25 - 0.50): Kitchen Zone (Microwave, Refrigerator & Gas Stove)
  const stage2Opacity = useTransform(
    scrollYProgress,
    [0.21, 0.28, 0.44, 0.5],
    [0, 1, 1, 0]
  );
  const stage2Y = useTransform(
    scrollYProgress,
    [0.21, 0.28, 0.44, 0.5],
    [48, 0, 0, -48]
  );

  // Stage 3 (0.50 - 0.75): Laundry Zone (Washing Machine & Tumble Dryer)
  const stage3Opacity = useTransform(
    scrollYProgress,
    [0.46, 0.53, 0.69, 0.75],
    [0, 1, 1, 0]
  );
  const stage3Y = useTransform(
    scrollYProgress,
    [0.46, 0.53, 0.69, 0.75],
    [48, 0, 0, -48]
  );

  // Stage 4 (0.75 - 1.00): Tech Desk / Phones & Chips
  const stage4Opacity = useTransform(
    scrollYProgress,
    [0.71, 0.78, 0.96, 1.0],
    [0, 1, 1, 1]
  );
  const stage4Y = useTransform(scrollYProgress, [0.71, 0.78, 1.0], [48, 0, 0]);

  // "Interactive view" (our 3D model) vs "Realistic view" (Sketchfab embed when sketchfabUrl is present)
  const [viewerTab, setViewerTab] = useState<'interactive' | 'realistic'>('interactive');
  const [sketchfabOverrides, setSketchfabOverrides] = useState<
    Partial<Record<ApplianceCategoryId, string>>
  >(() => loadSketchfabOverrides());
  const [editingSketchfabUrl, setEditingSketchfabUrl] = useState<boolean>(false);
  const [sketchfabInputDraft, setSketchfabInputDraft] = useState<string>('');

  // Currency: USD / AMD (using live grounded exchange rate)
  const [homeCurrency, setHomeCurrency] = useState<'USD' | 'AMD'>('USD');
  const [exchangeRate, setExchangeRate] = useState<GroundedExchangeRate | null>(() =>
    loadFxCache()
  );
  const [fxLoading, setFxLoading] = useState<boolean>(false);

  // Grounded price cache (24h localStorage) + loading tracker per modelId
  const [priceMap, setPriceMap] = useState<Record<string, GroundedPriceResult>>(() =>
    loadPriceCache()
  );
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  // Interactive 3D part states for all 6 appliances
  const [interactiveStates, setInteractiveStates] = useState<
    Record<ApplianceCategoryId, ApplianceInteractiveState>
  >({
    refrigerator: { doorOpen: false, secondaryActive: false },
    gas_stove: { doorOpen: false, secondaryActive: true },
    microwave: { doorOpen: false, secondaryActive: false },
    washing_machine: { doorOpen: false, secondaryActive: true },
    dryer: { doorOpen: false, secondaryActive: false },
    laptop: { doorOpen: true, secondaryActive: true },
  });

  // Filters inside the Appliance Panel
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(5000);
  const [capacityFilter, setCapacityFilter] = useState<string>('ALL');

  // Compare up to 3 models inside the panel
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Smoothly scroll window to a specific scroll progress stage (0..1)
  const scrollToZoneSection = useCallback(
    (zone: HomeZoneId) => {
      setActiveZone(zone);
      setSelectedCategory(null);

      if (viewMode !== '3d' || !scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const rect = container.getBoundingClientRect();
      const containerTop = window.scrollY + rect.top;
      const scrollableDistance = Math.max(1, container.offsetHeight - window.innerHeight);
      const targetRatio = ZONE_SCROLL_RATIOS[zone] ?? 0;

      window.scrollTo({
        top: containerTop + targetRatio * scrollableDistance,
        behavior: 'smooth',
      });
    },
    [viewMode]
  );

  // Fetch live USD -> AMD exchange rate via Gemini + Google Search Grounding
  const fetchGroundedExchangeRate = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadFxCache();
      if (cached && cached.found && cached.rate) {
        setExchangeRate(cached);
        return;
      }
    }
    setFxLoading(true);
    try {
      const res = await fetch(`/api/home-guide/exchange-rate${force ? '?refresh=1' : ''}`);
      if (res.ok) {
        const data = (await res.json()) as GroundedExchangeRate;
        setExchangeRate(data);
        if (data.found && data.rate) {
          saveFxCache(data);
        }
      }
    } catch {
      // keep existing or null
    } finally {
      setFxLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroundedExchangeRate(false);
  }, [fetchGroundedExchangeRate]);

  // Fetch a single model's real price via Gemini + Google Search Grounding
  const priceMapRef = useRef<Record<string, GroundedPriceResult>>(priceMap);
  useEffect(() => {
    priceMapRef.current = priceMap;
  }, [priceMap]);

  const fetchModelPrice = useCallback(
    async (model: ApplianceModelSpec, forceRefresh = false): Promise<boolean> => {
      if (!forceRefresh) {
        const existing = priceMapRef.current[model.id];
        if (existing && existing.updatedAt) {
          const age = Date.now() - new Date(existing.updatedAt).getTime();
          if (age < CACHE_TTL_MS) {
            return false;
          }
        }
      }

      if (inFlightRef.current.has(model.id)) return false;
      inFlightRef.current.add(model.id);
      setLoadingModels((prev) => ({ ...prev, [model.id]: true }));

      try {
        const res = await fetch('/api/home-guide/price-lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            modelId: model.id,
            brand: model.brand,
            modelCode: model.modelCode,
            name: model.name,
            searchQuery: model.searchQuery,
            forceRefresh,
          }),
        });

        const data = (await res.json()) as {
          found: boolean;
          priceUsd: number | null;
          sourceUrl: string | null;
          sourceTitle: string | null;
          updatedAt: string;
          quotaExceeded?: boolean;
        };

        const entry: GroundedPriceResult = {
          modelId: model.id,
          found: Boolean(data.found && data.priceUsd !== null),
          priceUsd: data.found && typeof data.priceUsd === 'number' ? data.priceUsd : null,
          sourceUrl: data.sourceUrl || null,
          sourceTitle: data.sourceTitle || null,
          updatedAt: data.updatedAt || new Date().toISOString(),
        };

        setPriceMap((prev) => {
          const next = { ...prev, [model.id]: entry };
          priceMapRef.current = next;
          if (entry.found && entry.priceUsd !== null) {
            savePriceCache(next);
          }
          return next;
        });

        return Boolean(data.quotaExceeded);
      } catch {
        const fallbackEntry: GroundedPriceResult = {
          modelId: model.id,
          found: false,
          priceUsd: null,
          sourceUrl: null,
          sourceTitle: null,
          updatedAt: new Date().toISOString(),
        };
        setPriceMap((prev) => {
          const next = { ...prev, [model.id]: fallbackEntry };
          priceMapRef.current = next;
          return next;
        });
        return false;
      } finally {
        inFlightRef.current.delete(model.id);
        setLoadingModels((prev) => ({ ...prev, [model.id]: false }));
      }
    },
    []
  );

  const activeCategory: ApplianceCategoryId = selectedCategory || 'gas_stove';

  const categorySceneItem = useMemo(
    () =>
      APPLIANCE_SCENE_ITEMS.find((item) => item.id === activeCategory) ||
      APPLIANCE_SCENE_ITEMS[0],
    [activeCategory]
  );

  // Resolve Sketchfab config for the active appliance category (from user override or SKETCHFAB_APPLIANCE_CONFIG)
  const activeSketchfabInfo = useMemo(() => {
    const rawUrl =
      sketchfabOverrides[activeCategory] !== undefined
        ? sketchfabOverrides[activeCategory]
        : categorySceneItem.sketchfabUrl ||
          SKETCHFAB_APPLIANCE_CONFIG[activeCategory]?.sketchfabUrl;
    return parseSketchfabConfig(rawUrl, {
      ...SKETCHFAB_APPLIANCE_CONFIG[activeCategory],
      ...categorySceneItem.sketchfabCredit,
    });
  }, [activeCategory, categorySceneItem, sketchfabOverrides]);

  // If switching to an appliance without a Sketchfab URL, ensure tab is 'interactive'
  useEffect(() => {
    if (!activeSketchfabInfo) {
      setViewerTab('interactive');
    }
  }, [activeSketchfabInfo]);

  useEffect(() => {
    if (!panelOpen && viewMode === '3d') return;
    const categoryModels = APPLIANCE_MODELS.filter((m) => m.categoryId === activeCategory);
    let cancelled = false;

    async function runSequentialLookups() {
      for (const m of categoryModels) {
        if (cancelled) break;
        const cached = priceMapRef.current[m.id];
        const isFresh =
          cached &&
          cached.updatedAt &&
          Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS;
        if (!isFresh) {
          const hitQuota = await fetchModelPrice(m, false);
          if (hitQuota) {
            break;
          }
        }
      }
    }

    runSequentialLookups();
    return () => {
      cancelled = true;
    };
  }, [activeCategory, panelOpen, viewMode, fetchModelPrice]);

  const handleSelectAppliance = useCallback((cat: ApplianceCategoryId) => {
    setSelectedCategory(cat);
    setPanelOpen(true);
    setEditingSketchfabUrl(false);
    setBrandFilter('ALL');
    setCapacityFilter('ALL');
    setMaxPriceFilter(5000);
    const catModels = APPLIANCE_MODELS.filter((m) => m.categoryId === cat);
    if (catModels.length >= 2) {
      setCompareIds([catModels[0].id, catModels[1].id]);
    }
  }, []);

  const handleSelectTechDevice = useCallback(
    (deviceId: string) => {
      const dev = DEVICES.find((d) => d.id === deviceId);
      if (dev && onNavigateDevice) {
        onNavigateDevice(dev.brand, dev.id);
      } else {
        onOpenGalleryView();
      }
    },
    [onNavigateDevice, onOpenGalleryView]
  );

  const toggleInteractivePart = (cat: ApplianceCategoryId, key: 'doorOpen' | 'secondaryActive') => {
    setInteractiveStates((prev) => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        [key]: !prev[cat][key],
      },
    }));
  };

  const handleSaveSketchfabOverride = () => {
    const next = {
      ...sketchfabOverrides,
      [activeCategory]: sketchfabInputDraft.trim(),
    };
    setSketchfabOverrides(next);
    try {
      localStorage.setItem(SKETCHFAB_OVERRIDES_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    setEditingSketchfabUrl(false);
    if (parseSketchfabConfig(sketchfabInputDraft.trim())) {
      setViewerTab('realistic');
    } else {
      setViewerTab('interactive');
    }
  };

  const modelsForActiveCategory = useMemo(
    () => APPLIANCE_MODELS.filter((m) => m.categoryId === activeCategory),
    [activeCategory]
  );

  const availableBrands = useMemo(
    () => Array.from(new Set(modelsForActiveCategory.map((m) => m.brand))),
    [modelsForActiveCategory]
  );

  const availableCapacities = useMemo(
    () => Array.from(new Set(modelsForActiveCategory.map((m) => m.capacityLabel[lang]))),
    [modelsForActiveCategory, lang]
  );

  const filteredModels = useMemo(() => {
    return modelsForActiveCategory.filter((m) => {
      if (brandFilter !== 'ALL' && m.brand !== brandFilter) return false;
      if (capacityFilter !== 'ALL' && m.capacityLabel[lang] !== capacityFilter) return false;
      const p = priceMap[m.id];
      if (maxPriceFilter < 5000 && p?.found && p.priceUsd !== null) {
        if (p.priceUsd > maxPriceFilter) return false;
      }
      return true;
    });
  }, [modelsForActiveCategory, brandFilter, capacityFilter, maxPriceFilter, priceMap, lang]);

  const comparedModels = useMemo(() => {
    return compareIds
      .map((id) => modelsForActiveCategory.find((m) => m.id === id))
      .filter((m): m is ApplianceModelSpec => Boolean(m));
  }, [compareIds, modelsForActiveCategory]);

  // Support comparing up to 3 models
  const handleToggleCompareModel = (modelId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId);
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), modelId];
      }
      return [...prev, modelId];
    });
  };

  const formatGroundedPrice = useCallback(
    (usd: number): string => {
      const rate = exchangeRate?.found && exchangeRate.rate ? exchangeRate.rate : 388.5;
      if (homeCurrency === 'AMD') {
        const amd = Math.round(usd * rate);
        return `֏${amd.toLocaleString()}`;
      }
      return `$${usd.toLocaleString()}`;
    },
    [homeCurrency, exchangeRate]
  );

  const getCategoryDisplayPrice = useCallback(
    (cat: ApplianceCategoryId): string => {
      const catModels = APPLIANCE_MODELS.filter((m) => m.categoryId === cat);
      for (const m of catModels) {
        const entry = priceMap[m.id];
        if (entry?.found && entry.priceUsd !== null) {
          return formatGroundedPrice(entry.priceUsd);
        }
      }
      return formatGroundedPrice(APPLIANCE_REF_PRICE_USD[cat]);
    },
    [priceMap, formatGroundedPrice]
  );

  const formatTimestamp = (iso: string): string => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(lang === 'hy' ? 'hy-AM' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getPartLabels = (cat: ApplianceCategoryId) => {
    switch (cat) {
      case 'refrigerator':
        return {
          door: lang === 'hy' ? 'Բացել Սառնարանի Դռները' : 'Open Fridge Doors',
          secondary: lang === 'hy' ? 'Ներքին LED Լուսավորություն' : 'Interior LED Light',
        };
      case 'gas_stove':
        return {
          door: lang === 'hy' ? 'Բացել Ջեռոցի Դուռը' : 'Open Oven Door',
          secondary: lang === 'hy' ? 'Միացնել Գազօջախի Կրակը' : 'Ignite Gas Burners',
        };
      case 'microwave':
        return {
          door: lang === 'hy' ? 'Բացել Միկրոալիքայինի Դուռը' : 'Open Microwave Door',
          secondary: lang === 'hy' ? 'Պտտել Ապակե Սկուտեղը' : 'Spin Turntable',
        };
      case 'washing_machine':
        return {
          door: lang === 'hy' ? 'Բացել Լվացքի Մեքենայի Դուռը' : 'Open Washer Door',
          secondary: lang === 'hy' ? 'Պտտել Թմբուկը (Drum)' : 'Spin Washer Drum',
        };
      case 'dryer':
        return {
          door: lang === 'hy' ? 'Բացել Չորանոցի Դուռը' : 'Open Dryer Door',
          secondary: lang === 'hy' ? 'Պտտել Չորացման Թմբուկը' : 'Spin Dryer Drum',
        };
      case 'laptop':
        return {
          door: lang === 'hy' ? 'Բացել / Փակել Էկրանը' : 'Open / Close Laptop Lid',
          secondary: lang === 'hy' ? 'Ակտիվացնել Էկրանի Փայլը' : 'Toggle Display Glow',
        };
    }
  };

  const renderPriceBlock = (model: ApplianceModelSpec) => {
    const isLoading = Boolean(loadingModels[model.id]);
    const priceEntry = priceMap[model.id];
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      model.searchQuery
    )}`;

    return (
      <div className="pt-3 mt-3 border-t border-[var(--border-hairline)] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
              {lang === 'hy' ? 'Իրական Գին (Google Search)' : 'Verified Price (Google Search)'}
            </div>

            {isLoading ? (
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-mono-tech text-[var(--accent)]">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  {lang === 'hy'
                    ? 'Որոնվում է իրական գինը...'
                    : 'Looking up live retail price...'}
                </span>
              </div>
            ) : priceEntry && priceEntry.found && priceEntry.priceUsd !== null ? (
              <div className="mt-0.5">
                <div className="text-lg font-bold font-mono-tech text-[var(--text-primary)] tabular-nums">
                  {formatGroundedPrice(priceEntry.priceUsd)}
                </div>
                {homeCurrency === 'AMD' && (!exchangeRate?.found || !exchangeRate.rate) && (
                  <div className="text-[10px] text-amber-600 dark:text-amber-400">
                    {lang === 'hy'
                      ? 'AMD փոխարժեքը՝ 1 USD ≈ 388.5 AMD'
                      : 'Using reference AMD rate'}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-1 space-y-1">
                <div className="text-xs font-semibold text-[var(--text-secondary)]">
                  {lang === 'hy' ? 'Գինը չի գտնվել' : 'Price not found'}
                </div>
                <a
                  href={googleSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  <Search className="w-3 h-3" />
                  <span>{lang === 'hy' ? 'Որոնել Google-ում' : 'Search in Google'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fetchModelPrice(model, true)}
            disabled={isLoading}
            className="h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--accent)] text-[11px] font-mono-tech inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50"
            title={lang === 'hy' ? 'Թարմացնել գինը' : 'Refresh price'}
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{lang === 'hy' ? 'Թարմացնել' : 'Refresh'}</span>
          </button>
        </div>

        {priceEntry && priceEntry.found && priceEntry.priceUsd !== null && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
            {priceEntry.sourceUrl ? (
              <a
                href={priceEntry.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline truncate max-w-[220px]"
              >
                <span className="truncate">
                  {priceEntry.sourceTitle || (lang === 'hy' ? 'Աղբյուրի հղում' : 'Source link')}
                </span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span>{priceEntry.sourceTitle || 'Google Search Grounding'}</span>
            )}
            <span className="font-mono-tech text-[10px]">
              {lang === 'hy' ? 'Թարմացվել է՝ ' : 'Updated: '}
              {formatTimestamp(priceEntry.updatedAt)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Devices featured on the Tech Desk (Stage 4)
  const featuredTechDevices = useMemo(() => {
    const ids = [
      'samsung-s24-ultra',
      'iphone-16-pro-max',
      'macbook-pro-16-m4-max',
      'apple-m4-max-soc',
    ];
    return ids
      .map((id) => DEVICES.find((d) => d.id === id))
      .filter((d): d is DeviceSpec => Boolean(d));
  }, []);

  return (
    <div className="relative w-full">
      {viewMode === '3d' ? (
        /* =====================================================================
           IMMERSIVE SCROLLYTELLING 3D SHOWROOM (h-[450vh] container)
           ===================================================================== */
        <div ref={scrollContainerRef} className="relative h-[450vh] w-full">
          {/* Sticky Full-Screen 3D Viewport */}
          <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#0e0c0e]">
            <ErrorBoundary>
              <Suspense
                fallback={
                  <div className="w-full h-full bg-[#0e0c0e] flex items-center justify-center">
                    <Loader2 className="w-7 h-7 animate-spin text-[#E5A952]" />
                  </div>
                }
              >
                <HomeApartment3D
                  activeZone={activeZone}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectAppliance}
                  onSelectTechDevice={handleSelectTechDevice}
                  interactiveStates={interactiveStates}
                  darkMode={darkMode}
                  lang={lang}
                  scrollProgress={scrollProgress}
                  fullScreen={true}
                />
              </Suspense>
            </ErrorBoundary>

            {/* Top Floating Glass Control Bar (Quick-Scroll Room Pills + Currency + View Switcher) */}
            <div className="pointer-events-none absolute top-3 sm:top-5 inset-x-0 z-30 px-3 sm:px-6 lg:px-10">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2.5">
                {/* Room Filter Pills -> Smooth Quick-Scroll Buttons */}
                <div
                  className="pointer-events-auto inline-flex flex-wrap items-center gap-1 p-1.5 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl shadow-2xl"
                  role="group"
                  aria-label="Showroom Zones"
                >
                  {HOME_ZONES.map((z) => {
                    const active = activeZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => scrollToZoneSection(z.id)}
                        className={`h-8 px-3.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                          active
                            ? 'bg-[#E5A952] text-[#0E0C0E] font-bold shadow-sm'
                            : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {z.label[lang]}
                      </button>
                    );
                  })}
                </div>

                {/* Right Controls: 3D/List Mode, USD/AMD Currency, Full Device Gallery */}
                <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center p-1 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl shadow-xl"
                    role="group"
                    aria-label="View Mode"
                  >
                    <button
                      type="button"
                      onClick={() => setViewMode('3d')}
                      className="h-8 px-3 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap bg-white text-black cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>3D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className="h-8 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap text-white/75 hover:text-white cursor-pointer"
                    >
                      <Grid className="w-3.5 h-3.5" />
                      <span>{lang === 'hy' ? 'Ցանկ' : 'List'}</span>
                    </button>
                  </div>

                  <div
                    className="inline-flex items-center p-1 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl shadow-xl"
                    role="group"
                    aria-label="Currency"
                  >
                    {(['USD', 'AMD'] as const).map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setHomeCurrency(curr)}
                        title={
                          exchangeRate?.found && exchangeRate.rate
                            ? `1 USD = ${exchangeRate.rate} AMD`
                            : 'USD / AMD'
                        }
                        className={`h-8 px-2.5 rounded-xl text-xs font-mono-tech whitespace-nowrap transition-colors cursor-pointer ${
                          homeCurrency === curr
                            ? 'bg-[#E5A952] text-[#0E0C0E] font-bold'
                            : 'text-white/75 hover:text-white'
                        }`}
                      >
                        {curr === 'USD' ? '$ USD' : '֏ AMD'}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onOpenGalleryView}
                    className="h-10 px-3.5 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl hover:border-[#E5A952] text-white text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap transition-colors shadow-xl cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-[#E5A952]" />
                    <span>{lang === 'hy' ? 'Հեռախոսներ և Չիպեր' : 'Phones & Chips'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right-Side Vertical Scroll Progress Rail */}
            <div className="pointer-events-none hidden md:flex flex-col items-center gap-2.5 absolute right-6 top-1/2 -translate-y-1/2 z-30">
              {HOME_ZONES.map((z, idx) => {
                const isActive = activeZone === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => scrollToZoneSection(z.id)}
                    title={z.label[lang]}
                    className={`pointer-events-auto group flex items-center gap-2 cursor-pointer`}
                  >
                    <span
                      className={`text-[10px] font-mono-tech uppercase tracking-widest transition-opacity ${
                        isActive
                          ? 'opacity-100 text-[#E5A952] font-bold'
                          : 'opacity-0 group-hover:opacity-80 text-white/70'
                      }`}
                    >
                      0{idx + 1} · {z.label[lang]}
                    </span>
                    <span
                      className={`w-1.5 rounded-full transition-all duration-300 ${
                        isActive
                          ? 'h-8 bg-[#E5A952] shadow-[0_0_12px_#E5A952]'
                          : 'h-3 bg-white/30 group-hover:bg-white/60'
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* =================================================================
               FLOATING GLASSMORPHISM STORY CARDS (Synchronized with Scroll 0..1)
               pointer-events-none on wrapper, pointer-events-auto on buttons
               ================================================================= */}
            <div className="pointer-events-none absolute inset-0 z-20 flex items-end sm:items-center justify-start px-4 sm:px-8 lg:px-14 pb-20 sm:pb-0">
              {/* STAGE 1 (0.00 - 0.25): WIDE OVERVIEW OF ALL ROOMS */}
              <motion.div
                style={{ opacity: stage1Opacity, y: stage1Y }}
                className={`w-full max-w-md rounded-3xl border border-white/15 bg-black/55 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] ${
                  scrollProgress < 0.25 ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-mono-tech uppercase tracking-widest text-[#E5A952]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hy'
                      ? '01 / 04 · ԱՄԲՈՂՋ ՍՐԱՀԻ ՏԵՍԱՐԱՆ'
                      : '01 / 04 · ARCHITECTURAL OVERVIEW'}
                  </span>
                </div>

                <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-white">
                  {lang === 'hy'
                    ? 'Silicon Pulse 3D Ցուցասրահ'
                    : 'The Connected 3D Hardware Suite'}
                </h1>

                <p className="mt-2 text-xs sm:text-sm text-white/75 leading-relaxed">
                  {lang === 'hy'
                    ? 'Թերթեք ներքև՝ Խոհանոցի, Լվացքատան և Տեխնո Սեղանի սարքերը մոտիկից ուսումնասիրելու համար, կամ սեղմեք ցանկացած 3D մոդելի վրա։'
                    : 'Scroll down to glide the camera through Kitchen, Laundry, and the Flagship Tech Desk — or click any 3D appliance directly in the room.'}
                </p>

                {/* Featured Room Highlights & Starting Prices */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => scrollToZoneSection('kitchen')}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:border-[#E5A952]/60 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono-tech text-white/60">
                      {lang === 'hy' ? 'Խոհանոց' : 'Kitchen'}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {getCategoryDisplayPrice('gas_stove')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToZoneSection('laundry')}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:border-[#E5A952]/60 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono-tech text-white/60">
                      {lang === 'hy' ? 'Լվացքատուն' : 'Laundry'}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {getCategoryDisplayPrice('washing_machine')}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => scrollToZoneSection('office')}
                    className="p-2.5 rounded-2xl border border-white/10 bg-white/5 hover:border-[#E5A952]/60 text-left transition-colors cursor-pointer"
                  >
                    <div className="text-[10px] font-mono-tech text-white/60">
                      {lang === 'hy' ? 'Տեխնո Սեղան' : 'Tech Desk'}
                    </div>
                    <div className="text-xs font-bold text-white mt-0.5">
                      {formatGroundedPrice(1199)}
                    </div>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => scrollToZoneSection('kitchen')}
                    className="h-9 px-4 rounded-xl bg-[#E5A952] text-[#0E0C0E] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>
                      {lang === 'hy' ? 'Սկսել շրջայցը' : 'Scroll to Kitchen'}
                    </span>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAppliance('gas_stove')}
                    className="h-9 px-3.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-xs font-medium text-white inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Box className="w-3.5 h-3.5 text-[#E5A952]" />
                    <span>{lang === 'hy' ? 'Բացել 3D վահանակը' : 'Inspect Appliances'}</span>
                  </button>
                </div>
              </motion.div>

              {/* STAGE 2 (0.25 - 0.50): KITCHEN ZONE (Microwave, Gas Stove & Refrigerator) */}
              <motion.div
                style={{ opacity: stage2Opacity, y: stage2Y }}
                className={` absolute left-4 sm:left-8 lg:left-14 bottom-20 sm:bottom-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] ${
                  scrollProgress >= 0.25 && scrollProgress < 0.5
                    ? 'pointer-events-auto'
                    : 'pointer-events-none'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-mono-tech uppercase tracking-widest text-[#E5A952]">
                  <Flame className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hy' ? '02 / 04 · ԽՈՀԱՆՈՑԻ ԳՈՏԻ' : '02 / 04 · KITCHEN SUITE'}
                  </span>
                </div>

                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">
                  {lang === 'hy'
                    ? 'Միկրոալիքային, Գազօջախ և Սառնարան'
                    : 'Culinary Precision & Smart Cooling'}
                </h2>

                <p className="mt-1.5 text-xs text-white/75 leading-relaxed">
                  {lang === 'hy'
                    ? 'Իրական չափսերի 3D մոդելներ՝ բացվող դռներով, վառվող կրակով և Sketchfab 3D իրական տեսքով։'
                    : 'True-to-scale stainless steel & dark enamel appliances with interactive doors, live blue burner flames, and Sketchfab 3D inspection.'}
                </p>

                <div className="mt-4 space-y-2">
                  {(
                    [
                      {
                        id: 'microwave' as ApplianceCategoryId,
                        title: lang === 'hy' ? 'Միկրոալիքային Վառարան' : 'Smart Inverter Microwave',
                        sub: '32–42 L · 1000W–1200W',
                      },
                      {
                        id: 'gas_stove' as ApplianceCategoryId,
                        title: lang === 'hy' ? '60 սմ Գազօջախ (Sketchfab 3D)' : '60 cm Gas Stove (Sketchfab 3D)',
                        sub: '4 Burners · Cast-Iron Grates',
                      },
                      {
                        id: 'refrigerator' as ApplianceCategoryId,
                        title: lang === 'hy' ? 'Սառնարան (180 սմ)' : 'French-Door Refrigerator',
                        sub: '500–650 L · Twin Cooling',
                      },
                    ]
                  ).map((kItem) => (
                    <div
                      key={kItem.id}
                      className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-white/10 bg-white/5"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{kItem.title}</div>
                        <div className="text-[11px] font-mono-tech text-white/60">
                          {kItem.sub} ·{' '}
                          <span className="text-[#E5A952] font-semibold">
                            {getCategoryDisplayPrice(kItem.id)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectAppliance(kItem.id)}
                        className="h-8 px-3 rounded-xl bg-white text-black hover:bg-[#E5A952] text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {lang === 'hy' ? 'Դիտել 3D' : 'Inspect'}
                      </button>
                    </div>
                  ))}
                </div>

                {/* Live 3D Scene Part Toggles */}
                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleInteractivePart('gas_stove', 'secondaryActive')}
                    className={`h-8 px-3 rounded-xl border text-[11px] font-mono-tech inline-flex items-center gap-1.5 cursor-pointer ${
                      interactiveStates.gas_stove.secondaryActive
                        ? 'border-[#E5A952] bg-[#E5A952]/20 text-[#E5A952]'
                        : 'border-white/20 text-white/80 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Գազի Կրակ' : 'Burner Flame'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleInteractivePart('microwave', 'doorOpen')}
                    className="h-8 px-3 rounded-xl border border-white/20 text-[11px] font-mono-tech text-white/80 hover:text-white cursor-pointer"
                  >
                    {lang === 'hy' ? 'Միկրոալիքայինի Դուռ' : 'Microwave Door'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleInteractivePart('refrigerator', 'doorOpen')}
                    className="h-8 px-3 rounded-xl border border-white/20 text-[11px] font-mono-tech text-white/80 hover:text-white cursor-pointer"
                  >
                    {lang === 'hy' ? 'Սառնարանի Դուռ' : 'Fridge Doors'}
                  </button>
                </div>
              </motion.div>

              {/* STAGE 3 (0.50 - 0.75): LAUNDRY ZONE (Washing Machine & Tumble Dryer) */}
              <motion.div
                style={{ opacity: stage3Opacity, y: stage3Y }}
                className={`absolute left-4 sm:left-8 lg:left-14 bottom-20 sm:bottom-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] ${
                  scrollProgress >= 0.5 && scrollProgress < 0.75
                    ? 'pointer-events-auto'
                    : 'pointer-events-none'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-mono-tech uppercase tracking-widest text-[#E5A952]">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hy' ? '03 / 04 · ԼՎԱՑՔԱՏԱՆ ԳՈՏԻ' : '03 / 04 · LAUNDRY CARE'}
                  </span>
                </div>

                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">
                  {lang === 'hy'
                    ? 'Լվացքի Մեքենա և Հիբրիդ Չորանոց'
                    : 'Direct-Drive Washer & Heat-Pump Dryer'}
                </h2>

                <p className="mt-1.5 text-xs text-white/75 leading-relaxed">
                  {lang === 'hy'
                    ? '60×60×85 սմ ստանդարտ չափսեր, չժանգոտվող պողպատե թմբուկ և A+++ էներգախնայողություն։'
                    : '60×60×85 cm architectural pair with tempered glass portholes, spinning stainless drums, and A+++ heat-pump efficiency.'}
                </p>

                <div className="mt-4 space-y-2.5">
                  {(
                    [
                      {
                        id: 'washing_machine' as ApplianceCategoryId,
                        title: lang === 'hy' ? 'Լվացքի Մեքենա (9–11 կգ)' : 'Front-Load Washing Machine',
                        sub: '1400 RPM · Steam Hygiene · A-30%',
                      },
                      {
                        id: 'dryer' as ApplianceCategoryId,
                        title: lang === 'hy' ? 'Հիբրիդային Չորանոց (9 կգ)' : 'Dual-Inverter Heat Pump Dryer',
                        sub: 'A+++ · Auto-Clean Condenser',
                      },
                    ]
                  ).map((lItem) => (
                    <div
                      key={lItem.id}
                      className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-white/10 bg-white/5"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{lItem.title}</div>
                        <div className="text-[11px] font-mono-tech text-white/60">
                          {lItem.sub} ·{' '}
                          <span className="text-[#E5A952] font-semibold">
                            {getCategoryDisplayPrice(lItem.id)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSelectAppliance(lItem.id)}
                        className="h-8 px-3 rounded-xl bg-white text-black hover:bg-[#E5A952] text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        {lang === 'hy' ? 'Դիտել 3D' : 'Inspect'}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      toggleInteractivePart('washing_machine', 'secondaryActive')
                    }
                    className={`h-8 px-3 rounded-xl border text-[11px] font-mono-tech inline-flex items-center gap-1.5 cursor-pointer ${
                      interactiveStates.washing_machine.secondaryActive
                        ? 'border-[#E5A952] bg-[#E5A952]/20 text-[#E5A952]'
                        : 'border-white/20 text-white/80 hover:text-white'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Պտտել Թմբուկը' : 'Spin Washer Drum'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleInteractivePart('washing_machine', 'doorOpen')}
                    className="h-8 px-3 rounded-xl border border-white/20 text-[11px] font-mono-tech text-white/80 hover:text-white cursor-pointer"
                  >
                    {lang === 'hy' ? 'Լվացքի Դուռ' : 'Washer Door'}
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleInteractivePart('dryer', 'doorOpen')}
                    className="h-8 px-3 rounded-xl border border-white/20 text-[11px] font-mono-tech text-white/80 hover:text-white cursor-pointer"
                  >
                    {lang === 'hy' ? 'Չորանոցի Դուռ' : 'Dryer Door'}
                  </button>
                </div>
              </motion.div>

              {/* STAGE 4 (0.75 - 1.00): TECH DESK / PHONES & CHIPS */}
              <motion.div
                style={{ opacity: stage4Opacity, y: stage4Y }}
                className={`absolute left-4 sm:left-8 lg:left-14 bottom-20 sm:bottom-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-white/15 bg-black/60 backdrop-blur-2xl p-5 sm:p-6 text-white shadow-[0_24px_60px_rgba(0,0,0,0.65)] ${
                  scrollProgress >= 0.75 ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              >
                <div className="inline-flex items-center gap-2 text-[11px] font-mono-tech uppercase tracking-widest text-[#E5A952]">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'hy'
                      ? '04 / 04 · ՏԵԽՆՈ ՍԵՂԱՆ ԵՎ ՉԻՊԵՐ'
                      : '04 / 04 · TECH DESK & SILICON'}
                  </span>
                </div>

                <h2 className="mt-1.5 text-xl sm:text-2xl font-bold text-white">
                  {lang === 'hy'
                    ? 'Սմարթֆոններ, Նոութբուքներ և Չիպեր'
                    : 'Flagship Phones, Workstations & SoCs'}
                </h2>

                <p className="mt-1.5 text-xs text-white/75 leading-relaxed">
                  {lang === 'hy'
                    ? 'Բացեք X-Ray ներքին կառուցվածքը, համեմատեք 3D ստուդիայում կամ տեղադրեք սարքը ձեր սենյակում AR-ի միջոցով։'
                    : 'Launch the interactive 3D X-Ray teardown, compare architectures side-by-side, or preview hardware in your room with AR.'}
                </p>

                <div className="mt-3.5 space-y-2 max-h-56 overflow-y-auto pr-1">
                  {featuredTechDevices.map((dev) => {
                    const liveEntry = devicePrices?.[dev.id];
                    const usd = liveEntry?.priceUsd ?? dev.basePriceUsd;
                    return (
                      <div
                        key={dev.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-2xl border border-white/10 bg-white/5"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white truncate">
                            {dev.name}
                          </div>
                          <div className="text-[11px] font-mono-tech text-[#E5A952] font-semibold">
                            {formatDevicePrice(
                              usd,
                              homeCurrency,
                              exchangeRate?.rate || 388.5,
                              0.92
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {onOpenAR && (
                            <button
                              type="button"
                              onClick={() => onOpenAR(dev, dev.finishes[0].id)}
                              className="h-8 px-2.5 rounded-xl border border-white/20 bg-white/10 hover:border-[#E5A952] text-[11px] font-mono-tech text-white cursor-pointer"
                            >
                              AR
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectTechDevice(dev.id)}
                            className="h-8 px-3 rounded-xl bg-white text-black hover:bg-[#E5A952] text-xs font-semibold transition-colors cursor-pointer"
                          >
                            {lang === 'hy' ? 'Դիտել' : 'Inspect'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAppliance('laptop')}
                    className="h-9 px-3.5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 text-xs font-medium text-white cursor-pointer"
                  >
                    {lang === 'hy' ? 'Նոութբուքների Գներ' : 'Compare Laptops'}
                  </button>

                  <button
                    type="button"
                    onClick={onOpenGalleryView}
                    className="h-9 px-4 rounded-xl bg-[#E5A952] text-[#0E0C0E] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'X-Ray և Կատալոգ' : 'Full 3D Gallery'}</span>
                  </button>
                </div>
              </motion.div>
            </div>

            {/* Bottom Quick Appliance Strip */}
            <div className="pointer-events-none absolute bottom-3 sm:bottom-5 inset-x-0 z-30 px-3 sm:px-6 lg:px-10">
              <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
                <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 p-1.5 rounded-2xl border border-white/15 bg-black/55 backdrop-blur-xl shadow-2xl">
                  {APPLIANCE_SCENE_ITEMS.map((item) => {
                    const isSelected = selectedCategory === item.id && panelOpen;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectAppliance(item.id)}
                        className={`h-8 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#E5A952] text-[#0E0C0E] font-bold'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {item.name[lang]}
                      </button>
                    );
                  })}
                </div>

                {homeCurrency === 'AMD' && exchangeRate?.found && exchangeRate.rate && (
                  <div className="pointer-events-auto px-3 py-1.5 rounded-xl border border-white/10 bg-black/55 backdrop-blur-md text-[11px] font-mono-tech text-white/75">
                    1 USD = {exchangeRate.rate} AMD
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           CLEAN ACCESSIBLE LIST VIEW (Alternative for non-3D browsing)
           ===================================================================== */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Top Bar in List View */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
              role="group"
              aria-label="Showroom Zones"
            >
              {HOME_ZONES.map((z) => {
                const active = activeZone === z.id;
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => setActiveZone(z.id)}
                    className={`h-8 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {z.label[lang]}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div
                className="inline-flex items-center p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                role="group"
                aria-label="View Mode"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className="h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 bg-[var(--text-primary)] text-[var(--bg-canvas)] cursor-pointer"
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span>{lang === 'hy' ? 'Ցանկ' : 'List'}</span>
                </button>
              </div>

              <div
                className="inline-flex items-center p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
                role="group"
                aria-label="Currency"
              >
                {(['USD', 'AMD'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setHomeCurrency(curr)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-mono-tech whitespace-nowrap transition-colors cursor-pointer ${
                      homeCurrency === curr
                        ? 'bg-[var(--accent)] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {curr === 'USD' ? '$ USD' : '֏ AMD'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onOpenGalleryView}
                className="h-10 px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Smartphone className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{lang === 'hy' ? 'Հեռախոսներ և Չիպեր' : 'Phones & Chips'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-8" role="region" aria-label="Accessible Showroom Directory">
            {APPLIANCE_SCENE_ITEMS.filter(
              (item) => activeZone === 'all' || item.zone === activeZone
            ).map((sceneItem) => {
              const catModels = APPLIANCE_MODELS.filter(
                (m) => m.categoryId === sceneItem.id
              );
              return (
                <section
                  key={sceneItem.id}
                  className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
                    <div>
                      <div className="text-xs font-medium text-[var(--accent)]">
                        {sceneItem.zoneLabel[lang]}
                      </div>
                      <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {sceneItem.name[lang]}
                      </h2>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {sceneItem.shortDesc[lang]}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectAppliance(sceneItem.id)}
                      className="h-9 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                    >
                      <Box className="w-3.5 h-3.5" />
                      <span>{lang === 'hy' ? 'Դիտել 3D-ում' : 'Inspect in 3D'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {catModels.map((model) => (
                      <div
                        key={model.id}
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="font-semibold text-[var(--accent)]">
                              {model.brand}
                            </span>
                            <span className="font-mono-tech text-[var(--text-secondary)]">
                              {model.energyClass}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {model.name}
                          </h3>
                          <p className="text-xs font-mono-tech text-[var(--text-secondary)]">
                            {model.capacityLabel[lang]} · {model.dimensionsCm}
                          </p>
                        </div>

                        {renderPriceBlock(model)}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}

            {(activeZone === 'all' || activeZone === 'office') && (
              <section className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
                  <div>
                    <div className="text-xs font-medium text-[var(--accent)]">
                      {lang === 'hy' ? 'Տեխնո Սեղան' : 'Tech Desk'}
                    </div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                      {lang === 'hy'
                        ? 'Սմարթֆոններ, Նոութբուքներ և Չիպեր'
                        : 'Phones, Laptops & Chips'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenGalleryView}
                    className="h-9 px-4 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Ամբողջ Կատալոգը' : 'Open Full Gallery'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {DEVICES.map((dev) => {
                    const p = devicePrices?.[dev.id];
                    const usd = p?.priceUsd ?? dev.basePriceUsd;
                    return (
                      <div
                        key={dev.id}
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-[var(--accent)]">
                            {dev.brand.toUpperCase()} · {dev.category}
                          </div>
                          <h3 className="text-sm font-bold">{dev.name}</h3>
                          <p className="text-xs text-[var(--text-secondary)]">
                            {dev.tagline[lang]}
                          </p>
                        </div>
                        <div className="pt-2 border-t border-[var(--border-hairline)] flex items-center justify-between">
                          <span className="text-base font-bold font-mono-tech">
                            {formatDevicePrice(
                              usd,
                              homeCurrency,
                              exchangeRate?.rate || 388.5,
                              0.92
                            )}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {onOpenAR && (
                              <button
                                type="button"
                                onClick={() => onOpenAR(dev, dev.finishes[0].id)}
                                className="px-2.5 py-1 rounded-lg border border-[var(--border-hairline)] text-xs font-mono-tech hover:border-[var(--accent)] cursor-pointer"
                              >
                                AR
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSelectTechDevice(dev.id)}
                              className="px-3 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-medium cursor-pointer"
                            >
                              {lang === 'hy' ? 'Դիտել' : 'Inspect'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
         APPLIANCE PANEL (BOTTOM SHEET / MODAL DRAWER)
         ===================================================================== */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label={categorySceneItem.name[lang]}
        >
          <div className="w-full max-w-6xl max-h-[90vh] rounded-t-3xl sm:rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl flex flex-col overflow-hidden">
            {/* Sheet Header */}
            <div className="px-5 py-3.5 border-b border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3 bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-medium text-[var(--accent)]">
                  {categorySceneItem.zoneLabel[lang]}
                </span>
                <span aria-hidden="true" className="text-[var(--text-secondary)]">
                  ·
                </span>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">
                  {categorySceneItem.name[lang]}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="h-8 w-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] inline-flex items-center justify-center hover:border-[var(--accent)] cursor-pointer"
                aria-label="Close Appliance Panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sheet Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Top Row: Close-up 3D View (Interactive View vs Realistic Sketchfab View) + Controls & Filters */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 5 Cols: 3D View Tabs ("Interactive view" vs "Realistic view") + Interactive Controls */}
                <div className="lg:col-span-5 space-y-3">
                  {/* Tab Switcher: Only show "Realistic view" tab if sketchfabUrl is present */}
                  <div className="flex items-center justify-between gap-2">
                    {activeSketchfabInfo ? (
                      <div
                        className="inline-flex items-center p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                        role="tablist"
                      >
                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewerTab === 'interactive'}
                          onClick={() => setViewerTab('interactive')}
                          className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            viewerTab === 'interactive'
                              ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Cpu className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'hy' ? 'Ինտերակտիվ 3D' : 'Interactive view'}
                          </span>
                        </button>

                        <button
                          type="button"
                          role="tab"
                          aria-selected={viewerTab === 'realistic'}
                          onClick={() => setViewerTab('realistic')}
                          className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                            viewerTab === 'realistic'
                              ? 'bg-[var(--accent)] text-white font-semibold'
                              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>
                            {lang === 'hy' ? 'Իրական տեսք' : 'Realistic view'}
                          </span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-medium text-[var(--text-secondary)]">
                        {lang === 'hy' ? 'Ինտերակտիվ 3D Մոդել' : 'Interactive view'}
                      </div>
                    )}

                    {/* Discreet 3D link editor button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSketchfabInputDraft(
                          sketchfabOverrides[activeCategory] ??
                            categorySceneItem.sketchfabUrl ??
                            ''
                        );
                        setEditingSketchfabUrl((v) => !v);
                      }}
                      className="h-8 w-8 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center cursor-pointer"
                      title="Edit Sketchfab 3D Embed URL"
                      aria-label="Edit Sketchfab 3D Embed URL"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Optional Quick Paste Sketchfab URL Input Box */}
                  {editingSketchfabUrl && (
                    <div className="p-3 rounded-xl border border-[var(--accent)]/50 bg-[var(--bg-elevated)] space-y-2">
                      <label className="block text-[11px] font-mono-tech text-[var(--text-secondary)]">
                        {lang === 'hy'
                          ? 'Տեղադրեք Sketchfab embed հղումը կամ <iframe> կոդը (դատարկ թողեք՝ թաքցնելու համար)․'
                          : 'Paste Sketchfab embed URL or <iframe> snippet (leave empty to hide tab):'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sketchfabInputDraft}
                          onChange={(e) => setSketchfabInputDraft(e.target.value)}
                          placeholder="https://sketchfab.com/models/.../embed"
                          className="flex-1 h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-xs font-mono-tech"
                        />
                        <button
                          type="button"
                          onClick={handleSaveSketchfabOverride}
                          className="h-8 px-3 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold cursor-pointer"
                        >
                          {lang === 'hy' ? 'Պահպանել' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Viewport Content: Either Our Interactive Procedural 3D Model OR Sketchfab Realistic Embed */}
                  {viewerTab === 'realistic' && activeSketchfabInfo ? (
                    <div className="space-y-2">
                      <div className="sketchfab-embed-wrapper w-full h-56 sm:h-64 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden">
                        <iframe
                          title={activeSketchfabInfo.modelTitle || categorySceneItem.name.en}
                          src={activeSketchfabInfo.sketchfabUrl}
                          className="w-full h-full border-0"
                          allowFullScreen
                          allow="autoplay; fullscreen; xr-spatial-tracking"
                        />
                      </div>

                      {/* Required Author Credit & License Link below Sketchfab iframe */}
                      <div className="px-3 py-2 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
                        <div>
                          <a
                            href={
                              activeSketchfabInfo.modelUrl ||
                              activeSketchfabInfo.sketchfabUrl.replace('/embed', '')
                            }
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="font-bold text-[#1CAAD9] hover:underline"
                          >
                            {activeSketchfabInfo.modelTitle || categorySceneItem.name[lang]}
                          </a>
                          {activeSketchfabInfo.authorName && (
                            <>
                              {' '}
                              by{' '}
                              <a
                                href={
                                  activeSketchfabInfo.authorUrl || 'https://sketchfab.com'
                                }
                                target="_blank"
                                rel="nofollow noopener noreferrer"
                                className="font-bold text-[#1CAAD9] hover:underline"
                              >
                                {activeSketchfabInfo.authorName}
                              </a>
                            </>
                          )}{' '}
                          on{' '}
                          <a
                            href="https://sketchfab.com"
                            target="_blank"
                            rel="nofollow noopener noreferrer"
                            className="font-bold text-[#1CAAD9] hover:underline"
                          >
                            Sketchfab
                          </a>
                        </div>

                        <a
                          href={
                            activeSketchfabInfo.licenseUrl ||
                            'https://sketchfab.com/licenses'
                          }
                          target="_blank"
                          rel="nofollow noopener noreferrer"
                          className="font-mono-tech text-[10px] text-[var(--accent)] hover:underline inline-flex items-center gap-1"
                        >
                          <span>
                            {activeSketchfabInfo.licenseLabel || 'Sketchfab License'}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      <ErrorBoundary>
                        <Suspense
                          fallback={
                            <div className="w-full h-56 sm:h-64 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] flex items-center justify-center">
                              <Loader2 className="w-5 h-5 animate-spin text-[var(--accent)]" />
                            </div>
                          }
                        >
                          <ApplianceCloseup3D
                            category={activeCategory}
                            interactiveState={interactiveStates[activeCategory]}
                            darkMode={darkMode}
                          />
                        </Suspense>
                      </ErrorBoundary>

                      {/* Interactive Part Controls */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => toggleInteractivePart(activeCategory, 'doorOpen')}
                          className={`h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            interactiveStates[activeCategory].doorOpen
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-semibold'
                              : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                          }`}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>{getPartLabels(activeCategory).door}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            toggleInteractivePart(activeCategory, 'secondaryActive')
                          }
                          className={`h-10 px-3 rounded-xl border text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                            interactiveStates[activeCategory].secondaryActive
                              ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-semibold'
                              : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                          }`}
                        >
                          {activeCategory === 'gas_stove' ? (
                            <Flame className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          <span>{getPartLabels(activeCategory).secondary}</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Right 7 Cols: Filters + Compare Toggle */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>
                          {lang === 'hy'
                            ? 'Ֆիլտրել և Համեմատել (մինչև 3 մոդել)'
                            : 'Filter & Compare (up to 3 models)'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCompareMode((v) => !v)}
                        className={`h-8 px-3 rounded-lg text-xs font-mono-tech inline-flex items-center gap-1.5 border transition-colors cursor-pointer ${
                          compareMode
                            ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-semibold'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'hy'
                            ? `Համեմատել (${compareIds.length}/3)`
                            : `Compare (${compareIds.length}/3)`}
                        </span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Brand Filter */}
                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase text-[var(--text-secondary)] mb-1">
                          {lang === 'hy' ? 'Բրենդ' : 'Brand'}
                        </label>
                        <select
                          value={brandFilter}
                          onChange={(e) => setBrandFilter(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs"
                        >
                          <option value="ALL">
                            {lang === 'hy' ? 'Բոլոր բրենդները' : 'All Brands'}
                          </option>
                          {availableBrands.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Capacity / Size Filter */}
                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase text-[var(--text-secondary)] mb-1">
                          {lang === 'hy' ? 'Ծավալ / Չափս' : 'Capacity / Size'}
                        </label>
                        <select
                          value={capacityFilter}
                          onChange={(e) => setCapacityFilter(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs"
                        >
                          <option value="ALL">
                            {lang === 'hy' ? 'Բոլոր չափսերը' : 'All Sizes'}
                          </option>
                          {availableCapacities.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Max Price Filter */}
                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase text-[var(--text-secondary)] mb-1">
                          {lang === 'hy' ? 'Առավելագույն Գին' : 'Max Verified Price'}:{' '}
                          {maxPriceFilter >= 5000
                            ? lang === 'hy'
                              ? 'Անսահմանափակ'
                              : 'Any'
                            : `$${maxPriceFilter}`}
                        </label>
                        <input
                          type="range"
                          min={200}
                          max={5000}
                          step={100}
                          value={maxPriceFilter}
                          onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                          className="w-full accent-[var(--accent)] cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison Table (up to 3 models) */}
                  {compareMode && comparedModels.length >= 2 && (
                    <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-elevated)] p-4 space-y-3">
                      <div className="text-xs font-mono-tech uppercase tracking-wider text-[var(--accent)] font-semibold">
                        {lang === 'hy'
                          ? 'Մոդելների Համեմատություն (մինչև 3)'
                          : 'Side-by-Side Comparison (up to 3)'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {comparedModels.map((cm) => {
                          const p = priceMap[cm.id];
                          return (
                            <div
                              key={cm.id}
                              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] p-3 space-y-1.5"
                            >
                              <div className="text-[10px] font-mono-tech uppercase text-[var(--accent)] font-semibold">
                                {cm.brand} · {cm.modelCode}
                              </div>
                              <div className="text-xs font-bold">{cm.name}</div>
                              <div className="text-[11px] font-mono-tech text-[var(--text-secondary)]">
                                {cm.capacityLabel[lang]} · {cm.dimensionsCm}
                              </div>
                              <div className="text-[11px] font-mono-tech">
                                {lang === 'hy' ? 'Էներգիա՝ ' : 'Energy: '}
                                <span className="font-semibold">{cm.energyClass}</span>
                              </div>
                              <div className="text-sm font-bold font-mono-tech pt-1 border-t border-[var(--border-hairline)]">
                                {p && p.found && p.priceUsd !== null
                                  ? formatGroundedPrice(p.priceUsd)
                                  : lang === 'hy'
                                  ? 'Գինը չի գտնվել'
                                  : 'Price not found'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Models Grid inside the Sheet */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredModels.map((model) => {
                  const isCompared = compareIds.includes(model.id);
                  return (
                    <div
                      key={model.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isCompared && compareMode
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono-tech uppercase font-semibold text-[var(--accent)]">
                            {model.brand}
                          </span>
                          <span className="text-[10px] font-mono-tech text-[var(--text-secondary)]">
                            {model.energyClass}
                          </span>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-[var(--text-primary)]">
                            {model.name}
                          </h3>
                          <div className="text-[11px] font-mono-tech text-[var(--text-secondary)]">
                            {model.modelCode} · {model.dimensionsCm}
                          </div>
                        </div>

                        <div className="text-xs font-medium text-[var(--text-primary)]">
                          {model.capacityLabel[lang]}
                        </div>

                        <div className="text-xs text-[var(--text-secondary)] flex items-start gap-1.5 pt-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)] shrink-0 mt-0.5" />
                          <span>{model.highlights[lang]}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {renderPriceBlock(model)}

                        <button
                          type="button"
                          onClick={() => handleToggleCompareModel(model.id)}
                          className={`w-full h-8 rounded-lg border text-xs font-mono-tech inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            isCompared
                              ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                              : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          <Layers className="w-3 h-3" />
                          <span>
                            {isCompared
                              ? lang === 'hy'
                                ? 'Ընտրված է համեմատության համար'
                                : 'Selected for Compare'
                              : lang === 'hy'
                              ? 'Ավելացնել համեմատության'
                              : 'Add to Compare'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
