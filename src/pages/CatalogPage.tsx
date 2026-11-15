import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, Sparkles, X, MapPin, Plus, LogIn, LogOut, Phone, Trash2, User } from 'lucide-react';
import { supabase, DbListing } from '../lib/supabase';
import { AuthModal } from '../components/AuthModal';
import { AddListingModal } from '../components/AddListingModal';
import { Product2DIllustration } from '../components/Product2DIllustration';
import {
  ALL_LISTINGS,
  LISTING_CATEGORIES,
  Listing,
  ListingCategory,
  listingFromDb,
} from '../data/listings';
import type { Currency, Language } from '../types/hardware';

interface CatalogPageProps {
  lang: Language;
  currency: Currency;
  /** Opens the listing's own viewer (car 360° or device 3D) */
  onOpenListing: (listing: Listing) => void;
}

type SortId = 'newest' | 'cheap' | 'expensive';

// Simple fixed rates for showing prices (USD is the base)
const RATES: Record<Currency, { rate: number; symbol: string }> = {
  USD: { rate: 1, symbol: '$' },
  EUR: { rate: 0.92, symbol: '€' },
  AMD: { rate: 387, symbol: '֏' },
};

export const CatalogPage: React.FC<CatalogPageProps> = ({ lang, currency, onOpenListing }) => {
  const [category, setCategory] = useState<ListingCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('all');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [only8k, setOnly8k] = useState(false);
  const [sort, setSort] = useState<SortId>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [photoListing, setPhotoListing] = useState<Listing | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  // ---- Users & listings stored in Supabase ----
  const [dbListings, setDbListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [onlyMine, setOnlyMine] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadDbListings = useCallback(async () => {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setLoadError(null);
    setDbListings(((data ?? []) as DbListing[]).map(listingFromDb));
  }, []);

  useEffect(() => {
    void loadDbListings();
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setUserEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setUserEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadDbListings]);

  const allListings = useMemo(() => [...dbListings, ...ALL_LISTINGS], [dbListings]);

  const handleDelete = async (listing: Listing) => {
    if (!listing.dbId) return;
    const sure = window.confirm(lang === 'hy' ? 'Ջնջե՞լ այս հայտարարությունը' : 'Delete this listing?');
    if (!sure) return;
    const { error } = await supabase.from('listings').delete().eq('id', listing.dbId);
    if (error) {
      window.alert(error.message);
      return;
    }
    // Remove its photos from storage too (paths look like <user id>/<file>)
    if (listing.viewer.type === 'photos') {
      const paths = listing.viewer.photos
        .map((url) => url.split('/listing-photos/')[1])
        .filter((p): p is string => Boolean(p));
      if (paths.length) await supabase.storage.from('listing-photos').remove(paths);
    }
    setPhotoListing(null);
    void loadDbListings();
  };

  const hy = lang === 'hy';

  const formatPrice = (usd: number) => {
    const { rate, symbol } = RATES[currency];
    const value = Math.round(usd * rate).toLocaleString('en-US');
    return currency === 'AMD' ? `${value} ${symbol}` : `${symbol}${value}`;
  };

  // Prices typed in the filter boxes are in the selected currency
  const toUsd = (typed: string) => {
    const n = Number(typed.replace(/[^0-9.]/g, ''));
    return n > 0 ? n / RATES[currency].rate : null;
  };

  const inCategory = useMemo(
    () =>
      allListings.filter(
        (l) =>
          (category === 'all' || l.category === category) && (!onlyMine || (userId && l.ownerId === userId))
      ),
    [category, allListings, onlyMine, userId]
  );

  const brands = useMemo(
    () => Array.from(new Set(inCategory.map((l) => l.brand))).sort(),
    [inCategory]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const min = toUsd(minPrice);
    const max = toUsd(maxPrice);
    const list = inCategory.filter((l) => {
      if (brand !== 'all' && l.brand !== brand) return false;
      if (only8k && !l.is8k) return false;
      if (min !== null && l.priceUsd < min) return false;
      if (max !== null && l.priceUsd > max) return false;
      if (q && !`${l.title.en} ${l.title.hy} ${l.brand}`.toLowerCase().includes(q)) return false;
      return true;
    });
    return list.sort((a, b) =>
      sort === 'cheap'
        ? a.priceUsd - b.priceUsd
        : sort === 'expensive'
          ? b.priceUsd - a.priceUsd
          : b.postedAt.localeCompare(a.postedAt)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inCategory, query, brand, minPrice, maxPrice, only8k, sort, currency]);

  const countFor = (id: ListingCategory | 'all') =>
    id === 'all' ? allListings.length : allListings.filter((l) => l.category === id).length;

  const resetFilters = () => {
    setQuery('');
    setBrand('all');
    setMinPrice('');
    setMaxPrice('');
    setOnly8k(false);
    setSort('newest');
  };

  const handleOpen = (listing: Listing) => {
    if (listing.viewer.type === 'photos') {
      setPhotoListing(listing);
      setPhotoIndex(0);
    } else {
      onOpenListing(listing);
    }
  };

  const categoryButtons: Array<{ id: ListingCategory | 'all'; label: string; icon: string }> = [
    { id: 'all', label: hy ? 'Բոլորը' : 'All', icon: '🗂️' },
    ...LISTING_CATEGORIES.map((c) => ({ id: c.id, label: c.label[lang], icon: c.icon })),
  ];

  const filtersBlock = (
    <div className="space-y-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
          {hy ? 'Մակնիշ' : 'Brand'}
        </div>
        <select
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm cursor-pointer"
        >
          <option value="all">{hy ? 'Բոլորը' : 'All'}</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5">
          {hy ? 'Գին' : 'Price'} ({RATES[currency].symbol})
        </div>
        <div className="flex items-center gap-2">
          <input
            inputMode="numeric"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder={hy ? 'Սկսած' : 'From'}
            className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm"
          />
          <span className="text-[var(--text-secondary)]">–</span>
          <input
            inputMode="numeric"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder={hy ? 'Մինչև' : 'To'}
            className="w-full h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          checked={only8k}
          onChange={(e) => setOnly8k(e.target.checked)}
          className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
        />
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        {hy ? 'Միայն 8K / 3D դիտմամբ' : 'Only with 8K / 3D view'}
      </label>

      <button
        type="button"
        onClick={resetFilters}
        className="w-full h-9 rounded-lg border border-[var(--border-hairline)] text-sm hover:border-[var(--accent)] transition-colors cursor-pointer"
      >
        {hy ? 'Մաքրել ֆիլտրերը' : 'Reset filters'}
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Account bar: post a listing, my listings, sign in / out */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => (userId ? setAddOpen(true) : setAuthOpen(true))}
          className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[#080709] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {hy ? 'Ավելացնել հայտարարություն' : 'Post a listing'}
        </button>
        {userId && (
          <button
            type="button"
            onClick={() => setOnlyMine((v) => !v)}
            className={`h-10 px-3.5 rounded-xl border text-sm inline-flex items-center gap-1.5 cursor-pointer ${
              onlyMine
                ? 'border-[var(--accent)] text-[var(--accent)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
            }`}
          >
            <User className="w-4 h-4" />
            {hy ? 'Իմ հայտարարությունները' : 'My listings'}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2 text-xs text-[var(--text-secondary)]">
          {userEmail && <span className="hidden sm:inline truncate max-w-[180px]">{userEmail}</span>}
          {userId ? (
            <button
              type="button"
              onClick={() => {
                void supabase.auth.signOut();
                setOnlyMine(false);
              }}
              className="h-10 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              {hy ? 'Ելք' : 'Sign out'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="h-10 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] inline-flex items-center gap-1.5 text-sm text-[var(--text-primary)] cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              {hy ? 'Մուտք' : 'Sign in'}
            </button>
          )}
        </div>
      </div>

      {loadError && (
        <div className="mb-3 text-xs text-red-500">
          {hy ? 'Օգտատերերի հայտարարությունները չբեռնվեցին.' : 'Could not load user listings:'} {loadError}
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={hy ? 'Որոնել հայտարարություններում…' : 'Search listings…'}
            className="w-full h-11 pl-9 pr-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm focus:border-[var(--accent)] outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className="lg:hidden h-11 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] inline-flex items-center gap-1.5 text-sm cursor-pointer"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {hy ? 'Ֆիլտր' : 'Filters'}
        </button>
      </div>

      {/* Category chips (all screen sizes) */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categoryButtons.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setCategory(c.id);
                setBrand('all');
              }}
              className={`shrink-0 h-10 px-4 rounded-xl border text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer ${
                active
                  ? 'bg-[var(--accent)] text-[#080709] border-[var(--accent)]'
                  : 'bg-[var(--bg-surface)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
              }`}
            >
              <span>{c.icon}</span>
              {c.label}
              <span className={`text-xs ${active ? 'opacity-70' : 'text-[var(--text-secondary)]'}`}>
                {countFor(c.id)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile filters (collapsible) */}
      {showFilters && (
        <div className="lg:hidden mb-4 p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
          {filtersBlock}
        </div>
      )}

      <div className="flex gap-6">
        {/* Desktop filter sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-24 p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
            {filtersBlock}
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          {/* Result count + sort */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="text-sm text-[var(--text-secondary)]">
              {hy ? `Գտնվել է ${results.length} հայտարարություն` : `${results.length} listings found`}
            </div>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortId)}
              className="h-9 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm cursor-pointer"
            >
              <option value="newest">{hy ? 'Նորերը' : 'Newest'}</option>
              <option value="cheap">{hy ? 'Էժանից թանկ' : 'Price: low to high'}</option>
              <option value="expensive">{hy ? 'Թանկից էժան' : 'Price: high to low'}</option>
            </select>
          </div>

          {results.length === 0 ? (
            <div className="py-16 text-center text-[var(--text-secondary)] text-sm">
              {hy ? 'Ոչինչ չի գտնվել։ Փորձեք փոխել ֆիլտրերը։' : 'Nothing found. Try changing the filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {results.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => handleOpen(l)}
                  className="group text-left rounded-2xl overflow-hidden border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)] hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="relative aspect-[4/3] bg-[var(--bg-elevated)] overflow-hidden flex items-center justify-center">
                    {l.imageUrl ? (
                      <img
                        src={l.imageUrl}
                        alt={l.title[lang]}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <Product2DIllustration
                        kind="tech"
                        deviceCategory={l.deviceCategory}
                        brand={l.brand.toLowerCase()}
                        name={l.title.en}
                        primaryHex={l.colorHex}
                        size="md"
                      />
                    )}
                    {l.is8k && (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/75 text-amber-300 text-[10px] font-bold tracking-wider inline-flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {l.category === 'cars' ? '8K 360°' : '3D'}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 sm:p-3">
                    <div className="font-bold text-sm sm:text-base">{formatPrice(l.priceUsd)}</div>
                    <div className="text-xs sm:text-sm mt-0.5 line-clamp-2">{l.title[lang]}</div>
                    <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{l.city[lang]}</span>
                      <span className="ml-auto shrink-0">{l.postedAt.slice(5).replace('-', '.')}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Simple photo gallery for listings without an 8K view */}
      {photoListing && photoListing.viewer.type === 'photos' && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex flex-col items-center justify-center p-4"
          onClick={() => setPhotoListing(null)}
        >
          <button
            type="button"
            onClick={() => setPhotoListing(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={photoListing.viewer.photos[photoIndex]}
            alt={photoListing.title[lang]}
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-[75vh] rounded-xl object-contain"
          />
          <div className="mt-3 text-white text-center max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="font-bold">{formatPrice(photoListing.priceUsd)}</div>
            <div className="text-sm opacity-80">
              {photoListing.title[lang]} · {photoListing.city[lang]}
              {photoListing.year ? ` · ${photoListing.year}` : ''}
            </div>
            {photoListing.description && (
              <div className="mt-2 text-sm opacity-80 whitespace-pre-line max-h-24 overflow-y-auto">
                {photoListing.description}
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-2">
              {photoListing.phone && (
                <a
                  href={`tel:${photoListing.phone}`}
                  className="h-9 px-3 rounded-lg bg-amber-400 text-black text-sm font-bold inline-flex items-center gap-1.5"
                >
                  <Phone className="w-4 h-4" />
                  {photoListing.phone}
                </a>
              )}
              {userId && photoListing.ownerId === userId && (
                <button
                  type="button"
                  onClick={() => void handleDelete(photoListing)}
                  className="h-9 px-3 rounded-lg bg-red-600 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  {hy ? 'Ջնջել' : 'Delete'}
                </button>
              )}
            </div>
          </div>
          {photoListing.viewer.photos.length > 1 && (
            <div className="mt-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
              {photoListing.viewer.photos.map((p, i) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPhotoIndex(i)}
                  className={`w-14 h-10 rounded-md overflow-hidden border-2 cursor-pointer ${
                    i === photoIndex ? 'border-amber-400' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {authOpen && <AuthModal lang={lang} onClose={() => setAuthOpen(false)} />}
      {addOpen && userId && (
        <AddListingModal
          lang={lang}
          currency={currency}
          rateFromUsd={RATES[currency].rate}
          userId={userId}
          onClose={() => setAddOpen(false)}
          onCreated={() => void loadDbListings()}
        />
      )}
    </div>
  );
};
