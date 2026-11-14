import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { getExplodedLayersForDevice } from '../data/devices';
import { TRANSLATIONS } from '../data/i18n';
import {
  DeviceSpec,
  ExplodedLayerId,
  FinishOption,
  Language,
} from '../types/hardware';
import { buildDeviceModel, DeviceRig } from '../three/buildDeviceModel';
import {
  createContactShadowTexture,
  createStudioEnvironment,
  detectSoftwareWebGL,
  disposeObject3D,
} from '../three/webglUtils';

export type CameraPreset = 'iso' | 'front' | 'back' | 'edge';

interface HardwareViewport3DProps {
  device: DeviceSpec;
  finish: FinishOption;
  explode: number; // 0..1
  hingeDeg: number; // 0..135
  foldDeg: number; // 0..180
  lensExtended: boolean;
  cameraPreset: CameraPreset;
  presetTrigger: number;
  autoSpin: boolean;
  lang: Language;
  darkMode: boolean;
  scaleMultiplier?: number;
  syncedRotation?: { theta: number; phi: number } | null;
  onCameraRotate?: (theta: number, phi: number) => void;
  selectedLayer?: ExplodedLayerId | null;
  onSelectLayer?: (layer: ExplodedLayerId | null) => void;
  heightClassName?: string;
  compactControls?: boolean;
}

const _sph = new THREE.Spherical();
const _vec3 = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _pointer = new THREE.Vector2();

function getPresetCameraCoords(preset: CameraPreset, dist: number): THREE.Vector3 {
  switch (preset) {
    case 'front':
      return new THREE.Vector3(0, 0.25, dist);
    case 'back':
      return new THREE.Vector3(0, 0.25, -dist);
    case 'edge':
      return new THREE.Vector3(dist * 0.95, 0.3, dist * 0.28);
    case 'iso':
    default:
      return new THREE.Vector3(dist * 0.62, dist * 0.35, dist * 0.78);
  }
}

export const HardwareViewport3D: React.FC<HardwareViewport3DProps> = ({
  device,
  finish,
  explode,
  hingeDeg,
  foldDeg,
  lensExtended,
  cameraPreset,
  presetTrigger,
  autoSpin,
  lang,
  darkMode,
  scaleMultiplier = 1,
  syncedRotation = null,
  onCameraRotate,
  selectedLayer = null,
  onSelectLayer,
  heightClassName = 'h-[400px] sm:h-[480px] lg:h-[540px]',
  compactControls = false,
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [internalLayer, setInternalLayer] = useState<ExplodedLayerId | null>(null);

  const activeLayer = selectedLayer !== undefined ? selectedLayer : internalLayer;
  const setLayer = (l: ExplodedLayerId | null) => {
    setInternalLayer(l);
    onSelectLayer?.(l);
  };

  // Lazy-load 3D viewport when scrolling into view
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stateRef = useRef({
    explode,
    hingeDeg,
    foldDeg,
    lensExtended,
    autoSpin,
    scaleMultiplier,
    darkMode,
    activeLayer,
  });
  stateRef.current = {
    explode,
    hingeDeg,
    foldDeg,
    lensExtended,
    autoSpin,
    scaleMultiplier,
    darkMode,
    activeLayer,
  };

  const onRotateRef = useRef(onCameraRotate);
  onRotateRef.current = onCameraRotate;

  const setLayerRef = useRef(setLayer);
  setLayerRef.current = setLayer;

  const sceneHandleRef = useRef<{
    rig: DeviceRig | null;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    maxAnisotropy: number;
    requestRender: () => void;
    applyModel: (d: DeviceSpec, f: FinishOption) => void;
    flyToPreset: (preset: CameraPreset, dist: number) => void;
    updateHighlight: (layer: ExplodedLayerId | null) => void;
    resetView: () => void;
  } | null>(null);

  useEffect(() => {
    if (!inView) return;
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isSoftwareGl = detectSoftwareWebGL();
    const width = Math.max(container.clientWidth, 280);
    const height = Math.max(container.clientHeight, 280);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const handleLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => {
      setContextLost(false);
    };
    canvas.addEventListener('webglcontextlost', handleLost);
    canvas.addEventListener('webglcontextrestored', handleRestored);

    const scene = new THREE.Scene();
    const envTex = createStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    camera.position.copy(getPresetCameraCoords('iso', 6.4));

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f2e21, 0.68);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1dc, 1.7);
    keyLight.position.set(5, 7, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    keyLight.shadow.camera.left = -4;
    keyLight.shadow.camera.right = 4;
    keyLight.shadow.camera.top = 4;
    keyLight.shadow.camera.bottom = -4;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x93c5fd, 0.8);
    rimLight.position.set(-5, 3, -5);
    scene.add(rimLight);

    // Subtle reflective studio pedestal + contact shadow
    const shadowTex = createContactShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(5.8, 5.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -2.25;
    scene.add(shadowPlane);

    const floorDisc = new THREE.Mesh(
      new THREE.CircleGeometry(3.2, 48),
      new THREE.MeshPhysicalMaterial({
        color: 0x8a8275,
        metalness: 0.4,
        roughness: 0.25,
        clearcoat: 0.7,
        transparent: true,
        opacity: 0.14,
        depthWrite: false,
      })
    );
    floorDisc.rotation.x = -Math.PI / 2;
    floorDisc.position.y = -2.27;
    floorDisc.receiveShadow = !isSoftwareGl;
    scene.add(floorDisc);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.065;
    controls.enablePan = false;
    controls.minDistance = 3.0;
    controls.maxDistance = 12.0;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_ROTATE,
    };

    const maxAnisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    let activeRig: DeviceRig | null = null;
    let currentDeviceId = '';
    let targetCamPos: THREE.Vector3 | null = null;
    let frameId = 0;
    let renderBusy = false;
    let renderDirty = false;
    let lastTime = performance.now();
    let lastUserInteraction = 0;
    let disposed = false;

    let currentExplode = stateRef.current.explode;
    let currentHinge = stateRef.current.hingeDeg;
    let currentFold = stateRef.current.foldDeg;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) return;
          const st = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (st === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 75);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 75);
      }
    };

    const requestRender = () => {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const now = performance.now();
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;

        const targetState = stateRef.current;
        currentExplode = THREE.MathUtils.damp(currentExplode, targetState.explode, 9, dt);
        currentHinge = THREE.MathUtils.damp(currentHinge, targetState.hingeDeg, 9, dt);
        currentFold = THREE.MathUtils.damp(currentFold, targetState.foldDeg, 9, dt);

        if (activeRig) {
          activeRig.applyKinematics(
            currentExplode,
            currentHinge,
            currentFold,
            targetState.lensExtended
          );
          const s = targetState.scaleMultiplier;
          activeRig.root.scale.set(s, s, s);
        }

        if (targetCamPos) {
          controls.autoRotate = false;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, targetCamPos.x, 9, dt);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, targetCamPos.y, 9, dt);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, targetCamPos.z, 9, dt);
          if (camera.position.distanceTo(targetCamPos) < 0.06) {
            camera.position.copy(targetCamPos);
            targetCamPos = null;
          } else {
            renderDirty = true;
          }
        } else {
          const isIdle = now - lastUserInteraction > 3200;
          controls.autoRotate =
            (targetState.autoSpin || isIdle) && !isSoftwareGl && !prefersReducedMotion;
          controls.autoRotateSpeed = 1.25;
          if (controls.autoRotate) {
            renderDirty = true;
          }
        }

        if (
          Math.abs(currentExplode - targetState.explode) > 0.004 ||
          Math.abs(currentHinge - targetState.hingeDeg) > 0.15 ||
          Math.abs(currentFold - targetState.foldDeg) > 0.15
        ) {
          renderDirty = true;
        }

        controls.update();
        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (renderDirty && !disposed) requestRender();
        };
        if (isSoftwareGl) {
          afterDraw(done);
        } else {
          done();
        }
      });
    };

    const resetView = () => {
      const dist =
        device.category === 'laptop' || device.geometryType === 'foldable-trifold' ? 5.6 : 4.9;
      targetCamPos = getPresetCameraCoords('iso', dist);
      controls.target.set(0, 0, 0);
      requestRender();
    };

    const flyToPreset = (preset: CameraPreset, dist: number) => {
      targetCamPos = getPresetCameraCoords(preset, dist);
      controls.target.set(0, 0, 0);
      requestRender();
    };

    const applyModel = (d: DeviceSpec, f: FinishOption) => {
      setModelReady(false);
      const isNewDevice = currentDeviceId !== d.id;
      currentDeviceId = d.id;

      if (activeRig) {
        modelGroup.remove(activeRig.root);
        disposeObject3D(activeRig.root);
      }
      activeRig = buildDeviceModel(d, f, maxAnisotropy);
      modelGroup.add(activeRig.root);

      const box = new THREE.Box3().setFromObject(activeRig.root);
      const floorY = Math.min(-1.2, box.min.y - 0.35);
      shadowPlane.position.y = floorY;
      floorDisc.position.y = floorY - 0.02;

      if (isNewDevice) {
        const dist = d.category === 'laptop' || d.geometryType === 'foldable-trifold' ? 5.6 : 4.9;
        targetCamPos = null;
        camera.position.copy(getPresetCameraCoords('iso', dist));
        controls.target.set(0, 0, 0);
        controls.update();
      }

      activeRig.applyKinematics(
        stateRef.current.explode,
        stateRef.current.hingeDeg,
        stateRef.current.foldDeg,
        stateRef.current.lensExtended
      );
      activeRig.highlightLayer(stateRef.current.activeLayer);
      if (!isSoftwareGl) {
        renderer.compile(scene, camera);
      }
      setModelReady(true);
      requestRender();
    };

    const updateHighlight = (layer: ExplodedLayerId | null) => {
      activeRig?.highlightLayer(layer);
      requestRender();
    };

    // Raycast tap for X-Ray layer inspection + Double-tap to reset
    let downX = 0;
    let downY = 0;
    let lastTapTime = 0;

    const onPointerDown = (e: PointerEvent) => {
      lastUserInteraction = performance.now();
      downX = e.clientX;
      downY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      lastUserInteraction = performance.now();
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved > 6) return;

      const now = performance.now();
      if (now - lastTapTime < 300) {
        // Double-tap resets view
        resetView();
        setLayerRef.current(null);
        lastTapTime = 0;
        return;
      }
      lastTapTime = now;

      // Single-tap raycasts exploded layers
      if (activeRig && stateRef.current.explode > 0.08) {
        const rect = canvas.getBoundingClientRect();
        _pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        _pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        _raycaster.setFromCamera(_pointer, camera);
        const hits = _raycaster.intersectObject(activeRig.root, true);
        if (hits.length > 0) {
          const hitLayer = hits[0].object.userData.layerId as ExplodedLayerId | undefined;
          if (hitLayer) {
            const nextLayer = stateRef.current.activeLayer === hitLayer ? null : hitLayer;
            setLayerRef.current(nextLayer);
            activeRig.highlightLayer(nextLayer);
            requestRender();
          }
        }
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);

    controls.addEventListener('start', () => {
      lastUserInteraction = performance.now();
      targetCamPos = null;
    });

    controls.addEventListener('change', () => {
      if (onRotateRef.current) {
        _vec3.copy(camera.position).sub(controls.target);
        _sph.setFromVector3(_vec3);
        onRotateRef.current(_sph.theta, _sph.phi);
      }
      requestRender();
    });

    const resizeObserver = new ResizeObserver(() => {
      if (disposed || !container) return;
      const w = Math.max(container.clientWidth, 240);
      const h = Math.max(container.clientHeight, 240);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    });
    resizeObserver.observe(container);

    sceneHandleRef.current = {
      rig: activeRig,
      scene,
      camera,
      controls,
      maxAnisotropy,
      requestRender,
      applyModel,
      flyToPreset,
      updateHighlight,
      resetView,
    };

    applyModel(device, finish);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('webglcontextlost', handleLost);
      canvas.removeEventListener('webglcontextrestored', handleRestored);
      controls.dispose();
      disposeObject3D(scene);
      envTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (canvas.parentElement === container) {
        container.removeChild(canvas);
      }
    };
  }, [inView]);

  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    handle.applyModel(device, finish);
  }, [device.id, finish.id]);

  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle) return;
    const dist =
      device.category === 'laptop' || device.geometryType === 'foldable-trifold' ? 5.6 : 4.9;
    handle.flyToPreset(cameraPreset, dist);
  }, [cameraPreset, presetTrigger]);

  useEffect(() => {
    sceneHandleRef.current?.updateHighlight(activeLayer);
  }, [activeLayer]);

  useEffect(() => {
    sceneHandleRef.current?.requestRender();
  }, [explode, hingeDeg, foldDeg, lensExtended, autoSpin, scaleMultiplier]);

  useEffect(() => {
    const handle = sceneHandleRef.current;
    if (!handle || !syncedRotation) return;
    const r = handle.camera.position.distanceTo(handle.controls.target);
    _sph.set(r, syncedRotation.phi, syncedRotation.theta);
    _vec3.setFromSpherical(_sph).add(handle.controls.target);
    handle.camera.position.copy(_vec3);
    handle.controls.update();
    handle.requestRender();
  }, [syncedRotation]);

  const t = TRANSLATIONS[lang];
  const layersMap = getExplodedLayersForDevice(device);
  const inspectedInfo = activeLayer ? layersMap[activeLayer] : null;
  const layerOrder: ExplodedLayerId[] = [
    'display',
    'logic_board',
    'battery',
    'camera_module',
    'back_glass',
  ];

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${heightClassName} rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] overflow-hidden select-none`}
    >
      {/* Loading Skeleton while lazy-loading or building 3D geometry */}
      {(!inView || !modelReady) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--bg-surface)] animate-pulse p-6">
          <div className="w-24 h-40 rounded-2xl border-2 border-[var(--accent)]/40 bg-[var(--bg-subtle)]" />
          <span className="text-xs font-mono-tech text-[var(--text-secondary)]">
            {t.viewport3D.loadingModel}
          </span>
        </div>
      )}

      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        aria-label={`${device.name} interactive 3D viewport`}
      />

      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-surface)]">
          <p className="text-sm font-medium text-[var(--text-primary)]">{device.name}</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t.viewport3D.webglFallback}</p>
        </div>
      )}

      {/* Interactive X-Ray Layer Selector & Spec Callout when Exploded > 5% */}
      {explode > 0.05 && (
        <div className="absolute top-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
            {layerOrder.map((lid) => {
              const isSelected = activeLayer === lid;
              return (
                <button
                  key={lid}
                  type="button"
                  onClick={() => setLayer(isSelected ? null : lid)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono-tech border transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[#0B0C10] border-[var(--accent)] font-semibold'
                      : 'bg-[var(--bg-elevated)]/92 text-[var(--text-primary)] border-[var(--border-hairline)] hover:border-[var(--accent)]'
                  }`}
                >
                  {t.viewport3D.layers[lid]}
                </button>
              );
            })}
          </div>

          {inspectedInfo && (
            <div className="pointer-events-auto max-w-md p-3 rounded-xl bg-[var(--bg-elevated)]/95 border border-[var(--accent)] shadow-lg space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-mono-tech uppercase text-[var(--accent)] font-semibold">
                  {inspectedInfo.name[lang]}
                </span>
                <button
                  type="button"
                  onClick={() => setLayer(null)}
                  className="text-[10px] font-mono-tech text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  ✕
                </button>
              </div>
              <div className="text-xs font-semibold text-[var(--text-primary)]">
                {inspectedInfo.spec[lang]}
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-snug">
                {inspectedInfo.explanation[lang]}
              </p>
            </div>
          )}
        </div>
      )}

      {!compactControls && (
        <div className="pointer-events-none absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)]/92 border border-[var(--border-hairline)] text-[11px] font-mono-tech text-[var(--text-secondary)]">
          {explode > 0.05 ? t.viewport3D.tapLayerHint : t.viewport3D.dragHint}
        </div>
      )}
    </div>
  );
};
