import React, { useState } from 'react';
import { Globe, Heart, Menu, Moon, ShoppingBag, Sun, X } from 'lucide-react';
import { Currency, Language, PageRoute } from '../types/hardware';
import { TRANSLATIONS } from '../data/i18n';
import { BrandLogo3D } from './BrandLogo3D';

interface NavbarProps {
  route: PageRoute;
  onNavigate: (r: PageRoute) => void;
  lang: Language;
  onToggleLang: () => void;
  currency: Currency;
  onSetCurrency: (c: Currency) => void;
  darkMode: boolean;
  onToggleTheme: () => void;
  cartCount: number;
  onOpenCart: () => void;
  favoritesCount: number;
  onSelectFavorites?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  route,
  onNavigate,
  lang,
  onToggleLang,
  currency,
  onSetCurrency,
  darkMode,
  onToggleTheme,
  cartCount,
  onOpenCart,
  favoritesCount,
  onSelectFavorites,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang];

  const links: Array<{ id: PageRoute; label: string }> = [
    { id: 'motor-gallery', label: t.nav.motorGallery },
    { id: 'catalog', label: lang === 'hy' ? 'Կատալոգ' : 'Catalog' },
    { id: 'home-guide', label: t.nav.homeGuide },
    { id: 'showroom', label: t.nav.showroom },
    { id: 'compare', label: t.nav.compare },
  ];

  const currencies: Currency[] = ['USD', 'EUR', 'AMD'];

  const handleLinkClick = (id: PageRoute) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b border-[var(--border-hairline)] header-opaque bg-[var(--bg-surface)] backdrop-blur-md shadow-xs"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4 md:gap-6">
        {/* Zone 1: 3D Visual Brand Logo */}
        <BrandLogo3D onClick={() => handleLinkClick('home-guide')} />

        {/* Zone 2: Clean Typographic Nav Links (Desktop) */}
        <nav
          className="hidden lg:flex items-center gap-5 xl:gap-7 text-sm font-medium min-w-0"
          aria-label="Primary Navigation"
        >
          {links.map((link) => {
            const active = route === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link.id)}
                aria-current={active ? 'page' : undefined}
                className={`py-1.5 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  active
                    ? 'border-[var(--accent)] text-[var(--text-primary)] font-semibold'
                    : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Desktop Controls + Compact Mobile Bag & Menu Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Language Switcher — visible on sm+, collapsed into menu on mobile */}
          <button
            type="button"
            onClick={onToggleLang}
            className="hidden sm:inline-flex items-center justify-center h-9 sm:h-10 px-2.5 sm:px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono-tech font-medium hover:border-[var(--accent)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            aria-label={lang === 'en' ? 'Switch language to Armenian' : 'Switch language to English'}
          >
            {lang === 'en' ? 'ՀԱՅ' : 'EN'}
          </button>

          {/* 3-Way Currency Switcher (USD / EUR / AMD) — visible on md+, collapsed into menu on mobile */}
          <div
            className="hidden md:inline-flex items-center h-10 p-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono-tech shrink-0"
            role="group"
            aria-label="Currency selector"
          >
            {currencies.map((curr) => {
              const active = currency === curr;
              const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '֏';
              return (
                <button
                  key={curr}
                  type="button"
                  onClick={() => onSetCurrency(curr)}
                  aria-pressed={active}
                  className={`px-2 py-1 rounded-md transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {symbol} {curr}
                </button>
              );
            })}
          </div>

          {/* Favorites — visible on sm+, collapsed into menu on mobile */}
          {onSelectFavorites && (
            <button
              type="button"
              onClick={onSelectFavorites}
              className="hidden sm:inline-flex h-9 sm:h-10 px-2.5 items-center justify-center gap-1.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors shrink-0 cursor-pointer tabular-nums"
              aria-label={`${t.nav.favorites} (${favoritesCount})`}
              title={t.nav.favorites}
            >
              <Heart
                className={`w-4 h-4 ${
                  favoritesCount > 0 ? 'text-rose-500 fill-rose-500' : 'text-[var(--text-secondary)]'
                }`}
              />
              {favoritesCount > 0 && (
                <span className="text-xs font-mono-tech font-semibold">{favoritesCount}</span>
              )}
            </button>
          )}

          {/* Theme Toggle — visible on sm+, collapsed into menu on mobile */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="hidden sm:inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] transition-colors shrink-0 cursor-pointer"
            aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-[var(--accent)]" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Bag Button — always visible, compact on mobile */}
          <button
            type="button"
            onClick={onOpenCart}
            className="h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-lg bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 tabular-nums cursor-pointer"
            aria-label={`${t.nav.bag} (${cartCount})`}
          >
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">{t.nav.bag}</span>
            <span>({cartCount})</span>
          </button>

          {/* Menu Button — visible on < lg */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="lg:hidden h-9 w-9 sm:h-10 sm:w-10 inline-flex items-center justify-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] shrink-0 cursor-pointer"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Navigation Drawer (Fully Opaque) */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden border-t border-[var(--border-hairline)] bg-[var(--bg-surface)] px-4 py-4 space-y-3 shadow-xl"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div className="space-y-1">
            {links.map((link) => {
              const active = route === link.id;
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleLinkClick(link.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[var(--bg-subtle)] text-[var(--accent)] font-semibold'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  {link.label}
                </button>
              );
            })}
          </div>

          {/* Collapsed Mobile Controls: Language, Theme, Favorites, Currency */}
          <div className="pt-3 border-t border-[var(--border-hairline)] space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onToggleLang}
                className="h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono-tech font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span>{lang === 'en' ? 'ՀԱՅԵՐԵՆ' : 'ENGLISH'}</span>
              </button>

              <button
                type="button"
                onClick={onToggleTheme}
                className="h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>{lang === 'hy' ? 'Լուսավոր' : 'Light'}</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Մութ' : 'Dark'}</span>
                  </>
                )}
              </button>

              {onSelectFavorites && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectFavorites();
                    setMobileMenuOpen(false);
                  }}
                  className="h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Heart
                    className={`w-3.5 h-3.5 ${
                      favoritesCount > 0 ? 'text-rose-500 fill-rose-500' : ''
                    }`}
                  />
                  <span>
                    {t.nav.favorites} ({favoritesCount})
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-xs font-mono-tech text-[var(--text-secondary)]">
                {lang === 'hy' ? 'Արժույթ' : 'Currency'}
              </span>
              <div className="inline-flex items-center gap-1.5">
                {currencies.map((curr) => {
                  const symbol = curr === 'USD' ? '$' : curr === 'EUR' ? '€' : '֏';
                  return (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => onSetCurrency(curr)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-mono-tech cursor-pointer ${
                        currency === curr
                          ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-semibold'
                          : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {symbol} {curr}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
