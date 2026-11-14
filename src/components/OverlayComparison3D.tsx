import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DeviceSpec, FinishOption, Language } from '../types/hardware';
import { buildDeviceModel } from '../three/buildDeviceModel';
import {
  createContactShadowTexture,
  createStudioEnvironment,
  detectSoftwareWebGL,
  disposeObject3D,
} from '../three/webglUtils';

interface OverlayComparison3DProps {
  devices: DeviceSpec[];
  finishes: FinishOption[];
  explode: number;
  autoSpin: boolean;
  lang?: Language;
}

const OVERLAY_SWATCHES = [
  { hex: '#2563EB', num: 0x2563eb, opacity: 0.85, labelEn: 'Front (85%)', labelHy: 'Առջևի (85%)' },
  { hex: '#D97706', num: 0xd97706, opacity: 0.78, labelEn: 'Middle (78%)', labelHy: 'Միջին (78%)' },
  { hex: '#059669', num: 0x059669, opacity: 0.72, labelEn: 'Back (72%)', labelHy: 'Հետևի (72%)' },
];

export const OverlayComparison3D: React.FC<OverlayComparison3DProps> = ({
  devices,
  finishes,
  explode,
  autoSpin,
  lang = 'en',
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 320);
    const height = Math.max(container.clientHeight, 360);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const scene = new THREE.Scene();
    const envTex = createStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);
    camera.position.set(3.8, 2.1, 5.6);

    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x3f2e21, 0.8);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.8);
    keyLight.position.set(5, 7, 5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 1.1);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    const shadowTex = createContactShadowTexture();
    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(6.8, 6.8),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      })
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.35;
    scene.add(shadowPlane);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;

    const maxSpan = Math.max(...devices.map((d) => d.dimensionsMm.height), 160);

    // Build each device with distinct solid colours and front device opacity = 0.85
    const rigs = devices.map((d, idx) => {
      const swatch = OVERLAY_SWATCHES[idx % OVERLAY_SWATCHES.length];
      const rig = buildDeviceModel(d, finishes[idx] || d.finishes[0], 4);
      const relScale = Math.max(0.55, Math.min(1.18, d.dimensionsMm.height / maxSpan));
      rig.root.scale.set(relScale, relScale, relScale);

      // Front device (idx 0) sits in front (+Z), subsequent devices sit slightly behind (-Z)
      const zOffset = ((devices.length - 1) / 2 - idx) * 0.42;
      rig.root.position.z = zOffset;
      rig.applyKinematics(explode, 112, 165, true);

      const solidOverlayMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(swatch.num),
        metalness: 0.35,
        roughness: 0.25,
        clearcoat: 0.6,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: swatch.opacity,
        depthWrite: idx === 0,
      });

      const accentOverlayMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(swatch.num).offsetHSL(0, 0.1, 0.12),
        metalness: 0.65,
        roughness: 0.2,
        transparent: true,
        opacity: Math.min(0.95, swatch.opacity + 0.08),
      });

      rig.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.renderOrder = devices.length - idx;
          // Apply distinct solid colour + target opacity (front device = 0.85)
          obj.material = obj.geometry.type === 'CylinderGeometry' ? accentOverlayMat : solidOverlayMat;
        }
      });

      scene.add(rig.root);
      return rig;
    });

    let frameId = 0;
    let disposed = false;

    const renderLoop = () => {
      if (disposed) return;
      rigs.forEach((r) => r.applyKinematics(explode, 112, 165, true));
      controls.autoRotate = autoSpin && !isSoftwareGl;
      controls.update();
      renderer.render(scene, camera);
      if (isSoftwareGl) {
        frameId = window.setTimeout(renderLoop, 80);
      } else {
        frameId = requestAnimationFrame(renderLoop);
      }
    };
    renderLoop();

    const onResize = () => {
      if (disposed || !container) return;
      const w = Math.max(container.clientWidth, 280);
      const h = Math.max(container.clientHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      disposeObject3D(scene);
      envTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [devices, finishes, explode, autoSpin]);

  return (
    <div className="relative w-full h-[420px] sm:h-[500px] rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
      <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap gap-2">
        {devices.map((d, i) => {
          const sw = OVERLAY_SWATCHES[i % OVERLAY_SWATCHES.length];
          return (
            <div
              key={`${d.id}-${i}`}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-xs font-mono-tech flex items-center gap-2 shadow-sm"
            >
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                style={{ backgroundColor: sw.hex }}
              />
              <span className="font-semibold">{d.name}</span>
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                {lang === 'hy' ? sw.labelHy : sw.labelEn}
              </span>
              <span className="text-[var(--text-secondary)] hidden sm:inline">
                {d.dimensionsMm.height}×{d.dimensionsMm.width}×{d.dimensionsMm.depth} mm
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
