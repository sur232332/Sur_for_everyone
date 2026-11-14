import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { ApplianceCategoryId } from '../data/homeGuideData';
import {
  ApplianceInteractiveState,
  buildSingleAppliance,
  updateApplianceRigAnimation,
} from '../three/buildHomeAppliances';

interface ApplianceCloseup3DProps {
  category: ApplianceCategoryId;
  interactiveState: ApplianceInteractiveState;
  darkMode: boolean;
}

export const ApplianceCloseup3D: React.FC<ApplianceCloseup3DProps> = ({
  category,
  interactiveState,
  darkMode,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef<ApplianceInteractiveState>(interactiveState);

  useEffect(() => {
    stateRef.current = interactiveState;
  }, [interactiveState]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    let pmrem: THREE.PMREMGenerator | null = null;
    let envTarget: THREE.WebGLRenderTarget | null = null;
    let animId = 0;

    try {
      const w = Math.max(container.clientWidth, 240);
      const h = Math.max(container.clientHeight, 220);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(w, h);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(darkMode ? 0x11131a : 0xf4efe4);

      pmrem = new THREE.PMREMGenerator(renderer);
      envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = envTarget.texture;

      const camera = new THREE.PerspectiveCamera(40, w / h, 0.05, 25);

      const rig = buildSingleAppliance(category);
      // Center appliance vertically for close-up inspection
      const box = new THREE.Box3().setFromObject(rig.root);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      rig.root.position.sub(center);
      scene.add(rig.root);

      const maxDim = Math.max(size.x, size.y, size.z, 0.5);
      camera.position.set(maxDim * 1.15, maxDim * 0.55, maxDim * 1.55);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.minDistance = maxDim * 0.7;
      controls.maxDistance = maxDim * 3.2;
      controls.target.set(0, 0, 0);

      const ambient = new THREE.AmbientLight(0xfff8eb, 0.85);
      scene.add(ambient);

      const keyLight = new THREE.DirectionalLight(0xfff2dc, 1.6);
      keyLight.position.set(2.5, 3.5, 3.0);
      scene.add(keyLight);

      // Subtle pedestal disc
      const discGeo = new THREE.CylinderGeometry(maxDim * 0.72, maxDim * 0.76, 0.025, 36);
      const discMat = new THREE.MeshStandardMaterial({
        color: darkMode ? 0x1e222d : 0xe5decb,
        roughness: 0.45,
        metalness: 0.15,
      });
      const disc = new THREE.Mesh(discGeo, discMat);
      disc.position.set(0, -size.y / 2 - 0.015, 0);
      scene.add(disc);

      const handleResize = () => {
        if (!container) return;
        const nw = Math.max(container.clientWidth, 240);
        const nh = Math.max(container.clientHeight, 220);
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener('resize', handleResize);

      let lastTime = performance.now();
      const animate = (now: number) => {
        animId = requestAnimationFrame(animate);
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        const elapsed = now / 1000;

        updateApplianceRigAnimation(rig, stateRef.current, false, dt, elapsed);
        controls.update();
        renderer.render(scene, camera);
      };
      animId = requestAnimationFrame(animate);

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        controls.dispose();
        envTarget?.dispose();
        pmrem?.dispose();
        renderer.dispose();
      };
    } catch {
      return;
    }
  }, [category, darkMode]);

  return (
    <div
      ref={mountRef}
      className="w-full h-56 sm:h-64 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] overflow-hidden cursor-grab active:cursor-grabbing"
    />
  );
};
