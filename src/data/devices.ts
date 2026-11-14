import { BrandId, DeviceSpec, ExplodedLayerId, ExplodedLayerInfo } from '../types/hardware';
import { APPLIANCE_MODELS, getApplianceBasePriceUsd } from './homeGuideData';

export interface BrandMeta {
  id: BrandId;
  name: string;
  headline: { en: string; hy: string };
  subheadline: { en: string; hy: string };
  origin: { en: string; hy: string };
  accentHex: string;
}

export const BRAND_META: Record<BrandId, BrandMeta> = {
  samsung: {
    id: 'samsung',
    name: 'Samsung',
    headline: {
      en: 'Forged in Titanium & Dynamic AMOLED',
      hy: 'Տիտանի և Dynamic AMOLED-ի Ճարտարապետություն',
    },
    subheadline: {
      en: 'Precision 200MP optics, integrated S-Pen engineering, Armor Aluminum foldables, and RTX-powered AMOLED workstations.',
      hy: '200ՄՊ օպտիկական համակարգեր, ներկառուցված S-Pen ինժեներիա, ծալովի Armor Aluminum և RTX աշխատակայաններ։',
    },
    origin: {
      en: 'Suwon, South Korea',
      hy: 'Սուվոն, Հարավային Կորեա',
    },
    accentHex: '#2563EB',
  },
  apple: {
    id: 'apple',
    name: 'Apple',
    headline: {
      en: 'Unified Silicon & Grade 5 Titanium',
      hy: 'Միասնական Կրեմնիում և 5-րդ Դասի Տիտան',
    },
    subheadline: {
      en: '3nm A18 Pro and M4 Max architectures delivering up to 546 GB/s unified bandwidth, ProMotion XDR displays, and Tetraprism optics.',
      hy: '3նմ A18 Pro և M4 Max ճարտարապետություն՝ մինչև 546 ԳԲ/վ թողունակությամբ, ProMotion XDR և Tetraprism օպտիկայով։',
    },
    origin: {
      en: 'Cupertino, California',
      hy: 'Կուպերտինո, Կալիֆոռնիա',
    },
    accentHex: '#B87D3B',
  },
  huawei: {
    id: 'huawei',
    name: 'Huawei',
    headline: {
      en: 'Retractable Optics & Tri-Fold Mastery',
      hy: 'Շարժական Օպտիկա և Եռածալ Ինժեներիա',
    },
    subheadline: {
      en: 'Mechanically actuated 1-inch XMAGE camera structures, the world’s first 10.2-inch Z-fold Mate XT, and 980g magnesium workstations.',
      hy: 'Մեխանիկորեն բացվող 1-դյույմանոց XMAGE տեսախցիկ, աշխարհում առաջին 10.2" եռածալ Mate XT և 980 գ մագնեզիումային նոութբուք։',
    },
    origin: {
      en: 'Shenzhen, China',
      hy: 'Շենչժեն, Չինաստան',
    },
    accentHex: '#B91C1C',
  },
};

export function getExplodedLayersForDevice(device: DeviceSpec): Record<ExplodedLayerId, ExplodedLayerInfo> {
  return {
    back_glass: {
      id: 'back_glass',
      name: {
        en: 'Back Glass & Chassis Enclosure',
        hy: 'Հետևի Ապակի և Կորպուսի Շրջանակ',
      },
      spec: device.specs.chassis,
      explanation: {
        en: 'Precision-milled structural enclosure shielding internal components while dissipating thermal load.',
        hy: 'Ճշգրիտ մշակված պաշտպանիչ կորպուս, որը պաշտպանում է ներքին հանգույցները և հեռացնում ջերմությունը։',
      },
    },
    battery: {
      id: 'battery',
      name: {
        en: 'High-Density Battery Pack & Coil',
        hy: 'Բարձր Խտության Մարտկոց և Լիցքավորման Հանգույց',
      },
      spec: device.specs.battery,
      explanation: {
        en: 'Multi-tab energy cell paired with fast-charge regulation and copper induction/thermal shielding.',
        hy: 'Բարձր էներգախտությամբ մարտկոց՝ գերարագ լիցքավորման և ջերմային պաշտպանության շերտով։',
      },
    },
    logic_board: {
      id: 'logic_board',
      name: {
        en: 'Logic Board & Silicon SoC',
        hy: 'Մայրական Պլատա և Կրեմնիումային Պրոցեսոր',
      },
      spec: device.specs.processor,
      explanation: {
        en: 'High-density multi-layer PCB integrating CPU, GPU, Neural Engine, and unified LPDDR5X memory.',
        hy: 'Բազմաշերտ տպասալ՝ ինտեգրված CPU, GPU, նեյրոնային շարժիչով և արագագործ LPDDR5X հիշողությամբ։',
      },
    },
    camera_module: {
      id: 'camera_module',
      name: {
        en: 'Optical Sensor & Lens Array',
        hy: 'Օպտիկական Սենսորների և Օբյեկտիվների Մոդուլ',
      },
      spec: device.specs.camera,
      explanation: {
        en: 'Multi-element stabilized glass optics and high-bandwidth image signal pipeline.',
        hy: 'Բազմալինզ օպտիկական կայունացմամբ տեսախցիկների համակարգ և պատկերի մշակման հանգույց։',
      },
    },
    display: {
      id: 'display',
      name: {
        en: 'Emissive OLED / XDR Display Assembly',
        hy: 'OLED / XDR Էկրանային Մոդուլ',
      },
      spec: device.specs.display,
      explanation: {
        en: '120Hz adaptive refresh panel bonded to protective crystal glass with ultra-narrow bezels.',
        hy: '120Հց ադապտիվ թարմացմամբ էկրան՝ միակցված պաշտպանիչ բյուրեղյա ապակուն։',
      },
    },
  };
}

export const DEVICES: DeviceSpec[] = [
  // ===========================
  // SAMSUNG
  // ===========================
  {
    id: 'galaxy-s24-ultra',
    brand: 'samsung',
    category: 'phone',
    geometryType: 'phone-s24',
    name: 'Samsung Galaxy S24 Ultra',
    tagline: {
      en: '6.8" QHD+ LTPO AMOLED · 200MP Quad Telephoto · S-Pen',
      hy: '6.8" QHD+ LTPO AMOLED · 200ՄՊ Քառակի Տեսախցիկ · S-Pen',
    },
    summary: {
      en: 'Angular Grade 2 Titanium frame housing a flat Corning Gorilla Armor display, 5x 50MP periscope telephoto, and integrated S-Pen.',
      hy: '2-րդ դասի տիտանե ուղղանկյուն շրջանակ՝ Corning Gorilla Armor հարթ էկրանով, 50ՄՊ 5x պերիսկոպով և ներկառուցված S-Pen-ով։',
    },
    basePriceUsd: 1299,
    releaseYear: '2024',
    dimensionsMm: { width: 79.0, height: 162.3, depth: 8.6 },
    weightGrams: 232,
    numericMetrics: { screenInches: 6.8, batteryScore: 5000, cameraMp: 200 },
    specs: {
      processor: {
        en: 'Snapdragon 8 Gen 3 for Galaxy (4nm, 3.39 GHz)',
        hy: 'Snapdragon 8 Gen 3 for Galaxy (4նմ, 3.39 ԳՀց)',
      },
      display: {
        en: '6.8" Dynamic LTPO AMOLED 2X · 1–120Hz · 2600 nits',
        hy: '6.8" Dynamic LTPO AMOLED 2X · 1–120Հց · 2600 նիտ',
      },
      graphics: {
        en: 'Adreno 750 (1000 MHz Hardware Ray Tracing)',
        hy: 'Adreno 750 (1000 ՄՀց ապարատային Ray Tracing)',
      },
      camera: {
        en: '200MP Main + 50MP (5x) + 10MP (3x) + 12MP Ultra-Wide',
        hy: '200ՄՊ Հիմնական + 50ՄՊ (5x) + 10ՄՊ (3x) + 12ՄՊ Գերլայն',
      },
      memory: {
        en: '12GB LPDDR5X · UFS 4.0 Storage',
        hy: '12ԳԲ LPDDR5X · UFS 4.0 Կրիչ',
      },
      battery: {
        en: '5,000 mAh · 45W Wired · 15W Wireless',
        hy: '5,000 մԱժ · 45Վտ Լարային · 15Վտ Անլար',
      },
      chassis: {
        en: 'Grade 2 Titanium · Gorilla Armor · IP68 · Built-in S-Pen',
        hy: '2-րդ դասի Տիտան · Gorilla Armor · IP68 · S-Pen',
      },
      connectivity: {
        en: 'Wi-Fi 7 · 5G mmWave · UWB · USB-C 3.2',
        hy: 'Wi-Fi 7 · 5G mmWave · UWB · USB-C 3.2',
      },
    },
    benchmarks: { singleCore: 2376, multiCore: 7249, gpuScore: 14800, peakNits: 2600 },
    finishes: [
      { id: 'ti-gray', name: { en: 'Titanium Gray', hy: 'Տիտան Մոխրագույն' }, hex: '#8A857D', accentHex: '#D49B4B', roughness: 0.28, metalness: 0.84 },
      { id: 'ti-black', name: { en: 'Titanium Black', hy: 'Տիտան Սև' }, hex: '#232428', accentHex: '#A1A1AA', roughness: 0.32, metalness: 0.78 },
      { id: 'ti-violet', name: { en: 'Titanium Violet', hy: 'Տիտան Մանուշակագույն' }, hex: '#544B68', accentHex: '#C4B5FD', roughness: 0.28, metalness: 0.8 },
      { id: 'ti-yellow', name: { en: 'Titanium Amber', hy: 'Տիտան Սաթե' }, hex: '#C7A96B', accentHex: '#FDE68A', roughness: 0.25, metalness: 0.85 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB', priceDeltaUsd: 120 },
      { id: '1tb', label: '1 TB', priceDeltaUsd: 360 },
    ],
    visualDetails3D: [
      {
        id: 'amoled-front',
        title: { en: 'Flat Gorilla Armor 2600-Nit Display', hy: 'Հարթ Gorilla Armor 2600-Նիտ Էկրան' },
        description: { en: 'Zero-curve corner geometry with 75% reflection reduction coating.', hy: 'Ուղիղ անկյունային երկրաչափություն և անդրադարձումների 75% նվազեցում։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        layerHighlight: 'display',
      },
      {
        id: 'quad-rings',
        title: { en: 'Individual Floating Metal Camera Rings', hy: 'Առանձնացված Մետաղական Տեսախցիկների Օղակներ' },
        description: { en: '200MP primary sensor paired with dual 3x and 5x periscope telephoto lenses.', hy: '200ՄՊ հիմնական սենսոր՝ 3x և 5x պերիսկոպային օպտիկայով։' },
        cameraPreset: 'back',
        explodeTarget: 22,
        layerHighlight: 'camera_module',
      },
      {
        id: 'vapor-spen',
        title: { en: 'X-Ray: Snapdragon Board, Vapor Chamber & S-Pen', hy: 'X-Ray՝ Snapdragon Պլատա, Գոլորշային Խցիկ և S-Pen' },
        description: { en: '1.9x larger copper vapor chamber and spring-loaded bottom S-Pen bay.', hy: '1.9x ավելի մեծ պղնձե հովացման խցիկ և ներկառուցված S-Pen բույն։' },
        cameraPreset: 'iso',
        explodeTarget: 88,
        layerHighlight: 'logic_board',
      },
    ],
    screenBadge: 'S24 ULTRA · 200MP · SD8G3',
    officialUrl: 'https://www.samsung.com/us/smartphones/galaxy-s24-ultra/',
  },
  {
    id: 'galaxy-z-fold6',
    brand: 'samsung',
    category: 'foldable',
    geometryType: 'foldable-book',
    name: 'Samsung Galaxy Z Fold6',
    tagline: {
      en: '7.6" Dual-Axis Flex Hinge · 2600-Nit Foldable AMOLED',
      hy: '7.6" Երկառանցք Ծալվող Հանգույց · 2600-Նիտ AMOLED',
    },
    summary: {
      en: 'Dual-rail Armor Aluminum hinge unfolding cleanly to a 7.6-inch tablet workspace at 5.6mm thinness.',
      hy: 'Armor Aluminum կրկնակի մեխանիզմ՝ ընդամենը 5.6 մմ հաստությամբ 7.6 դյույմանոց պլանշետի վերածվող էկրանով։',
    },
    basePriceUsd: 1899,
    releaseYear: '2024',
    dimensionsMm: { width: 132.6, height: 153.5, depth: 5.6 },
    weightGrams: 239,
    numericMetrics: { screenInches: 7.6, batteryScore: 4400, cameraMp: 50 },
    specs: {
      processor: {
        en: 'Snapdragon 8 Gen 3 for Galaxy (4nm, 3.39 GHz)',
        hy: 'Snapdragon 8 Gen 3 for Galaxy (4նմ, 3.39 ԳՀց)',
      },
      display: {
        en: '7.6" Main + 6.3" Cover Dynamic AMOLED 2X · 120Hz',
        hy: '7.6" Հիմնական + 6.3" Արտաքին Dynamic AMOLED 2X · 120Հց',
      },
      graphics: {
        en: 'Adreno 750 · Dual-Display Vulkan Pipeline',
        hy: 'Adreno 750 · Երկէկրան Vulkan Գրաֆիկա',
      },
      camera: {
        en: '50MP OIS Wide + 12MP Ultra-Wide + 10MP 3x Telephoto',
        hy: '50ՄՊ OIS Հիմնական + 12ՄՊ Գերլայն + 10ՄՊ 3x Տելեֆոտո',
      },
      memory: {
        en: '12GB LPDDR5X · UFS 4.0',
        hy: '12ԳԲ LPDDR5X · UFS 4.0',
      },
      battery: {
        en: '4,400 mAh Dual-Cell · 25W Wired · 15W Wireless',
        hy: '4,400 մԱժ Երկբջիջ · 25Վտ Լարային · 15Վտ Անլար',
      },
      chassis: {
        en: 'Enhanced Armor Aluminum · FlexHinge · IP48',
        hy: 'Ամրացված Armor Aluminum · FlexHinge · IP48',
      },
      connectivity: {
        en: 'Wi-Fi 6E · 5G · UWB · Dual eSIM',
        hy: 'Wi-Fi 6E · 5G · UWB · Երկակի eSIM',
      },
    },
    benchmarks: { singleCore: 2290, multiCore: 7080, gpuScore: 14350, peakNits: 2600 },
    finishes: [
      { id: 'silver-shadow', name: { en: 'Silver Shadow', hy: 'Արծաթագույն Ստվեր' }, hex: '#A3A8AE', accentHex: '#60A5FA', roughness: 0.25, metalness: 0.88 },
      { id: 'navy', name: { en: 'Deep Navy', hy: 'Խորը Կապույտ' }, hex: '#283652', accentHex: '#93C5FD', roughness: 0.3, metalness: 0.78 },
      { id: 'crafted-black', name: { en: 'Crafted Carbon Black', hy: 'Կարբոն Սև' }, hex: '#1F2024', accentHex: '#D49B4B', roughness: 0.42, metalness: 0.55 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB', priceDeltaUsd: 120 },
      { id: '1tb', label: '1 TB', priceDeltaUsd: 360 },
    ],
    visualDetails3D: [
      {
        id: 'fold-open',
        title: { en: '180° Unfolded Tablet Canvas', hy: '180° Բացված Պլանշետային Ռեժիմ' },
        description: { en: 'Full 7.6-inch uninterrupted inner workspace with zero-gap folding geometry.', hy: '7.6 դյույմանոց անխափան ներքին աշխատանքային տարածք։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        foldTarget: 175,
        layerHighlight: 'display',
      },
      {
        id: 'flex-mode',
        title: { en: '115° Flex Mode Hinge Inspection', hy: '115° Flex Ռեժիմի Հանգույցի Զննում' },
        description: { en: 'Dual-rail armored spine engineered to hold intermediate angles reliably.', hy: 'Երկռելս զրահապատ առանցք՝ ցանկացած անկյան տակ կայուն ֆիքսման համար։' },
        cameraPreset: 'iso',
        explodeTarget: 0,
        foldTarget: 110,
        layerHighlight: 'back_glass',
      },
      {
        id: 'dual-battery-xray',
        title: { en: 'X-Ray: Split Dual-Cell Battery & Ribbon Bus', hy: 'X-Ray՝ Երկկողմ Մարտկոց և Ճկուն Կապուղի' },
        description: { en: 'Balanced split-chassis battery distribution connected across the hinge flex bridge.', hy: 'Հավասարակշռված երկբջիջ մարտկոցներ և հանգույցով անցնող ճկուն շլեյֆ։' },
        cameraPreset: 'iso',
        explodeTarget: 85,
        foldTarget: 165,
        layerHighlight: 'battery',
      },
    ],
    hasFold: true,
    screenBadge: 'Z FOLD6 · 7.6" FLEX',
    officialUrl: 'https://www.samsung.com/us/smartphones/galaxy-z-fold6/',
  },
  {
    id: 'galaxy-book4-ultra',
    brand: 'samsung',
    category: 'laptop',
    geometryType: 'laptop-book4',
    name: 'Samsung Galaxy Book4 Ultra 16"',
    tagline: {
      en: '16" 3K AMOLED Touch · Core Ultra 9 185H · RTX 4070',
      hy: '16" 3K AMOLED Touch · Core Ultra 9 185H · RTX 4070',
    },
    summary: {
      en: '16.5mm thin Moonstone Gray aluminum workstation combining Intel Core Ultra 9 AI NPU with discrete NVIDIA RTX 4070 graphics.',
      hy: '16.5 մմ բարությամբ ալյումինե աշխատակայան՝ Intel Core Ultra 9 NPU-ով և առանձին NVIDIA RTX 4070 գրաֆիկայով։',
    },
    basePriceUsd: 2399,
    releaseYear: '2024',
    dimensionsMm: { width: 355.4, height: 250.4, depth: 16.5 },
    weightGrams: 1860,
    numericMetrics: { screenInches: 16.0, batteryScore: 7600, cameraMp: 2 },
    specs: {
      processor: {
        en: 'Intel Core Ultra 9 185H (16 Cores, up to 5.1 GHz + NPU)',
        hy: 'Intel Core Ultra 9 185H (16 միջուկ, մինչև 5.1 ԳՀց + NPU)',
      },
      display: {
        en: '16.0" 2880×1800 Dynamic AMOLED 2X Touch · 120Hz · 500 nits',
        hy: '16.0" 2880×1800 Dynamic AMOLED 2X Touch · 120Հց · 500 նիտ',
      },
      graphics: {
        en: 'NVIDIA GeForce RTX 4070 Laptop GPU (8GB GDDR6, 80W TGP)',
        hy: 'NVIDIA GeForce RTX 4070 (8ԳԲ GDDR6, 80Վտ TGP)',
      },
      camera: {
        en: '1080p FHD Studio Webcam · AKG Quad Speakers (Dolby Atmos)',
        hy: '1080p FHD Տեսախցիկ · AKG Չորս Բարձրախոս (Dolby Atmos)',
      },
      memory: {
        en: '32GB LPDDR5x · Dual M.2 PCIe 4.0 NVMe Slots',
        hy: '32ԳԲ LPDDR5x · Երկակի M.2 PCIe 4.0 NVMe Բներ',
      },
      battery: {
        en: '76 Wh · 140W USB-C Super Fast Charging',
        hy: '76 Վտժ · 140Վտ USB-C Գերարագ Լիցքավորում',
      },
      chassis: {
        en: 'Recycled CNC Aluminum Unibody · 1.86 kg',
        hy: 'Վերամշակված CNC Ալյումինե Կորպուս · 1.86 կգ',
      },
      connectivity: {
        en: '2x Thunderbolt 4 · HDMI 2.1 · USB-A · microSD · Wi-Fi 6E',
        hy: '2x Thunderbolt 4 · HDMI 2.1 · USB-A · microSD · Wi-Fi 6E',
      },
    },
    benchmarks: { singleCore: 2480, multiCore: 13450, gpuScore: 42800, peakNits: 500 },
    finishes: [
      { id: 'moonstone-gray', name: { en: 'Moonstone Gray', hy: 'Լուսնաքար Մոխրագույն' }, hex: '#596069', accentHex: '#38BDF8', roughness: 0.28, metalness: 0.84 },
      { id: 'graphite', name: { en: 'Studio Graphite', hy: 'Ստուդիական Գրաֆիտ' }, hex: '#26282E', accentHex: '#E5A952', roughness: 0.34, metalness: 0.8 },
    ],
    storageOptions: [
      { id: '1tb', label: '1 TB NVMe (32GB)', priceDeltaUsd: 0 },
      { id: '2tb', label: '2 TB NVMe (32GB)', priceDeltaUsd: 250 },
    ],
    visualDetails3D: [
      {
        id: 'amoled-lid',
        title: { en: '16" 3K Anti-Reflective AMOLED Touch Display', hy: '16" 3K Հակաանդրադարձող AMOLED Էկրան' },
        description: { en: '120Hz variable refresh panel with 120% DCI-P3 color gamut.', hy: '120Հց ադապտիվ էկրան՝ 120% DCI-P3 գունային ծածկույթով։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        hingeTarget: 112,
        layerHighlight: 'display',
      },
      {
        id: 'wide-hinge',
        title: { en: '135° Studio Hinge & Full Numpad Deck', hy: '135° Աշխատանքային Բացվածք և Ամբողջական Ստեղնաշար' },
        description: { en: 'Precision anodized wedge chassis with oversized glass touchpad.', hy: 'Ճշգրիտ անոդացված կորպուս և մեծ ապակե թաչփադ։' },
        cameraPreset: 'iso',
        explodeTarget: 0,
        hingeTarget: 135,
        layerHighlight: 'back_glass',
      },
      {
        id: 'rtx-xray',
        title: { en: 'X-Ray: Core Ultra 9 + RTX 4070 Dual-Fan Cooling', hy: 'X-Ray՝ Core Ultra 9 + RTX 4070 Երկհովացուցիչ Համակարգ' },
        description: { en: 'Lift keyboard deck to inspect vapor chamber heatpipes and dual blowers.', hy: 'Բարձրացրեք ստեղնաշարը՝ տեսնելու պղնձե խողովակներն ու երկու հովացուցիչները։' },
        cameraPreset: 'iso',
        explodeTarget: 85,
        hingeTarget: 118,
        layerHighlight: 'logic_board',
      },
    ],
    hasHinge: true,
    screenBadge: 'BOOK4 ULTRA · RTX 4070',
    officialUrl: 'https://www.samsung.com/us/computing/galaxy-book4-series/galaxy-book4-ultra/',
  },

  // ===========================
  // APPLE
  // ===========================
  {
    id: 'iphone-16-pro-max',
    brand: 'apple',
    category: 'phone',
    geometryType: 'phone-iphone',
    name: 'Apple iPhone 16 Pro Max',
    tagline: {
      en: '6.9" Super Retina XDR · A18 Pro 3nm · Camera Control',
      hy: '6.9" Super Retina XDR · A18 Pro 3նմ · Camera Control',
    },
    summary: {
      en: 'Grade 5 Titanium enclosure with the thinnest borders ever on iPhone, tactile Camera Control sapphire key, and 5x Tetraprism optics.',
      hy: '5-րդ դասի տիտանե կորպուս՝ գերբարակ շրջանակներով, սաֆիրե Camera Control կոճակով և 5x Tetraprism տեսախցիկով։',
    },
    basePriceUsd: 1199,
    releaseYear: '2024',
    dimensionsMm: { width: 77.6, height: 163.0, depth: 8.25 },
    weightGrams: 227,
    numericMetrics: { screenInches: 6.9, batteryScore: 4685, cameraMp: 48 },
    specs: {
      processor: {
        en: 'Apple A18 Pro (2nd-gen 3nm, 6C CPU, 16C Neural Engine)',
        hy: 'Apple A18 Pro (2-րդ սերնդի 3նմ, 6C CPU, 16C Neural Engine)',
      },
      display: {
        en: '6.9" Super Retina XDR OLED · 120Hz ProMotion · 2000 nits',
        hy: '6.9" Super Retina XDR OLED · 120Հց ProMotion · 2000 նիտ',
      },
      graphics: {
        en: '6-Core Apple GPU (Hardware Ray Tracing, Mesh Shading)',
        hy: '6-Միջուկանի Apple GPU (Ապարատային Ray Tracing)',
      },
      camera: {
        en: '48MP Fusion + 48MP Ultra-Wide + 12MP 5x Tetraprism (4K120 Dolby)',
        hy: '48ՄՊ Fusion + 48ՄՊ Գերլայն + 12ՄՊ 5x Tetraprism (4K120 Dolby)',
      },
      memory: {
        en: '8GB Unified LPDDR5X · 60 GB/s Bandwidth',
        hy: '8ԳԲ Unified LPDDR5X · 60 ԳԲ/վ Թողունակություն',
      },
      battery: {
        en: '4,685 mAh · Up to 33h Video · 25W MagSafe',
        hy: '4,685 մԱժ · Մինչև 33ժ Վիդեո · 25Վտ MagSafe',
      },
      chassis: {
        en: 'Grade 5 Microblasted Titanium · Ceramic Shield · IP68',
        hy: '5-րդ դասի Տիտան · Ceramic Shield · IP68',
      },
      connectivity: {
        en: 'Wi-Fi 7 · USB-C 3 (10Gb/s) · UWB Gen 2 · Satellite',
        hy: 'Wi-Fi 7 · USB-C 3 (10Գբ/վ) · UWB Gen 2 · Արբանյակային կապ',
      },
    },
    benchmarks: { singleCore: 3420, multiCore: 8580, gpuScore: 17100, peakNits: 2000 },
    finishes: [
      { id: 'desert-ti', name: { en: 'Desert Titanium', hy: 'Անապատային Տիտան' }, hex: '#C2A388', accentHex: '#E5A952', roughness: 0.24, metalness: 0.88 },
      { id: 'natural-ti', name: { en: 'Natural Titanium', hy: 'Բնական Տիտան' }, hex: '#98938B', accentHex: '#D4D0C8', roughness: 0.24, metalness: 0.88 },
      { id: 'black-ti', name: { en: 'Black Titanium', hy: 'Սև Տիտան' }, hex: '#222225', accentHex: '#71717A', roughness: 0.28, metalness: 0.84 },
      { id: 'white-ti', name: { en: 'White Titanium', hy: 'Սպիտակ Տիտան' }, hex: '#EAE8E2', accentHex: '#CBD5E1', roughness: 0.22, metalness: 0.82 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB', priceDeltaUsd: 200 },
      { id: '1tb', label: '1 TB', priceDeltaUsd: 400 },
    ],
    visualDetails3D: [
      {
        id: 'dynamic-island',
        title: { en: '6.9" Ultra-Thin Bezel & Dynamic Island', hy: '6.9" Գերբարակ Շրջանակ և Dynamic Island' },
        description: { en: 'Ceramic Shield front glass with 120Hz ProMotion adaptive refresh.', hy: 'Ceramic Shield ապակի՝ 120Հց ProMotion ադապտիվ թարմացմամբ։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        layerHighlight: 'display',
      },
      {
        id: 'tetraprism',
        title: { en: 'Triangular Camera Plateau & LiDAR', hy: 'Եռակի Տեսախցիկների Պլատֆորմ և LiDAR' },
        description: { en: 'Three sapphire-crystal rings housing 48MP Fusion and 5x folded Tetraprism.', hy: 'Երեք սաֆիրե օղակ՝ 48ՄՊ Fusion և 5x Tetraprism օպտիկայով։' },
        cameraPreset: 'back',
        explodeTarget: 22,
        layerHighlight: 'camera_module',
      },
      {
        id: 'magsafe-xray',
        title: { en: 'X-Ray: A18 Pro Board & Copper MagSafe Ring', hy: 'X-Ray՝ A18 Pro Պլատա և Պղնձե MagSafe Հանգույց' },
        description: { en: 'Internal graphite thermal substructure with L-shaped cell and MagSafe array.', hy: 'Գրաֆիտային ջերմահեռացման շերտ, L-աձև մարտկոց և MagSafe մագնիսական օղակ։' },
        cameraPreset: 'iso',
        explodeTarget: 90,
        layerHighlight: 'battery',
      },
    ],
    screenBadge: '16 PRO MAX · A18 PRO',
    officialUrl: 'https://www.apple.com/iphone-16-pro/',
  },
  {
    id: 'macbook-pro-16-m4max',
    brand: 'apple',
    category: 'laptop',
    geometryType: 'laptop-macbook',
    name: 'Apple MacBook Pro 16" (M4 Max)',
    tagline: {
      en: '16.2" Liquid Retina XDR · 40-Core GPU · 546 GB/s',
      hy: '16.2" Liquid Retina XDR · 40-Միջուկանի GPU · 546 ԳԲ/վ',
    },
    summary: {
      en: 'Flagship mobile studio powered by M4 Max 3nm silicon, delivering 546 GB/s unified memory bandwidth and 24-hour battery endurance.',
      hy: 'M4 Max 3նմ չիպով առաջատար աշխատակայան՝ 546 ԳԲ/վ միասնական հիշողությամբ և մինչև 24 ժամ մարտկոցով։',
    },
    basePriceUsd: 3499,
    releaseYear: '2024',
    dimensionsMm: { width: 355.7, height: 248.1, depth: 16.8 },
    weightGrams: 2150,
    numericMetrics: { screenInches: 16.2, batteryScore: 10000, cameraMp: 12 },
    specs: {
      processor: {
        en: 'Apple M4 Max (16-Core CPU · 12P + 4E · 38 TOPS NPU)',
        hy: 'Apple M4 Max (16-միջուկանի CPU · 12P + 4E · 38 TOPS NPU)',
      },
      display: {
        en: '16.2" Liquid Retina XDR (3456×2234) · 1600 nits HDR · 120Hz',
        hy: '16.2" Liquid Retina XDR (3456×2234) · 1600 նիտ HDR · 120Հց',
      },
      graphics: {
        en: '40-Core GPU · Hardware Ray Tracing · Dual ProRes Engines',
        hy: '40-Միջուկանի GPU · Ապարատային Ray Tracing · 2x ProRes',
      },
      camera: {
        en: '12MP Center Stage Camera (Desk View) · 6-Speaker Spatial Audio',
        hy: '12ՄՊ Center Stage Տեսախցիկ · 6-Բարձրախոս Spatial Audio',
      },
      memory: {
        en: '36GB–128GB Unified Memory · 546 GB/s Bandwidth',
        hy: '36ԳԲ–128ԳԲ Միասնական Հիշողություն · 546 ԳԲ/վ',
      },
      battery: {
        en: '100 Wh Li-Po · Up to 24h Video · 140W MagSafe 3',
        hy: '100 Վտժ Li-Po · Մինչև 24ժ Վիդեո · 140Վտ MagSafe 3',
      },
      chassis: {
        en: '100% Recycled Anodized Aluminum Unibody · 2.15 kg',
        hy: 'Անոդացված Ալյումինե Unibody Կորպուս · 2.15 կգ',
      },
      connectivity: {
        en: '3x Thunderbolt 5 (120 Gb/s) · HDMI 2.1 · SDXC · MagSafe 3',
        hy: '3x Thunderbolt 5 (120 Գբ/վ) · HDMI 2.1 · SDXC · MagSafe 3',
      },
    },
    benchmarks: { singleCore: 3920, multiCore: 25800, gpuScore: 54200, peakNits: 1600 },
    finishes: [
      { id: 'space-black', name: { en: 'Space Black', hy: 'Տիեզերական Սև' }, hex: '#1E1F24', accentHex: '#E5A952', roughness: 0.25, metalness: 0.88 },
      { id: 'silver', name: { en: 'Anodized Silver', hy: 'Անոդացված Արծաթագույն' }, hex: '#C9CDD1', accentHex: '#60A5FA', roughness: 0.22, metalness: 0.9 },
    ],
    storageOptions: [
      { id: '1tb-36g', label: '1 TB SSD · 36GB RAM', priceDeltaUsd: 0 },
      { id: '1tb-48g', label: '1 TB SSD · 48GB (40C GPU)', priceDeltaUsd: 500 },
      { id: '2tb-64g', label: '2 TB SSD · 64GB Unified', priceDeltaUsd: 900 },
      { id: '4tb-128g', label: '4 TB SSD · 128GB Unified', priceDeltaUsd: 1900 },
    ],
    visualDetails3D: [
      {
        id: 'xdr-display',
        title: { en: '16.2" Mini-LED XDR Notch Display', hy: '16.2" Mini-LED XDR Էկրան' },
        description: { en: '1,000,000:1 contrast ratio with 1000 nits sustained full-screen SDR/HDR.', hy: '1,000,000:1 կոնտրաստ և 1000 նիտ կայուն լուսավորություն։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        hingeTarget: 108,
        layerHighlight: 'display',
      },
      {
        id: 'tb5-ports',
        title: { en: '120 Gb/s Thunderbolt 5 & MagSafe 3 Profile', hy: '120 Գբ/վ Thunderbolt 5 և MagSafe 3 Կողային Պրոֆիլ' },
        description: { en: 'CNC-milled vents, SDXC reader, HDMI 2.1, and 3x Thunderbolt 5 ports.', hy: 'CNC ֆրեզված օդափոխման անցքեր, SDXC, HDMI 2.1 և 3x Thunderbolt 5։' },
        cameraPreset: 'edge',
        explodeTarget: 0,
        hingeTarget: 120,
        layerHighlight: 'back_glass',
      },
      {
        id: 'm4max-xray',
        title: { en: 'X-Ray: M4 Max Silicon & Twin Acoustic Fans', hy: 'X-Ray՝ M4 Max Կրեմնիում և Երկակի Հովացուցիչներ' },
        description: { en: 'Inspect the central M4 Max package flanked by 100Wh cells and twin blowers.', hy: 'Զննեք կենտրոնական M4 Max չիպը, 100 Վտժ մարտկոցային բլոկը և երկու հովացուցիչները։' },
        cameraPreset: 'iso',
        explodeTarget: 88,
        hingeTarget: 115,
        layerHighlight: 'logic_board',
      },
    ],
    hasHinge: true,
    screenBadge: 'MACBOOK PRO · M4 MAX',
    officialUrl: 'https://www.apple.com/macbook-pro/',
  },
  {
    id: 'apple-m4-max-soc',
    brand: 'apple',
    category: 'chip',
    geometryType: 'chip-soc',
    name: 'Apple M4 Max Silicon Package',
    tagline: {
      en: '2nd-Gen 3nm Architecture · 16C CPU · 40C GPU · 546 GB/s',
      hy: '2-րդ Սերնդի 3նմ Ճարտարապետություն · 16C CPU · 40C GPU',
    },
    summary: {
      en: 'Monolithic 3nm system-on-chip integrating unified LPDDR5X memory dies on a high-density organic substrate.',
      hy: 'Մոնոլիտ 3նմ համակարգ մեկ բյուրեղում՝ ինտեգրված LPDDR5X հիշողության բլոկներով և բարձր խտության ենթաշերտով։',
    },
    basePriceUsd: 699,
    releaseYear: '2024',
    dimensionsMm: { width: 58.0, height: 58.0, depth: 3.4 },
    weightGrams: 34,
    numericMetrics: { screenInches: 0, batteryScore: 9500, cameraMp: 0 },
    specs: {
      processor: {
        en: '16-Core CPU (12 Performance + 4 Efficiency, 4.51 GHz)',
        hy: '16-Միջուկանի CPU (12 Արտադրողական + 4 Էֆեկտիվ, 4.51 ԳՀց)',
      },
      display: {
        en: 'Supports up to 4 External 6K/8K Displays via TB5',
        hy: 'Մինչև 4 Արտաքին 6K/8K Էկրան Thunderbolt 5-ով',
      },
      graphics: {
        en: '40-Core Dynamic Caching GPU · Hardware Mesh Shading',
        hy: '40-Միջուկանի GPU · Դինամիկ Քեշավորում և Ray Tracing',
      },
      camera: {
        en: 'Dual ProRes Encode/Decode & AV1 Hardware Accelerator',
        hy: 'Կրկնակի ProRes Կոդավորիչ և AV1 Ապարատային Արագացուցիչ',
      },
      memory: {
        en: 'On-Package Unified Memory · 512-bit Bus · 546 GB/s',
        hy: 'Փաթեթում Ինտեգրված Հիշողություն · 512-բիթ · 546 ԳԲ/վ',
      },
      battery: {
        en: 'Ultra-Low Idle Power · Performance-per-Watt Leader',
        hy: 'Գերցածր Սպասման Հզորություն · Առաջատար Էներգաարդյունավետություն',
      },
      chassis: {
        en: 'Anodized Copper Heat Spreader · Gold Ball-Grid Array',
        hy: 'Անոդացված Պղնձե Ջերմափոխիչ · Ոսկե Կոնտակտային Ցանց',
      },
      connectivity: {
        en: 'Thunderbolt 5 Controller (120 Gb/s Bidirectional)',
        hy: 'Thunderbolt 5 Կոնտրոլեր (120 Գբ/վ Երկկողմ)',
      },
    },
    benchmarks: { singleCore: 3920, multiCore: 25800, gpuScore: 54200, peakNits: 0 },
    finishes: [
      { id: 'sapphire-die', name: { en: 'Sapphire Silicon', hy: 'Սաֆիրե Կրեմնիում' }, hex: '#1E293B', accentHex: '#60A5FA', roughness: 0.16, metalness: 0.92 },
      { id: 'gold-ihs', name: { en: 'Gold Reference', hy: 'Ոսկե Էտալոն' }, hex: '#B87D3B', accentHex: '#FDE68A', roughness: 0.2, metalness: 0.95 },
    ],
    storageOptions: [
      { id: 'dev-kit', label: 'Reference Die Module', priceDeltaUsd: 0 },
    ],
    visualDetails3D: [
      {
        id: 'ihs-top',
        title: { en: 'Integrated Heat Spreader & Laser Etching', hy: 'Ինտեգրված Ջերմափոխիչ և Լազերային Փորագրություն' },
        description: { en: 'Precision nickel-plated thermal lid engineered for zero-gap cold-plate contact.', hy: 'Նիկելապատ ջերմափոխիչ ծածկույթ՝ իդեալական ջերմահաղորդման համար։' },
        cameraPreset: 'iso',
        explodeTarget: 0,
        layerHighlight: 'display',
      },
      {
        id: 'die-xray',
        title: { en: 'X-Ray: 40-Core GPU & Neural Engine Architecture', hy: 'X-Ray՝ 40-Միջուկանի GPU և Neural Engine Կառուցվածք' },
        description: { en: 'Separate substrate, gold BGA pins, silicon die, and IHS lid vertically.', hy: 'Առանձնացրեք ենթաշերտը, ոսկե կոնտակտները, կրեմնիումի բյուրեղը և կափարիչը։' },
        cameraPreset: 'iso',
        explodeTarget: 95,
        layerHighlight: 'logic_board',
      },
    ],
    screenBadge: 'APPLE M4 MAX · 3NM DIE',
    officialUrl: 'https://www.apple.com/newsroom/2024/10/apple-introduces-m4-pro-and-m4-max/',
  },

  // ===========================
  // HUAWEI
  // ===========================
  {
    id: 'huawei-pura-70-ultra',
    brand: 'huawei',
    category: 'phone',
    geometryType: 'phone-pura',
    name: 'Huawei Pura 70 Ultra',
    tagline: {
      en: '1-Inch Retractable XMAGE Lens · Kunlun Glass · 100W Charge',
      hy: '1-Դյույմանոց Շարժական XMAGE Օբյեկտիվ · Kunlun Ապակի',
    },
    summary: {
      en: 'Distinctive triangular XMAGE camera island featuring a motorized 1-inch pop-out lens with a signature red ring and embossed vegan leather back.',
      hy: 'Եռանկյուն XMAGE տեսախցիկի մոդուլ՝ մեխանիկորեն դուրս եկող 1-դյույմանոց օբյեկտիվով, կարմիր օղակով և տեքստուրային հետնամասով։',
    },
    basePriceUsd: 1349,
    releaseYear: '2024',
    dimensionsMm: { width: 75.1, height: 162.6, depth: 8.4 },
    weightGrams: 226,
    numericMetrics: { screenInches: 6.8, batteryScore: 5200, cameraMp: 140 },
    specs: {
      processor: {
        en: 'Kirin 9010 (12-Thread Taishan Architecture, 2.3 GHz)',
        hy: 'Kirin 9010 (12-հոսքային Taishan ճարտարապետություն, 2.3 ԳՀց)',
      },
      display: {
        en: '6.8" Quad-Curved LTPO OLED (2844×1260) · 120Hz · 2500 nits',
        hy: '6.8" Քառակոր LTPO OLED (2844×1260) · 120Հց · 2500 նիտ',
      },
      graphics: {
        en: 'Maleoon 910 MP4 GPU · HarmonyOS 4.2 Engine',
        hy: 'Maleoon 910 MP4 GPU · HarmonyOS 4.2 Շարժիչ',
      },
      camera: {
        en: '50MP 1" Retractable (f/1.6–4.0) + 50MP 3.5x Macro + 40MP UW',
        hy: '50ՄՊ 1" Շարժական (f/1.6–4.0) + 50ՄՊ 3.5x Մակրո + 40ՄՊ Լայն',
      },
      memory: {
        en: '16GB LPDDR5X · 512GB / 1TB Flash',
        hy: '16ԳԲ LPDDR5X · 512ԳԲ / 1ՏԲ Կրիչ',
      },
      battery: {
        en: '5,200 mAh · 100W Wired · 80W Wireless SuperCharge',
        hy: '5,200 մԱժ · 100Վտ Լարային · 80Վտ Անլար SuperCharge',
      },
      chassis: {
        en: 'Starburst Vegan Leather · Crystal Armor Kunlun Glass · IP68',
        hy: 'Աստղաձև Էկո-Կաշի · Crystal Armor Kunlun Ապակի · IP68',
      },
      connectivity: {
        en: 'Dual Satellite Messaging · Wi-Fi 6 · IR Blaster · USB 3.1',
        hy: 'Երկակի Արբանյակային Կապ · Wi-Fi 6 · Ինֆրակարմիր · USB 3.1',
      },
    },
    benchmarks: { singleCore: 1445, multiCore: 4520, gpuScore: 9800, peakNits: 2500 },
    finishes: [
      { id: 'chanson-green', name: { en: 'Chanson Green', hy: 'Շանսոն Կանաչ' }, hex: '#2D5A47', accentHex: '#E5A952', roughness: 0.55, metalness: 0.2 },
      { id: 'mocha-brown', name: { en: 'Mocha Brown', hy: 'Մոկա Դարչնագույն' }, hex: '#634436', accentHex: '#DFAC6C', roughness: 0.58, metalness: 0.18 },
      { id: 'star-black', name: { en: 'Star Black', hy: 'Աստղային Սև' }, hex: '#1E1F24', accentHex: '#DC2626', roughness: 0.45, metalness: 0.35 },
      { id: 'star-white', name: { en: 'Starburst White', hy: 'Աստղային Սպիտակ' }, hex: '#ECEAE3', accentHex: '#B87D3B', roughness: 0.48, metalness: 0.25 },
    ],
    storageOptions: [
      { id: '512gb', label: '512 GB · 16GB RAM', priceDeltaUsd: 0 },
      { id: '1tb', label: '1 TB · 16GB RAM', priceDeltaUsd: 220 },
    ],
    visualDetails3D: [
      {
        id: 'xmage-retract',
        title: { en: 'Motorized 1-Inch Pop-Out XMAGE Lens', hy: 'Շարժական 1-Դյույմանոց XMAGE Օբյեկտիվ' },
        description: { en: 'Rotary telescopic mechanism physically extends 3.2mm during capture with red accent ring.', hy: 'Մեխանիկական շարժաբեր, որը նկարահանելիս առաջ է մղում կարմիր օղակով օբյեկտիվը։' },
        cameraPreset: 'back',
        explodeTarget: 0,
        lensExtend: true,
        layerHighlight: 'camera_module',
      },
      {
        id: 'kunlun-front',
        title: { en: 'Quad-Curved Crystal Armor Kunlun OLED', hy: 'Քառակոր Crystal Armor Kunlun OLED Էկրան' },
        description: { en: '300% improved scratch resistance with 2500-nit HDR luminance.', hy: 'Քերծվածքներից 300% բարձր պաշտպանություն և 2500 նիտ պայծառություն։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        lensExtend: false,
        layerHighlight: 'display',
      },
      {
        id: 'kirin-xray',
        title: { en: 'X-Ray: Kirin 9010 Logic & 80W Wireless Coil', hy: 'X-Ray՝ Kirin 9010 Պլատա և 80Վտ Անլար Կոճ' },
        description: { en: 'Inspect the 5200 mAh high-density cell, 80W coil, and retractable actuator.', hy: 'Տեսեք 5200 մԱժ մարտկոցը, 80Վտ անլար կոճը և օպտիկական շարժաբերը։' },
        cameraPreset: 'iso',
        explodeTarget: 85,
        lensExtend: true,
        layerHighlight: 'logic_board',
      },
    ],
    hasRetractableLens: true,
    screenBadge: 'PURA 70 ULTRA · XMAGE',
    officialUrl: 'https://consumer.huawei.com/en/phones/pura70-ultra/',
  },
  {
    id: 'huawei-mate-xt',
    brand: 'huawei',
    category: 'foldable',
    geometryType: 'foldable-trifold',
    name: 'Huawei Mate XT Ultimate Design',
    tagline: {
      en: '10.2" World-First Tri-Fold · 3.6mm Ultra-Thin · Z-Hinge',
      hy: '10.2" Աշխարհում Առաջին Եռածալ · 3.6մմ Բարություն',
    },
    summary: {
      en: 'Three-panel Z-fold engineering transforming seamlessly from a 6.4" bar phone to a 7.9" dual screen and full 10.2" 3K tablet.',
      hy: 'Եռապանել Z-աձև ինժեներիա՝ 6.4" սմարթֆոնից 7.9" կրկնակի և 10.2" 3K պլանշետի վերածվող կառուցվածքով։',
    },
    basePriceUsd: 2799,
    releaseYear: '2024',
    dimensionsMm: { width: 219.0, height: 156.7, depth: 3.6 },
    weightGrams: 298,
    numericMetrics: { screenInches: 10.2, batteryScore: 5600, cameraMp: 50 },
    specs: {
      processor: {
        en: 'Kirin 9010 (8-Core / 12-Thread Architecture)',
        hy: 'Kirin 9010 (8-Միջուկանի / 12-Հոսքային Ճարտարապետություն)',
      },
      display: {
        en: '10.2" Tri-Fold LTPO OLED (2232×3184) · 7.9" Dual · 6.4" Single',
        hy: '10.2" Եռածալ LTPO OLED · 7.9" Կրկնակի · 6.4" Միասնական',
      },
      graphics: {
        en: 'Maleoon 910 MP4 · Multi-Window Desktop Scaling',
        hy: 'Maleoon 910 MP4 · Բազմապատուհան Մասշտաբավորում',
      },
      camera: {
        en: '50MP Variable Aperture (f/1.4–4.0) + 12MP 5.5x Periscope + 12MP UW',
        hy: '50ՄՊ Փոփոխական Դիաֆրագմա + 12ՄՊ 5.5x Պերիսկոպ + 12ՄՊ Լայն',
      },
      memory: {
        en: '16GB RAM · 512GB / 1TB Storage',
        hy: '16ԳԲ RAM · 512ԳԲ / 1ՏԲ Կրիչ',
      },
      battery: {
        en: '5,600 mAh Silicon-Carbon (1.9mm Thin) · 66W Wired · 50W Wireless',
        hy: '5,600 մԱժ Սիլիցիում-Ածխածնային · 66Վտ Լարային · 50Վտ Անլար',
      },
      chassis: {
        en: 'Dual Tiangong Precision Hinges · Gold Eonic Curves · 3.6mm Unfolded',
        hy: 'Կրկնակի Tiangong Հանգույցներ · Ոսկե Եզրագծեր · 3.6մմ Բացված',
      },
      connectivity: {
        en: 'Tiantong Satellite · Wi-Fi 6 · Bluetooth 5.2 · USB-C 3.1',
        hy: 'Արբանյակային Կապ · Wi-Fi 6 · Bluetooth 5.2 · USB-C 3.1',
      },
    },
    benchmarks: { singleCore: 1460, multiCore: 4580, gpuScore: 9950, peakNits: 1800 },
    finishes: [
      { id: 'rui-red', name: { en: 'Rui Red & Gold', hy: 'Ռուի Կարմիր և Ոսկի' }, hex: '#881D24', accentHex: '#E5A952', roughness: 0.45, metalness: 0.4 },
      { id: 'xuan-black', name: { en: 'Xuan Black & Gold', hy: 'Սյուան Սև և Ոսկի' }, hex: '#1B1C20', accentHex: '#D49B4B', roughness: 0.42, metalness: 0.48 },
    ],
    storageOptions: [
      { id: '512gb', label: '512 GB · 16GB RAM', priceDeltaUsd: 0 },
      { id: '1tb', label: '1 TB · 16GB RAM', priceDeltaUsd: 300 },
    ],
    visualDetails3D: [
      {
        id: 'trifold-tablet',
        title: { en: '10.2" Full Tri-Panel Tablet Expansion', hy: '10.2" Ամբողջական Եռապանել Պլանշետ' },
        description: { en: 'Unfolded flat to 3.6mm with synchronized inward and outward Z-hinges.', hy: '3.6 մմ հաստությամբ ամբողջությամբ բացված Z-աձև հանգույցներով էկրան։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        foldTarget: 180,
        layerHighlight: 'display',
      },
      {
        id: 'z-fold-partial',
        title: { en: 'Interactive Z-Pattern Dual Hinge Mechanics', hy: 'Ինտերակտիվ Z-աձև Կրկնակի Հանգույցների Մեխանիկա' },
        description: { en: 'Left hinge folds inward while right hinge folds outward in real time.', hy: 'Ձախ հանգույցը ծալվում է ներս, իսկ աջը՝ դուրս՝ իրական ժամանակում։' },
        cameraPreset: 'iso',
        explodeTarget: 0,
        foldTarget: 85,
        layerHighlight: 'back_glass',
      },
      {
        id: 'star-diamond-back',
        title: { en: 'Octagonal Star Diamond Camera & Silicon-Carbon Cells', hy: 'Ութանկյուն Star Diamond Մոդուլ և 1.9մմ Մարտկոց' },
        description: { en: 'Three ultra-thin 1.9mm silicon-carbon cells distributed across all three panels.', hy: 'Երեք գերբարակ 1.9 մմ սիլիցիում-ածխածնային մարտկոցներ երեք պանելներում։' },
        cameraPreset: 'back',
        explodeTarget: 75,
        foldTarget: 155,
        layerHighlight: 'camera_module',
      },
    ],
    hasFold: true,
    screenBadge: 'MATE XT · 10.2" TRIFOLD',
    officialUrl: 'https://consumer.huawei.com/en/phones/mate-xt-ultimate-design/',
  },
  {
    id: 'huawei-matebook-x-pro',
    brand: 'huawei',
    category: 'laptop',
    geometryType: 'laptop-matebook',
    name: 'Huawei MateBook X Pro (Ultra)',
    tagline: {
      en: '980g Magnesium Alloy · 14.2" Flexible OLED · Core Ultra 9',
      hy: '980 գ Մագնեզիում · 14.2" Ճկուն OLED · Core Ultra 9',
    },
    summary: {
      en: 'Sub-kilogram 980g magnesium alloy workstation with a 14.2-inch flexible OLED display and 40W TDP Shark Fin cooling.',
      hy: 'Մեկ կիլոգրամից թեթև (980 գ) մագնեզիումային աշխատակայան՝ 14.2" ճկուն OLED էկրանով և 40Վտ Shark Fin հովացմամբ։',
    },
    basePriceUsd: 2199,
    releaseYear: '2024',
    dimensionsMm: { width: 310.0, height: 222.0, depth: 13.5 },
    weightGrams: 980,
    numericMetrics: { screenInches: 14.2, batteryScore: 7000, cameraMp: 2 },
    specs: {
      processor: {
        en: 'Intel Core Ultra 9 185H (16 Cores, 40W Sustained TDP)',
        hy: 'Intel Core Ultra 9 185H (16 Միջուկ, 40Վտ Կայուն TDP)',
      },
      display: {
        en: '14.2" Flexible OLED (3120×2080) · 120Hz · 1000 nits · 3:2 Ratio',
        hy: '14.2" Ճկուն OLED (3120×2080) · 120Հց · 1000 նիտ · 3:2',
      },
      graphics: {
        en: 'Intel Arc 8-Core GPU · AI Super Turbo',
        hy: 'Intel Arc 8-Միջուկանի GPU · AI Super Turbo',
      },
      camera: {
        en: '1080p AI Camera · 6-Speaker Huawei Sound System',
        hy: '1080p AI Տեսախցիկ · 6-Բարձրախոս Huawei Sound',
      },
      memory: {
        en: '32GB LPDDR5x · 2TB PCIe 4.0 NVMe SSD',
        hy: '32ԳԲ LPDDR5x · 2ՏԲ PCIe 4.0 NVMe SSD',
      },
      battery: {
        en: '70 Wh · 90W SuperCharge Turbo (10 min = 2h work)',
        hy: '70 Վտժ · 90Վտ SuperCharge Turbo',
      },
      chassis: {
        en: 'Micro-Arc Oxidized Magnesium Alloy · 980 g · 13.5mm',
        hy: 'Մագնեզիումային Համաձուլվածք · 980 գ · 13.5մմ',
      },
      connectivity: {
        en: '2x Thunderbolt 4 · 1x USB-C · Wi-Fi 6E · 3D Metal Antenna',
        hy: '2x Thunderbolt 4 · 1x USB-C · Wi-Fi 6E · 3D Անտենա',
      },
    },
    benchmarks: { singleCore: 2440, multiCore: 13100, gpuScore: 18900, peakNits: 1000 },
    finishes: [
      { id: 'morandi-blue', name: { en: 'Morandi Blue', hy: 'Մորանդի Կապույտ' }, hex: '#647C8C', accentHex: '#93C5FD', roughness: 0.35, metalness: 0.68 },
      { id: 'ink-black', name: { en: 'Ink Black', hy: 'Թանաքային Սև' }, hex: '#1F2127', accentHex: '#E5A952', roughness: 0.38, metalness: 0.65 },
      { id: 'chalk-white', name: { en: 'Silk White', hy: 'Մետաքսե Սպիտակ' }, hex: '#EAE8E2', accentHex: '#B87D3B', roughness: 0.32, metalness: 0.55 },
    ],
    storageOptions: [
      { id: '1tb-32g', label: '1 TB NVMe · 32GB', priceDeltaUsd: 0 },
      { id: '2tb-32g', label: '2 TB NVMe · 32GB', priceDeltaUsd: 240 },
    ],
    visualDetails3D: [
      {
        id: 'flex-oled',
        title: { en: '14.2" 3:2 Flexible OLED (93% Screen-to-Body)', hy: '14.2" 3:2 Ճկուն OLED (93% Էկրան-Կորպուս Հարաբերություն)' },
        description: { en: '1mm-thin lid enabled by flexible OLED substrate and magnesium skin.', hy: 'Ճկուն OLED ենթաշերտի շնորհիվ 1 մմ բարությամբ էկրանային կափարիչ։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        hingeTarget: 112,
        layerHighlight: 'display',
      },
      {
        id: 'tapered-980g',
        title: { en: '980g Tapered Wedge Edge Profile', hy: '980 գ Սրացող Եզրային Պրոֆիլ' },
        description: { en: 'CNC-crafted flying-wing 13.5mm magnesium alloy architecture.', hy: '13.5 մմ հաստությամբ մագնեզիումային թևաձև կորպուս։' },
        cameraPreset: 'edge',
        explodeTarget: 0,
        hingeTarget: 125,
        layerHighlight: 'back_glass',
      },
      {
        id: 'shark-fin-xray',
        title: { en: 'X-Ray: Modular Motherboard & Shark Fin Fans', hy: 'X-Ray՝ Մոդուլային Պլատա և Shark Fin Հովացում' },
        description: { en: '3-segment Falcon Wing motherboard architecture leaving maximum battery volume.', hy: 'Եռասեգմենտ Falcon Wing պլատա՝ առավելագույն մարտկոցի ծավալի համար։' },
        cameraPreset: 'iso',
        explodeTarget: 85,
        hingeTarget: 115,
        layerHighlight: 'logic_board',
      },
    ],
    hasHinge: true,
    screenBadge: 'MATEBOOK X PRO · 980G',
    officialUrl: 'https://consumer.huawei.com/en/laptops/matebook-x-pro-2024/',
  },
  // ===========================
  // ADDITIONAL TOP FLAGSHIPS (2024 / 2025)
  // ===========================
  {
    id: 'galaxy-s25-ultra',
    brand: 'samsung',
    category: 'phone',
    geometryType: 'phone-s24',
    name: 'Samsung Galaxy S25 Ultra',
    tagline: {
      en: '6.9" Dynamic AMOLED 2X · Snapdragon 8 Elite (3nm) · 200MP ProVisual',
      hy: '6.9" Dynamic AMOLED 2X · Snapdragon 8 Elite (3նմ) · 200ՄՊ ProVisual',
    },
    summary: {
      en: 'Curved-edge Grade 5 Titanium flagship powered by the custom 3nm Snapdragon 8 Elite for Galaxy, 50MP ultrawide + 200MP main sensor, and Gorilla Armor 2.',
      hy: '5-րդ դասի տիտանե կորացված եզրերով ֆլագման՝ 3նմ Snapdragon 8 Elite պրոցեսորով, 200ՄՊ + 50ՄՊ տեսախցիկներով և Gorilla Armor 2 ապակիով։',
    },
    basePriceUsd: 1349,
    releaseYear: '2025',
    dimensionsMm: { width: 77.6, height: 162.8, depth: 8.2 },
    weightGrams: 218,
    numericMetrics: { screenInches: 6.9, batteryScore: 5000, cameraMp: 200 },
    specs: {
      processor: {
        en: 'Snapdragon 8 Elite for Galaxy (3nm, 4.47 GHz Oryon)',
        hy: 'Snapdragon 8 Elite for Galaxy (3նմ, 4.47 ԳՀց Oryon)',
      },
      display: {
        en: '6.9" QHD+ Dynamic LTPO AMOLED 2X · 1–120Hz · 2800 nits',
        hy: '6.9" QHD+ Dynamic LTPO AMOLED 2X · 1–120Հց · 2800 նիտ',
      },
      graphics: {
        en: 'Adreno 830 GPU · Hardware Ray Tracing · Vulkan 1.3',
        hy: 'Adreno 830 GPU · Ապարատային Ray Tracing',
      },
      camera: {
        en: '200MP Wide + 50MP 5x Periscope + 50MP Ultra-Wide + 10MP 3x',
        hy: '200ՄՊ Հիմնական + 50ՄՊ 5x Պերիսկոպ + 50ՄՊ Գերլայնանկյուն',
      },
      memory: {
        en: '16GB LPDDR5X · Up to 1TB UFS 4.0',
        hy: '16ԳԲ LPDDR5X · Մինչև 1ՏԲ UFS 4.0',
      },
      battery: {
        en: '5000 mAh · 45W Super Fast Charging 2.0 · Qi2 Ready',
        hy: '5000 մԱժ · 45Վտ գերարագ լիցքավորում · Qi2',
      },
      chassis: {
        en: 'Grade 5 Titanium Frame · Corning Gorilla Armor 2 · IP68',
        hy: '5-րդ դասի տիտանե շրջանակ · Gorilla Armor 2 · IP68',
      },
      connectivity: {
        en: '5G mmWave · Wi-Fi 7 · Bluetooth 5.4 · UWB · S-Pen',
        hy: '5G · Wi-Fi 7 · Bluetooth 5.4 · UWB · S-Pen',
      },
    },
    benchmarks: { singleCore: 3180, multiCore: 10120, gpuScore: 20800, peakNits: 2800 },
    finishes: [
      { id: 'titanium-silverblue', name: { en: 'Titanium Silverblue', hy: 'Տիտանե Արծաթակապույտ' }, hex: '#8FA2B2', accentHex: '#38BDF8', roughness: 0.28, metalness: 0.85 },
      { id: 'titanium-jetblack', name: { en: 'Titanium Jetblack', hy: 'Տիտանե Սև' }, hex: '#1E2024', accentHex: '#60A5FA', roughness: 0.32, metalness: 0.82 },
      { id: 'titanium-whitesilver', name: { en: 'Titanium Whitesilver', hy: 'Տիտանե Սպիտակ' }, hex: '#EAECEF', accentHex: '#2563EB', roughness: 0.26, metalness: 0.78 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB', priceDeltaUsd: 120 },
      { id: '1tb', label: '1 TB', priceDeltaUsd: 320 },
    ],
    visualDetails3D: [
      {
        id: 's25-periscope',
        title: { en: '200MP + 50MP Ultra-Wide Optical Array', hy: '200ՄՊ + 50ՄՊ Օպտիկական Մոդուլ' },
        description: { en: 'Floating titanium lens rings with 5x optical periscope zoom.', hy: 'Տիտանե օբյեկտիվների օղակներ՝ 5x օպտիկական պերիսկոպով։' },
        cameraPreset: 'back',
        explodeTarget: 0,
        layerHighlight: 'camera_module',
      },
      {
        id: 's25-xray',
        title: { en: 'X-Ray: 3nm Snapdragon 8 Elite & 40% Larger Vapor Chamber', hy: 'X-Ray՝ 3նմ Snapdragon 8 Elite և Հովացման Խցիկ' },
        description: { en: 'Exploded view of the 3nm Oryon processor and copper thermal spreader.', hy: '3նմ Oryon պրոցեսորը և մեծացված պղնձե հովացման համակարգը։' },
        cameraPreset: 'iso',
        explodeTarget: 80,
        layerHighlight: 'logic_board',
      },
    ],
    screenBadge: 'GALAXY S25 ULTRA · 3NM',
    officialUrl: 'https://www.samsung.com/us/smartphones/galaxy-s25-ultra/',
  },
  {
    id: 'galaxy-tab-s10-ultra',
    brand: 'samsung',
    category: 'foldable',
    geometryType: 'foldable-book',
    name: 'Samsung Galaxy Tab S10 Ultra (14.6" OLED)',
    tagline: {
      en: '14.6" Dynamic AMOLED 2X · 5.4mm Armor Aluminum · S-Pen Pro',
      hy: '14.6" Dynamic AMOLED 2X · 5.4մմ Armor Aluminum · S-Pen Pro',
    },
    summary: {
      en: 'Ultra-expansive 14.6-inch anti-reflective Dynamic AMOLED 2X canvas engineered into a razor-thin 5.4mm IP68 Armor Aluminum body.',
      hy: 'Գերբարակ (5.4 մմ) IP68 պաշտպանությամբ Armor Aluminum կորպուս և 14.6" Dynamic AMOLED 2X հակափայլ էկրան։',
    },
    basePriceUsd: 1199,
    releaseYear: '2025',
    dimensionsMm: { width: 208.6, height: 326.4, depth: 5.4 },
    weightGrams: 718,
    numericMetrics: { screenInches: 14.6, batteryScore: 11200, cameraMp: 13 },
    specs: {
      processor: {
        en: 'Dimensity 9300+ Flagship Octa-Core (4nm, 3.4 GHz)',
        hy: 'Dimensity 9300+ Ֆլագմանային 8-միջուկանի (4նմ, 3.4 ԳՀց)',
      },
      display: {
        en: '14.6" Dynamic AMOLED 2X (2960×1848) · 120Hz · Anti-Reflective',
        hy: '14.6" Dynamic AMOLED 2X (2960×1848) · 120Հց · Հակափայլ',
      },
      graphics: {
        en: 'Immortalis-G720 MC12 Ray-Tracing GPU',
        hy: 'Immortalis-G720 MC12 GPU',
      },
      camera: {
        en: 'Dual 13MP + 8MP Rear · Dual 12MP Ultra-Wide 4K Front',
        hy: 'Կրկնակի 13ՄՊ + 8ՄՊ Հետևի · Կրկնակի 12ՄՊ Առջևի',
      },
      memory: {
        en: '16GB RAM · Up to 1TB Storage + microSD',
        hy: '16ԳԲ RAM · Մինչև 1ՏԲ Հիշողություն',
      },
      battery: {
        en: '11,200 mAh · 45W Fast Charging',
        hy: '11,200 մԱժ · 45Վտ արագ լիցքավորում',
      },
      chassis: {
        en: '5.4mm Enhanced Armor Aluminum · IP68 Water & Dust Resistant',
        hy: '5.4 մմ Armor Aluminum · IP68 ջրակայուն',
      },
      connectivity: {
        en: 'Wi-Fi 7 · 5G Sub-6 · Magnetic S-Pen Included',
        hy: 'Wi-Fi 7 · 5G · Մագնիսական S-Pen',
      },
    },
    benchmarks: { singleCore: 2290, multiCore: 7650, gpuScore: 16400, peakNits: 1750 },
    finishes: [
      { id: 'moonstone-gray', name: { en: 'Moonstone Gray', hy: 'Լուսնաքարային Մոխրագույն' }, hex: '#4B525C', accentHex: '#60A5FA', roughness: 0.32, metalness: 0.8 },
      { id: 'platinum-silver', name: { en: 'Platinum Silver', hy: 'Պլատինե Արծաթագույն' }, hex: '#C7CCD2', accentHex: '#2563EB', roughness: 0.28, metalness: 0.82 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB · 12GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB · 12GB', priceDeltaUsd: 120 },
      { id: '1tb', label: '1 TB · 16GB', priceDeltaUsd: 320 },
    ],
    visualDetails3D: [
      {
        id: 'tab-s10-display',
        title: { en: '14.6" Anti-Reflective AMOLED Studio Canvas', hy: '14.6" Հակափայլ AMOLED Էկրան' },
        description: { en: 'Ultra-wide creator display with 120Hz adaptive refresh.', hy: '120Հց ադապտիվ թարմացմամբ ստեղծագործական էկրան։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        foldTarget: 180,
        layerHighlight: 'display',
      },
    ],
    hasFold: true,
    screenBadge: 'TAB S10 ULTRA · 14.6"',
    officialUrl: 'https://www.samsung.com/us/tablets/galaxy-tab-s10/',
  },
  {
    id: 'iphone-16-pro',
    brand: 'apple',
    category: 'phone',
    geometryType: 'phone-iphone',
    name: 'Apple iPhone 16 Pro',
    tagline: {
      en: '6.3" Super Retina XDR · A18 Pro (3nm) · 5x Tetraprism Zoom',
      hy: '6.3" Super Retina XDR · A18 Pro (3նմ) · 5x Tetraprism Զում',
    },
    summary: {
      en: 'Compact Grade 5 Titanium Pro flagship packing the full 5x Tetraprism telephoto camera, Camera Control sapphire button, and 4K120 Dolby Vision.',
      hy: 'Կոմպակտ 5-րդ դասի տիտանե ֆլագման՝ լիարժեք 5x Tetraprism հեռաօբյեկտիվով, Camera Control սապֆիրե կոճակով և 4K120 Dolby Vision-ով։',
    },
    basePriceUsd: 999,
    releaseYear: '2024',
    dimensionsMm: { width: 71.5, height: 149.6, depth: 8.25 },
    weightGrams: 199,
    numericMetrics: { screenInches: 6.3, batteryScore: 3582, cameraMp: 48 },
    specs: {
      processor: {
        en: 'Apple A18 Pro (2nd-Gen 3nm · 6-Core CPU · 16-Core Neural Engine)',
        hy: 'Apple A18 Pro (2-րդ սերնդի 3նմ · 6-միջուկանի CPU)',
      },
      display: {
        en: '6.3" Super Retina XDR OLED · ProMotion 1–120Hz · 2000 nits',
        hy: '6.3" Super Retina XDR OLED · ProMotion 1–120Հց · 2000 նիտ',
      },
      graphics: {
        en: '6-Core Apple GPU with Hardware Ray Tracing',
        hy: '6-միջուկանի Apple GPU՝ Ray Tracing-ով',
      },
      camera: {
        en: '48MP Fusion + 48MP Ultra Wide + 12MP 5x Tetraprism Telephoto',
        hy: '48ՄՊ Fusion + 48ՄՊ Գերլայնանկյուն + 12ՄՊ 5x Tetraprism',
      },
      memory: {
        en: '8GB LPDDR5X Unified Memory · Up to 1TB NVMe',
        hy: '8ԳԲ LPDDR5X Միասնական Հիշողություն · Մինչև 1ՏԲ NVMe',
      },
      battery: {
        en: 'Up to 27h Video Playback · 25W MagSafe Wireless',
        hy: 'Մինչև 27 ժամ վիդեո · 25Վտ MagSafe անլար լիցքավորում',
      },
      chassis: {
        en: 'Grade 5 Micro-Blasted Titanium · Latest Ceramic Shield · IP68',
        hy: '5-րդ դասի տիտան · Ceramic Shield · IP68',
      },
      connectivity: {
        en: '5G · Wi-Fi 7 · Thread · 2nd-Gen Ultra Wideband · USB-C 10Gb/s',
        hy: '5G · Wi-Fi 7 · Thread · UWB · USB-C 10Գբ/վ',
      },
    },
    benchmarks: { singleCore: 3400, multiCore: 8390, gpuScore: 18600, peakNits: 2000 },
    finishes: [
      { id: 'desert-titanium', name: { en: 'Desert Titanium', hy: 'Անապատային Տիտան' }, hex: '#C4AF9A', accentHex: '#E5A952', roughness: 0.3, metalness: 0.82 },
      { id: 'natural-titanium', name: { en: 'Natural Titanium', hy: 'Բնական Տիտան' }, hex: '#A5A29B', accentHex: '#D97706', roughness: 0.3, metalness: 0.85 },
      { id: 'black-titanium', name: { en: 'Black Titanium', hy: 'Սև Տիտան' }, hex: '#232426', accentHex: '#E5A952', roughness: 0.35, metalness: 0.82 },
    ],
    storageOptions: [
      { id: '128gb', label: '128 GB', priceDeltaUsd: 0 },
      { id: '256gb', label: '256 GB', priceDeltaUsd: 100 },
      { id: '512gb', label: '512 GB', priceDeltaUsd: 300 },
      { id: '1tb', label: '1 TB', priceDeltaUsd: 500 },
    ],
    visualDetails3D: [
      {
        id: 'ip16pro-tetraprism',
        title: { en: '5x Tetraprism Optics in 6.3" Pro Form', hy: '5x Tetraprism Օպտիկա 6.3" Կորպուսում' },
        description: { en: 'Four-reflection glass prism folded inside the compact Pro chassis.', hy: 'Քառակի անդրադարձմամբ պրիզմա կոմպակտ տիտանե կորպուսում։' },
        cameraPreset: 'back',
        explodeTarget: 0,
        layerHighlight: 'camera_module',
      },
    ],
    screenBadge: 'IPHONE 16 PRO · 6.3"',
    officialUrl: 'https://www.apple.com/iphone-16-pro/',
  },
  {
    id: 'macbook-air-15-m3',
    brand: 'apple',
    category: 'laptop',
    geometryType: 'laptop-macbook',
    name: 'Apple MacBook Air 15" (M3)',
    tagline: {
      en: '15.3" Liquid Retina · 11.5mm Fanless Unibody · 18-Hour Battery',
      hy: '15.3" Liquid Retina · 11.5մմ Անաղմուկ Ալյումինե Կորպուս · 18Ժ Մարտկոց',
    },
    summary: {
      en: 'Impossibly thin 11.5mm fanless recycled aluminum unibody housing a 15.3-inch Liquid Retina display, 3nm M3 chip, and 6-speaker Spatial Audio.',
      hy: 'Ընդամենը 11.5 մմ հաստությամբ անաղմուկ ալյումինե կորպուս՝ 15.3" Liquid Retina էկրանով, 3նմ M3 չիպով և 6 բարձրախոսով։',
    },
    basePriceUsd: 1299,
    releaseYear: '2024',
    dimensionsMm: { width: 340.4, height: 237.6, depth: 11.5 },
    weightGrams: 1510,
    numericMetrics: { screenInches: 15.3, batteryScore: 6650, cameraMp: 2 },
    specs: {
      processor: {
        en: 'Apple M3 (3nm · 8-Core CPU · 16-Core Neural Engine)',
        hy: 'Apple M3 (3նմ · 8-միջուկանի CPU · 16-միջուկանի Neural Engine)',
      },
      display: {
        en: '15.3" Liquid Retina (2880×1864) · 500 nits · P3 Wide Color',
        hy: '15.3" Liquid Retina (2880×1864) · 500 նիտ · P3 գունային գամմա',
      },
      graphics: {
        en: '10-Core Apple GPU · Hardware Mesh Shading & Ray Tracing',
        hy: '10-միջուկանի Apple GPU · Hardware Ray Tracing',
      },
      camera: {
        en: '1080p FaceTime HD · 6-Speaker Sound System with Force-Cancelling Woofers',
        hy: '1080p FaceTime HD · 6-բարձրախոս Spatial Audio համակարգ',
      },
      memory: {
        en: '16GB Unified Memory · Up to 2TB SSD',
        hy: '16ԳԲ Միասնական Հիշողություն · Մինչև 2ՏԲ SSD',
      },
      battery: {
        en: '66.5 Wh · Up to 18 Hours · MagSafe 3 Fast Charge',
        hy: '66.5 Վտժ · Մինչև 18 ժամ աշխատանք · MagSafe 3',
      },
      chassis: {
        en: '100% Recycled CNC Aluminum Unibody · Silent Fanless Design',
        hy: 'Ամբողջական CNC ալյումինե անաղմուկ կորպուս (11.5 մմ)',
      },
      connectivity: {
        en: '2x Thunderbolt / USB 4 · MagSafe 3 · Wi-Fi 6E · Dual External Display Support',
        hy: '2x Thunderbolt / USB 4 · MagSafe 3 · Wi-Fi 6E',
      },
    },
    benchmarks: { singleCore: 3120, multiCore: 12150, gpuScore: 24800, peakNits: 500 },
    finishes: [
      { id: 'midnight', name: { en: 'Midnight', hy: 'Կեսգիշերային Կապույտ' }, hex: '#1E2430', accentHex: '#60A5FA', roughness: 0.3, metalness: 0.8 },
      { id: 'starlight', name: { en: 'Starlight', hy: 'Աստղային Ոսկեգույն' }, hex: '#E3DAC9', accentHex: '#E5A952', roughness: 0.28, metalness: 0.78 },
      { id: 'space-gray', name: { en: 'Space Gray', hy: 'Տիեզերական Մոխրագույն' }, hex: '#5D5E61', accentHex: '#E5A952', roughness: 0.3, metalness: 0.82 },
    ],
    storageOptions: [
      { id: '256gb-16g', label: '256 GB · 16GB', priceDeltaUsd: 0 },
      { id: '512gb-16g', label: '512 GB · 16GB', priceDeltaUsd: 200 },
      { id: '1tb-24g', label: '1 TB · 24GB', priceDeltaUsd: 600 },
    ],
    visualDetails3D: [
      {
        id: 'mba-blade',
        title: { en: '11.5mm Razor-Thin Fanless Unibody', hy: '11.5 մմ Գերբարակ Անաղմուկ Պրոֆիլ' },
        description: { en: 'Uniform 11.5mm aluminum enclosure with zero moving fan parts.', hy: '11.5 մմ հաստությամբ ամբողջական ալյումինե կորպուս։' },
        cameraPreset: 'edge',
        explodeTarget: 0,
        hingeTarget: 112,
        layerHighlight: 'back_glass',
      },
    ],
    hasHinge: true,
    screenBadge: 'MACBOOK AIR 15" · M3',
    officialUrl: 'https://www.apple.com/macbook-air/',
  },
  {
    id: 'huawei-mate-70-pro-plus',
    brand: 'huawei',
    category: 'phone',
    geometryType: 'phone-pura',
    name: 'Huawei Mate 70 Pro+ (Gold-Thread Titanium)',
    tagline: {
      en: '6.9" Quad-Curved LTPO OLED · XMAGE Red Maple Optics · Tiantong Satellite',
      hy: '6.9" Քառակոր LTPO OLED · XMAGE Օպտիկա · Տիտանե Շրջանակ',
    },
    summary: {
      en: 'High-gloss basalt titanium architecture with gold-thread brocade back cover, 1.5M multi-spectral Red Maple camera sensor, and 2nd-gen Kunlun Glass.',
      hy: 'Բազալտե տիտանից կորպուս՝ ոսկեթել հյուսվածքով, բազմասպեկտրալ XMAGE Red Maple տեսախցիկով և 2-րդ սերնդի Kunlun Glass-ով։',
    },
    basePriceUsd: 1399,
    releaseYear: '2025',
    dimensionsMm: { width: 79.5, height: 164.6, depth: 8.25 },
    weightGrams: 226,
    numericMetrics: { screenInches: 6.9, batteryScore: 5700, cameraMp: 50 },
    specs: {
      processor: {
        en: 'Kirin 9020 / 9100 Flagship SoC · Maleoon 920 GPU',
        hy: 'Kirin 9020 / 9100 Ֆլագմանային Պրոցեսոր · Maleoon 920 GPU',
      },
      display: {
        en: '6.9" LTPO OLED (2832×1316) · 1–120Hz · 2500 nits · Kunlun Glass 2',
        hy: '6.9" LTPO OLED · 1–120Հց · 2500 նիտ · Kunlun Glass 2',
      },
      graphics: {
        en: 'Maleoon 920 GPU · HarmonyOS NEXT Native Engine',
        hy: 'Maleoon 920 GPU · HarmonyOS NEXT շարժիչ',
      },
      camera: {
        en: '50MP Variable Aperture (f/1.4–f/4.0) + 48MP 4x Tele-Macro + 40MP Ultra-Wide',
        hy: '50ՄՊ Փոփոխական Դիաֆրագմա + 48ՄՊ 4x Հեռա-Մակրո + 40ՄՊ Լայնանկյուն',
      },
      memory: {
        en: '16GB RAM · Up to 1TB Flash Storage',
        hy: '16ԳԲ RAM · Մինչև 1ՏԲ Հիշողություն',
      },
      battery: {
        en: '5700 mAh High-Silicon Anode · 100W SuperCharge · 80W Wireless',
        hy: '5700 մԱժ · 100Վտ SuperCharge · 80Վտ անլար լիցքավորում',
      },
      chassis: {
        en: 'High-Gloss Basalt Titanium Frame · Gold-Thread Fiber Back · IP69',
        hy: 'Բազալտե տիտանե շրջանակ · Ոսկեթել մանրաթել · IP69 պաշտպանություն',
      },
      connectivity: {
        en: 'Dual Satellite Communications · Wi-Fi 7 · NearLink · USB-C 3.1 Gen1',
        hy: 'Կրկնակի արբանյակային կապ · Wi-Fi 7 · NearLink',
      },
    },
    benchmarks: { singleCore: 2150, multiCore: 6980, gpuScore: 15800, peakNits: 2500 },
    finishes: [
      { id: 'gold-silver-brocade', name: { en: 'Gold & Silver Brocade', hy: 'Ոսկեթել Դիպակ' }, hex: '#D8CEBE', accentHex: '#E5A952', roughness: 0.25, metalness: 0.76 },
      { id: 'ink-black-titanium', name: { en: 'Obsidian Black Titanium', hy: 'Օբսիդիան Սև Տիտան' }, hex: '#1C1D21', accentHex: '#EF4444', roughness: 0.28, metalness: 0.84 },
    ],
    storageOptions: [
      { id: '512gb', label: '512 GB · 16GB', priceDeltaUsd: 0 },
      { id: '1tb', label: '1 TB · 16GB', priceDeltaUsd: 220 },
    ],
    visualDetails3D: [
      {
        id: 'mate70-star-ring',
        title: { en: 'Star-Ring XMAGE Multi-Spectral Array', hy: 'Star-Ring XMAGE Տեսախցիկների Օղակ' },
        description: { en: '1.5M spectral channels capturing true-to-life color accuracy.', hy: '1.5 միլիոն սպեկտրալ ալիքներ՝ իրական գույների վերարտադրման համար։' },
        cameraPreset: 'back',
        explodeTarget: 0,
        lensExtend: true,
        layerHighlight: 'camera_module',
      },
    ],
    hasRetractableLens: true,
    screenBadge: 'MATE 70 PRO+ · TITANIUM',
    officialUrl: 'https://consumer.huawei.com/en/phones/',
  },
  {
    id: 'huawei-matepad-pro-13',
    brand: 'huawei',
    category: 'foldable',
    geometryType: 'foldable-book',
    name: 'Huawei MatePad Pro 13.2" (Tandem OLED)',
    tagline: {
      en: '13.2" Flexible OLED PaperMatte · 5.5mm · 580g · NearLink M-Pencil',
      hy: '13.2" Ճկուն OLED PaperMatte · 5.5մմ · 580 գ · NearLink M-Pencil',
    },
    summary: {
      en: 'World’s thinnest 5.5mm 13.2-inch tablet with a 94% screen-to-body Flexible Tandem OLED PaperMatte display and 10,100 mAh battery.',
      hy: 'Աշխարհի ամենաբարակ 5.5 մմ պլանշետներից՝ 13.2" Flexible OLED PaperMatte էկրանով (94% օգտակար մակերես) և 580 գ քաշով։',
    },
    basePriceUsd: 1099,
    releaseYear: '2024',
    dimensionsMm: { width: 196.1, height: 289.1, depth: 5.5 },
    weightGrams: 580,
    numericMetrics: { screenInches: 13.2, batteryScore: 10100, cameraMp: 13 },
    specs: {
      processor: {
        en: 'Kirin 9000W Octa-Core · Stainless VC Cooling',
        hy: 'Kirin 9000W 8-միջուկանի պրոցեսոր · VC հովացում',
      },
      display: {
        en: '13.2" Flexible OLED (2880×1920) · 144Hz · 1000 nits · 3:2',
        hy: '13.2" Ճկուն OLED (2880×1920) · 144Հց · 1000 նիտ · 3:2',
      },
      graphics: {
        en: 'Maleoon 910 GPU · GoPaint Pro Engine',
        hy: 'Maleoon 910 GPU · GoPaint Pro գրաֆիկական շարժիչ',
      },
      camera: {
        en: '13MP + 8MP Rear · 16MP Front + ToF 3D Depth Sensor',
        hy: '13ՄՊ + 8ՄՊ Հետևի · 16ՄՊ Առջևի + 3D ToF սենսոր',
      },
      memory: {
        en: '12GB / 16GB RAM · 512GB / 1TB ROM',
        hy: '12ԳԲ / 16ԳԲ RAM · 512ԳԲ / 1ՏԲ Հիշողություն',
      },
      battery: {
        en: '10,100 mAh Dual-Series Cell · 88W SuperCharge',
        hy: '10,100 մԱժ · 88Վտ SuperCharge արագ լիցքավորում',
      },
      chassis: {
        en: '5.5mm High-Strength Fiberglass & Magnesium Frame · 580g',
        hy: '5.5 մմ ապակեթելային և մագնեզիումային շրջանակ · 580 գ',
      },
      connectivity: {
        en: 'NearLink Stylus & Keyboard · Wi-Fi 6 · Huawei Sound 6-Speaker',
        hy: 'NearLink գրիչ և ստեղնաշար · 6-բարձրախոս Huawei Sound',
      },
    },
    benchmarks: { singleCore: 1920, multiCore: 6150, gpuScore: 13400, peakNits: 1000 },
    finishes: [
      { id: 'green-brocade', name: { en: ' Puyang Green', hy: 'Զմրուխտե Կանաչ' }, hex: '#3B5E52', accentHex: '#34D399', roughness: 0.3, metalness: 0.65 },
      { id: 'golden-black', name: { en: 'Golden Black', hy: 'Սև Ոսկեգույն' }, hex: '#1F2024', accentHex: '#E5A952', roughness: 0.32, metalness: 0.72 },
    ],
    storageOptions: [
      { id: '256gb', label: '256 GB · 12GB', priceDeltaUsd: 0 },
      { id: '512gb', label: '512 GB · 12GB', priceDeltaUsd: 150 },
    ],
    visualDetails3D: [
      {
        id: 'matepad-oled',
        title: { en: '13.2" 144Hz Flexible OLED Canvas', hy: '13.2" 144Հց Ճկուն OLED Էկրան' },
        description: { en: '3.4mm ultra-slim bezels with anti-glare nano-etched glass.', hy: '3.4 մմ գերբարակ շրջանակներ և հակափայլ նանո-ապակի։' },
        cameraPreset: 'front',
        explodeTarget: 0,
        foldTarget: 180,
        layerHighlight: 'display',
      },
    ],
    hasFold: true,
    screenBadge: 'MATEPAD PRO 13.2"',
    officialUrl: 'https://consumer.huawei.com/en/tablets/matepad-pro-13-2/',
  },
];

export function getDeviceById(id: string): DeviceSpec {
  const foundDevice = DEVICES.find((d) => d.id === id);
  if (foundDevice) return foundDevice;

  const foundAppliance = APPLIANCE_MODELS.find((m) => m.id === id);
  if (foundAppliance) {
    const baseUsd = getApplianceBasePriceUsd(foundAppliance.id);
    return {
      id: foundAppliance.id,
      brand: 'samsung',
      category: 'laptop',
      geometryType: 'laptop-book4',
      name: `${foundAppliance.brand} ${foundAppliance.modelCode} — ${foundAppliance.name}`,
      tagline: foundAppliance.highlights,
      summary: foundAppliance.highlights,
      basePriceUsd: baseUsd,
      releaseYear: '2025',
      dimensionsMm: { width: 600, height: 850, depth: 600 },
      weightGrams: 55000,
      numericMetrics: {
        screenInches: foundAppliance.capacityValue,
        batteryScore: 9500,
        cameraMp: 0,
      },
      specs: {
        processor: foundAppliance.specs.type,
        display: foundAppliance.capacityLabel,
        graphics: foundAppliance.specs.powerOrConsumption,
        camera: foundAppliance.specs.noiseOrCooling,
        memory: foundAppliance.specs.smartFeatures,
        battery: { en: foundAppliance.energyClass, hy: foundAppliance.energyClass },
        chassis: foundAppliance.specs.finish,
        connectivity: foundAppliance.warranty,
      },
      benchmarks: { singleCore: 2500, multiCore: 9000, gpuScore: 15000, peakNits: 1000 },
      finishes: [
        {
          id: 'stainless-pro',
          name: foundAppliance.specs.finish,
          hex: '#7A828C',
          accentHex: '#E5A952',
          roughness: 0.25,
          metalness: 0.85,
        },
        {
          id: 'obsidian-black',
          name: { en: 'Black Stainless Steel', hy: 'Սև Չժանգոտվող Պողպատ' },
          hex: '#22252A',
          accentHex: '#E5A952',
          roughness: 0.28,
          metalness: 0.82,
        },
      ],
      storageOptions: [
        {
          id: 'standard',
          label: `${foundAppliance.capacityLabel.en} · ${foundAppliance.dimensionsCm}`,
          priceDeltaUsd: 0,
        },
        {
          id: 'pro-warranty',
          label: `${foundAppliance.capacityLabel.en} + VIP 5Y Care`,
          priceDeltaUsd: 120,
        },
      ],
      visualDetails3D: [],
      screenBadge: foundAppliance.energyClass,
      officialUrl: 'https://www.google.com',
    };
  }

  return DEVICES[0];
}

export function getDevicesByBrand(brand: BrandId): DeviceSpec[] {
  return DEVICES.filter((d) => d.brand === brand);
}
