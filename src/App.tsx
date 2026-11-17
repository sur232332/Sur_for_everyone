import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { DEVICES, getDeviceById } from './data/devices';
import { useLivePricing } from './hooks/useLivePricing';
import { Navbar } from './components/Navbar';
import { CartDrawer } from './components/CartDrawer';
import { ARViewerModal } from './components/ARViewerModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ShowroomPage } from './pages/ShowroomPage';
import { BrandPage } from './pages/BrandPage';
import { ComparePage } from './pages/ComparePage';
import { HomeGuidePage } from './pages/HomeGuidePage';
import { MotorGalleryPage } from './pages/MotorGalleryPage';
import { CatalogPage } from './pages/CatalogPage';
import { MyLotPage } from './pages/MyLotPage';
import { ScrollStoryPage } from './pages/ScrollStoryPage';
import type { Listing } from './data/listings';
import { CartItem, Currency, DeviceSpec, Language, PageRoute } from './types/hardware';

const STORAGE_KEYS = {
  CART: 'sp_cart_v1',
  FAVORITES: 'sp_favorites_v1',
  PRICE_ALERTS: 'sp_price_alerts_v1',
  CURRENCY: 'sp_currency_v1',
  LANG: 'sp_lang_v1',
  THEME: 'sp_theme_v1',
};

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [route, setRoute] = useState<PageRoute>(() => {
    try {
      if (window.location.pathname === '/gallery') return 'showroom';
      if (window.location.pathname === '/home-guide') return 'home-guide';
      if (window.location.pathname === '/catalog') return 'catalog';
      if (window.location.pathname === '/my-lot') return 'my-lot';
      if (window.location.pathname === '/motor-gallery') return 'motor-gallery';
    } catch {
      // ignore
    }
    return 'story';
  });
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | undefined>(undefined);
  const [compareSeedId, setCompareSeedId] = useState<string | undefined>(undefined);
  // Car to open right away in the Motor Gallery (when clicked in the Catalog)
  const [catalogCarId, setCatalogCarId] = useState<string | undefined>(undefined);

  const [lang, setLang] = useState<Language>(() => readStorage<Language>(STORAGE_KEYS.LANG, 'en'));
  const [currency, setCurrency] = useState<Currency>(() =>
    readStorage<Currency>(STORAGE_KEYS.CURRENCY, 'USD')
  );
  const [darkMode, setDarkMode] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.THEME, false)
  );

  const [cart, setCart] = useState<CartItem[]>(() => readStorage<CartItem[]>(STORAGE_KEYS.CART, []));
  const [favorites, setFavorites] = useState<string[]>(() =>
    readStorage<string[]>(STORAGE_KEYS.FAVORITES, [])
  );
  const [priceAlerts, setPriceAlerts] = useState<Record<string, number>>(() =>
    readStorage<Record<string, number>>(STORAGE_KEYS.PRICE_ALERTS, {})
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [arTarget, setArTarget] = useState<{ device: DeviceSpec; finishId: string } | null>(null);

  const { prices, connected, refreshDevicePrice } = useLivePricing();

  // Persist user preferences and state to localStorage
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(darkMode));
    } catch {
      // ignore storage errors
    }
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, JSON.stringify(lang));
    } catch {
      // ignore
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENCY, JSON.stringify(currency));
    } catch {
      // ignore
    }
  }, [currency]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CART, JSON.stringify(cart));
    } catch {
      // ignore
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    } catch {
      // ignore
    }
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRICE_ALERTS, JSON.stringify(priceAlerts));
    } catch {
      // ignore
    }
  }, [priceAlerts]);

  // Support deep link ?ar=<deviceId> from mobile QR scan
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const arId = params.get('ar');
      if (arId && DEVICES.some((d) => d.id === arId)) {
        const dev = getDeviceById(arId);
        setArTarget({ device: dev, finishId: dev.finishes[0].id });
      }
    } catch {
      // ignore
    }
  }, []);

  // Sync browser back/forward for routes
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      if (path === '/gallery') {
        setRoute('showroom');
      } else if (path === '/home-guide') {
        setRoute('home-guide');
      } else if (path === '/catalog') {
        setRoute('catalog');
      } else if (path === '/my-lot') {
        setRoute('my-lot');
      } else if (path === '/motor-gallery') {
        setRoute('motor-gallery');
      } else {
        setRoute('story');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleNavigate = (nextRoute: PageRoute, deviceId?: string) => {
    setRoute(nextRoute);
    setFocusedDeviceId(deviceId);
    try {
      const targetPath =
        nextRoute === 'showroom'
          ? '/gallery'
          : `/${nextRoute}`;
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    } catch {
      // ignore history errors in sandboxed iframes
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Catalog card clicked -> open that item's own viewer
  const handleOpenListing = (listing: Listing) => {
    if (listing.viewer.type === 'car-360') {
      setCatalogCarId(listing.viewer.carId);
      handleNavigate('motor-gallery');
    } else if (listing.viewer.type === 'device-3d') {
      handleNavigate(listing.viewer.brand, listing.viewer.deviceId);
    }
  };

  const handleCompareDevice = (deviceId: string) => {
    setCompareSeedId(deviceId);
    setRoute('compare');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAR = (device: DeviceSpec, finishId?: string) => {
    setArTarget({
      device,
      finishId: finishId || device.finishes[0].id,
    });
  };

  const handleAddToCart = (deviceId: string, finishId: string, storageId: string) => {
    const key = `${deviceId}::${finishId}::${storageId}`;
    setCart((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { key, deviceId, finishId, storageId, quantity: 1 }];
    });
  };

  const handleUpdateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.key === key ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveItem = (key: string) => {
    setCart((prev) => prev.filter((item) => item.key !== key));
  };

  const handleToggleFavorite = (deviceId: string) => {
    setFavorites((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleTogglePriceAlert = (deviceId: string, targetUsd: number) => {
    setPriceAlerts((prev) => {
      const next = { ...prev };
      if (next[deviceId]) {
        delete next[deviceId];
      } else {
        next[deviceId] = targetUsd;
      }
      return next;
    });
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
        <Navbar
          route={route}
          onNavigate={(r) => {
            setCatalogCarId(undefined);
            handleNavigate(r);
          }}
          lang={lang}
          onToggleLang={() => setLang((l) => (l === 'en' ? 'hy' : 'en'))}
          currency={currency}
          onSetCurrency={(c) => setCurrency(c)}
          darkMode={darkMode}
          onToggleTheme={() => setDarkMode((d) => !d)}
          cartCount={cartCount}
          onOpenCart={() => setCartOpen(true)}
          favoritesCount={favorites.length}
          onSelectFavorites={() => handleNavigate('showroom')}
        />

        <main className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${route}-${focusedDeviceId || ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <ErrorBoundary>
                {route === 'motor-gallery' && (
                  <MotorGalleryPage
                    lang={lang}
                    currency={currency}
                    onToggleLang={() => setLang((l) => (l === 'en' ? 'hy' : 'en'))}
                    initialCarId={catalogCarId}
                  />
                )}

                {route === 'story' && (
                  <ScrollStoryPage lang={lang} onNavigate={handleNavigate} />
                )}

                {route === 'my-lot' && <MyLotPage lang={lang} onNavigate={handleNavigate} />}

                {route === 'catalog' && (
                  <CatalogPage lang={lang} currency={currency} onOpenListing={handleOpenListing} />
                )}

                {route === 'showroom' && (
                  <ShowroomPage
                    lang={lang}
                    currency={currency}
                    darkMode={darkMode}
                    prices={prices}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    priceAlerts={priceAlerts}
                    onTogglePriceAlert={handleTogglePriceAlert}
                    onNavigate={handleNavigate}
                    onOpenAR={handleOpenAR}
                    onAddToCart={handleAddToCart}
                    onCompareDevice={handleCompareDevice}
                    onRefreshPrice={(id) => void refreshDevicePrice(id, true)}
                    cartCount={cartCount}
                    onOpenCart={() => setCartOpen(true)}
                  />
                )}

                {(route === 'samsung' || route === 'apple' || route === 'huawei') && (
                  <BrandPage
                    brand={route}
                    initialDeviceId={focusedDeviceId}
                    lang={lang}
                    currency={currency}
                    darkMode={darkMode}
                    prices={prices}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    priceAlerts={priceAlerts}
                    onTogglePriceAlert={handleTogglePriceAlert}
                    onNavigate={handleNavigate}
                    onCompareDevice={handleCompareDevice}
                    onOpenAR={handleOpenAR}
                    onAddToCart={handleAddToCart}
                    onRefreshPrice={(id) => void refreshDevicePrice(id, true)}
                  />
                )}

                {route === 'compare' && (
                  <ComparePage
                    initialDeviceAId={compareSeedId}
                    lang={lang}
                    currency={currency}
                    darkMode={darkMode}
                    prices={prices}
                    priceAlerts={priceAlerts}
                    onTogglePriceAlert={handleTogglePriceAlert}
                    onOpenAR={handleOpenAR}
                    onAddToCart={handleAddToCart}
                  />
                )}

                {route === 'home-guide' && (
                  <HomeGuidePage
                    lang={lang}
                    darkMode={darkMode}
                    onOpenGalleryView={() => handleNavigate('showroom')}
                    onNavigateDevice={(brand, deviceId) => handleNavigate(brand, deviceId)}
                    onOpenAR={handleOpenAR}
                    onAddToCart={handleAddToCart}
                    onCompareDevice={handleCompareDevice}
                    favorites={favorites}
                    onToggleFavorite={handleToggleFavorite}
                    priceAlerts={priceAlerts}
                    onTogglePriceAlert={handleTogglePriceAlert}
                    onRefreshPrice={(id) => void refreshDevicePrice(id, true)}
                    devicePrices={prices}
                    cartCount={cartCount}
                    onOpenCart={() => setCartOpen(true)}
                  />
                )}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        <footer hidden={route === 'story'} className="border-t border-[var(--border-hairline)] mt-12 py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
            <div>
              SILICON PULSE ·{' '}
              {lang === 'hy'
                ? 'Սամսունգ, Ապլ, Հուավեյ 3D և AR Ցուցասրահ'
                : 'Samsung, Apple & Huawei 3D + AR Showroom'}
            </div>
            <div className="font-mono-tech">
              {connected
                ? lang === 'hy'
                  ? 'Ուղիղ Գնային Սինխրոնիզացիա · USD / EUR / AMD'
                  : 'Live Pricing Sync · USD / EUR / AMD'
                : lang === 'hy'
                  ? 'Կատալոգի Գներ · USD / EUR / AMD'
                  : 'Catalog Pricing · USD / EUR / AMD'}
            </div>
          </div>
        </footer>

        <CartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          items={cart}
          onUpdateQty={handleUpdateQty}
          onRemoveItem={handleRemoveItem}
          onClearCart={() => setCart([])}
          prices={prices}
          lang={lang}
          currency={currency}
        />

        {arTarget && (
          <ErrorBoundary>
            <ARViewerModal
              device={arTarget.device}
              finish={
                arTarget.device.finishes.find((f) => f.id === arTarget.finishId) ||
                arTarget.device.finishes[0]
              }
              lang={lang}
              onClose={() => setArTarget(null)}
            />
          </ErrorBoundary>
        )}
      </div>
    </ErrorBoundary>
  );
}
