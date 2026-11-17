import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Plus, X, Trash2, Pencil, Shield, ClipboardCheck, Droplets, Tag, Wrench, Sparkles, LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AuthModal } from '../components/AuthModal';
import type { Language, PageRoute } from '../types/hardware';

// "My Lot" — every signed-in user keeps their own cars here.
// The cars are built in code (no downloaded models or images), so the look is fully our own.

type BodyType = 'sedan' | 'suv' | 'pickup' | 'coupe' | 'gt';

interface MyCar {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  body_type: BodyType;
  color: string;
  mileage_km: number | null;
  insurance_until: string | null;
  inspection_until: string | null;
  oil_change_km: number | null;
  created_at: string;
}

const BODY_LABEL: Record<BodyType, { en: string; hy: string }> = {
  sedan: { en: 'Sedan', hy: 'Սեդան' },
  suv: { en: 'SUV', hy: 'Ջիպ' },
  pickup: { en: 'Pickup', hy: 'Պիկապ' },
  coupe: { en: 'Coupe', hy: 'Կուպե' },
  gt: { en: 'Sport', hy: 'Սպորտ' },
};

const COLORS = ['#c8102e', '#f5f5f5', '#111214', '#1d4ed8', '#0f766e', '#f59e0b', '#7c3aed', '#9ca3af'];

// Side outline of each body (x = length, y = height), in metres
const PROFILES: Record<Exclude<BodyType, 'gt'>, { body: [number, number][]; glass: [number, number][]; len: number; wheelX: number; width: number; wheelR: number }> = {
  sedan: {
    body: [[-2.3, 0.32], [-2.34, 0.72], [-1.85, 0.95], [-1.2, 1.0], [-0.85, 1.4], [0.15, 1.46], [0.95, 1.05], [2.0, 0.92], [2.34, 0.7], [2.32, 0.32]],
    glass: [[-1.0, 1.04], [-0.78, 1.34], [0.1, 1.38], [0.8, 1.06]],
    len: 4.7, wheelX: 1.45, width: 1.85, wheelR: 0.36,
  },
  suv: {
    body: [[-2.3, 0.4], [-2.32, 1.2], [-2.0, 1.72], [0.6, 1.78], [1.1, 1.3], [2.0, 1.02], [2.34, 0.8], [2.32, 0.4]],
    glass: [[-2.0, 1.28], [-1.95, 1.66], [0.55, 1.7], [0.98, 1.3]],
    len: 4.7, wheelX: 1.45, width: 1.95, wheelR: 0.42,
  },
  pickup: {
    body: [[-2.55, 0.42], [-2.55, 1.02], [-0.75, 1.04], [-0.7, 1.7], [0.45, 1.74], [1.0, 1.28], [2.1, 1.08], [2.48, 0.82], [2.46, 0.42]],
    glass: [[-0.62, 1.12], [-0.58, 1.62], [0.4, 1.66], [0.9, 1.26]],
    len: 5.1, wheelX: 1.6, width: 1.95, wheelR: 0.44,
  },
  coupe: {
    body: [[-2.2, 0.3], [-2.26, 0.7], [-1.5, 0.95], [-0.7, 1.12], [-0.2, 1.3], [0.55, 1.33], [1.2, 0.96], [2.1, 0.8], [2.28, 0.55], [2.26, 0.3]],
    glass: [[-0.55, 1.14], [-0.15, 1.26], [0.5, 1.28], [1.05, 0.98]],
    len: 4.5, wheelX: 1.38, width: 1.9, wheelR: 0.37,
  },
};

function smoothShape(points: [number, number][], tension = 0.15, samples = 140): THREE.Shape {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y]) => new THREE.Vector3(x, y, 0)),
    true,
    'catmullrom',
    tension
  );
  return new THREE.Shape(curve.getPoints(samples).map((p) => new THREE.Vector2(p.x, p.y)));
}

function polygonShape(points: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  points.forEach(([x, y], i) => (i === 0 ? s.moveTo(x, y) : s.lineTo(x, y)));
  s.closePath();
  return s;
}

function makeNoiseTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const img = g.createImageData(128, 128);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 90 + Math.random() * 120;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 3);
  return t;
}

interface LotScene {
  setCar: (type: BodyType, color: string) => void;
  setCovered: (covered: boolean) => void;
  dispose: () => void;
}

/** Builds the 3D turntable scene inside `host` */
function createLotScene(host: HTMLDivElement): LotScene {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  host.appendChild(renderer.domElement);
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.touchAction = 'pan-y';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.fog = new THREE.Fog(0x07080d, 12, 26);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);
  camera.position.set(7.2, 2.7, 6.2);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.8, 0);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 6;
  controls.maxDistance = 13;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;

  // Lights
  scene.add(new THREE.HemisphereLight(0x8fa2ff, 0x10121a, 0.5));
  const key = new THREE.SpotLight(0xffffff, 90, 30, 0.6, 0.6, 1.4);
  key.position.set(4, 9, 3);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const rimA = new THREE.PointLight(0x22d3ee, 28, 14);
  rimA.position.set(-5, 1.6, -3);
  scene.add(rimA);
  const rimB = new THREE.PointLight(0xa855f7, 22, 14);
  rimB.position.set(5, 1.4, -4);
  scene.add(rimB);

  // Turntable platform with a neon ring
  const platform = new THREE.Mesh(
    new THREE.CylinderGeometry(3.6, 3.7, 0.18, 72),
    new THREE.MeshStandardMaterial({ color: 0x15171f, metalness: 0.7, roughness: 0.35 })
  );
  platform.position.y = -0.09;
  platform.receiveShadow = true;
  scene.add(platform);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3.62, 0.04, 12, 120),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(3.0, 0.015, 8, 120),
    new THREE.MeshBasicMaterial({ color: 0xa855f7 })
  );
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.01;
  scene.add(ring2);
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(22, 64),
    new THREE.MeshStandardMaterial({ color: 0x090a10, metalness: 0.4, roughness: 0.7 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.2;
  scene.add(floor);

  const carRoot = new THREE.Group();
  scene.add(carRoot);
  let cover: THREE.Mesh | null = null;
  let lights: THREE.Mesh[] = [];
  let covered = true;
  let coverT = 0; // 0 = on the car, 1 = slid away
  const noise = makeNoiseTexture();
  const disposables: { dispose: () => void }[] = [noise];

  const clearCar = () => {
    carRoot.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    carRoot.clear();
    cover = null;
    lights = [];
  };

  // The sport car is a real mesh made from our own GT3 picture (public/cars/gt-sport.glb)
  let carToken = 0;
  let gtGeo: THREE.BufferGeometry | null = null;
  let gtLoading: Promise<THREE.BufferGeometry> | null = null;
  const loadGtGeometry = (): Promise<THREE.BufferGeometry> => {
    if (gtGeo) return Promise.resolve(gtGeo);
    if (!gtLoading) {
      gtLoading = new Promise((resolve, reject) => {
        new GLTFLoader().load(
          '/cars/gt-sport.glb',
          (gltf) => {
            let found: THREE.Mesh | null = null;
            gltf.scene.traverse((o) => {
              if (!found && (o as THREE.Mesh).isMesh) found = o as THREE.Mesh;
            });
            if (!found) {
              reject(new Error('no mesh'));
              return;
            }
            const g = (found as THREE.Mesh).geometry.clone();
            g.computeVertexNormals();
            g.computeBoundingBox();
            const bb = g.boundingBox!;
            g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
            // Vertex colours: wheels and underbody dark, the rest takes the paint colour
            const pos = g.attributes.position;
            const h = bb.max.y - bb.min.y;
            const col = new Float32Array(pos.count * 3);
            for (let i = 0; i < pos.count; i++) {
              const x = pos.getX(i);
              const y = pos.getY(i);
              const nearWheel = [-0.6, 0.6].some((ax) => Math.hypot(x - ax, y - 0.145) < 0.16);
              const k = nearWheel || y / h < 0.1 ? 0.07 : 1;
              col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k;
            }
            g.setAttribute('color', new THREE.BufferAttribute(col, 3));
            gtGeo = g;
            resolve(g);
          },
          undefined,
          reject
        );
      });
    }
    return gtLoading;
  };

  const buildGt = (g: THREE.BufferGeometry, color: string) => {
    const s = 2.3;
    const paint = new THREE.MeshPhysicalMaterial({
      color,
      vertexColors: true,
      metalness: 0.55,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
    });
    const body = new THREE.Mesh(g, paint);
    body.scale.setScalar(s);
    body.castShadow = true;
    carRoot.add(body);
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0xdedee2,
      roughness: 1,
      metalness: 0,
      bumpMap: noise,
      bumpScale: 2.2,
      transparent: true,
    });
    cover = new THREE.Mesh(g, coverMat);
    cover.scale.set(s * 1.05, s * 1.12, s * 1.08);
    cover.position.y = -0.02;
    cover.castShadow = true;
    carRoot.add(cover);
    disposables.push(coverMat);
    covered = true;
    coverT = 0;
    applyCover();
    carRoot.scale.setScalar(1.15);
  };

  const setCar = (type: BodyType, color: string) => {
    clearCar();
    const token = ++carToken;
    if (type === 'gt') {
      loadGtGeometry()
        .then((g) => {
          if (token === carToken) buildGt(g, color);
        })
        .catch((err) => {
          console.error('GT model failed', err);
          if (token === carToken) setCar('coupe', color);
        });
      return;
    }
    const p = PROFILES[type];
    const bodyGeo = new THREE.ExtrudeGeometry(smoothShape(p.body), {
      depth: p.width - 0.3,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.12,
      bevelSegments: 5,
      curveSegments: 1,
    });
    bodyGeo.translate(0, 0, -(p.width - 0.3) / 2);
    const paint = new THREE.MeshPhysicalMaterial({ color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
    const body = new THREE.Mesh(bodyGeo, paint);
    body.castShadow = true;
    carRoot.add(body);

    const glassGeo = new THREE.ExtrudeGeometry(polygonShape(p.glass), { depth: p.width - 0.22, bevelEnabled: false });
    glassGeo.translate(0, 0, -(p.width - 0.22) / 2);
    const glass = new THREE.Mesh(glassGeo, new THREE.MeshPhysicalMaterial({ color: 0x0a0d14, metalness: 0.9, roughness: 0.05 }));
    carRoot.add(glass);

    // Wheels
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.9 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9ced8, metalness: 1, roughness: 0.25 });
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const w = new THREE.Group();
        const tire = new THREE.Mesh(new THREE.CylinderGeometry(p.wheelR, p.wheelR, 0.36, 32), tireMat);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(p.wheelR * 0.68, p.wheelR * 0.68, 0.38, 24), rimMat);
        tire.rotation.x = rim.rotation.x = Math.PI / 2;
        w.add(tire, rim);
        w.position.set(sx * p.wheelX, p.wheelR, sz * (p.width / 2 - 0.04));
        carRoot.add(w);
      }
    }

    // Head / tail lights (they switch on when the cover comes off)
    const headMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff3d6, emissiveIntensity: 0 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff1a1a, emissiveIntensity: 0 });
    const frontX = Math.max(...p.body.map((q) => q[0])) + 0.1;
    const rearX = Math.min(...p.body.map((q) => q[0])) - 0.1;
    const frontY = p.body[p.body.length - 3]?.[1] ?? 0.8;
    const rearY = p.body[1]?.[1] ?? 0.75;
    for (const sz of [-1, 1]) {
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.34), headMat);
      h.position.set(frontX - 0.02, frontY - 0.12, sz * (p.width / 2 - 0.4));
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.34), tailMat);
      t.position.set(rearX + 0.02, rearY - 0.1, sz * (p.width / 2 - 0.4));
      carRoot.add(h, t);
      lights.push(h, t);
    }

    // Cloth cover: same shape, slightly bigger, wrinkled white fabric
    const coverMat = new THREE.MeshStandardMaterial({
      color: 0xdedee2,
      roughness: 1,
      metalness: 0,
      bumpMap: noise,
      bumpScale: 2.2,
      transparent: true,
    });
    cover = new THREE.Mesh(bodyGeo, coverMat);
    cover.scale.set(1.045, 1.12, 1.07);
    cover.position.y = -0.02;
    cover.castShadow = true;
    carRoot.add(cover);
    disposables.push(coverMat);
    covered = true;
    coverT = 0;
    applyCover();
    carRoot.scale.setScalar(1.15);
  };

  const applyCover = () => {
    if (!cover) return;
    const t = coverT;
    const ease = t * t * (3 - 2 * t);
    cover.position.x = ease * 7;
    cover.position.y = -0.02 + Math.sin(ease * Math.PI) * 0.9;
    cover.rotation.z = -ease * 0.25;
    (cover.material as THREE.MeshStandardMaterial).opacity = 1 - Math.max(0, (t - 0.7) / 0.3);
    cover.visible = t < 0.999;
    const on = Math.min(1, Math.max(0, (t - 0.55) / 0.45));
    lights.forEach((l, i) => {
      (l.material as THREE.MeshStandardMaterial).emissiveIntensity = on * (i % 2 === 0 ? 2.2 : 1.6);
    });
  };

  const setCovered = (c: boolean) => {
    covered = c;
  };

  const resize = () => {
    const w = host.clientWidth || 300;
    const h = host.clientHeight || 300;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  let raf = 0;
  let last = performance.now();
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const target = covered ? 0 : 1;
    if (coverT !== target) {
      const step = dt / 1.5;
      coverT = target > coverT ? Math.min(target, coverT + step) : Math.max(target, coverT - step);
      applyCover();
    }
    ring.material.opacity = 1;
    controls.update();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(loop);

  return {
    setCar,
    setCovered,
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      clearCar();
      disposables.forEach((d) => d.dispose());
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function daysLeft(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr + 'T00:00:00').getTime();
  return Math.round((end - Date.now()) / 86400000);
}

interface MyLotPageProps {
  lang: Language;
  onNavigate: (route: PageRoute) => void;
}

export const MyLotPage: React.FC<MyLotPageProps> = ({ lang, onNavigate }) => {
  const hy = lang === 'hy';
  const hostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<LotScene | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [cars, setCars] = useState<MyCar[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [covered, setCovered] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MyCar | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = cars.find((c) => c.id === selectedId) ?? null;

  const loadCars = useCallback(async () => {
    const { data, error: err } = await supabase.from('my_cars').select('*').order('created_at', { ascending: true });
    if (err) {
      setError(err.message);
      return;
    }
    setError(null);
    const list = (data ?? []) as MyCar[];
    setCars(list);
    setSelectedId((cur) => (cur && list.some((c) => c.id === cur) ? cur : list[0]?.id ?? null));
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (userId) void loadCars();
    else {
      setCars([]);
      setSelectedId(null);
    }
  }, [userId, loadCars]);

  // 3D scene lives as long as the page does
  useEffect(() => {
    if (!hostRef.current) return;
    let scene: LotScene;
    try {
      scene = createLotScene(hostRef.current);
    } catch {
      return; // no WebGL: the list below still works
    }
    sceneRef.current = scene;
    return () => {
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Show the selected car (back under its cover) / a sample car when none
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.setCar(selected?.body_type ?? 'gt', selected?.color ?? '#1d4ed8');
    setCovered(true);
    s.setCovered(true);
  }, [selected?.id, selected?.body_type, selected?.color]);

  const toggleCover = () => {
    const next = !covered;
    setCovered(next);
    sceneRef.current?.setCovered(next);
  };

  const removeCar = async (c: MyCar) => {
    if (!window.confirm(hy ? 'Ջնջե՞լ այս մեքենան' : 'Delete this car?')) return;
    const { error: err } = await supabase.from('my_cars').delete().eq('id', c.id);
    if (err) setError(err.message);
    else void loadCars();
  };

  const sell = () => {
    if (!selected) return;
    try {
      sessionStorage.setItem(
        'sp_sell_prefill',
        JSON.stringify({ brand: selected.brand, title: `${selected.brand} ${selected.model}`.trim(), year: selected.year })
      );
    } catch {
      /* private mode: just open the catalog */
    }
    onNavigate('catalog');
  };

  // Reminders
  const reminders: { icon: React.ReactNode; label: string; value: string; tone: 'ok' | 'warn' | 'bad' }[] = [];
  if (selected) {
    const tone = (d: number): 'ok' | 'warn' | 'bad' => (d < 0 || d <= 14 ? 'bad' : d <= 45 ? 'warn' : 'ok');
    const dayText = (d: number) =>
      d < 0 ? (hy ? `ժամկետանց ${-d} օր` : `${-d} days overdue`) : hy ? `մնաց ${d} օր` : `${d} days left`;
    const ins = daysLeft(selected.insurance_until);
    if (ins !== null)
      reminders.push({ icon: <Shield className="w-4 h-4" />, label: hy ? 'Ապահովագրություն' : 'Insurance', value: dayText(ins), tone: tone(ins) });
    const insp = daysLeft(selected.inspection_until);
    if (insp !== null)
      reminders.push({ icon: <ClipboardCheck className="w-4 h-4" />, label: hy ? 'Տեխզննում' : 'Inspection', value: dayText(insp), tone: tone(insp) });
    if (selected.oil_change_km !== null && selected.mileage_km !== null) {
      const left = selected.oil_change_km - selected.mileage_km;
      reminders.push({
        icon: <Droplets className="w-4 h-4" />,
        label: hy ? 'Յուղի փոխում' : 'Oil change',
        value: left < 0 ? (hy ? `ժամկետանց ${-left} կմ` : `${-left} km overdue`) : hy ? `մնաց ${left} կմ` : `${left} km left`,
        tone: left < 0 || left <= 500 ? 'bad' : left <= 1500 ? 'warn' : 'ok',
      });
    }
  }
  const toneClass = { ok: 'text-emerald-400', warn: 'text-amber-400', bad: 'text-red-400' };

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold leading-tight">{hy ? 'Իմ Լոտը' : 'My Lot'}</h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
            {hy ? 'Քո մեքենաները՝ քո սեփական հարթակի վրա' : 'Your cars on your own turntable'}
          </p>
        </div>
        {userId ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[#080709] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            {hy ? 'Ավելացնել մեքենա' : 'Add car'}
          </button>
        ) : (
          authReady && (
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="h-10 px-4 rounded-xl bg-[var(--accent)] text-[#080709] text-sm font-bold inline-flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4" />
              {hy ? 'Մուտք' : 'Sign in'}
            </button>
          )
        )}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-3 sm:gap-5">
        {/* 3D stage */}
        <div className="relative rounded-2xl overflow-hidden border border-[var(--border-hairline)] bg-gradient-to-b from-[#0b0d16] to-[#05060a]">
          <div ref={hostRef} className="w-full h-[62vw] min-h-[250px] max-h-[620px] sm:h-[460px] lg:h-[560px]" />
          <div className="absolute left-3 top-3 right-3 flex items-start justify-between pointer-events-none">
            <div className="min-w-0">
              <div className="text-white text-base sm:text-xl font-bold truncate drop-shadow">
                {selected ? `${selected.brand} ${selected.model}` : hy ? 'Օրինակելի մեքենա' : 'Sample car'}
              </div>
              {selected?.year && <div className="text-xs text-white/70">{selected.year}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={toggleCover}
            className="absolute left-1/2 -translate-x-1/2 bottom-3 h-10 px-4 rounded-full bg-black/60 backdrop-blur border border-white/20 text-white text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:border-[var(--accent)]"
          >
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            {covered ? (hy ? 'Հանել ծածկոցը' : 'Remove cover') : hy ? 'Ծածկել' : 'Cover'}
          </button>
        </div>

        {/* Side panel */}
        <div className="space-y-3">
          {!userId && authReady && (
            <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] text-sm">
              {hy
                ? 'Մուտք գործիր, որ ավելացնես քո մեքենաները, ստանաս հիշեցումներ և մեկ սեղմումով վաճառես։'
                : 'Sign in to add your cars, get reminders, and sell in one tap.'}
            </div>
          )}

          {userId && cars.length === 0 && (
            <div className="p-4 rounded-2xl border border-dashed border-[var(--border-hairline)] text-sm text-[var(--text-secondary)]">
              {hy ? 'Դեռ մեքենա չկա։ Սեղմիր «Ավելացնել մեքենա»։' : 'No cars yet. Tap “Add car”.'}
            </div>
          )}

          {cars.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {cars.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`shrink-0 h-10 px-3 rounded-xl border text-sm cursor-pointer inline-flex items-center gap-2 ${
                    c.id === selectedId
                      ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
                      : 'border-[var(--border-hairline)] bg-[var(--bg-surface)]'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: c.color }} />
                  {c.brand} {c.model}
                </button>
              ))}
            </div>
          )}

          {selected && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={sell}
                  className="p-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)] text-left cursor-pointer"
                >
                  <Tag className="w-5 h-5 text-[var(--accent)] mb-1.5" />
                  <div className="text-sm font-bold">{hy ? 'Վաճառել' : 'Sell'}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {hy ? 'Տվյալները լրացվում են ինքնուրույն' : 'Details filled in for you'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('catalog')}
                  className="p-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)] hover:border-[var(--accent)] text-left cursor-pointer"
                >
                  <Wrench className="w-5 h-5 text-[var(--accent)] mb-1.5" />
                  <div className="text-sm font-bold">{hy ? 'Կատալոգ' : 'Catalog'}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {hy ? 'Գնել և վաճառել' : 'Browse listings'}
                  </div>
                </button>
              </div>

              <div className="p-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-surface)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-bold">{hy ? 'Հիշեցումներ' : 'Reminders'}</div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(selected);
                        setFormOpen(true);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] cursor-pointer"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCar(selected)}
                      className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-red-400 cursor-pointer"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {reminders.length === 0 ? (
                  <div className="text-xs text-[var(--text-secondary)]">
                    {hy
                      ? 'Խմբագրիր մեքենան և լրացրու ապահովագրության, տեխզննման ու յուղի տվյալները։'
                      : 'Edit the car and fill in insurance, inspection and oil data.'}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {reminders.map((r) => (
                      <li key={r.label} className="flex items-center justify-between text-sm">
                        <span className="inline-flex items-center gap-2 text-[var(--text-secondary)]">
                          {r.icon}
                          {r.label}
                        </span>
                        <span className={`font-semibold ${toneClass[r.tone]}`}>{r.value}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {selected.mileage_km !== null && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-hairline)] text-xs text-[var(--text-secondary)]">
                    {hy ? 'Վազք' : 'Mileage'}: {selected.mileage_km.toLocaleString()} km · {BODY_LABEL[selected.body_type][lang]}
                  </div>
                )}
              </div>
            </>
          )}

          {error && <div className="text-xs text-red-400">{error}</div>}
        </div>
      </div>

      {authOpen && <AuthModal lang={lang} onClose={() => setAuthOpen(false)} />}
      {formOpen && userId && (
        <CarForm
          lang={lang}
          existing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(id) => {
            setFormOpen(false);
            void loadCars().then(() => id && setSelectedId(id));
          }}
        />
      )}
    </div>
  );
};

interface CarFormProps {
  lang: Language;
  existing: MyCar | null;
  onClose: () => void;
  onSaved: (id: string | null) => void;
}

const CarForm: React.FC<CarFormProps> = ({ lang, existing, onClose, onSaved }) => {
  const hy = lang === 'hy';
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year ? String(existing.year) : '');
  const [bodyType, setBodyType] = useState<BodyType>(existing?.body_type ?? 'sedan');
  const [color, setColor] = useState(existing?.color ?? COLORS[0]);
  const [mileage, setMileage] = useState(existing?.mileage_km != null ? String(existing.mileage_km) : '');
  const [insurance, setInsurance] = useState(existing?.insurance_until ?? '');
  const [inspection, setInspection] = useState(existing?.inspection_until ?? '');
  const [oilKm, setOilKm] = useState(existing?.oil_change_km != null ? String(existing.oil_change_km) : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (s: string) => (s.trim() === '' ? null : Number(s.replace(/[^0-9]/g, '')));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim()) {
      setError(hy ? 'Գրիր մակնիշը և մոդելը' : 'Enter brand and model');
      return;
    }
    setBusy(true);
    setError(null);
    const row = {
      brand: brand.trim(),
      model: model.trim(),
      year: num(year),
      body_type: bodyType,
      color,
      mileage_km: num(mileage),
      insurance_until: insurance || null,
      inspection_until: inspection || null,
      oil_change_km: num(oilKm),
    };
    const res = existing
      ? await supabase.from('my_cars').update(row).eq('id', existing.id).select('id').single()
      : await supabase.from('my_cars').insert(row).select('id').single();
    setBusy(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }
    onSaved((res.data as { id: string } | null)?.id ?? null);
  };

  const field = 'w-full h-10 px-3 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-sm';
  const label = 'block text-xs text-[var(--text-secondary)] mb-1';

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[92vh] overflow-y-auto p-5 rounded-t-2xl sm:rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-hairline)] shadow-2xl space-y-3"
      >
        <button type="button" onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-[var(--bg-elevated)] cursor-pointer" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-lg font-bold">
          {existing ? (hy ? 'Խմբագրել մեքենան' : 'Edit car') : hy ? 'Նոր մեքենա' : 'New car'}
        </h2>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>{hy ? 'Մակնիշ' : 'Brand'}</label>
            <input className={field} value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Toyota" />
          </div>
          <div>
            <label className={label}>{hy ? 'Մոդել' : 'Model'}</label>
            <input className={field} value={model} onChange={(e) => setModel(e.target.value)} placeholder="Camry" />
          </div>
          <div>
            <label className={label}>{hy ? 'Տարեթիվ' : 'Year'}</label>
            <input className={field} inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} placeholder="2018" />
          </div>
          <div>
            <label className={label}>{hy ? 'Վազք (կմ)' : 'Mileage (km)'}</label>
            <input className={field} inputMode="numeric" value={mileage} onChange={(e) => setMileage(e.target.value)} placeholder="120000" />
          </div>
        </div>

        <div>
          <label className={label}>{hy ? 'Թափք' : 'Body type'}</label>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
            {(Object.keys(BODY_LABEL) as BodyType[]).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBodyType(b)}
                className={`h-9 rounded-lg border text-xs cursor-pointer ${
                  bodyType === b ? 'border-[var(--accent)] bg-[var(--bg-elevated)]' : 'border-[var(--border-hairline)]'
                }`}
              >
                {BODY_LABEL[b][lang]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>{hy ? 'Գույն' : 'Color'}</label>
          <div className="flex flex-wrap items-center gap-2">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={c}
                className={`w-8 h-8 rounded-full border-2 cursor-pointer ${color === c ? 'border-[var(--accent)]' : 'border-white/20'}`}
                style={{ background: c }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer bg-transparent" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>{hy ? 'Ապահովագրությունը մինչև' : 'Insurance until'}</label>
            <input type="date" className={field} value={insurance} onChange={(e) => setInsurance(e.target.value)} />
          </div>
          <div>
            <label className={label}>{hy ? 'Տեխզննումը մինչև' : 'Inspection until'}</label>
            <input type="date" className={field} value={inspection} onChange={(e) => setInspection(e.target.value)} />
          </div>
          <div className="col-span-2">
            <label className={label}>{hy ? 'Յուղը փոխել (կմ-ի վրա)' : 'Change oil at (km)'}</label>
            <input className={field} inputMode="numeric" value={oilKm} onChange={(e) => setOilKm(e.target.value)} placeholder="125000" />
          </div>
        </div>

        {error && <div className="text-sm text-red-500">{error}</div>}
        <button type="submit" disabled={busy} className="w-full h-10 rounded-lg bg-[var(--accent)] text-[#080709] font-bold text-sm disabled:opacity-60 cursor-pointer">
          {busy ? '…' : hy ? 'Պահպանել' : 'Save'}
        </button>
      </form>
    </div>
  );
};
