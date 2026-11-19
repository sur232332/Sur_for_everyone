import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/**
 * One shared loader + cache for all real car models (.glb).
 * Each file is downloaded and decoded only ONCE for the whole site;
 * every viewer then gets a cheap copy that re-uses the same geometry.
 */
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const loader = new GLTFLoader();
loader.setDRACOLoader(draco);

const cache = new Map<string, Promise<GLTF>>();

const loadGltf = (url: string): Promise<GLTF> => {
  let p = cache.get(url);
  if (!p) {
    p = loader.loadAsync(url);
    p.catch(() => cache.delete(url)); // allow a retry later
    cache.set(url, p);
  }
  return p;
};

/** True for the car-body paint material (not calipers, not trim) */
const isPaint = (m: THREE.Material) => /paint/i.test(m.name) && !/caliper|oem/i.test(m.name);

/**
 * Returns a copy of the model, already centred, standing on y = 0 and
 * scaled so its longest side equals `size`. Paint materials are copied
 * per copy so each car can get its own colour.
 */
export async function loadCarModel(url: string, size: number): Promise<THREE.Group> {
  const gltf = await loadGltf(url);
  const model = gltf.scene.clone(true);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((m) => (isPaint(m) ? m.clone() : m));
    } else if (isPaint(mesh.material)) {
      mesh.material = mesh.material.clone();
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const dim = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = size / Math.max(dim.x, dim.y, dim.z, 0.001);
  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);

  const wrapper = new THREE.Group();
  wrapper.add(model);
  return wrapper;
}

/** Repaints the body of a model returned by loadCarModel */
export function tintCarPaint(model: THREE.Object3D, hex: string): void {
  const color = new THREE.Color(hex);
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (isPaint(m) && 'color' in m) {
        (m as THREE.MeshStandardMaterial).color.copy(color);
        // a texture would multiply with the new colour and muddy it
        (m as THREE.MeshStandardMaterial).map = null;
        m.needsUpdate = true;
      }
    }
  });
}

/** Frees only the per-copy paint materials (shared geometry stays cached) */
export function disposeCarModel(model: THREE.Object3D): void {
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    mats.forEach((m) => isPaint(m) && m.dispose());
  });
}
