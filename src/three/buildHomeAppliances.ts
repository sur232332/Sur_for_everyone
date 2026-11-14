import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { ApplianceCategoryId } from '../data/homeGuideData';
import { DEVICES } from '../data/devices';
import { buildDeviceModel } from './buildDeviceModel';

export interface ApplianceInteractiveState {
  doorOpen: boolean;
  secondaryActive: boolean;
}

export interface BuiltApplianceRig {
  category: ApplianceCategoryId;
  root: THREE.Group;
  doorPivot?: THREE.Group;
  leftDoorPivot?: THREE.Group;
  drumOrTurntable?: THREE.Group;
  burnerFlames?: THREE.Group;
  interiorGlow?: THREE.Mesh;
  highlightBox: THREE.LineSegments;
  labelAnchorLocal: THREE.Vector3;
}

export interface BuiltTechDeskRig {
  deviceId: string;
  root: THREE.Group;
  highlightBox: THREE.LineSegments;
  labelAnchorLocal: THREE.Vector3;
}

function tagCategoryRecursive(obj: THREE.Object3D, category: ApplianceCategoryId) {
  obj.userData.applianceCategory = category;
  for (const child of obj.children) {
    tagCategoryRecursive(child, category);
  }
}

function tagTechDeviceRecursive(obj: THREE.Object3D, deviceId: string) {
  obj.userData.techDeviceId = deviceId;
  for (const child of obj.children) {
    tagTechDeviceRecursive(child, deviceId);
  }
}

function createHighlightWireframe(
  width: number,
  height: number,
  depth: number,
  yCenter: number
): THREE.LineSegments {
  const boxGeo = new THREE.BoxGeometry(width + 0.06, height + 0.06, depth + 0.06);
  const edges = new THREE.EdgesGeometry(boxGeo);
  const mat = new THREE.LineBasicMaterial({
    color: 0xe5a952,
    transparent: true,
    opacity: 0.0,
  });
  const lines = new THREE.LineSegments(edges, mat);
  lines.position.set(0, yCenter, 0);
  lines.raycast = () => {};
  return lines;
}

// Cached procedural textures so we never recreate them unnecessarily
let cachedBrushedRoughnessTex: THREE.CanvasTexture | null = null;
let cachedBrushedNormalTex: THREE.CanvasTexture | null = null;
let cachedDrumPerfTex: THREE.CanvasTexture | null = null;

function getBrushedMetalTextures(): {
  roughnessMap: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  if (cachedBrushedRoughnessTex && cachedBrushedNormalTex) {
    return { roughnessMap: cachedBrushedRoughnessTex, normalMap: cachedBrushedNormalTex };
  }

  const rCanvas = document.createElement('canvas');
  rCanvas.width = 256;
  rCanvas.height = 256;
  const rCtx = rCanvas.getContext('2d')!;
  rCtx.fillStyle = '#555555';
  rCtx.fillRect(0, 0, 256, 256);

  const nCanvas = document.createElement('canvas');
  nCanvas.width = 256;
  nCanvas.height = 256;
  const nCtx = nCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 256, 256);

  for (let y = 0; y < 256; y++) {
    const streak = ((y * 73) % 29) - 14;
    const gray = Math.max(45, Math.min(130, 80 + streak));
    rCtx.fillStyle = `rgb(${gray},${gray},${gray})`;
    rCtx.fillRect(0, y, 256, 1);

    const ny = Math.max(108, Math.min(148, 128 + streak));
    nCtx.fillStyle = `rgb(128,${ny},255)`;
    nCtx.fillRect(0, y, 256, 1);
  }

  cachedBrushedRoughnessTex = new THREE.CanvasTexture(rCanvas);
  cachedBrushedRoughnessTex.wrapS = THREE.RepeatWrapping;
  cachedBrushedRoughnessTex.wrapT = THREE.RepeatWrapping;
  cachedBrushedRoughnessTex.repeat.set(2, 4);

  cachedBrushedNormalTex = new THREE.CanvasTexture(nCanvas);
  cachedBrushedNormalTex.wrapS = THREE.RepeatWrapping;
  cachedBrushedNormalTex.wrapT = THREE.RepeatWrapping;
  cachedBrushedNormalTex.repeat.set(2, 4);

  return { roughnessMap: cachedBrushedRoughnessTex, normalMap: cachedBrushedNormalTex };
}

function getPerforatedDrumTexture(): THREE.CanvasTexture {
  if (cachedDrumPerfTex) return cachedDrumPerfTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b8c0c8';
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = '#22262c';
  for (let y = 16; y < 256; y += 24) {
    for (let x = 16; x < 256; x += 24) {
      ctx.beginPath();
      ctx.arc(x + ((y / 24) % 2 === 0 ? 0 : 12), y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  cachedDrumPerfTex = new THREE.CanvasTexture(canvas);
  cachedDrumPerfTex.colorSpace = THREE.SRGBColorSpace;
  cachedDrumPerfTex.wrapS = THREE.RepeatWrapping;
  cachedDrumPerfTex.wrapT = THREE.RepeatWrapping;
  cachedDrumPerfTex.repeat.set(4, 2);
  return cachedDrumPerfTex;
}

function createDigitalDisplayTexture(
  primaryDigits: string,
  subLabel: string,
  accentHex = '#38bdf8'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#070b11';
  ctx.fillRect(0, 0, 256, 96);

  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, 250, 90);

  ctx.fillStyle = accentHex;
  ctx.font = 'bold 40px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(primaryDigits, 128, 40);

  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText(subLabel, 128, 74);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createTiledFloorTextures(darkMode: boolean): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  cCtx.fillStyle = darkMode ? '#181a22' : '#e5ddd0';
  cCtx.fillRect(0, 0, size, size);

  nCtx.fillStyle = 'rgb(128,128,255)';
  nCtx.fillRect(0, 0, size, size);

  const tiles = 4;
  const step = size / tiles;

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x = tx * step;
      const y = ty * step;
      // Subtle per-tile travertine tone variation
      const shadeDelta = ((tx * 3 + ty * 5) % 7) - 3;
      if (darkMode) {
        const v = 26 + shadeDelta;
        cCtx.fillStyle = `rgb(${v},${v + 2},${v + 8})`;
      } else {
        const r = 230 + shadeDelta * 2;
        const g = 221 + shadeDelta * 2;
        const b = 207 + shadeDelta * 2;
        cCtx.fillStyle = `rgb(${r},${g},${b})`;
      }
      cCtx.fillRect(x + 3, y + 3, step - 6, step - 6);

      // Grout normal bevels
      nCtx.fillStyle = 'rgb(128,96,255)';
      nCtx.fillRect(x, y, step, 3);
      nCtx.fillStyle = 'rgb(128,160,255)';
      nCtx.fillRect(x, y + step - 3, step, 3);
      nCtx.fillStyle = 'rgb(96,128,255)';
      nCtx.fillRect(x, y, 3, step);
      nCtx.fillStyle = 'rgb(160,128,255)';
      nCtx.fillRect(x + step - 3, y, 3, step);
    }
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 5);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(8, 5);

  return { map, normalMap };
}

function createWallNormalTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgb(128,128,255)';
  ctx.fillRect(0, 0, size, size);

  // Architectural vertical paneling grooves & micro-plaster relief
  for (let x = 0; x < size; x += 64) {
    ctx.fillStyle = 'rgb(108,128,255)';
    ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = 'rgb(148,128,255)';
    ctx.fillRect(x + 2, 0, 2, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 2);
  return tex;
}

/**
 * Builds a realistic multi-part procedural PBR appliance with beveled edges (RoundedBoxGeometry),
 * real wall thickness, brushed stainless steel & porcelain enamel materials, rubber gaskets,
 * transmissive glass doors, and glowing digital displays:
 * - refrigerator: 90 × 180 × 72 cm (0.90 × 1.80 × 0.72 m)
 * - gas_stove: 60 × 85 × 60 cm (0.60 × 0.85 × 0.60 m)
 * - microwave: 52 × 31 × 40 cm (0.52 × 0.31 × 0.40 m)
 * - washing_machine: 60 × 85 × 60 cm (0.60 × 0.85 × 0.60 m)
 * - dryer: 60 × 85 × 60 cm (0.60 × 0.85 × 0.60 m)
 * - laptop: 35.5 × 2.0 × 24.8 cm pro laptop
 */
export function buildSingleAppliance(category: ApplianceCategoryId): BuiltApplianceRig {
  const root = new THREE.Group();
  const { roughnessMap, normalMap } = getBrushedMetalTextures();

  const stainlessMat = new THREE.MeshPhysicalMaterial({
    color: 0xcfd5dc,
    metalness: 0.9,
    roughness: 0.24,
    roughnessMap,
    normalMap,
    normalScale: new THREE.Vector2(0.18, 0.18),
    anisotropy: 0.75,
    clearcoat: 0.25,
    clearcoatRoughness: 0.2,
  });

  const darkSteelMat = new THREE.MeshPhysicalMaterial({
    color: 0x262a32,
    metalness: 0.85,
    roughness: 0.28,
    roughnessMap,
    anisotropy: 0.5,
  });

  const whiteEnamelMat = new THREE.MeshPhysicalMaterial({
    color: 0xf6f4ef,
    metalness: 0.08,
    roughness: 0.18,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });

  const warmBeigeEnamelMat = new THREE.MeshPhysicalMaterial({
    color: 0xe8e0d2,
    metalness: 0.1,
    roughness: 0.2,
    clearcoat: 0.8,
    clearcoatRoughness: 0.14,
  });

  const rubberSealMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d21,
    metalness: 0.05,
    roughness: 0.88,
  });

  const brassAccentMat = new THREE.MeshPhysicalMaterial({
    color: 0xd49b4b,
    metalness: 0.92,
    roughness: 0.2,
    clearcoat: 0.3,
  });

  const castIronMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    metalness: 0.42,
    roughness: 0.78,
  });

  const glassDoorMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a2634,
    metalness: 0.05,
    roughness: 0.06,
    transmission: 0.76,
    ior: 1.52,
    thickness: 0.035,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });

  // =========================================================================
  // 1. REFRIGERATOR (True scale: 90 cm W × 180 cm H × 72 cm D)
  // =========================================================================
  if (category === 'refrigerator') {
    const w = 0.90;
    const h = 1.80;
    const d = 0.72;
    const wallT = 0.055;

    // Beveled outer cabinet walls (hollow upper cavity so opening doors reveals shelves)
    const backWall = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, wallT, 4, 0.018),
      darkSteelMat
    );
    backWall.position.set(0, h / 2, -d / 2 + wallT / 2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    root.add(backWall);

    const leftWall = new THREE.Mesh(
      new RoundedBoxGeometry(wallT, h, d - 0.07, 4, 0.015),
      stainlessMat
    );
    leftWall.position.set(-w / 2 + wallT / 2, h / 2, -0.035);
    leftWall.castShadow = true;
    root.add(leftWall);

    const rightWall = new THREE.Mesh(
      new RoundedBoxGeometry(wallT, h, d - 0.07, 4, 0.015),
      stainlessMat
    );
    rightWall.position.set(w / 2 - wallT / 2, h / 2, -0.035);
    rightWall.castShadow = true;
    root.add(rightWall);

    const topRoof = new THREE.Mesh(
      new RoundedBoxGeometry(w, wallT, d - 0.07, 4, 0.015),
      stainlessMat
    );
    topRoof.position.set(0, h - wallT / 2, -0.035);
    topRoof.castShadow = true;
    root.add(topRoof);

    // Lower Freezer Drawer (H = 0.60 m) with beveled front & rubber gasket
    const freezerSeal = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.03, 0.56, 0.025, 3, 0.008),
      rubberSealMat
    );
    freezerSeal.position.set(0, 0.30, d / 2 - 0.065);
    root.add(freezerSeal);

    const freezerFront = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.015, 0.58, 0.055, 5, 0.016),
      stainlessMat
    );
    freezerFront.position.set(0, 0.30, d / 2 - 0.03);
    freezerFront.castShadow = true;
    root.add(freezerFront);

    // Recessed pocket & bar handle on freezer drawer
    const freezerHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, w * 0.76, 20),
      brassAccentMat
    );
    freezerHandle.rotation.z = Math.PI / 2;
    freezerHandle.position.set(0, 0.51, d / 2 + 0.025);
    root.add(freezerHandle);

    // Illuminated Multi-Airflow Interior Liner & LED Back Wall
    const interiorGlowMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xfff4d6,
      emissiveIntensity: 0.45,
      roughness: 0.25,
    });
    const interiorBack = new THREE.Mesh(
      new THREE.BoxGeometry(w - wallT * 2, 1.12, 0.02),
      interiorGlowMat
    );
    interiorBack.position.set(0, 1.18, -d / 2 + wallT + 0.015);
    root.add(interiorBack);

    // 3 Tempered Glass Shelves with Chrome Front Trim + 2 Crisper Drawers
    for (let i = 0; i < 3; i++) {
      const sy = 0.84 + i * 0.27;
      const shelfGlass = new THREE.Mesh(
        new THREE.BoxGeometry(w - wallT * 2 - 0.02, 0.014, d - 0.22),
        glassDoorMat
      );
      shelfGlass.position.set(0, sy, -0.05);
      root.add(shelfGlass);

      const shelfTrim = new THREE.Mesh(
        new THREE.BoxGeometry(w - wallT * 2 - 0.02, 0.018, 0.018),
        stainlessMat
      );
      shelfTrim.position.set(0, sy, (d - 0.22) / 2 - 0.05);
      root.add(shelfTrim);
    }

    // Left French Door (Hinged at -w/2) with Rubber Gasket + Ice/Water Dispenser
    const doorW = w / 2 - 0.012;
    const doorH = 1.15;
    const doorD = 0.058;

    const leftDoorPivot = new THREE.Group();
    leftDoorPivot.position.set(-w / 2 + 0.018, 1.20, d / 2 - 0.055);

    const leftGasket = new THREE.Mesh(
      new RoundedBoxGeometry(doorW - 0.015, doorH - 0.02, 0.022, 3, 0.006),
      rubberSealMat
    );
    leftGasket.position.set(doorW / 2, 0, 0.005);
    leftDoorPivot.add(leftGasket);

    const leftDoorMesh = new THREE.Mesh(
      new RoundedBoxGeometry(doorW, doorH, doorD, 5, 0.016),
      stainlessMat
    );
    leftDoorMesh.position.set(doorW / 2, 0, 0.032);
    leftDoorMesh.castShadow = true;
    leftDoorPivot.add(leftDoorMesh);

    // Water & Crushed Ice Dispenser Cavity + Digital Temp Readout (-18°C / 3°C)
    const dispCavity = new THREE.Mesh(
      new RoundedBoxGeometry(0.19, 0.29, 0.025, 3, 0.008),
      rubberSealMat
    );
    dispCavity.position.set(doorW * 0.5, 0.03, 0.054);
    leftDoorPivot.add(dispCavity);

    const fridgeLedTex = createDigitalDisplayTexture('-18° 3°C', 'TWIN COOLING', '#38bdf8');
    const fridgeLedScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.055),
      new THREE.MeshBasicMaterial({ map: fridgeLedTex })
    );
    fridgeLedScreen.position.set(doorW * 0.5, 0.14, 0.068);
    leftDoorPivot.add(fridgeLedScreen);

    const leftHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.68, 20),
      brassAccentMat
    );
    leftHandle.position.set(doorW - 0.045, 0.02, 0.082);
    leftDoorPivot.add(leftHandle);
    root.add(leftDoorPivot);

    // Right French Door (Hinged at +w/2) with InstaView Transmissive Glass Window & Rubber Gasket
    const rightDoorPivot = new THREE.Group();
    rightDoorPivot.position.set(w / 2 - 0.018, 1.20, d / 2 - 0.055);

    const rightGasket = new THREE.Mesh(
      new RoundedBoxGeometry(doorW - 0.015, doorH - 0.02, 0.022, 3, 0.006),
      rubberSealMat
    );
    rightGasket.position.set(-doorW / 2, 0, 0.005);
    rightDoorPivot.add(rightGasket);

    const rightDoorMesh = new THREE.Mesh(
      new RoundedBoxGeometry(doorW, doorH, doorD, 5, 0.016),
      stainlessMat
    );
    rightDoorMesh.position.set(-doorW / 2, 0, 0.032);
    rightDoorMesh.castShadow = true;
    rightDoorPivot.add(rightDoorMesh);

    const instaFrame = new THREE.Mesh(
      new RoundedBoxGeometry(0.28, 0.72, doorD + 0.006, 4, 0.01),
      darkSteelMat
    );
    instaFrame.position.set(-doorW / 2, 0.05, 0.033);
    rightDoorPivot.add(instaFrame);

    const instaGlass = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.66, doorD + 0.01),
      glassDoorMat
    );
    instaGlass.renderOrder = 2;
    instaGlass.position.set(-doorW / 2, 0.05, 0.034);
    rightDoorPivot.add(instaGlass);

    const rightHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.68, 20),
      brassAccentMat
    );
    rightHandle.position.set(-(doorW - 0.045), 0.02, 0.082);
    rightDoorPivot.add(rightHandle);
    root.add(rightDoorPivot);

    const highlightBox = createHighlightWireframe(w, h, d, h / 2);
    root.add(highlightBox);
    tagCategoryRecursive(root, category);

    return {
      category,
      root,
      doorPivot: rightDoorPivot,
      leftDoorPivot,
      interiorGlow: interiorBack,
      highlightBox,
      labelAnchorLocal: new THREE.Vector3(0, h + 0.2, 0),
    };
  }

  // =========================================================================
  // 2. GAS STOVE & RANGE (True scale: 60 cm W × 85 cm H × 60 cm D)
  // =========================================================================
  if (category === 'gas_stove') {
    const w = 0.60;
    const h = 0.85;
    const d = 0.60;

    // Beveled stainless body shell
    const chassis = new THREE.Mesh(
      new RoundedBoxGeometry(w, h - 0.04, d - 0.05, 5, 0.016),
      stainlessMat
    );
    chassis.position.set(0, (h - 0.04) / 2, -0.025);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    root.add(chassis);

    // Recessed Black Enamel Cooktop Well + Rear Stainless Splashguard
    const cooktopWell = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.03, 0.025, d - 0.08, 3, 0.008),
      rubberSealMat
    );
    cooktopWell.position.set(0, h - 0.035, -0.02);
    root.add(cooktopWell);

    const rearSplash = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.065, 0.035, 3, 0.008),
      stainlessMat
    );
    rearSplash.position.set(0, h + 0.01, -d / 2 + 0.02);
    root.add(rearSplash);

    // Angled Front Control Bullnose with 5 Knurled Knobs & Glowing Clock Display
    const bullnose = new THREE.Mesh(
      new RoundedBoxGeometry(w, 0.11, 0.075, 4, 0.012),
      stainlessMat
    );
    bullnose.position.set(0, h - 0.095, d / 2 - 0.02);
    root.add(bullnose);

    const stoveLedTex = createDigitalDisplayTexture('375°F', 'CONVECTION BAKE', '#f59e0b');
    const clockPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.14, 0.045),
      new THREE.MeshBasicMaterial({ map: stoveLedTex })
    );
    clockPanel.position.set(0, h - 0.095, d / 2 + 0.019);
    root.add(clockPanel);

    const knobXPositions = [-0.23, -0.15, 0.15, 0.23];
    for (const kx of knobXPositions) {
      const bezelRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.022, 0.024, 0.008, 24),
        darkSteelMat
      );
      bezelRing.rotation.x = Math.PI / 2;
      bezelRing.position.set(kx, h - 0.095, d / 2 + 0.019);
      root.add(bezelRing);

      const knob = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.026, 24),
        brassAccentMat
      );
      knob.rotation.x = Math.PI / 2;
      knob.position.set(kx, h - 0.095, d / 2 + 0.028);
      root.add(knob);
    }

    // 4 Cast-Iron Spider Grates + Brass Burner Caps + Multi-Ring Blue/Cyan Gas Flames
    const burnerCoords: Array<[number, number]> = [
      [-0.15, -0.14],
      [0.15, -0.14],
      [-0.15, 0.11],
      [0.15, 0.11],
    ];
    const burnerFlames = new THREE.Group();
    const outerFlameMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 2.6,
      transparent: true,
      opacity: 0.92,
    });
    const innerFlameMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 3.0,
      transparent: true,
      opacity: 0.95,
    });

    for (const [bx, bz] of burnerCoords) {
      // Outer cast-iron grate frame + cross spider bars
      const grateOuter = new THREE.Mesh(
        new RoundedBoxGeometry(0.23, 0.022, 0.21, 2, 0.005),
        castIronMat
      );
      grateOuter.position.set(bx, h - 0.014, bz);
      root.add(grateOuter);

      const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.026, 0.016), castIronMat);
      cross1.position.set(bx, h - 0.011, bz);
      root.add(cross1);

      const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.026, 0.20), castIronMat);
      cross2.position.set(bx, h - 0.011, bz);
      root.add(cross2);

      // Aluminum burner base + Brass burner cap
      const spreader = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.054, 0.02, 24),
        stainlessMat
      );
      spreader.position.set(bx, h - 0.012, bz);
      root.add(spreader);

      const brassCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.008, 24),
        brassAccentMat
      );
      brassCap.position.set(bx, h + 0.002, bz);
      root.add(brassCap);

      // Blue gas flame rings + individual flamelets
      const flameRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.053, 0.01, 12, 28),
        outerFlameMat
      );
      flameRing.rotation.x = Math.PI / 2;
      flameRing.position.set(bx, h + 0.011, bz);
      burnerFlames.add(flameRing);

      const innerCore = new THREE.Mesh(
        new THREE.TorusGeometry(0.036, 0.007, 10, 24),
        innerFlameMat
      );
      innerCore.rotation.x = Math.PI / 2;
      innerCore.position.set(bx, h + 0.015, bz);
      burnerFlames.add(innerCore);
    }
    root.add(burnerFlames);

    // Oven Cavity Interior + Hinged Double-Glass Oven Door (Bottom-pivoted)
    const ovenGlow = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.08, 0.44, 0.02),
      new THREE.MeshStandardMaterial({
        color: 0xfff7ed,
        emissive: 0xf97316,
        emissiveIntensity: 0.55,
      })
    );
    ovenGlow.position.set(0, 0.38, -0.02);
    root.add(ovenGlow);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(0, 0.12, d / 2 - 0.045);

    const ovenGasket = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.04, 0.54, 0.02, 3, 0.006),
      rubberSealMat
    );
    ovenGasket.position.set(0, 0.29, 0.005);
    doorPivot.add(ovenGasket);

    const ovenDoor = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.012, 0.58, 0.05, 5, 0.014),
      stainlessMat
    );
    ovenDoor.position.set(0, 0.29, 0.028);
    ovenDoor.castShadow = true;
    doorPivot.add(ovenDoor);

    const ovenWindowFrame = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.13, 0.36, 0.054, 4, 0.01),
      darkSteelMat
    );
    ovenWindowFrame.position.set(0, 0.28, 0.029);
    doorPivot.add(ovenWindowFrame);

    const ovenGlass = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.16, 0.32, 0.058),
      glassDoorMat
    );
    ovenGlass.renderOrder = 2;
    ovenGlass.position.set(0, 0.28, 0.03);
    doorPivot.add(ovenGlass);

    const ovenHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.013, 0.013, w - 0.1, 20),
      brassAccentMat
    );
    ovenHandle.rotation.z = Math.PI / 2;
    ovenHandle.position.set(0, 0.52, 0.078);
    doorPivot.add(ovenHandle);

    root.add(doorPivot);

    const highlightBox = createHighlightWireframe(w, h + 0.06, d, h / 2);
    root.add(highlightBox);
    tagCategoryRecursive(root, category);

    return {
      category,
      root,
      doorPivot,
      burnerFlames,
      interiorGlow: ovenGlow,
      highlightBox,
      labelAnchorLocal: new THREE.Vector3(0, h + 0.24, 0),
    };
  }

  // =========================================================================
  // 3. MICROWAVE OVEN (True scale: 52 cm W × 31 cm H × 40 cm D)
  // =========================================================================
  if (category === 'microwave') {
    const w = 0.52;
    const h = 0.31;
    const d = 0.40;

    const cabinet = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d - 0.04, 5, 0.014),
      stainlessMat
    );
    cabinet.position.set(0, h / 2, -0.02);
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;
    root.add(cabinet);

    // Illuminated ceramic enamel cavity & rotating glass turntable
    const interiorGlow = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.65, h * 0.76, 0.018),
      new THREE.MeshStandardMaterial({
        color: 0xfffbeb,
        emissive: 0xfbbf24,
        emissiveIntensity: 0.55,
      })
    );
    interiorGlow.position.set(-0.06, h / 2, 0.04);
    root.add(interiorGlow);

    const turntableGroup = new THREE.Group();
    turntableGroup.position.set(-0.06, 0.055, 0.07);
    const glassTray = new THREE.Mesh(
      new THREE.CylinderGeometry(0.125, 0.125, 0.012, 32),
      glassDoorMat
    );
    turntableGroup.add(glassTray);
    const rollerHub = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.016, 0.022),
      brassAccentMat
    );
    rollerHub.position.y = 0.004;
    turntableGroup.add(rollerHub);
    root.add(turntableGroup);

    // Right Control Panel with Glowing Digital Timer ("12:45 · 1000W") & Jog Dial
    const controlFascia = new THREE.Mesh(
      new RoundedBoxGeometry(0.135, h - 0.02, 0.045, 4, 0.008),
      darkSteelMat
    );
    controlFascia.position.set(w / 2 - 0.072, h / 2, d / 2 - 0.022);
    root.add(controlFascia);

    const mwLedTex = createDigitalDisplayTexture('12:45', '1000W INVERTER', '#10b981');
    const timerScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.105, 0.048),
      new THREE.MeshBasicMaterial({ map: mwLedTex })
    );
    timerScreen.position.set(w / 2 - 0.072, h * 0.74, d / 2 + 0.003);
    root.add(timerScreen);

    const jogDial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.024, 0.022, 24),
      brassAccentMat
    );
    jogDial.rotation.x = Math.PI / 2;
    jogDial.position.set(w / 2 - 0.072, h * 0.32, d / 2 + 0.008);
    root.add(jogDial);

    // Left-Hinged Glass Door with Rubber Seal & Tubular Pull Handle
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-w / 2 + 0.015, h / 2, d / 2 - 0.03);

    const doorWidth = w - 0.15;
    const doorGasket = new THREE.Mesh(
      new RoundedBoxGeometry(doorWidth - 0.015, h - 0.035, 0.018, 3, 0.005),
      rubberSealMat
    );
    doorGasket.position.set(doorWidth / 2, 0, 0.004);
    doorPivot.add(doorGasket);

    const doorFrame = new THREE.Mesh(
      new RoundedBoxGeometry(doorWidth, h - 0.018, 0.038, 4, 0.01),
      darkSteelMat
    );
    doorFrame.position.set(doorWidth / 2, 0, 0.018);
    doorFrame.castShadow = true;
    doorPivot.add(doorFrame);

    const doorWindow = new THREE.Mesh(
      new THREE.BoxGeometry(doorWidth - 0.065, h - 0.08, 0.042),
      glassDoorMat
    );
    doorWindow.renderOrder = 2;
    doorWindow.position.set(doorWidth / 2, 0, 0.019);
    doorPivot.add(doorWindow);

    const doorHandle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, h - 0.07, 16),
      brassAccentMat
    );
    doorHandle.position.set(doorWidth - 0.025, 0, 0.052);
    doorPivot.add(doorHandle);

    root.add(doorPivot);

    const highlightBox = createHighlightWireframe(w, h, d, h / 2);
    root.add(highlightBox);
    tagCategoryRecursive(root, category);

    return {
      category,
      root,
      doorPivot,
      drumOrTurntable: turntableGroup,
      interiorGlow,
      highlightBox,
      labelAnchorLocal: new THREE.Vector3(0, h + 0.18, 0),
    };
  }

  // =========================================================================
  // 4 & 5. WASHING MACHINE & TUMBLE DRYER (True scale: 60 × 60 × 85 cm)
  // =========================================================================
  if (category === 'washing_machine' || category === 'dryer') {
    const w = 0.60;
    const h = 0.85;
    const d = 0.60;
    const isWasher = category === 'washing_machine';

    const body = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d - 0.04, 5, 0.018),
      isWasher ? whiteEnamelMat : warmBeigeEnamelMat
    );
    body.position.set(0, h / 2, -0.02);
    body.castShadow = true;
    body.receiveShadow = true;
    root.add(body);

    // Top Control Fascia + Rotary Program Dial + Digital Cycle Screen + Detergent Drawer
    const fascia = new THREE.Mesh(
      new RoundedBoxGeometry(w - 0.01, 0.13, 0.05, 4, 0.01),
      darkSteelMat
    );
    fascia.position.set(0, h - 0.075, d / 2 - 0.02);
    root.add(fascia);

    const dial = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.028, 28),
      brassAccentMat
    );
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0, h - 0.075, d / 2 + 0.015);
    root.add(dial);

    const laundryLedTex = createDigitalDisplayTexture(
      isWasher ? '0:48' : '1:15',
      isWasher ? '1400 RPM STEAM' : 'HEAT PUMP DRY',
      '#38bdf8'
    );
    const ledScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(0.15, 0.048),
      new THREE.MeshBasicMaterial({ map: laundryLedTex })
    );
    ledScreen.position.set(0.16, h - 0.075, d / 2 + 0.008);
    root.add(ledScreen);

    const drawerLine = new THREE.Mesh(
      new RoundedBoxGeometry(0.17, 0.075, 0.018, 3, 0.005),
      isWasher ? whiteEnamelMat : stainlessMat
    );
    drawerLine.position.set(-0.18, h - 0.075, d / 2 + 0.006);
    root.add(drawerLine);

    // Rubber Porthole Bellow Seal + Perforated Stainless Steel Inner Drum
    const rubberBellow = new THREE.Mesh(
      new THREE.TorusGeometry(0.20, 0.022, 16, 36),
      rubberSealMat
    );
    rubberBellow.position.set(0, 0.39, d / 2 - 0.04);
    root.add(rubberBellow);

    const drumGroup = new THREE.Group();
    drumGroup.position.set(0, 0.39, 0.02);

    const perfMat = new THREE.MeshStandardMaterial({
      map: getPerforatedDrumTexture(),
      metalness: 0.82,
      roughness: 0.28,
      side: THREE.DoubleSide,
    });
    const drumCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.195, 0.195, 0.34, 32, 1, false),
      perfMat
    );
    drumCylinder.rotation.x = Math.PI / 2;
    drumGroup.add(drumCylinder);

    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const paddle = new THREE.Mesh(
        new RoundedBoxGeometry(0.038, 0.045, 0.28, 3, 0.008),
        brassAccentMat
      );
      paddle.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0);
      paddle.rotation.z = angle;
      drumGroup.add(paddle);
    }
    root.add(drumGroup);

    // Hinged Porthole Glass Door
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.21, 0.39, d / 2 - 0.02);

    const portholeGroup = new THREE.Group();
    portholeGroup.position.set(0.21, 0, 0.02);

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.21, 0.03, 18, 40),
      isWasher ? stainlessMat : brassAccentMat
    );
    portholeGroup.add(outerRing);

    const windowDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, 0.032, 32),
      glassDoorMat
    );
    windowDome.renderOrder = 2;
    windowDome.rotation.x = Math.PI / 2;
    portholeGroup.add(windowDome);

    const handleTab = new THREE.Mesh(
      new RoundedBoxGeometry(0.035, 0.11, 0.04, 3, 0.008),
      darkSteelMat
    );
    handleTab.position.set(0.195, 0, 0.025);
    portholeGroup.add(handleTab);

    doorPivot.add(portholeGroup);
    root.add(doorPivot);

    const highlightBox = createHighlightWireframe(w, h, d, h / 2);
    root.add(highlightBox);
    tagCategoryRecursive(root, category);

    return {
      category,
      root,
      doorPivot,
      drumOrTurntable: drumGroup,
      highlightBox,
      labelAnchorLocal: new THREE.Vector3(0, h + 0.2, 0),
    };
  }

  // =========================================================================
  // 6. WORKSTATION LAPTOP (CNC Unibody on Tech Desk)
  // =========================================================================
  const w = 0.42;
  const d = 0.29;
  const baseH = 0.018;

  const baseChassis = new THREE.Mesh(
    new RoundedBoxGeometry(w, baseH, d, 4, 0.005),
    stainlessMat
  );
  baseChassis.position.set(0, baseH / 2, 0);
  baseChassis.castShadow = true;
  baseChassis.receiveShadow = true;
  root.add(baseChassis);

  const kbWell = new THREE.Mesh(new THREE.BoxGeometry(w * 0.84, 0.004, d * 0.48), castIronMat);
  kbWell.position.set(0, baseH + 0.002, -0.02);
  root.add(kbWell);

  const trackpad = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, 0.003, d * 0.26), darkSteelMat);
  trackpad.position.set(0, baseH + 0.002, d * 0.3);
  root.add(trackpad);

  const doorPivot = new THREE.Group();
  doorPivot.position.set(0, baseH, -d / 2 + 0.012);
  doorPivot.rotation.x = -0.25;

  const lidShell = new THREE.Mesh(
    new RoundedBoxGeometry(w, d * 0.92, 0.01, 4, 0.003),
    stainlessMat
  );
  lidShell.position.set(0, (d * 0.92) / 2, 0);
  lidShell.castShadow = true;
  doorPivot.add(lidShell);

  const screenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0xd99b4e,
    emissiveIntensity: 0.65,
    roughness: 0.12,
  });
  const screenPanel = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.93, d * 0.83), screenMat);
  screenPanel.position.set(0, (d * 0.92) / 2, 0.006);
  doorPivot.add(screenPanel);

  root.add(doorPivot);

  const highlightBox = createHighlightWireframe(w + 0.06, 0.34, d + 0.06, 0.17);
  root.add(highlightBox);
  tagCategoryRecursive(root, category);

  return {
    category,
    root,
    doorPivot,
    interiorGlow: screenPanel,
    highlightBox,
    labelAnchorLocal: new THREE.Vector3(0, 0.44, 0),
  };
}

/**
 * Smooth frame-rate independent damping for doors, drums, and gas burner flames.
 */
export function updateApplianceRigAnimation(
  rig: BuiltApplianceRig,
  state: ApplianceInteractiveState,
  isHoveredOrSelected: boolean,
  dt: number,
  elapsed: number
) {
  const lineMat = rig.highlightBox.material as THREE.LineBasicMaterial;
  const targetOpacity = isHoveredOrSelected ? 0.95 : 0.0;
  lineMat.opacity = THREE.MathUtils.damp(lineMat.opacity, targetOpacity, 10, dt);

  if (rig.category === 'refrigerator') {
    const targetRightAngle = state.doorOpen ? Math.PI * 0.58 : 0;
    const targetLeftAngle = state.doorOpen ? -Math.PI * 0.52 : 0;
    if (rig.doorPivot) {
      rig.doorPivot.rotation.y = THREE.MathUtils.damp(
        rig.doorPivot.rotation.y,
        targetRightAngle,
        7,
        dt
      );
    }
    if (rig.leftDoorPivot) {
      rig.leftDoorPivot.rotation.y = THREE.MathUtils.damp(
        rig.leftDoorPivot.rotation.y,
        targetLeftAngle,
        7,
        dt
      );
    }
    if (rig.interiorGlow) {
      const mat = rig.interiorGlow.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.doorOpen || state.secondaryActive ? 1.2 : 0.35;
    }
  } else if (rig.category === 'gas_stove') {
    if (rig.doorPivot) {
      const targetOvenAngle = state.doorOpen ? Math.PI * 0.42 : 0;
      rig.doorPivot.rotation.x = THREE.MathUtils.damp(
        rig.doorPivot.rotation.x,
        targetOvenAngle,
        7,
        dt
      );
    }
    if (rig.burnerFlames) {
      rig.burnerFlames.visible = state.secondaryActive;
      if (state.secondaryActive) {
        const pulse = 1 + Math.sin(elapsed * 16) * 0.09;
        rig.burnerFlames.scale.set(1, pulse, 1);
      }
    }
  } else if (rig.category === 'microwave') {
    if (rig.doorPivot) {
      const targetDoor = state.doorOpen ? -Math.PI * 0.52 : 0;
      rig.doorPivot.rotation.y = THREE.MathUtils.damp(
        rig.doorPivot.rotation.y,
        targetDoor,
        8,
        dt
      );
    }
    if (rig.drumOrTurntable && state.secondaryActive) {
      rig.drumOrTurntable.rotation.y += dt * 2.5;
    }
  } else if (rig.category === 'washing_machine' || rig.category === 'dryer') {
    if (rig.doorPivot) {
      const targetDoor = state.doorOpen ? -Math.PI * 0.55 : 0;
      rig.doorPivot.rotation.y = THREE.MathUtils.damp(
        rig.doorPivot.rotation.y,
        targetDoor,
        7,
        dt
      );
    }
    if (rig.drumOrTurntable && state.secondaryActive) {
      rig.drumOrTurntable.rotation.z += dt * (rig.category === 'washing_machine' ? 6.8 : 4.4);
    }
  } else if (rig.category === 'laptop') {
    if (rig.doorPivot) {
      const targetLid = state.doorOpen ? -0.32 : Math.PI * 0.48;
      rig.doorPivot.rotation.x = THREE.MathUtils.damp(
        rig.doorPivot.rotation.x,
        targetLid,
        7,
        dt
      );
    }
    if (rig.interiorGlow) {
      const mat = rig.interiorGlow.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = state.secondaryActive ? 1.3 : 0.45;
    }
  }
}

function createStudioPlinthFloorTextures(darkMode: boolean): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  // Matte architectural stone floor — calibrated luminance so highlights never blow out
  cCtx.fillStyle = darkMode ? '#121215' : '#23201d';
  cCtx.fillRect(0, 0, size, size);

  nCtx.fillStyle = 'rgb(128,128,255)';
  nCtx.fillRect(0, 0, size, size);

  const tiles = 4;
  const step = size / tiles;

  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x = tx * step;
      const y = ty * step;
      const shadeDelta = ((tx * 3 + ty * 5) % 7) - 3;
      if (darkMode) {
        const v = 20 + shadeDelta;
        cCtx.fillStyle = `rgb(${v},${v + 1},${v + 4})`;
      } else {
        const v = 38 + shadeDelta;
        cCtx.fillStyle = `rgb(${v + 4},${v + 1},${v - 2})`;
      }
      cCtx.fillRect(x + 3, y + 3, step - 6, step - 6);

      nCtx.fillStyle = 'rgb(128,104,255)';
      nCtx.fillRect(x, y, step, 3);
      nCtx.fillStyle = 'rgb(128,152,255)';
      nCtx.fillRect(x, y + step - 3, step, 3);
      nCtx.fillStyle = 'rgb(104,128,255)';
      nCtx.fillRect(x, y, 3, step);
      nCtx.fillStyle = 'rgb(152,128,255)';
      nCtx.fillRect(x + step - 3, y, 3, step);
    }
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(8, 5);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(8, 5);

  return { map, normalMap };
}

function createArchitecturalWoodWallTextures(darkMode: boolean): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const size = 512;
  const cCanvas = document.createElement('canvas');
  cCanvas.width = size;
  cCanvas.height = size;
  const cCtx = cCanvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d')!;

  cCtx.fillStyle = darkMode ? '#1c1715' : '#26201c';
  cCtx.fillRect(0, 0, size, size);

  nCtx.fillStyle = 'rgb(128,128,255)';
  nCtx.fillRect(0, 0, size, size);

  // Vertical ribbed architectural wood paneling (inspired by bellostas.studio locker pavilion)
  const slatWidth = 32;
  for (let x = 0; x < size; x += slatWidth) {
    const tone = ((x / slatWidth) * 7) % 5;
    cCtx.fillStyle = darkMode
      ? `rgb(${32 + tone},${26 + tone},${23 + tone})`
      : `rgb(${46 + tone},${38 + tone},${33 + tone})`;
    cCtx.fillRect(x + 2, 0, slatWidth - 4, size);

    // Shadow groove
    cCtx.fillStyle = '#0d0b0a';
    cCtx.fillRect(x, 0, 2, size);

    nCtx.fillStyle = 'rgb(98,128,255)';
    nCtx.fillRect(x, 0, 3, size);
    nCtx.fillStyle = 'rgb(158,128,255)';
    nCtx.fillRect(x + slatWidth - 3, 0, 3, size);
  }

  const map = new THREE.CanvasTexture(cCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(6, 1);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(6, 1);

  return { map, normalMap };
}

/**
 * Builds the complete unified 3D Walkthrough Apartment Showroom with:
 * - Dark architectural slatted wood backdrop & crimson/slate display plinth (bellostas.studio aesthetic)
 * - Overhead brass rail & spot-canister fixtures illuminating each appliance without glare
 * - Zone 1: Kitchen (Refrigerator 90×180×72 cm, Gas Stove 60×85×60 cm, Microwave 52×31×40 cm) — 100% unobstructed
 * - Zone 2: Laundry (Washing Machine 60×60×85 cm, Dryer 60×60×85 cm)
 * - Zone 3: Tech Desk (Galaxy S24 Ultra, iPhone 16 Pro Max, Workstation Laptop, Apple M4 Max SoC)
 */
export function buildFullApartmentScene(darkMode: boolean): {
  apartmentGroup: THREE.Group;
  applianceRigs: Map<ApplianceCategoryId, BuiltApplianceRig>;
  techDeskRigs: Map<string, BuiltTechDeskRig>;
} {
  const apartmentGroup = new THREE.Group();
  const applianceRigs = new Map<ApplianceCategoryId, BuiltApplianceRig>();
  const techDeskRigs = new Map<string, BuiltTechDeskRig>();

  const { map: floorMap, normalMap: floorNormal } = createStudioPlinthFloorTextures(darkMode);
  const { map: wallMap, normalMap: wallNormal } = createArchitecturalWoodWallTextures(darkMode);

  const floorMat = new THREE.MeshStandardMaterial({
    map: floorMap,
    normalMap: floorNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.62,
    metalness: 0.08,
  });

  const wallMat = new THREE.MeshStandardMaterial({
    map: wallMap,
    normalMap: wallNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.68,
    metalness: 0.05,
  });

  const walnutMat = new THREE.MeshStandardMaterial({
    color: 0x3b2618,
    roughness: 0.45,
    metalness: 0.08,
  });

  // Deep museum crimson/oxblood display plinth (signature bellostas.studio showcase stage)
  const plinthMat = new THREE.MeshStandardMaterial({
    color: darkMode ? 0x4b181d : 0x5c2026,
    roughness: 0.58,
    metalness: 0.06,
  });

  // Dark honed soapstone counter so stainless microwave & gas stove never wash out
  const soapstoneCounterMat = new THREE.MeshPhysicalMaterial({
    color: 0x1d1f24,
    roughness: 0.36,
    metalness: 0.12,
    clearcoat: 0.25,
    clearcoatRoughness: 0.35,
  });

  const brassStripMat = new THREE.MeshStandardMaterial({
    color: 0xd49b4b,
    metalness: 0.9,
    roughness: 0.22,
  });

  const rugMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b18,
    roughness: 0.92,
  });

  // Main Tiled Showroom Floor (12.4m W × 7.2m D)
  const floor = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.14, 7.2), floorMat);
  floor.position.set(0, -0.07, 0);
  floor.receiveShadow = true;
  apartmentGroup.add(floor);

  // Continuous Architectural Display Plinth along the back showroom wall (y = 0 to 0.08)
  const stagePlinth = new THREE.Mesh(
    new RoundedBoxGeometry(11.6, 0.08, 1.85, 3, 0.012),
    plinthMat
  );
  stagePlinth.position.set(-0.15, 0.04, -1.52);
  stagePlinth.receiveShadow = true;
  apartmentGroup.add(stagePlinth);

  // Brushed brass edge trim along the front lip of the display stage
  const plinthTrim = new THREE.Mesh(new THREE.BoxGeometry(11.62, 0.022, 0.024), brassStripMat);
  plinthTrim.position.set(-0.15, 0.072, -0.595);
  apartmentGroup.add(plinthTrim);

  // Back Ribbed Wood Architectural Wall
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(12.4, 3.2, 0.22), wallMat);
  backWall.position.set(0, 1.6, -2.55);
  backWall.receiveShadow = true;
  apartmentGroup.add(backWall);

  // Left Kitchen Side Wall
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 7.2), wallMat);
  leftWall.position.set(-6.1, 1.6, 0);
  leftWall.receiveShadow = true;
  apartmentGroup.add(leftWall);

  // Signature Overhead Brushed Brass Rail (running cleanly across all 3 zones like bellostas.studio)
  const brassRail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 11.4, 16),
    brassStripMat
  );
  brassRail.rotation.z = Math.PI / 2;
  brassRail.position.set(-0.15, 2.42, -1.25);
  apartmentGroup.add(brassRail);

  for (const bracketX of [-5.2, -3.15, -1.25, 0.22, 1.85, 3.4, 4.9]) {
    const hanger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.78, 12),
      brassStripMat
    );
    hanger.position.set(bracketX, 2.8, -1.25);
    apartmentGroup.add(hanger);

    // Architectural spotlight canister hanging from rail
    const spotCan = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.052, 0.14, 16),
      soapstoneCounterMat
    );
    spotCan.position.set(bracketX, 2.38, -1.18);
    spotCan.rotation.x = 0.28;
    apartmentGroup.add(spotCan);
  }

  // Architectural walnut zone dividers between Kitchen | Laundry | Tech Desk
  for (const divX of [-1.25, 1.85]) {
    const pillar = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, 3.1, 1.6, 3, 0.015),
      walnutMat
    );
    pillar.position.set(divX, 1.55, -1.75);
    pillar.castShadow = true;
    apartmentGroup.add(pillar);

    const pillarBrass = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 3.05, 0.02),
      brassStripMat
    );
    pillarBrass.position.set(divX, 1.55, -0.94);
    apartmentGroup.add(pillarBrass);
  }

  // --- ZONE 1: KITCHEN CABINETRY (Left: x = -5.5 to -1.4) ---
  // Note: No blocking foreground island so Fridge, Gas Stove, and Microwave are 100% visible!
  const kitchenCounterCabinet = new THREE.Mesh(
    new RoundedBoxGeometry(1.06, 0.84, 0.64, 4, 0.015),
    walnutMat
  );
  kitchenCounterCabinet.position.set(-2.0, 0.50, -1.68);
  kitchenCounterCabinet.castShadow = true;
  kitchenCounterCabinet.receiveShadow = true;
  apartmentGroup.add(kitchenCounterCabinet);

  const kitchenCounterTop = new THREE.Mesh(
    new RoundedBoxGeometry(1.12, 0.04, 0.68, 4, 0.01),
    soapstoneCounterMat
  );
  kitchenCounterTop.position.set(-2.0, 0.94, -1.68);
  kitchenCounterTop.receiveShadow = true;
  apartmentGroup.add(kitchenCounterTop);

  // Subtle dark range hood above the 60 cm gas stove
  const rangeHood = new THREE.Mesh(
    new RoundedBoxGeometry(0.68, 0.34, 0.50, 4, 0.015),
    soapstoneCounterMat
  );
  rangeHood.position.set(-3.15, 2.15, -1.75);
  rangeHood.castShadow = true;
  apartmentGroup.add(rangeHood);

  const hoodTrim = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.022, 0.51), brassStripMat);
  hoodTrim.position.set(-3.15, 1.99, -1.75);
  apartmentGroup.add(hoodTrim);

  // --- ZONE 2: LAUNDRY SUITE (Center: x = -0.9 to 1.6) ---
  const laundryShelf = new THREE.Mesh(
    new RoundedBoxGeometry(1.75, 0.045, 0.52, 3, 0.01),
    walnutMat
  );
  laundryShelf.position.set(0.22, 1.56, -1.8);
  laundryShelf.castShadow = true;
  apartmentGroup.add(laundryShelf);

  const laundryRug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.012, 1.15), rugMat);
  laundryRug.position.set(0.22, 0.01, -0.05);
  laundryRug.receiveShadow = true;
  apartmentGroup.add(laundryRug);

  // --- ZONE 3: TECH DESK & OFFICE (Right: x = 2.2 to 5.2) ---
  const deskTop = new THREE.Mesh(
    new RoundedBoxGeometry(1.95, 0.045, 0.88, 4, 0.012),
    walnutMat
  );
  deskTop.position.set(3.4, 0.81, -1.25);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  apartmentGroup.add(deskTop);

  const deskLegLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.78), brassStripMat);
  deskLegLeft.position.set(2.52, 0.44, -1.25);
  deskLegLeft.castShadow = true;
  apartmentGroup.add(deskLegLeft);

  const deskLegRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.72, 0.78), brassStripMat);
  deskLegRight.position.set(4.28, 0.44, -1.25);
  deskLegRight.castShadow = true;
  apartmentGroup.add(deskLegRight);

  const chairSeat = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.06, 0.48, 3, 0.012),
    walnutMat
  );
  chairSeat.position.set(3.4, 0.46, -0.32);
  chairSeat.castShadow = true;
  apartmentGroup.add(chairSeat);

  const chairBack = new THREE.Mesh(
    new RoundedBoxGeometry(0.5, 0.42, 0.05, 3, 0.012),
    walnutMat
  );
  chairBack.position.set(3.4, 0.68, -0.1);
  chairBack.castShadow = true;
  apartmentGroup.add(chairBack);

  const chairPedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.44, 16),
    brassStripMat
  );
  chairPedestal.position.set(3.4, 0.22, -0.32);
  apartmentGroup.add(chairPedestal);

  // --- PLACE THE 6 INTERACTIVE APPLIANCES ON THE SHOWROOM PLINTH ---
  const placements: Array<{
    category: ApplianceCategoryId;
    pos: [number, number, number];
  }> = [
    { category: 'refrigerator', pos: [-4.35, 0.08, -1.65] },
    { category: 'gas_stove', pos: [-3.15, 0.08, -1.7] },
    { category: 'microwave', pos: [-2.0, 0.96, -1.65] },
    { category: 'washing_machine', pos: [-0.22, 0.08, -1.7] },
    { category: 'dryer', pos: [0.66, 0.08, -1.7] },
    { category: 'laptop', pos: [3.4, 0.835, -1.25] },
  ];

  for (const item of placements) {
    const rig = buildSingleAppliance(item.category);
    rig.root.position.set(item.pos[0], item.pos[1], item.pos[2]);
    apartmentGroup.add(rig.root);
    applianceRigs.set(item.category, rig);
  }

  // --- PLACE THE TECH DESK FLAGSHIP DEVICES (Phones & Chip) ---
  // Tapping these opens the EXISTING Silicon Pulse gallery detail (3D X-Ray, Compare, AR, Cart)!
  const techItems: Array<{
    deviceId: string;
    pos: [number, number, number];
    scale: number;
    rotX: number;
    rotY: number;
  }> = [
    {
      deviceId: 'galaxy-s24-ultra',
      pos: [2.78, 0.92, -1.18],
      scale: 0.075,
      rotX: -0.35,
      rotY: 0.28,
    },
    {
      deviceId: 'iphone-16-pro-max',
      pos: [3.04, 0.92, -1.14],
      scale: 0.075,
      rotX: -0.35,
      rotY: 0.12,
    },
    {
      deviceId: 'apple-m4-max-soc',
      pos: [4.02, 0.92, -1.18],
      scale: 0.075,
      rotX: -0.35,
      rotY: -0.25,
    },
  ];

  for (const tItem of techItems) {
    const devSpec = DEVICES.find((d) => d.id === tItem.deviceId);
    if (!devSpec) continue;
    const holder = new THREE.Group();
    holder.position.set(...tItem.pos);

    // Small brass display cradle on the walnut desk
    const stand = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.025, 0.14, 3, 0.005),
      brassStripMat
    );
    stand.position.set(0, -0.07, 0);
    holder.add(stand);

    const built = buildDeviceModel(devSpec, devSpec.finishes[0]);
    built.root.scale.setScalar(tItem.scale);
    built.root.rotation.set(tItem.rotX, tItem.rotY, 0);
    holder.add(built.root);

    const highlightBox = createHighlightWireframe(0.24, 0.28, 0.22, 0.04);
    holder.add(highlightBox);

    tagTechDeviceRecursive(holder, tItem.deviceId);
    apartmentGroup.add(holder);

    techDeskRigs.set(tItem.deviceId, {
      deviceId: tItem.deviceId,
      root: holder,
      highlightBox,
      labelAnchorLocal: new THREE.Vector3(0, 0.28, 0),
    });
  }

  return { apartmentGroup, applianceRigs, techDeskRigs };
}
