import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ArrowLeft,
  Camera,
  FileUp,
  Moon,
  RotateCcw,
  Shield,
  Sun,
} from 'lucide-react';
import { Currency, Language } from '../types/hardware';
import { CarColorCategory, LUXURY_CARS, LuxuryCarSpec } from '../data/luxuryCarsData';
import {
  buildLuxuryCarRig,
  buildParkingLotEnvironment,
  CarRig3D,
} from '../three/buildLuxuryCars';
import { CarEngineAudioController } from '../three/carAudioSynth';
import { createAutomotiveDuskEnvironment } from '../three/carMaterialsAndTextures';
import { disposeObject3D } from '../three/webglUtils';
import { VehicleDetailPanel } from '../components/motor-gallery/VehicleDetailPanel';
import { MotorLotFilterBar } from '../components/motor-gallery/MotorLotFilterBar';
import { ScheduleVisitModal } from '../components/motor-gallery/ScheduleVisitModal';
import { CarCompareModalAndBar } from '../components/motor-gallery/CarCompareModalAndBar';
import { InteractivePhotoStage } from '../components/motor-gallery/InteractivePhotoStage';

interface MotorGalleryPageProps {
  lang: Language;
  currency: Currency;
  onToggleLang: () => void;
}

interface ScreenBadgePos {
  id: string;
  x: number;
  y: number;
  visible: boolean;
}

export const MotorGalleryPage: React.FC<MotorGalleryPageProps> = ({
  lang,
  currency,
  onToggleLang,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedCarId, setSelectedCarId] = useState<string | null>(null);
  // Right detail panel can be hidden without leaving the car view
  const [isDetailPanelHidden, setIsDetailPanelHidden] = useState<boolean>(false);
  const [selectedCarViewMode, setSelectedCarViewMode] = useState<'3d' | 'photo'>('photo');
  const [hoveredCarId, setHoveredCarId] = useState<string | null>(null);
  const [use8kDroneBackdrop, setUse8kDroneBackdrop] = useState<boolean>(true);
  const [lotDayMode, setLotDayMode] = useState<boolean>(false); // false = Golden Hour Night/Dusk, true = Day

  // Doors, Trunk/Frunk, Engine & Paint Customization
  const [doorsOpenMap, setDoorsOpenMap] = useState<Record<string, boolean>>({});
  const [trunkOpenMap, setTrunkOpenMap] = useState<Record<string, boolean>>({});
  const [engineRunningMap, setEngineRunningMap] = useState<Record<string, boolean>>({});
  const [carColorsMap, setCarColorsMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(LUXURY_CARS.map((c) => [c.id, c.colorHex]))
  );
  const [customModelNames, setCustomModelNames] = useState<Record<string, string>>({});
  const [customModelUrls, setCustomModelUrls] = useState<Record<string, string>>({});
  const [badgePositions, setBadgePositions] = useState<ScreenBadgePos[]>([]);

  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [maxPriceUsd, setMaxPriceUsd] = useState<number>(340000);
  const [selectedColor, setSelectedColor] = useState<CarColorCategory | 'all'>('all');

  // Compare State (up to 2 cars)
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareModalOpen, setCompareModalOpen] = useState<boolean>(false);

  // Schedule a Visit Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState<boolean>(false);

  // Refs for Three.js animation loop access
  const selectedCarIdRef = useRef<string | null>(null);
  const doorsOpenRef = useRef<Record<string, boolean>>({});
  const trunkOpenRef = useRef<Record<string, boolean>>({});
  const engineRunningRef = useRef<Record<string, boolean>>({});
  const matchedCarIdsRef = useRef<Set<string>>(new Set(LUXURY_CARS.map((c) => c.id)));
  const rigsMapRef = useRef<Map<string, CarRig3D>>(new Map());
  const glbLoadedRef = useRef<Set<string>>(new Set());
  const cameraTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 23.5, 0.01));
  const cameraTargetLookRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isTransitioningCameraRef = useRef<boolean>(false);
  const controlsRef = useRef<OrbitControls | null>(null);
  const audioControllerRef = useRef<CarEngineAudioController | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);

  const selectedCar: LuxuryCarSpec | null = useMemo(
    () => LUXURY_CARS.find((c) => c.id === selectedCarId) || null,
    [selectedCarId]
  );

  // Filter matching logic
  const matchedCarIds = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matched = new Set<string>();
    for (const car of LUXURY_CARS) {
      const matchesQuery =
        !q ||
        car.fullName.toLowerCase().includes(q) ||
        car.make.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.specs.engine.toLowerCase().includes(q) ||
        car.colorName.en.toLowerCase().includes(q) ||
        car.colorName.hy.toLowerCase().includes(q);

      const matchesBrand = selectedBrand === 'All' || car.make === selectedBrand;
      const matchesPrice = car.priceUsd <= maxPriceUsd;
      const matchesColor = selectedColor === 'all' || car.colorCategory === selectedColor;

      if (matchesQuery && matchesBrand && matchesPrice && matchesColor) {
        matched.add(car.id);
      }
    }
    return matched;
  }, [searchQuery, selectedBrand, maxPriceUsd, selectedColor]);

  // Sync matchedCarIds to Three.js materials for 3D dimming
  useEffect(() => {
    matchedCarIdsRef.current = matchedCarIds;
    rigsMapRef.current.forEach((rig, id) => {
      const isMatch = matchedCarIds.has(id);
      for (const mat of rig.paintMaterials) {
        mat.opacity = isMatch ? 1.0 : 0.25;
        mat.transparent = !isMatch;
      }
    });
  }, [matchedCarIds]);

  // Sync Day / Night mode with 3D scene lighting
  useEffect(() => {
    if (sunLightRef.current) {
      sunLightRef.current.color.set(lotDayMode ? 0xffffff : 0xffb86c);
      sunLightRef.current.intensity = lotDayMode ? 3.4 : 2.65;
    }
    if (hemiLightRef.current) {
      hemiLightRef.current.intensity = lotDayMode ? 1.35 : 0.78;
    }
  }, [lotDayMode]);

  // Keyboard accessibility: Esc closes open modals or the Vehicle Detail Panel
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (scheduleModalOpen) {
          setScheduleModalOpen(false);
        } else if (compareModalOpen) {
          setCompareModalOpen(false);
        } else if (selectedCarIdRef.current) {
          focusOnCar(null);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [scheduleModalOpen, compareModalOpen]);

  const formatMoney = (usd: number) => {
    if (currency === 'AMD') {
      return `${Math.round(usd * 388).toLocaleString()} ֏`;
    }
    if (currency === 'EUR') {
      return `€${Math.round(usd * 0.92).toLocaleString()}`;
    }
    return `$${Math.round(usd).toLocaleString()}`;
  };

  const focusOnCar = (car: LuxuryCarSpec | null) => {
    selectedCarIdRef.current = car ? car.id : null;
    setSelectedCarId(car ? car.id : null);
    if (car) {
      setSelectedCarViewMode(glbLoadedRef.current.has(car.id) ? '3d' : 'photo');
    }

    if (!car) {
      cameraTargetPosRef.current.set(0, 23.5, 0.01);
      cameraTargetLookRef.current.set(0, 0, 0);
      isTransitioningCameraRef.current = true;
      return;
    }

    const { x, z, rotationY } = car.parkingSlot;
    const forwardZ = Math.cos(rotationY);
    const camOffsetX = 3.65;
    const camOffsetZ = forwardZ * 4.75;

    cameraTargetPosRef.current.set(x + camOffsetX, 2.05, z + camOffsetZ);
    cameraTargetLookRef.current.set(x + 0.55, 0.72, z);
    isTransitioningCameraRef.current = true;
  };

  const handleToggleDoors = (carId: string) => {
    setDoorsOpenMap((prev) => {
      const next = { ...prev, [carId]: !prev[carId] };
      doorsOpenRef.current = next;
      return next;
    });
  };

  const handleToggleTrunk = (carId: string) => {
    setTrunkOpenMap((prev) => {
      const next = { ...prev, [carId]: !prev[carId] };
      trunkOpenRef.current = next;
      return next;
    });
  };

  const handleToggleEngine = (car: LuxuryCarSpec) => {
    if (!audioControllerRef.current) {
      audioControllerRef.current = new CarEngineAudioController();
    }
    const currentlyRunning = !!engineRunningRef.current[car.id];
    const nextState = !currentlyRunning;

    if (nextState) {
      audioControllerRef.current.startEngine(car.enginePitch);
    } else {
      audioControllerRef.current.stopEngine();
    }

    setEngineRunningMap((prev) => {
      const next = { ...prev, [car.id]: nextState };
      engineRunningRef.current = next;
      return next;
    });
  };

  const handleRevEngine = (car: LuxuryCarSpec) => {
    if (!audioControllerRef.current) {
      audioControllerRef.current = new CarEngineAudioController();
    }
    if (!engineRunningRef.current[car.id]) {
      handleToggleEngine(car);
    } else {
      audioControllerRef.current.revEngine();
    }
  };

  const handleSelectColor = (carId: string, hex: string) => {
    setCarColorsMap((prev) => ({ ...prev, [carId]: hex }));
    const rig = rigsMapRef.current.get(carId);
    if (rig) {
      for (const mat of rig.paintMaterials) {
        mat.color.set(hex);
      }
    }
  };

  const handleToggleCompare = (carId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(carId)) {
        return prev.filter((id) => id !== carId);
      }
      if (prev.length >= 2) {
        return [prev[1], carId];
      }
      return [...prev, carId];
    });
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedBrand('All');
    setMaxPriceUsd(340000);
    setSelectedColor('all');
  };

  // Loads a .glb into a car's rig (used by the upload button AND by auto-load from `glbUrl`)
  const applyGlbToRig = (rig: CarRig3D, carId: string, url: string, displayName: string) => {
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    loader.load(
      url,
      (gltf) => {
        while (rig.customModelGroup.children.length > 0) {
          const child = rig.customModelGroup.children[0];
          rig.customModelGroup.remove(child);
        }

        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 4.4 / maxDim;
        model.scale.setScalar(scale);

        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        model.traverse((obj) => {
          obj.userData.carId = carId;
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });

        rig.customModelGroup.add(model);
        rig.customModelGroup.visible = true;
        rig.bodyShellGroup.visible = false;
        rig.wheels.forEach((w) => {
          w.visible = false;
        });

        glbLoadedRef.current.add(carId);
        setCustomModelNames((prev) => ({ ...prev, [carId]: displayName }));
        setCustomModelUrls((prev) => ({ ...prev, [carId]: url }));
        draco.dispose();
      },
      undefined,
      (err) => {
        console.warn(`Could not load 3D model "${url}" for ${carId}`, err);
        draco.dispose();
      }
    );
  };

  const handleUploadCustomGLB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const targetId = selectedCarIdRef.current || LUXURY_CARS[0].id;
    const rig = rigsMapRef.current.get(targetId);
    if (!rig) return;
    applyGlbToRig(rig, targetId, URL.createObjectURL(file), file.name);
    if (selectedCarIdRef.current) setSelectedCarViewMode('3d');
  };

  // Initialize Three.js Parking Lot Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d14');
    scene.fog = new THREE.FogExp2('#090d14', 0.014);

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 150);
    camera.position.set(0, 23.5, 0.01);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const envTex = createAutomotiveDuskEnvironment(renderer, scene);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      0.28,
      0.55,
      0.82
    );
    composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e1b18, 0.78);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const goldenSunLight = new THREE.DirectionalLight(0xffb86c, 2.65);
    goldenSunLight.position.set(-14, 15, 12);
    goldenSunLight.castShadow = true;
    goldenSunLight.shadow.mapSize.width = 2048;
    goldenSunLight.shadow.mapSize.height = 2048;
    goldenSunLight.shadow.camera.near = 2;
    goldenSunLight.shadow.camera.far = 52;
    const d = 16;
    goldenSunLight.shadow.camera.left = -d;
    goldenSunLight.shadow.camera.right = d;
    goldenSunLight.shadow.camera.top = d;
    goldenSunLight.shadow.camera.bottom = -d;
    goldenSunLight.shadow.bias = -0.0005;
    scene.add(goldenSunLight);
    sunLightRef.current = goldenSunLight;

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.15);
    rimLight.position.set(14, 10, -12);
    scene.add(rimLight);

    for (const bx of [-7.2, 0, 7.2]) {
      const topLamp = new THREE.PointLight(0xfef08a, 18, 16, 1.6);
      topLamp.position.set(bx, 5.4, -6.2);
      scene.add(topLamp);

      const botLamp = new THREE.PointLight(0xfef08a, 18, 16, 1.6);
      botLamp.position.set(bx, 5.4, 6.2);
      scene.add(botLamp);
    }

    buildParkingLotEnvironment(scene);

    const rigsMap = new Map<string, CarRig3D>();
    for (const carSpec of LUXURY_CARS) {
      const rig = buildLuxuryCarRig(carSpec);
      scene.add(rig.root);
      rigsMap.set(carSpec.id, rig);
    }
    rigsMapRef.current = rigsMap;

    // Auto-load a bundled .glb for every car that has `glbUrl` in luxuryCarsData.ts
    for (const carSpec of LUXURY_CARS) {
      const rig = rigsMap.get(carSpec.id);
      if (rig && carSpec.glbUrl) {
        applyGlbToRig(rig, carSpec.id, carSpec.glbUrl, carSpec.glbUrl.split('/').pop() || 'model.glb');
      }
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 2.6;
    controls.maxDistance = 32;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    const onControlStart = () => {
      if (selectedCarIdRef.current) {
        isTransitioningCameraRef.current = false;
      }
    };
    controls.addEventListener('start', onControlStart);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const getHitCarId = (clientX: number, clientY: number): string | null => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const carRoots = Array.from(rigsMap.values()).map((r) => r.root);
      const intersects = raycaster.intersectObjects(carRoots, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj) {
          if (obj.userData?.carId) return obj.userData.carId as string;
          obj = obj.parent;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return;
      const hitId = getHitCarId(e.clientX, e.clientY);
      if (hitId) {
        const car = LUXURY_CARS.find((c) => c.id === hitId);
        if (car) focusOnCar(car);
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const hitId = getHitCarId(e.clientX, e.clientY);
      setHoveredCarId(hitId);
      renderer.domElement.style.cursor = hitId ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('pointermove', onPointerMove);

    let animFrameId = 0;
    const clock = new THREE.Clock();
    const projVec = new THREE.Vector3();

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      if (isTransitioningCameraRef.current) {
        camera.position.lerp(cameraTargetPosRef.current, 0.075);
        controls.target.lerp(cameraTargetLookRef.current, 0.085);
        if (
          camera.position.distanceTo(cameraTargetPosRef.current) < 0.04 &&
          controls.target.distanceTo(cameraTargetLookRef.current) < 0.04
        ) {
          isTransitioningCameraRef.current = false;
        }
      }

      controls.update();

      rigsMap.forEach((rig, carId) => {
        const isOpen = !!doorsOpenRef.current[carId];
        const isRunning = !!engineRunningRef.current[carId];

        const targetAngle = isOpen ? 1.08 : 0;
        const targetButterflyZ = isOpen ? 0.58 : 0;

        if (rig.doorType === 'butterfly') {
          rig.leftDoorPivot.rotation.y = THREE.MathUtils.lerp(
            rig.leftDoorPivot.rotation.y,
            targetAngle * 0.75,
            0.1
          );
          rig.leftDoorPivot.rotation.z = THREE.MathUtils.lerp(
            rig.leftDoorPivot.rotation.z,
            targetButterflyZ,
            0.1
          );
          rig.rightDoorPivot.rotation.y = THREE.MathUtils.lerp(
            rig.rightDoorPivot.rotation.y,
            -targetAngle * 0.75,
            0.1
          );
          rig.rightDoorPivot.rotation.z = THREE.MathUtils.lerp(
            rig.rightDoorPivot.rotation.z,
            -targetButterflyZ,
            0.1
          );
        } else {
          rig.leftDoorPivot.rotation.y = THREE.MathUtils.lerp(
            rig.leftDoorPivot.rotation.y,
            targetAngle,
            0.1
          );
          rig.rightDoorPivot.rotation.y = THREE.MathUtils.lerp(
            rig.rightDoorPivot.rotation.y,
            -targetAngle,
            0.1
          );
        }

        if (isRunning) {
          rig.bodyShellGroup.position.y = Math.sin(elapsed * 48) * 0.0045;
          rig.bodyShellGroup.rotation.z = Math.cos(elapsed * 38) * 0.0025;
          rig.headlightBeamLeft.intensity = 28;
          rig.headlightBeamRight.intensity = 28;
        } else {
          rig.bodyShellGroup.position.y = THREE.MathUtils.lerp(
            rig.bodyShellGroup.position.y,
            0,
            0.15
          );
          rig.bodyShellGroup.rotation.z = THREE.MathUtils.lerp(
            rig.bodyShellGroup.rotation.z,
            0,
            0.15
          );
          rig.headlightBeamLeft.intensity = THREE.MathUtils.lerp(
            rig.headlightBeamLeft.intensity,
            0,
            0.15
          );
          rig.headlightBeamRight.intensity = THREE.MathUtils.lerp(
            rig.headlightBeamRight.intensity,
            0,
            0.15
          );
        }

        // Rear Trunk (Բագաժնիկ) & Front Frunk / Hood (Կապոտ) Open/Close Animation
        const isTrunkOpen = !!trunkOpenRef.current[carId];
        if (rig.isSideHingedTrunk) {
          rig.trunkPivot.rotation.y = THREE.MathUtils.lerp(
            rig.trunkPivot.rotation.y,
            isTrunkOpen ? -1.15 : 0,
            0.1
          );
        } else {
          rig.trunkPivot.rotation.x = THREE.MathUtils.lerp(
            rig.trunkPivot.rotation.x,
            isTrunkOpen ? 0.92 : 0,
            0.1
          );
        }
        rig.frunkPivot.rotation.x = THREE.MathUtils.lerp(
          rig.frunkPivot.rotation.x,
          isTrunkOpen ? -0.78 : 0,
          0.1
        );
      });

      if (!selectedCarIdRef.current) {
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        const updated: ScreenBadgePos[] = LUXURY_CARS.map((c) => {
          projVec.set(c.parkingSlot.x + 1.85, 0.5, c.parkingSlot.z);
          projVec.project(camera);
          const sx = (projVec.x * 0.5 + 0.5) * w;
          const sy = (-(projVec.y * 0.5) + 0.5) * h;
          return {
            id: c.id,
            x: sx,
            y: sy,
            visible: projVec.z < 1,
          };
        });
        setBadgePositions(updated);
      }

      composer.render();
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animFrameId);
      controls.removeEventListener('start', onControlStart);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      audioControllerRef.current?.stopEngine();
      controls.dispose();
      envTex.dispose();
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, []);

  const isDoorsOpen = selectedCar ? !!doorsOpenMap[selectedCar.id] : false;
  const isTrunkOpen = selectedCar ? !!trunkOpenMap[selectedCar.id] : false;
  const isEngineRunning = selectedCar ? !!engineRunningMap[selectedCar.id] : false;

  return (
    <div className="relative w-full h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] bg-[#090d14] text-white overflow-hidden select-none">
      {/* Hidden GLB/GLTF File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={handleUploadCustomGLB}
      />

      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="w-full h-full" />

      {/* Top Dealership Header Bar (Kalbera Motor Gallery) */}
      <div className="absolute top-0 inset-x-0 z-20 px-3 sm:px-8 py-2.5 sm:py-3.5 flex items-center justify-between gap-2 bg-gradient-to-b from-black/55 via-black/20 to-transparent pointer-events-none">
        {/* Brand Crest & Name */}
        <div
          onClick={() => focusOnCar(null)}
          className="flex items-center gap-2 sm:gap-2.5 pointer-events-auto cursor-pointer group shrink-0"
        >
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-amber-500/15 border border-amber-400/40 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/25 transition-colors">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400/20" />
          </div>
          <div className="flex items-center gap-2 tracking-wider">
            <span className="font-bold text-xs sm:text-base text-white tracking-[0.16em] sm:tracking-[0.18em]">
              KALBERA
            </span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline text-xs text-white/75 tracking-[0.2em] uppercase">
              {lang === 'hy' ? 'ԱՎՏՈՍՐԱՀ 3D' : 'MOTOR GALLERY'}
            </span>
          </div>
        </div>

        {/* Right Dealership Navigation & Actions */}
        <div className="flex items-center gap-2 sm:gap-3.5 pointer-events-auto">
          <button
            type="button"
            onClick={() => focusOnCar(LUXURY_CARS[0])}
            className="hidden lg:inline-block text-[11px] font-medium tracking-[0.16em] text-white/80 hover:text-amber-400 transition-colors uppercase cursor-pointer"
          >
            {lang === 'hy' ? 'ՄԵՔԵՆԱՆԵՐ' : 'INVENTORY'}
          </button>
          <button
            type="button"
            onClick={() => {
              if (!selectedCar) focusOnCar(LUXURY_CARS[0]);
            }}
            className="hidden lg:inline-block text-[11px] font-medium tracking-[0.16em] text-white/80 hover:text-amber-400 transition-colors uppercase cursor-pointer"
          >
            {lang === 'hy' ? 'ՎԱՐԿԱՎՈՐՈՒՄ' : 'FINANCING'}
          </button>

          {/* 7. DAY / NIGHT TOGGLE */}
          <button
            type="button"
            onClick={() => setLotDayMode((d) => !d)}
            aria-label={
              lotDayMode
                ? lang === 'hy'
                  ? 'Փոխել գիշերային ռեժիմի'
                  : 'Switch to Night Lot'
                : lang === 'hy'
                  ? 'Փոխել ցերեկային ռեժիմի'
                  : 'Switch to Day Lot'
            }
            className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono-tech text-amber-300 inline-flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {lotDayMode ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">{lang === 'hy' ? 'Ցերեկ' : 'Day'}</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{lang === 'hy' ? 'Մայրամուտ' : 'Night'}</span>
              </>
            )}
          </button>

          {/* 8K Drone / 3D Lot View Switcher */}
          <button
            type="button"
            onClick={() => setUse8kDroneBackdrop((v) => !v)}
            className={`px-2.5 py-1.5 rounded-full border text-[11px] font-mono-tech inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
              use8kDroneBackdrop
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-white/10 hover:bg-white/15 border-white/15 text-white/90'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">
              {use8kDroneBackdrop
                ? lang === 'hy'
                  ? '8K Տեսարան'
                  : '8K Drone Lot'
                : lang === 'hy'
                  ? '3D Տեսարան'
                  : '3D WebGL Lot'}
            </span>
          </button>

          {/* Upload Custom .GLB/.GLTF 3D Model Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:inline-flex px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono-tech text-white/90 items-center gap-1.5 transition-colors cursor-pointer"
            title={
              lang === 'hy'
                ? 'Բեռնել Ձեր սեփական .glb կամ .gltf 3D մեքենայի մոդելը'
                : 'Load your own .glb or .gltf 3D car model'
            }
          >
            <FileUp className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">
              {lang === 'hy' ? 'Բեռնել .GLB' : 'Load .GLB'}
            </span>
          </button>

          {/* Language Switcher Pill */}
          <button
            type="button"
            onClick={onToggleLang}
            className="px-2.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-[11px] font-mono-tech font-semibold text-amber-300 transition-colors cursor-pointer"
          >
            {lang === 'en' ? 'ՀԱՅ' : 'EN'}
          </button>

          {/* Golden CTA: SCHEDULE A VISIT */}
          <button
            type="button"
            onClick={() => setScheduleModalOpen(true)}
            className="px-3.5 sm:px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-black font-semibold text-[11px] tracking-wider uppercase whitespace-nowrap shadow-lg shadow-amber-500/20 hover:brightness-110 transition-all cursor-pointer"
          >
            <span className="sm:hidden">{lang === 'hy' ? 'ԱՅՑ' : 'VISIT'}</span>
            <span className="hidden sm:inline">{lang === 'hy' ? 'ԱՄՐԱԳՐԵԼ ԱՅՑ' : 'SCHEDULE A VISIT'}</span>
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* OVERLAY 1: TOP-DOWN PARKING LOT (8K DRONE VIEW + HOVER + DIMMING)     */}
      {/* ===================================================================== */}
      {!selectedCar && (
        <>
          {use8kDroneBackdrop && (
            <div className="absolute inset-0 z-10 overflow-hidden bg-[#090d14] flex items-center sm:block">
              {/* On phones the box keeps the photo's exact proportions, so all 6 cars are visible and the tap areas line up */}
              <div className="relative w-full aspect-[1376/768] sm:aspect-auto sm:h-full">
              {/* Night / Golden Hour Dusk Layer */}
              <img
                src="/kalbera-aerial-lot.jpg"
                alt="Annapolis Exotic & Luxury Dealership Aerial Lot Night"
                className={`absolute inset-0 w-full h-full object-cover object-center select-none transition-opacity duration-300 ${
                  lotDayMode ? 'opacity-0' : 'opacity-100'
                }`}
              />

              {/* Day Mode Layer (Smooth Crossfade + Bright Daylight Color Grading) */}
              <img
                src="/kalbera-aerial-lot.jpg"
                alt="Annapolis Exotic & Luxury Dealership Aerial Lot Day"
                style={{
                  filter: 'brightness(1.38) contrast(1.06) saturate(1.12) hue-rotate(-6deg)',
                }}
                className={`absolute inset-0 w-full h-full object-cover object-center select-none transition-opacity duration-300 ${
                  lotDayMode ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Matching Atmospheric Light Overlay */}
              <div
                className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
                  lotDayMode
                    ? 'bg-gradient-to-b from-sky-200/15 via-amber-100/10 to-black/40'
                    : 'bg-gradient-to-b from-black/45 via-transparent to-black/65'
                }`}
              />

              {/* Interactive Clickable Parking Bays + Hover Scale/Glow + Filter Dimming */}
              {LUXURY_CARS.map((car) => {
                const { left, top, badgeLeft, badgeTop } = car.droneHotspot;
                const isHovered = hoveredCarId === car.id;
                const isMatched = matchedCarIds.has(car.id);

                return (
                  <React.Fragment key={car.id}>
                    {/* Clickable Supercar Bay Hitbox with Hover Scale (1.04) & Dimming when filtered out */}
                    <button
                      type="button"
                      onClick={() => focusOnCar(car)}
                      onMouseEnter={() => setHoveredCarId(car.id)}
                      onMouseLeave={() => setHoveredCarId(null)}
                      style={{ left, top }}
                      aria-label={car.fullName}
                      className={`-translate-x-1/2 -translate-y-1/2 absolute w-[13.5%] h-[34%] rounded-2xl transition-all duration-250 cursor-pointer ${
                        !isMatched
                          ? 'bg-black/70 backdrop-grayscale opacity-40'
                          : isHovered
                            ? 'scale-[1.04] ring-2 ring-amber-400 bg-amber-400/10 shadow-[0_0_40px_rgba(245,158,11,0.5)]'
                            : 'hover:ring-1 hover:ring-white/40'
                      }`}
                    />

                    {/* Floating Dealership Price Tag with Hover Enlargement & "View details →" */}
                    <button
                      type="button"
                      onClick={() => focusOnCar(car)}
                      onMouseEnter={() => setHoveredCarId(car.id)}
                      onMouseLeave={() => setHoveredCarId(null)}
                      style={{ left: badgeLeft, top: badgeTop }}
                      className={`hidden md:flex -translate-y-1/2 absolute flex-col items-start px-2.5 py-1.5 rounded-lg border text-left transition-all duration-250 cursor-pointer ${
                        !isMatched
                          ? 'opacity-25 grayscale bg-black/70 text-white/50 border-white/10'
                          : isHovered
                            ? 'bg-amber-500 text-black border-amber-300 scale-110 shadow-[0_0_25px_rgba(245,158,11,0.55)] z-20'
                            : 'bg-black/80 text-white border-white/20 hover:border-amber-400/70 backdrop-blur-md shadow-lg'
                      }`}
                    >
                      <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">
                        {car.model}
                      </span>
                      <span
                        className={`text-[10px] font-mono-tech font-bold ${
                          isHovered ? 'text-black' : 'text-amber-400'
                        }`}
                      >
                        {formatMoney(car.priceUsd)}
                      </span>
                      {isHovered && (
                        <span className="text-[9px] font-mono-tech font-bold text-black/90 mt-0.5 whitespace-nowrap">
                          {lang === 'hy' ? 'Դիտել մանրամասները →' : 'View details →'}
                        </span>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
              </div>
            </div>
          )}

          {/* Center Lot Title Overlay */}
          <div className="absolute inset-x-0 top-[112px] sm:top-0 sm:bottom-0 flex flex-col items-center justify-start sm:justify-center pointer-events-none z-10 px-4 text-center">
            <div className="bg-black/50 backdrop-blur-md px-5 sm:px-10 py-3 sm:py-5 rounded-2xl border border-white/12 shadow-2xl">
              <h1 className="text-xl sm:text-4xl md:text-5xl font-serif font-bold tracking-tight text-white drop-shadow-lg">
                {lang === 'hy'
                  ? 'Էկզոտիկ և Լյուքս Դասի Ավտոմեքենաներ'
                  : 'Exotic & Luxury Pre-Owned Cars'}
              </h1>
              <p className="mt-1 text-base sm:text-xl font-serif italic text-amber-400">
                {lang === 'hy'
                  ? 'Երևան · Աննապոլիս, Մերիլենդ (3D Ավտոսրահ)'
                  : 'in Annapolis, MD'}
              </p>
              <p className="hidden sm:block mt-1.5 text-[11px] sm:text-xs text-white/75 max-w-md mx-auto">
                {lang === 'hy'
                  ? 'Սեղմեք կայանատեղիի ցանկացած մեքենայի վրա՝ 360° դիտելու, դռները բացելու, շարժիչը միացնելու և վարկը հաշվարկելու համար։'
                  : 'Click on any vehicle in the lot to explore specs, pricing, and financing.'}
              </p>
            </div>
          </div>

          {/* Projected Floating Car Price Badges in 3D WebGL Lot Mode */}
          {!use8kDroneBackdrop &&
            badgePositions.map((pos) => {
              if (!pos.visible) return null;
              const car = LUXURY_CARS.find((c) => c.id === pos.id);
              if (!car) return null;
              const isHovered = hoveredCarId === car.id;
              const isMatched = matchedCarIds.has(car.id);

              return (
                <button
                  key={car.id}
                  type="button"
                  onClick={() => focusOnCar(car)}
                  onMouseEnter={() => setHoveredCarId(car.id)}
                  onMouseLeave={() => setHoveredCarId(null)}
                  style={{
                    left: `${pos.x}px`,
                    top: `${pos.y}px`,
                  }}
                  className={`hidden sm:flex -translate-x-1/2 -translate-y-1/2 absolute z-10 flex-col items-start px-2.5 py-1.5 rounded-lg border text-left transition-all duration-250 cursor-pointer ${
                    !isMatched
                      ? 'opacity-25 grayscale bg-black/70 text-white/50 border-white/10'
                      : isHovered
                        ? 'bg-amber-500 text-black border-amber-300 scale-110 shadow-[0_0_25px_rgba(245,158,11,0.55)]'
                        : 'bg-black/80 text-white border-white/15 hover:border-amber-400/60 backdrop-blur-md'
                  }`}
                >
                  <span className="text-[10px] font-semibold leading-tight whitespace-nowrap">
                    {car.model}
                  </span>
                  <span
                    className={`text-[10px] font-mono-tech font-bold ${
                      isHovered ? 'text-black' : 'text-amber-400'
                    }`}
                  >
                    {formatMoney(car.priceUsd)}
                  </span>
                  {isHovered && (
                    <span className="text-[9px] font-mono-tech font-bold text-black/90 mt-0.5 whitespace-nowrap">
                      {lang === 'hy' ? 'Դիտել մանրամասները →' : 'View details →'}
                    </span>
                  )}
                </button>
              );
            })}

          {/* 3. Slim Filter & Search Bar + Bottom Car Selector Strip */}
          <div className="absolute bottom-3 inset-x-0 z-20 flex flex-col items-center gap-2 px-3 sm:px-6 pointer-events-none">
            <MotorLotFilterBar
              lang={lang}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedBrand={selectedBrand}
              onSelectBrand={setSelectedBrand}
              maxPriceUsd={maxPriceUsd}
              onMaxPriceChange={setMaxPriceUsd}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
              matchedCount={matchedCarIds.size}
              totalCount={LUXURY_CARS.length}
              onReset={handleResetFilters}
              formatMoney={formatMoney}
            />

            {/* Bottom Car List with Dimming for non-matching cars */}
            <div className="bg-black/80 backdrop-blur-xl border border-white/15 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto max-w-full pointer-events-auto shadow-2xl">
              {LUXURY_CARS.map((car) => {
                const isMatched = matchedCarIds.has(car.id);
                const isHovered = hoveredCarId === car.id;
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => focusOnCar(car)}
                    onMouseEnter={() => setHoveredCarId(car.id)}
                    onMouseLeave={() => setHoveredCarId(null)}
                    className={`px-3 py-2 rounded-xl border transition-all duration-300 flex items-center gap-2.5 shrink-0 cursor-pointer ${
                      !isMatched
                        ? 'opacity-25 grayscale bg-white/[0.02] border-white/5'
                        : isHovered
                          ? 'bg-amber-500/20 border-amber-400 scale-[1.04] shadow-lg shadow-amber-500/20'
                          : 'bg-white/5 hover:bg-white/15 border-white/10 hover:border-amber-400/50'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/40 shrink-0"
                      style={{ backgroundColor: carColorsMap[car.id] || car.colorHex }}
                    />
                    <div className="text-left">
                      <div className="text-xs font-semibold text-white whitespace-nowrap">
                        {car.fullName}
                      </div>
                      <div className="text-[10px] font-mono-tech text-amber-400">
                        {formatMoney(car.priceUsd)}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* OVERLAY 2: SELECTED CAR INSPECTION VIEW + SLIDE-IN DETAIL PANEL       */}
      {/* ===================================================================== */}
      {selectedCar && (
        <>
          {/* 8K Photorealistic Interactive 360° Stage (Default when inspecting any car!) */}
          {selectedCarViewMode === 'photo' && selectedCar.heroPhotoUrl && (
            <InteractivePhotoStage
              car={selectedCar}
              lotDayMode={lotDayMode}
              isDoorsOpen={isDoorsOpen}
              isTrunkOpen={isTrunkOpen}
              isEngineRunning={isEngineRunning}
              lang={lang}
            />
          )}

          {/* Top-Left "< BACK" Button + 3D 360° / 8K Photo Switcher */}
          <div className="absolute top-13 sm:top-16 left-2.5 sm:left-8 right-2.5 sm:right-auto z-20 flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => focusOnCar(null)}
              className="px-3.5 py-2 rounded-lg bg-[#111318]/90 hover:bg-[#1c2029] border border-white/15 text-xs font-mono-tech font-semibold tracking-wider text-white/90 inline-flex items-center gap-2 backdrop-blur-md shadow-xl transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'hy' ? 'ՀԵՏ ԴԵՊԻ ԿԱՅԱՆԱՏԵՂԻ' : 'BACK'}</span>
            </button>

            <button
              type="button"
              onClick={() => focusOnCar(selectedCar)}
              className="p-2 rounded-lg bg-[#111318]/90 hover:bg-[#1c2029] border border-white/15 text-white/75 hover:text-white backdrop-blur-md shadow-xl transition-all cursor-pointer"
              title={lang === 'hy' ? 'Վերականգնել տեսախցիկը' : 'Reset Camera Angle'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {selectedCar.heroPhotoUrl && (
              <div className="inline-flex items-center p-0.5 rounded-lg bg-[#111318]/90 border border-white/15 backdrop-blur-md shadow-xl">
                <button
                  type="button"
                  onClick={() => setSelectedCarViewMode('3d')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono-tech font-semibold transition-all cursor-pointer ${
                    selectedCarViewMode === '3d'
                      ? 'bg-amber-500 text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {lang === 'hy' ? '3D 360° (Դռներ/Բագաժնիկ)' : '3D 360° Interactive'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCarViewMode('photo')}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-mono-tech font-semibold transition-all cursor-pointer ${
                    selectedCarViewMode === 'photo'
                      ? 'bg-amber-500 text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {lang === 'hy' ? '8K Լուսանկար' : '8K Photo'}
                </button>
              </div>
            )}
          </div>

          {/* Bottom-Left Car Carousel Switcher */}
          <div className="hidden sm:flex absolute bottom-4 left-4 sm:left-8 right-4 lg:right-[430px] z-20 items-center justify-between gap-3 pointer-events-none">
            <div className="bg-[#0e1015]/85 backdrop-blur-xl border border-white/10 rounded-xl p-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full pointer-events-auto shadow-2xl">
              {LUXURY_CARS.map((car) => {
                const active = car.id === selectedCar.id;
                const isMatched = matchedCarIds.has(car.id);
                return (
                  <button
                    key={car.id}
                    type="button"
                    onClick={() => focusOnCar(car)}
                    className={`px-3 py-1.5 rounded-lg text-left transition-all duration-300 flex items-center gap-2 shrink-0 cursor-pointer ${
                      !isMatched
                        ? 'opacity-25 grayscale text-white/40'
                        : active
                          ? 'bg-amber-500 text-black font-semibold shadow-md'
                          : 'text-white/75 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/30 shrink-0"
                      style={{ backgroundColor: carColorsMap[car.id] || car.colorHex }}
                    />
                    <span className="text-xs whitespace-nowrap">{car.model}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1 & 2. Slide-in Right Side Vehicle Detail & Financing Panel */}
          {isDetailPanelHidden ? (
            <button
              type="button"
              onClick={() => setIsDetailPanelHidden(false)}
              className="fixed right-4 top-1/2 -translate-y-1/2 z-40 px-4 py-2.5 rounded-xl bg-black/70 hover:bg-black/85 border border-white/15 text-amber-300 text-sm font-semibold backdrop-blur-md shadow-xl cursor-pointer"
            >
              {lang === 'hy' ? '‹ Մանրամասներ' : '‹ Details'}
            </button>
          ) : (
          <VehicleDetailPanel
            car={selectedCar}
            lang={lang}
            formatMoney={formatMoney}
            activeColorHex={carColorsMap[selectedCar.id] || selectedCar.colorHex}
            onSelectColor={handleSelectColor}
            isDoorsOpen={isDoorsOpen}
            onToggleDoors={handleToggleDoors}
            isTrunkOpen={isTrunkOpen}
            onToggleTrunk={handleToggleTrunk}
            isEngineRunning={isEngineRunning}
            onToggleEngine={handleToggleEngine}
            onRevEngine={handleRevEngine}
            isCompared={compareIds.includes(selectedCar.id)}
            onToggleCompare={handleToggleCompare}
            onOpenScheduleModal={() => setScheduleModalOpen(true)}
            onClose={() => setIsDetailPanelHidden(true)}
            customGlbUrl={customModelUrls[selectedCar.id]}
            customGlbName={customModelNames[selectedCar.id]}
          />
          )}
        </>
      )}

      {/* 5. Schedule a Visit Form Modal (with localStorage persistence) */}
      <ScheduleVisitModal
        open={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        initialCarId={selectedCarId}
        lang={lang}
        formatMoney={formatMoney}
      />

      {/* 6. Floating Compare Bar & Side-by-Side Comparison Modal */}
      <CarCompareModalAndBar
        compareIds={compareIds}
        onRemoveFromCompare={(id) => setCompareIds((prev) => prev.filter((item) => item !== id))}
        onClearCompare={() => {
          setCompareIds([]);
          setCompareModalOpen(false);
        }}
        compareModalOpen={compareModalOpen}
        onOpenCompareModal={() => setCompareModalOpen(true)}
        onCloseCompareModal={() => setCompareModalOpen(false)}
        lang={lang}
        formatMoney={formatMoney}
        carColorsMap={carColorsMap}
      />
    </div>
  );
};
