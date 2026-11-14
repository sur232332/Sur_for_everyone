import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Footprints, RotateCcw } from 'lucide-react';
import {
  APPLIANCE_SCENE_ITEMS,
  ApplianceCategoryId,
  HOME_ZONES,
  HomeZoneId,
} from '../data/homeGuideData';
import { DEVICES } from '../data/devices';
import {
  ApplianceInteractiveState,
  BuiltApplianceRig,
  BuiltTechDeskRig,
  buildFullApartmentScene,
  updateApplianceRigAnimation,
} from '../three/buildHomeAppliances';
import { Language } from '../types/hardware';

interface HomeApartment3DProps {
  activeZone: HomeZoneId;
  selectedCategory: ApplianceCategoryId | null;
  onSelectCategory: (cat: ApplianceCategoryId) => void;
  onSelectTechDevice?: (deviceId: string) => void;
  interactiveStates: Record<ApplianceCategoryId, ApplianceInteractiveState>;
  darkMode: boolean;
  lang: Language;
  /** Scroll progress from 0 to 1 for Apple-style scrollytelling camera choreography */
  scrollProgress?: number;
  /** When true, fills the sticky h-screen viewport edge-to-edge */
  fullScreen?: boolean;
}

interface FloatingBadgePos {
  key: string;
  kind: 'appliance' | 'tech';
  zone: Exclude<HomeZoneId, 'all'>;
  category?: ApplianceCategoryId;
  deviceId?: string;
  label: string;
  x: number;
  y: number;
  visible: boolean;
}

interface CameraKeyframe {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
}

/**
 * Multi-stage Scrollytelling Camera Keyframes (0.0 -> 1.0):
 * 0.00 - 0.25: All Rooms Panoramic Overview
 * 0.25 - 0.50: Kitchen Zone (Refrigerator -> 60 cm Gas Stove -> Microwave)
 * 0.50 - 0.75: Laundry Zone (Washing Machine & Tumble Dryer)
 * 0.75 - 1.00: Tech Desk (Galaxy S24 Ultra, iPhone 16 Pro Max, Workstation Laptop, Apple M4 Max SoC)
 */
const SCROLL_CAMERA_KEYFRAMES: CameraKeyframe[] = [
  {
    t: 0.0,
    pos: [0.15, 2.65, 6.4],
    target: [0.0, 0.95, -1.35],
  },
  {
    t: 0.18,
    pos: [-0.6, 2.35, 5.4],
    target: [-0.85, 0.95, -1.45],
  },
  {
    t: 0.3,
    pos: [-3.55, 1.56, 2.55],
    target: [-3.55, 0.96, -1.65],
  },
  {
    t: 0.44,
    pos: [-2.45, 1.42, 1.85],
    target: [-2.45, 1.02, -1.65],
  },
  {
    t: 0.56,
    pos: [0.05, 1.52, 2.35],
    target: [0.05, 0.74, -1.68],
  },
  {
    t: 0.68,
    pos: [0.42, 1.46, 2.05],
    target: [0.35, 0.68, -1.68],
  },
  {
    t: 0.82,
    pos: [3.15, 1.62, 2.05],
    target: [3.25, 0.88, -1.22],
  },
  {
    t: 1.0,
    pos: [3.55, 1.44, 1.45],
    target: [3.42, 0.88, -1.22],
  },
];

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function sampleScrollCamera(
  progress: number,
  outPos: THREE.Vector3,
  outTarget: THREE.Vector3
) {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < SCROLL_CAMERA_KEYFRAMES.length - 1; i++) {
    const k0 = SCROLL_CAMERA_KEYFRAMES[i];
    const k1 = SCROLL_CAMERA_KEYFRAMES[i + 1];
    if (p >= k0.t && p <= k1.t) {
      const span = Math.max(0.0001, k1.t - k0.t);
      const localT = smoothstep((p - k0.t) / span);
      outPos.set(
        THREE.MathUtils.lerp(k0.pos[0], k1.pos[0], localT),
        THREE.MathUtils.lerp(k0.pos[1], k1.pos[1], localT),
        THREE.MathUtils.lerp(k0.pos[2], k1.pos[2], localT)
      );
      outTarget.set(
        THREE.MathUtils.lerp(k0.target[0], k1.target[0], localT),
        THREE.MathUtils.lerp(k0.target[1], k1.target[1], localT),
        THREE.MathUtils.lerp(k0.target[2], k1.target[2], localT)
      );
      return;
    }
  }
  const last = SCROLL_CAMERA_KEYFRAMES[SCROLL_CAMERA_KEYFRAMES.length - 1];
  outPos.set(...last.pos);
  outTarget.set(...last.target);
}

export const HomeApartment3D: React.FC<HomeApartment3DProps> = ({
  activeZone,
  selectedCategory,
  onSelectCategory,
  onSelectTechDevice,
  interactiveStates,
  darkMode,
  lang,
  scrollProgress,
  fullScreen = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);
  const [webglError, setWebglError] = useState(false);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [walkMode, setWalkMode] = useState(false);
  const [badgePositions, setBadgePositions] = useState<FloatingBadgePos[]>([]);

  const activeZoneRef = useRef<HomeZoneId>(activeZone);
  const selectedCategoryRef = useRef<ApplianceCategoryId | null>(selectedCategory);
  const hoveredKeyRef = useRef<string | null>(null);
  const interactiveStatesRef = useRef(interactiveStates);
  const walkModeRef = useRef(walkMode);
  const cameraGlideActiveRef = useRef(true);
  const scrollDrivenRef = useRef(typeof scrollProgress === 'number');
  const lastScrollProgressRef = useRef<number>(scrollProgress ?? 0);

  const desiredCamPosRef = useRef(new THREE.Vector3(0.15, 2.65, 6.4));
  const desiredTargetRef = useRef(new THREE.Vector3(0.0, 0.95, -1.35));

  const walkInputRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const keysPressedRef = useRef<Set<string>>(new Set());

  // Update camera target when scrollProgress changes
  useEffect(() => {
    if (typeof scrollProgress === 'number') {
      const delta = Math.abs(scrollProgress - lastScrollProgressRef.current);
      lastScrollProgressRef.current = scrollProgress;
      if (delta > 0.0005 || scrollDrivenRef.current) {
        scrollDrivenRef.current = true;
        cameraGlideActiveRef.current = true;
        sampleScrollCamera(
          scrollProgress,
          desiredCamPosRef.current,
          desiredTargetRef.current
        );
      }
    }
  }, [scrollProgress]);

  useEffect(() => {
    activeZoneRef.current = activeZone;
    if (typeof scrollProgress !== 'number') {
      const zoneDef = HOME_ZONES.find((z) => z.id === activeZone) || HOME_ZONES[0];
      desiredCamPosRef.current.set(...zoneDef.cameraPos);
      desiredTargetRef.current.set(...zoneDef.cameraTarget);
      cameraGlideActiveRef.current = true;
    }
  }, [activeZone, scrollProgress]);

  useEffect(() => {
    selectedCategoryRef.current = selectedCategory;
    if (selectedCategory) {
      const item = APPLIANCE_SCENE_ITEMS.find((a) => a.id === selectedCategory);
      if (item) {
        scrollDrivenRef.current = false;
        desiredCamPosRef.current.set(...item.cameraPos);
        desiredTargetRef.current.set(...item.cameraTarget);
        cameraGlideActiveRef.current = true;
      }
    }
  }, [selectedCategory]);

  useEffect(() => {
    interactiveStatesRef.current = interactiveStates;
  }, [interactiveStates]);

  useEffect(() => {
    walkModeRef.current = walkMode;
  }, [walkMode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!walkModeRef.current) return;
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
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

      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.88;
      renderer.setPixelRatio(
        isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
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

      setLoadProgress(55);

      const scene = new THREE.Scene();
      const bgHex = darkMode ? 0x0c0b0d : 0x161312;
      scene.background = new THREE.Color(bgHex);
      scene.fog = new THREE.FogExp2(bgHex, 0.026);

      pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;
      scene.environmentIntensity = 0.34;

      const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 60);
      camera.position.copy(desiredCamPosRef.current);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2 - 0.04;
      controls.minDistance = 1.05;
      controls.maxDistance = 13.5;
      // Allow vertical page scrolling with mouse wheel while in scrollytelling mode
      controls.enableZoom = !fullScreen;
      controls.target.copy(desiredTargetRef.current);

      const stopGlide = () => {
        cameraGlideActiveRef.current = false;
        scrollDrivenRef.current = false;
      };
      controls.addEventListener('start', stopGlide);

      // Calibrated Architectural Showroom Lighting
      const hemiLight = new THREE.HemisphereLight(0xf3eadc, 0x1a1512, 0.3);
      scene.add(hemiLight);

      const keyDirLight = new THREE.DirectionalLight(0xfff1dc, 0.65);
      keyDirLight.position.set(3.5, 6.5, 5.0);
      if (!isSoftwareGl) {
        keyDirLight.castShadow = true;
        keyDirLight.shadow.mapSize.width = 1024;
        keyDirLight.shadow.mapSize.height = 1024;
        keyDirLight.shadow.camera.near = 0.5;
        keyDirLight.shadow.camera.far = 20;
        const d = 6.5;
        keyDirLight.shadow.camera.left = -d;
        keyDirLight.shadow.camera.right = d;
        keyDirLight.shadow.camera.top = d;
        keyDirLight.shadow.camera.bottom = -d;
        keyDirLight.shadow.bias = -0.0005;
        keyDirLight.shadow.normalBias = 0.02;
      }
      scene.add(keyDirLight);

      const addZoneSpot = (
        pos: [number, number, number],
        targetPos: [number, number, number],
        colorHex: number,
        intensity: number
      ) => {
        const spot = new THREE.SpotLight(colorHex, intensity, 8.5, Math.PI / 4.2, 0.72, 1.35);
        spot.position.set(...pos);
        spot.target.position.set(...targetPos);
        scene.add(spot);
        scene.add(spot.target);
      };

      // Kitchen Spotlights
      addZoneSpot([-4.35, 2.55, 0.35], [-4.35, 1.0, -1.65], 0xffe9cc, 2.6);
      addZoneSpot([-3.15, 2.55, 0.35], [-3.15, 0.65, -1.68], 0xffe4c2, 2.8);
      addZoneSpot([-2.0, 2.45, 0.25], [-2.0, 1.1, -1.65], 0xffe9cc, 2.1);

      // Laundry Spotlights
      addZoneSpot([0.22, 2.55, 0.35], [0.22, 0.65, -1.68], 0xf0f6ff, 2.5);

      // Tech Desk Spotlight
      addZoneSpot([3.4, 2.45, 0.35], [3.4, 0.9, -1.25], 0xffedd5, 2.7);

      setLoadProgress(80);

      const { apartmentGroup, applianceRigs, techDeskRigs } = buildFullApartmentScene(darkMode);
      scene.add(apartmentGroup);

      if (!isSoftwareGl) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        const bloomPass = new UnrealBloomPass(
          new THREE.Vector2(w, h),
          0.1,
          0.35,
          0.96
        );
        composer.addPass(bloomPass);
        composer.addPass(new OutputPass());
      }

      const pickableMeshes: THREE.Object3D[] = [];
      applianceRigs.forEach((rig: BuiltApplianceRig) => {
        rig.root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            pickableMeshes.push(child);
          }
        });
      });
      techDeskRigs.forEach((tRig: BuiltTechDeskRig) => {
        tRig.root.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            pickableMeshes.push(child);
          }
        });
      });

      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      let pointerDownPos = { x: 0, y: 0 };

      const getHoveredHit = (
        clientX: number,
        clientY: number
      ): { kind: 'appliance'; category: ApplianceCategoryId } | { kind: 'tech'; deviceId: string } | null => {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(pickableMeshes, false);
        if (hits.length > 0) {
          const ud = hits[0].object.userData;
          if (ud?.techDeviceId) {
            return { kind: 'tech', deviceId: String(ud.techDeviceId) };
          }
          if (ud?.applianceCategory) {
            return { kind: 'appliance', category: ud.applianceCategory as ApplianceCategoryId };
          }
        }
        return null;
      };

      const onPointerMove = (e: PointerEvent) => {
        const hit = getHoveredHit(e.clientX, e.clientY);
        const nextKey = hit
          ? hit.kind === 'appliance'
            ? `app:${hit.category}`
            : `tech:${hit.deviceId}`
          : null;
        if (nextKey !== hoveredKeyRef.current) {
          hoveredKeyRef.current = nextKey;
          setHoveredKey(nextKey);
          renderer.domElement.style.cursor = nextKey ? 'pointer' : 'grab';
        }
      };

      const onPointerDown = (e: PointerEvent) => {
        pointerDownPos = { x: e.clientX, y: e.clientY };
      };

      const onPointerUp = (e: PointerEvent) => {
        const dx = Math.abs(e.clientX - pointerDownPos.x);
        const dy = Math.abs(e.clientY - pointerDownPos.y);
        if (dx < 8 && dy < 8) {
          const hit = getHoveredHit(e.clientX, e.clientY);
          if (hit) {
            if (hit.kind === 'appliance') {
              onSelectCategory(hit.category);
            } else if (hit.kind === 'tech' && onSelectTechDevice) {
              onSelectTechDevice(hit.deviceId);
            }
          }
        }
      };

      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

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
      const forwardDir = new THREE.Vector3();
      const rightDir = new THREE.Vector3();
      const moveDelta = new THREE.Vector3();

      const animate = (now: number) => {
        animId = requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const elapsed = now / 1000;

        let moveForward = walkInputRef.current.y;
        let moveStrafe = walkInputRef.current.x;

        if (keysPressedRef.current.has('w') || keysPressedRef.current.has('arrowup')) moveForward += 1;
        if (keysPressedRef.current.has('s') || keysPressedRef.current.has('arrowdown')) moveForward -= 1;
        if (keysPressedRef.current.has('a') || keysPressedRef.current.has('arrowleft')) moveStrafe -= 1;
        if (keysPressedRef.current.has('d') || keysPressedRef.current.has('arrowright')) moveStrafe += 1;

        if (Math.abs(moveForward) > 0.01 || Math.abs(moveStrafe) > 0.01) {
          cameraGlideActiveRef.current = false;
          scrollDrivenRef.current = false;
          const speed = 2.6 * dt;
          camera.getWorldDirection(forwardDir);
          forwardDir.y = 0;
          forwardDir.normalize();

          rightDir.crossVectors(forwardDir, camera.up).normalize();
          moveDelta
            .set(0, 0, 0)
            .addScaledVector(forwardDir, moveForward * speed)
            .addScaledVector(rightDir, moveStrafe * speed);

          camera.position.add(moveDelta);
          controls.target.add(moveDelta);
          camera.position.x = THREE.MathUtils.clamp(camera.position.x, -5.4, 5.4);
          camera.position.z = THREE.MathUtils.clamp(camera.position.z, -0.8, 6.8);
          camera.position.y = THREE.MathUtils.clamp(camera.position.y, 1.1, 4.8);
        } else if (cameraGlideActiveRef.current || scrollDrivenRef.current) {
          const lerpFactor = scrollDrivenRef.current ? Math.min(1, dt * 7.5) : Math.min(1, dt * 4.5);
          camera.position.lerp(desiredCamPosRef.current, lerpFactor);
          controls.target.lerp(desiredTargetRef.current, lerpFactor);
          if (
            !scrollDrivenRef.current &&
            camera.position.distanceTo(desiredCamPosRef.current) < 0.025 &&
            controls.target.distanceTo(desiredTargetRef.current) < 0.025
          ) {
            cameraGlideActiveRef.current = false;
          }
        }

        controls.update();

        applianceRigs.forEach((rig, category) => {
          const st = interactiveStatesRef.current[category] || {
            doorOpen: false,
            secondaryActive: false,
          };
          const isHighlighted =
            hoveredKeyRef.current === `app:${category}` ||
            selectedCategoryRef.current === category;
          updateApplianceRigAnimation(rig, st, isHighlighted, dt, elapsed);
        });

        techDeskRigs.forEach((tRig, deviceId) => {
          const isHovered = hoveredKeyRef.current === `tech:${deviceId}`;
          const lineMat = tRig.highlightBox.material as THREE.LineBasicMaterial;
          lineMat.opacity = THREE.MathUtils.damp(
            lineMat.opacity,
            isHovered ? 0.95 : 0.0,
            10,
            dt
          );
        });

        if (composer) {
          composer.render();
        } else {
          renderer.render(scene, camera);
        }

        badgeFrameCounter++;
        if (badgeFrameCounter % 3 === 0) {
          const cw = renderer.domElement.clientWidth;
          const ch = renderer.domElement.clientHeight;
          const nextBadges: FloatingBadgePos[] = [];

          applianceRigs.forEach((rig, category) => {
            projVec.copy(rig.labelAnchorLocal);
            rig.root.localToWorld(projVec);
            projVec.project(camera);
            const visible = projVec.z < 1 && projVec.z > -1;
            const x = (projVec.x * 0.5 + 0.5) * cw;
            const y = (-projVec.y * 0.5 + 0.5) * ch;
            const info = APPLIANCE_SCENE_ITEMS.find((i) => i.id === category);
            if (info) {
              nextBadges.push({
                key: `app:${category}`,
                kind: 'appliance',
                zone: info.zone,
                category,
                label: info.name[lang],
                x,
                y,
                visible,
              });
            }
          });

          techDeskRigs.forEach((tRig, deviceId) => {
            projVec.copy(tRig.labelAnchorLocal);
            tRig.root.localToWorld(projVec);
            projVec.project(camera);
            const visible = projVec.z < 1 && projVec.z > -1;
            const x = (projVec.x * 0.5 + 0.5) * cw;
            const y = (-projVec.y * 0.5 + 0.5) * ch;
            const dev = DEVICES.find((d) => d.id === deviceId);
            if (dev) {
              nextBadges.push({
                key: `tech:${deviceId}`,
                kind: 'tech',
                zone: 'office',
                deviceId,
                label: dev.name,
                x,
                y,
                visible,
              });
            }
          });

          setBadgePositions(nextBadges);
        }
      };

      animId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        renderer.domElement.removeEventListener('pointermove', onPointerMove);
        renderer.domElement.removeEventListener('pointerdown', onPointerDown);
        renderer.domElement.removeEventListener('pointerup', onPointerUp);
        renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
        renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
        controls.dispose();
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
    if (typeof scrollProgress === 'number') {
      scrollDrivenRef.current = true;
      sampleScrollCamera(
        scrollProgress,
        desiredCamPosRef.current,
        desiredTargetRef.current
      );
    } else {
      const zoneDef = HOME_ZONES.find((z) => z.id === activeZone) || HOME_ZONES[0];
      desiredCamPosRef.current.set(...zoneDef.cameraPos);
      desiredTargetRef.current.set(...zoneDef.cameraTarget);
    }
    cameraGlideActiveRef.current = true;
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
            ? 'Օգտագործեք վերևի «Ցանկ» կոճակը կամ ընտրեք սարքը ստորև։'
            : 'Use the List button above or pick an appliance below.'}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full overflow-hidden select-none bg-[#0e0c0e] ${
        fullScreen
          ? 'h-full'
          : 'h-[520px] sm:h-[600px] lg:h-[680px] rounded-2xl border border-white/10 shadow-2xl'
      }`}
    >
      {/* Loading Bar */}
      {loading && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0c0e] px-6 text-white">
          <div className="w-full max-w-xs space-y-2.5 text-center">
            <div className="text-xs font-medium tracking-wide text-white/80">
              {lang === 'hy'
                ? `Բեռնվում է 3D ցուցասրահը (${loadProgress}%)`
                : `Loading 3D Showroom (${loadProgress}%)`}
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

      {/* Minimal Floating 3D Object Labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {badgePositions.map((b) => {
          if (!b.visible) return null;
          if (activeZone !== 'all' && b.zone !== activeZone) return null;
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
              className={`pointer-events-auto absolute top-0 left-0 px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap transition-colors backdrop-blur-md cursor-pointer flex items-center gap-1.5 ${
                isSelected || isHovered
                  ? 'bg-[#E5A952] text-[#0c0b0d] border-[#E5A952] font-semibold shadow-lg'
                  : 'bg-black/60 text-white/90 border-white/15 hover:bg-black/80 hover:border-[#E5A952]/70'
              }`}
            >
              <span>{b.label}</span>
            </button>
          );
        })}
      </div>

      {/* Bottom-Right Compact Controls (Walk + Reset) */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => setWalkMode((v) => !v)}
          className={`h-9 px-3 rounded-lg border text-xs font-medium inline-flex items-center gap-1.5 backdrop-blur-md transition-colors cursor-pointer ${
            walkMode
              ? 'bg-[#E5A952] text-[#0c0b0d] border-[#E5A952] font-semibold'
              : 'bg-black/55 text-white/90 border-white/15 hover:border-white/40'
          }`}
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>{lang === 'hy' ? 'Քայլել' : 'Walk'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetCamera}
          className="h-9 px-3 rounded-lg border border-white/15 bg-black/55 backdrop-blur-md text-xs font-medium text-white/90 hover:border-white/40 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{lang === 'hy' ? 'Վերականգնել' : 'Reset'}</span>
        </button>
      </div>

      {/* On-Screen Touch/Mouse Joystick when Walk Mode is active */}
      {walkMode && (
        <div className="absolute bottom-16 right-5 z-20 flex flex-col items-center gap-1.5 bg-black/75 backdrop-blur-md border border-white/15 p-2.5 rounded-xl text-white shadow-xl pointer-events-auto">
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              onPointerDown={() => {
                walkInputRef.current = { x: 0, y: 1 };
              }}
              onPointerUp={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              onPointerLeave={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              className="w-9 h-9 rounded-lg border border-white/15 bg-white/10 active:bg-[#E5A952] active:text-black text-xs font-bold flex items-center justify-center cursor-pointer"
              aria-label="Walk Forward"
            >
              ↑
            </button>
            <div />
            <button
              type="button"
              onPointerDown={() => {
                walkInputRef.current = { x: -1, y: 0 };
              }}
              onPointerUp={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              onPointerLeave={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              className="w-9 h-9 rounded-lg border border-white/15 bg-white/10 active:bg-[#E5A952] active:text-black text-xs font-bold flex items-center justify-center cursor-pointer"
              aria-label="Step Left"
            >
              ←
            </button>
            <button
              type="button"
              onPointerDown={() => {
                walkInputRef.current = { x: 0, y: -1 };
              }}
              onPointerUp={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              onPointerLeave={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              className="w-9 h-9 rounded-lg border border-white/15 bg-white/10 active:bg-[#E5A952] active:text-black text-xs font-bold flex items-center justify-center cursor-pointer"
              aria-label="Walk Backward"
            >
              ↓
            </button>
            <button
              type="button"
              onPointerDown={() => {
                walkInputRef.current = { x: 1, y: 0 };
              }}
              onPointerUp={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              onPointerLeave={() => {
                walkInputRef.current = { x: 0, y: 0 };
              }}
              className="w-9 h-9 rounded-lg border border-white/15 bg-white/10 active:bg-[#E5A952] active:text-black text-xs font-bold flex items-center justify-center cursor-pointer"
              aria-label="Step Right"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
