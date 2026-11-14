import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  CheckCircle2,
  ExternalLink,
  Flame,
  Grid,
  Heart,
  Layers,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
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
} from '../data/homeGuideData';
import { DEVICES } from '../data/devices';
import { ApplianceInteractiveState } from '../three/buildHomeAppliances';
import { HomeApartment3D } from '../components/HomeApartment3D';
import type { HallSectionId } from '../components/ShowroomHall3D';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ProfessionalCatalogList } from '../components/ProfessionalCatalogList';
import { Product2DIllustration } from '../components/Product2DIllustration';
import { BrandId, DeviceSpec, Language, LivePriceEntry } from '../types/hardware';

const ShowroomHall3D = React.lazy(() =>
  import('../components/ShowroomHall3D').then((m) => ({ default: m.ShowroomHall3D }))
);

interface HomeGuidePageProps {
  lang: Language;
  darkMode: boolean;
  onOpenGalleryView: () => void;
  onNavigateDevice?: (brand: BrandId, deviceId: string) => void;
  onOpenAR?: (device: DeviceSpec, finishId?: string) => void;
  onAddToCart?: (deviceId: string, finishId: string, storageId: string) => void;
  onCompareDevice?: (deviceId: string) => void;
  favorites?: string[];
  onToggleFavorite?: (deviceId: string) => void;
  priceAlerts?: Record<string, number>;
  onTogglePriceAlert?: (deviceId: string, targetUsd: number) => void;
  onRefreshPrice?: (deviceId: string) => void;
  devicePrices?: Record<string, LivePriceEntry>;
  cartCount?: number;
  onOpenCart?: () => void;
}

const PRICE_CACHE_KEY = 'sp_home_guide_prices_v1';
const FX_CACHE_KEY = 'sp_home_guide_fx_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

export const HomeGuidePage: React.FC<HomeGuidePageProps> = ({
  lang,
  darkMode,
  onOpenGalleryView,
  onNavigateDevice,
  onOpenAR,
  onAddToCart,
  onCompareDevice,
  favorites = [],
  onToggleFavorite,
  priceAlerts,
  onTogglePriceAlert,
  onRefreshPrice,
  devicePrices,
  cartCount = 0,
  onOpenCart,
}) => {
  const [viewMode, setViewMode] = useState<'3d' | 'list'>('3d');
  const [scene3DMode, setScene3DMode] = useState<'hall' | 'apartment'>('hall');
  const [hallSection, setHallSection] = useState<HallSectionId>('overview');
  const [activeZone, setActiveZone] = useState<HomeZoneId>('all');
  const [selectedCategory, setSelectedCategory] = useState<ApplianceCategoryId | null>(null);
  const [panelOpen, setPanelOpen] = useState<boolean>(false);

  useEffect(() => {
    if (panelOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [panelOpen]);

  // Currency: USD / AMD (using live grounded exchange rate)
  const [homeCurrency, setHomeCurrency] = useState<'USD' | 'AMD'>('USD');
  const [exchangeRate, setExchangeRate] = useState<GroundedExchangeRate | null>(() =>
    loadFxCache()
  );

  // Grounded price cache (24h localStorage) + loading tracker per modelId
  const [priceMap, setPriceMap] = useState<Record<string, GroundedPriceResult>>(() =>
    loadPriceCache()
  );
  const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});
  const inFlightRef = useRef<Set<string>>(new Set());

  // Interactive 3D part states for all 6 appliance categories in the 3D Hall
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

  // Filters inside the 2D Appliance Detail Panel
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(5000);
  const [capacityFilter, setCapacityFilter] = useState<string>('ALL');

  // Compare up to 3 models inside the panel
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Fetch live USD -> AMD exchange rate
  const fetchGroundedExchangeRate = useCallback(async (force = false) => {
    if (!force) {
      const cached = loadFxCache();
      if (cached && cached.found && cached.rate) {
        setExchangeRate(cached);
        return;
      }
    }
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
    }
  }, []);

  useEffect(() => {
    fetchGroundedExchangeRate(false);
  }, [fetchGroundedExchangeRate]);

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

  const activeCategory: ApplianceCategoryId = selectedCategory || 'refrigerator';

  const categorySceneItem = useMemo(
    () =>
      APPLIANCE_SCENE_ITEMS.find((item) => item.id === activeCategory) ||
      APPLIANCE_SCENE_ITEMS[0],
    [activeCategory]
  );

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
          door: lang === 'hy' ? 'Բացել Սառնարանի Դռները (3D Սրահում)' : 'Open Fridge Doors (in 3D Hall)',
          secondary: lang === 'hy' ? 'Ներքին LED Լույս' : 'Interior LED Light',
        };
      case 'gas_stove':
        return {
          door: lang === 'hy' ? 'Բացել Ջեռոցի Դուռը (3D Սրահում)' : 'Open Oven Door (in 3D Hall)',
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
    const fallbackUsd = 1199;
    const displayUsd =
      priceEntry && priceEntry.found && priceEntry.priceUsd !== null
        ? priceEntry.priceUsd
        : fallbackUsd;
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(
      model.searchQuery
    )}`;

    return (
      <div className="pt-3 mt-3 border-t border-[var(--border-hairline)] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
              {lang === 'hy' ? 'Գին' : 'Retail Price'}
            </div>

            <div className="mt-0.5 flex items-baseline gap-2">
              <div className="text-lg font-bold font-mono-tech text-[var(--text-primary)] tabular-nums">
                {formatGroundedPrice(displayUsd)}
              </div>
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" />
              )}
            </div>
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

        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
          <a
            href={priceEntry?.sourceUrl || googleSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline truncate max-w-[200px]"
          >
            <Search className="w-3 h-3 shrink-0" />
            <span className="truncate">
              {priceEntry?.sourceTitle || (lang === 'hy' ? 'Ստուգել Google-ում' : 'Verify on Google')}
            </span>
            <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          {priceEntry?.updatedAt && (
            <span className="font-mono-tech text-[10px]">
              {formatTimestamp(priceEntry.updatedAt)}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full">
      {viewMode === '3d' ? (
        /* =====================================================================
           STANDALONE FULL-SCREEN 360° WALKABLE 3D SHOWROOM
           (No 2D catalog rendered underneath — clean separation!)
           ===================================================================== */
        <div className="relative h-[calc(100vh-3.5rem)] min-h-[620px] w-full overflow-hidden bg-[#0b0a0d]">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="w-full h-full bg-[#0b0a0d] flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-[#E5A952]" />
                </div>
              }
            >
              {scene3DMode === 'hall' ? (
                <ShowroomHall3D
                  scrollProgress={0}
                  activeSection={hallSection}
                  onSelectSection={(sec) => setHallSection(sec)}
                  onSelectDevice={(dev) => handleSelectTechDevice(dev.id)}
                  onSelectAppliance={handleSelectAppliance}
                  onNavigate={(route, devId) => {
                    if (
                      (route === 'samsung' || route === 'apple' || route === 'huawei') &&
                      devId
                    ) {
                      onNavigateDevice?.(route, devId);
                    } else if (route === 'compare' && devId) {
                      onCompareDevice?.(devId);
                    }
                  }}
                  onOpenAR={onOpenAR}
                  onAddToCart={onAddToCart}
                  onCompareDevice={onCompareDevice}
                  favorites={favorites}
                  onToggleFavorite={onToggleFavorite}
                  priceAlerts={priceAlerts}
                  onTogglePriceAlert={onTogglePriceAlert}
                  onRefreshPrice={onRefreshPrice}
                  onSkip3D={() => {
                    setViewMode('list');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  darkMode={darkMode}
                  lang={lang}
                  currency={homeCurrency}
                  prices={devicePrices}
                  fullScreen={true}
                />
              ) : (
                <HomeApartment3D
                  activeZone={activeZone}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectAppliance}
                  onSelectTechDevice={handleSelectTechDevice}
                  interactiveStates={interactiveStates}
                  darkMode={darkMode}
                  lang={lang}
                  fullScreen={true}
                />
              )}
            </Suspense>
          </ErrorBoundary>

          {/* Single Clean Top Floating Switcher Bar (No separate Samsung/Apple links or overlapping strips!) */}
          <div className="pointer-events-none absolute top-3 sm:top-4 inset-x-0 z-30 px-3 sm:px-6 lg:px-10">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-end gap-2">
              {scene3DMode === 'apartment' && (
                <div
                  className="pointer-events-auto inline-flex flex-wrap items-center gap-1 p-1 rounded-2xl border border-white/15 bg-black/75 backdrop-blur-xl shadow-xl mr-auto"
                  role="group"
                  aria-label="Home 3D Wings"
                >
                  {HOME_ZONES.map((z) => {
                    const active = activeZone === z.id;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setActiveZone(z.id)}
                        className={`h-8 px-3 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
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
              )}

              {/* Right Controls: 3D Hall / Home 3D / Pure 2D Catalog Switcher + Currency */}
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center p-1 rounded-2xl border border-white/15 bg-black/75 backdrop-blur-xl shadow-xl"
                  role="group"
                  aria-label="View Mode"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('3d');
                      setScene3DMode('hall');
                    }}
                    className={`h-8 px-3 rounded-xl text-xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      viewMode === '3d' && scene3DMode === 'hall'
                        ? 'font-semibold bg-white text-black'
                        : 'font-medium text-white/75 hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? '3D Սրահ (Հեռախոսներ)' : '3D Tech Hall'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('3d');
                      setScene3DMode('apartment');
                    }}
                    className={`h-8 px-3 rounded-xl text-xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      viewMode === '3d' && scene3DMode === 'apartment'
                        ? 'font-semibold bg-white text-black'
                        : 'font-medium text-white/75 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Տուն 3D (Տեխնիկա)' : 'Home 3D (Appliances)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className="h-8 px-3 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap text-white/80 hover:text-white cursor-pointer"
                  >
                    <Grid className="w-3.5 h-3.5 text-[#E5A952]" />
                    <span>{lang === 'hy' ? '2D Կատալոգ' : '2D Catalog'}</span>
                  </button>
                </div>

                <div
                  className="inline-flex items-center p-1 rounded-2xl border border-white/15 bg-black/75 backdrop-blur-xl shadow-xl"
                  role="group"
                  aria-label="Currency"
                >
                  {(['USD', 'AMD'] as const).map((curr) => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setHomeCurrency(curr)}
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
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* =====================================================================
           STANDALONE PURE 2D CATALOG VIEW (Left Filter Sidebar + 2D Product List)
           ===================================================================== */
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2.5 text-xs font-mono-tech text-[var(--text-secondary)]">
              <Grid className="w-4 h-4 text-[var(--accent)]" />
              <span className="font-semibold text-[var(--text-primary)]">
                {lang === 'hy'
                  ? 'Պրոֆեսիոնալ 2D Կատալոգ (Առանց 3D ծանրաբեռնվածության)'
                  : 'Professional 2D Store Catalog (Pure 2D View)'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setViewMode('3d');
                  setScene3DMode('hall');
                }}
                className="h-9 px-3.5 rounded-xl bg-[var(--accent)] text-[#080709] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Box className="w-3.5 h-3.5" />
                <span>{lang === 'hy' ? 'Մտնել 3D Սրահ' : 'Enter 3D Hall'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('3d');
                  setScene3DMode('apartment');
                }}
                className="h-9 px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-[var(--text-primary)] text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{lang === 'hy' ? 'Տուն 3D (Տեխնիկա)' : 'Home 3D Hall'}</span>
              </button>

              <div
                className="inline-flex items-center p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                role="group"
                aria-label="Currency"
              >
                {(['USD', 'AMD'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setHomeCurrency(curr)}
                    className={`h-7 px-2.5 rounded-lg text-xs font-mono-tech whitespace-nowrap transition-colors cursor-pointer ${
                      homeCurrency === curr
                        ? 'bg-[var(--accent)] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {curr === 'USD' ? '$ USD' : '֏ AMD'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ProfessionalCatalogList
            lang={lang}
            currency={homeCurrency}
            prices={devicePrices || {}}
            favorites={favorites}
            onToggleFavorite={(id) => onToggleFavorite?.(id)}
            onAddToCart={(deviceId, finishId, storageId) =>
              onAddToCart?.(deviceId, finishId, storageId)
            }
            onOpenCart={onOpenCart}
            cartCount={cartCount}
            onCompareDevice={onCompareDevice}
            onInspectIn3DHall={(id, kind, applianceCat) => {
              if (kind === 'tech') {
                handleSelectTechDevice(id);
              } else if (applianceCat) {
                setViewMode('3d');
                setScene3DMode('apartment');
                handleSelectAppliance(applianceCat);
              }
            }}
          />
        </div>
      )}

      {/* =====================================================================
         2D APPLIANCE SPECIFICATION & SHOPPING PANEL (NO 3D VIEWPORT INSIDE!)
         ===================================================================== */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/65 backdrop-blur-sm p-0 sm:p-4"
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
                <span className="px-2 py-0.5 rounded-md bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-[10px] font-mono-tech text-[var(--text-secondary)]">
                  {lang === 'hy' ? '2D Նկար և Տվյալների Ցուցակ' : '2D Image & Specs'}
                </span>
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

            {/* Sheet Body (Scrollable 2D Image + Specs + Models List) */}
            <div className="p-5 overflow-y-auto overscroll-contain space-y-6">
              {/* Top Row: Clean 2D Product Illustration + Filters & Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                {/* Left 4 Cols: Crisp 2D Product Illustration + 3D Hall Door/Flame Remote Toggles */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5 flex flex-col items-center text-center">
                    <Product2DIllustration
                      kind="appliance"
                      applianceCategory={activeCategory}
                      brand={modelsForActiveCategory[0]?.brand || 'Flagship'}
                      name={categorySceneItem.name[lang]}
                      primaryHex="#8c929c"
                      accentHex="#E5A952"
                      screenBadge={modelsForActiveCategory[0]?.energyClass || 'A+++'}
                      size="lg"
                    />
                    <div className="mt-3 text-sm font-bold text-[var(--text-primary)]">
                      {categorySceneItem.name[lang]}
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-0.5">
                      {categorySceneItem.shortDesc[lang]}
                    </div>
                  </div>

                  {/* Remote Controls for the 3D Exhibit in the Hall */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => toggleInteractivePart(activeCategory, 'doorOpen')}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                        interactiveStates[activeCategory].doorOpen
                          ? 'border-[var(--accent)] bg-[var(--accent)] text-white font-semibold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-primary)] hover:border-[var(--accent)]'
                      }`}
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span className="truncate">{getPartLabels(activeCategory).door}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleInteractivePart(activeCategory, 'secondaryActive')}
                      className={`h-9 px-3 rounded-xl border text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
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
                      <span className="truncate">{getPartLabels(activeCategory).secondary}</span>
                    </button>
                  </div>
                </div>

                {/* Right 8 Cols: Filters + Side-by-Side Comparison */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
                        <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
                        <span>
                          {lang === 'hy'
                            ? 'Ֆիլտրել Բրենդը, Չափսը և Գինը'
                            : 'Filter Brand, Capacity & Price'}
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

                      <div>
                        <label className="block text-[10px] font-mono-tech uppercase text-[var(--text-secondary)] mb-1">
                          {lang === 'hy' ? 'Առավելագույն Գին' : 'Max Price'}:{' '}
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

                  {/* Side-by-Side 2D Comparison Table */}
                  {compareMode && comparedModels.length >= 2 && (
                    <div className="rounded-2xl border border-[var(--accent)]/40 bg-[var(--bg-elevated)] p-4 space-y-3">
                      <div className="text-xs font-mono-tech uppercase tracking-wider text-[var(--accent)] font-semibold">
                        {lang === 'hy'
                          ? 'Մոդելների 2D Տվյալների Համեմատություն'
                          : 'Side-by-Side 2D Spec Comparison'}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {comparedModels.map((cm) => {
                          const p = priceMap[cm.id];
                          const usd = p?.found && p.priceUsd !== null ? p.priceUsd : 1199;
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
                                {formatGroundedPrice(usd)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Models 2D Cards Grid with Favorite & Add to Cart */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredModels.map((model) => {
                  const isCompared = compareIds.includes(model.id);
                  const isFav = favorites.includes(model.id);
                  return (
                    <div
                      key={model.id}
                      className={`rounded-2xl border p-4 flex flex-col justify-between transition-all ${
                        isCompared && compareMode
                          ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)]'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-surface)] border border-[var(--border-hairline)] text-[10px] font-mono-tech uppercase font-semibold text-[var(--accent)]">
                            {model.brand}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono-tech text-[var(--text-secondary)]">
                              {model.energyClass}
                            </span>
                            {onToggleFavorite && (
                              <button
                                type="button"
                                onClick={() => onToggleFavorite(model.id)}
                                className={`w-7 h-7 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  isFav
                                    ? 'border-rose-500/40 bg-rose-500/15 text-rose-500'
                                    : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-rose-500'
                                }`}
                                title={lang === 'hy' ? 'Ֆավորիտ' : 'Favorite'}
                              >
                                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* 2D Miniature Illustration per Model */}
                        <div className="flex justify-center py-2 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
                          <Product2DIllustration
                            kind="appliance"
                            applianceCategory={model.categoryId}
                            brand={model.brand}
                            name={model.name}
                            primaryHex="#7b828e"
                            accentHex="#E5A952"
                            screenBadge={model.energyClass}
                            size="sm"
                          />
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

                        <div className="grid grid-cols-2 gap-1.5 pt-1">
                          {onAddToCart && (
                            <button
                              type="button"
                              onClick={() =>
                                onAddToCart(
                                  model.id,
                                  `${model.id}-std`,
                                  `${model.id}-base`
                                )
                              }
                              className="h-8 px-2.5 rounded-lg bg-[var(--accent)] text-[#09080b] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <ShoppingBag className="w-3.5 h-3.5" />
                              <span>{lang === 'hy' ? 'Զամբյուղ' : 'Add'}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleToggleCompareModel(model.id)}
                            className={`h-8 px-2.5 rounded-lg border text-xs font-mono-tech inline-flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                              isCompared
                                ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)] font-semibold'
                                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                          >
                            <Layers className="w-3 h-3" />
                            <span>
                              {isCompared
                                ? lang === 'hy'
                                  ? 'Ընտրված'
                                  : 'Selected'
                                : lang === 'hy'
                                ? 'Համեմատել'
                                : 'Compare'}
                            </span>
                          </button>
                        </div>
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
