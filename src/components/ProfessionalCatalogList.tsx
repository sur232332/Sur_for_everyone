import React, { useMemo, useState } from 'react';
import {
  Check,
  Cpu,
  Eye,
  Flame,
  GitCompareArrows,
  Grid,
  Heart,
  Info,
  Laptop,
  List,
  Refrigerator,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tag,
  WashingMachine,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import { DEVICES } from '../data/devices';
import {
  APPLIANCE_MODELS,
  ApplianceCategoryId,
  getApplianceBasePriceUsd,
} from '../data/homeGuideData';
import { formatDevicePrice } from '../hooks/useLivePricing';
import {
  Currency,
  DeviceCategory,
  DeviceSpec,
  Language,
  LivePriceEntry,
  PageRoute,
} from '../types/hardware';
import { Product2DIllustration } from './Product2DIllustration';

export type CatalogCategoryFilter =
  | 'all'
  | 'smartphones'
  | 'laptops_chips'
  | 'refrigerator'
  | 'gas_stove'
  | 'microwave'
  | 'washing_machine'
  | 'dryer';

export type PriceBracketId = 'all' | 'under_600' | '600_1400' | '1400_2500' | 'over_2500';
export type CatalogSortId = 'featured' | 'price_asc' | 'price_desc' | 'name_asc';

interface UnifiedCatalogItem {
  id: string;
  kind: 'tech' | 'appliance';
  brand: string;
  modelCode: string;
  name: string;
  categoryGroup: Exclude<CatalogCategoryFilter, 'all'>;
  categoryLabel: { en: string; hy: string };
  priceUsd: number;
  badgeText: string;
  releaseYear: string;
  tagline: { en: string; hy: string };
  summary: { en: string; hy: string };
  keySpecs: Array<{ label: { en: string; hy: string }; value: { en: string; hy: string } }>;
  finishes: Array<{ id: string; name: { en: string; hy: string }; hex: string; accentHex: string }>;
  options: Array<{ id: string; label: string; deltaUsd: number }>;
  rawDevice?: DeviceSpec;
  deviceCategory?: DeviceCategory;
  applianceCategory?: ApplianceCategoryId;
}

export interface ProfessionalCatalogListProps {
  lang: Language;
  currency: Currency;
  prices?: Record<string, LivePriceEntry>;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onAddToCart: (deviceId: string, finishId: string, storageId: string) => void;
  onOpenCart?: () => void;
  cartCount?: number;
  onCompareDevice?: (deviceId: string) => void;
  onNavigate?: (route: PageRoute, deviceId?: string) => void;
  onInspectIn3DHall?: (
    id: string,
    kind: 'tech' | 'appliance',
    applianceCat?: ApplianceCategoryId
  ) => void;
  favoritesOnlyInitial?: boolean;
}

export const ProfessionalCatalogList: React.FC<ProfessionalCatalogListProps> = ({
  lang,
  currency,
  prices = {},
  favorites,
  onToggleFavorite,
  onAddToCart,
  onOpenCart,
  cartCount = 0,
  onCompareDevice,
  onInspectIn3DHall,
  favoritesOnlyInitial = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CatalogCategoryFilter>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceBracket, setPriceBracket] = useState<PriceBracketId>('all');
  const [minPriceUsd, setMinPriceUsd] = useState<number>(0);
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(4000);
  const [favoritesOnly, setFavoritesOnly] = useState<boolean>(favoritesOnlyInitial);
  const [sortBy, setSortBy] = useState<CatalogSortId>('featured');
  const [layoutMode, setLayoutMode] = useState<'list' | 'grid'>('list');

  // Selected finish & storage/option per item ID
  const [selectedFinishMap, setSelectedFinishMap] = useState<Record<string, string>>({});
  const [selectedOptionMap, setSelectedOptionMap] = useState<Record<string, string>>({});
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // 2D Product Detail Modal state (pure 2D image + full specification table, NO 3D!)
  const [detailModalItemId, setDetailModalItemId] = useState<string | null>(null);

  const sampleEntry = Object.values(prices)[0];
  const amdRate = sampleEntry?.amdRate ?? 388.5;
  const eurRate = sampleEntry?.eurRate ?? 0.92;

  // Build unified 2D catalog combining all 15 Flagship Tech Devices + 24 Major/Home Appliances (39 total)
  const allCatalogItems = useMemo<UnifiedCatalogItem[]>(() => {
    const items: UnifiedCatalogItem[] = [];

    for (const dev of DEVICES) {
      const liveUsd = prices[dev.id]?.priceUsd ?? dev.basePriceUsd;
      const isPhoneOrFold = dev.category === 'phone' || dev.category === 'foldable';
      const brandLabel =
        dev.brand === 'samsung'
          ? 'Samsung'
          : dev.brand === 'apple'
            ? 'Apple'
            : 'Huawei';

      items.push({
        id: dev.id,
        kind: 'tech',
        brand: brandLabel,
        modelCode: dev.id.toUpperCase(),
        name: dev.name,
        categoryGroup: isPhoneOrFold ? 'smartphones' : 'laptops_chips',
        categoryLabel:
          dev.category === 'phone'
            ? { en: 'Flagship Smartphone', hy: 'Ֆլագման Սմարթֆոն' }
            : dev.category === 'foldable'
              ? { en: 'Foldable Smartphone', hy: 'Ծալովի Սմարթֆոն' }
              : dev.category === 'laptop'
                ? { en: 'Laptop / Tablet', hy: 'Նոութբուք / Պլանշետ' }
                : { en: 'Silicon SoC', hy: 'Պրոցեսոր / Չիպ' },
        priceUsd: liveUsd,
        badgeText: dev.screenBadge,
        releaseYear: String(dev.releaseYear),
        tagline: dev.tagline,
        summary: dev.summary,
        keySpecs: [
          {
            label: { en: 'Processor', hy: 'Պրոցեսոր' },
            value: dev.specs.processor,
          },
          {
            label: { en: 'Display', hy: 'Էկրան' },
            value: dev.specs.display,
          },
          {
            label: { en: 'Camera / Optics', hy: 'Տեսախցիկ / Օպտիկա' },
            value: dev.specs.camera,
          },
          {
            label: { en: 'Battery & Power', hy: 'Մարտկոց և Լիցքավորում' },
            value: dev.specs.battery,
          },
          {
            label: { en: 'Chassis & Frame', hy: 'Կորպուս և Նյութ' },
            value: dev.specs.chassis,
          },
          {
            label: { en: 'Dimensions & Weight', hy: 'Չափսեր և Քաշ' },
            value: {
              en: `${dev.dimensionsMm.height} × ${dev.dimensionsMm.width} × ${dev.dimensionsMm.depth} mm · ${dev.weightGrams} g`,
              hy: `${dev.dimensionsMm.height} × ${dev.dimensionsMm.width} × ${dev.dimensionsMm.depth} մմ · ${dev.weightGrams} գ`,
            },
          },
        ],
        finishes: dev.finishes.map((f) => ({
          id: f.id,
          name: f.name,
          hex: f.hex,
          accentHex: f.accentHex,
        })),
        options: dev.storageOptions.map((s) => ({
          id: s.id,
          label: s.label,
          deltaUsd: s.priceDeltaUsd,
        })),
        rawDevice: dev,
        deviceCategory: dev.category,
      });
    }

    const applianceCategoryTitleMap: Record<
      ApplianceCategoryId,
      { en: string; hy: string; hex: string; accent: string }
    > = {
      refrigerator: {
        en: 'Refrigerator',
        hy: 'Սառնարան',
        hex: '#2C3038',
        accent: '#38BDF8',
      },
      gas_stove: {
        en: 'Gas Stove & Oven',
        hy: 'Գազօջախ և Վառարան',
        hex: '#1F2229',
        accent: '#F97316',
      },
      microwave: {
        en: 'Microwave Oven',
        hy: 'Միկրոալիքային Վառարան',
        hex: '#22252C',
        accent: '#10B981',
      },
      washing_machine: {
        en: 'Washing Machine',
        hy: 'Լվացքի Մեքենա',
        hex: '#E2E8F0',
        accent: '#60A5FA',
      },
      dryer: {
        en: 'Tumble Dryer',
        hy: 'Չորանոց (Dryer)',
        hex: '#D6D3D1',
        accent: '#FBBF24',
      },
      laptop: {
        en: 'Workstation Laptop',
        hy: 'Նոութբուք (Ստուդիա)',
        hex: '#272930',
        accent: '#E5A952',
      },
    };

    for (const app of APPLIANCE_MODELS) {
      const baseUsd = getApplianceBasePriceUsd(app.id);
      const catGroup: Exclude<CatalogCategoryFilter, 'all'> =
        app.categoryId === 'laptop' ? 'laptops_chips' : app.categoryId;
      const meta = applianceCategoryTitleMap[app.categoryId];

      items.push({
        id: app.id,
        kind: 'appliance',
        brand: app.brand,
        modelCode: app.modelCode,
        name: app.name,
        categoryGroup: catGroup,
        categoryLabel: { en: meta.en, hy: meta.hy },
        priceUsd: baseUsd,
        badgeText: `${app.energyClass} · ${app.dimensionsCm}`,
        releaseYear: '2025',
        tagline: app.highlights,
        summary: {
          en: `${app.name} (${app.modelCode}) — ${app.capacityLabel.en}, ${app.specs.powerOrConsumption.en}, Energy Class ${app.energyClass}, Dimensions ${app.dimensionsCm}. ${app.highlights.en}`,
          hy: `${app.name} (${app.modelCode}) — ${app.capacityLabel.hy}, ${app.specs.powerOrConsumption.hy}, Էներգախնայողություն ${app.energyClass}, Չափսեր ${app.dimensionsCm}։ ${app.highlights.hy}`,
        },
        keySpecs: [
          {
            label: { en: 'Capacity / Volume', hy: 'Ծավալ / Տարողություն' },
            value: app.capacityLabel,
          },
          {
            label: { en: 'Power / Burner System', hy: 'Հզորություն / Ջեռուցում' },
            value: app.specs.powerOrConsumption,
          },
          {
            label: { en: 'Energy Class & Size', hy: 'Էներգախնայողություն և Չափս' },
            value: {
              en: `${app.energyClass} · ${app.dimensionsCm}`,
              hy: `${app.energyClass} · ${app.dimensionsCm}`,
            },
          },
          {
            label: { en: 'Key Technology', hy: 'Հիմնական Առավելություն' },
            value: app.highlights,
          },
        ],
        finishes: [
          {
            id: `${app.id}-inox`,
            name: { en: 'Brushed Inox / Dark Steel', hy: 'Չժանգոտվող Պողպատ / Մուգ' },
            hex: meta.hex,
            accentHex: meta.accent,
          },
          {
            id: `${app.id}-graphite`,
            name: { en: 'Matte Graphite', hy: 'Մատ Գրաֆիտ' },
            hex: '#1c1e24',
            accentHex: '#E5A952',
          },
        ],
        options: [
          { id: `${app.id}-std`, label: app.capacityLabel.en, deltaUsd: 0 },
          {
            id: `${app.id}-pro`,
            label: lang === 'hy' ? '+ 3 Տարի Երաշխիք' : '+ 3Y Extended Care',
            deltaUsd: 89,
          },
        ],
        applianceCategory: app.categoryId,
      });
    }

    return items;
  }, [prices, lang]);

  const availableBrands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of allCatalogItems) {
      if (categoryFilter !== 'all' && item.categoryGroup !== categoryFilter) continue;
      counts.set(item.brand, (counts.get(item.brand) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([brand, count]) => ({ brand, count }));
  }, [allCatalogItems, categoryFilter]);

  const toggleBrandSelection = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  const filteredItems = useMemo(() => {
    const list = allCatalogItems.filter((item) => {
      if (categoryFilter !== 'all' && item.categoryGroup !== categoryFilter) return false;
      if (selectedBrands.length > 0 && !selectedBrands.includes(item.brand)) return false;
      if (favoritesOnly && !favorites.includes(item.id)) return false;
      if (item.priceUsd < minPriceUsd || item.priceUsd > maxPriceUsd) return false;

      if (priceBracket === 'under_600' && item.priceUsd >= 600) return false;
      if (priceBracket === '600_1400' && (item.priceUsd < 600 || item.priceUsd > 1400))
        return false;
      if (priceBracket === '1400_2500' && (item.priceUsd < 1400 || item.priceUsd > 2500))
        return false;
      if (priceBracket === 'over_2500' && item.priceUsd <= 2500) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const inName = item.name.toLowerCase().includes(q);
        const inBrand = item.brand.toLowerCase().includes(q);
        const inCode = item.modelCode.toLowerCase().includes(q);
        const inTag =
          item.tagline.en.toLowerCase().includes(q) ||
          item.tagline.hy.toLowerCase().includes(q);
        const inSpecs = item.keySpecs.some(
          (s) =>
            s.value.en.toLowerCase().includes(q) || s.value.hy.toLowerCase().includes(q)
        );
        if (!inName && !inBrand && !inCode && !inTag && !inSpecs) return false;
      }

      return true;
    });

    if (sortBy === 'price_asc') {
      list.sort((a, b) => a.priceUsd - b.priceUsd);
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => b.priceUsd - a.priceUsd);
    } else if (sortBy === 'name_asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [
    allCatalogItems,
    categoryFilter,
    selectedBrands,
    favoritesOnly,
    favorites,
    minPriceUsd,
    maxPriceUsd,
    priceBracket,
    searchQuery,
    sortBy,
  ]);

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setSelectedBrands([]);
    setPriceBracket('all');
    setMinPriceUsd(0);
    setMaxPriceUsd(4000);
    setFavoritesOnly(false);
    setSortBy('featured');
  };

  const handleAddItem = (item: UnifiedCatalogItem) => {
    const finId = selectedFinishMap[item.id] || item.finishes[0].id;
    const optId = selectedOptionMap[item.id] || item.options[0].id;
    onAddToCart(item.id, finId, optId);
    setJustAddedId(item.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  const categoryTabs: Array<{
    id: CatalogCategoryFilter;
    label: { en: string; hy: string };
    icon: React.ReactNode;
    count: number;
  }> = [
    {
      id: 'all',
      label: { en: 'All Products', hy: 'Բոլոր Ապրանքները' },
      icon: <Sparkles className="w-3.5 h-3.5" />,
      count: allCatalogItems.length,
    },
    {
      id: 'smartphones',
      label: { en: 'Phones & Foldables', hy: 'Սմարթֆոններ և Ծալովի' },
      icon: <Smartphone className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'smartphones').length,
    },
    {
      id: 'laptops_chips',
      label: { en: 'Laptops, Tablets & Chips', hy: 'Նոութբուքներ, Պլանշետներ և Չիպեր' },
      icon: <Laptop className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'laptops_chips').length,
    },
    {
      id: 'refrigerator',
      label: { en: 'Refrigerators', hy: 'Սառնարաններ' },
      icon: <Refrigerator className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'refrigerator').length,
    },
    {
      id: 'gas_stove',
      label: { en: 'Gas Stoves & Ovens', hy: 'Գազօջախներ և Վառարաններ' },
      icon: <Flame className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'gas_stove').length,
    },
    {
      id: 'microwave',
      label: { en: 'Microwaves', hy: 'Միկրոալիքային Վառարաններ' },
      icon: <Zap className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'microwave').length,
    },
    {
      id: 'washing_machine',
      label: { en: 'Washing Machines', hy: 'Լվացքի Մեքենաներ' },
      icon: <WashingMachine className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'washing_machine').length,
    },
    {
      id: 'dryer',
      label: { en: 'Tumble Dryers', hy: 'Չորանոցներ' },
      icon: <Wind className="w-3.5 h-3.5" />,
      count: allCatalogItems.filter((i) => i.categoryGroup === 'dryer').length,
    },
  ];

  const detailModalItem = detailModalItemId
    ? allCatalogItems.find((i) => i.id === detailModalItemId) || null
    : null;

  return (
    <section className="space-y-6" aria-label="Professional 2D Product Catalog">
      {/* =====================================================================
         TOP CATALOG HEADER BAR (Title + Quick Favorites & Cart Buttons)
         ===================================================================== */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-[var(--border-hairline)] pb-5">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-widest text-[var(--accent)]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {lang === 'hy'
                ? 'ՊՐՈՖԵՍԻՈՆԱԼ 2D ԱՊՐԱՆՔՆԵՐԻ ԿԱՏԱԼՈԳ · ԱՌԱՆՑ 3D-Ի'
                : 'PROFESSIONAL 2D PRODUCT CATALOG · FAST LIST VIEW'}
            </span>
          </div>
          <h1 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--text-primary)]">
            {lang === 'hy'
              ? 'Սմարթֆոններ, Նոութբուքներ և Տան Խոշոր Տեխնիկա'
              : 'Flagship Tech & Home Appliances Directory'}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-2xl">
            {lang === 'hy'
              ? 'Ընտրեք բաժինը, ֆիլտրեք ըստ բրենդի և գնի, պահպանեք ֆավորիտներում կամ անմիջապես ավելացրեք զամբյուղ։'
              : 'Filter by department, brand, and price range, save to favorites, inspect 2D spec sheets, or add directly to your shopping cart.'}
          </p>
        </div>

        {/* Favorites Filter & Shopping Cart Quick Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setFavoritesOnly((v) => !v)}
            className={`h-10 px-4 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-all cursor-pointer ${
              favoritesOnly
                ? 'border-rose-500 bg-rose-500 text-white shadow-sm'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:border-rose-500'
            }`}
          >
            <Heart
              className={`w-4 h-4 ${
                favoritesOnly
                  ? 'fill-white text-white'
                  : favorites.length > 0
                    ? 'fill-rose-500 text-rose-500'
                    : ''
              }`}
            />
            <span>{lang === 'hy' ? 'Ֆավորիտներ' : 'Favorites'}</span>
            <span
              className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono-tech ${
                favoritesOnly
                  ? 'bg-white/20 text-white'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
              }`}
            >
              {favorites.length}
            </span>
          </button>

          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[#080709] text-xs font-bold inline-flex items-center gap-2 shadow-sm hover:opacity-95 transition-opacity cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{lang === 'hy' ? 'Զամբյուղ' : 'Shopping Cart'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-black/15 text-[#080709] text-[10px] font-mono-tech font-bold">
                {cartCount}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
         2-COLUMN E-COMMERCE STORE LAYOUT:
         Left Sidebar (Filters: Categories, Brands, Price, Favorites)
         Right Main Area (Search, Sort, 2D Product Rows with Specs, Fav & Cart)
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT FILTER SIDEBAR (lg:col-span-3) */}
        <aside className="lg:col-span-3 space-y-5 p-4 sm:p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span>{lang === 'hy' ? 'Ֆիլտրեր' : 'Filters'}</span>
            </div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-[11px] font-mono-tech text-[var(--accent)] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'hy' ? 'Մաքրել' : 'Reset'}</span>
            </button>
          </div>

          {/* 1. Categories List */}
          <div className="space-y-2">
            <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
              {lang === 'hy' ? 'Բաժիններ' : 'Departments'}
            </div>
            <div className="space-y-1">
              {categoryTabs.map((tab) => {
                const active = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                        : 'text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      {tab.icon}
                      <span className="truncate">{tab.label[lang]}</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono-tech px-1.5 py-0.5 rounded-md ${
                        active
                          ? 'bg-white/20 text-[var(--bg-canvas)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Brand Multi-Select Filter */}
          <div className="space-y-2.5 pt-4 border-t border-[var(--border-hairline)]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--text-secondary)] inline-flex items-center gap-1">
                <Tag className="w-3 h-3 text-[var(--accent)]" />
                <span>{lang === 'hy' ? 'Բրենդներ' : 'Brands'}</span>
              </span>
              {selectedBrands.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedBrands([])}
                  className="text-[10px] font-mono-tech text-[var(--accent)] hover:underline cursor-pointer"
                >
                  {lang === 'hy' ? 'Բոլորը' : 'All'}
                </button>
              )}
            </div>

            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {availableBrands.map(({ brand, count }) => {
                const checked = selectedBrands.includes(brand);
                return (
                  <label
                    key={brand}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      checked
                        ? 'border-[var(--accent)] bg-[var(--accent)]/10 font-semibold text-[var(--text-primary)]'
                        : 'border-transparent hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleBrandSelection(brand)}
                        className="rounded accent-[var(--accent)] cursor-pointer"
                      />
                      <span>{brand}</span>
                    </span>
                    <span className="text-[10px] font-mono-tech opacity-75">({count})</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* 3. Price Range Filter (Min / Max + Slider + Quick Brackets) */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-hairline)]">
            <div className="flex items-center justify-between text-[11px] font-mono-tech">
              <span className="uppercase tracking-wider text-[var(--text-secondary)]">
                {lang === 'hy' ? 'Գնի Միջակայք' : 'Price Range'}
              </span>
              <span className="font-bold text-[var(--accent)] tabular-nums">
                {formatDevicePrice(maxPriceUsd, currency, amdRate, eurRate)}
              </span>
            </div>

            <input
              type="range"
              min={200}
              max={4000}
              step={50}
              value={maxPriceUsd}
              onChange={(e) => {
                setMaxPriceUsd(Number(e.target.value));
                setPriceBracket('all');
              }}
              className="hardware-slider w-full"
              aria-label="Maximum Price Filter"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  {lang === 'hy' ? 'Սկսած ($)' : 'Min ($)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={3800}
                  step={50}
                  value={minPriceUsd}
                  onChange={(e) => {
                    setMinPriceUsd(Math.max(0, Number(e.target.value)));
                    setPriceBracket('all');
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono-tech"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono-tech text-[var(--text-secondary)] mb-1">
                  {lang === 'hy' ? 'Մինչև ($)' : 'Max ($)'}
                </label>
                <input
                  type="number"
                  min={200}
                  max={5000}
                  step={50}
                  value={maxPriceUsd}
                  onChange={(e) => {
                    setMaxPriceUsd(Math.max(200, Number(e.target.value)));
                    setPriceBracket('all');
                  }}
                  className="w-full h-8 px-2.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-mono-tech"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'all', label: lang === 'hy' ? 'Բոլորը' : 'Any Price' },
                  { id: 'under_600', label: '< $600' },
                  { id: '600_1400', label: '$600 – $1,400' },
                  { id: '1400_2500', label: '$1,400 – $2,500' },
                  { id: 'over_2500', label: '$2,500+' },
                ] as const
              ).map((br) => {
                const active = priceBracket === br.id;
                return (
                  <button
                    key={br.id}
                    type="button"
                    onClick={() => {
                      setPriceBracket(br.id);
                      setMinPriceUsd(0);
                      setMaxPriceUsd(4000);
                    }}
                    className={`h-7 px-2 rounded-lg text-[11px] font-mono-tech border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[var(--accent)] text-[#080709] border-[var(--accent)] font-bold'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {br.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* RIGHT MAIN CATALOG AREA (lg:col-span-9) */}
        <div className="lg:col-span-9 space-y-4">
          {/* Top Search + Sort + Layout Bar */}
          <div className="p-3.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'hy'
                    ? 'Որոնել մոդել, բրենդ, կոդ կամ տվյալ (օր. S25 Ultra, LG, Bosch, 600L)...'
                    : 'Search model, brand, code, or spec (e.g. S25 Ultra, LG, Bosch, M4 Max)...'
                }
                className="w-full h-10 pl-10 pr-4 rounded-xl text-xs sm:text-sm bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              <span className="text-xs font-mono-tech text-[var(--text-secondary)] whitespace-nowrap">
                {lang === 'hy'
                  ? `Գտնվել է՝ ${filteredItems.length}`
                  : `${filteredItems.length} items`}
              </span>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CatalogSortId)}
                className="h-10 px-3 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] border border-[var(--border-hairline)] focus:outline-none focus:border-[var(--accent)] cursor-pointer"
                aria-label={lang === 'hy' ? 'Դասավորել ըստ' : 'Sort by'}
              >
                <option value="featured">
                  {lang === 'hy' ? 'Առաջարկվող թոփեր' : 'Featured Top Picks'}
                </option>
                <option value="price_asc">
                  {lang === 'hy' ? 'Գին՝ էժանից թանկ' : 'Price: Low to High'}
                </option>
                <option value="price_desc">
                  {lang === 'hy' ? 'Գին՝ թանկից էժան' : 'Price: High to Low'}
                </option>
                <option value="name_asc">
                  {lang === 'hy' ? 'Անվանում (A–Z)' : 'Name (A–Z)'}
                </option>
              </select>

              <div className="inline-flex items-center p-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
                <button
                  type="button"
                  onClick={() => setLayoutMode('list')}
                  className={`h-8 px-2.5 rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer ${
                    layoutMode === 'list'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {lang === 'hy' ? 'Ցուցակ' : 'List'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode('grid')}
                  className={`h-8 px-2.5 rounded-lg text-xs inline-flex items-center gap-1 cursor-pointer ${
                    layoutMode === 'grid'
                      ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">
                    {lang === 'hy' ? 'Քարտեր' : 'Cards'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Rows / Cards */}
          {filteredItems.length === 0 ? (
            <div className="p-12 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-center space-y-3">
              <p className="text-sm text-[var(--text-secondary)]">
                {lang === 'hy'
                  ? 'Ընտրված ֆիլտրերով ապրանքներ չեն գտնվել։'
                  : 'No products match the selected filters.'}
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-semibold cursor-pointer"
              >
                {lang === 'hy' ? 'Մաքրել ֆիլտրերը' : 'Reset All Filters'}
              </button>
            </div>
          ) : layoutMode === 'list' ? (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isFav = favorites.includes(item.id);
                const activeFinId = selectedFinishMap[item.id] || item.finishes[0].id;
                const activeFin =
                  item.finishes.find((f) => f.id === activeFinId) || item.finishes[0];
                const activeOptId = selectedOptionMap[item.id] || item.options[0].id;
                const activeOpt =
                  item.options.find((o) => o.id === activeOptId) || item.options[0];
                const totalUsd = item.priceUsd + (activeOpt?.deltaUsd || 0);
                const isAdded = justAddedId === item.id;

                return (
                  <article
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)] transition-all flex flex-col xl:flex-row xl:items-center justify-between gap-5"
                  >
                    {/* Left: 2D Product Illustration + Identity + Specs */}
                    <div className="flex flex-col sm:flex-row items-start gap-4 flex-1 min-w-0">
                      <div
                        onClick={() => setDetailModalItemId(item.id)}
                        className="cursor-pointer group relative"
                        title={
                          lang === 'hy'
                            ? 'Սեղմեք՝ նկարը և տվյալների ցուցակը բացելու համար'
                            : 'Click to view 2D image & full specs'
                        }
                      >
                        <Product2DIllustration
                          kind={item.kind}
                          deviceCategory={item.deviceCategory}
                          applianceCategory={item.applianceCategory}
                          brand={item.brand}
                          name={item.name}
                          primaryHex={activeFin.hex}
                          accentHex={activeFin.accentHex}
                          screenBadge={item.badgeText}
                          size="md"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-mono-tech font-bold uppercase tracking-wider">
                            {item.brand}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[10px] font-mono-tech text-[var(--text-secondary)]">
                            {item.categoryLabel[lang]}
                          </span>
                          <span className="text-[11px] font-mono-tech text-[var(--text-secondary)]">
                            {item.modelCode}
                          </span>
                        </div>

                        <div>
                          <button
                            type="button"
                            onClick={() => setDetailModalItemId(item.id)}
                            className="text-left text-base sm:text-lg font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors cursor-pointer"
                          >
                            {item.name}
                          </button>
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2">
                            {item.tagline[lang]}
                          </p>
                        </div>

                        {/* 4 Structured Key Specs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {item.keySpecs.slice(0, 4).map((sp, i) => (
                            <div
                              key={i}
                              className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs"
                            >
                              <span className="text-[10px] font-mono-tech uppercase text-[var(--text-secondary)] block">
                                {sp.label[lang]}
                              </span>
                              <span className="font-medium text-[var(--text-primary)] line-clamp-1">
                                {sp.value[lang]}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Color/Config Pickers + Price + Favorite + Add to Cart */}
                    <div className="flex flex-col sm:flex-row xl:flex-col items-stretch sm:items-center xl:items-end justify-between gap-3 pt-3 xl:pt-0 border-t xl:border-t-0 xl:border-l border-[var(--border-hairline)] xl:pl-5 shrink-0 xl:min-w-[240px]">
                      {/* Finish & Option Selectors */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          {item.finishes.map((fin) => {
                            const active = fin.id === activeFin.id;
                            return (
                              <button
                                key={fin.id}
                                type="button"
                                onClick={() =>
                                  setSelectedFinishMap((prev) => ({
                                    ...prev,
                                    [item.id]: fin.id,
                                  }))
                                }
                                title={fin.name[lang]}
                                className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform cursor-pointer ${
                                  active
                                    ? 'border-[var(--accent)] scale-110 ring-2 ring-[var(--accent)]/30'
                                    : 'border-white/20 opacity-75 hover:opacity-100'
                                }`}
                              >
                                <span
                                  className="w-4 h-4 rounded-full border border-black/20"
                                  style={{ backgroundColor: fin.hex }}
                                />
                              </button>
                            );
                          })}
                        </div>

                        <div className="flex items-center gap-1">
                          {item.options.map((opt) => {
                            const active = opt.id === activeOpt.id;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setSelectedOptionMap((prev) => ({
                                    ...prev,
                                    [item.id]: opt.id,
                                  }))
                                }
                                className={`h-7 px-2 rounded-md text-[10px] font-mono-tech border transition-colors cursor-pointer ${
                                  active
                                    ? 'border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--text-primary)] font-bold'
                                    : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                                }`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Price & Action Buttons */}
                      <div className="flex flex-col items-start sm:items-end gap-2 w-full">
                        <div className="text-2xl font-bold font-mono-tech tabular-nums text-[var(--text-primary)]">
                          {formatDevicePrice(totalUsd, currency, amdRate, eurRate)}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(item.id)}
                            title={lang === 'hy' ? 'Ավելացնել ֆավորիտներ' : 'Toggle Favorite'}
                            className={`h-9 w-9 rounded-xl border inline-flex items-center justify-center transition-colors cursor-pointer ${
                              isFav
                                ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                                : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-rose-500'
                            }`}
                          >
                            <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500' : ''}`} />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDetailModalItemId(item.id)}
                            className="h-9 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-[var(--accent)]" />
                            <span>{lang === 'hy' ? 'Տվյալներ' : 'Specs'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAddItem(item)}
                            className={`h-9 px-4 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                              isAdded
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--text-primary)] text-[var(--bg-canvas)] hover:opacity-90'
                            }`}
                          >
                            {isAdded ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{lang === 'hy' ? 'Ավելացվեց' : 'Added'}</span>
                              </>
                            ) : (
                              <>
                                <ShoppingBag className="w-3.5 h-3.5" />
                                <span>{lang === 'hy' ? 'Զամբյուղ' : 'Add to Cart'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const isFav = favorites.includes(item.id);
                const activeFinId = selectedFinishMap[item.id] || item.finishes[0].id;
                const activeFin =
                  item.finishes.find((f) => f.id === activeFinId) || item.finishes[0];
                const activeOptId = selectedOptionMap[item.id] || item.options[0].id;
                const activeOpt =
                  item.options.find((o) => o.id === activeOptId) || item.options[0];
                const totalUsd = item.priceUsd + (activeOpt?.deltaUsd || 0);
                const isAdded = justAddedId === item.id;

                return (
                  <article
                    key={item.id}
                    className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] flex flex-col justify-between gap-4 hover:border-[var(--accent)] transition-colors"
                  >
                    <div className="space-y-3">
                      <div
                        onClick={() => setDetailModalItemId(item.id)}
                        className="cursor-pointer"
                      >
                        <Product2DIllustration
                          kind={item.kind}
                          deviceCategory={item.deviceCategory}
                          applianceCategory={item.applianceCategory}
                          brand={item.brand}
                          name={item.name}
                          primaryHex={activeFin.hex}
                          accentHex={activeFin.accentHex}
                          screenBadge={item.badgeText}
                          size="lg"
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] text-[10px] font-mono-tech font-bold uppercase">
                          {item.brand} · {item.categoryLabel[lang]}
                        </span>
                        <button
                          type="button"
                          onClick={() => onToggleFavorite(item.id)}
                          className={`p-1.5 rounded-lg border cursor-pointer ${
                            isFav
                              ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                              : 'border-[var(--border-hairline)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`} />
                        </button>
                      </div>

                      <h3
                        onClick={() => setDetailModalItemId(item.id)}
                        className="text-base font-bold leading-snug cursor-pointer hover:text-[var(--accent)]"
                      >
                        {item.name}
                      </h3>

                      <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                        {item.keySpecs.slice(0, 3).map((sp, idx) => (
                          <div key={idx} className="truncate">
                            <span className="font-mono-tech text-[10px] uppercase opacity-75">
                              {sp.label[lang]}:{' '}
                            </span>
                            <span className="text-[var(--text-primary)]">{sp.value[lang]}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border-hairline)] flex items-center justify-between gap-2">
                      <span className="text-lg font-bold font-mono-tech tabular-nums">
                        {formatDevicePrice(totalUsd, currency, amdRate, eurRate)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDetailModalItemId(item.id)}
                          className="h-9 px-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-medium cursor-pointer"
                        >
                          {lang === 'hy' ? 'Տվյալներ' : 'Specs'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddItem(item)}
                          className={`h-9 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ${
                            isAdded
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[var(--text-primary)] text-[var(--bg-canvas)]'
                          }`}
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                          <span>{lang === 'hy' ? 'Զամբյուղ' : 'Add'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
         2D PRODUCT IMAGE & SPECIFICATION MODAL (Pure 2D — No 3D Viewport!)
         ===================================================================== */}
      {detailModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label={detailModalItem.name}
        >
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] shadow-2xl flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                  {detailModalItem.brand} · {detailModalItem.categoryLabel[lang]} ·{' '}
                  {detailModalItem.modelCode}
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {detailModalItem.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalItemId(null)}
                className="h-9 w-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] inline-flex items-center justify-center hover:border-[var(--accent)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <Product2DIllustration
                    kind={detailModalItem.kind}
                    deviceCategory={detailModalItem.deviceCategory}
                    applianceCategory={detailModalItem.applianceCategory}
                    brand={detailModalItem.brand}
                    name={detailModalItem.name}
                    primaryHex={
                      (
                        detailModalItem.finishes.find(
                          (f) => f.id === selectedFinishMap[detailModalItem.id]
                        ) || detailModalItem.finishes[0]
                      ).hex
                    }
                    accentHex={
                      (
                        detailModalItem.finishes.find(
                          (f) => f.id === selectedFinishMap[detailModalItem.id]
                        ) || detailModalItem.finishes[0]
                      ).accentHex
                    }
                    screenBadge={detailModalItem.badgeText}
                    size="lg"
                  />
                </div>

                <div className="md:col-span-7 space-y-4">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {detailModalItem.summary[lang]}
                  </p>

                  {/* Color Swatches */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)]">
                      {lang === 'hy' ? 'Գույն / Կորպուս' : 'Finish / Color'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detailModalItem.finishes.map((fin) => {
                        const active =
                          (selectedFinishMap[detailModalItem.id] ||
                            detailModalItem.finishes[0].id) === fin.id;
                        return (
                          <button
                            key={fin.id}
                            type="button"
                            onClick={() =>
                              setSelectedFinishMap((prev) => ({
                                ...prev,
                                [detailModalItem.id]: fin.id,
                              }))
                            }
                            className={`h-8 px-3 rounded-lg border text-xs inline-flex items-center gap-2 cursor-pointer ${
                              active
                                ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                                : 'border-[var(--border-hairline)]'
                            }`}
                          >
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-black/20"
                              style={{ backgroundColor: fin.hex }}
                            />
                            <span>{fin.name[lang]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price & Primary Actions */}
                  <div className="pt-3 border-t border-[var(--border-hairline)] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-2xl font-bold font-mono-tech">
                      {formatDevicePrice(detailModalItem.priceUsd, currency, amdRate, eurRate)}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onToggleFavorite(detailModalItem.id)}
                        className={`h-10 px-3.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                          favorites.includes(detailModalItem.id)
                            ? 'border-rose-500 bg-rose-500/10 text-rose-500'
                            : 'border-[var(--border-hairline)] bg-[var(--bg-elevated)]'
                        }`}
                      >
                        <Heart
                          className={`w-4 h-4 ${
                            favorites.includes(detailModalItem.id) ? 'fill-rose-500' : ''
                          }`}
                        />
                        <span>{lang === 'hy' ? 'Ֆավորիտ' : 'Favorite'}</span>
                      </button>

                      {detailModalItem.kind === 'tech' && onCompareDevice && (
                        <button
                          type="button"
                          onClick={() => {
                            setDetailModalItemId(null);
                            onCompareDevice(detailModalItem.id);
                          }}
                          className="h-10 px-3.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-semibold inline-flex items-center gap-1.5 hover:border-[var(--accent)] cursor-pointer"
                        >
                          <GitCompareArrows className="w-4 h-4" />
                          <span>{lang === 'hy' ? 'Համեմատել' : 'Compare'}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleAddItem(detailModalItem)}
                        className="h-10 px-5 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs font-bold inline-flex items-center gap-2 hover:opacity-90 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>
                          {justAddedId === detailModalItem.id
                            ? lang === 'hy'
                              ? 'Ավելացվեց ✓'
                              : 'Added ✓'
                            : lang === 'hy'
                              ? 'Ավելացնել Զամբյուղ'
                              : 'Add to Cart'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Full Technical Specifications List */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-mono-tech uppercase tracking-wider text-[var(--accent)]">
                  {lang === 'hy'
                    ? 'Տեխնիկական Տվյալների Ցուցակ'
                    : 'Technical Specifications'}
                </h3>
                <div className="rounded-2xl border border-[var(--border-hairline)] overflow-hidden divide-y divide-[var(--border-hairline)]">
                  {detailModalItem.keySpecs.map((sp, idx) => (
                    <div
                      key={idx}
                      className="px-4 py-3 bg-[var(--bg-elevated)] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs"
                    >
                      <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                        {sp.label[lang]}
                      </span>
                      <span className="sm:col-span-2 font-medium text-[var(--text-primary)]">
                        {sp.value[lang]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
