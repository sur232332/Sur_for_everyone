import { LocalizedText } from '../types/hardware';

export type CarBodyStyle = 'gt3' | 'urus' | 'gwagon' | 'turbos' | 'f8' | 'continental';
export type CarColorCategory = 'blue' | 'yellow' | 'green' | 'black' | 'red' | 'silver';

export interface LuxuryCarSpec {
  id: string;
  stockNumber: string;
  year: number;
  make: string;
  model: string;
  fullName: string;
  bodyStyle: CarBodyStyle;
  priceUsd: number;
  colorCategory: CarColorCategory;
  colorHex: string;
  colorName: LocalizedText;
  secondaryColorHex: string;
  caliperColorHex: string;
  doorType: 'standard' | 'scissor' | 'butterfly';
  enginePitch: number;
  heroPhotoUrl?: string;
  rearPhotoUrl?: string;
  spinFrames?: string[];
  /** Optional second 360° frame set that shows the trunk / rear (used by the Rear button) */
  trunkSpinFrames?: string[];
  /** True when the 360° frames already show the trunk/lids opening, so the Doors/Trunk buttons are hidden */
  openingsInSpin?: boolean;
  /** If the spin frames cover only part of a turn (e.g. 145 = front to rear three-quarter), set it here. Drag stops at the ends and auto-spin goes back and forth. */
  spinArcDeg?: number;
  spinVideoUrl?: string;
  doorsSpinVideoUrl?: string;
  /** Short cinematic clip that plays once when the car is opened (then stays on its last frame) */
  introVideoUrl?: string;
  /** 360° frame set with doors, frunk and engine cover open (used by the Open doors button) */
  doorsSpinFrames?: string[];
  doorsOpenPhotoUrl?: string;
  /** Optional real 3D model (.glb) placed in /public/models, e.g. '/models/porsche-911-gt3.glb' */
  glbUrl?: string;
  /** Author credit for the 3D model (required by its CC-BY license) */
  modelCredit?: { title: string; author: string; url: string; license: string };
  /** Repaint the .glb body with `colorHex` (used when a car borrows another car's model) */
  repaintGlb?: boolean;
  droneHotspot: {
    left: string;
    top: string;
    badgeLeft: string;
    badgeTop: string;
  };
  parkingSlot: {
    row: 'top' | 'bottom';
    col: 0 | 1 | 2;
    x: number;
    z: number;
    rotationY: number;
  };
  specs: {
    mileage: string;
    engine: string;
    drivetrain: string;
    horsepower: string;
    zeroToSixty: string;
    topSpeed: string;
  };
  numericSpecs: {
    horsepower: number;
    zeroToSixtySec: number;
    topSpeedMph: number;
    mileageMi: number;
  };
  description: LocalizedText;
  availableColors: Array<{
    name: LocalizedText;
    hex: string;
  }>;
}

/**
 * Builds the frame list for a 360° spin made with scripts/make-spin-frames.sh
 * Files live in /public/cars/frames/<slug>/001.jpg ... NNN.jpg
 */
export const spinFrameUrls = (slug: string, count = 72, ext = 'jpg'): string[] =>
  Array.from(
    { length: count },
    (_, i) => `/cars/frames/${slug}/${String(i + 1).padStart(3, '0')}.${ext}`
  );

export const LUXURY_CARS: LuxuryCarSpec[] = [
  {
    id: 'porsche-911-gt3',
    glbUrl: '/models/opt-porsche-911-gt3.glb',
    modelCredit: {
      title: '2022 Porsche 911 GT3 (992)',
      author: 'Ddiaz Design',
      url: 'https://sketchfab.com/3d-models/2022-porsche-911-gt3-992-ba01afbaf32846e598db315be3507db3',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-992GT3',
    year: 2023,
    make: 'Porsche',
    model: '911 GT3',
    fullName: 'Porsche 911 GT3',
    bodyStyle: 'gt3',
    priceUsd: 249900,
    colorCategory: 'blue',
    colorHex: '#0066ff',
    colorName: { en: 'Shark Blue', hy: 'Շարկ Կապույտ (Shark Blue)' },
    secondaryColorHex: '#111318',
    caliperColorHex: '#facc15',
    doorType: 'standard',
    enginePitch: 68,
    heroPhotoUrl: '/cars/porsche-911-gt3-studio.webp',
    spinFrames: spinFrameUrls('porsche-show', 100),
    openingsInSpin: true,
    droneHotspot: {
      left: '30.2%',
      top: '31%',
      badgeLeft: '36.8%',
      badgeTop: '31%',
    },
    parkingSlot: {
      row: 'top',
      col: 0,
      x: -7.2,
      z: -4.6,
      rotationY: 0,
    },
    specs: {
      mileage: '3,420 mi',
      engine: '4.0L Flat-6',
      drivetrain: 'RWD',
      horsepower: '502 hp',
      zeroToSixty: '3.2s',
      topSpeed: '197 mph',
    },
    numericSpecs: {
      horsepower: 502,
      zeroToSixtySec: 3.2,
      topSpeedMph: 197,
      mileageMi: 3420,
    },
    description: {
      en: 'Naturally aspirated 9,000 RPM motorsport-derived Flat-6 with swan-neck carbon rear wing and ceramic composite brakes.',
      hy: 'Մթնոլորտային 9,000 պտ/ր հզորությամբ սպորտային 4.0L Flat-6 շարժիչ, կարբոն-կերամիկական արգելակներ և աերոդինամիկ թև։',
    },
    availableColors: [
      { name: { en: 'Shark Blue', hy: 'Շարկ Կապույտ' }, hex: '#0066ff' },
      { name: { en: 'Guards Red', hy: 'Սպորտային Կարմիր' }, hex: '#dc2626' },
      { name: { en: 'Python Green', hy: 'Պիթոն Կանաչ' }, hex: '#16a34a' },
      { name: { en: 'Chalk Grey', hy: 'Կավճային Մոխրագույն' }, hex: '#d1d5db' },
    ],
  },
  {
    id: 'lamborghini-urus',
    glbUrl: '/models/opt-lamborghini-urus.glb',
    modelCredit: {
      title: '2019 Lamborghini Urus',
      author: 'Ddiaz Design',
      url: 'https://sketchfab.com/3d-models/2019-lamborghini-urus-9ef2fd625ba54ea39226ea5d043c0e13',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-URUS23',
    year: 2023,
    make: 'Lamborghini',
    model: 'Urus',
    fullName: 'Lamborghini Urus',
    bodyStyle: 'urus',
    priceUsd: 268500,
    colorCategory: 'yellow',
    colorHex: '#eab308',
    colorName: { en: 'Giallo Auge Yellow', hy: 'Վառ Դեղին (Giallo Auge)' },
    secondaryColorHex: '#0f1115',
    caliperColorHex: '#eab308',
    doorType: 'standard',
    enginePitch: 52,
    heroPhotoUrl: '/cars/lamborghini-urus.webp',
    introVideoUrl: '/cars/small-lamborghini-urus-intro-v2.mp4',
    rearPhotoUrl: '/cars/lamborghini-urus-rear.webp',
    droneHotspot: {
      left: '50.0%',
      top: '31%',
      badgeLeft: '56.8%',
      badgeTop: '31%',
    },
    parkingSlot: {
      row: 'top',
      col: 1,
      x: 0,
      z: -4.6,
      rotationY: 0,
    },
    specs: {
      mileage: '6,150 mi',
      engine: '4.0L V8 Twin-Turbo',
      drivetrain: 'AWD',
      horsepower: '657 hp',
      zeroToSixty: '3.1s',
      topSpeed: '190 mph',
    },
    numericSpecs: {
      horsepower: 657,
      zeroToSixtySec: 3.1,
      topSpeedMph: 190,
      mileageMi: 6150,
    },
    description: {
      en: 'The world’s first Super Sport Utility Vehicle combining exotic Italian design with brutal twin-turbo V8 performance.',
      hy: 'Աշխարհի առաջին սուպեր-սպորտային ամենագնացը՝ իտալական ագրեսիվ դիզայնով և 657 ձիաուժանոց Twin-Turbo V8 շարժիչով։',
    },
    availableColors: [
      { name: { en: 'Giallo Auge', hy: 'Վառ Դեղին' }, hex: '#eab308' },
      { name: { en: 'Arancio Borealis', hy: 'Նարնջագույն' }, hex: '#f97316' },
      { name: { en: 'Verde Mantis', hy: 'Լայմ Կանաչ' }, hex: '#65a30d' },
      { name: { en: 'Nero Noctis', hy: 'Սև Մետալիկ' }, hex: '#18181b' },
    ],
  },
  {
    id: 'mercedes-amg-g63',
    glbUrl: '/models/opt-mercedes-amg-g63.glb',
    modelCredit: {
      title: '2015 Mercedes-Benz G-Class G 63 AMG',
      author: 'Ddiaz Design',
      url: 'https://sketchfab.com/3d-models/2015-mercedes-benz-g-class-g-63-amg-61c922248b59447892ce34ba0fc290f3',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-G63AMG',
    year: 2022,
    make: 'Mercedes-AMG',
    model: 'G 63',
    fullName: 'Mercedes-AMG G 63',
    bodyStyle: 'gwagon',
    priceUsd: 219000,
    colorCategory: 'green',
    colorHex: '#4b573b',
    colorName: { en: 'Matte Military Green Magno', hy: 'Մատ Ռազմական Կանաչ (Magno)' },
    secondaryColorHex: '#141619',
    caliperColorHex: '#ef4444',
    doorType: 'standard',
    enginePitch: 44,
    heroPhotoUrl: '/cars/mercedes-amg-g63.webp',
    droneHotspot: {
      left: '70.2%',
      top: '31%',
      badgeLeft: '77.2%',
      badgeTop: '31%',
    },
    parkingSlot: {
      row: 'top',
      col: 2,
      x: 7.2,
      z: -4.6,
      rotationY: 0,
    },
    specs: {
      mileage: '9,840 mi',
      engine: '4.0L V8 Biturbo',
      drivetrain: '4MATIC',
      horsepower: '577 hp',
      zeroToSixty: '4.4s',
      topSpeed: '149 mph',
    },
    numericSpecs: {
      horsepower: 577,
      zeroToSixtySec: 4.4,
      topSpeedMph: 149,
      mileageMi: 9840,
    },
    description: {
      en: 'Iconic handcrafted AMG G-Wagen with side-exit quad exhausts, three locking differentials, and bespoke Nappa leather cabin.',
      hy: 'Լեգենդար Mercedes-AMG G 63՝ կողային արտանետման խողովակներով, 3 դիֆերենցիալ արգելափակումով և շքեղ Nappa կաշվե սրահով։',
    },
    availableColors: [
      { name: { en: 'Military Green Magno', hy: 'Մատ Ռազմական Կանաչ' }, hex: '#4b573b' },
      { name: { en: 'Monza Grey', hy: 'Մոխրագույն Մագնո' }, hex: '#64748b' },
      { name: { en: 'Obsidian Black', hy: 'Օբսիդիան Սև' }, hex: '#111827' },
      { name: { en: 'G Manufaktur White', hy: 'Մարգարտյա Սպիտակ' }, hex: '#f8fafc' },
    ],
  },
  {
    id: 'porsche-911-turbos',
    // No own model yet: borrows the 911 GT3 (992) body, repainted in its own colour
    glbUrl: '/models/opt-porsche-911-gt3.glb',
    repaintGlb: true,
    modelCredit: {
      title: '2022 Porsche 911 GT3 (992)',
      author: 'Ddiaz Design',
      url: 'https://sketchfab.com/3d-models/2022-porsche-911-gt3-992-ba01afbaf32846e598db315be3507db3',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-992TBS',
    year: 2023,
    make: 'Porsche',
    model: '911 Turbo S',
    fullName: 'Porsche 911 Turbo S',
    bodyStyle: 'turbos',
    priceUsd: 234500,
    colorCategory: 'black',
    colorHex: '#272a30',
    colorName: { en: 'Jet Black Metallic', hy: 'Սև Մետալիկ (Jet Black)' },
    secondaryColorHex: '#090a0d',
    caliperColorHex: '#facc15',
    doorType: 'standard',
    enginePitch: 62,
    heroPhotoUrl: '/cars/porsche-911-turbos.webp',
    rearPhotoUrl: '/cars/porsche-911-turbos-rear.webp',
    droneHotspot: {
      left: '30.0%',
      top: '75%',
      badgeLeft: '36.8%',
      badgeTop: '75%',
    },
    parkingSlot: {
      row: 'bottom',
      col: 0,
      x: -7.2,
      z: 4.6,
      rotationY: Math.PI,
    },
    specs: {
      mileage: '4,120 mi',
      engine: '3.8L Twin-Turbo F6',
      drivetrain: 'AWD',
      horsepower: '640 hp',
      zeroToSixty: '2.6s',
      topSpeed: '205 mph',
    },
    numericSpecs: {
      horsepower: 640,
      zeroToSixtySec: 2.6,
      topSpeedMph: 205,
      mileageMi: 4120,
    },
    description: {
      en: 'Relentless all-wheel-drive launch control capability hitting 0-60 mph in 2.6 seconds with everyday grand touring comfort.',
      hy: 'Անհավանական արագացում՝ 0-100 կմ/ժ ընդամենը 2.6 վայրկյանում, լիաքարշակ համակարգ և ամենօրյա հարմարավետություն։',
    },
    availableColors: [
      { name: { en: 'Jet Black Metallic', hy: 'Սև Մետալիկ' }, hex: '#272a30' },
      { name: { en: 'GT Silver', hy: 'GT Արծաթագույն' }, hex: '#94a3b8' },
      { name: { en: 'Gentian Blue', hy: 'Մուգ Կապույտ' }, hex: '#1e3a8a' },
      { name: { en: 'Carmine Red', hy: 'Կարմին Կարմիր' }, hex: '#b91c1c' },
    ],
  },
  {
    id: 'ferrari-f8-tributo',
    glbUrl: '/models/opt-ferrari-f8-tributo.glb',
    modelCredit: {
      title: '2020 Ferrari F8 Tributo',
      author: 'Ddiaz Design',
      url: 'https://sketchfab.com/3d-models/2020-ferrari-f8-tributo-8a86c4d634f64f8b8ee836bc93fa6ac8',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-F8TRIB',
    year: 2022,
    make: 'Ferrari',
    model: 'F8 Tributo',
    fullName: 'Ferrari F8 Tributo',
    bodyStyle: 'f8',
    priceUsd: 334900,
    colorCategory: 'red',
    colorHex: '#ef1a2d',
    colorName: { en: 'Rosso Corsa', hy: 'Ֆերրարի Կարմիր (Rosso Corsa)' },
    secondaryColorHex: '#121316',
    caliperColorHex: '#facc15',
    doorType: 'butterfly',
    enginePitch: 74,
    heroPhotoUrl: '/cars/ferrari-f8-tributo.webp',
    droneHotspot: {
      left: '50.0%',
      top: '75%',
      badgeLeft: '56.8%',
      badgeTop: '75%',
    },
    parkingSlot: {
      row: 'bottom',
      col: 1,
      x: 0,
      z: 4.6,
      rotationY: Math.PI,
    },
    specs: {
      mileage: '2,190 mi',
      engine: '3.9L Twin-Turbo V8',
      drivetrain: 'RWD',
      horsepower: '710 hp',
      zeroToSixty: '2.8s',
      topSpeed: '211 mph',
    },
    numericSpecs: {
      horsepower: 710,
      zeroToSixtySec: 2.8,
      topSpeedMph: 211,
      mileageMi: 2190,
    },
    description: {
      en: 'Mid-rear-engined berlinetta paying homage to the most powerful V8 in Ferrari history with S-Duct aero and Lexan engine cover.',
      hy: 'Միջին շարժիչով իտալական սուպերքար՝ 710 ձիաուժ հզորությամբ V8 շարժիչով, S-Duct աերոդինամիկայով և թափանցիկ շարժիչի ծածկով։',
    },
    availableColors: [
      { name: { en: 'Rosso Corsa', hy: 'Rosso Corsa Կարմիր' }, hex: '#ef1a2d' },
      { name: { en: 'Giallo Modena', hy: 'Մոդենա Դեղին' }, hex: '#facc15' },
      { name: { en: 'Grigio Silverstone', hy: 'Մոխրագույն' }, hex: '#475569' },
      { name: { en: 'Blu Corsa', hy: 'Blu Corsa Կապույտ' }, hex: '#2563eb' },
    ],
  },
  {
    id: 'bentley-continental-gt',
    glbUrl: '/models/opt-bentley-continental-gt.glb',
    modelCredit: {
      title: '2025 Bentley Continental GT Speed',
      author: 'OUTPISTON',
      url: 'https://sketchfab.com/3d-models/2025-bentley-continental-gt-speed-ffcac9aba75f4d66a09bf09228bfc0fd',
      license: 'CC BY-NC-SA 4.0',
    },
    stockNumber: 'KLB-CONTGT',
    year: 2023,
    make: 'Bentley',
    model: 'Continental GT Speed',
    fullName: 'Bentley Continental GT',
    bodyStyle: 'continental',
    priceUsd: 289000,
    colorCategory: 'silver',
    colorHex: '#cbd5e1',
    colorName: { en: 'Extreme Silver Metallic', hy: 'Արծաթագույն Մետալիկ (Silver)' },
    secondaryColorHex: '#1e293b',
    caliperColorHex: '#dc2626',
    doorType: 'standard',
    enginePitch: 48,
    heroPhotoUrl: '/cars/bentley-continental-gt.webp',
    droneHotspot: {
      left: '70.5%',
      top: '75%',
      badgeLeft: '77.4%',
      badgeTop: '75%',
    },
    parkingSlot: {
      row: 'bottom',
      col: 2,
      x: 7.2,
      z: 4.6,
      rotationY: Math.PI,
    },
    specs: {
      mileage: '5,300 mi',
      engine: '6.0L Twin-Turbo W12',
      drivetrain: 'AWD',
      horsepower: '650 hp',
      zeroToSixty: '3.5s',
      topSpeed: '208 mph',
    },
    numericSpecs: {
      horsepower: 650,
      zeroToSixtySec: 3.5,
      topSpeedMph: 208,
      mileageMi: 5300,
    },
    description: {
      en: 'The pinnacle of British grand touring craftsmanship with a 650 HP W12 engine and diamond-quilted Mulliner interior.',
      hy: 'Բրիտանական լյուքս դասի գագաթնակետը՝ 650 ձիաուժանոց W12 շարժիչով և ձեռագործ Mulliner կաշվե սրահով։',
    },
    availableColors: [
      { name: { en: 'Extreme Silver', hy: 'Արծաթագույն Մետալիկ' }, hex: '#cbd5e1' },
      { name: { en: 'Verdant Green', hy: 'Բրիտանական Կանաչ' }, hex: '#064e3b' },
      { name: { en: 'Sequin Blue', hy: 'Թագավորական Կապույտ' }, hex: '#1d4ed8' },
      { name: { en: 'Onyx Black', hy: 'Օնիքս Սև' }, hex: '#0f172a' },
    ],
  },
];
