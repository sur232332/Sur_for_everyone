import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  Camera,
  Check,
  Maximize2,
  QrCode,
  RotateCcw,
  Ruler,
  Sparkles,
  X,
} from 'lucide-react';
import { DeviceSpec, FinishOption, Language } from '../types/hardware';
import { TRANSLATIONS } from '../data/i18n';
import { buildDeviceModel, DeviceRig } from '../three/buildDeviceModel';
import {
  createContactShadowTexture,
  createStudioEnvironment,
  detectSoftwareWebGL,
  disposeObject3D,
} from '../three/webglUtils';

interface ARViewerModalProps {
  device: DeviceSpec;
  finish: FinishOption;
  lang: Language;
  onClose: () => void;
}

type ARStageTab = 'model-viewer' | 'camera' | 'grid';

/** Deterministic SVG QR-like matrix generator for sharing the mobile AR link without external calls */
function generateQrMatrix(text: string, size = 21): boolean[][] {
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  const drawFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        grid[r0 + r][c0 + c] = isBorder || isInner;
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, size - 7);
  drawFinder(size - 7, 0);

  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inFinder =
        (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
      if (inFinder) continue;
      if (r === 6 || c === 6) {
        grid[r][c] = (r + c) % 2 === 0;
        continue;
      }
      hash ^= (r * 31 + c * 17) & 0xff;
      hash = Math.imul(hash, 16777619);
      grid[r][c] = (Math.abs(hash) % 10) < 5;
    }
  }
  return grid;
}

export const ARViewerModal: React.FC<ARViewerModalProps> = ({
  device,
  finish,
  lang,
  onClose,
}) => {
  const t = TRANSLATIONS[lang];
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [activeTab, setActiveTab] = useState<ARStageTab>('model-viewer');
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [arSupported, setArSupported] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [showRuler, setShowRuler] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<boolean>(false);
  const [photoSaved, setPhotoSaved] = useState<boolean>(false);

  // Interactive AR Spatial Transform Controls
  const [arScale, setArScale] = useState(1.0);
  const [arYawDeg, setArYawDeg] = useState(25);
  const [arExplode, setArExplode] = useState(0);
  const [arFoldDeg, setArFoldDeg] = useState(165);
  const [arHingeDeg, setArHingeDeg] = useState(112);
  const [arLensExt, setArLensExt] = useState(true);
  const [placedOffset, setPlacedOffset] = useState({ x: 0, y: -0.2 });

  const transformRef = useRef({
    arScale,
    arYawDeg,
    arExplode,
    arFoldDeg,
    arHingeDeg,
    arLensExt,
    placedOffset,
  });
  transformRef.current = {
    arScale,
    arYawDeg,
    arExplode,
    arFoldDeg,
    arHingeDeg,
    arLensExt,
    placedOffset,
  };

  const dragStateRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const shareUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://siliconpulse.app';
    return `${origin}/?ar=${device.id}`;
  }, [device.id]);

  const qrMatrix = useMemo(() => generateQrMatrix(shareUrl, 21), [shareUrl]);

  // 1. Export real-size .glb Blob for <model-viewer> (1 scene unit scaled to exact meters)
  useEffect(() => {
    let revoked = false;
    let currentUrl: string | null = null;

    const rig = buildDeviceModel(device, finish, 4);
    rig.applyKinematics(0, 112, 165, true);
    // Scale rig so <model-viewer> places at exact real-world meters (unitToMeters ≈ 0.045m)
    const meterScale = 0.045;
    rig.root.scale.set(meterScale, meterScale, meterScale);
    rig.root.updateMatrixWorld(true);

    const exporter = new GLTFExporter();
    exporter.parse(
      rig.root,
      (result) => {
        if (revoked) {
          disposeObject3D(rig.root);
          return;
        }
        if (result instanceof ArrayBuffer) {
          const blob = new Blob([result], { type: 'model/gltf-binary' });
          currentUrl = URL.createObjectURL(blob);
          setGlbUrl(currentUrl);
        }
        disposeObject3D(rig.root);
      },
      () => {
        disposeObject3D(rig.root);
      },
      { binary: true }
    );

    return () => {
      revoked = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [device, finish]);

  // 2. Detect native AR capability (WebXR immersive-ar / iOS Quick Look / Android Scene Viewer)
  useEffect(() => {
    let cancelled = false;
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isMobileAROS = /iPhone|iPad|iPod|Android/i.test(ua);

    if (typeof navigator !== 'undefined' && 'xr' in navigator && navigator.xr) {
      navigator.xr
        .isSessionSupported('immersive-ar')
        .then((supported) => {
          if (!cancelled) setArSupported(supported || isMobileAROS);
        })
        .catch(() => {
          if (!cancelled) setArSupported(isMobileAROS);
        });
    } else {
      setArSupported(isMobileAROS);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  // 3. Start camera stream when user switches to Live Camera AR tab
  useEffect(() => {
    if (activeTab !== 'camera') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;
    async function startCam() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraError(false);
      } catch {
        if (!cancelled) setCameraError(true);
      }
    }

    startCam();
    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      }
    };
  }, [activeTab]);

  // 4. Mount interactive Three.js overlay when in 'camera' or 'grid' calibration tab
  useEffect(() => {
    if (activeTab === 'model-viewer') return;
    const mount = canvasMountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const w = Math.max(mount.clientWidth, 320);
    const h = Math.max(mount.clientHeight, 320);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h);

    const canvas = renderer.domElement;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    mount.appendChild(canvas);

    const scene = new THREE.Scene();
    const envTex = createStudioEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.05, 50);
    camera.position.set(0, 1.35, 5.2);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x3b2f24, 0.85);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff5e4, 1.6);
    keyLight.position.set(3.5, 6, 4.5);
    scene.add(keyLight);

    const anchorGroup = new THREE.Group();
    scene.add(anchorGroup);

    const reticleRing = new THREE.Mesh(
      new THREE.RingGeometry(1.05, 1.14, 48),
      new THREE.MeshBasicMaterial({
        color: 0xe5a952,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      })
    );
    reticleRing.rotation.x = -Math.PI / 2;
    reticleRing.position.y = -1.32;
    anchorGroup.add(reticleRing);

    const gridHelper = new THREE.GridHelper(6, 16, 0xe5a952, 0x9ca3af);
    gridHelper.position.y = -1.33;
    const gridMats = Array.isArray(gridHelper.material)
      ? gridHelper.material
      : [gridHelper.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.28;
    });
    anchorGroup.add(gridHelper);

    const shadowTex = createContactShadowTexture();
    const shadowMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      })
    );
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.31;
    anchorGroup.add(shadowMesh);

    const rig: DeviceRig = buildDeviceModel(
      device,
      finish,
      Math.min(8, renderer.capabilities.getMaxAnisotropy())
    );
    anchorGroup.add(rig.root);

    let frameId = 0;
    let disposed = false;
    let curExplode = 0;
    let curYaw = transformRef.current.arYawDeg;
    let curScale = transformRef.current.arScale;
    let lastTime = performance.now();

    const renderFrame = () => {
      if (disposed) return;
      const now = performance.now();
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      const tr = transformRef.current;
      curExplode = THREE.MathUtils.damp(curExplode, tr.arExplode, 10, dt);
      curYaw = THREE.MathUtils.damp(curYaw, tr.arYawDeg, 10, dt);
      curScale = THREE.MathUtils.damp(curScale, tr.arScale, 10, dt);

      rig.applyKinematics(curExplode, tr.arHingeDeg, tr.arFoldDeg, tr.arLensExt);
      rig.root.rotation.y = THREE.MathUtils.degToRad(curYaw);
      anchorGroup.scale.set(curScale, curScale, curScale);
      anchorGroup.position.set(tr.placedOffset.x, tr.placedOffset.y, 0);

      renderer.render(scene, camera);
    };

    if (isSoftwareGl) {
      const stepSw = () => {
        if (disposed) return;
        renderFrame();
        frameId = window.setTimeout(stepSw, 80);
      };
      stepSw();
    } else {
      const stepGpu = () => {
        if (disposed) return;
        renderFrame();
        frameId = requestAnimationFrame(stepGpu);
      };
      stepGpu();
    }

    const onResize = () => {
      if (disposed || !mount) return;
      const nw = Math.max(mount.clientWidth, 320);
      const nh = Math.max(mount.clientHeight, 320);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      disposeObject3D(scene);
      envTex.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (canvas.parentElement === mount) {
        mount.removeChild(canvas);
      }
    };
  }, [activeTab, device, finish]);

  const handleActivateModelViewerAR = () => {
    const mv = modelViewerRef.current as (HTMLElement & { activateAR?: () => void }) | null;
    if (mv && typeof mv.activateAR === 'function') {
      mv.activateAR();
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (activeTab === 'model-viewer') return;
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      baseX: placedOffset.x,
      baseY: placedOffset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.dragging) return;
    const dx = (e.clientX - dragStateRef.current.startX) * 0.008;
    const dy = -(e.clientY - dragStateRef.current.startY) * 0.008;
    setPlacedOffset({
      x: Math.max(-2.6, Math.min(2.6, dragStateRef.current.baseX + dx)),
      y: Math.max(-1.8, Math.min(1.6, dragStateRef.current.baseY + dy)),
    });
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handleCapturePhoto = () => {
    const mount = canvasMountRef.current;
    const glCanvas = mount?.querySelector('canvas');
    if (!glCanvas) return;

    const outCanvas = document.createElement('canvas');
    outCanvas.width = glCanvas.width;
    outCanvas.height = glCanvas.height;
    const ctx = outCanvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    if (video && video.readyState >= 2 && activeTab === 'camera' && !cameraError) {
      ctx.drawImage(video, 0, 0, outCanvas.width, outCanvas.height);
    } else {
      ctx.fillStyle = '#141720';
      ctx.fillRect(0, 0, outCanvas.width, outCanvas.height);
    }
    ctx.drawImage(glCanvas, 0, 0);

    const link = document.createElement('a');
    link.download = `silicon-pulse-ar-${device.id}.png`;
    link.href = outCanvas.toDataURL('image/png');
    link.click();

    setPhotoSaved(true);
    setTimeout(() => setPhotoSaved(false), 2400);
  };

  const scaledW = (device.dimensionsMm.width * arScale).toFixed(1);
  const scaledH = (device.dimensionsMm.height * arScale).toFixed(1);
  const scaledD = (device.dimensionsMm.depth * arScale).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#0B0C10] text-[#F5F2EB] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={t.ar.title}
    >
      {/* Top AR Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-[#12151E]">
        <div className="min-w-0">
          <div className="text-[11px] font-mono-tech uppercase tracking-wider text-[#E5A952] truncate">
            {t.ar.title}
          </div>
          <h2 className="text-sm sm:text-base font-semibold truncate">
            {device.name} · {finish.name[lang]}
          </h2>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setActiveTab('model-viewer')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono-tech transition-colors ${
              activeTab === 'model-viewer'
                ? 'bg-[#E5A952] text-[#0B0C10] font-semibold'
                : 'text-white/75 hover:text-white'
            }`}
          >
            &lt;model-viewer&gt;
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono-tech transition-colors ${
              activeTab === 'camera'
                ? 'bg-[#E5A952] text-[#0B0C10] font-semibold'
                : 'text-white/75 hover:text-white'
            }`}
          >
            {t.ar.modeCamera}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('grid')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono-tech transition-colors ${
              activeTab === 'grid'
                ? 'bg-[#E5A952] text-[#0B0C10] font-semibold'
                : 'text-white/75 hover:text-white'
            }`}
          >
            {lang === 'hy' ? '1:1 Հարթություն' : '1:1 Grid'}
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowRuler((r) => !r)}
            className={`px-3 py-2 rounded-lg text-xs font-mono-tech border transition-colors inline-flex items-center gap-1.5 ${
              showRuler
                ? 'border-[#E5A952] bg-[#E5A952]/15 text-[#E5A952]'
                : 'border-white/15 bg-white/5 text-white/80'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.ar.rulerToggle}</span>
          </button>

          {activeTab !== 'model-viewer' && (
            <button
              type="button"
              onClick={handleCapturePhoto}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/15 border border-white/15 transition-colors inline-flex items-center gap-1.5"
            >
              {photoSaved ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {photoSaved ? t.ar.photoSaved : t.ar.capturePhoto}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors inline-flex items-center gap-1"
            aria-label={t.ar.closeAr}
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">{t.ar.closeAr}</span>
          </button>
        </div>
      </div>

      {/* Main AR Stage */}
      <div
        className="relative flex-1 overflow-hidden touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* TAB 1: <model-viewer> with WebXR / Scene Viewer / Quick Look */}
        {activeTab === 'model-viewer' && (
          <div
            className="w-full h-full flex items-center justify-center relative"
            style={{
              background:
                'radial-gradient(circle at 50% 40%, #242938 0%, #12151E 60%, #090B0F 100%)',
            }}
          >
            {!glbUrl ? (
              <div className="flex flex-col items-center gap-3 text-xs font-mono-tech text-[#E5A952]">
                <div className="w-16 h-24 rounded-xl border-2 border-[#E5A952]/50 animate-pulse" />
                <span>{t.ar.preparingGlb}</span>
              </div>
            ) : (
              React.createElement('model-viewer', {
                ref: modelViewerRef,
                src: glbUrl,
                alt: `${device.name} 3D AR Model`,
                ar: true,
                'ar-modes': 'webxr scene-viewer quick-look',
                'ar-scale': 'fixed',
                'camera-controls': true,
                'auto-rotate': true,
                'shadow-intensity': '1',
                exposure: '1.1',
                style: { width: '100%', height: '100%', backgroundColor: 'transparent' },
              })
            )}
          </div>
        )}

        {/* TAB 2 & 3: Live Camera AR Overlay or 1:1 Spatial Calibration Grid */}
        {activeTab !== 'model-viewer' && (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className={`absolute inset-0 w-full h-full object-cover ${
                activeTab === 'camera' && !cameraError
                  ? 'opacity-100'
                  : 'opacity-0 pointer-events-none'
              }`}
            />
            {(activeTab === 'grid' || cameraError) && (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 50% 35%, #232836 0%, #12151E 55%, #090B0F 100%)',
                }}
              />
            )}
            <div ref={canvasMountRef} className="absolute inset-0 w-full h-full cursor-move" />
          </>
        )}

        {/* REAL-SIZE MILLIMETER RULER OVERLAY */}
        {showRuler && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative w-[270px] sm:w-[340px] h-[360px] sm:h-[430px] border border-dashed border-[#E5A952]/50 rounded-2xl flex items-center justify-center">
              {/* Top Horizontal Width Ruler */}
              <div className="absolute -top-7 left-0 right-0 flex flex-col items-center">
                <div className="w-full h-2 border-l border-r border-t border-[#E5A952] flex justify-between px-2">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className="w-px h-1.5 bg-[#E5A952]/70" />
                  ))}
                </div>
                <span className="px-2 py-0.5 rounded bg-[#12151E]/95 text-[11px] font-mono-tech text-[#E5A952] tabular-nums -mt-1">
                  W: {scaledW} mm
                </span>
              </div>

              {/* Left Vertical Height Ruler */}
              <div className="absolute -left-16 top-0 bottom-0 flex items-center">
                <div className="h-full w-2 border-t border-b border-l border-[#E5A952] flex flex-col justify-between py-2">
                  {Array.from({ length: 11 }).map((_, i) => (
                    <span key={i} className="h-px w-1.5 bg-[#E5A952]/70" />
                  ))}
                </div>
                <span className="px-1.5 py-0.5 rounded bg-[#12151E]/95 text-[11px] font-mono-tech text-[#E5A952] tabular-nums ml-1">
                  H: {scaledH} mm
                </span>
              </div>

              {/* Bottom Depth Callout */}
              <div className="absolute -bottom-7 px-2.5 py-0.5 rounded bg-[#12151E]/95 border border-[#E5A952]/40 text-[11px] font-mono-tech text-[#E5A952] tabular-nums">
                Thickness: {scaledD} mm · Mass: {device.weightGrams} g ({arScale.toFixed(1)}x)
              </div>
            </div>
          </div>
        )}

        {/* Top-Left Physical Footprint + Right Native AR CTA OR Friendly QR Fallback */}
        <div className="pointer-events-none absolute top-4 left-4 right-4 flex flex-wrap items-start justify-between gap-4">
          <div className="pointer-events-auto px-3.5 py-2.5 rounded-xl bg-[#12151E]/92 border border-white/15 text-xs space-y-1">
            <div className="font-mono-tech text-[11px] text-[#E5A952]">{t.ar.physicalSize}</div>
            <div className="font-mono-tech tabular-nums font-semibold">
              {scaledH} × {scaledW} × {scaledD} mm
            </div>
          </div>

          <div className="pointer-events-auto">
            {arSupported ? (
              <button
                type="button"
                onClick={handleActivateModelViewerAR}
                className="px-4 py-2.5 rounded-xl bg-[#E5A952] text-[#0B0C10] text-xs font-semibold inline-flex items-center gap-2 shadow-lg hover:bg-[#f2be6f] transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{t.ar.placeInRoom}</span>
              </button>
            ) : (
              <div className="p-3.5 rounded-2xl bg-[#12151E]/95 border border-white/15 max-w-xs space-y-2.5 shadow-xl">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#E5A952]">
                    <QrCode className="w-4 h-4 shrink-0" />
                    <span>{t.ar.qrTitle}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrModal((v) => !v)}
                    className="text-[11px] font-mono-tech underline text-white/75 hover:text-white"
                  >
                    {showQrModal ? 'Hide QR' : 'Expand QR'}
                  </button>
                </div>
                <p className="text-[11px] text-white/75 leading-relaxed">{t.ar.qrSubtitle}</p>
                {showQrModal && (
                  <div className="p-2.5 bg-white rounded-xl inline-block">
                    <svg width="116" height="116" viewBox="0 0 21 21" shapeRendering="crispEdges">
                      {qrMatrix.map((row, rIdx) =>
                        row.map((cell, cIdx) =>
                          cell ? (
                            <rect
                              key={`${rIdx}-${cIdx}`}
                              x={cIdx}
                              y={rIdx}
                              width={1}
                              height={1}
                              fill="#0B0C10"
                            />
                          ) : null
                        )
                      )}
                    </svg>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom AR Calibration Controls */}
      <div className="border-t border-white/10 bg-[#12151E] px-4 sm:px-6 py-3.5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-center">
          <div>
            <div className="flex justify-between text-[11px] font-mono-tech mb-1">
              <span>{t.ar.scaleLabel}</span>
              <span className="text-[#E5A952]">{arScale.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={arScale}
              onChange={(e) => setArScale(Number(e.target.value))}
              className="hardware-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono-tech mb-1">
              <span>{t.ar.rotateLabel}</span>
              <span className="text-[#E5A952]">{arYawDeg}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="1"
              value={arYawDeg}
              onChange={(e) => setArYawDeg(Number(e.target.value))}
              className="hardware-slider"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] font-mono-tech mb-1">
              <span>{t.ar.xrayLabel}</span>
              <span className="text-[#E5A952]">{Math.round(arExplode * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={arExplode}
              onChange={(e) => {
                setArExplode(Number(e.target.value));
                if (activeTab === 'model-viewer') setActiveTab('grid');
              }}
              className="hardware-slider"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setArScale(1.0)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-tech border transition-colors ${
                Math.abs(arScale - 1.0) < 0.05
                  ? 'bg-[#E5A952] text-[#0B0C10] border-[#E5A952] font-semibold'
                  : 'border-white/15 hover:bg-white/10'
              }`}
            >
              {t.ar.scale1to1}
            </button>
            <button
              type="button"
              onClick={() => setArScale(2.0)}
              className="px-3 py-1.5 rounded-lg text-xs font-mono-tech border border-white/15 hover:bg-white/10 transition-colors inline-flex items-center gap-1"
            >
              <Maximize2 className="w-3 h-3" />
              <span>{t.ar.scaleMacro}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPlacedOffset({ x: 0, y: -0.2 });
                setArYawDeg(25);
                setArScale(1.0);
                setArExplode(0);
              }}
              className="p-2 rounded-lg border border-white/15 hover:bg-white/10 transition-colors"
              title={t.viewport3D.resetView}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
