import React from 'react';
import {
  Bell,
  BellRing,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Currency, Language, LivePriceEntry } from '../types/hardware';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import { DEVICES } from '../data/devices';

interface LivePriceBadgeProps {
  entry: LivePriceEntry | undefined;
  storageDeltaUsd?: number;
  currency: Currency;
  lang: Language;
  showSparkline?: boolean;
  priceAlertUsd?: number | null;
  onTogglePriceAlert?: (targetUsd: number) => void;
  onRefreshPrice?: (deviceId: string) => void;
}

export const LivePriceBadge: React.FC<LivePriceBadgeProps> = ({
  entry,
  storageDeltaUsd = 0,
  currency,
  lang,
  priceAlertUsd = null,
  onTogglePriceAlert,
  onRefreshPrice,
}) => {
  const t = TRANSLATIONS[lang];

  if (!entry) return null;

  const dev = DEVICES.find((d) => d.id === entry.deviceId);
  const searchQuery = dev
    ? `${dev.brand.toUpperCase()} ${dev.name} official retail price USD`
    : entry.deviceId;
  const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

  const finalUsd = entry.priceUsd + storageDeltaUsd;
  const amdRate = entry.amdRate || 388.5;
  const eurRate = entry.eurRate || 0.92;
  const alertTriggered = priceAlertUsd !== null && finalUsd <= priceAlertUsd;

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString(lang === 'hy' ? 'hy-AM' : 'en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
            {lang === 'hy' ? 'Իրական Գին (Google Search)' : 'Verified Price (Google Search)'}
          </div>

          {entry.isLoading ? (
            <div className="inline-flex items-center gap-1.5 text-sm font-mono-tech text-[var(--accent)] py-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>
                {lang === 'hy' ? 'Որոնվում է իրական գինը...' : 'Looking up live retail price...'}
              </span>
            </div>
          ) : entry.found === false ? (
            <div className="space-y-1 pt-0.5">
              <div className="text-base font-bold text-[var(--text-secondary)]">
                {lang === 'hy' ? 'Գինը չի գտնվել' : 'Price not found'}
              </div>
              <a
                href={googleSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] hover:underline"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{lang === 'hy' ? 'Որոնել Google-ում' : 'Search in Google'}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-2.5">
                <span className="text-2xl sm:text-3xl font-bold font-mono-tech tabular-nums">
                  {formatDevicePrice(finalUsd, currency, amdRate, eurRate)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tech text-[var(--text-secondary)]">
                {entry.sourceUrl ? (
                  <a
                    href={entry.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline truncate max-w-[220px]"
                  >
                    <span className="truncate">
                      {entry.sourceTitle || (lang === 'hy' ? 'Աղբյուրի հղում' : 'Source link')}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <a
                    href={dev?.officialUrl || googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                  >
                    <span>
                      {entry.sourceTitle ||
                        (lang === 'hy' ? 'Պաշտոնական Էջ / Google' : 'Official Store / Google')}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                )}
                <span>·</span>
                <span className="text-[11px]">
                  {lang === 'hy' ? 'Թարմացվել է՝ ' : 'Updated: '}
                  {formatDate(entry.updatedAt)}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Refresh Price Button */}
        {onRefreshPrice && (
          <button
            type="button"
            onClick={() => onRefreshPrice(entry.deviceId)}
            disabled={entry.isLoading}
            className="h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-canvas)] hover:border-[var(--accent)] text-[11px] font-mono-tech inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-3 h-3 ${entry.isLoading ? 'animate-spin' : ''}`} />
            <span>{lang === 'hy' ? 'Թարմացնել' : 'Refresh'}</span>
          </button>
        )}
      </div>

      {onTogglePriceAlert && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => onTogglePriceAlert(Math.round(finalUsd * 0.97))}
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              priceAlertUsd !== null
                ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)] font-semibold'
                : 'border-[var(--border-hairline)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
            }`}
          >
            {priceAlertUsd !== null ? (
              <BellRing className="w-3.5 h-3.5 text-[var(--accent)]" />
            ) : (
              <Bell className="w-3.5 h-3.5" />
            )}
            <span>
              {priceAlertUsd !== null
                ? `${t.brandPage.priceAlertSet} (≤ ${formatDevicePrice(priceAlertUsd, currency, amdRate, eurRate)})`
                : t.brandPage.priceAlertBtn}
            </span>
          </button>
          {alertTriggered && (
            <span className="text-[11px] font-mono-tech text-emerald-600 dark:text-emerald-400 font-semibold">
              Target reached!
            </span>
          )}
        </div>
      )}
    </div>
  );
};
