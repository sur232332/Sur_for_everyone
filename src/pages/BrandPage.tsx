import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Eye,
  Heart,
  RotateCw,
  ShoppingBag,
} from 'lucide-react';
import { BRAND_META, getDevicesByBrand } from '../data/devices';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import {
  BrandId,
  Currency,
  DeviceSpec,
  ExplodedLayerId,
  Language,
  LivePriceEntry,
  PageRoute,
} from '../types/hardware';
import { CameraPreset, HardwareViewport3D } from '../components/HardwareViewport3D';
import { LivePriceBadge } from '../components/LivePriceBadge';

interface BrandPageProps {
  brand: BrandId;
  initialDeviceId?: string;
  lang: Language;
  currency: Currency;
  darkMode: boolean;
  prices: Record<string, LivePriceEntry>;
  favorites: string[];
  onToggleFavorite: (deviceId: string) => void;
  priceAlerts: Record<string, number>;
  onTogglePriceAlert: (deviceId: string, targetUsd: number) => void;
  onNavigate: (route: PageRoute, deviceId?: string) => void;
  onCompareDevice?: (deviceId: string) => void;
  onOpenAR: (device: DeviceSpec, finishId?: string) => void;
  onAddToCart: (deviceId: string, finishId: string, storageId: string) => void;
  onRefreshPrice?: (deviceId: string) => void;
}

export const BrandPage: React.FC<BrandPageProps> = ({
  brand,
  initialDeviceId,
  lang,
  currency,
  darkMode,
  prices,
  favorites,
  onToggleFavorite,
  priceAlerts,
  onTogglePriceAlert,
  onNavigate,
  onCompareDevice,
  onOpenAR,
  onAddToCart,
  onRefreshPrice,
}) => {
  const t = TRANSLATIONS[lang];
  const meta = BRAND_META[brand];
  const brandDevices = getDevicesByBrand(brand);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    initialDeviceId && brandDevices.some((d) => d.id === initialDeviceId)
      ? initialDeviceId
      : brandDevices[0].id
  );

  useEffect(() => {
    if (initialDeviceId && brandDevices.some((d) => d.id === initialDeviceId)) {
      setSelectedDeviceId(initialDeviceId);
    } else if (!brandDevices.some((d) => d.id === selectedDeviceId)) {
      setSelectedDeviceId(brandDevices[0].id);
    }
  }, [brand, initialDeviceId]);

  const device = brandDevices.find((d) => d.id === selectedDeviceId) || brandDevices[0];

  const [finishId, setFinishId] = useState<string>(device.finishes[0].id);
  const [storageId, setStorageId] = useState<string>(device.storageOptions[0].id);
  const [explode, setExplode] = useState<number>(0);
  const [selectedLayer, setSelectedLayer] = useState<ExplodedLayerId | null>(null);
  const [hingeDeg, setHingeDeg] = useState<number>(112);
  const [foldDeg, setFoldDeg] = useState<number>(170);
  const [lensExtended, setLensExtended] = useState<boolean>(true);
  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [presetTick, setPresetTick] = useState<number>(0);
  const [autoSpin, setAutoSpin] = useState<boolean>(false);
  const [activeDetailId, setActiveDetailId] = useState<string>(device.visualDetails3D[0].id);
  const [justAdded, setJustAdded] = useState<boolean>(false);

  // Sync finish/storage/visual detail when switching device within brand page
  useEffect(() => {
    setFinishId(device.finishes[0].id);
    setStorageId(device.storageOptions[0].id);
    setExplode(0);
    setSelectedLayer(null);
    setHingeDeg(112);
    setFoldDeg(170);
    setLensExtended(true);
    setPreset('iso');
    setPresetTick((n) => n + 1);
    setActiveDetailId(device.visualDetails3D[0].id);
  }, [device.id]);

  const finish = device.finishes.find((f) => f.id === finishId) || device.finishes[0];
  const storage =
    device.storageOptions.find((s) => s.id === storageId) || device.storageOptions[0];
  const priceEntry = prices[device.id];
  const isFavorite = favorites.includes(device.id);

  const handleSelectVisualDetail = (detailId: string) => {
    const detail = device.visualDetails3D.find((vd) => vd.id === detailId);
    if (!detail) return;
    setActiveDetailId(detail.id);
    setPreset(detail.cameraPreset);
    setPresetTick((n) => n + 1);
    setExplode(detail.explodeTarget / 100);
    if (detail.layerHighlight) setSelectedLayer(detail.layerHighlight);
    if (detail.hingeTarget !== undefined) setHingeDeg(detail.hingeTarget);
    if (detail.foldTarget !== undefined) setFoldDeg(detail.foldTarget);
    if (detail.lensExtend !== undefined) setLensExtended(detail.lensExtend);
    setAutoSpin(false);
  };

  const handleAdd = () => {
    onAddToCart(device.id, finish.id, storage.id);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  const specRows: Array<{ label: string; value: string }> = [
    { label: t.compare.processor, value: device.specs.processor[lang] },
    { label: t.compare.display, value: device.specs.display[lang] },
    { label: t.compare.graphics, value: device.specs.graphics[lang] },
    { label: t.compare.camera, value: device.specs.camera[lang] },
    { label: t.compare.memory, value: device.specs.memory[lang] },
    { label: t.compare.battery, value: device.specs.battery[lang] },
    { label: t.compare.chassis, value: device.specs.chassis[lang] },
    { label: t.compare.connectivity, value: device.specs.connectivity[lang] },
    {
      label: t.brandPage.dimensionsWeight,
      value: `${device.dimensionsMm.height} × ${device.dimensionsMm.width} × ${device.dimensionsMm.depth} mm · ${device.weightGrams} g`,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Brand Header & Model Tabs */}
      <div className="space-y-5 border-b border-[var(--border-hairline)] pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('showroom')}
            className="text-xs font-mono-tech text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t.brandPage.backToShowroom}</span>
          </button>
          <span className="text-xs font-mono-tech text-[var(--text-secondary)]">
            {meta.origin[lang]} · {brandDevices.length} {t.brandPage.modelsCount}
          </span>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <h1 className="font-editorial text-4xl sm:text-5xl font-bold">{meta.name}</h1>
            <p className="text-base font-medium">{meta.headline[lang]}</p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {meta.subheadline[lang]}
            </p>
          </div>

          {/* Model Switcher within Brand */}
          <div className="flex flex-wrap gap-2">
            {brandDevices.map((d) => {
              const active = d.id === device.id;
              const p = prices[d.id];
              return (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDeviceId(d.id)}
                  className={`px-4 py-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]'
                      : 'bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                  }`}
                >
                  <div className="text-xs font-semibold whitespace-nowrap">{d.name}</div>
                  <div className="text-[11px] font-mono-tech opacity-75 tabular-nums mt-0.5">
                    {formatDevicePrice(
                      p?.priceUsd ?? d.basePriceUsd,
                      currency,
                      p?.amdRate ?? 388.5,
                      p?.eurRate ?? 0.92
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Interactive 3D & Purchase Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: 3D Viewport + Controls + Visual 3D Detail Hotspots */}
        <div className="lg:col-span-7 space-y-4">
          <HardwareViewport3D
            device={device}
            finish={finish}
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
            heightClassName="h-[380px] sm:h-[460px] lg:h-[520px]"
          />

          {/* Compact 3D Manipulation Dock */}
          <div className="p-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(['iso', 'front', 'back', 'edge'] as CameraPreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setPreset(p);
                      setPresetTick((n) => n + 1);
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono-tech transition-colors cursor-pointer ${
                      preset === p
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {t.viewport3D.presets[p]}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {device.hasRetractableLens && (
                  <button
                    type="button"
                    onClick={() => setLensExtended((v) => !v)}
                    className="px-3 py-1.5 rounded-md border border-[var(--border-hairline)] text-xs font-mono-tech hover:border-[var(--accent)] cursor-pointer"
                  >
                    {lensExtended ? t.viewport3D.retractLens : t.viewport3D.extendLens}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAutoSpin((v) => !v)}
                  className={`px-3 py-1.5 rounded-md border text-xs font-mono-tech inline-flex items-center gap-1.5 cursor-pointer ${
                    autoSpin
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{t.viewport3D.autoSpin}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  <span>{t.viewport3D.xrayExplode}</span>
                  <span className="text-[var(--accent)] font-semibold">
                    {Math.round(explode * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={explode}
                  onChange={(e) => setExplode(Number(e.target.value))}
                  className="hardware-slider"
                />
              </div>

              {device.hasHinge && (
                <div>
                  <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    <span>{t.viewport3D.lidAngle}</span>
                    <span className="text-[var(--accent)] font-semibold">{hingeDeg}°</span>
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

              {device.hasFold && (
                <div>
                  <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                    <span>{t.viewport3D.foldAngle}</span>
                    <span className="text-[var(--accent)] font-semibold">{foldDeg}°</span>
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
            </div>
          </div>

          {/* 3D Visual Inspection Hotspots */}
          <div className="space-y-3 pt-2">
            <h2 className="text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
              {t.brandPage.visualDetails3D}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {device.visualDetails3D.map((detail) => {
                const active = activeDetailId === detail.id;
                return (
                  <button
                    key={detail.id}
                    type="button"
                    onClick={() => handleSelectVisualDetail(detail.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-xs font-semibold leading-snug">{detail.title[lang]}</div>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                      {detail.description[lang]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Contiguous Purchase & Specification Module */}
        <div className="lg:col-span-5 p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono-tech uppercase text-[var(--text-secondary)]">
                {device.brand} · {device.releaseYear}
              </div>
              <button
                type="button"
                onClick={() => onToggleFavorite(device.id)}
                aria-label={`Favorite ${device.name}`}
                className="h-9 px-3 rounded-lg border border-[var(--border-hairline)] inline-flex items-center gap-1.5 text-xs hover:border-rose-500 transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-3.5 h-3.5 ${
                    isFavorite ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-secondary)]'
                  }`}
                />
                <span>
                  {isFavorite ? t.nav.favorites : lang === 'hy' ? 'Պահպանել' : 'Save'}
                </span>
              </button>
            </div>
            <h2 className="font-editorial text-3xl font-bold leading-tight">{device.name}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {device.summary[lang]}
            </p>
          </div>

          {/* Live Price Block with Grounded Source & Price Alert */}
          <div className="pt-4 border-t border-[var(--border-hairline)]">
            <LivePriceBadge
              entry={priceEntry}
              storageDeltaUsd={storage.priceDeltaUsd}
              currency={currency}
              lang={lang}
              priceAlertUsd={priceAlerts[device.id] ?? null}
              onTogglePriceAlert={(targetUsd) => onTogglePriceAlert(device.id, targetUsd)}
              onRefreshPrice={onRefreshPrice}
            />
          </div>

          {/* Material Finish Selector */}
          <div className="space-y-2.5 pt-4 border-t border-[var(--border-hairline)]">
            <div className="flex justify-between text-xs">
              <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                {t.brandPage.finishes}
              </span>
              <span className="font-medium">{finish.name[lang]}</span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {device.finishes.map((f) => {
                const active = f.id === finish.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFinishId(f.id)}
                    title={f.name[lang]}
                    className={`h-10 px-3 rounded-lg border inline-flex items-center gap-2 text-xs transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                        : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                      style={{ backgroundColor: f.hex }}
                    />
                    <span>{f.name[lang]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Storage / Memory Tier Selector */}
          <div className="space-y-2.5">
            <div className="text-xs font-mono-tech uppercase text-[var(--text-secondary)]">
              {t.brandPage.storageConfig}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {device.storageOptions.map((opt) => {
                const active = opt.id === storage.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setStorageId(opt.id)}
                    className={`px-3 py-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                        : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    <div className="text-xs">{opt.label}</div>
                    <div className="text-[11px] font-mono-tech text-[var(--text-secondary)] tabular-nums">
                      {opt.priceDeltaUsd === 0
                        ? lang === 'hy'
                          ? 'Բազային'
                          : 'Base'
                        : `+${formatDevicePrice(
                            opt.priceDeltaUsd,
                            currency,
                            priceEntry?.amdRate ?? 388.5,
                            priceEntry?.eurRate ?? 0.92
                          )}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Actions: Add to Bag, View in AR, Compare 3D */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={handleAdd}
              className="w-full py-3.5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            >
              {justAdded ? <Check className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
              <span>{justAdded ? t.brandPage.addedToBag : t.brandPage.addToBag}</span>
            </button>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onOpenAR(device, finish.id)}
                className="py-3 rounded-xl bg-[var(--accent)] text-[#0B0C10] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>{t.brandPage.viewInAr}</span>
              </button>
            </div>
          </div>

          {/* Benchmark Telemetry Strip */}
          <div className="pt-4 border-t border-[var(--border-hairline)] grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)]">
                {t.brandPage.singleCore}
              </div>
              <div className="text-sm font-bold font-mono-tech tabular-nums mt-0.5">
                {device.benchmarks.singleCore.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)]">
                {t.brandPage.multiCore}
              </div>
              <div className="text-sm font-bold font-mono-tech tabular-nums mt-0.5">
                {device.benchmarks.multiCore.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)]">
                {t.brandPage.gpuScore}
              </div>
              <div className="text-sm font-bold font-mono-tech tabular-nums mt-0.5">
                {device.benchmarks.gpuScore.toLocaleString('en-US')}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)]">
                {t.brandPage.peakLuminance}
              </div>
              <div className="text-sm font-bold font-mono-tech tabular-nums mt-0.5">
                {device.benchmarks.peakNits > 0 ? `${device.benchmarks.peakNits} nits` : 'SoC'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full Technical Specifications Table */}
      <section className="p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold">
            {t.brandPage.technicalSpecs}
          </h2>
          <a
            href={device.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-mono-tech text-[var(--accent)] hover:underline inline-flex items-center gap-1"
          >
            <span>{t.brandPage.officialSpecs}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 divide-y divide-[var(--border-hairline)]">
          {specRows.map((row) => (
            <div
              key={row.label}
              className="py-3.5 flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-4"
            >
              <span className="text-xs font-mono-tech uppercase text-[var(--text-secondary)] shrink-0">
                {row.label}
              </span>
              <span className="text-sm font-medium sm:text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
