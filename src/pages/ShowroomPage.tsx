import React, { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Box,
  Eye,
  Heart,
  Layers,
  RotateCw,
  Search,
  ShoppingBag,
} from 'lucide-react';
import { BRAND_META, DEVICES } from '../data/devices';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import {
  BrandId,
  Currency,
  DeviceCategory,
  DeviceSpec,
  ExplodedLayerId,
  Language,
  LivePriceEntry,
  PageRoute,
} from '../types/hardware';
import { CameraPreset, HardwareViewport3D } from '../components/HardwareViewport3D';

interface ShowroomPageProps {
  lang: Language;
  currency: Currency;
  darkMode: boolean;
  prices: Record<string, LivePriceEntry>;
  favorites: string[];
  onToggleFavorite: (deviceId: string) => void;
  priceAlerts: Record<string, number>;
  onTogglePriceAlert: (deviceId: string, targetUsd: number) => void;
  favoritesFilterInitial?: boolean;
  onNavigate: (route: PageRoute, deviceId?: string) => void;
  onOpenAR: (device: DeviceSpec, finishId?: string) => void;
  onAddToCart: (deviceId: string, finishId: string, storageId: string) => void;
}

export const ShowroomPage: React.FC<ShowroomPageProps> = ({
  lang,
  currency,
  darkMode,
  prices,
  favorites,
  onToggleFavorite,
  priceAlerts,
  onTogglePriceAlert,
  favoritesFilterInitial = false,
  onNavigate,
  onOpenAR,
  onAddToCart,
}) => {
  const t = TRANSLATIONS[lang];
  const [heroDeviceId, setHeroDeviceId] = useState<string>('galaxy-s24-ultra');
  const [explode, setExplode] = useState(0);
  const [selectedLayer, setSelectedLayer] = useState<ExplodedLayerId | null>(null);
  const [foldDeg, setFoldDeg] = useState(145);
  const [hingeDeg, setHingeDeg] = useState(112);
  const [lensExtended, setLensExtended] = useState(true);
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [presetTick, setPresetTick] = useState(0);
  const [autoSpin, setAutoSpin] = useState(true);

  // Filters: Search, Brand, Category, Max Price, Favorites Only
  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<'all' | BrandId>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DeviceCategory>('all');
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(3600);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(favoritesFilterInitial);
  const [addedId, setAddedId] = useState<string | null>(null);

  const heroDevice = DEVICES.find((d) => d.id === heroDeviceId) || DEVICES[0];
  const heroFinish = heroDevice.finishes[0];
  const heroPrice = prices[heroDevice.id];
  const sampleRate = heroPrice?.amdRate ?? 388.5;
  const sampleEur = heroPrice?.eurRate ?? 0.92;

  const featuredHeroIds = [
    'galaxy-s24-ultra',
    'iphone-16-pro-max',
    'huawei-pura-70-ultra',
    'huawei-mate-xt',
    'macbook-pro-16-m4max',
    'apple-m4-max-soc',
  ];

  const filteredCatalog = DEVICES.filter((d) => {
    const liveUsd = prices[d.id]?.priceUsd ?? d.basePriceUsd;
    if (brandFilter !== 'all' && d.brand !== brandFilter) return false;
    if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
    if (liveUsd > maxPriceUsd) return false;
    if (favoritesOnly && !favorites.includes(d.id)) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchChip = d.specs.processor[lang].toLowerCase().includes(q);
      const matchBrand = d.brand.toLowerCase().includes(q);
      const matchTag = d.tagline[lang].toLowerCase().includes(q);
      if (!matchName && !matchChip && !matchBrand && !matchTag) return false;
    }
    return true;
  });

  const handleQuickAdd = (d: DeviceSpec) => {
    onAddToCart(d.id, d.finishes[0].id, d.storageOptions[0].id);
    setAddedId(d.id);
    setTimeout(() => setAddedId(null), 1600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
      {/* SECTION 1: HERO SPLIT WITH INTERACTIVE 3D HARDWARE STAGE */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Editorial Column */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-6">
          <div className="space-y-4">
            <p className="text-xs font-mono-tech uppercase tracking-[0.16em] text-[var(--accent)]">
              {t.hero.kicker}
            </p>
            <h1 className="font-editorial text-4xl sm:text-5xl xl:text-6xl font-bold leading-[0.98] text-balance">
              {t.hero.titleLine1}
              <br />
              <span className="italic font-semibold text-[var(--accent)]">{t.hero.titleLine2}</span>
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-lg">
              {t.hero.subtitle}
            </p>
          </div>

          {/* Interactive Hero Flagship Switcher */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
              {t.brandPage.selectModel}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {featuredHeroIds.map((id) => {
                const dev = DEVICES.find((d) => d.id === id);
                if (!dev) return null;
                const active = dev.id === heroDevice.id;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => {
                      setHeroDeviceId(dev.id);
                      setExplode(0);
                      setSelectedLayer(null);
                    }}
                    className={`px-3 py-2 rounded-lg text-left border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]'
                        : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-[10px] font-mono-tech uppercase opacity-70">
                      {dev.brand}
                    </div>
                    <div className="text-xs font-semibold truncate">
                      {dev.name
                        .replace('Samsung ', '')
                        .replace('Apple ', '')
                        .replace('Huawei ', '')}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => onOpenAR(heroDevice, heroFinish.id)}
              className="px-5 py-3 rounded-lg bg-[var(--accent)] text-[#0B0C10] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>{t.hero.launchAr}</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('compare')}
              className="px-5 py-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:border-[var(--accent)] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>{t.hero.exploreCompare}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right 3D Stage + Compact Control Dock */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          <HardwareViewport3D
            device={heroDevice}
            finish={heroFinish}
            explode={explode}
            hingeDeg={hingeDeg}
            foldDeg={foldDeg}
            lensExtended={lensExtended}
            cameraPreset={preset}
            presetTrigger={presetTick}
            autoSpin={autoSpin}
            lang={lang}
            darkMode={darkMode}
            selectedLayer={selectedLayer}
            onSelectLayer={(layer) => {
              setSelectedLayer(layer);
              if (layer && explode < 0.45) setExplode(0.65);
            }}
            heightClassName="h-[360px] sm:h-[440px] lg:h-[490px]"
          />

          {/* Unified Compact Control Bar directly under viewport */}
          <div className="p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['iso', 'front', 'back', 'edge'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPreset(p);
                    setPresetTick((n) => n + 1);
                  }}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-mono-tech transition-colors cursor-pointer ${
                    preset === p
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)]'
                      : 'hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)]'
                  }`}
                >
                  {t.viewport3D.presets[p]}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-1 min-w-[200px] max-w-sm">
              <div className="flex-1">
                <div className="flex justify-between text-[10px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  <span>{t.viewport3D.xrayExplode}</span>
                  <span>{Math.round(explode * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={explode}
                  onChange={(e) => setExplode(Number(e.target.value))}
                  className="hardware-slider"
                  aria-label={t.viewport3D.xrayExplode}
                />
              </div>

              {heroDevice.hasFold && (
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    <span>{t.viewport3D.foldAngle}</span>
                    <span>{foldDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="180"
                    step="5"
                    value={foldDeg}
                    onChange={(e) => setFoldDeg(Number(e.target.value))}
                    className="hardware-slider"
                  />
                </div>
              )}

              {heroDevice.hasHinge && (
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    <span>{t.viewport3D.lidAngle}</span>
                    <span>{hingeDeg}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="135"
                    step="5"
                    value={hingeDeg}
                    onChange={(e) => setHingeDeg(Number(e.target.value))}
                    className="hardware-slider"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {heroDevice.hasRetractableLens && (
                <button
                  type="button"
                  onClick={() => setLensExtended((v) => !v)}
                  className="px-2.5 py-1.5 rounded-md border border-[var(--border-hairline)] text-xs font-mono-tech hover:border-[var(--accent)] cursor-pointer"
                >
                  {lensExtended ? t.viewport3D.retractLens : t.viewport3D.extendLens}
                </button>
              )}
              <button
                type="button"
                onClick={() => setAutoSpin((v) => !v)}
                className={`px-2.5 py-1.5 rounded-md border text-xs font-mono-tech inline-flex items-center gap-1 cursor-pointer ${
                  autoSpin
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                }`}
              >
                <RotateCw className="w-3 h-3" />
                <span>{t.viewport3D.autoSpin}</span>
              </button>
              {heroPrice && (
                <span className="text-sm font-mono-tech font-bold tabular-nums pl-2 border-l border-[var(--border-hairline)]">
                  {formatDevicePrice(heroPrice.priceUsd, currency, heroPrice.amdRate, heroPrice.eurRate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: THREE BRAND PAVILIONS (SAMSUNG, APPLE, HUAWEI) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
          <h2 className="font-editorial text-3xl sm:text-4xl font-bold">
            Samsung · Apple · Huawei
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('compare')}
            className="text-xs font-mono-tech uppercase tracking-wider text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{t.nav.compare}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(['samsung', 'apple', 'huawei'] as BrandId[]).map((brandId) => {
            const meta = BRAND_META[brandId];
            const brandDevices = DEVICES.filter((d) => d.brand === brandId);
            const minPrice = Math.min(
              ...brandDevices.map((d) => prices[d.id]?.priceUsd ?? d.basePriceUsd)
            );

            return (
              <div
                key={brandId}
                className="p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between gap-6 hover:border-[var(--accent)] transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono-tech text-[var(--text-secondary)]">
                    <span>{meta.origin[lang]}</span>
                    <span>
                      {brandDevices.length} {t.brandPage.modelsCount}
                    </span>
                  </div>
                  <h3 className="font-editorial text-3xl font-bold">{meta.name}</h3>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {meta.headline[lang]}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {meta.subheadline[lang]}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border-hairline)] flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)]">
                      {lang === 'hy' ? 'Սկսած' : 'From'}
                    </div>
                    <div className="text-base font-mono-tech font-bold tabular-nums">
                      {formatDevicePrice(minPrice, currency, sampleRate, sampleEur)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(brandId)}
                    className="px-4 py-2.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <span>{meta.name} 3D</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: LIVE MARKET PRICING, SEARCH, FILTERS & FAVORITES */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
          <div>
            <p className="text-xs font-mono-tech uppercase tracking-wider text-[var(--accent)]">
              {t.pricing.liveFeed}
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl font-bold mt-1">
              {t.hero.liveMarketTitle}
            </h2>
          </div>

          {/* Brand & Favorites Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-hairline)]">
              {(['all', 'samsung', 'apple', 'huawei'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setBrandFilter(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer ${
                    brandFilter === tab
                      ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tab === 'all' ? (lang === 'hy' ? 'Բոլորը' : 'All') : tab}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              className={`px-3 py-2 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                favoritesOnly
                  ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-semibold'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-secondary)]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-rose-500' : ''}`} />
              <span>{t.filters.favoritesOnly}</span>
            </button>
          </div>
        </div>

        {/* Search + Category + Price Range Filter Bar */}
        <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.filters.searchPlaceholder}
              aria-label={t.filters.searchPlaceholder}
              className="w-full pl-10 pr-3.5 py-2 rounded-xl text-xs sm:text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Category Tabs */}
          <div className="md:col-span-4 flex items-center gap-1 overflow-x-auto py-1">
            {(
              [
                { id: 'all', label: t.filters.allCategories },
                { id: 'phone', label: lang === 'hy' ? 'Սմարթֆոն' : 'Phone' },
                { id: 'foldable', label: lang === 'hy' ? 'Ծալովի' : 'Foldable' },
                { id: 'laptop', label: lang === 'hy' ? 'Նոութբուք' : 'Laptop' },
                { id: 'chip', label: lang === 'hy' ? 'Չիպ' : 'Chip' },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono-tech whitespace-nowrap transition-colors cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                    : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Max Price Range Slider */}
          <div className="md:col-span-3 space-y-1">
            <div className="flex justify-between text-[11px] font-mono-tech">
              <span className="text-[var(--text-secondary)]">{t.filters.maxPrice}</span>
              <span className="font-semibold text-[var(--accent)] tabular-nums">
                {formatDevicePrice(maxPriceUsd, currency, sampleRate, sampleEur)}
              </span>
            </div>
            <input
              type="range"
              min="1000"
              max="3600"
              step="100"
              value={maxPriceUsd}
              onChange={(e) => setMaxPriceUsd(Number(e.target.value))}
              className="hardware-slider"
              aria-label={t.filters.maxPrice}
            />
          </div>
        </div>

        {/* Catalog Grid */}
        {filteredCatalog.length === 0 ? (
          <div className="p-12 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">{t.filters.noResults}</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setBrandFilter('all');
                setCategoryFilter('all');
                setMaxPriceUsd(3600);
                setFavoritesOnly(false);
              }}
              className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer"
            >
              {t.filters.resetFilters}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCatalog.map((device) => {
              const p = prices[device.id];
              const liveUsd = p?.priceUsd ?? device.basePriceUsd;
              const rate = p?.amdRate ?? 388.5;
              const eur = p?.eurRate ?? 0.92;
              const deltaPct = p?.deltaPercent ?? 0;
              const isFav = favorites.includes(device.id);
              const hasAlert = Boolean(priceAlerts[device.id]);

              return (
                <article
                  key={device.id}
                  className="p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between gap-4 hover:border-[var(--accent)] transition-colors"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono-tech text-[var(--text-secondary)]">
                      <span className="uppercase">
                        {device.brand} · {device.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span>
                          {device.dimensionsMm.depth} mm · {device.weightGrams} g
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(device.id)}
                          aria-label={`Favorite ${device.name}`}
                          className="p-1.5 rounded-lg border border-[var(--border-hairline)] hover:border-rose-500 transition-colors cursor-pointer"
                        >
                          <Heart
                            className={`w-3.5 h-3.5 ${
                              isFav ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-secondary)]'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-base font-bold leading-snug">{device.name}</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {device.tagline[lang]}
                    </p>
                  </div>

                  {/* Live Price + Actions */}
                  <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xl font-bold font-mono-tech tabular-nums">
                        {formatDevicePrice(liveUsd, currency, rate, eur)}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-xs font-mono-tech tabular-nums ${
                            deltaPct < 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : deltaPct > 0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-[var(--text-secondary)]'
                          }`}
                        >
                          {deltaPct > 0 ? `+${deltaPct}%` : `${deltaPct}%`}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            onTogglePriceAlert(device.id, Math.max(99, liveUsd - 30))
                          }
                          title={t.brandPage.priceAlertBtn}
                          aria-label={t.brandPage.priceAlertBtn}
                          className={`p-1.5 rounded-md border text-[11px] font-mono-tech transition-colors cursor-pointer ${
                            hasAlert
                              ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]'
                              : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--accent)]'
                          }`}
                        >
                          <Bell className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => onNavigate(device.brand, device.id)}
                        className="px-2.5 py-2 rounded-lg border border-[var(--border-hairline)] text-xs font-medium inline-flex items-center justify-center gap-1 hover:border-[var(--accent)] transition-colors cursor-pointer"
                      >
                        <Box className="w-3.5 h-3.5" />
                        <span>3D</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenAR(device, device.finishes[0].id)}
                        className="px-2.5 py-2 rounded-lg border border-[var(--border-hairline)] text-xs font-medium inline-flex items-center justify-center gap-1 hover:border-[var(--accent)] transition-colors cursor-pointer"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>AR</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(device)}
                        className="px-2.5 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold inline-flex items-center justify-center gap-1 hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>{addedId === device.id ? '✓' : '+'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
