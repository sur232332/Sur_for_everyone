import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
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
  Compass,
  Footprints,
  RotateCcw,
} from 'lucide-react';
import {
  APPLIANCE_MODELS,
  ApplianceCategoryId,
  HomeZoneId,
} from '../data/homeGuideData';
import { DEVICES } from '../data/devices';
import {
  ApplianceInteractiveState,
  BuiltApplianceRig,
  buildSingleAppliance,
  createArchitecturalWoodWallTextures,
  updateApplianceRigAnimation,
} from '../three/buildHomeAppliances';
import { buildDeviceModel } from '../three/buildDeviceModel';
import { Language } from '../types/hardware';

interface HomeApartment3DProps {
  activeZone: HomeZoneId;
  selectedCategory: ApplianceCategoryId | null;
  onSelectCategory: (cat: ApplianceCategoryId) => void;
  onSelectTechDevice?: (deviceId: string) => void;
  interactiveStates: Record<ApplianceCategoryId, ApplianceInteractiveState>;
  darkMode: boolean;
  lang: Language;
  scrollProgress?: number;
  fullScreen?: boolean;
}

interface FloatingBadgePos {
  key: string;
  kind: 'appliance' | 'tech';
  zone: Exclude<HomeZoneId, 'all'>;
  category?: ApplianceCategoryId;
  deviceId?: string;
  brand: string;
  label: string;
  subLabel: string;
  priceUsd: number;
  x: number;
  y: number;
  visible: boolean;
}

interface HomeHallExhibitDef {
  key: string;
  kind: 'appliance' | 'tech';
  zone: Exclude<HomeZoneId, 'all'>;
  category?: ApplianceCategoryId;
  deviceId?: string;
  brand: string;
  title: { hy: string; en: string; ru: string };
  subLabel: string;
  priceUsd: number;
  position: [number, number, number];
  rotationY: number;
  finishTintHex?: number;
}

/**
 * 16 Exhibits arranged around all 4 walls of the enlarged 28m × 24m Home Appliances Hall:
 * - NORTH WALL (z = -9.2, facing South ry = 0): 4 Flagship Refrigerators
 * - EAST WALL  (x = +10.6, facing West ry = -PI/2): 2 Gas Stoves + 2 Inverter Microwaves
 * - WEST WALL  (x = -10.6, facing East ry = +PI/2): 2 Washing Machines + 2 Heat-Pump Dryers
 * - SOUTH WALL (z = +9.2, facing North ry = PI): 4 Studio & Home Appliances
 */
const HOME_HALL_EXHIBITS: HomeHallExhibitDef[] = [
  // ================= NORTH WALL: 4 REFRIGERATORS (Kitchen Cooling Wing) =================
  {
    key: 'rf-samsung-rf29',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'refrigerator',
    brand: 'Samsung',
    title: {
      hy: 'Samsung Bespoke 4-Door Flex',
      en: 'Samsung Bespoke 4-Door Flex',
      ru: 'Samsung Bespoke 4-Door Flex',
    },
    subLabel: '635 L · A+++ · Twin Cooling Plus',
    priceUsd: 2199,
    position: [-7.5, 0, -9.2],
    rotationY: 0,
    finishTintHex: 0xcfd4dc,
  },
  {
    key: 'rf-lg-instaview',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'refrigerator',
    brand: 'LG',
    title: {
      hy: 'LG InstaView Door-in-Door',
      en: 'LG InstaView Door-in-Door',
      ru: 'LG InstaView Door-in-Door',
    },
    subLabel: '617 L · A+++ · LinearCooling',
    priceUsd: 2049,
    position: [-2.5, 0, -9.2],
    rotationY: 0,
    finishTintHex: 0x3b3f46,
  },
  {
    key: 'rf-bosch-kgn86',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'refrigerator',
    brand: 'Bosch',
    title: {
      hy: 'Bosch Serie 6 XXL NoFrost',
      en: 'Bosch Serie 6 XXL NoFrost',
      ru: 'Bosch Serie 6 XXL NoFrost',
    },
    subLabel: '631 L · A++ · VitaFresh XXL',
    priceUsd: 1899,
    position: [2.5, 0, -9.2],
    rotationY: 0,
    finishTintHex: 0xd8dde4,
  },
  {
    key: 'rf-whirlpool-wq70',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'refrigerator',
    brand: 'Whirlpool',
    title: {
      hy: 'Whirlpool 6th Sense Cross-Door',
      en: 'Whirlpool 6th Sense Cross-Door',
      ru: 'Whirlpool 6th Sense Cross-Door',
    },
    subLabel: '594 L · A++ · Dual NoFrost',
    priceUsd: 1749,
    position: [7.5, 0, -9.2],
    rotationY: 0,
    finishTintHex: 0x565b63,
  },

  // ================= EAST WALL: GAS STOVES & MICROWAVES (Kitchen Cooking Wing) =================
  {
    key: 'gs-bosch-hga',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'gas_stove',
    brand: 'Bosch',
    title: {
      hy: 'Bosch Serie 4 (60 սմ Գազօջախ)',
      en: 'Bosch Serie 4 (60 cm Gas Range)',
      ru: 'Bosch Serie 4 (60 см Газовая плита)',
    },
    subLabel: '71 L · 4 Burners · Cast Iron',
    priceUsd: 899,
    position: [10.6, 0, -6.3],
    rotationY: -Math.PI / 2,
  },
  {
    key: 'gs-beko-fse62',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'gas_stove',
    brand: 'Beko',
    title: {
      hy: 'Beko bPRO 500 Գազօջախ',
      en: 'Beko bPRO 500 Gas Stove',
      ru: 'Beko bPRO 500 Газовая плита',
    },
    subLabel: '72 L · High-Efficiency Burners',
    priceUsd: 789,
    position: [10.6, 0, -2.1],
    rotationY: -Math.PI / 2,
    finishTintHex: 0x2c2f34,
  },
  {
    key: 'mw-panasonic-nn',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'microwave',
    brand: 'Panasonic',
    title: {
      hy: 'Panasonic Inverter Միկրոալիքային',
      en: 'Panasonic Cyclonic Inverter Microwave',
      ru: 'Микроволновая печь Panasonic Inverter',
    },
    subLabel: '34 L · 1000W · Cyclonic Inverter',
    priceUsd: 429,
    position: [10.6, 0, 2.1],
    rotationY: -Math.PI / 2,
  },
  {
    key: 'mw-samsung-mc32',
    kind: 'appliance',
    zone: 'kitchen',
    category: 'microwave',
    brand: 'Samsung',
    title: {
      hy: 'Samsung BESPOKE Smart Oven',
      en: 'Samsung BESPOKE Smart Microwave',
      ru: 'Samsung BESPOKE Микроволновая печь',
    },
    subLabel: '32 L · 900W · Convection + Grill',
    priceUsd: 399,
    position: [10.6, 0, 6.3],
    rotationY: -Math.PI / 2,
  },

  // ================= WEST WALL: WASHING MACHINES & DRYERS (Laundry Care Wing) =================
  {
    key: 'wm-lg-f4v5',
    kind: 'appliance',
    zone: 'laundry',
    category: 'washing_machine',
    brand: 'LG',
    title: {
      hy: 'LG AI DD Լվացքի Մեքենա',
      en: 'LG AI DD Direct-Drive Washer',
      ru: 'Стиральная машина LG AI DD',
    },
    subLabel: '10.5 kg · 1400 RPM · Steam+',
    priceUsd: 1099,
    position: [-10.6, 0, -6.3],
    rotationY: Math.PI / 2,
  },
  {
    key: 'wm-bosch-wgg24',
    kind: 'appliance',
    zone: 'laundry',
    category: 'washing_machine',
    brand: 'Bosch',
    title: {
      hy: 'Bosch Serie 6 ActiveWater Plus',
      en: 'Bosch Serie 6 Front-Load Washer',
      ru: 'Стиральная машина Bosch Serie 6',
    },
    subLabel: '9 kg · 1400 RPM · EcoSilence Drive',
    priceUsd: 1049,
    position: [-10.6, 0, -2.1],
    rotationY: Math.PI / 2,
    finishTintHex: 0xdce1e8,
  },
  {
    key: 'dr-electrolux-ew8h',
    kind: 'appliance',
    zone: 'laundry',
    category: 'dryer',
    brand: 'Electrolux',
    title: {
      hy: 'Electrolux DelicateCare Չորանոց',
      en: 'Electrolux DelicateCare Heat-Pump Dryer',
      ru: 'Сушильная машина Electrolux',
    },
    subLabel: '9 kg · A+++ · Heat Pump',
    priceUsd: 1149,
    position: [-10.6, 0, 2.1],
    rotationY: Math.PI / 2,
  },
  {
    key: 'dr-samsung-dv90',
    kind: 'appliance',
    zone: 'laundry',
    category: 'dryer',
    brand: 'Samsung',
    title: {
      hy: 'Samsung OptimalDry AI Չորանոց',
      en: 'Samsung OptimalDry AI Heat-Pump Dryer',
      ru: 'Сушильная машина Samsung OptimalDry',
    },
    subLabel: '9 kg · A+++ · Digital Inverter',
    priceUsd: 1199,
    position: [-10.6, 0, 6.3],
    rotationY: Math.PI / 2,
    finishTintHex: 0x34383f,
  },

  // ================= SOUTH WALL: STUDIO DESKS & SMART HOME (Office Wing) =================
  {
    key: 'lp-macbook-pro16',
    kind: 'appliance',
    zone: 'office',
    category: 'laptop',
    brand: 'Apple',
    title: {
      hy: 'MacBook Pro 16" (M4 Max) Ստուդիա',
      en: 'MacBook Pro 16" (M4 Max) Studio Desk',
      ru: 'MacBook Pro 16" (M4 Max) Студия',
    },
    subLabel: '16.2" Liquid Retina XDR · 128GB',
    priceUsd: 3499,
    position: [-6.8, 0, 9.2],
    rotationY: Math.PI,
  },
  {
    key: 'lp-asus-proart16',
    kind: 'appliance',
    zone: 'office',
    category: 'laptop',
    brand: 'ASUS',
    title: {
      hy: 'ASUS ProArt P16 (4K OLED) Սեղան',
      en: 'ASUS ProArt P16 Creator Workstation',
      ru: 'ASUS ProArt P16 Рабочая станция',
    },
    subLabel: '16" 4K OLED · RTX 4070 · 64GB',
    priceUsd: 2699,
    position: [-2.2, 0, 9.2],
    rotationY: Math.PI,
  },
  {
    key: 'tech-galaxy-s25-ultra',
    kind: 'tech',
    zone: 'office',
    deviceId: 'galaxy-s25-ultra',
    brand: 'Samsung',
    title: {
      hy: 'Galaxy S25 Ultra SmartThings Hub',
      en: 'Galaxy S25 Ultra SmartThings Hub',
      ru: 'Galaxy S25 Ultra Умный дом',
    },
    subLabel: '6.9" Dynamic AMOLED · SD 8 Elite',
    priceUsd: 1299,
    position: [2.2, 0, 9.2],
    rotationY: Math.PI,
  },
  {
    key: 'tech-iphone-16-pro-max',
    kind: 'tech',
    zone: 'office',
    deviceId: 'iphone-16-pro-max',
    brand: 'Apple',
    title: {
      hy: 'iPhone 16 Pro Max Apple Home',
      en: 'iPhone 16 Pro Max Apple Home Hub',
      ru: 'iPhone 16 Pro Max Умный дом',
    },
    subLabel: '6.9" Super Retina XDR · A18 Pro',
    priceUsd: 1199,
    position: [6.8, 0, 9.2],
    rotationY: Math.PI,
  },
];

// Zone camera presets (pos + yaw + pitch) inside the enlarged 28m × 24m 360° room
const ZONE_VIEW_PRESETS: Record<
  HomeZoneId,
  { pos: [number, number, number]; yaw: number; pitch: number }
> = {
  all: { pos: [0, 1.68, 3.0], yaw: 0, pitch: -0.04 }, // Looking North at Refrigerators & room
  kitchen: { pos: [3.2, 1.68, -1.6], yaw: -0.68, pitch: -0.05 }, // Facing North-East (Fridges + Stoves + Microwaves)
  laundry: { pos: [-4.2, 1.68, 0.0], yaw: Math.PI / 2, pitch: -0.05 }, // Facing West wall (Washers + Dryers)
  office: { pos: [0, 1.68, 2.4], yaw: Math.PI, pitch: -0.05 }, // Facing South wall (Studio Desks + Smart Home)
};

// Stage 4: Subtle Film Grain + Architectural Vignette Final Shader Pass
const HOME_GRAIN_VIGNETTE_SHADER = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uGrainStrength: { value: 0.02 },
    uVignetteOffset: { value: 1.04 },
    uVignetteDarkness: { value: 0.36 },
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

export const HomeApartment3D: React.FC<HomeApartment3DProps> = ({
  activeZone,
  selectedCategory,
  onSelectCategory,
  onSelectTechDevice,
  interactiveStates,
  darkMode,
  lang,
  fullScreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);
  const [webglError, setWebglError] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [badgePositions, setBadgePositions] = useState<FloatingBadgePos[]>([]);

  const activeZoneRef = useRef<HomeZoneId>(activeZone);
  const selectedCategoryRef = useRef<ApplianceCategoryId | null>(selectedCategory);
  const hoveredKeyRef = useRef<string | null>(null);
  const interactiveStatesRef = useRef(interactiveStates);

  // First-person 360° free-walk camera state
  const currentCamPosRef = useRef(new THREE.Vector3(0, 1.68, 2.2));
  const targetCamPosRef = useRef(new THREE.Vector3(0, 1.68, 2.2));
  const currentYawRef = useRef(0);
  const targetYawRef = useRef(0);
  const currentPitchRef = useRef(-0.05);
  const targetPitchRef = useRef(-0.05);

  const walkInputRef = useRef<{ forward: number; strafe: number; turn: number }>({
    forward: 0,
    strafe: 0,
    turn: 0,
  });
  const keysPressedRef = useRef<Set<string>>(new Set());

  // When activeZone changes from top pills, orient camera toward that wing
  useEffect(() => {
    activeZoneRef.current = activeZone;
    const preset = ZONE_VIEW_PRESETS[activeZone] || ZONE_VIEW_PRESETS.all;
    targetCamPosRef.current.set(...preset.pos);
    // Shortest angular path for yaw
    let deltaYaw = preset.yaw - currentYawRef.current;
    deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw));
    targetYawRef.current = currentYawRef.current + deltaYaw;
    targetPitchRef.current = preset.pitch;
  }, [activeZone]);

  // When a specific appliance category is selected, step in front of its first exhibit
  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
    if (selectedCategory) {
      const ex = HOME_HALL_EXHIBITS.find((e) => e.category === selectedCategory);
      if (ex) {
        const frontDir = new THREE.Vector3(0, 0, 1).applyAxisAngle(
          new THREE.Vector3(0, 1, 0),
          ex.rotationY
        );
        const standPos = new THREE.Vector3(...ex.position).addScaledVector(frontDir, 3.1);
        targetCamPosRef.current.set(standPos.x, 1.68, standPos.z);

        const lookDx = ex.position[0] - standPos.x;
        const lookDz = ex.position[2] - standPos.z;
        const desiredYaw = Math.atan2(-lookDx, -lookDz);
        let deltaYaw = desiredYaw - currentYawRef.current;
        deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw));
        targetYawRef.current = currentYawRef.current + deltaYaw;
        targetPitchRef.current = -0.07;
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    interactiveStatesRef.current = interactiveStates;
  }, [interactiveStates]);

  // Keyboard WASD + Arrow keys + Q/E 360° walking & turning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const key = e.key.toLowerCase();
      if (
        ['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(
          key
        )
      ) {
        keysPressedRef.current.add(key);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressedRef.current.delete(key);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let pmremGenerator: THREE.PMREMGenerator | null = null;
    let envTarget: THREE.WebGLRenderTarget | null = null;
    let composer: EffectComposer | null = null;
    let animId = 0;

    setLoading(true);
    setLoadProgress(25);

    try {
      const w = Math.max(container.clientWidth, 300);
      const h = Math.max(container.clientHeight, 360);

      const isSoftwareGl = (() => {
        try {
          const probe = document.createElement('canvas').getContext('webgl2');
          if (!probe) return true;
          const ext = probe.getExtension('WEBGL_debug_renderer_info');
          const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
          const gpu = String(probe.getParameter(param) || '');
          probe.getExtension('WEBGL_lose_context')?.loseContext();
          return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
        } catch {
          return true;
        }
      })();

      const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
      const maxDpr = isSoftwareGl ? 1 : isMobile ? 1.5 : 2;
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, maxDpr)
      );
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

      setLoadProgress(50);

      const scene = new THREE.Scene();
      const bgHex = darkMode ? 0x0b0a0d : 0x151213;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, 0.015);

      pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.45;

      const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 65);
      camera.position.copy(currentCamPosRef.current);

      // Ambient & Directional Hall Lighting
      const hemiLight = new THREE.HemisphereLight(0xfff2e2, 0x1a1514, 0.55);
      scene.add(hemiLight);

      const dirLight = new THREE.DirectionalLight(0xfff1dc, 0.75);
      dirLight.position.set(4.5, 8.5, 5.5);
      if (!isSoftwareGl) {
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 1024;
        dirLight.shadow.mapSize.height = 1024;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 28;
        const d = 11;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.bias = -0.0005;
      }
      scene.add(dirLight);

      // =========================================================================
      // BUILD 360° ARCHITECTURAL HOME & MAJOR APPLIANCES HALL (20m × 18m)
      // =========================================================================
      const hallGroup = new THREE.Group();
      scene.add(hallGroup);

      const woodTextures = createArchitecturalWoodWallTextures(darkMode);
      const wallMat = new THREE.MeshStandardMaterial({
        map: woodTextures.map,
        normalMap: woodTextures.normalMap,
        normalScale: new THREE.Vector2(0.35, 0.35),
        roughness: 0.65,
        metalness: 0.08,
      });

      const brassMat = new THREE.MeshStandardMaterial({
        color: 0xd49a45,
        roughness: 0.24,
        metalness: 0.88,
      });

      const darkStoneFloorMat = new THREE.MeshStandardMaterial({
        color: 0x161418,
        roughness: 0.22,
        metalness: 0.2,
      });

      // Floor (28m × 24m) — pickable for click-to-walk, no center glare ring
      const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), darkStoneFloorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      hallGroup.add(floorMesh);

      // Click-to-Walk Floor Target Ring
      const walkRingGroup = new THREE.Group();
      walkRingGroup.position.set(0, 0.012, 3.0);
      walkRingGroup.visible = false;
      const walkRingOuter = new THREE.Mesh(
        new THREE.RingGeometry(0.24, 0.31, 32),
        new THREE.MeshBasicMaterial({
          color: 0xe5a952,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
        })
      );
      walkRingOuter.rotation.x = -Math.PI / 2;
      walkRingGroup.add(walkRingOuter);
      scene.add(walkRingGroup);

      // 4 Perimeter Slatted Wood Walls (North z=-11.4, South z=+11.4, West x=-12.6, East x=+12.6)
      const wallHeight = 4.6;
      const northWall = new THREE.Mesh(new THREE.BoxGeometry(26, wallHeight, 0.35), wallMat);
      northWall.position.set(0, wallHeight / 2, -11.4);
      hallGroup.add(northWall);

      const southWall = new THREE.Mesh(new THREE.BoxGeometry(26, wallHeight, 0.35), wallMat);
      southWall.position.set(0, wallHeight / 2, 11.4);
      hallGroup.add(southWall);

      const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallHeight, 23.2), wallMat);
      westWall.position.set(-12.6, wallHeight / 2, 0);
      hallGroup.add(westWall);

      const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.35, wallHeight, 23.2), wallMat);
      eastWall.position.set(12.6, wallHeight / 2, 0);
      hallGroup.add(eastWall);

      // Brass Horizontal Gallery Rails along all 4 walls
      const railN = new THREE.Mesh(new THREE.BoxGeometry(25.0, 0.04, 0.06), brassMat);
      railN.position.set(0, 1.35, -11.18);
      hallGroup.add(railN);
      const railS = railN.clone();
      railS.position.set(0, 1.35, 11.18);
      hallGroup.add(railS);

      const railW = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 22.4), brassMat);
      railW.position.set(-12.38, 1.35, 0);
      hallGroup.add(railW);
      const railE = railW.clone();
      railE.position.set(12.38, 1.35, 0);
      hallGroup.add(railE);

      // Ceiling & Warm Light Strips (subtle so HDR FX has zero harsh center glare)
      const ceilingMat = new THREE.MeshStandardMaterial({
        color: 0x09080b,
        roughness: 0.9,
      });
      const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), ceilingMat);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = wallHeight;
      hallGroup.add(ceiling);

      const lightStripMat = new THREE.MeshBasicMaterial({ color: 0xdba25e });
      for (const lx of [-7.5, 0, 7.5]) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 18.5), lightStripMat);
        strip.position.set(lx, wallHeight - 0.03, 0);
        hallGroup.add(strip);
      }

      setLoadProgress(72);

      // =========================================================================
      // POPULATE ALL 16 APPLIANCE & SMART-HOME EXHIBITS AROUND THE 4 WALLS
      // =========================================================================
      const plinthMat = new THREE.MeshStandardMaterial({
        color: 0x221d20,
        roughness: 0.38,
        metalness: 0.25,
      });
      const crimsonCarpetMat = new THREE.MeshStandardMaterial({
        color: 0x5c1922,
        roughness: 0.78,
        metalness: 0.05,
      });
      const counterWalnutMat = new THREE.MeshStandardMaterial({
        color: 0x3b281e,
        roughness: 0.42,
        metalness: 0.1,
      });

      const pickableMeshes: THREE.Object3D[] = [];
      const exhibitRigs: Array<{
        def: HomeHallExhibitDef;
        applianceRig?: BuiltApplianceRig;
        rootGroup: THREE.Group;
        labelAnchorLocal: THREE.Vector3;
      }> = [];

      HOME_HALL_EXHIBITS.forEach((def) => {
        const holder = new THREE.Group();
        holder.position.set(...def.position);
        holder.rotation.y = def.rotationY;
        hallGroup.add(holder);

        // Stage Plinth under every exhibit with brass trim & crimson carpet top
        const plinthW = def.category === 'refrigerator' ? 1.55 : 1.4;
        const plinthD = 1.25;
        const plinthH = 0.08;

        const basePlinth = new THREE.Mesh(
          new THREE.BoxGeometry(plinthW, plinthH, plinthD),
          plinthMat
        );
        basePlinth.position.y = plinthH / 2;
        basePlinth.receiveShadow = true;
        holder.add(basePlinth);

        const carpetTop = new THREE.Mesh(
          new THREE.BoxGeometry(plinthW - 0.08, 0.015, plinthD - 0.08),
          crimsonCarpetMat
        );
        carpetTop.position.y = plinthH + 0.007;
        holder.add(carpetTop);

        // Overhead Spotlight per Exhibit
        const spot = new THREE.SpotLight(0xffe9c8, 2.4, 8.5, Math.PI / 4.5, 0.65, 1.3);
        spot.position.set(0, 3.85, 1.15);
        spot.target.position.set(0, 0.9, 0);
        holder.add(spot);
        holder.add(spot.target);

        let labelAnchorLocal = new THREE.Vector3(0, 1.95, 0);

        if (def.kind === 'appliance' && def.category) {
          const rig = buildSingleAppliance(def.category);

          // For microwaves or laptops, place a sleek walnut counter/desk underneath
          if (def.category === 'microwave' || def.category === 'laptop') {
            const deskH = 0.78;
            const deskMesh = new THREE.Mesh(
              new THREE.BoxGeometry(1.15, deskH, 0.76),
              counterWalnutMat
            );
            deskMesh.position.set(0, plinthH + deskH / 2, 0);
            deskMesh.castShadow = true;
            deskMesh.receiveShadow = true;
            holder.add(deskMesh);

            rig.root.position.set(0, plinthH + deskH + 0.01, 0);
            labelAnchorLocal = new THREE.Vector3(0, plinthH + deskH + 0.68, 0);
          } else {
            rig.root.position.set(0, plinthH + 0.01, 0);
            labelAnchorLocal = rig.labelAnchorLocal
              .clone()
              .add(new THREE.Vector3(0, plinthH + 0.12, 0));
          }

          // Optional finish tint variation so the 4 fridges / washers look distinct
          if (def.finishTintHex !== undefined) {
            rig.root.traverse((child) => {
              const mesh = child as THREE.Mesh;
              if (mesh.isMesh && mesh.material) {
                const mat = mesh.material as THREE.MeshStandardMaterial;
                if (mat.metalness !== undefined && mat.metalness > 0.45 && mat.color) {
                  const cloned = mat.clone();
                  cloned.color.setHex(def.finishTintHex!);
                  mesh.material = cloned;
                }
              }
            });
          }

          rig.root.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.userData.exhibitKey = def.key;
              child.userData.applianceCategory = def.category;
              pickableMeshes.push(child);
            }
          });

          holder.add(rig.root);
          exhibitRigs.push({
            def,
            applianceRig: rig,
            rootGroup: holder,
            labelAnchorLocal,
          });
        } else if (def.kind === 'tech' && def.deviceId) {
          const devSpec = DEVICES.find((d) => d.id === def.deviceId) || DEVICES[0];
          const pedH = 0.96;
          const ped = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, pedH, 0.75),
            counterWalnutMat
          );
          ped.position.set(0, plinthH + pedH / 2, 0);
          holder.add(ped);

          const builtDev = buildDeviceModel(devSpec, devSpec.finishes[0]);
          builtDev.root.scale.setScalar(0.18);
          builtDev.root.position.set(0, plinthH + pedH + 0.34, 0);
          builtDev.root.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
              child.userData.exhibitKey = def.key;
              child.userData.techDeviceId = def.deviceId;
              pickableMeshes.push(child);
            }
          });
          holder.add(builtDev.root);

          labelAnchorLocal = new THREE.Vector3(0, plinthH + pedH + 0.85, 0);
          exhibitRigs.push({
            def,
            rootGroup: holder,
            labelAnchorLocal,
          });
        }
      });

      let filmGrainPass: ShaderPass | null = null;
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
        filmGrainPass = new ShaderPass(HOME_GRAIN_VIGNETTE_SHADER);
        composer.addPass(filmGrainPass);
        composer.addPass(new OutputPass());
      }

      // =========================================================================
      // POINTER INTERACTION: 360° DRAG LOOK + CLICK EXHIBIT OR CLICK FLOOR TO WALK
      // =========================================================================
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let isDraggingLook = false;
      let pointerDownPos = { x: 0, y: 0 };
      let lastPointerPos = { x: 0, y: 0 };

      const getHoveredExhibit = (clientX: number, clientY: number): HomeHallExhibitDef | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickableMeshes, false);
        if (hits.length > 0) {
          const exKey = hits[0].object.userData?.exhibitKey;
          if (exKey) {
            return HOME_HALL_EXHIBITS.find((e) => e.key === exKey) || null;
          }
        }
        return null;
      };

      const onPointerDown = (e: PointerEvent) => {
        isDraggingLook = true;
        pointerDownPos = { x: e.clientX, y: e.clientY };
        lastPointerPos = { x: e.clientX, y: e.clientY };
        renderer.domElement.style.cursor = 'grabbing';
      };

      const onPointerMove = (e: PointerEvent) => {
        if (isDraggingLook) {
          const dx = e.clientX - lastPointerPos.x;
          const dy = e.clientY - lastPointerPos.y;
          lastPointerPos = { x: e.clientX, y: e.clientY };
          // Unrestricted 360° yaw rotation + clamped pitch
          targetYawRef.current -= dx * 0.0045;
          targetPitchRef.current = THREE.MathUtils.clamp(
            targetPitchRef.current - dy * 0.0032,
            -0.62,
            0.52
          );
          return;
        }

        const hit = getHoveredExhibit(e.clientX, e.clientY);
        const nextKey = hit ? hit.key : null;
        if (nextKey !== hoveredKeyRef.current) {
          hoveredKeyRef.current = nextKey;
          setHoveredKey(nextKey);
          renderer.domElement.style.cursor = nextKey ? 'pointer' : 'grab';
        }
      };

      const onPointerUp = (e: PointerEvent) => {
        isDraggingLook = false;
        renderer.domElement.style.cursor = hoveredKeyRef.current ? 'pointer' : 'grab';

        const moveDist = Math.hypot(
          e.clientX - pointerDownPos.x,
          e.clientY - pointerDownPos.y
        );
        if (moveDist < 7) {
          const hitEx = getHoveredExhibit(e.clientX, e.clientY);
          if (hitEx) {
            if (hitEx.kind === 'appliance' && hitEx.category) {
              onSelectCategory(hitEx.category);
            } else if (hitEx.kind === 'tech' && hitEx.deviceId && onSelectTechDevice) {
              onSelectTechDevice(hitEx.deviceId);
            }
            return;
          }

          // Otherwise check if user clicked on the floor to walk there
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const floorHits = raycaster.intersectObject(floorMesh, false);
          if (floorHits.length > 0) {
            const pt = floorHits[0].point;
            const clampedX = THREE.MathUtils.clamp(pt.x, -9.2, 9.2);
            const clampedZ = THREE.MathUtils.clamp(pt.z, -7.8, 7.8);
            targetCamPosRef.current.set(clampedX, 1.68, clampedZ);
            walkRingGroup.position.set(clampedX, 0.015, clampedZ);
            walkRingGroup.visible = true;
          }
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);

      const handleResize = () => {
        if (!container) return;
        const nw = Math.max(container.clientWidth, 300);
        const nh = Math.max(container.clientHeight, 360);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
        composer?.setSize(nw, nh);
      };
      window.addEventListener('resize', handleResize);

      setLoadProgress(100);
      setLoading(false);

      let lastTime = performance.now();
      let badgeFrameCounter = 0;
      const projVec = new THREE.Vector3();
      const lookDir = new THREE.Vector3();

      const animate = (now: number) => {
        animId = requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const elapsed = now / 1000;

        // 1. Process keyboard + on-screen 360° Walk & Turn controls
        let moveForward = walkInputRef.current.forward;
        let moveStrafe = walkInputRef.current.strafe;
        let turnRate = walkInputRef.current.turn;

        if (keysPressedRef.current.has('w') || keysPressedRef.current.has('arrowup')) {
          moveForward += 1;
        }
        if (keysPressedRef.current.has('s') || keysPressedRef.current.has('arrowdown')) {
          moveForward -= 1;
        }
        if (keysPressedRef.current.has('a')) {
          moveStrafe -= 1;
        }
        if (keysPressedRef.current.has('d')) {
          moveStrafe += 1;
        }
        if (keysPressedRef.current.has('arrowleft') || keysPressedRef.current.has('q')) {
          turnRate += 1;
        }
        if (keysPressedRef.current.has('arrowright') || keysPressedRef.current.has('e')) {
          turnRate -= 1;
        }

        if (Math.abs(turnRate) > 0.01) {
          targetYawRef.current += turnRate * 1.85 * dt;
        }

        if (Math.abs(moveForward) > 0.01 || Math.abs(moveStrafe) > 0.01) {
          const walkSpeed = 4.6 * dt;
          const sinY = Math.sin(currentYawRef.current);
          const cosY = Math.cos(currentYawRef.current);
          // Forward vector in XZ plane for yaw
          const fwdX = -sinY;
          const fwdZ = -cosY;
          const rightX = cosY;
          const rightZ = -sinY;

          targetCamPosRef.current.x = THREE.MathUtils.clamp(
            targetCamPosRef.current.x + (fwdX * moveForward + rightX * moveStrafe) * walkSpeed,
            -9.2,
            9.2
          );
          targetCamPosRef.current.z = THREE.MathUtils.clamp(
            targetCamPosRef.current.z + (fwdZ * moveForward + rightZ * moveStrafe) * walkSpeed,
            -7.8,
            7.8
          );
          walkRingGroup.visible = false;
        }

        // Smoothly damp camera position & 360° look orientation
        currentCamPosRef.current.x = THREE.MathUtils.damp(
          currentCamPosRef.current.x,
          targetCamPosRef.current.x,
          6.5,
          dt
        );
        currentCamPosRef.current.y = THREE.MathUtils.damp(
          currentCamPosRef.current.y,
          targetCamPosRef.current.y,
          6.5,
          dt
        );
        currentCamPosRef.current.z = THREE.MathUtils.damp(
          currentCamPosRef.current.z,
          targetCamPosRef.current.z,
          6.5,
          dt
        );

        currentYawRef.current = THREE.MathUtils.damp(
          currentYawRef.current,
          targetYawRef.current,
          8.0,
          dt
        );
        currentPitchRef.current = THREE.MathUtils.damp(
          currentPitchRef.current,
          targetPitchRef.current,
          8.0,
          dt
        );

        camera.position.copy(currentCamPosRef.current);

        const cosPitch = Math.cos(currentPitchRef.current);
        lookDir.set(
          -Math.sin(currentYawRef.current) * cosPitch,
          Math.sin(currentPitchRef.current),
          -Math.cos(currentYawRef.current) * cosPitch
        );
        camera.lookAt(
          camera.position.x + lookDir.x * 10,
          camera.position.y + lookDir.y * 10,
          camera.position.z + lookDir.z * 10
        );

        if (walkRingGroup.visible) {
          const distToRing = Math.hypot(
            camera.position.x - walkRingGroup.position.x,
            camera.position.z - walkRingGroup.position.z
          );
          if (distToRing < 0.35) {
            walkRingGroup.visible = false;
          }
        }

        // 2. Animate Appliance Rigs (opening doors, burner flames, spinning drums)
        exhibitRigs.forEach(({ def, applianceRig }) => {
          if (applianceRig && def.category) {
            const st = interactiveStatesRef.current[def.category] || {
              doorOpen: false,
              secondaryActive: false,
            };
            const isHighlighted =
              hoveredKeyRef.current === def.key ||
              selectedCategoryRef.current === def.category;
            updateApplianceRigAnimation(applianceRig, st, isHighlighted, dt, elapsed);
          }
        });

        if (composer) {
          if (filmGrainPass?.uniforms?.uTime) {
            filmGrainPass.uniforms.uTime.value = elapsed;
          }
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        // 3. Project Floating Price + Parameter Tags for visible appliances
        badgeFrameCounter++;
        if (badgeFrameCounter % 3 === 0) {
          const cw = renderer.domElement.clientWidth;
          const ch = renderer.domElement.clientHeight;
          const nextBadges: FloatingBadgePos[] = [];

          exhibitRigs.forEach(({ def, rootGroup, labelAnchorLocal }) => {
            projVec.copy(labelAnchorLocal);
            rootGroup.localToWorld(projVec);
            const dist = camera.position.distanceTo(projVec);
            projVec.project(camera);
            const visible =
              projVec.z < 1 &&
              projVec.z > -1 &&
              dist < 18.5 &&
              projVec.x >= -0.95 &&
              projVec.x <= 0.95 &&
              projVec.y >= -0.9 &&
              projVec.y <= 0.9;
            const x = (projVec.x * 0.5 + 0.5) * cw;
            const y = (-projVec.y * 0.5 + 0.5) * ch;

            nextBadges.push({
              key: def.key,
              kind: def.kind,
              zone: def.zone,
              category: def.category,
              deviceId: def.deviceId,
              brand: def.brand,
              label: def.title[lang],
              subLabel: def.subLabel,
              priceUsd: def.priceUsd,
              x,
              y,
              visible,
            });
          });

          setBadgePositions(nextBadges);
        }
      };

      animId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        scene.traverse((obj: THREE.Object3D) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.isMesh) {
            mesh.geometry?.dispose();
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((m) => m?.dispose());
          }
        });
        composer?.dispose();
        envTarget?.dispose();
        pmremGenerator?.dispose();
        renderer.dispose();
      };
    } catch (err) {
      console.error('WebGL error in HomeApartment3D:', err);
      setWebglError(true);
      setLoading(false);
      return;
    }
  }, [darkMode, lang, fullScreen, onSelectCategory, onSelectTechDevice]);

  const handleResetCamera = () => {
    const preset = ZONE_VIEW_PRESETS[activeZone] || ZONE_VIEW_PRESETS.all;
    targetCamPosRef.current.set(...preset.pos);
    let deltaYaw = preset.yaw - currentYawRef.current;
    deltaYaw = Math.atan2(Math.sin(deltaYaw), Math.cos(deltaYaw));
    targetYawRef.current = currentYawRef.current + deltaYaw;
    targetPitchRef.current = preset.pitch;
  };

  if (webglError) {
    return (
      <div className="w-full h-full min-h-[500px] bg-[#141214] text-white p-6 flex flex-col items-center justify-center text-center">
        <p className="text-sm font-medium mb-2">
          {lang === 'hy'
            ? '3D տեսարանը հասանելի չէ այս սարքի վրա։'
            : '3D view is unavailable on this device.'}
        </p>
        <p className="text-xs text-white/65">
          {lang === 'hy'
            ? 'Օգտագործեք վերևի «Կատալոգ» կոճակը կամ ընտրեք սարքը ստորև։'
            : 'Use the Catalog button above or pick an appliance below.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden select-none bg-[#0b0a0d] ${
        fullScreen
          ? 'h-full'
          : 'h-[560px] sm:h-[640px] lg:h-[720px] rounded-2xl border border-white/10 shadow-2xl'
      }`}
    >
      {/* Loading Bar */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b0a0d] px-6 text-white">
          <div className="w-full max-w-xs space-y-2.5 text-center">
            <div className="text-xs font-medium tracking-wide text-white/80">
              {lang === 'hy'
                ? `Բեռնվում է Տան Տեխնիկայի 360° Սրահը (${loadProgress}%)`
                : `Loading 360° Home Appliances Hall (${loadProgress}%)`}
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

      {/* Compact Floating 3D Price + Parameter Tags (Գնապիտակ իր պարամետրերով) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {badgePositions.map((b) => {
          if (!b.visible) return null;
          const isSelected = b.kind === 'appliance' && selectedCategory === b.category;
          const isHovered = hoveredKey === b.key;

          return (
            <button
              key={b.key}
              type="button"
              onClick={() => {
                if (b.kind === 'appliance' && b.category) {
                  onSelectCategory(b.category);
                } else if (b.kind === 'tech' && b.deviceId && onSelectTechDevice) {
                  onSelectTechDevice(b.deviceId);
                }
              }}
              style={{
                transform: `translate3d(${Math.round(b.x)}px, ${Math.round(b.y)}px, 0) translate(-50%, -100%)`,
              }}
              className={`pointer-events-auto absolute top-0 left-0 px-2 py-1 rounded-lg border text-left transition-all backdrop-blur-md cursor-pointer ${
                isSelected || isHovered
                  ? 'bg-[#E5A952] text-[#0c0b0d] border-[#E5A952] font-bold shadow-xl scale-105 z-20'
                  : 'bg-black/78 text-white/95 border-white/20 hover:bg-black/90 hover:border-[#E5A952]/70 z-10'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-[9px] font-mono-tech uppercase tracking-wider">
                <span className="opacity-80">{b.brand}</span>
                <span
                  className={
                    isSelected || isHovered
                      ? 'px-1.5 py-0.2 rounded bg-black/20 text-[#0c0b0d] font-extrabold'
                      : 'px-1.5 py-0.2 rounded bg-[#E5A952]/20 text-[#E5A952] font-bold'
                  }
                >
                  ${b.priceUsd.toLocaleString()}
                </span>
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold whitespace-nowrap leading-tight mt-0.5">
                {b.label}
              </div>
              <div
                className={`text-[8.5px] font-mono-tech whitespace-nowrap leading-tight mt-0.5 ${
                  isSelected || isHovered ? 'text-[#0c0b0d]/85 font-semibold' : 'text-white/65'
                }`}
              >
                {b.subLabel}
              </div>
            </button>
          );
        })}
      </div>

      {/* Single Compact Bottom-Right 360° Walk & Turn Control Pad */}
      <div className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-5 sm:right-6 z-20 flex items-center gap-1.5">
        <div className="inline-flex items-center rounded-xl border border-[#E5A952]/40 bg-black/80 backdrop-blur-md overflow-hidden shadow-xl text-white">
          <button
            type="button"
            onPointerDown={() => {
              walkInputRef.current.turn = 1;
            }}
            onPointerUp={() => {
              walkInputRef.current.turn = 0;
            }}
            onPointerLeave={() => {
              walkInputRef.current.turn = 0;
            }}
            className="h-9 px-2.5 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center justify-center text-xs cursor-pointer"
            title={lang === 'hy' ? 'Պտույտ Ձախ (Q)' : 'Turn Left (Q)'}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={() => {
              walkInputRef.current.forward = 1;
            }}
            onPointerUp={() => {
              walkInputRef.current.forward = 0;
            }}
            onPointerLeave={() => {
              walkInputRef.current.forward = 0;
            }}
            className="h-9 px-2.5 border-l border-white/10 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center gap-1 text-xs font-bold cursor-pointer"
            title={lang === 'hy' ? 'Քայլել Առաջ (W / ↑)' : 'Walk Forward (W / ↑)'}
          >
            <ArrowUp className="w-3.5 h-3.5 text-[#E5A952]" />
            <span className="hidden sm:inline">{lang === 'hy' ? 'Քայլել' : 'Walk'}</span>
          </button>
          <button
            type="button"
            onPointerDown={() => {
              walkInputRef.current.forward = -1;
            }}
            onPointerUp={() => {
              walkInputRef.current.forward = 0;
            }}
            onPointerLeave={() => {
              walkInputRef.current.forward = 0;
            }}
            className="h-9 px-2.5 border-l border-white/10 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center justify-center text-xs cursor-pointer"
            title={lang === 'hy' ? 'Հետ (S / ↓)' : 'Walk Back (S / ↓)'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onPointerDown={() => {
              walkInputRef.current.turn = -1;
            }}
            onPointerUp={() => {
              walkInputRef.current.turn = 0;
            }}
            onPointerLeave={() => {
              walkInputRef.current.turn = 0;
            }}
            className="h-9 px-2.5 border-l border-white/10 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center justify-center text-xs cursor-pointer"
            title={lang === 'hy' ? 'Պտույտ Աջ (E)' : 'Turn Right (E)'}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleResetCamera}
            className="h-9 px-2.5 border-l border-white/10 hover:bg-white/15 hover:text-[#E5A952] inline-flex items-center justify-center text-xs cursor-pointer"
            title={lang === 'hy' ? 'Կենտրոն' : 'Reset Center'}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
