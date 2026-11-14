import React from 'react';
import { Box, GitCompareArrows } from 'lucide-react';
import { ProfessionalCatalogList } from '../components/ProfessionalCatalogList';
import {
  Currency,
  DeviceSpec,
  Language,
  LivePriceEntry,
  PageRoute,
} from '../types/hardware';

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
  onCompareDevice?: (deviceId: string) => void;
  onRefreshPrice?: (deviceId: string) => void;
  cartCount?: number;
  onOpenCart?: () => void;
}

export const ShowroomPage: React.FC<ShowroomPageProps> = ({
  lang,
  currency,
  prices,
  favorites,
  onToggleFavorite,
  favoritesFilterInitial = false,
  onNavigate,
  onAddToCart,
  onCompareDevice,
  cartCount = 0,
  onOpenCart,
}) => {
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8">
      {/* Top Quick Navigation Strip (Switch to 3D Tour or Compare) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
        <div className="text-xs font-mono-tech text-[var(--text-secondary)]">
          {lang === 'hy'
            ? 'Ամբողջական 2D Կատալոգ (39 ապրանք՝ Սմարթֆոններ, Նոութբուքներ և Տան Խոշոր Տեխնիկա)'
            : 'Complete 2D Store Catalog (39 Products: Smartphones, Laptops & Home Appliances)'}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('home-guide')}
            className="h-9 px-3.5 rounded-xl bg-[var(--accent)] text-[#080709] text-xs font-bold inline-flex items-center gap-1.5 hover:opacity-95 transition-opacity cursor-pointer"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{lang === 'hy' ? 'Բացել 3D Շրջայցը (Սրահ)' : 'Open 3D Walkthrough Hall'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('compare')}
            className="h-9 px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <GitCompareArrows className="w-3.5 h-3.5 text-[var(--accent)]" />
            <span>{lang === 'hy' ? 'Համեմատել' : 'Compare'}</span>
          </button>
        </div>
      </div>

      {/* Standalone 2D Professional Catalog List with Left Filter Sidebar */}
      <ProfessionalCatalogList
        lang={lang}
        currency={currency}
        prices={prices}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onAddToCart={onAddToCart}
        onOpenCart={onOpenCart}
        cartCount={cartCount}
        onNavigate={onNavigate}
        onCompareDevice={onCompareDevice}
        favoritesOnlyInitial={favoritesFilterInitial}
      />
    </div>
  );
};
