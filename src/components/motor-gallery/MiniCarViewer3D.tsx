import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RotateCw } from 'lucide-react';
import { LuxuryCarSpec } from '../../data/luxuryCarsData';
import { buildLuxuryCarRig, CarRig3D } from '../../three/buildLuxuryCars';
import { createAutomotiveDuskEnvironment } from '../../three/carMaterialsAndTextures';
import { disposeObject3D } from '../../three/webglUtils';
import { Language } from '../../types/hardware';

interface MiniCarViewer3DProps {
  car: LuxuryCarSpec;
  activeColorHex: string;
  doorsOpen: boolean;
  trunkOpen: boolean;
  engineRunning: boolean;
  customGlbUrl?: string;
  customGlbName?: string;
  lang: Language;
}

export const MiniCarViewer3D: React.FC<MiniCarViewer3DProps> = ({
  car,
  activeColorHex,
  doorsOpen,
  trunkOpen,
  engineRunning,
  customGlbUrl,
  customGlbName,
  lang,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<CarRig3D | null>(null);
  const doorsOpenRef = useRef<boolean>(doorsOpen);
  const trunkOpenRef = useRef<boolean>(trunkOpen);
  const engineRunningRef = useRef<boolean>(engineRunning);

  useEffect(() => {
    doorsOpenRef.current = doorsOpen;
  }, [doorsOpen]);

  useEffect(() => {
    trunkOpenRef.current = trunkOpen;
  }, [trunkOpen]);

  useEffect(() => {
    engineRunningRef.current = engineRunning;
  }, [engineRunning]);

  // Update paint color dynamically
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;
    for (const mat of rig.paintMaterials) {
      mat.color.set(activeColorHex);
    }
  }, [activeColorHex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 340;
    const height = container.clientHeight || 190;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0b0e16');

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 50);
    camera.position.set(3.5, 1.85, 4.1);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const envTex = createAutomotiveDuskEnvironment(renderer, scene);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e1b18, 0.95);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffedd5, 2.5);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 1.4);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    // Subtle Studio Turntable Ring under the car
    const ringGeo = new THREE.RingGeometry(2.35, 2.45, 64);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = 0.01;
    scene.add(ringMesh);

    const rig = buildLuxuryCarRig({
      ...car,
      colorHex: activeColorHex,
      parkingSlot: { ...car.parkingSlot, x: 0, z: 0, rotationY: 0 },
    });
    scene.add(rig.root);
    rigRef.current = rig;

    // Load custom .GLB if provided for this vehicle
    if (customGlbUrl) {
      const loader = new GLTFLoader();
      loader.load(customGlbUrl, (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.001);
        const scale = 4.2 / maxDim;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

        rig.customModelGroup.add(model);
        rig.customModelGroup.visible = true;
        rig.bodyShellGroup.visible = false;
        rig.wheels.forEach((w) => {
          w.visible = false;
        });
      });
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 2.0;
    controls.enablePan = false;
    controls.minDistance = 3.2;
    controls.maxDistance = 7.5;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.target.set(0, 0.65, 0);

    let frameId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      controls.update();

      const currentRig = rigRef.current;
      if (currentRig) {
        const isOpen = doorsOpenRef.current;
        const isRunning = engineRunningRef.current;
        const targetAngle = isOpen ? 1.05 : 0;
        const targetButterflyZ = isOpen ? 0.55 : 0;

        if (currentRig.doorType === 'butterfly') {
          currentRig.leftDoorPivot.rotation.y = THREE.MathUtils.lerp(
            currentRig.leftDoorPivot.rotation.y,
            targetAngle * 0.75,
            0.12
          );
          currentRig.leftDoorPivot.rotation.z = THREE.MathUtils.lerp(
            currentRig.leftDoorPivot.rotation.z,
            targetButterflyZ,
            0.12
          );
          currentRig.rightDoorPivot.rotation.y = THREE.MathUtils.lerp(
            currentRig.rightDoorPivot.rotation.y,
            -targetAngle * 0.75,
            0.12
          );
          currentRig.rightDoorPivot.rotation.z = THREE.MathUtils.lerp(
            currentRig.rightDoorPivot.rotation.z,
            -targetButterflyZ,
            0.12
          );
        } else {
          currentRig.leftDoorPivot.rotation.y = THREE.MathUtils.lerp(
            currentRig.leftDoorPivot.rotation.y,
            targetAngle,
            0.12
          );
          currentRig.rightDoorPivot.rotation.y = THREE.MathUtils.lerp(
            currentRig.rightDoorPivot.rotation.y,
            -targetAngle,
            0.12
          );
        }

        if (isRunning) {
          currentRig.bodyShellGroup.position.y = Math.sin(elapsed * 48) * 0.004;
        } else {
          currentRig.bodyShellGroup.position.y = 0;
        }

        const isTrunkOpen = trunkOpenRef.current;
        if (currentRig.isSideHingedTrunk) {
          currentRig.trunkPivot.rotation.y = THREE.MathUtils.lerp(
            currentRig.trunkPivot.rotation.y,
            isTrunkOpen ? -1.15 : 0,
            0.12
          );
        } else {
          currentRig.trunkPivot.rotation.x = THREE.MathUtils.lerp(
            currentRig.trunkPivot.rotation.x,
            isTrunkOpen ? 0.92 : 0,
            0.12
          );
        }
        currentRig.frunkPivot.rotation.x = THREE.MathUtils.lerp(
          currentRig.frunkPivot.rotation.x,
          isTrunkOpen ? -0.78 : 0,
          0.12
        );
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(frameId);
      controls.dispose();
      envTex.dispose();
      disposeObject3D(scene);
      renderer.dispose();
    };
  }, [car, customGlbUrl]);

  return (
    <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/12 bg-[#0b0e16] group">
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/10 text-[10px] font-mono-tech text-amber-400 flex items-center gap-1.5 pointer-events-none">
        <RotateCw className="w-3 h-3 animate-spin" style={{ animationDuration: '6s' }} />
        <span>
          {customGlbName
            ? `GLB: ${customGlbName}`
            : lang === 'hy'
              ? '360° 3D ՄՈԴԵԼ'
              : '360° 3D STUDIO'}
        </span>
      </div>
      <div className="absolute bottom-2 right-2.5 text-[10px] font-mono-tech text-white/50 pointer-events-none">
        {lang === 'hy' ? 'Քաշեք՝ պտտելու համար' : 'Drag to rotate'}
      </div>
    </div>
  );
};
