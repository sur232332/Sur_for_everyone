import * as THREE from 'three';

/**
 * Generates an 8K-style Golden Hour Dusk + Twilight HDRI Environment texture
 * with warm low-angle golden sun horizon, cobalt zenith sky, and softbox highlights.
 */
export function createAutomotiveDuskEnvironment(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene
): THREE.Texture {
  const envScene = new THREE.Scene();

  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 1024;
  skyCanvas.height = 512;
  const ctx = skyCanvas.getContext('2d')!;

  // Golden hour dusk sky gradient (deep twilight blue zenith -> warm amber/gold horizon)
  const grad = ctx.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#060a14');
  grad.addColorStop(0.24, '#101d38');
  grad.addColorStop(0.42, '#283d66');
  grad.addColorStop(0.49, '#c96d32');
  grad.addColorStop(0.52, '#f59e0b');
  grad.addColorStop(0.55, '#2b2422');
  grad.addColorStop(1.0, '#07090e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 512);

  // Low golden hour sun glow on the horizon for dramatic rim light & hood reflections
  const sunGlow = ctx.createRadialGradient(240, 255, 8, 240, 255, 190);
  sunGlow.addColorStop(0.0, 'rgba(255, 250, 220, 1.0)');
  sunGlow.addColorStop(0.25, 'rgba(255, 190, 95, 0.92)');
  sunGlow.addColorStop(0.6, 'rgba(234, 88, 12, 0.35)');
  sunGlow.addColorStop(1.0, 'rgba(234, 88, 12, 0.0)');
  ctx.fillStyle = sunGlow;
  ctx.fillRect(0, 0, 1024, 512);

  // Crisp overhead sky reflection ribbons for sharp specular highlights on roofs & fenders
  const stripPositions = [
    [160, 105, 280, 24, 'rgba(255, 243, 205, 0.95)'],
    [580, 92, 290, 26, 'rgba(224, 242, 254, 0.92)'],
    [70, 190, 880, 12, 'rgba(255, 237, 213, 0.85)'],
    [340, 222, 360, 16, 'rgba(253, 186, 116, 0.8)'],
  ] as const;

  for (const [x, y, w, h, col] of stripPositions) {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  }

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  skyTex.colorSpace = THREE.SRGBColorSpace;

  const skyGeo = new THREE.SphereGeometry(60, 32, 24);
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));

  // Emissive 3D reflector cards for crisp ray-traced-like horizon streaks
  const panelGeo = new THREE.PlaneGeometry(26, 4.5);
  const goldenRimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(4.2, 2.7, 1.4),
    side: THREE.DoubleSide,
  });
  const skyFillMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.2, 2.9, 4.0),
    side: THREE.DoubleSide,
  });

  const panel1 = new THREE.Mesh(panelGeo, goldenRimMat);
  panel1.position.set(-16, 10, 14);
  panel1.lookAt(0, 0, 0);
  envScene.add(panel1);

  const panel2 = new THREE.Mesh(panelGeo, skyFillMat);
  panel2.position.set(14, 17, -14);
  panel2.lookAt(0, 0, 0);
  envScene.add(panel2);

  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(envScene, 0.02).texture;
  scene.environment = envMap;

  pmrem.dispose();
  skyTex.dispose();
  skyGeo.dispose();
  skyMat.dispose();
  panelGeo.dispose();

  return envMap;
}

/**
 * Generates Ultra-Detailed Coarse Wet Asphalt Albedo, Normal, and Roughness Maps:
 * - Coarse mineral aggregate grain
 * - Curved rubber tire marks & oil stains in bays
 * - Hairline asphalt cracks
 * - Specular puddle reflections (near-zero roughness inside puddle shapes!)
 * - Crisp white painted parking lines (slightly weathered)
 * - Tiny gravel pebbles and fallen leaves along the top & bottom curb edges
 */
export function createProAsphaltMaps(): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
  roughnessMap: THREE.CanvasTexture;
} {
  const w = 2048;
  const h = 1536;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  const rCanvas = document.createElement('canvas');
  rCanvas.width = w;
  rCanvas.height = h;
  const rCtx = rCanvas.getContext('2d')!;

  // Base roughness: coarse damp asphalt (~0.56 roughness)
  rCtx.fillStyle = 'rgb(142, 142, 142)';
  rCtx.fillRect(0, 0, w, h);

  // 1. Dark wet slate-charcoal asphalt base
  const baseGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 100, w * 0.5, h * 0.5, 1300);
  baseGrad.addColorStop(0, '#222834');
  baseGrad.addColorStop(0.55, '#1a202c');
  baseGrad.addColorStop(1, '#12161f');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  // 2. Warm golden-hour streetlamp light pools in the 6 bays
  const bayCentersX = [0.243, 0.5, 0.757];
  const bayCentersY = [0.22, 0.78];
  for (const bx of bayCentersX) {
    for (const by of bayCentersY) {
      const cx = bx * w;
      const cy = by * h;
      const pool = ctx.createRadialGradient(cx, cy, 15, cx, cy, 320);
      pool.addColorStop(0, 'rgba(68, 72, 86, 0.34)');
      pool.addColorStop(0.55, 'rgba(38, 44, 58, 0.16)');
      pool.addColorStop(1, 'rgba(20, 24, 34, 0)');
      ctx.fillStyle = pool;
      ctx.fillRect(0, 0, w, h);

      // Subtle dark oil stain in the center of each parking bay
      const oil = ctx.createRadialGradient(cx + 12, cy - 8, 4, cx, cy, 58);
      oil.addColorStop(0, 'rgba(6, 8, 12, 0.55)');
      oil.addColorStop(0.6, 'rgba(12, 16, 24, 0.25)');
      oil.addColorStop(1, 'rgba(12, 16, 24, 0)');
      ctx.fillStyle = oil;
      ctx.fillRect(cx - 70, cy - 70, 140, 140);
    }
  }

  // 3. Mirror-like Wet Puddle Patches (Darker albedo + very low roughness for sharp reflections!)
  const puddles = [
    [w * 0.36, h * 0.48, 155, 68, 0.2],
    [w * 0.64, h * 0.53, 180, 74, -0.15],
    [w * 0.21, h * 0.39, 110, 48, 0.1],
    [w * 0.78, h * 0.62, 130, 52, -0.25],
    [w * 0.49, h * 0.42, 95, 42, 0.05],
  ];
  for (const [px, py, rx, ry, rot] of puddles) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    const pGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, rx);
    pGrad.addColorStop(0, 'rgba(10, 14, 22, 0.62)');
    pGrad.addColorStop(0.75, 'rgba(15, 20, 30, 0.35)');
    pGrad.addColorStop(1, 'rgba(20, 25, 36, 0)');
    ctx.fillStyle = pGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Make the puddle glossy in the roughness map (rgb 18 = roughness 0.07!)
    rCtx.save();
    rCtx.translate(px, py);
    rCtx.rotate(rot);
    const rGrad = rCtx.createRadialGradient(0, 0, 10, 0, 0, rx);
    rGrad.addColorStop(0, 'rgb(16, 16, 16)');
    rGrad.addColorStop(0.7, 'rgb(32, 32, 32)');
    rGrad.addColorStop(1, 'rgb(142, 142, 142)');
    rCtx.fillStyle = rGrad;
    rCtx.beginPath();
    rCtx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    rCtx.fill();
    rCtx.restore();
  }

  // 4. Curved Tire Marks & Scuffs turning into the parking bays
  ctx.save();
  ctx.strokeStyle = 'rgba(10, 12, 17, 0.28)';
  ctx.lineWidth = 18;
  ctx.lineCap = 'round';
  for (const bx of bayCentersX) {
    const targetX = bx * w;
    // Top row turn-in tire tracks
    ctx.beginPath();
    ctx.moveTo(targetX - 180, h * 0.48);
    ctx.quadraticCurveTo(targetX - 35, h * 0.42, targetX - 42, h * 0.22);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(targetX - 120, h * 0.48);
    ctx.quadraticCurveTo(targetX + 35, h * 0.42, targetX + 42, h * 0.22);
    ctx.stroke();

    // Bottom row turn-in tire tracks
    ctx.beginPath();
    ctx.moveTo(targetX + 180, h * 0.52);
    ctx.quadraticCurveTo(targetX - 35, h * 0.58, targetX - 42, h * 0.78);
    ctx.stroke();
  }
  ctx.restore();

  // 5. Hairline Asphalt Cracks across the lot
  ctx.save();
  ctx.strokeStyle = 'rgba(8, 10, 15, 0.65)';
  ctx.lineWidth = 2.2;
  const crackSeeds = [
    [w * 0.15, h * 0.46, 14],
    [w * 0.44, h * 0.51, 18],
    [w * 0.68, h * 0.44, 15],
    [w * 0.31, h * 0.28, 12],
    [w * 0.72, h * 0.74, 14],
  ];
  for (const [sx, sy, steps] of crackSeeds) {
    ctx.beginPath();
    let cx = sx;
    let cy = sy;
    ctx.moveTo(cx, cy);
    for (let s = 0; s < steps; s++) {
      cx += (Math.random() - 0.35) * 32;
      cy += (Math.random() - 0.48) * 24;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 6. Coarse Aggregate Stone Grain (110,000 micro-stones)
  for (let i = 0; i < 110000; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const v = 22 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgba(${v}, ${v + 4}, ${v + 10}, ${0.18 + Math.random() * 0.28})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // 7. Crisp Painted White Parking Stall Lines (Slightly worn with asphalt grain showing through)
  const topEdgeY = h * 0.025;
  const topBayEnd = h * 0.365;
  const botBayStart = h * 0.635;
  const botEdgeY = h * 0.975;

  const bayWidthRatio = 3.6 / 14;
  const centerX = w * 0.5;
  const dividerOffsets = [-5, -3, -1, 1, 3, 5];

  ctx.save();
  ctx.strokeStyle = 'rgba(241, 245, 249, 0.9)';
  ctx.lineWidth = 15;
  ctx.lineCap = 'butt';

  for (const mult of dividerOffsets) {
    const lineX = centerX + mult * bayWidthRatio * (w * 0.5);

    ctx.beginPath();
    ctx.moveTo(lineX, topEdgeY);
    ctx.lineTo(lineX, topBayEnd);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(lineX, botBayStart);
    ctx.lineTo(lineX, botEdgeY);
    ctx.stroke();

    // Subtle weathering speckles along the painted lines
    ctx.fillStyle = '#1e2430';
    for (let wDot = 0; wDot < 45; wDot++) {
      const wx = lineX + (Math.random() - 0.5) * 14;
      const wyTop = topEdgeY + Math.random() * (topBayEnd - topEdgeY);
      const wyBot = botBayStart + Math.random() * (botEdgeY - botBayStart);
      ctx.fillRect(wx, wyTop, 3, 4);
      ctx.fillRect(wx, wyBot, 3, 4);
    }
  }
  ctx.restore();

  // 8. Tiny Gravel Pebbles & Fallen Leaves along the top and bottom curb edges!
  const leafColors = ['#b45309', '#d97706', '#65a30d', '#854d0e', '#ca8a04'];
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * w;
    const isTop = i % 2 === 0;
    const y = isTop ? Math.random() * (h * 0.045) : h - Math.random() * (h * 0.045);

    if (i % 3 === 0) {
      // Fallen leaf
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = leafColors[i % leafColors.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      // Tiny gravel pebble
      ctx.fillStyle = i % 2 === 0 ? '#64748b' : '#94a3b8';
      ctx.fillRect(x, y, 2.5, 2.5);
    }
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 16;

  const roughnessMap = new THREE.CanvasTexture(rCanvas);
  roughnessMap.anisotropy = 8;

  // 9. High-Frequency Coarse Stone Aggregate Normal Map (512x512 tiled)
  const nCanvas = document.createElement('canvas');
  nCanvas.width = 512;
  nCanvas.height = 512;
  const nCtx = nCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 60000; i++) {
    const x = Math.floor(Math.random() * 512);
    const y = Math.floor(Math.random() * 512);
    const nx = 92 + Math.floor(Math.random() * 72);
    const ny = 92 + Math.floor(Math.random() * 72);
    nCtx.fillStyle = `rgb(${nx}, ${ny}, 242)`;
    nCtx.fillRect(x, y, 2, 2);
  }

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(16, 12);

  return { map, normalMap, roughnessMap };
}

/**
 * Generates realistic lush lawn grass texture with individual blade noise & normal map
 */
export function createProGrassMaps(): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#365314';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle lawn mowing stripes
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(77, 124, 15, 0.24)' : 'rgba(26, 46, 5, 0.22)';
    ctx.fillRect(i * 64, 0, 64, 1024);
  }

  // Individual grass blade strokes
  for (let i = 0; i < 85000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const r = 42 + Math.floor(Math.random() * 60);
    const g = 75 + Math.floor(Math.random() * 82);
    const b = 14 + Math.floor(Math.random() * 24);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.fillRect(x, y, 1.5, 4.5);
  }

  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(10, 10);
  map.anisotropy = 8;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = 256;
  nCanvas.height = 256;
  const nCtx = nCanvas.getContext('2d')!;
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const nx = 100 + Math.floor(Math.random() * 56);
    const ny = 100 + Math.floor(Math.random() * 56);
    nCtx.fillStyle = `rgb(${nx}, ${ny}, 238)`;
    nCtx.fillRect(x, y, 2, 3);
  }
  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.repeat.set(22, 22);

  return { map, normalMap };
}

let cachedCarbonMap: THREE.CanvasTexture | null = null;
let cachedCarbonNormal: THREE.CanvasTexture | null = null;

/**
 * Generates visible 2x2 Twill Woven Carbon Fiber under lacquer
 */
export function getCarbonFiberTextures(): {
  map: THREE.CanvasTexture;
  normalMap: THREE.CanvasTexture;
} {
  if (cachedCarbonMap && cachedCarbonNormal) {
    return { map: cachedCarbonMap, normalMap: cachedCarbonNormal };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const nCanvas = document.createElement('canvas');
  nCanvas.width = 128;
  nCanvas.height = 128;
  const nCtx = nCanvas.getContext('2d')!;

  ctx.fillStyle = '#12151b';
  ctx.fillRect(0, 0, 128, 128);
  nCtx.fillStyle = 'rgb(128, 128, 255)';
  nCtx.fillRect(0, 0, 128, 128);

  const step = 8;
  for (let y = 0; y < 128; y += step) {
    for (let x = 0; x < 128; x += step) {
      const diag = ((x + y) / step) % 2 === 0;
      ctx.fillStyle = diag ? '#282e3a' : '#0e1116';
      ctx.fillRect(x, y, step - 1, step - 1);

      nCtx.fillStyle = diag ? 'rgb(146, 112, 246)' : 'rgb(110, 144, 246)';
      nCtx.fillRect(x, y, step - 1, step - 1);
    }
  }

  cachedCarbonMap = new THREE.CanvasTexture(canvas);
  cachedCarbonMap.colorSpace = THREE.SRGBColorSpace;
  cachedCarbonMap.wrapS = THREE.RepeatWrapping;
  cachedCarbonMap.wrapT = THREE.RepeatWrapping;
  cachedCarbonMap.repeat.set(14, 14);

  cachedCarbonNormal = new THREE.CanvasTexture(nCanvas);
  cachedCarbonNormal.wrapS = THREE.RepeatWrapping;
  cachedCarbonNormal.wrapT = THREE.RepeatWrapping;
  cachedCarbonNormal.repeat.set(14, 14);

  return { map: cachedCarbonMap, normalMap: cachedCarbonNormal };
}

let cachedFlakeNormal: THREE.CanvasTexture | null = null;
let cachedOrangePeelNormal: THREE.CanvasTexture | null = null;

/**
 * Multi-layer automotive paint:
 * 1) Basecoat deep metallic flake normal map
 * 2) Clearcoat subtle orange-peel micro-wave normal map
 */
export function getMetallicFlakeNormalMap(): THREE.CanvasTexture {
  if (cachedFlakeNormal) return cachedFlakeNormal;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const nx = 119 + Math.floor(Math.random() * 19);
    const ny = 119 + Math.floor(Math.random() * 19);
    ctx.fillStyle = `rgb(${nx}, ${ny}, 255)`;
    ctx.fillRect(x, y, 1, 1);
  }

  cachedFlakeNormal = new THREE.CanvasTexture(canvas);
  cachedFlakeNormal.wrapS = THREE.RepeatWrapping;
  cachedFlakeNormal.wrapT = THREE.RepeatWrapping;
  cachedFlakeNormal.repeat.set(22, 22);
  return cachedFlakeNormal;
}

export function getOrangePeelClearcoatNormalMap(): THREE.CanvasTexture {
  if (cachedOrangePeelNormal) return cachedOrangePeelNormal;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const waveX =
        Math.sin((x / size) * Math.PI * 12) * Math.cos((y / size) * Math.PI * 10) * 5;
      const waveY =
        Math.cos((x / size) * Math.PI * 10) * Math.sin((y / size) * Math.PI * 12) * 5;
      data[idx] = Math.min(255, Math.max(0, Math.round(128 + waveX)));
      data[idx + 1] = Math.min(255, Math.max(0, Math.round(128 + waveY)));
      data[idx + 2] = 255;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  cachedOrangePeelNormal = new THREE.CanvasTexture(canvas);
  cachedOrangePeelNormal.wrapS = THREE.RepeatWrapping;
  cachedOrangePeelNormal.wrapT = THREE.RepeatWrapping;
  cachedOrangePeelNormal.repeat.set(16, 16);
  return cachedOrangePeelNormal;
}

let cachedTireSidewallTex: THREE.CanvasTexture | null = null;

/**
 * Generates rubber tire sidewall texture with radial lettering ("MICHELIN PILOT SPORT CUP 2")
 */
export function getTireSidewallTexture(): THREE.CanvasTexture {
  if (cachedTireSidewallTex) return cachedTireSidewallTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#12151a';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  // Fine sidewall rubber ribbing rings
  for (let r = 185; r < 248; r += 3) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 2 === 0 ? '#181c23' : '#0f1217';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Curved Tire Sidewall Lettering along top & bottom arcs
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const drawArcText = (text: string, radius: number, startAngle: number, stepAngle: number) => {
    for (let i = 0; i < text.length; i++) {
      const ang = startAngle + i * stepAngle;
      ctx.save();
      ctx.rotate(ang);
      ctx.translate(0, -radius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }
  };

  drawArcText('MICHELIN  •  PILOT SPORT CUP 2', 216, -0.95, 0.068);
  drawArcText('325/30 ZR21 (108Y) EXTRA LOAD', 216, Math.PI - 0.95, 0.068);
  ctx.restore();

  cachedTireSidewallTex = new THREE.CanvasTexture(canvas);
  cachedTireSidewallTex.colorSpace = THREE.SRGBColorSpace;
  return cachedTireSidewallTex;
}

let cachedBrakeRotorMap: THREE.CanvasTexture | null = null;

/**
 * Generates cross-drilled carbon-ceramic brake rotor texture
 */
export function getBrakeRotorTexture(): THREE.CanvasTexture {
  if (cachedBrakeRotorMap) return cachedBrakeRotorMap;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#333942';
  ctx.fillRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;

  for (let r = 80; r < 245; r += 2) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = r % 4 === 0 ? 'rgba(95, 104, 118, 0.6)' : 'rgba(36, 40, 48, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  ctx.fillStyle = '#0f1217';
  const numArms = 18;
  for (let a = 0; a < numArms; a++) {
    const baseAngle = (a / numArms) * Math.PI * 2;
    for (let step = 0; step < 4; step++) {
      const rad = 115 + step * 32;
      const angle = baseAngle + step * 0.08;
      const hx = cx + Math.cos(angle) * rad;
      const hy = cy + Math.sin(angle) * rad;
      ctx.beginPath();
      ctx.arc(hx, hy, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  cachedBrakeRotorMap = new THREE.CanvasTexture(canvas);
  cachedBrakeRotorMap.colorSpace = THREE.SRGBColorSpace;
  return cachedBrakeRotorMap;
}

let cachedCarShadowTex: THREE.CanvasTexture | null = null;

/**
 * Soft rectangular under-car ambient occlusion shadow decal
 */
export function getCarContactShadowTexture(): THREE.CanvasTexture {
  if (cachedCarShadowTex) return cachedCarShadowTex;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.scale(0.62, 1.0);

  const grad = ctx.createRadialGradient(0, 0, 35, 0, 0, 235);
  grad.addColorStop(0.0, 'rgba(0, 0, 0, 0.94)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.76)');
  grad.addColorStop(0.82, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 240, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  cachedCarShadowTex = new THREE.CanvasTexture(canvas);
  return cachedCarShadowTex;
}

let cachedGrilleTex: THREE.CanvasTexture | null = null;

/**
 * Honeycomb sport intake mesh texture
 */
export function getHoneycombGrilleTexture(): THREE.CanvasTexture {
  if (cachedGrilleTex) return cachedGrilleTex;

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#07090d';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#2d3544';
  ctx.lineWidth = 2.5;
  const step = 16;
  for (let y = 0; y < 128; y += step) {
    for (let x = 0; x < 128; x += step) {
      ctx.strokeRect(x + 2, y + 2, step - 4, step - 4);
    }
  }

  cachedGrilleTex = new THREE.CanvasTexture(canvas);
  cachedGrilleTex.wrapS = THREE.RepeatWrapping;
  cachedGrilleTex.wrapT = THREE.RepeatWrapping;
  cachedGrilleTex.repeat.set(8, 3);
  return cachedGrilleTex;
}
