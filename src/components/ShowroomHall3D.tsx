import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Box,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  Flame,
  Footprints,
  GitCompareArrows,
  Heart,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ShoppingBag,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { BRAND_META, DEVICES } from '../data/devices';
import {
  APPLIANCE_MODELS,
  APPLIANCE_SCENE_ITEMS,
  ApplianceCategoryId,
  getApplianceBasePriceUsd,
} from '../data/homeGuideData';
import { TRANSLATIONS } from '../data/i18n';
import { formatDevicePrice } from '../hooks/useLivePricing';
import { buildDeviceModel, DeviceRig } from '../three/buildDeviceModel';
import {
  ApplianceInteractiveState,
  BuiltApplianceRig,
  buildSingleAppliance,
  createArchitecturalWoodWallTextures,
  createStudioPlinthFloorTextures,
  updateApplianceRigAnimation,
} from '../three/buildHomeAppliances';
import {
  createContactShadowTexture,
  detectSoftwareWebGL,
  disposeObject3D,
} from '../three/webglUtils';
import {
  BrandId,
  Currency,
  DeviceSpec,
  Language,
  LivePriceEntry,
  PageRoute,
} from '../types/hardware';
import { LivePriceBadge } from './LivePriceBadge';
import { Product2DIllustration } from './Product2DIllustration';

export type HallSectionId = 'overview' | 'samsung' | 'apple' | 'huawei' | 'appliances';

export interface ShowroomHall3DProps {
  scrollProgress: number;
  activeSection?: HallSectionId;
  onSelectSection?: (section: HallSectionId) => void;
  onSelectDevice?: (device: DeviceSpec) => void;
  onSelectAppliance?: (category: ApplianceCategoryId) => void;
  onNavigate?: (route: PageRoute, deviceId?: string) => void;
  onCompareDevice?: (deviceId: string) => void;
  onOpenAR?: (device: DeviceSpec, finishId?: string) => void;
  onAddToCart?: (deviceId: string, finishId: string, storageId: string) => void;
  favorites?: string[];
  onToggleFavorite?: (deviceId: string) => void;
  priceAlerts?: Record<string, number>;
  onTogglePriceAlert?: (deviceId: string, targetUsd: number) => void;
  onRefreshPrice?: (deviceId: string) => void;
  onSkip3D?: () => void;
  darkMode: boolean;
  lang: Language;
  currency?: Currency;
  prices?: Record<string, LivePriceEntry>;
  fullScreen?: boolean;
}

interface HallDevicePlacement {
  deviceId: string;
  brand: BrandId;
  section: Exclude<HallSectionId, 'overview' | 'appliances'>;
  pos: [number, number, number];
  facingYaw: number; // orientation of the stand facing the center of the room
  standHeight: number;
  standStyle: 'slim-metal' | 'podium' | 'glass-plinth';
  modelScale: number;
  baseRot: [number, number, number];
  spotColor: number;
  phase: number;
}

interface HallAppliancePlacement {
  applianceCategory: ApplianceCategoryId;
  featuredBrand: string;
  featuredModel: { en: string; hy: string };
  pos: [number, number, number];
  facingYaw: number;
  plinthHeight: number;
  standStyle: 'appliance-plinth' | 'counter-plinth' | 'studio-desk';
  spotColor: number;
  accentHex: string;
  priceUsd: number;
  phase: number;
}

interface FloatingHallBadge {
  itemId: string;
  itemType: 'device' | 'appliance';
  brand: string;
  modelName: string;
  specSummary: string;
  section: Exclude<HallSectionId, 'overview'>;
  priceUsd: number;
  x: number;
  y: number;
  visible: boolean;
  distance: number;
}

// ===========================================================================
// GRAND 360° WALKABLE FLAGSHIP STORE PLACEMENTS (32m × 26m Hall — 4 Walls)
// Exclusively Phones, Foldables, Tablets, Laptops & Silicon Chips!
// (Home Appliances live in their own dedicated «Տուն 3D» hall)
// - North Wall (z = -10.4, facing South yaw = 0): Samsung Galaxy Flagships
// - East Wall (x = +12.6, facing West yaw = -Math.PI/2): Huawei Flagship Wing
// - West Wall (x = -12.6, facing East yaw = +Math.PI/2): Apple iPhone & M4 Silicon Wing
// - South Wall (z = +10.4, facing North yaw = Math.PI): Flagship Laptops Suite
// ===========================================================================
export const HALL_DEVICE_PLACEMENTS: HallDevicePlacement[] = [
  // NORTH WALL: SAMSUNG GALAXY FLAGSHIPS (z = -10.4, facing South yaw = 0)
  {
    deviceId: 'galaxy-s25-ultra',
    brand: 'samsung',
    section: 'samsung',
    pos: [-6.6, 0, -10.4],
    facingYaw: 0,
    standHeight: 1.04,
    standStyle: 'slim-metal',
    modelScale: 0.21,
    baseRot: [-0.06, 0.12, 0],
    spotColor: 0xdbeafe,
    phase: 0.0,
  },
  {
    deviceId: 'galaxy-s24-ultra',
    brand: 'samsung',
    section: 'samsung',
    pos: [-2.2, 0, -10.4],
    facingYaw: 0,
    standHeight: 1.02,
    standStyle: 'slim-metal',
    modelScale: 0.20,
    baseRot: [-0.06, 0.08, 0],
    spotColor: 0xdbeafe,
    phase: 0.7,
  },
  {
    deviceId: 'galaxy-z-fold6',
    brand: 'samsung',
    section: 'samsung',
    pos: [2.2, 0, -10.4],
    facingYaw: 0,
    standHeight: 1.0,
    standStyle: 'slim-metal',
    modelScale: 0.19,
    baseRot: [-0.06, -0.05, 0],
    spotColor: 0xe0f2fe,
    phase: 1.4,
  },
  {
    deviceId: 'galaxy-tab-s10-ultra',
    brand: 'samsung',
    section: 'samsung',
    pos: [6.6, 0, -10.4],
    facingYaw: 0,
    standHeight: 0.94,
    standStyle: 'podium',
    modelScale: 0.18,
    baseRot: [0.05, -0.08, 0],
    spotColor: 0xe0f2fe,
    phase: 2.1,
  },

  // WEST WALL: APPLE IPHONE & M4 MAX SILICON WING (x = -12.6, facing East yaw = Math.PI/2)
  {
    deviceId: 'iphone-16-pro-max',
    brand: 'apple',
    section: 'apple',
    pos: [-12.6, 0, -4.4],
    facingYaw: Math.PI / 2,
    standHeight: 1.04,
    standStyle: 'slim-metal',
    modelScale: 0.21,
    baseRot: [-0.06, 0.0, 0],
    spotColor: 0xffedd5,
    phase: 2.8,
  },
  {
    deviceId: 'iphone-16-pro',
    brand: 'apple',
    section: 'apple',
    pos: [-12.6, 0, 0.0],
    facingYaw: Math.PI / 2,
    standHeight: 1.02,
    standStyle: 'slim-metal',
    modelScale: 0.20,
    baseRot: [-0.06, 0.0, 0],
    spotColor: 0xffedd5,
    phase: 3.5,
  },
  {
    deviceId: 'apple-m4-max-soc',
    brand: 'apple',
    section: 'apple',
    pos: [-12.6, 0, 4.4],
    facingYaw: Math.PI / 2,
    standHeight: 1.0,
    standStyle: 'glass-plinth',
    modelScale: 0.26,
    baseRot: [0.42, 0.0, 0],
    spotColor: 0xfef3c7,
    phase: 4.2,
  },

  // EAST WALL: HUAWEI FLAGSHIP WING (x = +12.6, facing West yaw = -Math.PI/2)
  {
    deviceId: 'huawei-mate-70-pro-plus',
    brand: 'huawei',
    section: 'huawei',
    pos: [12.6, 0, -5.7],
    facingYaw: -Math.PI / 2,
    standHeight: 1.04,
    standStyle: 'slim-metal',
    modelScale: 0.21,
    baseRot: [-0.06, 0.0, 0],
    spotColor: 0xffedd5,
    phase: 4.9,
  },
  {
    deviceId: 'huawei-pura-70-ultra',
    brand: 'huawei',
    section: 'huawei',
    pos: [12.6, 0, -1.9],
    facingYaw: -Math.PI / 2,
    standHeight: 1.02,
    standStyle: 'slim-metal',
    modelScale: 0.20,
    baseRot: [-0.06, 0.0, 0],
    spotColor: 0xffe4e6,
    phase: 5.6,
  },
  {
    deviceId: 'huawei-mate-xt',
    brand: 'huawei',
    section: 'huawei',
    pos: [12.6, 0, 1.9],
    facingYaw: -Math.PI / 2,
    standHeight: 1.0,
    standStyle: 'slim-metal',
    modelScale: 0.19,
    baseRot: [-0.06, 0.0, 0],
    spotColor: 0xffedd5,
    phase: 6.3,
  },
  {
    deviceId: 'huawei-matepad-pro-13',
    brand: 'huawei',
    section: 'huawei',
    pos: [12.6, 0, 5.7],
    facingYaw: -Math.PI / 2,
    standHeight: 0.94,
    standStyle: 'podium',
    modelScale: 0.18,
    baseRot: [0.05, 0.0, 0],
    spotColor: 0xfef3c7,
    phase: 7.0,
  },

  // SOUTH WALL: WORKSTATION LAPTOPS SUITE (z = +10.4, facing North yaw = Math.PI)
  {
    deviceId: 'macbook-pro-16-m4max',
    brand: 'apple',
    section: 'apple',
    pos: [-6.6, 0, 10.4],
    facingYaw: Math.PI,
    standHeight: 0.92,
    standStyle: 'podium',
    modelScale: 0.18,
    baseRot: [0.05, 0.0, 0],
    spotColor: 0xffe4b8,
    phase: 7.7,
  },
  {
    deviceId: 'macbook-air-15-m3',
    brand: 'apple',
    section: 'apple',
    pos: [-2.2, 0, 10.4],
    facingYaw: Math.PI,
    standHeight: 0.92,
    standStyle: 'podium',
    modelScale: 0.17,
    baseRot: [0.05, 0.0, 0],
    spotColor: 0xfef3c7,
    phase: 8.4,
  },
  {
    deviceId: 'galaxy-book4-ultra',
    brand: 'samsung',
    section: 'samsung',
    pos: [2.2, 0, 10.4],
    facingYaw: Math.PI,
    standHeight: 0.92,
    standStyle: 'podium',
    modelScale: 0.18,
    baseRot: [0.05, 0.0, 0],
    spotColor: 0xffe8c8,
    phase: 9.1,
  },
  {
    deviceId: 'huawei-matebook-x-pro',
    brand: 'huawei',
    section: 'huawei',
    pos: [6.6, 0, 10.4],
    facingYaw: Math.PI,
    standHeight: 0.92,
    standStyle: 'podium',
    modelScale: 0.17,
    baseRot: [0.05, 0.0, 0],
    spotColor: 0xffe8c8,
    phase: 9.8,
  },
];

// Home & Major Appliances are in their own dedicated «Տուն 3D» Hall (HomeApartment3D.tsx)
export const HALL_APPLIANCE_PLACEMENTS: HallAppliancePlacement[] = [];

// Preset camera waypoints for the 32m × 26m hall
const SECTION_WAYPOINTS: Record<
  HallSectionId,
  { x: number; z: number; yaw: number; pitch: number }
> = {
  overview: { x: 0.0, z: 0.0, yaw: 0.0, pitch: -0.02 },
  samsung: { x: 0.0, z: -4.8, yaw: 0.0, pitch: -0.03 },
  apple: { x: -6.2, z: 0.0, yaw: -Math.PI / 2, pitch: -0.03 },
  huawei: { x: 6.2, z: 0.0, yaw: Math.PI / 2, pitch: -0.03 },
  appliances: { x: 0.0, z: 4.8, yaw: Math.PI, pitch: -0.03 },
};

function easeInOutCubic(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function createBaySignageTexture(
  indexStr: string,
  brandName: string,
  subtitle: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0d0b0c';
    ctx.fillRect(0, 0, 1024, 256);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 1008, 240);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${indexStr} // 360° PAVILION WING`, 48, 72);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 68px sans-serif';
    ctx.fillText(brandName.toUpperCase(), 48, 156);

    ctx.fillStyle = 'rgba(248, 250, 252, 0.68)';
    ctx.font = '500 25px monospace';
    ctx.fillText(subtitle, 48, 210);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createPlinthPlaqueTexture(
  brand: string,
  modelName: string,
  accentHex: string
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, 504, 120);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(brand.toUpperCase(), 256, 44);

    ctx.fillStyle = '#f5f2eb';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(modelName.slice(0, 26), 256, 90);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

// Stage 4: Subtle Film Grain + Architectural Vignette Final Shader Pass
const CINEMATIC_GRAIN_VIGNETTE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uGrainStrength: { value: 0.022 },
    uVignetteOffset: { value: 1.04 },
    uVignetteDarkness: { value: 0.38 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainStrength;
    uniform float uVignetteOffset;
    uniform float uVignetteDarkness;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(uVignetteOffset);
      float vig = clamp(1.0 - dot(uv, uv) * uVignetteDarkness, 0.0, 1.0);
      float noise = (rand(vUv + fract(uTime * 0.07)) - 0.5) * uGrainStrength;
      vec3 col = texel.rgb * vig + vec3(noise);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), texel.a);
    }
  `,
};

export const ShowroomHall3D: React.FC<ShowroomHall3DProps> = ({
  scrollProgress,
  activeSection = 'overview',
  onSelectSection,
  onSelectDevice,
  onSelectAppliance,
  onNavigate,
  onCompareDevice,
  onOpenAR,
  onAddToCart,
  favorites = [],
  onToggleFavorite,
  priceAlerts = {},
  onTogglePriceAlert,
  onRefreshPrice,
  onSkip3D,
  darkMode,
  lang,
  currency = 'USD',
  prices = {},
  fullScreen = true,
}) => {
  const t = TRANSLATIONS[lang];
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(12);
  const [webglError, setWebglError] = useState(false);
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(null);
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | null>(null);
  const [focusedApplianceCat, setFocusedApplianceCat] = useState<ApplianceCategoryId | null>(null);
  const [badges, setBadges] = useState<FloatingHallBadge[]>([]);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomFovOffset, setZoomFovOffset] = useState(0);
  const [postFxEnabled, setPostFxEnabled] = useState(true);
  const postFxEnabledRef = useRef(true);
  postFxEnabledRef.current = postFxEnabled;
  const [addedApplianceModelId, setAddedApplianceModelId] = useState<string | null>(null);

  // Interactive 3D states for the 6 Home Appliances inside the Hall
  const [applianceStates, setApplianceStates] = useState<
    Record<ApplianceCategoryId, ApplianceInteractiveState>
  >({
    refrigerator: { doorOpen: false, secondaryActive: true },
    gas_stove: { doorOpen: false, secondaryActive: true },
    microwave: { doorOpen: false, secondaryActive: true },
    washing_machine: { doorOpen: false, secondaryActive: true },
    dryer: { doorOpen: false, secondaryActive: true },
    laptop: { doorOpen: true, secondaryActive: true },
  });
  const applianceStatesRef = useRef(applianceStates);
  applianceStatesRef.current = applianceStates;

  const toggleAppliancePart = (
    cat: ApplianceCategoryId,
    part: 'doorOpen' | 'secondaryActive'
  ) => {
    setApplianceStates((prev) => ({
      ...prev,
      [cat]: {
        ...prev[cat],
        [part]: !prev[cat][part],
      },
    }));
  };

  // Detail Panel interactive states for the focused tech device (2D Image + Specs!)
  const focusedDevice = focusedDeviceId
    ? DEVICES.find((d) => d.id === focusedDeviceId) || null
    : null;
  const [finishId, setFinishId] = useState<string>('');
  const [storageId, setStorageId] = useState<string>('');
  const [justAdded, setJustAdded] = useState<boolean>(false);

  useEffect(() => {
    if (focusedDevice) {
      setFinishId(focusedDevice.finishes[0].id);
      setStorageId(focusedDevice.storageOptions[0].id);
    }
  }, [focusedDevice?.id]);

  useEffect(() => {
    if (focusedDeviceId || focusedApplianceCat || isFullscreen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [focusedDeviceId, focusedApplianceCat, isFullscreen]);

  useEffect(() => {
    const onFsChange = () => {
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    try {
      if (next && wrapperRef.current && wrapperRef.current.requestFullscreen) {
        wrapperRef.current.requestFullscreen().catch(() => {});
      } else if (!next && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch {
      // ignore
    }
    setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
  };

  // =========================================================================
  // 1ST-PERSON 360° FREE WALKING STATE REFS (Position X/Z + 360° Yaw/Pitch)
  // =========================================================================
  const playerTargetPosRef = useRef<{ x: number; z: number }>({
    x: SECTION_WAYPOINTS.overview.x,
    z: SECTION_WAYPOINTS.overview.z,
  });
  const playerSmoothPosRef = useRef<{ x: number; z: number }>({
    x: SECTION_WAYPOINTS.overview.x,
    z: SECTION_WAYPOINTS.overview.z,
  });
  const playerTargetYawRef = useRef<number>(SECTION_WAYPOINTS.overview.yaw);
  const playerSmoothYawRef = useRef<number>(SECTION_WAYPOINTS.overview.yaw);
  const playerTargetPitchRef = useRef<number>(SECTION_WAYPOINTS.overview.pitch);
  const playerSmoothPitchRef = useRef<number>(SECTION_WAYPOINTS.overview.pitch);

  const activeWalkInputsRef = useRef<{
    forward: boolean;
    backward: boolean;
    strafeLeft: boolean;
    strafeRight: boolean;
    turnLeft: boolean;
    turnRight: boolean;
  }>({
    forward: false,
    backward: false,
    strafeLeft: false,
    strafeRight: false,
    turnLeft: false,
    turnRight: false,
  });

  const isFullscreenRef = useRef<boolean>(false);
  isFullscreenRef.current = isFullscreen;
  const zoomFovOffsetRef = useRef<number>(0);
  zoomFovOffsetRef.current = zoomFovOffset;
  const hoveredItemIdRef = useRef<string | null>(null);
  const focusedDeviceIdRef = useRef<string | null>(null);
  const focusedApplianceCatRef = useRef<ApplianceCategoryId | null>(null);
  const reducedMotionRef = useRef<boolean>(false);

  // Click-to-Fly Camera Transition Refs
  const flyModeRef = useRef<'hall' | 'flying-in' | 'focused' | 'flying-back'>('hall');
  const flyAnimTRef = useRef<number>(0);
  const flyStartPosRef = useRef(new THREE.Vector3());
  const flyStartTargetRef = useRef(new THREE.Vector3());
  const flyGoalPosRef = useRef(new THREE.Vector3());
  const flyGoalTargetRef = useRef(new THREE.Vector3());
  const currentCamPosRef = useRef(new THREE.Vector3());
  const currentLookTargetRef = useRef(new THREE.Vector3());

  // Normalize angle delta so 360° yaw transitions take the shortest turn path
  const setShortestYawTarget = (nextYaw: number) => {
    const current = playerSmoothYawRef.current;
    let diff = ((nextYaw - current + Math.PI) % (Math.PI * 2)) - Math.PI;
    if (diff < -Math.PI) diff += Math.PI * 2;
    playerTargetYawRef.current = current + diff;
  };

  // Teleport / Walk to a specific section wing when section pill is clicked
  const walkToSection = (sec: HallSectionId) => {
    if (focusedDeviceIdRef.current || focusedApplianceCatRef.current) {
      handleBackToHall();
    }
    const wp = SECTION_WAYPOINTS[sec] || SECTION_WAYPOINTS.overview;
    playerTargetPosRef.current = { x: wp.x, z: wp.z };
    setShortestYawTarget(wp.yaw);
    playerTargetPitchRef.current = wp.pitch;
    onSelectSection?.(sec);
  };

  // Sync external scrollProgress only if user hasn't manually walked away or when scrolling between major sections
  const lastScrollRef = useRef<number>(scrollProgress);
  useEffect(() => {
    const delta = Math.abs(scrollProgress - lastScrollRef.current);
    lastScrollRef.current = scrollProgress;
    if (delta < 0.005) return;
    if (focusedDeviceIdRef.current || focusedApplianceCatRef.current) return;

    // Smoothly rotate 360° around the 4 wings as user scrolls down the page
    const angle = scrollProgress * Math.PI * 1.65;
    playerTargetYawRef.current = -angle;
    playerTargetPosRef.current = {
      x: Math.sin(-angle) * 2.2,
      z: -Math.cos(-angle) * 2.2,
    };
  }, [scrollProgress]);

  const stepWalkForward = (dist: number) => {
    const yaw = playerSmoothYawRef.current;
    const nx = playerTargetPosRef.current.x + Math.sin(yaw) * dist;
    const nz = playerTargetPosRef.current.z - Math.cos(yaw) * dist;
    playerTargetPosRef.current.x = THREE.MathUtils.clamp(nx, -10.8, 10.8);
    playerTargetPosRef.current.z = THREE.MathUtils.clamp(nz, -8.8, 8.8);
  };

  const stepTurnYaw = (deltaRad: number) => {
    playerTargetYawRef.current += deltaRad;
  };

  const handleZoom = (delta: number) => {
    setZoomFovOffset((prev) => Math.max(-16, Math.min(12, prev + delta)));
  };

  const triggerFlyToDevice = (deviceId: string) => {
    const placementIndex = HALL_DEVICE_PLACEMENTS.findIndex((p) => p.deviceId === deviceId);
    const placement = HALL_DEVICE_PLACEMENTS[placementIndex];
    const spec = DEVICES.find((d) => d.id === deviceId);
    if (!placement || !spec) return;

    const baseY =
      placement.standHeight +
      (spec.category === 'laptop' ? 0.09 : spec.category === 'chip' ? 0.22 : 0.36);

    flyStartPosRef.current.copy(currentCamPosRef.current);
    flyStartTargetRef.current.copy(currentLookTargetRef.current);

    // Compute camera position in front of the stand along its facing normal
    const normalX = Math.sin(placement.facingYaw);
    const normalZ = Math.cos(placement.facingYaw);
    const rightX = Math.cos(placement.facingYaw);
    const rightZ = -Math.sin(placement.facingYaw);
    const isDesktop = window.innerWidth >= 1024;
    const sideShift = isDesktop ? 0.26 : 0.0;

    flyGoalPosRef.current.set(
      placement.pos[0] + normalX * 1.05 + rightX * sideShift,
      0.1 + baseY + 0.06,
      placement.pos[2] + normalZ * 1.05 + rightZ * sideShift
    );
    flyGoalTargetRef.current.set(
      placement.pos[0] + rightX * (sideShift * 0.55),
      0.1 + baseY + 0.02,
      placement.pos[2] + rightZ * (sideShift * 0.55)
    );

    // Update player position near this stand so returning to hall keeps you right here!
    playerTargetPosRef.current = {
      x: THREE.MathUtils.clamp(placement.pos[0] + normalX * 2.4, -10.8, 10.8),
      z: THREE.MathUtils.clamp(placement.pos[2] + normalZ * 2.4, -8.8, 8.8),
    };
    playerSmoothPosRef.current = { ...playerTargetPosRef.current };
    setShortestYawTarget(placement.facingYaw);

    flyAnimTRef.current = 0;
    flyModeRef.current = 'flying-in';
    focusedApplianceCatRef.current = null;
    setFocusedApplianceCat(null);
    focusedDeviceIdRef.current = deviceId;
    setFocusedDeviceId(deviceId);
  };

  const triggerFlyToAppliance = (category: ApplianceCategoryId) => {
    const appIdx = HALL_APPLIANCE_PLACEMENTS.findIndex(
      (p) => p.applianceCategory === category
    );
    const placement = HALL_APPLIANCE_PLACEMENTS[appIdx];
    if (!placement) return;

    flyStartPosRef.current.copy(currentCamPosRef.current);
    flyStartTargetRef.current.copy(currentLookTargetRef.current);

    const normalX = Math.sin(placement.facingYaw);
    const normalZ = Math.cos(placement.facingYaw);
    const rightX = Math.cos(placement.facingYaw);
    const rightZ = -Math.sin(placement.facingYaw);
    const isDesktop = window.innerWidth >= 1024;
    const sideShift = isDesktop ? 0.42 : 0.0;

    const targetY =
      category === 'refrigerator'
        ? 1.08
        : category === 'microwave'
          ? 1.16
          : category === 'laptop'
            ? 1.05
            : 0.72;
    const camDist = category === 'refrigerator' ? 1.95 : 1.62;

    flyGoalPosRef.current.set(
      placement.pos[0] + normalX * camDist + rightX * sideShift,
      targetY + 0.18,
      placement.pos[2] + normalZ * camDist + rightZ * sideShift
    );
    flyGoalTargetRef.current.set(
      placement.pos[0] + rightX * (sideShift * 0.55),
      targetY,
      placement.pos[2] + rightZ * (sideShift * 0.55)
    );

    playerTargetPosRef.current = {
      x: THREE.MathUtils.clamp(placement.pos[0] + normalX * 2.6, -6.8, 6.8),
      z: THREE.MathUtils.clamp(placement.pos[2] + normalZ * 2.6, -5.8, 5.8),
    };
    playerSmoothPosRef.current = { ...playerTargetPosRef.current };
    setShortestYawTarget(placement.facingYaw);

    flyAnimTRef.current = 0;
    flyModeRef.current = 'flying-in';
    focusedDeviceIdRef.current = null;
    setFocusedDeviceId(null);
    focusedApplianceCatRef.current = category;
    setFocusedApplianceCat(category);
  };

  const switchFocusedDevice = (step: -1 | 1) => {
    if (focusedDeviceIdRef.current) {
      const idx = HALL_DEVICE_PLACEMENTS.findIndex(
        (p) => p.deviceId === focusedDeviceIdRef.current
      );
      if (idx === -1) return;
      const nextIdx =
        (idx + step + HALL_DEVICE_PLACEMENTS.length) % HALL_DEVICE_PLACEMENTS.length;
      triggerFlyToDevice(HALL_DEVICE_PLACEMENTS[nextIdx].deviceId);
    } else if (focusedApplianceCatRef.current) {
      const idx = HALL_APPLIANCE_PLACEMENTS.findIndex(
        (p) => p.applianceCategory === focusedApplianceCatRef.current
      );
      if (idx === -1) return;
      const nextIdx =
        (idx + step + HALL_APPLIANCE_PLACEMENTS.length) % HALL_APPLIANCE_PLACEMENTS.length;
      triggerFlyToAppliance(HALL_APPLIANCE_PLACEMENTS[nextIdx].applianceCategory);
    }
  };

  const handleBackToHall = () => {
    if (!focusedDeviceIdRef.current && !focusedApplianceCatRef.current) return;
    flyStartPosRef.current.copy(currentCamPosRef.current);
    flyStartTargetRef.current.copy(currentLookTargetRef.current);

    const yaw = playerSmoothYawRef.current;
    const pitch = playerSmoothPitchRef.current;
    flyGoalPosRef.current.set(
      playerSmoothPosRef.current.x,
      1.62,
      playerSmoothPosRef.current.z
    );
    flyGoalTargetRef.current.set(
      playerSmoothPosRef.current.x + Math.sin(yaw) * Math.cos(pitch) * 4.0,
      1.62 + Math.sin(pitch) * 4.0,
      playerSmoothPosRef.current.z - Math.cos(yaw) * Math.cos(pitch) * 4.0
    );

    flyAnimTRef.current = 0;
    flyModeRef.current = 'flying-back';
    focusedDeviceIdRef.current = null;
    focusedApplianceCatRef.current = null;
    setFocusedDeviceId(null);
    setFocusedApplianceCat(null);
  };

  // Continuous 1st-Person Keyboard Walking (WASD + Arrow Keys + Q/E Turn)
  useEffect(() => {
    const isInputFocused = () => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      return tag === 'input' || tag === 'textarea' || tag === 'select';
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (isInputFocused()) return;
      if (e.key === 'Escape') {
        if (focusedDeviceId || focusedApplianceCat) {
          handleBackToHall();
          return;
        }
        if (isFullscreen) {
          setIsFullscreen(false);
          if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
          setTimeout(() => window.dispatchEvent(new Event('resize')), 60);
          return;
        }
      }
      if (focusedDeviceId || focusedApplianceCat) {
        if (e.key === 'ArrowRight') switchFocusedDevice(1);
        else if (e.key === 'ArrowLeft') switchFocusedDevice(-1);
        return;
      }

      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') {
        activeWalkInputsRef.current.forward = true;
      } else if (k === 's' || e.key === 'ArrowDown') {
        activeWalkInputsRef.current.backward = true;
      } else if (k === 'a') {
        activeWalkInputsRef.current.strafeLeft = true;
      } else if (k === 'd') {
        activeWalkInputsRef.current.strafeRight = true;
      } else if (e.key === 'ArrowLeft' || k === 'q') {
        activeWalkInputsRef.current.turnLeft = true;
      } else if (e.key === 'ArrowRight' || k === 'e') {
        activeWalkInputsRef.current.turnRight = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || e.key === 'ArrowUp') {
        activeWalkInputsRef.current.forward = false;
      } else if (k === 's' || e.key === 'ArrowDown') {
        activeWalkInputsRef.current.backward = false;
      } else if (k === 'a') {
        activeWalkInputsRef.current.strafeLeft = false;
      } else if (k === 'd') {
        activeWalkInputsRef.current.strafeRight = false;
      } else if (e.key === 'ArrowLeft' || k === 'q') {
        activeWalkInputsRef.current.turnLeft = false;
      } else if (e.key === 'ArrowRight' || k === 'e') {
        activeWalkInputsRef.current.turnRight = false;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [focusedDeviceId, focusedApplianceCat, isFullscreen]);

  const triggerFlyToDeviceRef = useRef(triggerFlyToDevice);
  triggerFlyToDeviceRef.current = triggerFlyToDevice;
  const triggerFlyToApplianceRef = useRef(triggerFlyToAppliance);
  triggerFlyToApplianceRef.current = triggerFlyToAppliance;

  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setReducedMotion(mq.matches);
      reducedMotionRef.current = mq.matches;
      const onChange = (e: MediaQueryListEvent) => {
        setReducedMotion(e.matches);
        reducedMotionRef.current = e.matches;
      };
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      return;
    }
  }, []);

  // =========================================================================
  // MAIN THREE.JS 360° STORE SCENE EFFECT
  // =========================================================================
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envTarget: THREE.WebGLRenderTarget | null = null;
    let floorReflector: Reflector | null = null;
    let composer: EffectComposer | null = null;
    let filmGrainPass: ShaderPass | null = null;
    let animId = 0;

    setLoading(true);
    setLoadProgress(20);

    try {
      const w = Math.max(container.clientWidth, 300);
      const h = Math.max(container.clientHeight, 360);
      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      const isSoftwareGl = detectSoftwareWebGL();

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = darkMode ? 0.98 : 1.08;

      const maxDpr = isSoftwareGl ? 1 : isMobile ? 1.5 : 2;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(w, h);
      renderer.shadowMap.enabled = !isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const onContextLost = (e: Event) => {
        e.preventDefault();
        cancelAnimationFrame(animId);
      };
      const onContextRestored = () => {
        setWebglError(false);
      };
      renderer.domElement.addEventListener('webglcontextlost', onContextLost);
      renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      setLoadProgress(45);

      const scene = new THREE.Scene();
      const bgHex = darkMode ? 0x080709 : 0x121012;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, 0.032);

      pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = darkMode ? 0.46 : 0.56;

      const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 65);
      camera.position.set(
        playerSmoothPosRef.current.x,
        1.62,
        playerSmoothPosRef.current.z
      );

      // =======================================================================
      // 360° ARCHITECTURAL STORE GEOMETRY (4 Perimeter Slatted Wood Walls + Center Lounge)
      // =======================================================================
      const hallGroup = new THREE.Group();
      scene.add(hallGroup);

      const { map: wallMap, normalMap: wallNormal } =
        createArchitecturalWoodWallTextures(darkMode);
      wallMap.repeat.set(16, 1);
      wallNormal.repeat.set(16, 1);

      const { map: floorMap, normalMap: floorNormal } =
        createStudioPlinthFloorTextures(darkMode);
      floorMap.repeat.set(16, 16);
      floorNormal.repeat.set(16, 16);

      const slatWallMat = new THREE.MeshStandardMaterial({
        map: wallMap,
        normalMap: wallNormal,
        normalScale: new THREE.Vector2(0.55, 0.55),
        roughness: 0.64,
        metalness: 0.06,
      });

      const darkCeilingMat = new THREE.MeshStandardMaterial({
        color: darkMode ? 0x0b0a0c : 0x151314,
        roughness: 0.82,
        metalness: 0.08,
      });

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd49b4b,
        metalness: 0.92,
        roughness: 0.2,
      });

      const darkSteelMat = new THREE.MeshPhysicalMaterial({
        color: 0x1a1c22,
        metalness: 0.84,
        roughness: 0.26,
        clearcoat: 0.3,
        clearcoatRoughness: 0.22,
      });

      const walnutMat = new THREE.MeshStandardMaterial({
        color: 0x3b2618,
        roughness: 0.42,
        metalness: 0.06,
      });

      const crimsonPlinthMat = new THREE.MeshStandardMaterial({
        color: darkMode ? 0x3b1217 : 0x4c181f,
        roughness: 0.52,
        metalness: 0.08,
      });

      const glassPlinthMat = new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.05,
        roughness: 0.05,
        transmission: 0.84,
        ior: 1.52,
        thickness: 0.35,
        transparent: true,
        opacity: 0.88,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
      });

      const roomW = 32.0;
      const roomD = 26.0;
      const roomH = 4.2;

      // 1. Polished Dark Floor with Soft Reflections
      if (!isSoftwareGl) {
        const reflGeo = new THREE.PlaneGeometry(roomW, roomD);
        floorReflector = new Reflector(reflGeo, {
          clipBias: 0.003,
          textureWidth: Math.min(512, Math.floor(w * 0.5)),
          textureHeight: Math.min(512, Math.floor(h * 0.5)),
          color: darkMode ? 0x161415 : 0x201c1a,
        });
        floorReflector.rotation.x = -Math.PI / 2;
        floorReflector.position.set(0, 0.0, 0);
        hallGroup.add(floorReflector);
      }

      const floorOverlayMat = new THREE.MeshPhysicalMaterial({
        map: floorMap,
        normalMap: floorNormal,
        normalScale: new THREE.Vector2(0.28, 0.28),
        roughness: 0.34,
        metalness: 0.1,
        clearcoat: 0.42,
        clearcoatRoughness: 0.28,
        transparent: !isSoftwareGl,
        opacity: isSoftwareGl ? 1.0 : 0.82,
      });
      const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(roomW, roomD),
        floorOverlayMat
      );
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, 0.003, 0);
      floorMesh.receiveShadow = true;
      hallGroup.add(floorMesh);

      // Golden Floor Walk Target Ring (appears when hovering floor to walk)
      const walkRingGroup = new THREE.Group();
      walkRingGroup.position.set(0, 0.015, 0);
      walkRingGroup.visible = false;
      const outerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.28, 32),
        new THREE.MeshBasicMaterial({
          color: 0xe5a952,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        })
      );
      outerRing.rotation.x = -Math.PI / 2;
      walkRingGroup.add(outerRing);
      const innerDot = new THREE.Mesh(
        new THREE.CircleGeometry(0.06, 20),
        new THREE.MeshBasicMaterial({
          color: 0xffe4b8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
        })
      );
      innerDot.rotation.x = -Math.PI / 2;
      walkRingGroup.add(innerDot);
      hallGroup.add(walkRingGroup);

      // 4 Perimeter Crimson Stage Decks (North, South, West, East)
      const northStage = new THREE.Mesh(
        new RoundedBoxGeometry(24.0, 0.1, 2.5, 3, 0.015),
        crimsonPlinthMat
      );
      northStage.position.set(0, 0.05, -10.5);
      northStage.receiveShadow = true;
      hallGroup.add(northStage);

      const southStage = new THREE.Mesh(
        new RoundedBoxGeometry(24.0, 0.1, 2.5, 3, 0.015),
        crimsonPlinthMat
      );
      southStage.position.set(0, 0.05, 10.5);
      southStage.receiveShadow = true;
      hallGroup.add(southStage);

      const westStage = new THREE.Mesh(
        new RoundedBoxGeometry(2.5, 0.1, 18.5, 3, 0.015),
        crimsonPlinthMat
      );
      westStage.position.set(-12.8, 0.05, 0);
      westStage.receiveShadow = true;
      hallGroup.add(westStage);

      const eastStage = new THREE.Mesh(
        new RoundedBoxGeometry(2.5, 0.1, 18.5, 3, 0.015),
        crimsonPlinthMat
      );
      eastStage.position.set(12.8, 0.05, 0);
      eastStage.receiveShadow = true;
      hallGroup.add(eastStage);

      // 4 Perimeter Vertical Wood-Slatted Walls
      const northWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomW, roomH, 0.24),
        slatWallMat
      );
      northWall.position.set(0, roomH / 2, -12.2);
      northWall.receiveShadow = true;
      hallGroup.add(northWall);

      const southWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomW, roomH, 0.24),
        slatWallMat
      );
      southWall.position.set(0, roomH / 2, 12.2);
      southWall.receiveShadow = true;
      hallGroup.add(southWall);

      const westWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, roomH, roomD),
        slatWallMat
      );
      westWall.position.set(-14.2, roomH / 2, 0);
      westWall.receiveShadow = true;
      hallGroup.add(westWall);

      const eastWall = new THREE.Mesh(
        new THREE.BoxGeometry(0.24, roomH, roomD),
        slatWallMat
      );
      eastWall.position.set(14.2, roomH / 2, 0);
      eastWall.receiveShadow = true;
      hallGroup.add(eastWall);

      const ceiling = new THREE.Mesh(
        new THREE.BoxGeometry(roomW, 0.16, roomD),
        darkCeilingMat
      );
      ceiling.position.set(0, roomH, 0);
      hallGroup.add(ceiling);

      // Warm Ceiling Light Strips Grid (subtle emissive so HDR FX has zero harsh glare in center)
      const warmStripMat = new THREE.MeshStandardMaterial({
        color: 0xffebd0,
        emissive: new THREE.Color(0xdba25e),
        emissiveIntensity: 0.65,
        roughness: 0.35,
      });

      for (const stripZ of [-8.4, -3.4, 3.4, 8.4]) {
        const stripMesh = new THREE.Mesh(
          new THREE.BoxGeometry(24.0, 0.025, 0.05),
          warmStripMat
        );
        stripMesh.position.set(0, roomH - 0.09, stripZ);
        hallGroup.add(stripMesh);
      }

      // 4 Wall Header Signage Plaques (North, West, East, South — strictly Tech Devices!)
      const wallSigns: Array<{
        pos: [number, number, number];
        rotY: number;
        indexStr: string;
        brand: string;
        sub: string;
        accent: string;
      }> = [
        {
          pos: [0, 3.05, -12.04],
          rotY: 0,
          indexStr: '01',
          brand: 'Samsung Galaxy Wing',
          sub: 'GALAXY S25 ULTRA · S25+ · Z FOLD6 · Z FLIP6 · TAB S10 ULTRA',
          accent: BRAND_META.samsung.accentHex,
        },
        {
          pos: [-14.04, 3.05, 0],
          rotY: Math.PI / 2,
          indexStr: '02',
          brand: 'Apple iPhone & M4 Silicon',
          sub: 'IPHONE 16 PRO MAX · 16 PRO · 16 PLUS · APPLE M4 MAX CHIP',
          accent: BRAND_META.apple.accentHex,
        },
        {
          pos: [14.04, 3.05, 0],
          rotY: -Math.PI / 2,
          indexStr: '03',
          brand: 'Huawei Flagship Wing',
          sub: 'MATE 70 PRO+ · PURA 70 ULTRA · MATE XT TRIFOLD',
          accent: BRAND_META.huawei.accentHex,
        },
        {
          pos: [0, 3.05, 12.04],
          rotY: Math.PI,
          indexStr: '04',
          brand: 'Flagship Laptops & Workstations',
          sub: 'MACBOOK PRO 16 M4 MAX · MACBOOK AIR 15 · GALAXY BOOK4 ULTRA · MATEBOOK X PRO',
          accent: '#E5A952',
        },
      ];

      for (const wSign of wallSigns) {
        const signTex = createBaySignageTexture(
          wSign.indexStr,
          wSign.brand,
          wSign.sub,
          wSign.accent
        );
        const signBoard = new THREE.Mesh(
          new THREE.PlaneGeometry(4.2, 0.96),
          new THREE.MeshBasicMaterial({ map: signTex })
        );
        signBoard.position.set(...wSign.pos);
        signBoard.rotation.y = wSign.rotY;
        hallGroup.add(signBoard);
      }

      // Ambient & Key Hall Lighting
      const hemiLight = new THREE.HemisphereLight(0xffe8cc, 0x121016, 0.42);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xfff1dc, 0.52);
      dirLight.position.set(3.5, 7.0, 4.5);
      if (!isSoftwareGl) {
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 30;
        const d = 13.0;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
      }
      scene.add(dirLight);

      setLoadProgress(68);

      // =======================================================================
      // BUILD PRODUCT STANDS AROUND ALL 4 WALLS (15 TECH + 6 HOME APPLIANCES)
      // =======================================================================
      const contactShadowTex = createContactShadowTexture();
      const hitBoxProxies: THREE.Mesh[] = [];
      const hitBoxMat = new THREE.MeshBasicMaterial({
        visible: false,
      });

      interface SpawnedHallDeviceItem {
        placement: HallDevicePlacement;
        spec: DeviceSpec;
        rig: DeviceRig;
        modelPivot: THREE.Group;
        baseY: number;
        spotLight: THREE.SpotLight;
        coneMesh: THREE.Mesh;
        ringMat: THREE.MeshStandardMaterial;
        labelAnchorWorld: THREE.Vector3;
      }

      interface SpawnedHallApplianceItem {
        placement: HallAppliancePlacement;
        rig: BuiltApplianceRig;
        modelPivot: THREE.Group;
        baseY: number;
        spotLight: THREE.SpotLight;
        coneMesh: THREE.Mesh;
        ringMat: THREE.MeshStandardMaterial;
        labelAnchorWorld: THREE.Vector3;
      }

      const spawnedDevices: SpawnedHallDeviceItem[] = [];
      const spawnedAppliances: SpawnedHallApplianceItem[] = [];

      // 1. Spawn the 15 Flagship Tech Devices
      for (const item of HALL_DEVICE_PLACEMENTS) {
        const spec = DEVICES.find((d) => d.id === item.deviceId);
        if (!spec) continue;

        const standGroup = new THREE.Group();
        standGroup.position.set(item.pos[0], 0.1, item.pos[2]);
        standGroup.rotation.y = item.facingYaw;
        hallGroup.add(standGroup);

        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(1.12, 1.12),
          new THREE.MeshBasicMaterial({
            map: contactShadowTex,
            transparent: true,
            opacity: 0.72,
            depthWrite: false,
          })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.004;
        standGroup.add(shadowPlane);

        const ringMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(spec.finishes[0].accentHex),
          emissive: new THREE.Color(spec.finishes[0].accentHex),
          emissiveIntensity: 0.7,
          roughness: 0.2,
          metalness: 0.8,
        });

        if (item.standStyle === 'slim-metal') {
          const baseFoot = new THREE.Mesh(
            new RoundedBoxGeometry(0.66, 0.045, 0.66, 3, 0.012),
            darkSteelMat
          );
          baseFoot.position.y = 0.022;
          baseFoot.receiveShadow = true;
          standGroup.add(baseFoot);

          const stem = new THREE.Mesh(
            new THREE.CylinderGeometry(0.052, 0.068, item.standHeight - 0.08, 24),
            darkSteelMat
          );
          stem.position.y = item.standHeight / 2;
          stem.castShadow = !isSoftwareGl;
          standGroup.add(stem);

          const topPlate = new THREE.Mesh(
            new RoundedBoxGeometry(0.74, 0.05, 0.62, 4, 0.014),
            darkSteelMat
          );
          topPlate.position.y = item.standHeight - 0.02;
          topPlate.receiveShadow = true;
          standGroup.add(topPlate);

          const topTrim = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 0.016, 0.63),
            ringMat
          );
          topTrim.position.y = item.standHeight + 0.005;
          standGroup.add(topTrim);
        } else if (item.standStyle === 'podium') {
          const podiumCol = new THREE.Mesh(
            new RoundedBoxGeometry(1.08, item.standHeight, 0.8, 4, 0.024),
            darkSteelMat
          );
          podiumCol.position.y = item.standHeight / 2;
          podiumCol.castShadow = !isSoftwareGl;
          podiumCol.receiveShadow = true;
          standGroup.add(podiumCol);

          const brassBand = new THREE.Mesh(
            new THREE.BoxGeometry(1.09, 0.02, 0.81),
            ringMat
          );
          brassBand.position.y = item.standHeight - 0.02;
          standGroup.add(brassBand);
        } else {
          const plinthBase = new THREE.Mesh(
            new RoundedBoxGeometry(0.84, 0.16, 0.84, 4, 0.018),
            darkSteelMat
          );
          plinthBase.position.y = 0.08;
          standGroup.add(plinthBase);

          const glassColumn = new THREE.Mesh(
            new RoundedBoxGeometry(0.76, item.standHeight - 0.22, 0.76, 4, 0.022),
            glassPlinthMat
          );
          glassColumn.position.y = 0.16 + (item.standHeight - 0.22) / 2;
          standGroup.add(glassColumn);

          const innerCore = new THREE.Mesh(
            new THREE.CylinderGeometry(0.22, 0.22, 0.035, 28),
            ringMat
          );
          innerCore.position.y = item.standHeight - 0.05;
          standGroup.add(innerCore);

          const brassCap = new THREE.Mesh(
            new THREE.BoxGeometry(0.78, 0.024, 0.78),
            brassMat
          );
          brassCap.position.y = item.standHeight - 0.02;
          standGroup.add(brassCap);
        }

        const plaqueTex = createPlinthPlaqueTexture(
          spec.brand,
          spec.name.replace('Samsung ', '').replace('Apple ', '').replace('Huawei ', ''),
          spec.finishes[0].accentHex
        );
        const plaqueMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.54, 0.135),
          new THREE.MeshBasicMaterial({ map: plaqueTex })
        );
        plaqueMesh.position.set(
          0,
          item.standHeight * 0.68,
          item.standStyle === 'podium' ? 0.41 : 0.34
        );
        standGroup.add(plaqueMesh);

        const rig = buildDeviceModel(spec, spec.finishes[0], isSoftwareGl ? 1 : 4);
        rig.applyKinematics(0, 112, 138, true);

        const modelPivot = new THREE.Group();
        const baseY =
          item.standHeight +
          (spec.category === 'laptop' ? 0.09 : spec.category === 'chip' ? 0.22 : 0.36);
        modelPivot.position.set(0, baseY, 0);
        modelPivot.rotation.set(...item.baseRot);
        rig.root.scale.setScalar(item.modelScale);
        modelPivot.add(rig.root);
        standGroup.add(modelPivot);

        const proxyBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.15, item.standHeight + 1.15, 1.05),
          hitBoxMat
        );
        proxyBox.position.set(0, (item.standHeight + 1.15) / 2, 0);
        proxyBox.userData.hallDeviceId = spec.id;
        standGroup.add(proxyBox);
        hitBoxProxies.push(proxyBox);

        const normalX = Math.sin(item.facingYaw);
        const normalZ = Math.cos(item.facingYaw);
        const spotLight = new THREE.SpotLight(
          item.spotColor,
          3.4,
          7.8,
          Math.PI / 4.5,
          0.78,
          1.25
        );
        spotLight.position.set(
          item.pos[0] + normalX * 0.45,
          2.95,
          item.pos[2] + normalZ * 0.45
        );
        spotLight.target.position.set(item.pos[0], 0.1 + baseY, item.pos[2]);
        scene.add(spotLight);
        scene.add(spotLight.target);

        const coneGeo = new THREE.ConeGeometry(0.75, 2.25, 24, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
          color: item.spotColor,
          transparent: true,
          opacity: 0.025,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(0, 1.56, 0.2);
        coneMesh.rotation.x = -0.18;
        coneMesh.raycast = () => {};
        standGroup.add(coneMesh);

        const labelAnchorWorld = new THREE.Vector3(
          item.pos[0],
          0.1 + baseY + (spec.category === 'laptop' ? 0.36 : 0.42),
          item.pos[2]
        );

        spawnedDevices.push({
          placement: item,
          spec,
          rig,
          modelPivot,
          baseY,
          spotLight,
          coneMesh,
          ringMat,
          labelAnchorWorld,
        });
      }

      setLoadProgress(85);

      // 2. Spawn the 6 Home & Major Appliances on the South Wall
      for (const appItem of HALL_APPLIANCE_PLACEMENTS) {
        const sceneMeta = APPLIANCE_SCENE_ITEMS.find(
          (s) => s.id === appItem.applianceCategory
        );
        const standGroup = new THREE.Group();
        standGroup.position.set(appItem.pos[0], 0.1, appItem.pos[2]);
        standGroup.rotation.y = appItem.facingYaw;
        hallGroup.add(standGroup);

        const shadowPlane = new THREE.Mesh(
          new THREE.PlaneGeometry(1.35, 1.25),
          new THREE.MeshBasicMaterial({
            map: contactShadowTex,
            transparent: true,
            opacity: 0.78,
            depthWrite: false,
          })
        );
        shadowPlane.rotation.x = -Math.PI / 2;
        shadowPlane.position.y = 0.004;
        standGroup.add(shadowPlane);

        const ringMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(appItem.accentHex),
          emissive: new THREE.Color(appItem.accentHex),
          emissiveIntensity: 0.75,
          roughness: 0.22,
          metalness: 0.82,
        });

        if (appItem.standStyle === 'appliance-plinth') {
          const plinth = new THREE.Mesh(
            new RoundedBoxGeometry(1.06, appItem.plinthHeight, 0.92, 4, 0.018),
            darkSteelMat
          );
          plinth.position.y = appItem.plinthHeight / 2;
          plinth.receiveShadow = true;
          standGroup.add(plinth);

          const rim = new THREE.Mesh(
            new THREE.BoxGeometry(1.08, 0.018, 0.94),
            ringMat
          );
          rim.position.y = appItem.plinthHeight;
          standGroup.add(rim);
        } else if (appItem.standStyle === 'counter-plinth') {
          const counterCol = new THREE.Mesh(
            new RoundedBoxGeometry(0.92, appItem.plinthHeight, 0.74, 4, 0.022),
            darkSteelMat
          );
          counterCol.position.y = appItem.plinthHeight / 2;
          counterCol.castShadow = !isSoftwareGl;
          counterCol.receiveShadow = true;
          standGroup.add(counterCol);

          const walnutTop = new THREE.Mesh(
            new RoundedBoxGeometry(0.96, 0.04, 0.78, 3, 0.01),
            walnutMat
          );
          walnutTop.position.y = appItem.plinthHeight;
          standGroup.add(walnutTop);

          const rim = new THREE.Mesh(
            new THREE.BoxGeometry(0.97, 0.016, 0.79),
            ringMat
          );
          rim.position.y = appItem.plinthHeight + 0.02;
          standGroup.add(rim);
        } else {
          const deskTop = new THREE.Mesh(
            new RoundedBoxGeometry(1.38, 0.045, 0.82, 4, 0.012),
            walnutMat
          );
          deskTop.position.y = appItem.plinthHeight;
          deskTop.castShadow = !isSoftwareGl;
          deskTop.receiveShadow = true;
          standGroup.add(deskTop);

          const legL = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, appItem.plinthHeight, 0.72),
            brassMat
          );
          legL.position.set(-0.58, appItem.plinthHeight / 2, 0);
          standGroup.add(legL);

          const legR = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, appItem.plinthHeight, 0.72),
            brassMat
          );
          legR.position.set(0.58, appItem.plinthHeight / 2, 0);
          standGroup.add(legR);

          const rim = new THREE.Mesh(
            new THREE.BoxGeometry(1.39, 0.014, 0.83),
            ringMat
          );
          rim.position.y = appItem.plinthHeight + 0.022;
          standGroup.add(rim);
        }

        const rig = buildSingleAppliance(appItem.applianceCategory);
        const baseY = appItem.plinthHeight + 0.015;
        const modelPivot = new THREE.Group();
        modelPivot.position.set(0, baseY, 0);
        modelPivot.add(rig.root);
        standGroup.add(modelPivot);

        const plaqueTex = createPlinthPlaqueTexture(
          appItem.featuredBrand,
          sceneMeta?.name.en || appItem.applianceCategory.toUpperCase(),
          appItem.accentHex
        );
        const plaqueMesh = new THREE.Mesh(
          new THREE.PlaneGeometry(0.56, 0.14),
          new THREE.MeshBasicMaterial({ map: plaqueTex })
        );
        plaqueMesh.position.set(
          0,
          appItem.standStyle === 'appliance-plinth' ? 0.08 : appItem.plinthHeight * 0.65,
          appItem.standStyle === 'appliance-plinth' ? 0.47 : 0.41
        );
        standGroup.add(plaqueMesh);

        const hitHeight =
          appItem.applianceCategory === 'refrigerator' ? 2.15 : 1.55;
        const proxyBox = new THREE.Mesh(
          new THREE.BoxGeometry(1.22, hitHeight, 1.15),
          hitBoxMat
        );
        proxyBox.position.set(0, hitHeight / 2, 0);
        proxyBox.userData.hallApplianceCat = appItem.applianceCategory;
        standGroup.add(proxyBox);
        hitBoxProxies.push(proxyBox);

        const normalX = Math.sin(appItem.facingYaw);
        const normalZ = Math.cos(appItem.facingYaw);
        const spotLight = new THREE.SpotLight(
          appItem.spotColor,
          3.8,
          7.8,
          Math.PI / 4.2,
          0.78,
          1.25
        );
        spotLight.position.set(
          appItem.pos[0] + normalX * 0.5,
          2.75,
          appItem.pos[2] + normalZ * 0.5
        );
        spotLight.target.position.set(appItem.pos[0], 0.9, appItem.pos[2]);
        scene.add(spotLight);
        scene.add(spotLight.target);

        const coneGeo = new THREE.ConeGeometry(0.88, 2.3, 24, 1, true);
        const coneMat = new THREE.MeshBasicMaterial({
          color: appItem.spotColor,
          transparent: true,
          opacity: 0.055,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        });
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(0, 1.56, 0.2);
        coneMesh.rotation.x = -0.18;
        coneMesh.raycast = () => {};
        standGroup.add(coneMesh);

        const labelY =
          appItem.applianceCategory === 'refrigerator'
            ? 2.15
            : appItem.applianceCategory === 'microwave'
              ? 1.48
              : appItem.applianceCategory === 'laptop'
                ? 1.38
                : 1.25;

        const labelAnchorWorld = new THREE.Vector3(
          appItem.pos[0],
          labelY,
          appItem.pos[2]
        );

        spawnedAppliances.push({
          placement: appItem,
          rig,
          modelPivot,
          baseY,
          spotLight,
          coneMesh,
          ringMat,
          labelAnchorWorld,
        });
      }

      // =======================================================================
      // 360° MOUSE DRAG LOOK + CLICK FLOOR TO WALK + RAYCASTER INTERACTION
      // =======================================================================
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPos = { x: 0, y: 0 };
      let isPointerDragging = false;
      let lastDragClientX = 0;
      let lastDragClientY = 0;

      const getHoveredHallItem = (
        clientX: number,
        clientY: number
      ): { id: string; type: 'device' | 'appliance' } | null => {
        if (!renderer) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(hitBoxProxies, false);
        if (hits.length > 0) {
          const ud = hits[0].object.userData;
          if (ud?.hallDeviceId) {
            return { id: String(ud.hallDeviceId), type: 'device' };
          }
          if (ud?.hallApplianceCat) {
            return { id: String(ud.hallApplianceCat), type: 'appliance' };
          }
        }
        return null;
      };

      const getFloorHitPoint = (
        clientX: number,
        clientY: number
      ): THREE.Vector3 | null => {
        if (!renderer) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointer.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const floorHits = raycaster.intersectObject(floorMesh, false);
        if (floorHits.length > 0) {
          const pt = floorHits[0].point;
          if (pt.x > -11.2 && pt.x < 11.2 && pt.z > -9.2 && pt.z < 9.2) {
            return pt;
          }
        }
        return null;
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        pointerDownPos = { x: e.clientX, y: e.clientY };
        lastDragClientX = e.clientX;
        lastDragClientY = e.clientY;
        isPointerDragging = true;
        if (renderer) {
          renderer.domElement.style.cursor = 'grabbing';
        }
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!renderer) return;
        const hasFocus = Boolean(
          focusedDeviceIdRef.current || focusedApplianceCatRef.current
        );

        // Dragging rotates the camera a full 360° (yaw) and up/down (pitch)
        if (isPointerDragging && !hasFocus) {
          const dx = e.clientX - lastDragClientX;
          const dy = e.clientY - lastDragClientY;
          lastDragClientX = e.clientX;
          lastDragClientY = e.clientY;

          playerTargetYawRef.current -= dx * 0.0045;
          playerTargetPitchRef.current = THREE.MathUtils.clamp(
            playerTargetPitchRef.current - dy * 0.0028,
            -0.38,
            0.35
          );
          walkRingGroup.visible = false;
          return;
        }

        const hit = getHoveredHallItem(e.clientX, e.clientY);
        const hitId = hit ? hit.id : null;
        if (hitId !== hoveredItemIdRef.current) {
          hoveredItemIdRef.current = hitId;
          setHoveredItemId(hitId);
        }

        if (hitId) {
          renderer.domElement.style.cursor = 'pointer';
          walkRingGroup.visible = false;
        } else if (!hasFocus) {
          const floorPt = getFloorHitPoint(e.clientX, e.clientY);
          if (floorPt) {
            walkRingGroup.position.set(floorPt.x, 0.015, floorPt.z);
            walkRingGroup.visible = true;
            renderer.domElement.style.cursor = 'pointer';
          } else {
            walkRingGroup.visible = false;
            renderer.domElement.style.cursor = isPointerDragging ? 'grabbing' : 'grab';
          }
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        const wasDragging = isPointerDragging;
        isPointerDragging = false;
        if (renderer) {
          renderer.domElement.style.cursor = hoveredItemIdRef.current
            ? 'pointer'
            : 'grab';
        }
        if (!wasDragging) return;

        const dx = Math.abs(e.clientX - pointerDownPos.x);
        const dy = Math.abs(e.clientY - pointerDownPos.y);
        if (dx < 9 && dy < 9) {
          const hit = getHoveredHallItem(e.clientX, e.clientY);
          if (hit) {
            if (hit.type === 'device') {
              triggerFlyToDeviceRef.current(hit.id);
            } else {
              triggerFlyToApplianceRef.current(hit.id as ApplianceCategoryId);
            }
            return;
          }

          // Click on the floor to walk directly to that (x, z) spot in the 360° store!
          const hasFocus = Boolean(
            focusedDeviceIdRef.current || focusedApplianceCatRef.current
          );
          if (!hasFocus) {
            const floorPt = getFloorHitPoint(e.clientX, e.clientY);
            if (floorPt) {
              playerTargetPosRef.current.x = THREE.MathUtils.clamp(
                floorPt.x,
                -10.8,
                10.8
              );
              playerTargetPosRef.current.z = THREE.MathUtils.clamp(
                floorPt.z,
                -8.8,
                8.8
              );
            }
          }
        }
      };

      const onPointerLeave = () => {
        isPointerDragging = false;
        walkRingGroup.visible = false;
        if (hoveredItemIdRef.current !== null) {
          hoveredItemIdRef.current = null;
          setHoveredItemId(null);
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      renderer.domElement.addEventListener('pointerleave', onPointerLeave);

      const handleResize = () => {
        if (!container || !renderer) return;
        const nw = Math.max(container.clientWidth, 300);
        const nh = Math.max(container.clientHeight, 360);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
        composer?.setSize(nw, nh);
      };
      window.addEventListener('resize', handleResize);

      // Stage 4: Setup ACES Filmic + subtle high-threshold UnrealBloomPass + Film Grain & Vignette
      if (!isSoftwareGl) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(w, h),
          0.06,
          0.22,
          0.96
        );
        composer.addPass(bloomPass);
        filmGrainPass = new ShaderPass(CINEMATIC_GRAIN_VIGNETTE_SHADER);
        composer.addPass(filmGrainPass);
        composer.addPass(new OutputPass());
      }

      setLoadProgress(100);
      setLoading(false);

      // =======================================================================
      // RENDER & 1ST-PERSON 360° WALKING LOOP
      // =======================================================================
      let lastTime = performance.now();
      let badgeFrame = 0;
      let walkBobPhase = 0;
      const projVec = new THREE.Vector3();

      const animate = (now: number) => {
        animId = requestAnimationFrame(animate);
        if (!renderer) return;
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const elapsed = now / 1000;
        const isReduced = reducedMotionRef.current;

        // 1. Update Camera FOV Zoom smoothly
        const targetFov = 46 + zoomFovOffsetRef.current;
        if (Math.abs(camera.fov - targetFov) > 0.05) {
          camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 7, dt);
          camera.updateProjectionMatrix();
        }

        // 2. Process 1st-Person 360° Free-Walking Inputs
        const walkIn = activeWalkInputsRef.current;
        const isMoving =
          walkIn.forward ||
          walkIn.backward ||
          walkIn.strafeLeft ||
          walkIn.strafeRight;
        const isTurning = walkIn.turnLeft || walkIn.turnRight;

        if (!focusedDeviceIdRef.current && !focusedApplianceCatRef.current) {
          const walkSpeed = 3.8; // meters per second
          const turnSpeed = 1.65; // radians per second

          if (walkIn.turnLeft) {
            playerTargetYawRef.current -= turnSpeed * dt;
          }
          if (walkIn.turnRight) {
            playerTargetYawRef.current += turnSpeed * dt;
          }

          const yaw = playerSmoothYawRef.current;
          const forwardX = Math.sin(yaw);
          const forwardZ = -Math.cos(yaw);
          const rightX = Math.cos(yaw);
          const rightZ = Math.sin(yaw);

          if (walkIn.forward) {
            playerTargetPosRef.current.x += forwardX * walkSpeed * dt;
            playerTargetPosRef.current.z += forwardZ * walkSpeed * dt;
          }
          if (walkIn.backward) {
            playerTargetPosRef.current.x -= forwardX * walkSpeed * dt;
            playerTargetPosRef.current.z -= forwardZ * walkSpeed * dt;
          }
          if (walkIn.strafeRight) {
            playerTargetPosRef.current.x += rightX * walkSpeed * dt;
            playerTargetPosRef.current.z += rightZ * walkSpeed * dt;
          }
          if (walkIn.strafeLeft) {
            playerTargetPosRef.current.x -= rightX * walkSpeed * dt;
            playerTargetPosRef.current.z -= rightZ * walkSpeed * dt;
          }

          playerTargetPosRef.current.x = THREE.MathUtils.clamp(
            playerTargetPosRef.current.x,
            -10.8,
            10.8
          );
          playerTargetPosRef.current.z = THREE.MathUtils.clamp(
            playerTargetPosRef.current.z,
            -8.8,
            8.8
          );

          if (isMoving || isTurning) {
            walkBobPhase += dt * 10.0;
          }
        }

        playerSmoothPosRef.current.x = THREE.MathUtils.damp(
          playerSmoothPosRef.current.x,
          playerTargetPosRef.current.x,
          6.5,
          dt
        );
        playerSmoothPosRef.current.z = THREE.MathUtils.damp(
          playerSmoothPosRef.current.z,
          playerTargetPosRef.current.z,
          6.5,
          dt
        );
        playerSmoothYawRef.current = THREE.MathUtils.damp(
          playerSmoothYawRef.current,
          playerTargetYawRef.current,
          8.0,
          dt
        );
        playerSmoothPitchRef.current = THREE.MathUtils.damp(
          playerSmoothPitchRef.current,
          playerTargetPitchRef.current,
          8.0,
          dt
        );

        const mode = flyModeRef.current;
        const stepBobY =
          !isReduced && isMoving ? Math.sin(walkBobPhase) * 0.022 : 0;

        if (mode === 'hall') {
          const yaw = playerSmoothYawRef.current;
          const pitch = playerSmoothPitchRef.current;
          const eyeY = 1.62 + stepBobY;

          currentCamPosRef.current.set(
            playerSmoothPosRef.current.x,
            eyeY,
            playerSmoothPosRef.current.z
          );
          currentLookTargetRef.current.set(
            playerSmoothPosRef.current.x + Math.sin(yaw) * Math.cos(pitch) * 5.0,
            eyeY + Math.sin(pitch) * 5.0,
            playerSmoothPosRef.current.z - Math.cos(yaw) * Math.cos(pitch) * 5.0
          );
        } else if (mode === 'flying-in') {
          flyAnimTRef.current = Math.min(
            1,
            flyAnimTRef.current + dt / (isReduced ? 0.25 : 0.6)
          );
          const eased = easeInOutCubic(flyAnimTRef.current);
          currentCamPosRef.current.lerpVectors(
            flyStartPosRef.current,
            flyGoalPosRef.current,
            eased
          );
          currentLookTargetRef.current.lerpVectors(
            flyStartTargetRef.current,
            flyGoalTargetRef.current,
            eased
          );
          if (flyAnimTRef.current >= 1) {
            flyModeRef.current = 'focused';
          }
        } else if (mode === 'focused') {
          currentCamPosRef.current.copy(flyGoalPosRef.current);
          currentLookTargetRef.current.copy(flyGoalTargetRef.current);
        } else if (mode === 'flying-back') {
          flyAnimTRef.current = Math.min(
            1,
            flyAnimTRef.current + dt / (isReduced ? 0.25 : 0.55)
          );
          const eased = easeInOutCubic(flyAnimTRef.current);
          currentCamPosRef.current.lerpVectors(
            flyStartPosRef.current,
            flyGoalPosRef.current,
            eased
          );
          currentLookTargetRef.current.lerpVectors(
            flyStartTargetRef.current,
            flyGoalTargetRef.current,
            eased
          );
          if (flyAnimTRef.current >= 1) {
            flyModeRef.current = 'hall';
          }
        }

        camera.position.copy(currentCamPosRef.current);
        camera.lookAt(currentLookTargetRef.current);

        // 3. Dimming the Rest when Focused + Spotlight Hover Brightening
        const hasFocus = Boolean(
          focusedDeviceIdRef.current || focusedApplianceCatRef.current
        );
        hemiLight.intensity = THREE.MathUtils.damp(
          hemiLight.intensity,
          hasFocus ? 0.14 : 0.42,
          6,
          dt
        );
        dirLight.intensity = THREE.MathUtils.damp(
          dirLight.intensity,
          hasFocus ? 0.18 : 0.52,
          6,
          dt
        );
        warmStripMat.emissiveIntensity = THREE.MathUtils.damp(
          warmStripMat.emissiveIntensity,
          hasFocus ? 0.25 : 0.65,
          6,
          dt
        );

        for (const sItem of spawnedDevices) {
          const isHovered = hoveredItemIdRef.current === sItem.spec.id;
          const isFocused = focusedDeviceIdRef.current === sItem.spec.id;

          if (!isReduced) {
            const floatOffset = isFocused
              ? 0
              : Math.sin(elapsed * 1.4 + sItem.placement.phase) * 0.008;
            const targetYaw =
              isFocused || isHovered
                ? 0
                : sItem.placement.baseRot[1] +
                  Math.sin(elapsed * 0.5 + sItem.placement.phase) * 0.05;
            sItem.modelPivot.position.y = THREE.MathUtils.damp(
              sItem.modelPivot.position.y,
              sItem.baseY + floatOffset,
              6,
              dt
            );
            sItem.modelPivot.rotation.y = THREE.MathUtils.damp(
              sItem.modelPivot.rotation.y,
              targetYaw,
              6,
              dt
            );
          } else {
            sItem.modelPivot.position.y = sItem.baseY;
            sItem.modelPivot.rotation.y = sItem.placement.baseRot[1];
          }

          const targetSpotIntensity = isFocused
            ? 8.2
            : hasFocus
              ? 0.22
              : isHovered
                ? 6.8
                : 3.4;
          sItem.spotLight.intensity = THREE.MathUtils.damp(
            sItem.spotLight.intensity,
            targetSpotIntensity,
            8,
            dt
          );

          const coneMat = sItem.coneMesh.material as THREE.MeshBasicMaterial;
          const targetConeOpacity = isFocused
            ? 0.11
            : hasFocus
              ? 0.005
              : isHovered
                ? 0.09
                : 0.025;
          coneMat.opacity = THREE.MathUtils.damp(coneMat.opacity, targetConeOpacity, 8, dt);

          const targetRingGlow = isFocused ? 2.0 : hasFocus ? 0.15 : isHovered ? 1.6 : 0.65;
          sItem.ringMat.emissiveIntensity = THREE.MathUtils.damp(
            sItem.ringMat.emissiveIntensity,
            targetRingGlow,
            8,
            dt
          );
        }

        for (const aItem of spawnedAppliances) {
          const cat = aItem.placement.applianceCategory;
          const isHovered = hoveredItemIdRef.current === cat;
          const isFocused = focusedApplianceCatRef.current === cat;
          const interactiveState = applianceStatesRef.current[cat];

          updateApplianceRigAnimation(
            aItem.rig,
            interactiveState,
            isHovered || isFocused,
            dt,
            elapsed
          );

          // Subtle idle animation (gentle slow yaw oscillation & subtle float when not focused)
          if (!isReduced) {
            const floatOffset = isFocused
              ? 0
              : Math.sin(elapsed * 1.15 + aItem.placement.phase) * 0.006;
            const targetYaw =
              isFocused || isHovered
                ? 0
                : Math.sin(elapsed * 0.45 + aItem.placement.phase) * 0.045;
            aItem.modelPivot.position.y = THREE.MathUtils.damp(
              aItem.modelPivot.position.y,
              aItem.baseY + floatOffset,
              6,
              dt
            );
            aItem.modelPivot.rotation.y = THREE.MathUtils.damp(
              aItem.modelPivot.rotation.y,
              targetYaw,
              6,
              dt
            );
          } else {
            aItem.modelPivot.position.y = aItem.baseY;
            aItem.modelPivot.rotation.y = 0;
          }

          const targetSpotIntensity = isFocused
            ? 8.5
            : hasFocus
              ? 0.25
              : isHovered
                ? 7.0
                : 3.6;
          aItem.spotLight.intensity = THREE.MathUtils.damp(
            aItem.spotLight.intensity,
            targetSpotIntensity,
            8,
            dt
          );

          const coneMat = aItem.coneMesh.material as THREE.MeshBasicMaterial;
          const targetConeOpacity = isFocused
            ? 0.11
            : hasFocus
              ? 0.005
              : isHovered
                ? 0.09
                : 0.025;
          coneMat.opacity = THREE.MathUtils.damp(coneMat.opacity, targetConeOpacity, 8, dt);

          const targetRingGlow = isFocused ? 2.0 : hasFocus ? 0.15 : isHovered ? 1.6 : 0.65;
          aItem.ringMat.emissiveIntensity = THREE.MathUtils.damp(
            aItem.ringMat.emissiveIntensity,
            targetRingGlow,
            8,
            dt
          );
        }

        if (composer && postFxEnabledRef.current) {
          if (filmGrainPass?.uniforms?.uTime) {
            filmGrainPass.uniforms.uTime.value = isReduced ? 0 : elapsed;
          }
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        // 4. Project 3D Floating Price + Parameter Tags every 3 frames
        badgeFrame++;
        if (badgeFrame % 3 === 0) {
          const cw = renderer.domElement.clientWidth;
          const ch = renderer.domElement.clientHeight;
          const nextBadges: FloatingHallBadge[] = [];

          for (const sItem of spawnedDevices) {
            projVec.copy(sItem.labelAnchorWorld);
            const dist = camera.position.distanceTo(projVec);
            projVec.project(camera);

            const inFrustum =
              projVec.z > -1 &&
              projVec.z < 1 &&
              projVec.x > -0.96 &&
              projVec.x < 0.96 &&
              dist < 18.5;
            const x = (projVec.x * 0.5 + 0.5) * cw;
            const y = (-projVec.y * 0.5 + 0.5) * ch;

            const shortChip = sItem.spec.specs.processor.en
              .split('·')[0]
              .replace('Snapdragon', 'SD')
              .replace('Apple ', '')
              .replace('Huawei ', '')
              .trim()
              .slice(0, 18);

            nextBadges.push({
              itemId: sItem.spec.id,
              itemType: 'device',
              brand: sItem.spec.brand.toUpperCase(),
              modelName: sItem.spec.name
                .replace('Samsung ', '')
                .replace('Apple ', '')
                .replace('Huawei ', ''),
              specSummary: `${sItem.spec.screenBadge} · ${shortChip} · ${sItem.spec.weightGrams}g`,
              section: sItem.placement.section,
              priceUsd: sItem.spec.basePriceUsd,
              x,
              y,
              visible: inFrustum,
              distance: dist,
            });
          }

          for (const aItem of spawnedAppliances) {
            const cat = aItem.placement.applianceCategory;
            const meta = APPLIANCE_SCENE_ITEMS.find((m) => m.id === cat);
            projVec.copy(aItem.labelAnchorWorld);
            const dist = camera.position.distanceTo(projVec);
            projVec.project(camera);

            const inFrustum =
              projVec.z > -1 &&
              projVec.z < 1 &&
              projVec.x > -0.96 &&
              projVec.x < 0.96 &&
              dist < 18.5;
            const x = (projVec.x * 0.5 + 0.5) * cw;
            const y = (-projVec.y * 0.5 + 0.5) * ch;

            nextBadges.push({
              itemId: cat,
              itemType: 'appliance',
              brand: aItem.placement.featuredBrand,
              modelName: aItem.placement.featuredModel[lang] || (meta ? meta.name[lang] : cat),
              specSummary: meta ? meta.zoneLabel[lang] : 'A+++ · Smart Inverter',
              section: 'appliances',
              priceUsd: aItem.placement.priceUsd,
              x,
              y,
              visible: inFrustum,
              distance: dist,
            });
          }

          setBadges(nextBadges);
        }
      };

      animId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('pointerup', onPointerUp);
        if (renderer) {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerleave', onPointerLeave);
          renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
          renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        }
        floorReflector?.getRenderTarget()?.dispose();
        composer?.dispose();
        contactShadowTex.dispose();
        hitBoxMat.dispose();
        disposeObject3D(scene);
        envTarget?.dispose();
        pmremGenerator?.dispose();
        renderer?.dispose();
      };
    } catch (err) {
      console.error('WebGL error in ShowroomHall3D:', err);
      setWebglError(true);
      setLoading(false);
      return;
    }
  }, [darkMode, lang]);

  const handleResetView = () => {
    if (focusedDeviceId || focusedApplianceCat) {
      handleBackToHall();
    }
    playerTargetPosRef.current = {
      x: SECTION_WAYPOINTS.overview.x,
      z: SECTION_WAYPOINTS.overview.z,
    };
    setShortestYawTarget(0);
    playerTargetPitchRef.current = -0.02;
    setZoomFovOffset(0);
  };

  if (webglError) {
    return (
      <div className="w-full h-full min-h-[520px] bg-[#09080a] text-white p-6 flex flex-col items-center justify-center text-center gap-3">
        <p className="text-sm font-semibold">
          {lang === 'hy'
            ? '3D սրահը հասանելի չէ այս սարքի վրա։'
            : '3D Showroom Hall is unavailable on this device.'}
        </p>
        {onSkip3D && (
          <button
            type="button"
            onClick={onSkip3D}
            className="px-4 py-2 rounded-xl bg-[#E5A952] text-[#09080a] text-xs font-bold cursor-pointer"
          >
            {lang === 'hy' ? 'Բացել 2D Կատալոգը' : 'Switch to 2D Catalog'}
          </button>
        )}
      </div>
    );
  }

  const activeFinish = focusedDevice
    ? focusedDevice.finishes.find((f) => f.id === finishId) || focusedDevice.finishes[0]
    : null;
  const activeStorage = focusedDevice
    ? focusedDevice.storageOptions.find((s) => s.id === storageId) ||
      focusedDevice.storageOptions[0]
    : null;
  const focusedPriceEntry = focusedDevice ? prices[focusedDevice.id] : undefined;
  const isFocusedFavorite = focusedDevice ? favorites.includes(focusedDevice.id) : false;

  const focusedApplianceMeta = focusedApplianceCat
    ? APPLIANCE_SCENE_ITEMS.find((s) => s.id === focusedApplianceCat) || null
    : null;
  const focusedApplianceModels = focusedApplianceCat
    ? APPLIANCE_MODELS.filter((m) => m.categoryId === focusedApplianceCat)
    : [];

  return (
    <div
      ref={wrapperRef}
      className={`overflow-hidden select-none bg-[#080709] ${
        isFullscreen
          ? 'fixed inset-0 z-[100] w-screen h-screen'
          : fullScreen
            ? 'relative w-full h-full'
            : 'relative w-full h-[580px] sm:h-[680px] lg:h-[780px] rounded-3xl border border-white/15 shadow-2xl'
      }`}
    >
      {/* Loading Screen with Progress Bar */}
      {loading && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#080709] px-6 text-white">
          <div className="w-full max-w-xs space-y-3 text-center">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono-tech uppercase tracking-widest text-[#E5A952]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SUR 3D PULSE · 360° HALL</span>
            </div>
            <div className="text-xs font-medium text-white/80">
              {lang === 'hy'
                ? `Կառուցվում է 360° 3D ցուցասրահը (${loadProgress}%)`
                : `Synthesizing 360° 3D Showroom Hall (${loadProgress}%)`}
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full bg-[#E5A952] transition-all duration-200"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Three.js Canvas */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Top-Left "Back to Hall" + Quick Prev/Next Switcher when an item is focused */}
      {(focusedDevice || focusedApplianceCat) && (
        <div className="absolute top-16 sm:top-20 left-3 sm:left-5 z-30 flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleBackToHall}
            className="h-9 px-3.5 rounded-xl bg-[#E5A952] text-[#080709] font-bold text-xs inline-flex items-center gap-1.5 shadow-[0_8px_24px_rgba(229,169,82,0.4)] hover:opacity-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{lang === 'hy' ? 'Վերադառնալ սրահ' : 'Back to Hall'}</span>
          </button>

          <div className="inline-flex items-center rounded-xl border border-white/15 bg-black/75 backdrop-blur-xl overflow-hidden shadow-xl">
            <button
              type="button"
              onClick={() => switchFocusedDevice(-1)}
              className="h-9 px-2.5 text-white hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'hy' ? 'Նախորդ' : 'Prev'}</span>
            </button>
            <div className="h-4 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => switchFocusedDevice(1)}
              className="h-9 px-2.5 text-white hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs font-medium transition-colors cursor-pointer"
            >
              <span className="hidden sm:inline">{lang === 'hy' ? 'Հաջորդ' : 'Next'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Projected Compact 3D Price + Parameter Tags (Գնապիտակ իր պարամետրերով) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {badges.map((b) => {
          if (!b.visible) return null;
          const activeFocusId = focusedDeviceId || focusedApplianceCat;
          if (activeFocusId && activeFocusId !== b.itemId) return null;

          const isHovered = hoveredItemId === b.itemId;
          const isFocused = activeFocusId === b.itemId;
          const isNear = b.distance < 8.5;

          const liveEntry = prices[b.itemId];
          const usd = liveEntry?.priceUsd ?? b.priceUsd;
          const amdRate = liveEntry?.amdRate ?? 388.5;
          const eurRate = liveEntry?.eurRate ?? 0.92;
          const priceLabel = formatDevicePrice(usd, currency, amdRate, eurRate);

          return (
            <button
              key={b.itemId}
              type="button"
              onClick={() => {
                if (b.itemType === 'device') {
                  triggerFlyToDevice(b.itemId);
                } else {
                  triggerFlyToAppliance(b.itemId as ApplianceCategoryId);
                }
              }}
              onMouseEnter={() => {
                hoveredItemIdRef.current = b.itemId;
                setHoveredItemId(b.itemId);
              }}
              onMouseLeave={() => {
                if (hoveredItemIdRef.current === b.itemId) {
                  hoveredItemIdRef.current = null;
                  setHoveredItemId(null);
                }
              }}
              style={{
                transform: `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute top-0 left-0 px-2 py-1 rounded-lg border text-left transition-all duration-200 backdrop-blur-md cursor-pointer ${
                isHovered || isFocused
                  ? 'bg-[#E5A952] text-[#080709] border-[#E5A952] shadow-[0_0_22px_rgba(229,169,82,0.65)] scale-105 z-20'
                  : isNear
                    ? 'bg-black/82 text-white border-white/25 hover:border-[#E5A952]'
                    : 'bg-black/68 text-white/85 border-white/15 opacity-90 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[9px] font-mono-tech uppercase tracking-wider">
                <span className="opacity-80">{b.brand}</span>
                <span
                  className={
                    isHovered || isFocused
                      ? 'px-1.5 py-0.2 rounded bg-black/20 text-[#080709] font-extrabold'
                      : 'px-1.5 py-0.2 rounded bg-[#E5A952]/20 text-[#E5A952] font-bold'
                  }
                >
                  {priceLabel}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap leading-tight mt-0.5">
                {b.modelName}
              </div>
              <div
                className={`text-[8.5px] font-mono-tech whitespace-nowrap leading-tight mt-0.5 ${
                  isHovered || isFocused ? 'text-[#080709]/85 font-semibold' : 'text-white/65'
                }`}
              >
                {b.specSummary}
              </div>
            </button>
          );
        })}
      </div>

      {/* =====================================================================
         HOME APPLIANCE 2D DETAIL PANEL (Clean 2D Image + Spec List + Cart — NO 3D inside!)
         ===================================================================== */}
      {focusedApplianceCat && focusedApplianceMeta && (
        <div
          className="fixed lg:absolute inset-y-0 right-0 z-40 w-full max-w-xl bg-[var(--bg-surface)]/95 backdrop-blur-2xl border-l border-[var(--border-hairline)] shadow-[0_0_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label={focusedApplianceMeta.name[lang]}
        >
          <div className="px-5 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBackToHall}
                  className="h-9 px-3.5 rounded-xl bg-[#E5A952] text-[#080709] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'hy' ? 'Վերադառնալ սրահ' : 'Back to Hall'}</span>
                </button>

                <div className="inline-flex items-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => switchFocusedDevice(-1)}
                    className="h-9 px-2.5 hover:bg-[var(--bg-subtle)] text-xs inline-flex items-center cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => switchFocusedDevice(1)}
                    className="h-9 px-2.5 border-l border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-xs inline-flex items-center cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToHall}
                className="h-9 w-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] inline-flex items-center justify-center hover:border-[var(--accent)] cursor-pointer"
                aria-label="Close appliance panel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {HALL_APPLIANCE_PLACEMENTS.map((ap) => {
                const meta = APPLIANCE_SCENE_ITEMS.find(
                  (m) => m.id === ap.applianceCategory
                );
                const active = ap.applianceCategory === focusedApplianceCat;
                return (
                  <button
                    key={ap.applianceCategory}
                    type="button"
                    onClick={() => triggerFlyToAppliance(ap.applianceCategory)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-semibold'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {meta ? meta.name[lang] : ap.applianceCategory}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 overflow-y-auto overscroll-contain space-y-5 flex-1">
            {/* 2D Product Image + Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5">
                <Product2DIllustration
                  kind="appliance"
                  applianceCategory={focusedApplianceCat}
                  brand="HOME SUITE"
                  name={focusedApplianceMeta.name[lang]}
                  accentHex="#38BDF8"
                  size="lg"
                />
              </div>
              <div className="sm:col-span-7 space-y-2">
                <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                  04 · {focusedApplianceMeta.zoneLabel[lang]}
                </div>
                <h2 className="font-editorial text-2xl font-bold">
                  {focusedApplianceMeta.name[lang]}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {focusedApplianceMeta.shortDesc[lang]}
                </p>

                {/* Live Door / Burner toggle for the 3D object standing in the Hall */}
                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAppliancePart(focusedApplianceCat, 'doorOpen')}
                    className="h-8 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>
                      {applianceStates[focusedApplianceCat].doorOpen
                        ? lang === 'hy'
                          ? 'Փակել դուռը սրահում'
                          : 'Close Door in Hall'
                        : lang === 'hy'
                          ? 'Բացել դուռը սրահում'
                          : 'Open Door in Hall'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toggleAppliancePart(focusedApplianceCat, 'secondaryActive')
                    }
                    className="h-8 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--accent)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5 text-[var(--accent)]" />
                    <span>
                      {lang === 'hy' ? 'Միացնել/Անջատել ռեժիմը' : 'Toggle Active Mode'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* Models List with Specs, Favorite & Add to Cart */}
            <div className="space-y-3">
              <h3 className="text-xs font-mono-tech uppercase tracking-wider text-[var(--text-secondary)]">
                {lang === 'hy'
                  ? `Մոդելների Ցուցակ և Տվյալներ (${focusedApplianceModels.length})`
                  : `Available Models & Specifications (${focusedApplianceModels.length})`}
              </h3>

              <div className="space-y-2.5">
                {focusedApplianceModels.map((m) => {
                  const usd = getApplianceBasePriceUsd(m.id);
                  const isFav = favorites.includes(m.id);
                  const isAdded = addedApplianceModelId === m.id;
                  return (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] flex flex-col gap-2.5 hover:border-[var(--accent)] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-[10px] font-mono-tech uppercase text-[var(--accent)]">
                            <span>{m.brand}</span>
                            <span>·</span>
                            <span>{m.modelCode}</span>
                            <span>·</span>
                            <span>{m.energyClass}</span>
                          </div>
                          <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                            {m.name}
                          </div>
                          <div className="text-xs text-[var(--text-secondary)]">
                            {m.capacityLabel[lang]} · {m.dimensionsCm} · {m.specs.powerOrConsumption[lang]}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-base font-bold font-mono-tech tabular-nums">
                            {formatDevicePrice(usd, currency, 388.5, 0.92)}
                          </div>
                        </div>
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {m.highlights[lang]}
                      </div>

                      {/* Structured 2D Technical Specs Grid for Stage 3 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1.5 border-t border-[var(--border-hairline)]">
                        <div className="p-2 rounded-lg bg-[var(--bg-canvas)]">
                          <span className="block text-[9px] font-mono-tech uppercase text-[var(--text-secondary)]">
                            {lang === 'hy' ? 'Տեսակ' : 'Architecture'}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {m.specs.type[lang]}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--bg-canvas)]">
                          <span className="block text-[9px] font-mono-tech uppercase text-[var(--text-secondary)]">
                            {lang === 'hy' ? 'Հզորություն / Ծախս' : 'Power / Energy'}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {m.specs.powerOrConsumption[lang]}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--bg-canvas)]">
                          <span className="block text-[9px] font-mono-tech uppercase text-[var(--text-secondary)]">
                            {lang === 'hy' ? 'Սառեցում / Աղմուկ' : 'Cooling / Noise'}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {m.specs.noiseOrCooling[lang]}
                          </span>
                        </div>
                        <div className="p-2 rounded-lg bg-[var(--bg-canvas)]">
                          <span className="block text-[9px] font-mono-tech uppercase text-[var(--text-secondary)]">
                            {lang === 'hy' ? 'Սմարթ Ֆունկցիաներ' : 'Smart Features'}
                          </span>
                          <span className="font-medium text-[var(--text-primary)]">
                            {m.specs.smartFeatures[lang]}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-hairline)]">
                        {onToggleFavorite && (
                          <button
                            type="button"
                            onClick={() => onToggleFavorite(m.id)}
                            className={`h-8 px-2.5 rounded-lg border text-xs inline-flex items-center gap-1 cursor-pointer ${
                              isFav
                                ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-semibold'
                                : 'border-[var(--border-hairline)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:border-rose-500'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${isFav ? 'fill-rose-500' : ''}`}
                            />
                            <span>{lang === 'hy' ? 'Ֆավորիտ' : 'Favorite'}</span>
                          </button>
                        )}

                        {onAddToCart && (
                          <button
                            type="button"
                            onClick={() => {
                              onAddToCart(m.id, `${m.id}-std`, `${m.id}-base`);
                              setAddedApplianceModelId(m.id);
                              setTimeout(() => setAddedApplianceModelId(null), 1500);
                            }}
                            className={`h-8 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
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
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
         TECH DEVICE 2D DETAIL PANEL (Clean 2D Image + Structured Spec List — NO 3D inside!)
         ===================================================================== */}
      {focusedDevice && activeFinish && activeStorage && (
        <div
          className="fixed lg:absolute inset-y-0 right-0 z-40 w-full max-w-xl bg-[var(--bg-surface)]/95 backdrop-blur-2xl border-l border-[var(--border-hairline)] shadow-[0_0_80px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label={focusedDevice.name}
        >
          {/* Detail Panel Top Bar */}
          <div className="px-5 py-3 border-b border-[var(--border-hairline)] bg-[var(--bg-elevated)] space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleBackToHall}
                  className="h-9 px-3.5 rounded-xl bg-[#E5A952] text-[#080709] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{lang === 'hy' ? 'Վերադառնալ սրահ' : 'Back to Hall'}</span>
                </button>

                <div className="inline-flex items-center rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => switchFocusedDevice(-1)}
                    className="h-9 px-2.5 hover:bg-[var(--bg-subtle)] text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => switchFocusedDevice(1)}
                    className="h-9 px-2.5 border-l border-[var(--border-hairline)] hover:bg-[var(--bg-subtle)] text-xs inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {onToggleFavorite && (
                  <button
                    type="button"
                    onClick={() => onToggleFavorite(focusedDevice.id)}
                    className="h-9 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] inline-flex items-center gap-1.5 text-xs hover:border-rose-500 cursor-pointer"
                  >
                    <Heart
                      className={`w-3.5 h-3.5 ${
                        isFocusedFavorite
                          ? 'text-rose-500 fill-rose-500'
                          : 'text-[var(--text-secondary)]'
                      }`}
                    />
                    <span>
                      {isFocusedFavorite
                        ? t.nav.favorites
                        : lang === 'hy'
                          ? 'Պահպանել'
                          : 'Save'}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleBackToHall}
                  className="h-9 w-9 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] inline-flex items-center justify-center hover:border-[var(--accent)] cursor-pointer"
                  aria-label="Close detail panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Model Switcher */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {HALL_DEVICE_PLACEMENTS.map((p) => {
                const dev = DEVICES.find((d) => d.id === p.deviceId);
                if (!dev) return null;
                const active = dev.id === focusedDevice.id;
                return (
                  <button
                    key={dev.id}
                    type="button"
                    onClick={() => triggerFlyToDevice(dev.id)}
                    className={`h-7 px-2.5 rounded-lg text-[11px] font-medium whitespace-nowrap border transition-colors cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[var(--text-primary)] text-[var(--bg-canvas)] border-[var(--text-primary)] font-semibold'
                        : 'bg-[var(--bg-canvas)] text-[var(--text-secondary)] border-[var(--border-hairline)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {dev.name
                      .replace('Samsung ', '')
                      .replace('Apple ', '')
                      .replace('Huawei ', '')}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Scrollable 2D Image + Full Specification Sheet Body */}
          <div className="p-5 overflow-y-auto overscroll-contain space-y-5 flex-1">
            {/* 2D Product Image + Title & Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5">
                <Product2DIllustration
                  kind="tech"
                  deviceCategory={focusedDevice.category}
                  brand={focusedDevice.brand}
                  name={focusedDevice.name}
                  primaryHex={activeFinish.hex}
                  accentHex={activeFinish.accentHex}
                  screenBadge={focusedDevice.screenBadge}
                  size="lg"
                />
              </div>

              <div className="sm:col-span-7 space-y-2">
                <div className="text-xs font-mono-tech uppercase text-[var(--accent)]">
                  {focusedDevice.brand} · {focusedDevice.releaseYear} ·{' '}
                  {focusedDevice.screenBadge}
                </div>
                <h2 className="font-editorial text-2xl sm:text-3xl font-bold leading-tight">
                  {focusedDevice.name}
                </h2>
                <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
                  {focusedDevice.summary[lang]}
                </p>
              </div>
            </div>

            {/* Live Pricing Badge */}
            <div className="pt-3 border-t border-[var(--border-hairline)]">
              <LivePriceBadge
                entry={focusedPriceEntry}
                storageDeltaUsd={activeStorage.priceDeltaUsd}
                currency={currency}
                lang={lang}
                priceAlertUsd={priceAlerts[focusedDevice.id] ?? null}
                onTogglePriceAlert={(targetUsd) =>
                  onTogglePriceAlert?.(focusedDevice.id, targetUsd)
                }
                onRefreshPrice={onRefreshPrice}
              />
            </div>

            {/* Finish & Storage Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[var(--border-hairline)]">
              <div className="space-y-2">
                <div className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)]">
                  {t.brandPage.finishes}:{' '}
                  <span className="text-[var(--text-primary)]">{activeFinish.name[lang]}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {focusedDevice.finishes.map((f) => {
                    const active = f.id === activeFinish.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFinishId(f.id)}
                        className={`h-8 px-2.5 rounded-lg border inline-flex items-center gap-1.5 text-xs transition-colors cursor-pointer ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                            : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                        }`}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: f.hex }}
                        />
                        <span>{f.name[lang]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[11px] font-mono-tech uppercase text-[var(--text-secondary)]">
                  {t.brandPage.storageConfig}
                </div>
                <div className="flex flex-wrap gap-2">
                  {focusedDevice.storageOptions.map((opt) => {
                    const active = opt.id === activeStorage.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setStorageId(opt.id)}
                        className={`h-8 px-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                          active
                            ? 'border-[var(--accent)] bg-[var(--bg-elevated)] font-semibold'
                            : 'border-[var(--border-hairline)] hover:border-[var(--accent)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Primary Actions: Add to Cart, AR, Compare, Full Page */}
            <div className="space-y-2.5 pt-2">
              {onAddToCart && (
                <button
                  type="button"
                  onClick={() => {
                    onAddToCart(focusedDevice.id, activeFinish.id, activeStorage.id);
                    setJustAdded(true);
                    setTimeout(() => setJustAdded(false), 1600);
                  }}
                  className="w-full py-3 rounded-xl bg-[var(--text-primary)] text-[var(--bg-canvas)] text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  {justAdded ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  <span>{justAdded ? t.brandPage.addedToBag : t.brandPage.addToBag}</span>
                </button>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {onOpenAR && (
                  <button
                    type="button"
                    onClick={() => onOpenAR(focusedDevice, activeFinish.id)}
                    className="py-2.5 px-3 rounded-xl bg-[var(--accent)] text-[#0B0C10] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>AR</span>
                  </button>
                )}

                {onCompareDevice && (
                  <button
                    type="button"
                    onClick={() => onCompareDevice(focusedDevice.id)}
                    className="py-2.5 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:border-[var(--accent)] transition-colors cursor-pointer"
                  >
                    <GitCompareArrows className="w-3.5 h-3.5" />
                    <span>{t.brandPage.compareThis}</span>
                  </button>
                )}

                {(onNavigate || onSelectDevice) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) {
                        onNavigate(focusedDevice.brand, focusedDevice.id);
                      } else if (onSelectDevice) {
                        onSelectDevice(focusedDevice);
                      }
                    }}
                    className="py-2.5 px-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:border-[var(--accent)] transition-colors cursor-pointer col-span-2 sm:col-span-1"
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>{lang === 'hy' ? 'Ամբողջ էջը' : 'Full Specs'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Structured Technical Specification Table */}
            <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
              <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[var(--accent)]">
                {lang === 'hy' ? 'Տեխնիկական Բնութագրեր' : 'Technical Specifications'}
              </div>
              <div className="rounded-2xl border border-[var(--border-hairline)] overflow-hidden divide-y divide-[var(--border-hairline)] text-xs">
                <div className="p-3 bg-[var(--bg-elevated)] grid grid-cols-3 gap-2">
                  <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                    {t.compare.processor}
                  </span>
                  <span className="col-span-2 font-medium">
                    {focusedDevice.specs.processor[lang]}
                  </span>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] grid grid-cols-3 gap-2">
                  <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                    {t.compare.display}
                  </span>
                  <span className="col-span-2 font-medium">
                    {focusedDevice.specs.display[lang]}
                  </span>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] grid grid-cols-3 gap-2">
                  <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                    {t.compare.camera}
                  </span>
                  <span className="col-span-2 font-medium">
                    {focusedDevice.specs.camera[lang]}
                  </span>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] grid grid-cols-3 gap-2">
                  <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                    {t.compare.battery}
                  </span>
                  <span className="col-span-2 font-medium">
                    {focusedDevice.specs.battery[lang]}
                  </span>
                </div>
                <div className="p-3 bg-[var(--bg-elevated)] grid grid-cols-3 gap-2">
                  <span className="font-mono-tech uppercase text-[var(--text-secondary)]">
                    {lang === 'hy' ? 'Կորպուս և Քաշ' : 'Material & Weight'}
                  </span>
                  <span className="col-span-2 font-medium">
                    {focusedDevice.specs.chassis[lang]} · {focusedDevice.weightGrams} g
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
         SINGLE CLEAN BOTTOM HUD: 1ST-PERSON 360° WALK & TURN PAD + ZOOM + FULLSCREEN
         ===================================================================== */}
      {!focusedDevice && !focusedApplianceCat && (
        <div className="absolute bottom-3 inset-x-3 sm:bottom-5 sm:inset-x-6 z-20 flex items-center justify-between gap-2 pointer-events-none">
          {/* Left: Compact Reset Center Button */}
          <button
            type="button"
            onClick={() => walkToSection('overview')}
            className="pointer-events-auto h-9 px-3 rounded-xl border border-white/15 bg-black/75 hover:border-[#E5A952] text-white/90 text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-md shadow-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-[#E5A952]" />
            <span>{lang === 'hy' ? 'Կենտրոն 360°' : 'Center 360°'}</span>
          </button>

          {/* Right: Compact Walk Pad + Zoom + HDR + Fullscreen */}
          <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5">
            {/* 360° First-Person Walk & Turn Pad */}
            <div
              className="inline-flex items-center rounded-xl border border-[#E5A952]/40 bg-black/80 backdrop-blur-md overflow-hidden shadow-lg"
              role="group"
              aria-label="360 First-Person Walk Controls"
            >
              <button
                type="button"
                onPointerDown={() => {
                  activeWalkInputsRef.current.turnLeft = true;
                }}
                onPointerUp={() => {
                  activeWalkInputsRef.current.turnLeft = false;
                }}
                onPointerLeave={() => {
                  activeWalkInputsRef.current.turnLeft = false;
                }}
                onClick={() => stepTurnYaw(-0.45)}
                title={lang === 'hy' ? 'Պտտվել 360° ձախ (← / Q)' : 'Turn 360° Left (← / Q)'}
                className="h-9 px-2.5 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  activeWalkInputsRef.current.forward = true;
                }}
                onPointerUp={() => {
                  activeWalkInputsRef.current.forward = false;
                }}
                onPointerLeave={() => {
                  activeWalkInputsRef.current.forward = false;
                }}
                onClick={() => stepWalkForward(1.4)}
                title={lang === 'hy' ? 'Քայլել առաջ (W / ↑)' : 'Walk Forward (W / ↑)'}
                className="h-9 px-2.5 border-l border-white/10 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs font-bold transition-colors cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5 text-[#E5A952]" />
                <span className="hidden sm:inline">{lang === 'hy' ? 'Քայլել' : 'Walk'}</span>
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  activeWalkInputsRef.current.backward = true;
                }}
                onPointerUp={() => {
                  activeWalkInputsRef.current.backward = false;
                }}
                onPointerLeave={() => {
                  activeWalkInputsRef.current.backward = false;
                }}
                onClick={() => stepWalkForward(-1.4)}
                title={lang === 'hy' ? 'Քայլել հետ (S / ↓)' : 'Walk Back (S / ↓)'}
                className="h-9 px-2.5 border-l border-white/10 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs transition-colors cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onPointerDown={() => {
                  activeWalkInputsRef.current.turnRight = true;
                }}
                onPointerUp={() => {
                  activeWalkInputsRef.current.turnRight = false;
                }}
                onPointerLeave={() => {
                  activeWalkInputsRef.current.turnRight = false;
                }}
                onClick={() => stepTurnYaw(0.45)}
                title={lang === 'hy' ? 'Պտտվել 360° աջ (→ / E)' : 'Turn 360° Right (→ / E)'}
                className="h-9 px-2.5 border-l border-white/10 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs transition-colors cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="inline-flex items-center rounded-xl border border-white/15 bg-black/75 backdrop-blur-md overflow-hidden">
              <button
                type="button"
                onClick={() => handleZoom(-5)}
                title={lang === 'hy' ? 'Մոտեցնել պատկերը' : 'Zoom In'}
                className="h-9 px-2.5 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center text-xs transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(5)}
                title={lang === 'hy' ? 'Հեռացնել պատկերը' : 'Zoom Out'}
                className="h-9 px-2.5 border-l border-white/10 text-white/90 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center text-xs transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* HDR FX Toggle Button */}
            <button
              type="button"
              onClick={() => setPostFxEnabled((v) => !v)}
              title={
                lang === 'hy'
                  ? 'Միացնել/Անջատել HDR և Կինո-Էֆեկտները'
                  : 'Toggle HDR & Film Grain FX'
              }
              className={`h-9 px-2.5 rounded-xl border text-xs font-mono-tech inline-flex items-center gap-1 backdrop-blur-md transition-colors cursor-pointer ${
                postFxEnabled
                  ? 'border-[#E5A952]/60 bg-[#E5A952]/20 text-[#E5A952] font-bold'
                  : 'border-white/15 bg-black/75 text-white/70 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">HDR FX</span>
            </button>

            {/* Fullscreen Expand Button */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="h-9 px-3 rounded-xl border border-[#E5A952] bg-[#E5A952] text-[#080709] hover:opacity-95 text-xs font-bold inline-flex items-center gap-1.5 shadow-[0_0_20px_rgba(229,169,82,0.35)] transition-all cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {lang === 'hy' ? 'Փոքրացնել' : 'Exit'}
                  </span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {lang === 'hy' ? 'Ամբողջ էկրանով' : 'Fullscreen'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
