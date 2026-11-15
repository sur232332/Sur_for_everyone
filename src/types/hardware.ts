export type BrandId = 'samsung' | 'apple' | 'huawei';
export type DeviceCategory = 'phone' | 'foldable' | 'laptop' | 'chip';
export type Language = 'en' | 'hy';
export type Currency = 'USD' | 'EUR' | 'AMD';
export type PageRoute =
  | 'motor-gallery'
  | 'showroom'
  | 'samsung'
  | 'apple'
  | 'huawei'
  | 'compare'
  | 'home-guide';

export type ExplodedLayerId =
  | 'back_glass'
  | 'battery'
  | 'logic_board'
  | 'camera_module'
  | 'display';

export type ModelGeometryType =
  | 'phone-s24'
  | 'phone-iphone'
  | 'phone-pura'
  | 'foldable-book'
  | 'foldable-trifold'
  | 'laptop-book4'
  | 'laptop-macbook'
  | 'laptop-matebook'
  | 'chip-soc';

export interface LocalizedText {
  en: string;
  hy: string;
}

export interface FinishOption {
  id: string;
  name: LocalizedText;
  hex: string;
  accentHex: string;
  roughness: number;
  metalness: number;
}

export interface StorageOption {
  id: string;
  label: string;
  priceDeltaUsd: number;
}

export interface VisualDetail3D {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  cameraPreset: 'front' | 'back' | 'iso' | 'edge';
  explodeTarget: number;
  hingeTarget?: number;
  foldTarget?: number;
  lensExtend?: boolean;
  layerHighlight?: ExplodedLayerId;
}

export interface ExplodedLayerInfo {
  id: ExplodedLayerId;
  name: LocalizedText;
  spec: LocalizedText;
  explanation: LocalizedText;
}

export interface DeviceSpec {
  id: string;
  brand: BrandId;
  category: DeviceCategory;
  geometryType: ModelGeometryType;
  name: string;
  tagline: LocalizedText;
  summary: LocalizedText;
  basePriceUsd: number;
  releaseYear: string;
  dimensionsMm: {
    width: number;
    height: number;
    depth: number;
  };
  weightGrams: number;
  numericMetrics: {
    screenInches: number;
    batteryScore: number; // mAh or Wh normalized score
    cameraMp: number;
  };
  specs: {
    processor: LocalizedText;
    display: LocalizedText;
    graphics: LocalizedText;
    camera: LocalizedText;
    memory: LocalizedText;
    battery: LocalizedText;
    chassis: LocalizedText;
    connectivity: LocalizedText;
  };
  benchmarks: {
    singleCore: number;
    multiCore: number;
    gpuScore: number;
    peakNits: number;
  };
  finishes: FinishOption[];
  storageOptions: StorageOption[];
  visualDetails3D: VisualDetail3D[];
  hasHinge?: boolean;
  hasFold?: boolean;
  hasRetractableLens?: boolean;
  screenBadge: string;
  officialUrl: string;
}

export interface LivePriceEntry {
  deviceId: string;
  priceUsd: number;
  previousPriceUsd: number;
  msrpUsd: number;
  deltaPercent: number;
  amdRate: number;
  eurRate: number;
  stock: number;
  trend: 'up' | 'down' | 'stable';
  history: number[]; // 7-day sparkline points
  updatedAt: string;
  // Grounded real-price fields (Gemini + Google Search Grounding)
  found?: boolean;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  fxUpdatedAt?: string;
  isLoading?: boolean;
}

export interface PriceAlertItem {
  deviceId: string;
  targetUsd: number;
  createdAt: string;
  triggered?: boolean;
}

export interface CartItem {
  key: string;
  deviceId: string;
  finishId: string;
  storageId: string;
  quantity: number;
}

export interface OrderReceipt {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingCity: string;
  shippingAddress?: string;
  deliveryMethod?: string;
  promoCode?: string;
  discountUsd?: number;
  currency: Currency;
  totalUsd: number;
  totalEur: number;
  totalAmd: number;
  items: Array<{
    name: string;
    finish: string;
    storage: string;
    quantity: number;
    unitPriceUsd: number;
  }>;
  createdAt: string;
}
