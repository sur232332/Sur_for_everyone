import { LocalizedText } from '../types/hardware';

export type HomeZoneId = 'all' | 'kitchen' | 'laundry' | 'office';

export type ApplianceCategoryId =
  | 'refrigerator'
  | 'gas_stove'
  | 'microwave'
  | 'washing_machine'
  | 'dryer'
  | 'laptop';

export interface SketchfabEmbedInfo {
  /**
   * Paste either:
   * - A Sketchfab embed URL: "https://sketchfab.com/models/<id>/embed"
   * - A Sketchfab model page URL: "https://sketchfab.com/3d-models/<slug>-<id>"
   * - Or the full <div class="sketchfab-embed-wrapper">...</div> HTML snippet from Sketchfab!
   * Leave empty ("") to hide the "Realistic view" tab for that appliance.
   */
  sketchfabUrl: string;
  modelTitle?: string;
  modelUrl?: string;
  authorName?: string;
  authorUrl?: string;
  licenseLabel?: string;
  licenseUrl?: string;
}

/**
 * ============================================================================
 * EASY SKETCHFAB CONFIG FOR EACH APPLIANCE CATEGORY
 * Paste your Sketchfab embed URL or HTML snippet into `sketchfabUrl` below.
 * If `sketchfabUrl` is non-empty, the Appliance Panel shows a "Realistic view"
 * tab next to "Interactive view" with author & license credits below the iframe.
 * If `sketchfabUrl` is empty (""), the "Realistic view" tab is hidden.
 * ============================================================================
 */
export const SKETCHFAB_APPLIANCE_CONFIG: Record<ApplianceCategoryId, SketchfabEmbedInfo> = {
  gas_stove: {
    sketchfabUrl: 'https://sketchfab.com/models/cbc404b5255d48b4aab0166e4c1c6b44/embed',
    modelTitle: 'Gas Stove_13_MB',
    modelUrl:
      'https://sketchfab.com/3d-models/gas-stove-13-mb-cbc404b5255d48b4aab0166e4c1c6b44',
    authorName: 'Mehdi Shahsavan',
    authorUrl: 'https://sketchfab.com/ahmagh2e',
    licenseLabel: 'Sketchfab Standard / CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
  refrigerator: {
    sketchfabUrl: '', // Paste Sketchfab embed URL or iframe snippet here to enable "Realistic view" tab
    modelTitle: 'Refrigerator 3D Model',
    modelUrl: 'https://sketchfab.com',
    authorName: 'Sketchfab Creator',
    authorUrl: 'https://sketchfab.com',
    licenseLabel: 'CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
  microwave: {
    sketchfabUrl: '', // Paste Sketchfab embed URL or iframe snippet here to enable "Realistic view" tab
    modelTitle: 'Microwave Oven 3D Model',
    modelUrl: 'https://sketchfab.com',
    authorName: 'Sketchfab Creator',
    authorUrl: 'https://sketchfab.com',
    licenseLabel: 'CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
  washing_machine: {
    sketchfabUrl: '', // Paste Sketchfab embed URL or iframe snippet here to enable "Realistic view" tab
    modelTitle: 'Washing Machine 3D Model',
    modelUrl: 'https://sketchfab.com',
    authorName: 'Sketchfab Creator',
    authorUrl: 'https://sketchfab.com',
    licenseLabel: 'CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
  dryer: {
    sketchfabUrl: '', // Paste Sketchfab embed URL or iframe snippet here to enable "Realistic view" tab
    modelTitle: 'Tumble Dryer 3D Model',
    modelUrl: 'https://sketchfab.com',
    authorName: 'Sketchfab Creator',
    authorUrl: 'https://sketchfab.com',
    licenseLabel: 'CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
  laptop: {
    sketchfabUrl: '', // Paste Sketchfab embed URL or iframe snippet here to enable "Realistic view" tab
    modelTitle: 'Workstation Laptop 3D Model',
    modelUrl: 'https://sketchfab.com',
    authorName: 'Sketchfab Creator',
    authorUrl: 'https://sketchfab.com',
    licenseLabel: 'CC Attribution',
    licenseUrl: 'https://sketchfab.com/licenses',
  },
};

/**
 * Helper that accepts a raw Sketchfab embed URL, a 3d-models page URL, or a full
 * `<div class="sketchfab-embed-wrapper">...</div>` HTML snippet and extracts the
 * clean iframe embed URL + credit metadata.
 */
export function parseSketchfabConfig(
  rawInput: string | undefined,
  fallback?: Partial<SketchfabEmbedInfo>
): SketchfabEmbedInfo | null {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return null;

  let embedUrl = trimmed;
  let modelTitle = fallback?.modelTitle || '3D Appliance Model';
  let modelUrl = fallback?.modelUrl || 'https://sketchfab.com';
  let authorName = fallback?.authorName || 'Sketchfab Creator';
  let authorUrl = fallback?.authorUrl || 'https://sketchfab.com';
  const licenseLabel = fallback?.licenseLabel || 'Sketchfab License';
  const licenseUrl = fallback?.licenseUrl || 'https://sketchfab.com/licenses';

  // If the user pasted full HTML (<iframe ... src="...">), extract src and links
  if (trimmed.includes('<iframe') || trimmed.includes('sketchfab-embed-wrapper')) {
    const srcMatch = trimmed.match(/src=["']([^"']+)["']/i);
    if (srcMatch?.[1]) {
      embedUrl = srcMatch[1];
    }
    const titleMatch = trimmed.match(/title=["']([^"']+)["']/i);
    if (titleMatch?.[1]) {
      modelTitle = titleMatch[1];
    }
    const modelHrefMatch = trimmed.match(
      /<a[^>]+href=["'](https:\/\/sketchfab\.com\/3d-models\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (modelHrefMatch) {
      modelUrl = modelHrefMatch[1].trim();
      const extractedTitle = modelHrefMatch[2].replace(/<[^>]+>/g, '').trim();
      if (extractedTitle) modelTitle = extractedTitle;
    }
    const authorHrefMatch = trimmed.match(
      /by\s*<a[^>]+href=["'](https:\/\/sketchfab\.com\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (authorHrefMatch) {
      authorUrl = authorHrefMatch[1].trim();
      const extractedAuthor = authorHrefMatch[2].replace(/<[^>]+>/g, '').trim();
      if (extractedAuthor) authorName = extractedAuthor;
    }
  } else if (
    trimmed.includes('sketchfab.com/3d-models/') &&
    !trimmed.endsWith('/embed')
  ) {
    // Convert https://sketchfab.com/3d-models/slug-cbc404b5255d48b4aab0166e4c1c6b44 -> /models/<id>/embed
    const idMatch = trimmed.match(/([a-f0-9]{32})(?:\/|\?|$)/i);
    if (idMatch?.[1]) {
      modelUrl = trimmed;
      embedUrl = `https://sketchfab.com/models/${idMatch[1]}/embed`;
    }
  } else if (
    trimmed.includes('sketchfab.com/models/') &&
    !trimmed.includes('/embed')
  ) {
    const idMatch = trimmed.match(/models\/([a-f0-9]{32})/i);
    if (idMatch?.[1]) {
      embedUrl = `https://sketchfab.com/models/${idMatch[1]}/embed`;
    }
  }

  if (!/^https:\/\/sketchfab\.com\/models\/[a-zA-Z0-9]+\/embed/i.test(embedUrl)) {
    return null;
  }

  return {
    sketchfabUrl: embedUrl,
    modelTitle,
    modelUrl,
    authorName,
    authorUrl,
    licenseLabel,
    licenseUrl,
  };
}

export interface GroundedPriceRecord {
  modelId: string;
  found: boolean;
  priceUsd: number | null;
  retailerNote?: string;
  sourceUrl: string | null;
  sourceTitle: string | null;
  searchGoogleUrl: string;
  updatedAt: string; // ISO string
  cachedAtMs: number;
  error?: string;
}

export interface GroundedPriceResult {
  modelId: string;
  found: boolean;
  priceUsd: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  updatedAt: string;
}

export interface GroundedExchangeRate {
  found: boolean;
  rate: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  updatedAt: string;
  cachedAtMs?: number;
}

export interface ApplianceModelSpec {
  id: string;
  categoryId: ApplianceCategoryId;
  brand: string;
  modelCode: string;
  name: string;
  capacityValue: number; // numeric for filtering (Liters, kg, or inches)
  capacityUnit: string;
  capacityLabel: LocalizedText;
  energyClass: string;
  dimensionsCm: string;
  warranty: LocalizedText;
  highlights: LocalizedText;
  specs: {
    type: LocalizedText;
    powerOrConsumption: LocalizedText;
    noiseOrCooling: LocalizedText;
    smartFeatures: LocalizedText;
    finish: LocalizedText;
  };
  searchQuery: string;
  /** Optional per-model Sketchfab embed URL or snippet override */
  sketchfabUrl?: string;
  sketchfabCredit?: Partial<SketchfabEmbedInfo>;
}

export interface ApplianceSceneItem {
  id: ApplianceCategoryId;
  zone: Exclude<HomeZoneId, 'all'>;
  name: LocalizedText;
  zoneLabel: LocalizedText;
  shortDesc: LocalizedText;
  interactionLabel: LocalizedText;
  secondaryInteractionLabel?: LocalizedText;
  position: [number, number, number];
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  /** Optional Sketchfab embed URL (defaults to SKETCHFAB_APPLIANCE_CONFIG[id].sketchfabUrl) */
  sketchfabUrl?: string;
  sketchfabCredit?: Partial<SketchfabEmbedInfo>;
}

export const HOME_ZONES: Array<{
  id: HomeZoneId;
  label: LocalizedText;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
}> = [
  {
    id: 'all',
    label: { en: 'All Rooms', hy: 'Ամբողջ Սրահը' },
    cameraPos: [0.1, 2.55, 6.2],
    cameraTarget: [0.0, 0.92, -1.35],
  },
  {
    id: 'kitchen',
    label: { en: 'Kitchen', hy: 'Խոհանոց' },
    cameraPos: [-3.1, 1.52, 2.45],
    cameraTarget: [-3.1, 0.92, -1.65],
  },
  {
    id: 'laundry',
    label: { en: 'Laundry', hy: 'Լվացքատուն' },
    cameraPos: [0.22, 1.5, 2.35],
    cameraTarget: [0.22, 0.72, -1.65],
  },
  {
    id: 'office',
    label: { en: 'Tech Desk', hy: 'Տեխնո Սեղան' },
    cameraPos: [3.4, 1.65, 1.95],
    cameraTarget: [3.4, 0.85, -1.25],
  },
];

export const APPLIANCE_SCENE_ITEMS: ApplianceSceneItem[] = [
  {
    id: 'refrigerator',
    zone: 'kitchen',
    name: { en: 'Refrigerator', hy: 'Սառնարան' },
    zoneLabel: { en: 'Kitchen', hy: 'Խոհանոց' },
    shortDesc: {
      en: 'French-door inverter refrigerator with digital cooling & glass showcase (90×180×72 cm).',
      hy: 'Ինվերտորային բազմախցիկ սառնարան՝ թվային կառավարմամբ (90×180×72 սմ)։',
    },
    interactionLabel: { en: 'Open Fridge Door', hy: 'Բացել Սառնարանի Դուռը' },
    secondaryInteractionLabel: { en: 'Interior Light', hy: 'Ներքին Լուսավորություն' },
    position: [-4.35, 0.08, -1.65],
    cameraPos: [-4.25, 1.48, 1.45],
    cameraTarget: [-4.35, 1.02, -1.65],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.refrigerator.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.refrigerator,
  },
  {
    id: 'gas_stove',
    zone: 'kitchen',
    name: { en: 'Gas Stove & Range', hy: 'Գազօջախ և Վառարան' },
    zoneLabel: { en: 'Kitchen', hy: 'Խոհանոց' },
    shortDesc: {
      en: '60 cm 4-burner stainless gas range with cast-iron grates & convection oven.',
      hy: 'Չուգունե ցանցերով և կոնվեկցիոն վառարանով գազօջախ (60×85×60 սմ)։',
    },
    interactionLabel: { en: 'Turn On Gas Burners', hy: 'Միացնել Կրակը' },
    secondaryInteractionLabel: { en: 'Open Oven Door', hy: 'Բացել Վառարանը' },
    position: [-3.15, 0.08, -1.7],
    cameraPos: [-3.15, 1.38, 1.15],
    cameraTarget: [-3.15, 0.68, -1.7],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.gas_stove.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.gas_stove,
  },
  {
    id: 'microwave',
    zone: 'kitchen',
    name: { en: 'Microwave', hy: 'Միկրոալիքային' },
    zoneLabel: { en: 'Kitchen', hy: 'Խոհանոց' },
    shortDesc: {
      en: 'Smart inverter microwave with LED timer, ceramic cavity & grill.',
      hy: 'Ինվերտորային միկրոալիքային վառարան՝ թվային էկրանով և գրիլով։',
    },
    interactionLabel: { en: 'Open Door', hy: 'Բացել Դուռը' },
    secondaryInteractionLabel: { en: 'Spin Turntable', hy: 'Պտտել Սկուտեղը' },
    position: [-2.0, 0.96, -1.65],
    cameraPos: [-2.0, 1.32, 0.72],
    cameraTarget: [-2.0, 1.12, -1.65],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.microwave.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.microwave,
  },
  {
    id: 'washing_machine',
    zone: 'laundry',
    name: { en: 'Washing Machine', hy: 'Լվացքի Մեքենա' },
    zoneLabel: { en: 'Laundry', hy: 'Լվացքատուն' },
    shortDesc: {
      en: '60×60×85 cm front-load direct-drive steam washers with stainless inner drum and auto-dosing.',
      hy: 'Ուղիղ շարժիչով և գոլորշիով լվացքի մեքենաներ՝ էներգախնայող ռեժիմներով (60×60×85 սմ)։',
    },
    interactionLabel: { en: 'Spin Washer Drum', hy: 'Պտտել Լվացքի Թմբուկը' },
    secondaryInteractionLabel: { en: 'Open Porthole Door', hy: 'Բացել Դուռը' },
    position: [-0.22, 0, -1.7],
    cameraPos: [-0.22, 1.55, 1.55],
    cameraTarget: [-0.22, 0.52, -1.7],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.washing_machine.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.washing_machine,
  },
  {
    id: 'dryer',
    zone: 'laundry',
    name: { en: 'Tumble Dryer', hy: 'Չորացնող Մեքենա' },
    zoneLabel: { en: 'Laundry', hy: 'Լվացքատուն' },
    shortDesc: {
      en: '60×60×85 cm dual-inverter heat pump dryers with moisture sensors and wrinkle-care cycles.',
      hy: 'Ջերմային պոմպով (Heat Pump) չորացնող մեքենաներ՝ խոնավության սենսորներով (60×60×85 սմ)։',
    },
    interactionLabel: { en: 'Spin Dryer Drum', hy: 'Պտտել Չորացնողի Թմբուկը' },
    secondaryInteractionLabel: { en: 'Open Dryer Door', hy: 'Բացել Դուռը' },
    position: [0.66, 0, -1.7],
    cameraPos: [0.66, 1.55, 1.55],
    cameraTarget: [0.66, 0.52, -1.7],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.dryer.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.dryer,
  },
  {
    id: 'laptop',
    zone: 'office',
    name: { en: 'Workstation Laptop', hy: 'Աշխատանքային Նոութբուք' },
    zoneLabel: { en: 'Tech Desk', hy: 'Տեխնո Սեղան' },
    shortDesc: {
      en: 'Flagship creator & engineering laptops with OLED / Mini-LED displays.',
      hy: 'Պրոֆեսիոնալ նոութբուքներ՝ OLED և Mini-LED էկրաններով՝ աշխատանքի համար։',
    },
    interactionLabel: { en: 'Adjust Laptop Lid Angle', hy: 'Կարգավորել Էկրանի Անկյունը' },
    secondaryInteractionLabel: { en: 'Screen Brightness Boost', hy: 'Բարձրացնել Պայծառությունը' },
    position: [3.4, 0.755, -1.25],
    cameraPos: [3.4, 1.5, 0.65],
    cameraTarget: [3.4, 0.88, -1.25],
    sketchfabUrl: SKETCHFAB_APPLIANCE_CONFIG.laptop.sketchfabUrl,
    sketchfabCredit: SKETCHFAB_APPLIANCE_CONFIG.laptop,
  },
];

export const APPLIANCE_MODELS: ApplianceModelSpec[] = [
  // ======================== 1. REFRIGERATORS (4 models) ========================
  {
    id: 'fridge-samsung-rf29bb8600',
    categoryId: 'refrigerator',
    brand: 'Samsung',
    modelCode: 'RF29BB8600QL',
    name: 'Samsung Bespoke 4-Door French Door (29 cu. ft. / 820L)',
    capacityValue: 820,
    capacityUnit: 'L',
    capacityLabel: { en: '820 L (29 cu. ft.)', hy: '820 Լ (29 cu. ft.)' },
    energyClass: 'ENERGY STAR / A++',
    dimensionsCm: '90.8 × 177.8 × 86.1 cm',
    warranty: { en: '10-Year Digital Inverter', hy: '10 տարի ինվերտորային շարժիչ' },
    highlights: {
      en: 'Beverage Center, Dual Auto Ice Maker, FlexZone Drawer, Twin Cooling Plus',
      hy: 'Beverage Center, կրկնակի սառույցի գեներատոր, Twin Cooling Plus համակարգ',
    },
    specs: {
      type: { en: '4-Door French Door', hy: '4-դռնանի French Door' },
      powerOrConsumption: { en: '685 kWh / year', hy: '685 կՎտ·ժ / տարի' },
      noiseOrCooling: { en: '37 dBA · Twin Cooling Plus', hy: '37 դԲ · Twin Cooling Plus' },
      smartFeatures: { en: 'SmartThings Wi-Fi Energy', hy: 'SmartThings Wi-Fi կառավարում' },
      finish: { en: 'Stainless Steel / Tempered Glass', hy: 'Չժանգոտվող պողպատ / Ապակի' },
    },
    searchQuery: 'Samsung RF29BB8600QL Bespoke 4-Door French Door Refrigerator price USD',
  },
  {
    id: 'fridge-lg-lmxs28596s',
    categoryId: 'refrigerator',
    brand: 'LG',
    modelCode: 'LMXS28596S',
    name: 'LG InstaView Door-in-Door 4-Door French Door (790L)',
    capacityValue: 790,
    capacityUnit: 'L',
    capacityLabel: { en: '790 L (27.8 cu. ft.)', hy: '790 Լ (27.8 cu. ft.)' },
    energyClass: 'ENERGY STAR / A++',
    dimensionsCm: '90.8 × 177.2 × 92.1 cm',
    warranty: { en: '10-Year Linear Compressor', hy: '10 տարի գծային կոմպրեսոր' },
    highlights: {
      en: 'Knock-twice glass InstaView panel, Slim SpacePlus Ice System, DoorCooling+',
      hy: 'Կրկնակի թխկոցով թափանցիկ InstaView ապակի, DoorCooling+ սառեցում',
    },
    specs: {
      type: { en: 'InstaView Door-in-Door', hy: 'InstaView Door-in-Door' },
      powerOrConsumption: { en: '715 kWh / year', hy: '715 կՎտ·ժ / տարի' },
      noiseOrCooling: { en: '36 dBA · Linear Cooling', hy: '36 դԲ · Linear Cooling' },
      smartFeatures: { en: 'LG ThinQ App + Proactive Care', hy: 'LG ThinQ հավելված' },
      finish: { en: 'PrintProof Stainless Steel', hy: 'Չժանգոտվող պողպատ (PrintProof)' },
    },
    searchQuery: 'LG LMXS28596S InstaView Door-in-Door Refrigerator price USD',
  },
  {
    id: 'fridge-bosch-b36cl80sns',
    categoryId: 'refrigerator',
    brand: 'Bosch',
    modelCode: 'B36CL80SNS',
    name: 'Bosch 800 Series Counter-Depth French Door (595L)',
    capacityValue: 595,
    capacityUnit: 'L',
    capacityLabel: { en: '595 L (21 cu. ft.)', hy: '595 Լ (21 cu. ft.)' },
    energyClass: 'A+++ / ENERGY STAR',
    dimensionsCm: '91.4 × 182.9 × 73.0 cm',
    warranty: { en: '5-Year Sealed System', hy: '5 տարի սառեցման համակարգ' },
    highlights: {
      en: 'Dual Compressors & Dual Evaporators, FarmFresh System, VitaFreshPro',
      hy: 'Կրկնակի կոմպրեսոր, FarmFresh և VitaFreshPro թարմության համակարգ',
    },
    specs: {
      type: { en: 'Counter-Depth Dual Compressor', hy: 'Ներկառուցվող չափսի, 2 կոմպրեսոր' },
      powerOrConsumption: { en: '568 kWh / year', hy: '568 կՎտ·ժ / տարի' },
      noiseOrCooling: { en: '35 dBA · MultiAirFlow', hy: '35 դԲ · MultiAirFlow' },
      smartFeatures: { en: 'Home Connect Remote Control', hy: 'Home Connect հեռակառավարում' },
      finish: { en: 'Brushed German Stainless', hy: 'Գերմանական չժանգոտվող պողպատ' },
    },
    searchQuery: 'Bosch 800 Series B36CL80SNS Refrigerator price USD',
  },
  {
    id: 'fridge-whirlpool-wrf535szhz',
    categoryId: 'refrigerator',
    brand: 'Whirlpool',
    modelCode: 'WRF535SZHZ',
    name: 'Whirlpool 36-Inch Wide French Door Refrigerator (710L)',
    capacityValue: 710,
    capacityUnit: 'L',
    capacityLabel: { en: '710 L (25 cu. ft.)', hy: '710 Լ (25 cu. ft.)' },
    energyClass: 'ENERGY STAR / A+',
    dimensionsCm: '90.5 × 178.1 × 89.5 cm',
    warranty: { en: '5-Year Sealed System', hy: '5 տարի երաշխիք' },
    highlights: {
      en: 'Filtered Interior Water Dispenser, Full-Width Pantry Drawer, Spillproof Glass',
      hy: 'Ներքին ֆիլտրված ջրի ծորակ, լայն պահոց, ամուր ապակե դարակներ',
    },
    specs: {
      type: { en: '3-Door French Door', hy: '3-դռնանի French Door' },
      powerOrConsumption: { en: '652 kWh / year', hy: '652 կՎտ·ժ / տարի' },
      noiseOrCooling: { en: '38 dBA · Accu-Chill Sensor', hy: '38 դԲ · Accu-Chill սենսոր' },
      smartFeatures: { en: 'Adaptive Defrost Control', hy: 'Ավտոմատ հալեցման համակարգ' },
      finish: { en: 'Fingerprint-Resistant Stainless', hy: 'Մատնահետքից պաշտպանված պողպատ' },
    },
    searchQuery: 'Whirlpool WRF535SZHZ French Door Refrigerator price USD',
  },

  // ======================== 2. GAS STOVES & RANGES (4 models) ========================
  {
    id: 'stove-samsung-nx60a6711ss',
    categoryId: 'gas_stove',
    brand: 'Samsung',
    modelCode: 'NX60A6711SS',
    name: 'Samsung 6.0 cu. ft. Smart Freestanding Gas Range with Air Fry',
    capacityValue: 170,
    capacityUnit: 'L',
    capacityLabel: { en: '170 L Oven · 5 Burners', hy: '170 Լ վառարան · 5 այրիչ' },
    energyClass: 'A+',
    dimensionsCm: '76.0 × 119.2 × 72.9 cm',
    warranty: { en: '2-Year Manufacturer', hy: '2 տարի երաշխիք' },
    highlights: {
      en: '22K BTU Dual Power Burner, No-Preheat Air Fry, Edge-to-Edge Cast Iron Grates',
      hy: '22K BTU հզոր այրիչ, Air Fry ռեժիմ, չուգունե ամբողջական ցանցեր',
    },
    specs: {
      type: { en: '5-Burner Gas Range + Convection', hy: '5 այրիչով գազօջախ և կոնվեկցիա' },
      powerOrConsumption: { en: '22,000 BTU Max Burner', hy: '22,000 BTU առավելագույն հզորություն' },
      noiseOrCooling: { en: 'True Fan Convection + Self-Clean', hy: 'Կոնվեկցիոն օդափոխիչ և ինքնամաքրում' },
      smartFeatures: { en: 'SmartThings App & Voice Control', hy: 'SmartThings Wi-Fi կառավարում' },
      finish: { en: 'Stainless Steel & Cast Iron', hy: 'Չժանգոտվող պողպատ և չուգուն' },
    },
    searchQuery: 'Samsung NX60A6711SS Gas Range price USD',
  },
  {
    id: 'stove-lg-lrgl5825f',
    categoryId: 'gas_stove',
    brand: 'LG',
    modelCode: 'LRGL5825F',
    name: 'LG 5.8 cu. ft. Smart Gas Range with InstaView & ProBake',
    capacityValue: 164,
    capacityUnit: 'L',
    capacityLabel: { en: '164 L Oven · 5 Burners', hy: '164 Լ վառարան · 5 այրիչ' },
    energyClass: 'A+',
    dimensionsCm: '76.0 × 121.0 × 73.5 cm',
    warranty: { en: '2-Year Manufacturer', hy: '2 տարի երաշխիք' },
    highlights: {
      en: '20K BTU UltraHeat Burner, ProBake Convection, Knock-twice InstaView Window',
      hy: '20K BTU UltraHeat այրիչ, ProBake կոնվեկցիա, InstaView պատուհան',
    },
    specs: {
      type: { en: '5-Burner ProBake Gas Range', hy: '5 այրիչով ProBake գազօջախ' },
      powerOrConsumption: { en: '20,000 BTU UltraHeat', hy: '20,000 BTU UltraHeat այրիչ' },
      noiseOrCooling: { en: 'EasyClean 10-Min Steam', hy: 'EasyClean 10-րոպեանոց մաքրում' },
      smartFeatures: { en: 'LG ThinQ Recipe Sync', hy: 'LG ThinQ սինխրոնիզացիա' },
      finish: { en: 'PrintProof Stainless Steel', hy: 'Չժանգոտվող պողպատ' },
    },
    searchQuery: 'LG LRGL5825F Gas Range price USD',
  },
  {
    id: 'stove-bosch-hgi8056uc',
    categoryId: 'gas_stove',
    brand: 'Bosch',
    modelCode: 'HGI8056UC',
    name: 'Bosch 800 Series 30-Inch Slide-In Gas Range',
    capacityValue: 136,
    capacityUnit: 'L',
    capacityLabel: { en: '136 L Oven · 5 Burners', hy: '136 Լ վառարան · 5 այրիչ' },
    energyClass: 'A++',
    dimensionsCm: '79.8 × 92.7 × 73.4 cm',
    warranty: { en: '3-Year Bosch Warranty', hy: '3 տարի Bosch երաշխիք' },
    highlights: {
      en: '18K BTU Dual-Stacked Burners, Genuine European Convection, Heavy Metal Knobs',
      hy: '18K BTU կրկնակի այրիչներ, եվրոպական կոնվեկցիա, մետաղական բռնակներ',
    },
    specs: {
      type: { en: 'Slide-In Precision Gas Range', hy: 'Ներկառուցվող պրոֆեսիոնալ գազօջախ' },
      powerOrConsumption: { en: '18,000 BTU Power Burner', hy: '18,000 BTU հզոր այրիչ' },
      noiseOrCooling: { en: 'QuietClose Damper Hinges', hy: 'Փափուկ փակվող դուռ (QuietClose)' },
      smartFeatures: { en: 'Integrated Temperature Probe', hy: 'Ջերմաստիճանի ներկառուցված սենսոր' },
      finish: { en: 'Brushed Stainless & Black Enamel', hy: 'Չժանգոտվող պողպատ և սև էմալ' },
    },
    searchQuery: 'Bosch 800 Series HGI8056UC Slide-In Gas Range price USD',
  },
  {
    id: 'stove-ge-jgb735spss',
    categoryId: 'gas_stove',
    brand: 'GE',
    modelCode: 'JGB735SPSS',
    name: 'GE 5.0 cu. ft. Freestanding Gas Convection Range',
    capacityValue: 142,
    capacityUnit: 'L',
    capacityLabel: { en: '142 L Oven · 5 Burners', hy: '142 Լ վառարան · 5 այրիչ' },
    energyClass: 'A+',
    dimensionsCm: '76.2 × 120.0 × 73.0 cm',
    warranty: { en: '2-Year Limited', hy: '2 տարի երաշխիք' },
    highlights: {
      en: 'Integrated Non-Stick Center Oval Griddle, 18K BTU Power Boil, Steam Clean',
      hy: 'Կենտրոնական օվալաձև տապակ, 18K BTU Power Boil, գոլորշիով մաքրում',
    },
    specs: {
      type: { en: '5-Burner Gas Range + Center Griddle', hy: '5 այրիչով գազօջախ և գրիլ-հարթակ' },
      powerOrConsumption: { en: '18,000 BTU Power Boil', hy: '18,000 BTU Power Boil' },
      noiseOrCooling: { en: 'Gas Convection + Steam Clean', hy: 'Գազային կոնվեկցիա և գոլորշի' },
      smartFeatures: { en: 'Sabbath Mode & Delay Bake', hy: 'Հետաձգված պատրաստման թայմեր' },
      finish: { en: 'Stainless Steel', hy: 'Չժանգոտվող պողպատ' },
    },
    searchQuery: 'GE JGB735SPSS Gas Range price USD',
  },

  // ======================== 3. MICROWAVE OVENS (4 models) ========================
  {
    id: 'mw-panasonic-nn-sn96js',
    categoryId: 'microwave',
    brand: 'Panasonic',
    modelCode: 'NN-SN96JS',
    name: 'Panasonic Cyclonic Wave Inverter Microwave (62L / 2.2 cu. ft.)',
    capacityValue: 62,
    capacityUnit: 'L',
    capacityLabel: { en: '62 L (2.2 cu. ft.)', hy: '62 Լ (2.2 cu. ft.)' },
    energyClass: 'A++',
    dimensionsCm: '60.6 × 35.6 × 49.4 cm',
    warranty: { en: '3-Year Magnetron', hy: '3 տարի մագնետրոնի երաշխիք' },
    highlights: {
      en: '1250W Cyclonic Inverter Continuous Power, Genius Sensor Cook, 16.5" Turntable',
      hy: '1250Վտ Cyclonic Inverter հաստատուն հզորություն, Genius Sensor սենսոր',
    },
    specs: {
      type: { en: 'Countertop Inverter Microwave', hy: 'Սեղանի ինվերտորային միկրոալիքային' },
      powerOrConsumption: { en: '1250 Watts Inverter', hy: '1250 Վատտ ինվերտոր' },
      noiseOrCooling: { en: '3D Cyclonic Wave Distribution', hy: '3D ալիքային հավասարաչափ տաքացում' },
      smartFeatures: { en: '14 Auto-Cook Sensor Presets', hy: '14 ավտոմատ սենսորային ծրագիր' },
      finish: { en: 'Brushed Stainless Steel', hy: 'Չժանգոտվող պողպատ' },
    },
    searchQuery: 'Panasonic NN-SN96JS Countertop Microwave price USD',
  },
  {
    id: 'mw-samsung-mc12j8035ct',
    categoryId: 'microwave',
    brand: 'Samsung',
    modelCode: 'MC12J8035CT',
    name: 'Samsung PowerGrill Duo Convection Microwave (34L)',
    capacityValue: 34,
    capacityUnit: 'L',
    capacityLabel: { en: '34 L (1.2 cu. ft.)', hy: '34 Լ (1.2 cu. ft.)' },
    energyClass: 'A+',
    dimensionsCm: '52.8 × 30.5 × 48.0 cm',
    warranty: { en: '10-Year Ceramic Enamel', hy: '10 տարի կերամիկական ծածկույթ' },
    highlights: {
      en: 'PowerGrill Duo Sheath Heater, Slim Fry Air-Crisp, Scratch-Resistant Ceramic Inside',
      hy: 'PowerGrill Duo կրկնակի գրիլ, Slim Fry, կերամիկական ներքին ծածկույթ',
    },
    specs: {
      type: { en: 'Convection + Grill Microwave', hy: 'Կոնվեկցիայով և գրիլով վառարան' },
      powerOrConsumption: { en: '950W Microwave / 1600W Grill', hy: '950Վտ Միկրոալիք / 1600Վտ Գրիլ' },
      noiseOrCooling: { en: 'Triple Distribution System', hy: 'Եռակի բաշխման համակարգ' },
      smartFeatures: { en: 'Drop-Down Door & Glass Touch', hy: 'Սենսորային ապակե վահանակ' },
      finish: { en: 'Black Stainless Steel', hy: 'Սև չժանգոտվող պողպատ' },
    },
    searchQuery: 'Samsung MC12J8035CT Convection Microwave price USD',
  },
  {
    id: 'mw-lg-lmcx23626s',
    categoryId: 'microwave',
    brand: 'LG',
    modelCode: 'LMCX23626S',
    name: 'LG NeoChef Smart Inverter Countertop Microwave (65L)',
    capacityValue: 65,
    capacityUnit: 'L',
    capacityLabel: { en: '65 L (2.3 cu. ft.)', hy: '65 Լ (2.3 cu. ft.)' },
    energyClass: 'A++',
    dimensionsCm: '62.0 × 34.5 × 49.8 cm',
    warranty: { en: '10-Year Magnetron', hy: '10 տարի մագնետրոնի երաշխիք' },
    highlights: {
      en: 'Smart Inverter Precise Power, EasyClean Anti-Bacterial Interior, Hexagonal Ring',
      hy: 'Smart Inverter ճշգրիտ կառավարում, EasyClean հակաբակտերիալ ծածկույթ',
    },
    specs: {
      type: { en: 'Smart Inverter Microwave', hy: 'Smart Inverter միկրոալիքային' },
      powerOrConsumption: { en: '1200 Watts Inverter', hy: '1200 Վատտ ինվերտոր' },
      noiseOrCooling: { en: 'SmoothTouch Glass Controls', hy: 'SmoothTouch սենսորային կառավարում' },
      smartFeatures: { en: 'Sensor Cook & ThinQ Diagnostics', hy: 'Sensor Cook և ThinQ դիագնոստիկա' },
      finish: { en: 'Smudge-Resistant Stainless', hy: 'Չժանգոտվող պողպատ' },
    },
    searchQuery: 'LG NeoChef LMCX23626S Microwave price USD',
  },
  {
    id: 'mw-bosch-hmb50152uc',
    categoryId: 'microwave',
    brand: 'Bosch',
    modelCode: 'HMB50152UC',
    name: 'Bosch 500 Series Built-In Microwave Oven (45L)',
    capacityValue: 45,
    capacityUnit: 'L',
    capacityLabel: { en: '45 L (1.6 cu. ft.)', hy: '45 Լ (1.6 cu. ft.)' },
    energyClass: 'A+',
    dimensionsCm: '59.5 × 38.2 × 49.8 cm',
    warranty: { en: '2-Year Bosch Warranty', hy: '2 տարի Bosch երաշխիք' },
    highlights: {
      en: 'Flush Built-In Installation, Popcorn & Reheat Humidity Sensors, Stainless Cavity',
      hy: 'Ներկառուցվող դիզայն, խոնավության սենսորներ, չժանգոտվող պողպատե խցիկ',
    },
    specs: {
      type: { en: 'Built-In Architectural Microwave', hy: 'Ներկառուցվող միկրոալիքային վառարան' },
      powerOrConsumption: { en: '950 Watts · 10 Power Levels', hy: '950 Վատտ · 10 հզորության մակարդակ' },
      noiseOrCooling: { en: 'Whisper-Quiet Cavity Venting', hy: 'Անաղմուկ օդափոխության համակարգ' },
      smartFeatures: { en: 'AutoChef 9 Sensor Programs', hy: 'AutoChef 9 սենսորային ծրագիր' },
      finish: { en: 'Brushed Stainless Steel', hy: 'Չժանգոտվող պողպատ' },
    },
    searchQuery: 'Bosch 500 Series HMB50152UC Microwave price USD',
  },

  // ======================== 4. WASHING MACHINES (4 models) ========================
  {
    id: 'washer-lg-wm4000hwa',
    categoryId: 'washing_machine',
    brand: 'LG',
    modelCode: 'WM4000HWA',
    name: 'LG 4.5 cu. ft. Ultra Large Front Load Washer with TurboWash 360',
    capacityValue: 10.5,
    capacityUnit: 'kg',
    capacityLabel: { en: '10.5 kg (4.5 cu. ft.)', hy: '10.5 կգ (4.5 cu. ft.)' },
    energyClass: 'A+++ / ENERGY STAR',
    dimensionsCm: '68.6 × 99.1 × 76.8 cm',
    warranty: { en: '10-Year Direct Drive Motor', hy: '10 տարի Direct Drive շարժիչ' },
    highlights: {
      en: 'TurboWash 360 in 30 mins, AI DD Fabric Sensor, Allergiene Steam Cycle',
      hy: 'TurboWash 360 30 րոպեում, AI DD գործվածքի սենսոր, գոլորշիով լվացում',
    },
    specs: {
      type: { en: 'Front-Load Direct Drive Steam', hy: 'Ճակատային բեռնմամբ, գոլորշիով' },
      powerOrConsumption: { en: '1300 RPM · 105 kWh/yr', hy: '1300 պտ/ր · 105 կՎտ·ժ/տարի' },
      noiseOrCooling: { en: '48 dBA TrueBalance Anti-Vibration', hy: '48 դԲ TrueBalance հակավիբրացիոն' },
      smartFeatures: { en: 'ThinQ Wi-Fi Remote Start', hy: 'ThinQ Wi-Fi հեռակառավարում' },
      finish: { en: 'White Enamel & Tempered Glass Door', hy: 'Սպիտակ էմալ և կոփված ապակի' },
    },
    searchQuery: 'LG WM4000HWA Front Load Washer price USD',
  },
  {
    id: 'washer-samsung-wf45b6300aw',
    categoryId: 'washing_machine',
    brand: 'Samsung',
    modelCode: 'WF45B6300AW',
    name: 'Samsung Bespoke 4.5 cu. ft. Front Load Washer with Super Speed',
    capacityValue: 10.5,
    capacityUnit: 'kg',
    capacityLabel: { en: '10.5 kg (4.5 cu. ft.)', hy: '10.5 կգ (4.5 cu. ft.)' },
    energyClass: 'A+++ / ENERGY STAR',
    dimensionsCm: '68.6 × 98.4 × 79.6 cm',
    warranty: { en: '20-Year Digital Inverter Motor', hy: '20 տարի ինվերտորային շարժիչ' },
    highlights: {
      en: 'Super Speed 28-Min Full Wash, Antimicrobial Drum Seal, Vibration Reduction+',
      hy: 'Super Speed 28 րոպեանոց լվացում, հակաբակտերիալ մեկուսիչ, VRT+ համակարգ',
    },
    specs: {
      type: { en: 'Front-Load Steam Washer', hy: 'Ճակատային բեռնմամբ լվացքի մեքենա' },
      powerOrConsumption: { en: '1300 RPM · 100 kWh/yr', hy: '1300 պտ/ր · 100 կՎտ·ժ/տարի' },
      noiseOrCooling: { en: '47 dBA VRT Plus Quiet Spin', hy: '47 դԲ VRT Plus անաղմուկ պտույտ' },
      smartFeatures: { en: 'SmartThings AI Laundry Recipe', hy: 'SmartThings AI կառավարում' },
      finish: { en: 'Clean White & Chrome Porthole', hy: 'Սպիտակ էմալ և քրոմապատ դուռ' },
    },
    searchQuery: 'Samsung WF45B6300AW Front Load Washer price USD',
  },
  {
    id: 'washer-bosch-waw285h1uc',
    categoryId: 'washing_machine',
    brand: 'Bosch',
    modelCode: 'WAW285H1UC',
    name: 'Bosch 800 Series 24-Inch Compact Front Load Washer (9kg)',
    capacityValue: 9.0,
    capacityUnit: 'kg',
    capacityLabel: { en: '9.0 kg (2.2 cu. ft.)', hy: '9.0 կգ (2.2 cu. ft.)' },
    energyClass: 'A+++ / Most Efficient',
    dimensionsCm: '59.8 × 84.5 × 63.2 cm',
    warranty: { en: '10-Year EcoSilence Motor', hy: '10 տարի EcoSilence շարժիչ' },
    highlights: {
      en: '4D Wash System, AquaStop Leak Protection, 1400 RPM Extraction, Internal Heater',
      hy: '4D լվացման համակարգ, AquaStop պաշտպանություն, 1400 պտ/ր',
    },
    specs: {
      type: { en: 'European 60cm Front-Load', hy: 'Եվրոպական 60սմ ստանդարտ' },
      powerOrConsumption: { en: '1400 RPM · 84 kWh/yr', hy: '1400 պտ/ր · 84 կՎտ·ժ/տարի' },
      noiseOrCooling: { en: '46 dBA AntiVibration Sidewalls', hy: '46 դԲ հակավիբրացիոն կողապատեր' },
      smartFeatures: { en: 'Home Connect Stain Removal', hy: 'Home Connect հավելված' },
      finish: { en: 'Alpine White Enamel', hy: 'Ալպիական սպիտակ էմալ' },
    },
    searchQuery: 'Bosch 800 Series WAW285H1UC Washer price USD',
  },
  {
    id: 'washer-electrolux-elwf7637aw',
    categoryId: 'washing_machine',
    brand: 'Electrolux',
    modelCode: 'ELFW7637AW',
    name: 'Electrolux Front Load Washer with LuxCare Plus & SmartBoost (11kg)',
    capacityValue: 11.0,
    capacityUnit: 'kg',
    capacityLabel: { en: '11.0 kg (4.5 cu. ft.)', hy: '11.0 կգ (4.5 cu. ft.)' },
    energyClass: 'A+++ / ENERGY STAR',
    dimensionsCm: '68.6 × 96.5 × 81.3 cm',
    warranty: { en: '10-Year Motor & Lifetime Tub', hy: '10 տարի շարժիչի երաշխիք' },
    highlights: {
      en: 'SmartBoost Premixes Detergent & Water, Optic Whites Cycle, 15-Min Fast Wash',
      hy: 'SmartBoost նախնական խառնման տեխնոլոգիա, 15-րոպեանոց արագ լվացում',
    },
    specs: {
      type: { en: 'Front-Load SmartBoost Steam', hy: 'SmartBoost գոլորշիով լվացքի մեքենա' },
      powerOrConsumption: { en: '1300 RPM · 92 kWh/yr', hy: '1300 պտ/ր · 92 կՎտ·ժ/տարի' },
      noiseOrCooling: { en: '47 dBA Second-Floor Guarantee', hy: '47 դԲ ցածր վիբրացիա' },
      smartFeatures: { en: 'Pod Dispenser & StainSoak', hy: 'Պարկուճների հատուկ բաժին' },
      finish: { en: 'Glacier White Enamel', hy: 'Սպիտակ էմալ' },
    },
    searchQuery: 'Electrolux ELFW7637AW Front Load Washer price USD',
  },

  // ======================== 5. DRYERS (4 models) ========================
  {
    id: 'dryer-lg-dlex4000w',
    categoryId: 'dryer',
    brand: 'LG',
    modelCode: 'DLEX4000W',
    name: 'LG 7.4 cu. ft. Front Load TurboSteam Dryer (10.5kg)',
    capacityValue: 10.5,
    capacityUnit: 'kg',
    capacityLabel: { en: '10.5 kg (7.4 cu. ft.)', hy: '10.5 կգ (7.4 cu. ft.)' },
    energyClass: 'ENERGY STAR / A++',
    dimensionsCm: '68.6 × 99.1 × 76.2 cm',
    warranty: { en: '3-Year Drum & Motor', hy: '3 տարի թմբուկի և շարժիչի երաշխիք' },
    highlights: {
      en: 'TurboSteam Refreshes Clothes in 10 Mins, AI Sensor Dry, FlowSense Duct Indicator',
      hy: 'TurboSteam թարմացում 10 րոպեում, AI խոնավության սենսոր',
    },
    specs: {
      type: { en: 'Sensor Dry Steam Tumble Dryer', hy: 'Գոլորշիով և սենսորով չորացնող մեքենա' },
      powerOrConsumption: { en: 'Dual Inverter / Sensor Dry', hy: 'Սենսորային էներգախնայող չորացում' },
      noiseOrCooling: { en: '51 dBA LoDecibel Quiet Operation', hy: '51 դԲ LoDecibel անաղմուկ աշխատանք' },
      smartFeatures: { en: 'ThinQ Smart Pairing with Washer', hy: 'ThinQ ավտոմատ սինխրոնիզացիա լվացքի հետ' },
      finish: { en: 'White Enamel & Reversible Glass Door', hy: 'Սպիտակ էմալ և ապակե դուռ' },
    },
    searchQuery: 'LG DLEX4000W TurboSteam Dryer price USD',
  },
  {
    id: 'dryer-samsung-dve45b6300w',
    categoryId: 'dryer',
    brand: 'Samsung',
    modelCode: 'DVE45B6300W',
    name: 'Samsung Bespoke 7.5 cu. ft. Smart Steam Sanitize+ Dryer (10.5kg)',
    capacityValue: 10.5,
    capacityUnit: 'kg',
    capacityLabel: { en: '10.5 kg (7.5 cu. ft.)', hy: '10.5 կգ (7.5 cu. ft.)' },
    energyClass: 'ENERGY STAR / A++',
    dimensionsCm: '68.6 × 98.4 × 79.5 cm',
    warranty: { en: '5-Year Sealed System', hy: '5 տարի երաշխիք' },
    highlights: {
      en: 'Steam Sanitize+ Eliminates 99.9% Bacteria, Sensor Dry, Wrinkle Prevent',
      hy: 'Steam Sanitize+ 99.9% ախտահանում, խոնավության սենսոր, առանց ծալքերի',
    },
    specs: {
      type: { en: 'Smart Steam Tumble Dryer', hy: 'Գոլորշիով չորացնող մեքենա' },
      powerOrConsumption: { en: 'Eco Dry Energy Saving Mode', hy: 'Eco Dry էներգախնայող ռեժիմ' },
      noiseOrCooling: { en: '50 dBA Stainless Steel Drum', hy: '50 դԲ չժանգոտվող պողպատե թմբուկ' },
      smartFeatures: { en: 'SmartThings Cycle Sync', hy: 'SmartThings սինխրոնիզացիա' },
      finish: { en: 'Clean White & Tinted Glass', hy: 'Սպիտակ էմալ և մգեցված ապակի' },
    },
    searchQuery: 'Samsung DVE45B6300W Steam Dryer price USD',
  },
  {
    id: 'dryer-bosch-wtg865h4uc',
    categoryId: 'dryer',
    brand: 'Bosch',
    modelCode: 'WTG865H4UC',
    name: 'Bosch 800 Series 24-Inch Heat Pump Ventless Dryer (9kg)',
    capacityValue: 9.0,
    capacityUnit: 'kg',
    capacityLabel: { en: '9.0 kg (4.0 cu. ft.)', hy: '9.0 կգ (4.0 cu. ft.)' },
    energyClass: 'A+++ / Heat Pump',
    dimensionsCm: '59.8 × 84.2 × 64.8 cm',
    warranty: { en: '5-Year Heat Pump System', hy: '5 տարի Heat Pump համակարգ' },
    highlights: {
      en: 'Self-Cleaning Condenser, Ventless Heat Pump (50% less energy), Sensitive Drying',
      hy: 'Ինքնամաքրվող կոնդենսատոր, Heat Pump ջերմային պոմպ (50% խնայողություն)',
    },
    specs: {
      type: { en: 'Ventless Heat Pump Dryer', hy: 'Heat Pump (ջերմային պոմպով) չորացնող' },
      powerOrConsumption: { en: '195 kWh/yr Ultra-Low Energy', hy: '195 կՎտ·ժ/տարի գերխնայող' },
      noiseOrCooling: { en: '52 dBA Gentle Low-Temp Dry', hy: '52 դԲ նուրբ ցածր ջերմաստիճանային' },
      smartFeatures: { en: 'Home Connect Remote Monitoring', hy: 'Home Connect հեռակառավարում' },
      finish: { en: 'Alpine White & See-Through Window', hy: 'Ալպիական սպիտակ և թափանցիկ դուռ' },
    },
    searchQuery: 'Bosch 800 Series WTG865H4UC Dryer price USD',
  },
  {
    id: 'dryer-electrolux-eldf7637aw',
    categoryId: 'dryer',
    brand: 'Electrolux',
    modelCode: 'ELFE7637AW',
    name: 'Electrolux 8.0 cu. ft. Front Load Dryer with Balanced Dry (11kg)',
    capacityValue: 11.0,
    capacityUnit: 'kg',
    capacityLabel: { en: '11.0 kg (8.0 cu. ft.)', hy: '11.0 կգ (8.0 cu. ft.)' },
    energyClass: 'ENERGY STAR / A++',
    dimensionsCm: '68.6 × 96.5 × 80.0 cm',
    warranty: { en: '3-Year Limited', hy: '3 տարի երաշխիք' },
    highlights: {
      en: 'Balanced Dry Eliminates Temperature Spikes, Predictive Dry, Instant Refresh Steam',
      hy: 'Balanced Dry հավասարաչափ ջերմություն, Predictive Dry սենսոր, գոլորշի',
    },
    specs: {
      type: { en: 'Predictive Sensor Steam Dryer', hy: 'Սենսորային գոլորշիով չորացնող' },
      powerOrConsumption: { en: 'Eco Normal Energy Cycle', hy: 'Eco Normal էներգախնայող ռեժիմ' },
      noiseOrCooling: { en: '50 dBA LuxCare Lint Trap', hy: '50 դԲ LuxCare ֆիլտրացիա' },
      smartFeatures: { en: '18-Min Fast Dry & Extended Tumble', hy: '18 րոպեանոց արագ չորացում' },
      finish: { en: 'Glacier White Enamel', hy: 'Սպիտակ էմալ' },
    },
    searchQuery: 'Electrolux ELFE7637AW Dryer price USD',
  },

  // ======================== 6. LAPTOPS (4 models) ========================
  {
    id: 'laptop-macbook-pro-16-m4max',
    categoryId: 'laptop',
    brand: 'Apple',
    modelCode: 'MX303LL/A',
    name: 'Apple MacBook Pro 16" (M4 Max, 36GB RAM, 1TB SSD)',
    capacityValue: 16,
    capacityUnit: 'inch',
    capacityLabel: { en: '16.2" Liquid Retina XDR', hy: '16.2" Liquid Retina XDR' },
    energyClass: 'ENERGY STAR / 100Wh',
    dimensionsCm: '35.57 × 24.81 × 1.68 cm',
    warranty: { en: '1-Year AppleCare+ Eligible', hy: '1 տարի պաշտոնական Apple երաշխիք' },
    highlights: {
      en: '14-Core M4 Max, 32-Core GPU, 1600 nits XDR Mini-LED, Thunderbolt 5, 21h Battery',
      hy: '14-միջուկանի M4 Max, 32-միջուկանի GPU, 1600 նիտ Mini-LED, Thunderbolt 5',
    },
    specs: {
      type: { en: '16-Inch Pro Workstation', hy: '16-դյույմանոց պրոֆեսիոնալ նոութբուք' },
      powerOrConsumption: { en: '140W USB-C MagSafe 3 · 21h', hy: '140Վտ MagSafe 3 · մինչև 21 ժամ' },
      noiseOrCooling: { en: 'Dual-Fan Whisper Thermal System', hy: 'Երկակի անաղմուկ հովացման համակարգ' },
      smartFeatures: { en: '3× Thunderbolt 5, HDMI 2.1, SDXC', hy: '3× Thunderbolt 5, HDMI 2.1, SDXC' },
      finish: { en: 'Space Black Anodized Aluminum', hy: 'Տիեզերական սև անոդացված ալյումին' },
    },
    searchQuery: 'Apple MacBook Pro 16 M4 Max 36GB 1TB MX303LL/A price USD',
  },
  {
    id: 'laptop-samsung-galaxy-book4-ultra',
    categoryId: 'laptop',
    brand: 'Samsung',
    modelCode: 'NP960XGL-XG1US',
    name: 'Samsung Galaxy Book4 Ultra 16" (Core Ultra 9, RTX 4070, 32GB)',
    capacityValue: 16,
    capacityUnit: 'inch',
    capacityLabel: { en: '16.0" 3K AMOLED 120Hz', hy: '16.0" 3K AMOLED 120Հց' },
    energyClass: 'ENERGY STAR / 76Wh',
    dimensionsCm: '35.54 × 25.04 × 1.65 cm',
    warranty: { en: '1-Year Samsung Pro Care', hy: '1 տարի Samsung երաշխիք' },
    highlights: {
      en: 'Intel Core Ultra 9 185H, NVIDIA RTX 4070 8GB, Anti-Reflective Touch AMOLED',
      hy: 'Intel Core Ultra 9 185H, NVIDIA RTX 4070 8GB, սենսորային 3K AMOLED էկրան',
    },
    specs: {
      type: { en: '16-Inch AI Studio Laptop', hy: '16-դյույմանոց ստուդիական նոութբուք' },
      powerOrConsumption: { en: '140W USB-C Fast Charge · 76Wh', hy: '140Վտ արագ լիցքավորում · 76Վտ·ժ' },
      noiseOrCooling: { en: 'Expanded Vapor Chamber Cooling', hy: 'Լայնացված գոլորշային խցիկով հովացում' },
      smartFeatures: { en: '2× Thunderbolt 4, HDMI 2.1, AKG Quad', hy: '2× Thunderbolt 4, HDMI 2.1, AKG ձայն' },
      finish: { en: 'Moonstone Gray CNC Aluminum', hy: 'Մոխրագույն CNC ալյումին' },
    },
    searchQuery: 'Samsung Galaxy Book4 Ultra NP960XGL Core Ultra 9 RTX 4070 price USD',
  },
  {
    id: 'laptop-asus-zenbook-duo-ux8406',
    categoryId: 'laptop',
    brand: 'ASUS',
    modelCode: 'UX8406MA-PS99T',
    name: 'ASUS Zenbook DUO (2024) Dual 14" 3K OLED (Core Ultra 9, 32GB)',
    capacityValue: 14,
    capacityUnit: 'inch',
    capacityLabel: { en: 'Dual 14.0" 3K 120Hz OLED', hy: 'Կրկնակի 14.0" 3K 120Հց OLED' },
    energyClass: 'ENERGY STAR / 75Wh',
    dimensionsCm: '31.35 × 21.79 × 1.46 cm',
    warranty: { en: '1-Year ASUS Global', hy: '1 տարի միջազգային երաշխիք' },
    highlights: {
      en: 'Dual 14" 3K 120Hz OLED Touchscreens, Detachable Bluetooth Keyboard, Built-In Kickstand',
      hy: 'Երկու լիարժեք 14" 3K OLED սենսորային էկրան, անջատվող ստեղնաշար',
    },
    specs: {
      type: { en: 'Dual-Screen OLED Workstation', hy: 'Երկէկրան OLED նոութբուք' },
      powerOrConsumption: { en: '65W USB-C · 75Wh Battery', hy: '65Վտ USB-C · 75Վտ·ժ մարտկոց' },
      noiseOrCooling: { en: 'Dual Fans + Graphene Heat Spreader', hy: 'Երկակի հովացուցիչ և գրաֆենային շերտ' },
      smartFeatures: { en: '2× Thunderbolt 4, HDMI 2.1, Stylus', hy: '2× Thunderbolt 4, HDMI 2.1, գրիչ' },
      finish: { en: 'Inkwell Gray Magnesium-Aluminum', hy: 'Մագնեզիում-ալյումինե կորպուս' },
    },
    searchQuery: 'ASUS Zenbook DUO UX8406MA Core Ultra 9 32GB price USD',
  },
  {
    id: 'laptop-lenovo-thinkpad-x1-carbon-g12',
    categoryId: 'laptop',
    brand: 'Lenovo',
    modelCode: '21KC000MUS',
    name: 'Lenovo ThinkPad X1 Carbon Gen 12 14" 2.8K OLED (Ultra 7, 32GB)',
    capacityValue: 14,
    capacityUnit: 'inch',
    capacityLabel: { en: '14.0" 2.8K OLED 120Hz', hy: '14.0" 2.8K OLED 120Հց' },
    energyClass: 'ENERGY STAR / EPEAT Gold',
    dimensionsCm: '31.28 × 21.47 × 1.49 cm',
    warranty: { en: '3-Year Premier Support', hy: '3 տարի Lenovo երաշխիք' },
    highlights: {
      en: '1.09 kg Carbon-Fiber Weave Chassis, MIL-STD-810H Tested, Tactile Haptic Trackpad',
      hy: '1.09 կգ ածխածնային մանրաթելից կորպուս, MIL-STD-810H դիմացկունություն',
    },
    specs: {
      type: { en: 'Ultralight Executive Flagship', hy: 'Գերթեթև բիզնես ֆլագման' },
      powerOrConsumption: { en: '65W GaN USB-C · 57Wh', hy: '65Վտ GaN USB-C · 57Վտ·ժ' },
      noiseOrCooling: { en: 'Dual Rear-Exhaust Thermal Fans', hy: 'Երկակի հետևի օդափոխության համակարգ' },
      smartFeatures: { en: 'Wi-Fi 7, 2× Thunderbolt 4, IR Cam', hy: 'Wi-Fi 7, 2× Thunderbolt 4, IR տեսախցիկ' },
      finish: { en: 'Deep Black Carbon Fiber Weave', hy: 'Սև ածխածնային մանրաթել (Carbon)' },
    },
    searchQuery: 'Lenovo ThinkPad X1 Carbon Gen 12 32GB OLED price USD',
  },
];
