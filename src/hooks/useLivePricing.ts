import { useCallback, useEffect, useRef, useState } from 'react';
import { DEVICES } from '../data/devices';
import { Currency, LivePriceEntry } from '../types/hardware';

const DEVICE_PRICE_CACHE_KEY = 'sp_grounded_device_prices_v1';
const DEVICE_FX_CACHE_KEY = 'sp_home_guide_fx_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedDevicePrice {
  deviceId: string;
  found: boolean;
  priceUsd: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  updatedAt: string;
}

function readCachedDevicePrices(): Record<string, CachedDevicePrice> {
  try {
    const raw = localStorage.getItem(DEVICE_PRICE_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, CachedDevicePrice>;
    const now = Date.now();
    const valid: Record<string, CachedDevicePrice> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v && v.updatedAt && now - new Date(v.updatedAt).getTime() < CACHE_TTL_MS) {
        valid[k] = v;
      }
    }
    return valid;
  } catch {
    return {};
  }
}

function writeCachedDevicePrices(map: Record<string, CachedDevicePrice>) {
  try {
    localStorage.setItem(DEVICE_PRICE_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

function buildInitialPrices(): Record<string, LivePriceEntry> {
  const cached = readCachedDevicePrices();
  let amdRate = 388.5;
  let fxUpdatedAt = '';
  try {
    const fxRaw = localStorage.getItem(DEVICE_FX_CACHE_KEY);
    if (fxRaw) {
      const fx = JSON.parse(fxRaw) as { found?: boolean; rate?: number; updatedAt?: string };
      if (fx?.found && fx.rate) {
        amdRate = fx.rate;
        fxUpdatedAt = fx.updatedAt || '';
      }
    }
  } catch {
    // ignore
  }

  const map: Record<string, LivePriceEntry> = {};
  const now = new Date().toISOString();
  for (const d of DEVICES) {
    const c = cached[d.id];
    const verifiedUsd = c?.found && typeof c.priceUsd === 'number' ? c.priceUsd : d.basePriceUsd;
    const deltaPercent = Number(
      (((verifiedUsd - d.basePriceUsd) / d.basePriceUsd) * 100).toFixed(2)
    );
    map[d.id] = {
      deviceId: d.id,
      priceUsd: verifiedUsd,
      previousPriceUsd: verifiedUsd,
      msrpUsd: d.basePriceUsd,
      deltaPercent,
      amdRate,
      eurRate: 0.92,
      stock: 12,
      trend: verifiedUsd < d.basePriceUsd ? 'down' : verifiedUsd > d.basePriceUsd ? 'up' : 'stable',
      history: Array.from({ length: 7 }, () => verifiedUsd),
      updatedAt: c?.updatedAt || now,
      found: c ? c.found : undefined,
      sourceUrl: c?.sourceUrl || null,
      sourceTitle: c?.sourceTitle || null,
      fxUpdatedAt,
      isLoading: false,
    };
  }
  return map;
}

export function formatDevicePrice(
  priceUsd: number,
  currency: Currency,
  amdRate = 388.5,
  eurRate = 0.92
): string {
  if (currency === 'AMD') {
    const amd = Math.round(priceUsd * amdRate);
    return `${amd.toLocaleString('en-US')} ֏`;
  }
  if (currency === 'EUR') {
    const eur = Math.round(priceUsd * eurRate);
    return `€${eur.toLocaleString('en-US')}`;
  }
  return `$${priceUsd.toLocaleString('en-US')}`;
}

/**
 * Grounded Real-Price Hook for Flagship Devices (Phones, Laptops, Chips).
 * Uses Gemini API + Google Search Grounding (/api/home-guide/price-lookup)
 * and live USD/AMD exchange rate (/api/home-guide/exchange-rate), cached for 24h
 * in localStorage with zero random price fluctuations.
 */
export function useLivePricing() {
  const [prices, setPrices] = useState<Record<string, LivePriceEntry>>(buildInitialPrices);
  const [connected, setConnected] = useState(true);
  const inFlightRef = useRef<Set<string>>(new Set());

  const refreshDevicePrice = useCallback(async (deviceId: string, forceRefresh = true) => {
    const dev = DEVICES.find((d) => d.id === deviceId);
    if (!dev) return false;
    if (inFlightRef.current.has(deviceId)) return false;

    if (!forceRefresh) {
      const cached = readCachedDevicePrices()[deviceId];
      if (cached && cached.updatedAt) {
        const age = Date.now() - new Date(cached.updatedAt).getTime();
        if (age < CACHE_TTL_MS) return false;
      }
    }

    inFlightRef.current.add(deviceId);
    setPrices((prev) => ({
      ...prev,
      [deviceId]: {
        ...prev[deviceId],
        isLoading: true,
      },
    }));

    try {
      const searchQuery = `${dev.brand.toUpperCase()} ${dev.name} official retail price USD`;
      const res = await fetch('/api/home-guide/price-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: dev.id,
          brand: dev.brand.toUpperCase(),
          modelCode: dev.id,
          name: dev.name,
          searchQuery,
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

      const isFound = Boolean(data.found && typeof data.priceUsd === 'number');
      const verifiedUsd = isFound && data.priceUsd !== null ? data.priceUsd : dev.basePriceUsd;
      const updatedAt = data.updatedAt || new Date().toISOString();

      if (isFound) {
        const existingCache = readCachedDevicePrices();
        existingCache[deviceId] = {
          deviceId,
          found: true,
          priceUsd: verifiedUsd,
          sourceUrl: data.sourceUrl || null,
          sourceTitle: data.sourceTitle || null,
          updatedAt,
        };
        writeCachedDevicePrices(existingCache);
      }

      setPrices((prev) => {
        const cur = prev[deviceId] || buildInitialPrices()[deviceId];
        const deltaPercent = Number(
          (((verifiedUsd - dev.basePriceUsd) / dev.basePriceUsd) * 100).toFixed(2)
        );
        return {
          ...prev,
          [deviceId]: {
            ...cur,
            priceUsd: verifiedUsd,
            previousPriceUsd: verifiedUsd,
            deltaPercent,
            trend:
              verifiedUsd < dev.basePriceUsd
                ? 'down'
                : verifiedUsd > dev.basePriceUsd
                  ? 'up'
                  : 'stable',
            history: Array.from({ length: 7 }, () => verifiedUsd),
            updatedAt,
            found: isFound,
            sourceUrl: data.sourceUrl || null,
            sourceTitle: data.sourceTitle || null,
            isLoading: false,
          },
        };
      });

      return Boolean(data.quotaExceeded);
    } catch {
      setPrices((prev) => ({
        ...prev,
        [deviceId]: {
          ...prev[deviceId],
          found: false,
          isLoading: false,
        },
      }));
      return false;
    } finally {
      inFlightRef.current.delete(deviceId);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    // 1. Fetch live grounded USD/AMD exchange rate
    fetch('/api/home-guide/exchange-rate')
      .then((r) => (r.ok ? r.json() : null))
      .then((fx: { found?: boolean; rate?: number; updatedAt?: string } | null) => {
        if (!cancelled && fx?.found && fx.rate) {
          setConnected(true);
          setPrices((prev) => {
            const next: Record<string, LivePriceEntry> = {};
            for (const [k, v] of Object.entries(prev)) {
              next[k] = {
                ...v,
                amdRate: fx.rate!,
                fxUpdatedAt: fx.updatedAt || v.updatedAt,
              };
            }
            return next;
          });
        }
      })
      .catch(() => {});

    // 2. Look up uncached flagship devices sequentially (stopping immediately if quota is reached)
    async function lookupUncachedDevices() {
      const cached = readCachedDevicePrices();
      for (const d of DEVICES) {
        if (cancelled) break;
        if (!cached[d.id]) {
          const hitQuota = await refreshDevicePrice(d.id, false);
          if (hitQuota) break;
        }
      }
    }

    lookupUncachedDevices();

    return () => {
      cancelled = true;
    };
  }, [refreshDevicePrice]);

  return { prices, connected, refreshDevicePrice };
}
