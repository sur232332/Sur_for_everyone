import * as THREE from 'three';
import { DeviceSpec, ExplodedLayerId, FinishOption } from '../types/hardware';

export interface DeviceRig {
  root: THREE.Group;
  /** Real-world conversion factor: 1 scene unit = 0.1m (100mm) */
  unitToMeters: number;
  applyKinematics: (
    explode: number,
    hingeDeg: number,
    foldDeg: number,
    lensExtended: boolean
  ) => void;
  updateFinish: (finish: FinishOption) => void;
  highlightLayer: (layerId: ExplodedLayerId | null) => void;
}

function tagLayerRecursive(obj: THREE.Object3D, layerId: ExplodedLayerId) {
  obj.userData.layerId = layerId;
  obj.traverse((child) => {
    child.userData.layerId = layerId;
  });
}

function createRoundedRectShape(w: number, h: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = w / 2;
  const hh = h / 2;
  const rad = Math.min(r, hw * 0.92, hh * 0.92);
  shape.moveTo(-hw + rad, -hh);
  shape.lineTo(hw - rad, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + rad);
  shape.lineTo(hw, hh - rad);
  shape.quadraticCurveTo(hw, hh, hw - rad, hh);
  shape.lineTo(-hw + rad, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - rad);
  shape.lineTo(-hw, -hh + rad);
  shape.quadraticCurveTo(-hw, -hh, -hw + rad, -hh);
  return shape;
}

function createTriangularIslandShape(size: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-size * 0.55, size * 0.52);
  shape.quadraticCurveTo(-size * 0.6, 0, -size * 0.52, -size * 0.42);
  shape.quadraticCurveTo(-size * 0.46, -size * 0.56, 0.05, -size * 0.45);
  shape.quadraticCurveTo(size * 0.58, -size * 0.3, size * 0.55, 0.05);
  shape.quadraticCurveTo(size * 0.52, size * 0.42, 0.0, size * 0.54);
  shape.quadraticCurveTo(-size * 0.46, size * 0.62, -size * 0.55, size * 0.52);
  return shape;
}

/**
 * Builds a multi-element camera lens ring assembly oriented along -Z (rear of phone).
 */
function createCameraLensAssembly(
  outerRadius: number,
  protrusion: number,
  ringMat: THREE.Material,
  darkHousingMat: THREE.Material,
  opticalLensMat: THREE.Material,
  isPeriscope = false
): THREE.Group {
  const group = new THREE.Group();

  // Outer metallic barrel protruding along -Z
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius, outerRadius * 1.03, protrusion, 36),
    ringMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = -protrusion / 2;
  barrel.castShadow = true;
  group.add(barrel);

  // Chamfered top metallic lip ring
  const lipRing = new THREE.Mesh(
    new THREE.TorusGeometry(outerRadius * 0.9, outerRadius * 0.1, 16, 36),
    ringMat
  );
  lipRing.position.z = -protrusion;
  group.add(lipRing);

  // Dark internal stepped barrel cavity
  const innerCavity = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius * 0.82, outerRadius * 0.82, protrusion * 1.02, 32),
    darkHousingMat
  );
  innerCavity.rotation.x = Math.PI / 2;
  innerCavity.position.z = -protrusion * 0.52;
  group.add(innerCavity);

  // Sapphire optical glass cover
  const sapphireCover = new THREE.Mesh(
    new THREE.CylinderGeometry(outerRadius * 0.76, outerRadius * 0.76, 0.015, 32),
    opticalLensMat
  );
  sapphireCover.rotation.x = Math.PI / 2;
  sapphireCover.position.z = -protrusion - 0.005;
  group.add(sapphireCover);

  // Inner optical element (rectangular prism for periscope zoom or convex dome for standard)
  if (isPeriscope) {
    const prism = new THREE.Mesh(
      new THREE.BoxGeometry(outerRadius * 0.75, outerRadius * 0.52, 0.025),
      opticalLensMat
    );
    prism.position.z = -protrusion - 0.008;
    group.add(prism);
  } else {
    const meniscus = new THREE.Mesh(
      new THREE.SphereGeometry(outerRadius * 0.46, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.45),
      opticalLensMat
    );
    meniscus.rotation.x = -Math.PI / 2;
    meniscus.position.z = -protrusion + 0.01;
    group.add(meniscus);
  }

  return group;
}

function createPhoneScreenTexture(
  spec: DeviceSpec,
  accentHex: string,
  maxAnisotropy: number,
  style: 's24' | 'iphone' | 'pura' | 'fold'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 512, 1024);
    if (style === 'iphone') {
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(0.45, '#251810');
      grad.addColorStop(1, '#492b17');
    } else if (style === 'pura') {
      grad.addColorStop(0, '#07140f');
      grad.addColorStop(0.5, '#133829');
      grad.addColorStop(1, '#090d11');
    } else if (style === 'fold') {
      grad.addColorStop(0, '#0a0f1f');
      grad.addColorStop(0.55, '#1e293b');
      grad.addColorStop(1, '#0f172a');
    } else {
      grad.addColorStop(0, '#0b0d14');
      grad.addColorStop(0.5, '#1f1b32');
      grad.addColorStop(1, '#362214');
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1024);

    // Subtle radial screen bloom
    const glow = ctx.createRadialGradient(256, 460, 10, 256, 460, 260);
    glow.addColorStop(0, `${accentHex}55`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 180, 512, 560);

    // Rich silk-titanium fluid wallpaper waves
    const waveGrad = ctx.createLinearGradient(40, 220, 472, 760);
    waveGrad.addColorStop(0, accentHex);
    waveGrad.addColorStop(0.5, style === 'iphone' ? '#f59e0b' : style === 'pura' ? '#10b981' : '#38bdf8');
    waveGrad.addColorStop(1, 'rgba(255,255,255,0.08)');
    ctx.fillStyle = waveGrad;
    ctx.beginPath();
    ctx.ellipse(256, 470, 175, 115, -0.35, 0, Math.PI * 2);
    ctx.fill();

    const innerCore = ctx.createRadialGradient(256, 470, 15, 256, 470, 155);
    innerCore.addColorStop(0, 'rgba(10, 12, 18, 0.92)');
    innerCore.addColorStop(1, 'rgba(10, 12, 18, 0.15)');
    ctx.fillStyle = innerCore;
    ctx.beginPath();
    ctx.arc(256, 470, 140, 0, Math.PI * 2);
    ctx.fill();

    // Status bar clock & battery/5G icons
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.font = 'bold 21px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('09:41', 42, 52);
    ctx.textAlign = 'right';
    ctx.fillText('5G · 100%', 470, 52);

    // Large Lock/Home Clock & Model Header
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '600 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(spec.brand.toUpperCase() + ' FLAGSHIP', 256, 125);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 88px sans-serif';
    ctx.fillText('09:41', 256, 212);

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(spec.name.replace('Samsung ', '').replace('Apple ', '').replace('Huawei ', ''), 256, 252);

    // Glassmorphic Spec Widgets Row
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.roundRect(42, 640, 204, 110, 24);
    ctx.roundRect(266, 640, 204, 110, 24);
    ctx.fill();

    ctx.fillStyle = accentHex;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('DISPLAY', 64, 678);
    ctx.fillText('SILICON', 288, 678);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(spec.screenBadge.slice(0, 14), 64, 712);
    ctx.fillText(`${spec.benchmarks.peakNits} nits`, 64, 736);
    ctx.fillText(`1C: ${spec.benchmarks.singleCore}`, 288, 712);
    ctx.fillText(`MC: ${spec.benchmarks.multiCore}`, 288, 736);

    // Bottom Frosted Dock with 4 App Icons
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(42, 845, 428, 108, 32);
    ctx.fill();

    const dockColors = ['#10b981', '#3b82f6', accentHex, '#f43f5e'];
    dockColors.forEach((col, idx) => {
      const ix = 72 + idx * 98;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.roundRect(ix, 863, 72, 72, 18);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.beginPath();
      ctx.arc(ix + 36, 899, 14, 0, Math.PI * 2);
      ctx.fill();
    });

    // Home indicator bar
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.roundRect(176, 988, 160, 10, 5);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createLaptopScreenTexture(
  spec: DeviceSpec,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#090C12';
    ctx.fillRect(0, 0, 1024, 640);

    ctx.fillStyle = '#121722';
    ctx.fillRect(0, 0, 1024, 46);
    ctx.fillStyle = accentHex;
    ctx.font = 'bold 20px monospace';
    ctx.fillText(spec.screenBadge, 28, 30);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    ctx.strokeRect(32, 74, 610, 526);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let x = 80; x < 640; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, 74);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 118; y < 600; y += 44) {
      ctx.beginPath();
      ctx.moveTo(32, y);
      ctx.lineTo(642, y);
      ctx.stroke();
    }

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(218, 225, 190, 190);
    ctx.strokeRect(262, 182, 190, 190);

    ctx.fillStyle = '#121722';
    ctx.fillRect(666, 74, 326, 526);
    ctx.fillStyle = '#F5F2EB';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(spec.name.slice(0, 22), 688, 118);

    const lines = [
      `CPU 1C: ${spec.benchmarks.singleCore}`,
      `CPU MC: ${spec.benchmarks.multiCore}`,
      `GPU SCORE: ${spec.benchmarks.gpuScore}`,
      `PEAK NITS: ${spec.benchmarks.peakNits}`,
      `MASS: ${spec.weightGrams} g`,
      `DEPTH: ${spec.dimensionsMm.depth} mm`,
    ];
    ctx.font = '18px monospace';
    ctx.fillStyle = '#9CA3AF';
    lines.forEach((line, i) => {
      ctx.fillText(line, 688, 180 + i * 52);
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createChipDieTexture(
  label: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0D1117';
    ctx.fillRect(0, 0, 512, 512);

    const blocks = [
      { x: 26, y: 26, w: 214, h: 205, rows: 4, cols: 4 },
      { x: 272, y: 26, w: 214, h: 205, rows: 8, cols: 5 },
      { x: 26, y: 262, w: 214, h: 165, rows: 4, cols: 6 },
      { x: 272, y: 262, w: 214, h: 165, rows: 3, cols: 3 },
    ];
    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 2;
    blocks.forEach((b) => {
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeRect(b.x, b.y, b.w, b.h);
      const cw = (b.w - 14) / b.cols;
      const ch = (b.h - 14) / b.rows;
      for (let r = 0; r < b.rows; r++) {
        for (let c = 0; c < b.cols; c++) {
          ctx.fillStyle = (r + c) % 2 === 0 ? `${accentHex}55` : `${accentHex}24`;
          ctx.fillRect(b.x + 7 + c * cw + 2, b.y + 7 + r * ch + 2, cw - 4, ch - 4);
        }
      }
    });

    ctx.fillStyle = '#E5A952';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, 256, 474);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

export function buildDeviceModel(
  spec: DeviceSpec,
  initialFinish: FinishOption,
  maxAnisotropy = 4
): DeviceRig {
  const root = new THREE.Group();

  // Calibrated PBR Materials (Brushed Titanium, Frosted Satin Glass, Anodized Aluminum, Sapphire Lens)
  const frameMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFinish.hex),
    metalness: Math.max(0.78, initialFinish.metalness),
    roughness: Math.min(0.32, initialFinish.roughness),
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.45,
  });

  const backFrostedGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFinish.hex).offsetHSL(0, 0, -0.05),
    metalness: 0.12,
    roughness: 0.36,
    clearcoat: 0.9,
    clearcoatRoughness: 0.16,
    envMapIntensity: 1.2,
  });

  const cameraPlateauGlassMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(initialFinish.hex).offsetHSL(0, 0, -0.02),
    metalness: 0.18,
    roughness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
  });

  const accentMetalMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(initialFinish.accentHex),
    metalness: 0.94,
    roughness: 0.15,
    envMapIntensity: 1.5,
  });

  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0b0d12,
    metalness: 0.12,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.3,
  });

  const lensOpticalMat = new THREE.MeshPhysicalMaterial({
    color: 0x08192e,
    metalness: 0.15,
    roughness: 0.02,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02,
    ior: 1.85,
    envMapIntensity: 1.6,
  });

  const flashMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: new THREE.Color(0xfde68a),
    emissiveIntensity: 0.25,
    roughness: 0.2,
    metalness: 0.1,
  });

  const laserAfMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b071e,
    metalness: 0.2,
    roughness: 0.08,
    clearcoat: 1.0,
  });

  const pcbMat = new THREE.MeshStandardMaterial({
    color: 0x0d3b2a,
    metalness: 0.38,
    roughness: 0.46,
  });

  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xb87333,
    metalness: 0.92,
    roughness: 0.2,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xd49b4b,
    metalness: 0.96,
    roughness: 0.14,
  });

  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x1c212c,
    metalness: 0.25,
    roughness: 0.55,
  });

  const portRecessMat = new THREE.MeshStandardMaterial({
    color: 0x07080b,
    metalness: 0.45,
    roughness: 0.65,
  });

  // 1 scene unit = 100mm (0.1m)
  const mmToUnit = 0.01;
  const unitToMeters = 0.1;

  // Store 5 layer groups for highlight & exploded view
  const layerGroups: Record<ExplodedLayerId, THREE.Group> = {
    back_glass: new THREE.Group(),
    battery: new THREE.Group(),
    logic_board: new THREE.Group(),
    camera_module: new THREE.Group(),
    display: new THREE.Group(),
  };

  let applyFn: DeviceRig['applyKinematics'] = () => {};

  // ============================================================================
  // 1. SMARTPHONES: S24 ULTRA (4 LENSES), IPHONE 16 PRO MAX (3 LENSES), PURA 70 ULTRA (3 LENSES)
  // ============================================================================
  if (
    spec.geometryType === 'phone-s24' ||
    spec.geometryType === 'phone-iphone' ||
    spec.geometryType === 'phone-pura'
  ) {
    const w = spec.dimensionsMm.width * mmToUnit * 2.2;
    const h = spec.dimensionsMm.height * mmToUnit * 2.2;
    // Give phone body authentic physical thickness with bevelled metal perimeter
    const d = Math.max(0.195, spec.dimensionsMm.depth * mmToUnit * 2.35);
    const cornerR =
      spec.geometryType === 'phone-s24'
        ? 0.065
        : spec.geometryType === 'phone-iphone'
          ? 0.29
          : 0.25;

    const bevelThick = d * 0.18;
    const bevelSize = 0.026;
    const coreDepth = d - bevelThick * 2;
    const halfTotalZ = d / 2;

    // LAYER 1: BEVELLED METAL FRAME, BACK GLASS, SIDE BUTTONS, USB-C PORT (`back_glass`)
    const bodyShape = createRoundedRectShape(w - bevelSize * 2, h - bevelSize * 2, cornerR);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: coreDepth,
      bevelEnabled: true,
      bevelThickness: bevelThick,
      bevelSize: bevelSize,
      bevelSegments: 5,
      curveSegments: 18,
    });
    bodyGeo.center();
    const chassisMesh = new THREE.Mesh(bodyGeo, frameMat);
    chassisMesh.castShadow = true;
    chassisMesh.receiveShadow = true;
    layerGroups.back_glass.add(chassisMesh);

    // Satin-frosted rear glass slab inset cleanly on the -Z face
    const backGlassShape = createRoundedRectShape(w - 0.055, h - 0.055, Math.max(0.04, cornerR - 0.02));
    const backGlassGeo = new THREE.ExtrudeGeometry(backGlassShape, {
      depth: 0.012,
      bevelEnabled: false,
      curveSegments: 16,
    });
    backGlassGeo.center();
    const backGlassPlate = new THREE.Mesh(backGlassGeo, backFrostedGlassMat);
    backGlassPlate.position.z = -halfTotalZ - 0.002;
    backGlassPlate.receiveShadow = true;
    layerGroups.back_glass.add(backGlassPlate);

    // Subtle antenna band splits on the metal frame rails
    const antennaMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.6,
      metalness: 0.1,
    });
    [h * 0.38, -h * 0.38].forEach((ay) => {
      const bandL = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, d * 0.72), antennaMat);
      bandL.position.set(-w / 2 - 0.002, ay, 0);
      layerGroups.back_glass.add(bandL);

      const bandR = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.018, d * 0.72), antennaMat);
      bandR.position.set(w / 2 + 0.002, ay, 0);
      layerGroups.back_glass.add(bandR);
    });

    // Tactile Bevelled Side Buttons (Power / Side button, Volume Up, Volume Down)
    const createSideButton = (len: number, thick: number) => {
      const s = createRoundedRectShape(thick, len, thick * 0.42);
      const g = new THREE.ExtrudeGeometry(s, {
        depth: 0.026,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.005,
        bevelSegments: 2,
      });
      g.center();
      g.rotateY(Math.PI / 2);
      return new THREE.Mesh(g, accentMetalMat);
    };

    if (spec.geometryType === 'phone-s24' || spec.geometryType === 'phone-pura') {
      // S24 Ultra & Pura 70 Ultra: Power & Volume on Right side (+X)
      const pwrBtn = createSideButton(0.24, 0.052);
      pwrBtn.position.set(w / 2 + 0.012, 0.22, 0);
      layerGroups.back_glass.add(pwrBtn);

      const volUpBtn = createSideButton(0.22, 0.052);
      volUpBtn.position.set(w / 2 + 0.012, 0.58, 0);
      layerGroups.back_glass.add(volUpBtn);

      const volDnBtn = createSideButton(0.22, 0.052);
      volDnBtn.position.set(w / 2 + 0.012, 0.84, 0);
      layerGroups.back_glass.add(volDnBtn);
    } else {
      // iPhone 16 Pro Max: Side Button + Camera Control on Right (+X), Action + Volume on Left (-X)
      const sideBtn = createSideButton(0.3, 0.055);
      sideBtn.position.set(w / 2 + 0.012, 0.36, 0);
      layerGroups.back_glass.add(sideBtn);

      const camCtrlBtn = createSideButton(0.26, 0.052);
      camCtrlBtn.material = darkGlassMat;
      camCtrlBtn.position.set(w / 2 + 0.008, -0.52, 0);
      layerGroups.back_glass.add(camCtrlBtn);

      const actionBtn = createSideButton(0.14, 0.052);
      actionBtn.position.set(-w / 2 - 0.012, 0.86, 0);
      layerGroups.back_glass.add(actionBtn);

      const volUpBtn = createSideButton(0.22, 0.052);
      volUpBtn.position.set(-w / 2 - 0.012, 0.56, 0);
      layerGroups.back_glass.add(volUpBtn);

      const volDnBtn = createSideButton(0.22, 0.052);
      volDnBtn.position.set(-w / 2 - 0.012, 0.28, 0);
      layerGroups.back_glass.add(volDnBtn);
    }

    // Bottom USB-C Port with Metallic Collar, Center Tongue & Speaker Grille Holes
    const usbGroup = new THREE.Group();
    usbGroup.position.set(0, -h / 2, 0);

    const usbCollarShape = createRoundedRectShape(0.23, 0.082, 0.038);
    const usbCollarGeo = new THREE.ExtrudeGeometry(usbCollarShape, {
      depth: 0.025,
      bevelEnabled: false,
    });
    usbCollarGeo.center();
    usbCollarGeo.rotateX(Math.PI / 2);
    const usbCollar = new THREE.Mesh(usbCollarGeo, accentMetalMat);
    usbCollar.position.y = -0.002;
    usbGroup.add(usbCollar);

    const usbCavityShape = createRoundedRectShape(0.195, 0.058, 0.026);
    const usbCavityGeo = new THREE.ExtrudeGeometry(usbCavityShape, {
      depth: 0.032,
      bevelEnabled: false,
    });
    usbCavityGeo.center();
    usbCavityGeo.rotateX(Math.PI / 2);
    const usbCavity = new THREE.Mesh(usbCavityGeo, portRecessMat);
    usbCavity.position.y = -0.004;
    usbGroup.add(usbCavity);

    // Internal USB-C pin tongue
    const usbTongue = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.028, 0.012),
      goldMat
    );
    usbTongue.position.y = -0.005;
    usbGroup.add(usbTongue);

    // Precision Speaker Grille Holes on bottom rail
    [-0.42, -0.34, -0.26, 0.26, 0.34, 0.42].forEach((sx) => {
      const grilleHole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.018, 0.018, 0.03, 14),
        portRecessMat
      );
      grilleHole.position.set(sx, -0.003, 0);
      usbGroup.add(grilleHole);
    });

    layerGroups.back_glass.add(usbGroup);

    // S-Pen Stylus for Galaxy S24 Ultra
    let sPenGroup: THREE.Group | null = null;
    if (spec.geometryType === 'phone-s24') {
      sPenGroup = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, h * 0.66, 16),
        accentMetalMat
      );
      shaft.position.set(-w * 0.35, -h * 0.14, 0);
      sPenGroup.add(shaft);
      const clicker = new THREE.Mesh(
        new THREE.CylinderGeometry(0.046, 0.046, 0.12, 16),
        goldMat
      );
      clicker.position.set(-w * 0.35, -h * 0.49, 0);
      sPenGroup.add(clicker);
      layerGroups.back_glass.add(sPenGroup);
    }

    // LAYER 2: BATTERY & WIRELESS COIL (`battery`)
    const batteryCell = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.72, h * 0.48, d * 0.34),
      batteryMat
    );
    batteryCell.position.set(0.05, -h * 0.16, -0.015);
    layerGroups.battery.add(batteryCell);

    const inductionCoil = new THREE.Mesh(
      new THREE.TorusGeometry(0.38, 0.038, 14, 42),
      copperMat
    );
    inductionCoil.position.set(0, -0.06, -0.04);
    layerGroups.battery.add(inductionCoil);

    // LAYER 3: LOGIC BOARD, SILICON SoC & VAPOR CHAMBER (`logic_board`)
    const mobo = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.8, h * 0.38, d * 0.22),
      pcbMat
    );
    mobo.position.set(0, h * 0.22, 0.015);
    layerGroups.logic_board.add(mobo);

    const socChip = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.36, d * 0.3), goldMat);
    socChip.position.set(0.1, h * 0.22, 0.04);
    layerGroups.logic_board.add(socChip);

    const vaporChamber = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.64, h * 0.3, 0.022),
      copperMat
    );
    vaporChamber.position.set(-0.04, h * 0.04, 0.025);
    layerGroups.logic_board.add(vaporChamber);

    // LAYER 4: REAR CAMERA BUMP & MULTI-RING LENSES (`camera_module`)
    const backSurfaceZ = -halfTotalZ - 0.008;
    let retractableBarrel: THREE.Group | null = null;

    if (spec.geometryType === 'phone-s24') {
      // SAMSUNG GALAXY S24 ULTRA: 4 Distinct Camera Lenses + Laser AF + LED Flash
      // Left Column: 3 Large Titanium Lens Rings (12MP Ultra-Wide, 200MP Wide, 50MP 5x Periscope)
      const leftColLenses: Array<{ y: number; rad: number; periscope: boolean }> = [
        { y: h * 0.355, rad: 0.185, periscope: false }, // 12MP Ultra-Wide
        { y: h * 0.195, rad: 0.195, periscope: false }, // 200MP Main Wide
        { y: h * 0.035, rad: 0.185, periscope: true }, // 50MP 5x Periscope Telephoto
      ];
      leftColLenses.forEach(({ y, rad, periscope }) => {
        const lensUnit = createCameraLensAssembly(
          rad,
          0.075,
          accentMetalMat,
          portRecessMat,
          lensOpticalMat,
          periscope
        );
        lensUnit.position.set(-w * 0.255, y, backSurfaceZ);
        layerGroups.camera_module.add(lensUnit);
      });

      // Right Column: 4th Camera Lens (10MP 3x Telephoto) + Laser AF Ring + LED Flash
      const fourthLens = createCameraLensAssembly(
        0.14,
        0.065,
        accentMetalMat,
        portRecessMat,
        lensOpticalMat,
        false
      );
      fourthLens.position.set(w * 0.015, h * 0.115, backSurfaceZ);
      layerGroups.camera_module.add(fourthLens);

      // Laser Auto-Focus Sensor Ring (Top Right of camera array)
      const laserRing = createCameraLensAssembly(
        0.135,
        0.055,
        accentMetalMat,
        portRecessMat,
        laserAfMat,
        false
      );
      laserRing.position.set(w * 0.015, h * 0.285, backSurfaceZ);
      layerGroups.camera_module.add(laserRing);

      // LED Flash Module (Between Laser AF and 4th Telephoto Lens)
      const flashMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.055, 0.025, 24),
        flashMat
      );
      flashMesh.rotation.x = Math.PI / 2;
      flashMesh.position.set(w * 0.015, h * 0.2, backSurfaceZ - 0.01);
      layerGroups.camera_module.add(flashMesh);
    } else if (spec.geometryType === 'phone-iphone') {
      // APPLE IPHONE 16 PRO MAX: Sculpted Camera Plateau + 3 Pro Lens Rings + LiDAR + Flash
      const plateauW = 0.88;
      const plateauH = 0.92;
      const plateauDepth = 0.052;
      const plateauShape = createRoundedRectShape(plateauW, plateauH, 0.2);
      const plateauGeo = new THREE.ExtrudeGeometry(plateauShape, {
        depth: plateauDepth,
        bevelEnabled: true,
        bevelThickness: 0.016,
        bevelSize: 0.016,
        bevelSegments: 4,
        curveSegments: 16,
      });
      plateauGeo.center();
      const plateauMesh = new THREE.Mesh(plateauGeo, cameraPlateauGlassMat);
      const plateauCenterX = -w * 0.18;
      const plateauCenterY = h * 0.285;
      plateauMesh.position.set(
        plateauCenterX,
        plateauCenterY,
        backSurfaceZ - plateauDepth / 2
      );
      plateauMesh.castShadow = true;
      layerGroups.camera_module.add(plateauMesh);

      const plateauSurfaceZ = backSurfaceZ - plateauDepth - 0.012;

      // 3 Pro Camera Lens Rings in Triangular Layout
      const triLenses: Array<[number, number, boolean]> = [
        [plateauCenterX - 0.195, plateauCenterY + 0.205, false], // 48MP Fusion Main
        [plateauCenterX - 0.195, plateauCenterY - 0.205, true], // 12MP 5x Tetraprism
        [plateauCenterX + 0.185, plateauCenterY, false], // 48MP Ultra-Wide
      ];
      triLenses.forEach(([cx, cy, isTetra]) => {
        const lensUnit = createCameraLensAssembly(
          0.178,
          0.072,
          accentMetalMat,
          portRecessMat,
          lensOpticalMat,
          isTetra
        );
        lensUnit.position.set(cx, cy, plateauSurfaceZ);
        layerGroups.camera_module.add(lensUnit);
      });

      // True Tone LED Flash (Top-Right of Plateau)
      const flashRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.072, 0.072, 0.022, 24),
        flashMat
      );
      flashRing.rotation.x = Math.PI / 2;
      flashRing.position.set(
        plateauCenterX + 0.185,
        plateauCenterY + 0.24,
        plateauSurfaceZ - 0.008
      );
      layerGroups.camera_module.add(flashRing);

      // LiDAR Scanner (Bottom-Right of Plateau)
      const lidarScanner = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.082, 0.022, 24),
        darkGlassMat
      );
      lidarScanner.rotation.x = Math.PI / 2;
      lidarScanner.position.set(
        plateauCenterX + 0.185,
        plateauCenterY - 0.24,
        plateauSurfaceZ - 0.008
      );
      layerGroups.camera_module.add(lidarScanner);
    } else if (spec.geometryType === 'phone-pura') {
      // HUAWEI PURA 70 ULTRA: Triangular XMAGE Camera Bump + 3 Lens Rings
      const islandDepth = 0.055;
      const triIsland = createTriangularIslandShape(1.06);
      const islandGeo = new THREE.ExtrudeGeometry(triIsland, {
        depth: islandDepth,
        bevelEnabled: true,
        bevelThickness: 0.018,
        bevelSize: 0.018,
        bevelSegments: 4,
      });
      islandGeo.center();
      const islandMesh = new THREE.Mesh(islandGeo, cameraPlateauGlassMat);
      islandMesh.position.set(-w * 0.17, h * 0.28, backSurfaceZ - islandDepth / 2);
      layerGroups.camera_module.add(islandMesh);

      const islandSurfaceZ = backSurfaceZ - islandDepth - 0.012;

      // Lens 1: Giant 1-Inch Retractable Main Lens with Red XMAGE Ring
      retractableBarrel = new THREE.Group();
      retractableBarrel.position.set(-w * 0.26, h * 0.34, islandSurfaceZ);

      const mainLensUnit = createCameraLensAssembly(
        0.23,
        0.095,
        accentMetalMat,
        portRecessMat,
        lensOpticalMat,
        false
      );
      retractableBarrel.add(mainLensUnit);

      const redXmageRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.215, 0.016, 16, 36),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.78, roughness: 0.18 })
      );
      redXmageRing.position.z = -0.098;
      retractableBarrel.add(redXmageRing);
      layerGroups.camera_module.add(retractableBarrel);

      // Lens 2 (Ultra-Wide) & Lens 3 (Macro Telephoto Periscope)
      const puraSecLenses: Array<[number, number, number, boolean]> = [
        [-w * 0.26, h * 0.11, 0.155, false],
        [w * 0.01, h * 0.23, 0.165, true],
      ];
      puraSecLenses.forEach(([cx, cy, rad, periscope]) => {
        const secUnit = createCameraLensAssembly(
          rad,
          0.07,
          accentMetalMat,
          portRecessMat,
          lensOpticalMat,
          periscope
        );
        secUnit.position.set(cx, cy, islandSurfaceZ);
        layerGroups.camera_module.add(secUnit);
      });
    }

    // LAYER 5: GLASS SCREEN WITH BEZELS, DYNAMIC ISLAND / PUNCH-HOLE & SCREEN GLOW (`display`)
    const frontSurfaceZ = halfTotalZ;

    // Outer dark glass bezel plate (Ceramic Shield / Gorilla Armor)
    const bezelShape = createRoundedRectShape(
      w - 0.05,
      h - 0.05,
      Math.max(0.04, cornerR - 0.018)
    );
    const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, {
      depth: 0.014,
      bevelEnabled: false,
      curveSegments: 16,
    });
    bezelGeo.center();
    const bezelMesh = new THREE.Mesh(bezelGeo, darkGlassMat);
    bezelMesh.position.z = frontSurfaceZ + 0.002;
    layerGroups.display.add(bezelMesh);

    // Active OLED Display inset inside the dark glass bezel
    const screenStyle =
      spec.geometryType === 'phone-iphone'
        ? 'iphone'
        : spec.geometryType === 'phone-pura'
          ? 'pura'
          : 's24';
    const screenTex = createPhoneScreenTexture(
      spec,
      initialFinish.accentHex,
      maxAnisotropy,
      screenStyle
    );
    const screenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.42,
      roughness: 0.08,
      metalness: 0.06,
    });

    const activeScreenShape = createRoundedRectShape(
      w - 0.115,
      h - 0.115,
      Math.max(0.03, cornerR - 0.042)
    );
    const activeScreenGeo = new THREE.ShapeGeometry(activeScreenShape, 16);
    // Normalize UVs [0..1] for ShapeGeometry
    const posAttr = activeScreenGeo.attributes.position;
    const uvs = new Float32Array(posAttr.count * 2);
    const sw = w - 0.115;
    const sh = h - 0.115;
    for (let i = 0; i < posAttr.count; i++) {
      uvs[i * 2] = (posAttr.getX(i) + sw / 2) / sw;
      uvs[i * 2 + 1] = (posAttr.getY(i) + sh / 2) / sh;
    }
    activeScreenGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));

    const displayPlane = new THREE.Mesh(activeScreenGeo, screenMat);
    displayPlane.position.z = frontSurfaceZ + 0.011;
    layerGroups.display.add(displayPlane);

    // Top Earpiece Speaker Micro-Slit on Bezel
    const earpieceSlit = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.014, 0.006),
      portRecessMat
    );
    earpieceSlit.position.set(0, h / 2 - 0.042, frontSurfaceZ + 0.011);
    layerGroups.display.add(earpieceSlit);

    // 3D Dynamic Island (iPhone) or 3D Punch-Hole Selfie Camera (S24 Ultra / Pura 70 Ultra)
    if (spec.geometryType === 'phone-iphone') {
      const islandPillShape = createRoundedRectShape(0.36, 0.095, 0.046);
      const islandPillGeo = new THREE.ShapeGeometry(islandPillShape, 12);
      const islandPill = new THREE.Mesh(islandPillGeo, portRecessMat);
      islandPill.position.set(0, h / 2 - 0.16, frontSurfaceZ + 0.013);
      layerGroups.display.add(islandPill);

      const selfieLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.026, 16),
        lensOpticalMat
      );
      selfieLens.position.set(0.11, h / 2 - 0.16, frontSurfaceZ + 0.014);
      layerGroups.display.add(selfieLens);
    } else {
      const punchHole = new THREE.Mesh(
        new THREE.CircleGeometry(0.036, 20),
        portRecessMat
      );
      punchHole.position.set(0, h / 2 - 0.15, frontSurfaceZ + 0.013);
      layerGroups.display.add(punchHole);

      const selfieOptic = new THREE.Mesh(
        new THREE.CircleGeometry(0.02, 16),
        lensOpticalMat
      );
      selfieOptic.position.set(0, h / 2 - 0.15, frontSurfaceZ + 0.014);
      layerGroups.display.add(selfieOptic);
    }

    root.add(
      layerGroups.back_glass,
      layerGroups.battery,
      layerGroups.logic_board,
      layerGroups.camera_module,
      layerGroups.display
    );

    applyFn = (explode, _hinge, _fold, lensExtended) => {
      // Smoothly fan out the 5 layers along the Z-axis
      layerGroups.camera_module.position.z = -explode * 1.15;
      layerGroups.back_glass.position.z = -explode * 0.58;
      layerGroups.battery.position.z = -explode * 0.12;
      layerGroups.logic_board.position.z = explode * 0.35;
      layerGroups.display.position.z = explode * 0.92;

      if (sPenGroup) {
        sPenGroup.position.y = -explode * 1.35;
      }
      if (retractableBarrel) {
        retractableBarrel.position.z =
          backSurfaceZ - 0.067 - (lensExtended ? 0.095 : 0);
      }
    };
  } else if (spec.geometryType === 'foldable-book') {
    const fullW = spec.dimensionsMm.width * mmToUnit * 2.1;
    const h = spec.dimensionsMm.height * mmToUnit * 2.1;
    const halfW = fullW / 2;
    const d = 0.13;

    const spineMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.068, 0.068, h, 24),
      accentMetalMat
    );
    spineMesh.castShadow = true;
    layerGroups.back_glass.add(spineMesh);

    const leftPivot = new THREE.Group();
    const rightPivot = new THREE.Group();
    root.add(leftPivot, rightPivot);

    const wingShape = createRoundedRectShape(halfW, h, 0.12);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
      depth: d * 0.85,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.018,
      bevelSegments: 4,
    });
    wingGeo.center();

    const leftPanel = new THREE.Mesh(wingGeo, frameMat);
    leftPanel.position.set(-halfW / 2 - 0.02, 0, 0);
    leftPanel.castShadow = true;
    tagLayerRecursive(leftPanel, 'back_glass');
    leftPivot.add(leftPanel);

    const rightPanel = new THREE.Mesh(wingGeo, frameMat);
    rightPanel.position.set(halfW / 2 + 0.02, 0, 0);
    rightPanel.castShadow = true;
    tagLayerRecursive(rightPanel, 'back_glass');
    rightPivot.add(rightPanel);

    const innerTex = createPhoneScreenTexture(spec, initialFinish.accentHex, maxAnisotropy, 'fold');
    const innerScreenMat = new THREE.MeshStandardMaterial({
      map: innerTex,
      emissiveMap: innerTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.38,
      roughness: 0.12,
    });

    const leftScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 0.93, h * 0.95),
      innerScreenMat
    );
    leftScreen.position.set(-halfW / 2 - 0.02, 0, d / 2 + 0.016);
    tagLayerRecursive(leftScreen, 'display');
    leftPivot.add(leftScreen);

    const rightScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(halfW * 0.93, h * 0.95),
      innerScreenMat
    );
    rightScreen.position.set(halfW / 2 + 0.02, 0, d / 2 + 0.016);
    tagLayerRecursive(rightScreen, 'display');
    rightPivot.add(rightScreen);

    const leftCell = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 0.72, h * 0.65, 0.04),
      batteryMat
    );
    leftCell.position.set(-halfW / 2 - 0.02, 0, 0.04);
    tagLayerRecursive(leftCell, 'battery');
    leftPivot.add(leftCell);

    const rightMobo = new THREE.Mesh(
      new THREE.BoxGeometry(halfW * 0.72, h * 0.65, 0.04),
      pcbMat
    );
    rightMobo.position.set(halfW / 2 + 0.02, 0, 0.04);
    tagLayerRecursive(rightMobo, 'logic_board');
    rightPivot.add(rightMobo);

    const camHousing = new THREE.Group();
    camHousing.position.set(-halfW + 0.28, h * 0.25, -d / 2 - 0.02);
    const camPillShape = createRoundedRectShape(0.32, 0.88, 0.15);
    const camPillGeo = new THREE.ExtrudeGeometry(camPillShape, {
      depth: 0.045,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
    });
    camPillGeo.center();
    const camPill = new THREE.Mesh(camPillGeo, frameMat);
    camHousing.add(camPill);

    [0.24, 0, -0.24].forEach((ly) => {
      const foldLens = createCameraLensAssembly(
        0.115,
        0.055,
        accentMetalMat,
        portRecessMat,
        lensOpticalMat,
        false
      );
      foldLens.position.set(0, ly, -0.025);
      camHousing.add(foldLens);
    });
    tagLayerRecursive(camHousing, 'camera_module');
    leftPivot.add(camHousing);

    root.add(layerGroups.back_glass);

    applyFn = (explode, _hinge, foldDeg) => {
      const halfClosedRad = THREE.MathUtils.degToRad((180 - foldDeg) / 2);
      leftPivot.rotation.y = halfClosedRad;
      rightPivot.rotation.y = -halfClosedRad;
      leftScreen.position.z = d / 2 + 0.016 + explode * 0.68;
      rightScreen.position.z = d / 2 + 0.016 + explode * 0.68;
      leftCell.position.z = 0.04 + explode * 0.26;
      rightMobo.position.z = 0.04 + explode * 0.34;
      camHousing.position.z = -d / 2 - 0.02 - explode * 0.45;
    };
  } else if (spec.geometryType === 'foldable-trifold') {
    const totalW = spec.dimensionsMm.width * mmToUnit * 1.9;
    const h = spec.dimensionsMm.height * mmToUnit * 1.9;
    const panelW = totalW / 3;
    const d = 0.095;

    const centerPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, h, d), frameMat);
    centerPanel.castShadow = true;
    layerGroups.back_glass.add(centerPanel);

    const screenTex = createPhoneScreenTexture(spec, initialFinish.accentHex, maxAnisotropy, 'fold');
    const triScreenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.36,
      roughness: 0.12,
    });

    const centerScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(panelW * 0.96, h * 0.95),
      triScreenMat
    );
    centerScreen.position.z = d / 2 + 0.012;
    layerGroups.display.add(centerScreen);

    const leftHinge = new THREE.Group();
    leftHinge.position.set(-panelW / 2, 0, 0);
    root.add(leftHinge);

    const leftHingePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, h, 16),
      goldMat
    );
    tagLayerRecursive(leftHingePin, 'back_glass');
    leftHinge.add(leftHingePin);

    const leftPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, h, d), frameMat);
    leftPanel.position.set(-panelW / 2, 0, 0);
    leftPanel.castShadow = true;
    tagLayerRecursive(leftPanel, 'back_glass');
    leftHinge.add(leftPanel);

    const leftScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(panelW * 0.96, h * 0.95),
      triScreenMat
    );
    leftScreen.position.set(-panelW / 2, 0, d / 2 + 0.012);
    tagLayerRecursive(leftScreen, 'display');
    leftHinge.add(leftScreen);

    const octCamGroup = new THREE.Group();
    octCamGroup.position.set(-panelW / 2, h * 0.24, -d / 2 - 0.03);
    const octCam = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.06, 8), goldMat);
    octCam.rotation.x = Math.PI / 2;
    octCamGroup.add(octCam);
    [
      [-0.12, 0.12],
      [0.12, 0.12],
      [0, -0.12],
    ].forEach(([lx, ly]) => {
      const lens = createCameraLensAssembly(
        0.095,
        0.045,
        accentMetalMat,
        portRecessMat,
        lensOpticalMat,
        false
      );
      lens.position.set(lx, ly, -0.03);
      octCamGroup.add(lens);
    });
    tagLayerRecursive(octCamGroup, 'camera_module');
    leftHinge.add(octCamGroup);

    const rightHinge = new THREE.Group();
    rightHinge.position.set(panelW / 2, 0, 0);
    root.add(rightHinge);

    const rightHingePin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, h, 16),
      goldMat
    );
    tagLayerRecursive(rightHingePin, 'back_glass');
    rightHinge.add(rightHingePin);

    const rightPanel = new THREE.Mesh(new THREE.BoxGeometry(panelW, h, d), frameMat);
    rightPanel.position.set(panelW / 2, 0, 0);
    rightPanel.castShadow = true;
    tagLayerRecursive(rightPanel, 'back_glass');
    rightHinge.add(rightPanel);

    const rightScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(panelW * 0.96, h * 0.95),
      triScreenMat
    );
    rightScreen.position.set(panelW / 2, 0, d / 2 + 0.012);
    tagLayerRecursive(rightScreen, 'display');
    rightHinge.add(rightScreen);

    const centerCell = new THREE.Mesh(
      new THREE.BoxGeometry(panelW * 0.72, h * 0.7, 0.03),
      batteryMat
    );
    centerCell.position.z = 0.04;
    layerGroups.battery.add(centerCell);

    const centerMobo = new THREE.Mesh(
      new THREE.BoxGeometry(panelW * 0.65, h * 0.45, 0.03),
      pcbMat
    );
    centerMobo.position.z = 0.08;
    layerGroups.logic_board.add(centerMobo);

    root.add(
      layerGroups.back_glass,
      layerGroups.battery,
      layerGroups.logic_board,
      layerGroups.display
    );

    applyFn = (explode, _hinge, foldDeg) => {
      const t = 1 - Math.max(0, Math.min(180, foldDeg)) / 180;
      leftHinge.rotation.y = t * Math.PI * 0.92;
      rightHinge.rotation.y = t * Math.PI * 0.92;
      layerGroups.display.position.z = explode * 0.65;
      leftScreen.position.z = d / 2 + 0.012 + explode * 0.65;
      rightScreen.position.z = d / 2 + 0.012 + explode * 0.65;
      layerGroups.battery.position.z = explode * 0.2;
      layerGroups.logic_board.position.z = explode * 0.42;
      octCamGroup.position.z = -d / 2 - 0.03 - explode * 0.45;
    };
  } else if (
    // ============================================================================
    // 2. LAPTOPS: CNC UNIBODY CHASSIS, KEYBOARD MATRIX, TRACKPAD, HINGED DISPLAY
    // ============================================================================
    spec.geometryType === 'laptop-book4' ||
    spec.geometryType === 'laptop-macbook' ||
    spec.geometryType === 'laptop-matebook'
  ) {
    const w = spec.dimensionsMm.width * mmToUnit * 1.15;
    const depth = spec.dimensionsMm.height * mmToUnit * 1.15;
    const baseThick = Math.max(0.14, spec.dimensionsMm.depth * mmToUnit * 1.25);

    // 1. Rounded CNC Unibody Base Chassis + Side Ports (`back_glass`)
    const baseShape = createRoundedRectShape(w, depth, 0.16);
    const baseGeo = new THREE.ExtrudeGeometry(baseShape, {
      depth: baseThick * 0.68,
      bevelEnabled: true,
      bevelThickness: 0.016,
      bevelSize: 0.016,
      bevelSegments: 3,
      curveSegments: 14,
    });
    baseGeo.center();
    baseGeo.rotateX(Math.PI / 2);
    const baseMesh = new THREE.Mesh(baseGeo, frameMat);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    layerGroups.back_glass.add(baseMesh);

    // Side Thunderbolt / USB-C / MagSafe / HDMI ports
    [-depth * 0.3, -depth * 0.14, depth * 0.04].forEach((pz) => {
      const port = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.032, 0.11), portRecessMat);
      port.position.set(-w / 2 - 0.01, 0, pz);
      layerGroups.back_glass.add(port);
    });

    // 2. Battery Pack (`battery`)
    const batt = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.78, 0.05, depth * 0.34),
      batteryMat
    );
    batt.position.set(0, baseThick * 0.25, depth * 0.25);
    layerGroups.battery.add(batt);

    // 3. Logic Board, SoC & Dual Fans (`logic_board`)
    const mobo = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, 0.04, depth * 0.48),
      pcbMat
    );
    mobo.position.set(0, baseThick * 0.25, -depth * 0.18);
    layerGroups.logic_board.add(mobo);

    const socMesh = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.58), goldMat);
    socMesh.position.set(0, baseThick * 0.3, -depth * 0.18);
    layerGroups.logic_board.add(socMesh);

    [-0.85, 0.85].forEach((fx) => {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24), copperMat);
      fan.position.set(fx, baseThick * 0.3, -depth * 0.22);
      layerGroups.logic_board.add(fan);
    });

    // 4. Recessed Keyboard Well, Keycap Rows & Haptic Trackpad (`camera_module`)
    const kbWell = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.84, 0.022, depth * 0.46),
      new THREE.MeshStandardMaterial({ color: 0x0b0d12, roughness: 0.5, metalness: 0.2 })
    );
    kbWell.position.set(0, baseThick * 0.38, -depth * 0.12);
    layerGroups.camera_module.add(kbWell);

    // Tactile Keycap Rows
    const keycapMat = new THREE.MeshStandardMaterial({
      color: 0x161922,
      roughness: 0.4,
      metalness: 0.15,
    });
    for (let r = 0; r < 5; r++) {
      const rowZ = -depth * 0.3 + r * (depth * 0.085);
      const keyRow = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.8, 0.016, depth * 0.062),
        keycapMat
      );
      keyRow.position.set(0, baseThick * 0.4, rowZ);
      layerGroups.camera_module.add(keyRow);
    }

    const trackpad = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.36, 0.024, depth * 0.28),
      accentMetalMat
    );
    trackpad.position.set(0, baseThick * 0.38, depth * 0.31);
    layerGroups.camera_module.add(trackpad);

    // 5. Hinged Display Lid with Rounded Corners (`display`)
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, baseThick * 0.36, -depth * 0.49);
    layerGroups.display.add(lidPivot);

    const lidShape = createRoundedRectShape(w, depth, 0.15);
    const lidGeo = new THREE.ExtrudeGeometry(lidShape, {
      depth: 0.065,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 2,
    });
    lidGeo.center();
    const lidShell = new THREE.Mesh(lidGeo, frameMat);
    lidShell.position.set(0, depth / 2, 0);
    lidShell.castShadow = true;
    lidPivot.add(lidShell);

    const screenTex = createLaptopScreenTexture(spec, initialFinish.accentHex, maxAnisotropy);
    const lapScreenMat = new THREE.MeshStandardMaterial({
      map: screenTex,
      emissiveMap: screenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.45,
      roughness: 0.1,
    });
    const screenPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.94, depth * 0.92),
      lapScreenMat
    );
    screenPlane.position.set(0, depth / 2, 0.046);
    lidPivot.add(screenPlane);

    root.add(
      layerGroups.back_glass,
      layerGroups.battery,
      layerGroups.logic_board,
      layerGroups.camera_module,
      layerGroups.display
    );

    applyFn = (explode, hingeDeg) => {
      const targetRad = THREE.MathUtils.degToRad(Math.max(0, Math.min(135, hingeDeg)));
      lidPivot.rotation.x = Math.PI / 2 - targetRad;
      layerGroups.battery.position.y = explode * 0.25;
      layerGroups.logic_board.position.y = explode * 0.52;
      layerGroups.camera_module.position.y = explode * 0.85;
      layerGroups.display.position.y = explode * 1.15;
    };
  } else {
    // ============================================================================
    // 3. SILICON CHIP PACKAGE (APPLE M4 MAX SoC)
    // ============================================================================
    const substrate = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.14, 2.8), pcbMat);
    substrate.castShadow = true;
    layerGroups.back_glass.add(substrate);

    const pinGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.08, 10);
    const pinCount = 49;
    const pinsMesh = new THREE.InstancedMesh(pinGeo, goldMat, pinCount);
    const dummy = new THREE.Object3D();
    let idx = 0;
    for (let xi = -3; xi <= 3; xi++) {
      for (let zi = -3; zi <= 3; zi++) {
        dummy.position.set(xi * 0.36, -0.1, zi * 0.36);
        dummy.updateMatrix();
        pinsMesh.setMatrixAt(idx++, dummy.matrix);
      }
    }
    pinsMesh.computeBoundingSphere();
    layerGroups.battery.add(pinsMesh);

    const dieTex = createChipDieTexture(spec.screenBadge, initialFinish.accentHex, maxAnisotropy);
    const dieMat = new THREE.MeshStandardMaterial({
      map: dieTex,
      emissiveMap: dieTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.34,
      metalness: 0.72,
      roughness: 0.14,
    });
    const dieMesh = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 1.9), dieMat);
    dieMesh.position.y = 0.14;
    layerGroups.logic_board.add(dieMesh);

    // Gold SMD capacitors flanking the silicon die
    [-1.12, 1.12].forEach((cx) => {
      const capRow = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.5), goldMat);
      capRow.position.set(cx, 0.1, 0);
      layerGroups.logic_board.add(capRow);
    });

    const ihsLid = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.1, 2.45), frameMat);
    ihsLid.position.y = 0.28;
    ihsLid.castShadow = true;
    layerGroups.display.add(ihsLid);

    root.add(
      layerGroups.back_glass,
      layerGroups.battery,
      layerGroups.logic_board,
      layerGroups.display
    );

    applyFn = (explode) => {
      layerGroups.battery.position.y = -explode * 0.45;
      layerGroups.logic_board.position.y = explode * 0.38;
      layerGroups.display.position.y = explode * 0.95;
    };
  }

  // Tag all layer groups for raycasting
  (Object.keys(layerGroups) as ExplodedLayerId[]).forEach((id) => {
    tagLayerRecursive(layerGroups[id], id);
  });

  // Track original emissive colors for clean layer highlighting
  const originalEmissive = new Map<THREE.MeshStandardMaterial, { hex: number; intensity: number }>();
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (m instanceof THREE.MeshStandardMaterial && !originalEmissive.has(m)) {
          originalEmissive.set(m, {
            hex: m.emissive.getHex(),
            intensity: m.emissiveIntensity,
          });
        }
      });
    }
  });

  const highlightLayer = (targetLayerId: ExplodedLayerId | null) => {
    root.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const objLayer = obj.userData.layerId as ExplodedLayerId | undefined;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!(m instanceof THREE.MeshStandardMaterial)) return;
        const orig = originalEmissive.get(m);
        if (!targetLayerId) {
          if (orig) {
            m.emissive.setHex(orig.hex);
            m.emissiveIntensity = orig.intensity;
          }
        } else if (objLayer === targetLayerId) {
          m.emissive.setHex(0xe5a952);
          m.emissiveIntensity = 0.55;
        } else if (orig) {
          m.emissive.setHex(orig.hex);
          m.emissiveIntensity = orig.intensity * 0.5;
        }
      });
    });
  };

  return {
    root,
    unitToMeters,
    applyKinematics: applyFn,
    updateFinish: (finish: FinishOption) => {
      frameMat.color.set(finish.hex);
      frameMat.roughness = Math.min(0.32, finish.roughness);
      frameMat.metalness = Math.max(0.78, finish.metalness);
      backFrostedGlassMat.color.set(finish.hex).offsetHSL(0, 0, -0.05);
      cameraPlateauGlassMat.color.set(finish.hex).offsetHSL(0, 0, -0.02);
      accentMetalMat.color.set(finish.accentHex);
    },
    highlightLayer,
  };
}
