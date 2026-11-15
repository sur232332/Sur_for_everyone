import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface Car360ViewerProps {
  /** Path to the .glb file, e.g. "/models/porsche.glb" (file lives in /public/models) */
  modelUrl: string;
  /** Poster image shown while the model loads / if it fails */
  posterUrl?: string;
  darkMode?: boolean;
  className?: string;
  resetLabel?: string;
}

const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

function makeShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.55)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }
  return new THREE.CanvasTexture(canvas);
}

export const Car360Viewer: React.FC<Car360ViewerProps> = ({
  modelUrl,
  posterUrl,
  darkMode = true,
  className = '',
  resetLabel = 'Reset view',
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    setStatus('loading');
    setProgress(0);

    let cancelled = false;
    let animId = 0;
    let resumeTimer: number | undefined;

    const width = () => Math.max(container.clientWidth, 240);
    const height = () => Math.max(container.clientHeight, 220);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width(), height());
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;

    const camera = new THREE.PerspectiveCamera(35, width() / height(), 0.05, 100);
    camera.position.set(4, 1.4, 5);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.4;
    controls.maxPolarAngle = Math.PI / 2 - 0.04; // never go below the floor
    controls.minPolarAngle = 0.25;

    // Stop auto-rotate while the user drags, resume 3s after they let go
    const onStart = () => {
      controls.autoRotate = false;
      if (resumeTimer) window.clearTimeout(resumeTimer);
    };
    const onEnd = () => {
      if (resumeTimer) window.clearTimeout(resumeTimer);
      resumeTimer = window.setTimeout(() => {
        controls.autoRotate = true;
      }, 3000);
    };
    controls.addEventListener('start', onStart);
    controls.addEventListener('end', onEnd);

    // Soft contact shadow under the car
    const shadowTex = makeShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.visible = false;
    scene.add(shadow);

    const initialCam = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
    resetRef.current = () => {
      camera.position.copy(initialCam.pos);
      controls.target.copy(initialCam.target);
      controls.update();
      controls.autoRotate = true;
    };

    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_DECODER_PATH);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    let model: THREE.Object3D | null = null;

    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        model = gltf.scene;

        // Normalise: scale car to ~4 units long, centre on origin, sit on y = 0
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const longest = Math.max(size.x, size.y, size.z) || 1;
        const scale = 4 / longest;
        model.scale.setScalar(scale);

        const box2 = new THREE.Box3().setFromObject(model);
        const center = box2.getCenter(new THREE.Vector3());
        model.position.x -= center.x;
        model.position.z -= center.z;
        model.position.y -= box2.min.y;
        scene.add(model);

        const finalBox = new THREE.Box3().setFromObject(model);
        const finalSize = finalBox.getSize(new THREE.Vector3());

        shadow.scale.set(finalSize.x * 1.5, finalSize.z * 1.5, 1);
        shadow.position.y = 0.002;
        shadow.visible = true;

        const dist = Math.max(finalSize.x, finalSize.z) * 1.6;
        const targetY = finalSize.y * 0.45;
        initialCam.pos.set(dist * 0.8, finalSize.y * 0.9 + 0.4, dist);
        initialCam.target.set(0, targetY, 0);
        camera.position.copy(initialCam.pos);
        controls.target.copy(initialCam.target);
        controls.minDistance = dist * 0.45;
        controls.maxDistance = dist * 1.8;
        controls.update();

        setStatus('ready');
      },
      (evt) => {
        if (cancelled) return;
        if (evt.lengthComputable && evt.total > 0) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      },
      () => {
        if (!cancelled) setStatus('error');
      }
    );

    const onResize = () => {
      camera.aspect = width() / height();
      camera.updateProjectionMatrix();
      renderer.setSize(width(), height());
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animId);
      if (resumeTimer) window.clearTimeout(resumeTimer);
      ro.disconnect();
      controls.removeEventListener('start', onStart);
      controls.removeEventListener('end', onEnd);
      controls.dispose();
      resetRef.current = null;

      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.geometry?.dispose();
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((m) => {
            if (!m) return;
            Object.values(m).forEach((v) => {
              if (v && (v as THREE.Texture).isTexture) (v as THREE.Texture).dispose();
            });
            m.dispose();
          });
        }
      });
      shadowTex.dispose();
      draco.dispose();
      envTarget.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  const handleReset = useCallback(() => resetRef.current?.(), []);

  return (
    <div
      className={`relative w-full h-full min-h-[320px] overflow-hidden cursor-grab active:cursor-grabbing ${className}`}
      style={{
        background: darkMode
          ? 'radial-gradient(ellipse at 50% 70%, #1d2230 0%, #0a0c12 70%)'
          : 'radial-gradient(ellipse at 50% 70%, #ffffff 0%, #dcd6c6 80%)',
      }}
    >
      <div ref={mountRef} className="absolute inset-0" />

      {status !== 'ready' && posterUrl && (
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
        />
      )}

      {status === 'loading' && (
        <div className="absolute inset-x-0 bottom-6 mx-auto w-48 pointer-events-none">
          <div className="h-1 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-[width] duration-200"
              style={{ width: `${Math.max(progress, 4)}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-white/70">Loading 3D model {progress}%</p>
        </div>
      )}

      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">
          Could not load the 3D model. Check that {modelUrl} exists in the public folder.
        </div>
      )}

      {status === 'ready' && (
        <button
          type="button"
          onClick={handleReset}
          className="absolute top-3 right-3 rounded-full bg-black/45 backdrop-blur px-3 py-1.5 text-xs text-white hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          {resetLabel}
        </button>
      )}
    </div>
  );
};

export default Car360Viewer;
