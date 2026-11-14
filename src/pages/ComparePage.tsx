import React, { useState } from 'react';
import {
  CheckCircle2,
  Eye,
  Layers,
  Link2,
  Plus,
  RotateCw,
  Scale,
  ShoppingBag,
  Sparkles,
  Trophy,
  X,
} from 'lucide-react';
import { DEVICES, getDeviceById } from '../data/devices';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import { Currency, DeviceSpec, Language, LivePriceEntry } from '../types/hardware';
import { CameraPreset, HardwareViewport3D } from '../components/HardwareViewport3D';
import { OverlayComparison3D } from '../components/OverlayComparison3D';
import { LivePriceBadge } from '../components/LivePriceBadge';

interface ComparePageProps {
  initialDeviceAId?: string;
  lang: Language;
  currency: Currency;
  darkMode: boolean;
  prices: Record<string, LivePriceEntry>;
  priceAlerts: Record<string, number>;
  onTogglePriceAlert: (deviceId: string, targetUsd: number) => void;
  onOpenAR: (device: DeviceSpec, finishId?: string) => void;
  onAddToCart: (deviceId: string, finishId: string, storageId: string) => void;
}

export const ComparePage: React.FC<ComparePageProps> = ({
  initialDeviceAId,
  lang,
  currency,
  darkMode,
  prices,
  priceAlerts,
  onTogglePriceAlert,
  onOpenAR,
  onAddToCart,
}) => {
  const t = TRANSLATIONS[lang];

  const [deviceAId, setDeviceAId] = useState<string>(initialDeviceAId || 'galaxy-s24-ultra');
  const [deviceBId, setDeviceBId] = useState<string>(
    initialDeviceAId === 'iphone-16-pro-max' ? 'huawei-pura-70-ultra' : 'iphone-16-pro-max'
  );
  const [showThird, setShowThird] = useState<boolean>(true);
  const [deviceCId, setDeviceCId] = useState<string>('huawei-pura-70-ultra');

  const deviceA = getDeviceById(deviceAId);
  const deviceB = getDeviceById(deviceBId);
  const deviceC = getDeviceById(deviceCId);

  const [finishAId, setFinishAId] = useState<string>(deviceA.finishes[0].id);
  const [finishBId, setFinishBId] = useState<string>(deviceB.finishes[0].id);
  const [finishCId, setFinishCId] = useState<string>(deviceC.finishes[0].id);

  const finishA = deviceA.finishes.find((f) => f.id === finishAId) || deviceA.finishes[0];
  const finishB = deviceB.finishes.find((f) => f.id === finishBId) || deviceB.finishes[0];
  const finishC = deviceC.finishes.find((f) => f.id === finishCId) || deviceC.finishes[0];

  const [overlayMode, setOverlayMode] = useState(false);
  const [syncRotation, setSyncRotation] = useState(true);
  const [syncExplode, setSyncExplode] = useState(true);
  const [trueScale, setTrueScale] = useState(true);
  const [autoSpin, setAutoSpin] = useState(false);

  const [explodeA, setExplodeA] = useState(0);
  const [explodeB, setExplodeB] = useState(0);
  const [explodeC, setExplodeC] = useState(0);

  const [foldA, setFoldA] = useState(160);
  const [foldB, setFoldB] = useState(160);
  const [foldC, setFoldC] = useState(160);

  const [hingeA, setHingeA] = useState(112);
  const [hingeB, setHingeB] = useState(112);
  const [hingeC, setHingeC] = useState(112);

  const [preset, setPreset] = useState<CameraPreset>('iso');
  const [presetTick, setPresetTick] = useState(0);
  const [syncedAngles, setSyncedAngles] = useState<{ theta: number; phi: number } | null>(null);
  const [activeLeader, setActiveLeader] = useState<'A' | 'B' | 'C'>('A');

  // "Which one is for me?" Advisor Quiz state
  const [quizOpen, setQuizOpen] = useState(false);
  const [qBudget, setQBudget] = useState<'value' | 'flagship' | 'ultra'>('flagship');
  const [qPhotos, setQPhotos] = useState<'zoom' | 'video' | 'macro'>('zoom');
  const [qWork, setQWork] = useState<'portable' | 'multitask' | 'compute'>('portable');

  const activeDevices = showThird ? [deviceA, deviceB, deviceC] : [deviceA, deviceB];
  const activeFinishes = showThird ? [finishA, finishB, finishC] : [finishA, finishB];

  // Relative true scale calculation across all selected devices
  const maxSpan = Math.max(...activeDevices.map((d) => d.dimensionsMm.height), 160);
  const getScale = (d: DeviceSpec) =>
    trueScale ? Math.max(0.52, Math.min(1.15, d.dimensionsMm.height / maxSpan)) : 1;

  const sampleEntry = prices[deviceA.id] || Object.values(prices)[0];
  const amdRate = sampleEntry?.amdRate ?? 388.5;
  const eurRate = sampleEntry?.eurRate ?? 0.92;

  const getLiveUsd = (d: DeviceSpec) => prices[d.id]?.priceUsd ?? d.basePriceUsd;

  const handleExplodeChange = (slot: 'A' | 'B' | 'C', val: number) => {
    if (syncExplode) {
      setExplodeA(val);
      setExplodeB(val);
      setExplodeC(val);
    } else {
      if (slot === 'A') setExplodeA(val);
      if (slot === 'B') setExplodeB(val);
      if (slot === 'C') setExplodeC(val);
    }
  };

  // Winner calculation helper for the 7 required comparison rows:
  // thickness, weight, screen, chip, battery, camera, price
  interface WinnerRow {
    id: string;
    label: string;
    values: string[];
    scores: number[];
    higherIsBetter: boolean;
  }

  const comparisonRows: WinnerRow[] = [
    {
      id: 'thickness',
      label: t.compare.thickness,
      values: activeDevices.map((d) => `${d.dimensionsMm.depth} mm`),
      scores: activeDevices.map((d) => d.dimensionsMm.depth),
      higherIsBetter: false,
    },
    {
      id: 'weight',
      label: t.compare.weight,
      values: activeDevices.map((d) => `${d.weightGrams} g`),
      scores: activeDevices.map((d) => d.weightGrams),
      higherIsBetter: false,
    },
    {
      id: 'screen',
      label: t.compare.display,
      values: activeDevices.map((d) => d.specs.display[lang]),
      scores: activeDevices.map(
        (d) => d.numericMetrics.screenInches * 100 + d.benchmarks.peakNits / 100
      ),
      higherIsBetter: true,
    },
    {
      id: 'chip',
      label: t.compare.processor,
      values: activeDevices.map(
        (d) =>
          `${d.specs.processor[lang]} (${d.benchmarks.multiCore.toLocaleString('en-US')} pts)`
      ),
      scores: activeDevices.map((d) => d.benchmarks.multiCore + d.benchmarks.singleCore),
      higherIsBetter: true,
    },
    {
      id: 'battery',
      label: t.compare.battery,
      values: activeDevices.map((d) => d.specs.battery[lang]),
      scores: activeDevices.map((d) => d.numericMetrics.batteryScore),
      higherIsBetter: true,
    },
    {
      id: 'camera',
      label: t.compare.camera,
      values: activeDevices.map((d) => d.specs.camera[lang]),
      scores: activeDevices.map((d) => d.numericMetrics.cameraMp),
      higherIsBetter: true,
    },
    {
      id: 'price',
      label: t.compare.priceRow,
      values: activeDevices.map((d) =>
        formatDevicePrice(getLiveUsd(d), currency, amdRate, eurRate)
      ),
      scores: activeDevices.map((d) => getLiveUsd(d)),
      higherIsBetter: false,
    },
  ];

  // Advisor Recommendation Engine based on 3 questions (budget, photos, work)
  const getRecommendedDevice = (): DeviceSpec => {
    let bestDevice = DEVICES[0];
    let bestScore = -999;

    for (const dev of DEVICES) {
      let score = 0;
      const liveP = getLiveUsd(dev);

      // Q1: Budget
      if (qBudget === 'value' && liveP <= 1450) score += 40;
      if (qBudget === 'flagship' && liveP >= 1150 && liveP <= 2000) score += 40;
      if (qBudget === 'ultra' && liveP > 1800) score += 40;

      // Q2: Photos
      if (qPhotos === 'zoom' && dev.id === 'galaxy-s24-ultra') score += 35;
      if (qPhotos === 'video' && dev.brand === 'apple') score += 35;
      if (qPhotos === 'macro' && dev.brand === 'huawei') score += 35;

      // Q3: Work
      if (qWork === 'portable' && dev.category === 'phone') score += 30;
      if (qWork === 'multitask' && dev.category === 'foldable') score += 45;
      if (qWork === 'compute' && (dev.category === 'laptop' || dev.category === 'chip')) score += 50;

      if (score > bestScore) {
        bestScore = score;
        bestDevice = dev;
      }
    }
    return bestDevice;
  };

  const recommendedDevice = getRecommendedDevice();

  const renderDeviceColumn = (slot: 'A' | 'B' | 'C') => {
    const dev = slot === 'A' ? deviceA : slot === 'B' ? deviceB : deviceC;
    const fin = slot === 'A' ? finishA : slot === 'B' ? finishB : finishC;
    const exp = slot === 'A' ? explodeA : slot === 'B' ? explodeB : explodeC;
    const fld = slot === 'A' ? foldA : slot === 'B' ? foldB : foldC;
    const hng = slot === 'A' ? hingeA : slot === 'B' ? hingeB : hingeC;
    const label =
      slot === 'A'
        ? t.compare.deviceA
        : slot === 'B'
          ? t.compare.deviceB
          : t.compare.deviceC;

    const handleSelectDevice = (id: string) => {
      const next = getDeviceById(id);
      if (slot === 'A') {
        setDeviceAId(next.id);
        setFinishAId(next.finishes[0].id);
      } else if (slot === 'B') {
        setDeviceBId(next.id);
        setFinishBId(next.finishes[0].id);
      } else {
        setDeviceCId(next.id);
        setFinishCId(next.finishes[0].id);
      }
    };

    const handleSelectFinish = (fid: string) => {
      if (slot === 'A') setFinishAId(fid);
      else if (slot === 'B') setFinishBId(fid);
      else setFinishCId(fid);
    };

    const priceEntry = prices[dev.id];
    const scaleFactor = getScale(dev);

    return (
      <div
        key={slot}
        className="p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] space-y-4 flex flex-col justify-between"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <label
                htmlFor={`select-device-${slot}`}
                className="block text-[11px] font-mono-tech uppercase text-[var(--text-secondary)] mb-1"
              >
                {label}
              </label>
              <select
                id={`select-device-${slot}`}
                value={dev.id}
                onChange={(e) => handleSelectDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm font-semibold bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
              >
                {DEVICES.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 pt-2 sm:pt-5">
              {dev.finishes.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFinish(f.id)}
                  title={f.name[lang]}
                  className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                    f.id === fin.id ? 'border-[var(--accent)] scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: f.hex }}
                  aria-label={f.name[lang]}
                />
              ))}
            </div>
          </div>

          {!overlayMode && (
            <div onPointerDown={() => setActiveLeader(slot)}>
              <HardwareViewport3D
                device={dev}
                finish={fin}
                explode={exp}
                hingeDeg={hng}
                foldDeg={fld}
                lensExtended={true}
                cameraPreset={preset}
                presetTrigger={presetTick}
                autoSpin={autoSpin}
                lang={lang}
                darkMode={darkMode}
                scaleMultiplier={scaleFactor}
                syncedRotation={syncRotation && activeLeader !== slot ? syncedAngles : null}
                onCameraRotate={(theta, phi) => {
                  if (syncRotation && activeLeader === slot) {
                    setSyncedAngles({ theta, phi });
                  }
                }}
                heightClassName="h-[320px] sm:h-[360px]"
                compactControls
              />
            </div>
          )}

          {/* Individual sliders */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                <span>{t.viewport3D.xrayExplode}</span>
                <span>{Math.round(exp * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={exp}
                onChange={(e) => handleExplodeChange(slot, Number(e.target.value))}
                className="hardware-slider"
                aria-label={`${dev.name} X-Ray Explode`}
              />
            </div>

            {dev.hasFold && (
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  <span>{t.viewport3D.foldAngle}</span>
                  <span>{fld}°</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="180"
                  step="5"
                  value={fld}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (slot === 'A') setFoldA(v);
                    else if (slot === 'B') setFoldB(v);
                    else setFoldC(v);
                  }}
                  className="hardware-slider"
                />
              </div>
            )}

            {dev.hasHinge && (
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  <span>{t.viewport3D.lidAngle}</span>
                  <span>{hng}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="135"
                  step="5"
                  value={hng}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (slot === 'A') setHingeA(v);
                    else if (slot === 'B') setHingeB(v);
                    else setHingeC(v);
                  }}
                  className="hardware-slider"
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 pt-3 border-t border-[var(--border-hairline)]">
          <LivePriceBadge
            entry={priceEntry}
            currency={currency}
            lang={lang}
            priceAlertUsd={priceAlerts[dev.id] ?? null}
            onTogglePriceAlert={(targetUsd) => onTogglePriceAlert(dev.id, targetUsd)}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onOpenAR(dev, fin.id)}
              className="py-2.5 rounded-lg bg-[var(--accent)] text-[#0B0C10] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>AR</span>
            </button>
            <button
              type="button"
              onClick={() => onAddToCart(dev.id, fin.id, dev.storageOptions[0].id)}
              className="py-2.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{t.brandPage.addToBag}</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Header & Global Comparison Controls */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[var(--border-hairline)] pb-6">
        <div className="space-y-2 max-w-2xl">
          <h1 className="font-editorial text-4xl sm:text-5xl font-bold">{t.compare.title}</h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {t.compare.subtitle}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* "Which one is for me?" Interactive Advisor Button */}
          <button
            type="button"
            onClick={() => setQuizOpen(true)}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-[#0B0C10] text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.compare.quizBtn}</span>
          </button>

          {/* 3rd Device Toggle */}
          <button
            type="button"
            onClick={() => setShowThird((v) => !v)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              showThird
                ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
            }`}
          >
            {showThird ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            <span>{showThird ? t.compare.removeThirdDevice : t.compare.addThirdDevice}</span>
          </button>

          {/* Segmented Toggle: Side-by-Side vs 3D Overlay Mode */}
          <div
            className="inline-flex items-center p-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
            role="group"
            aria-label="Comparison View Mode"
          >
            <button
              type="button"
              onClick={() => setOverlayMode(false)}
              aria-pressed={!overlayMode}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tech transition-colors cursor-pointer ${
                !overlayMode
                  ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {t.compare.sideBySideMode}
            </button>
            <button
              type="button"
              onClick={() => setOverlayMode(true)}
              aria-pressed={overlayMode}
              className={`px-3 py-1.5 rounded-md text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                overlayMode
                  ? 'bg-[var(--accent)] text-[#0B0C10] font-semibold'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t.compare.overlayMode}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSyncRotation((v) => !v)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              syncRotation
                ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{t.compare.syncRotation}</span>
          </button>

          <button
            type="button"
            onClick={() => setTrueScale((v) => !v)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              trueScale
                ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t.compare.trueScale}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoSpin((v) => !v)}
            className={`px-3.5 py-2 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              autoSpin
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--bg-surface)]'
                : 'bg-[var(--bg-surface)] border-[var(--border-hairline)]'
            }`}
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>{t.viewport3D.autoSpin}</span>
          </button>
        </div>
      </div>

      {/* Camera Presets Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
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

        <div className="flex items-center gap-3 text-xs font-mono-tech">
          <button
            type="button"
            onClick={() => setSyncExplode((v) => !v)}
            className={`px-2.5 py-1 rounded border cursor-pointer ${
              syncExplode
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
            }`}
          >
            {t.compare.syncExplode}
          </button>
        </div>
      </div>

      {/* Optional Stacked 3D Overlay Mode Stage */}
      {overlayMode && (
        <div className="space-y-3">
          <OverlayComparison3D
            devices={activeDevices}
            finishes={activeFinishes}
            explode={explodeA}
            autoSpin={autoSpin}
            lang={lang}
          />
        </div>
      )}

      {/* 2 or 3 Side-by-Side Device Columns */}
      <div
        className={`grid grid-cols-1 ${
          showThird ? 'lg:grid-cols-3' : 'lg:grid-cols-2'
        } gap-6`}
      >
        {renderDeviceColumn('A')}
        {renderDeviceColumn('B')}
        {showThird && renderDeviceColumn('C')}
      </div>

      {/* Side-by-Side Specification Table with Row Winner Highlighting */}
      <section className="p-6 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-x-auto">
        <div className="flex items-center justify-between gap-4 mb-4">
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold">
            {t.compare.specMatrix}
          </h2>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-mono-tech">
            <Trophy className="w-3.5 h-3.5" />
            <span>{t.compare.winnerBadge}</span>
          </div>
        </div>

        <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-[var(--border-hairline)] font-mono-tech text-[11px] uppercase text-[var(--text-secondary)]">
              <th className="py-3.5 pr-4 w-44">
                {lang === 'hy' ? 'Բնութագիր' : 'Metric'}
              </th>
              {activeDevices.map((d) => (
                <th key={d.id} className="py-3.5 px-4 font-bold text-[var(--text-primary)]">
                  {d.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-hairline)]">
            {comparisonRows.map((row) => {
              const targetBest = row.higherIsBetter
                ? Math.max(...row.scores)
                : Math.min(...row.scores);

              return (
                <tr key={row.id}>
                  <td className="py-4 pr-4 font-mono-tech text-xs text-[var(--text-secondary)] uppercase">
                    {row.label}
                  </td>
                  {row.values.map((val, idx) => {
                    const isWinner = row.scores[idx] === targetBest;
                    return (
                      <td
                        key={idx}
                        className={`py-4 px-4 font-medium transition-colors ${
                          isWinner
                            ? 'bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 font-semibold'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{val}</span>
                          {isWinner && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono-tech uppercase text-emerald-600 dark:text-emerald-400 shrink-0">
                              <Trophy className="w-3 h-3" />
                              {t.compare.winnerBadge}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* "WHICH ONE IS FOR ME?" 3-Question Advisor Modal */}
      {quizOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label={t.compare.quizTitle}
        >
          <div className="w-full max-w-xl rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-hairline)] pb-4">
              <div>
                <h2 className="font-editorial text-2xl font-bold">{t.compare.quizTitle}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {t.compare.quizSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQuizOpen(false)}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg hover:bg-[var(--bg-subtle)] cursor-pointer"
                aria-label="Close advisor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question 1: Budget */}
            <div className="space-y-2">
              <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                {t.compare.quizQ1}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['value', 'flagship', 'ultra'] as const).map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setQBudget(opt)}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      qBudget === opt
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                        : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {t.compare.quizQ1Opts[idx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2: Photos */}
            <div className="space-y-2">
              <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                {t.compare.quizQ2}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['zoom', 'video', 'macro'] as const).map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setQPhotos(opt)}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      qPhotos === opt
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                        : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {t.compare.quizQ2Opts[idx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3: Work */}
            <div className="space-y-2">
              <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                {t.compare.quizQ3}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['portable', 'multitask', 'compute'] as const).map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setQWork(opt)}
                    className={`p-3 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      qWork === opt
                        ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                        : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {t.compare.quizQ3Opts[idx]}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Recommendation Result */}
            <div className="p-4 rounded-xl border border-[var(--accent)] bg-[var(--bg-elevated)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--accent)] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {t.compare.quizRecommendation}
                </span>
                <span className="text-sm font-mono-tech font-bold tabular-nums">
                  {formatDevicePrice(getLiveUsd(recommendedDevice), currency, amdRate, eurRate)}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold">{recommendedDevice.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {recommendedDevice.summary[lang]}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setDeviceAId(recommendedDevice.id);
                    setFinishAId(recommendedDevice.finishes[0].id);
                    setQuizOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer"
                >
                  {t.compare.quizSelectWinner}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onOpenAR(recommendedDevice, recommendedDevice.finishes[0].id);
                    setQuizOpen(false);
                  }}
                  className="px-4 py-2 rounded-lg border border-[var(--border-hairline)] text-xs font-semibold cursor-pointer"
                >
                  {lang === 'hy' ? 'AR Դիտում' : 'AR Preview'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
