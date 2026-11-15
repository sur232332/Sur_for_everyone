import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CarBodyStyle, LuxuryCarSpec } from '../data/luxuryCarsData';
import {
  createProAsphaltMaps,
  createProGrassMaps,
  getBrakeRotorTexture,
  getCarbonFiberTextures,
  getCarContactShadowTexture,
  getHoneycombGrilleTexture,
  getMetallicFlakeNormalMap,
  getOrangePeelClearcoatNormalMap,
  getTireSidewallTexture,
} from './carMaterialsAndTextures';

export interface CarRig3D {
  carId: string;
  root: THREE.Group;
  bodyShellGroup: THREE.Group;
  leftDoorPivot: THREE.Group;
  rightDoorPivot: THREE.Group;
  trunkPivot: THREE.Group;
  frunkPivot: THREE.Group;
  isSideHingedTrunk?: boolean;
  doorType: 'standard' | 'scissor' | 'butterfly';
  paintMaterials: THREE.MeshPhysicalMaterial[];
  headlightMeshes: THREE.Mesh[];
  taillightMeshes: THREE.Mesh[];
  headlightBeamLeft: THREE.SpotLight;
  headlightBeamRight: THREE.SpotLight;
  wheels: THREE.Group[];
  customModelGroup: THREE.Group;
}

/**
 * Builds the photorealistic parking lot environment matching the Kalbera video:
 * - Wet-look slate-blue asphalt with micro-stone normal & roughness maps
 * - Crisp painted white parking bay lines
 * - Chamfered concrete curbs and wheel stops
 * - Lush lawn surround with mulch beds and multi-layered leafy trees illuminated by warm streetlamps
 */
export function buildParkingLotEnvironment(scene: THREE.Scene): void {
  const envGroup = new THREE.Group();
  envGroup.name = 'ParkingLotEnvironment';

  // 1. Lush Lawn Grass Ground Plane with Normal Map
  const { map: grassMap, normalMap: grassNormal } = createProGrassMaps();
  const grassGeo = new THREE.PlaneGeometry(88, 68);
  const grassMat = new THREE.MeshStandardMaterial({
    map: grassMap,
    normalMap: grassNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.86,
    metalness: 0.02,
  });
  const grassMesh = new THREE.Mesh(grassGeo, grassMat);
  grassMesh.rotation.x = -Math.PI / 2;
  grassMesh.position.y = -0.05;
  grassMesh.receiveShadow = true;
  envGroup.add(grassMesh);

  // 2. Pro Asphalt Lot Surface with Normal & Roughness Maps
  const {
    map: asphaltMap,
    normalMap: asphaltNormal,
    roughnessMap: asphaltRoughness,
  } = createProAsphaltMaps();

  const lotWidth = 28;
  const lotDepth = 16.6;
  const lotGeo = new THREE.PlaneGeometry(lotWidth, lotDepth);
  const lotMat = new THREE.MeshStandardMaterial({
    map: asphaltMap,
    normalMap: asphaltNormal,
    normalScale: new THREE.Vector2(0.28, 0.28),
    roughnessMap: asphaltRoughness,
    roughness: 0.48,
    metalness: 0.18,
    envMapIntensity: 0.9,
  });
  const lotMesh = new THREE.Mesh(lotGeo, lotMat);
  lotMesh.rotation.x = -Math.PI / 2;
  lotMesh.position.y = 0;
  lotMesh.receiveShadow = true;
  envGroup.add(lotMesh);

  // 3. Beveled Concrete Curbs around the asphalt perimeter
  const curbMat = new THREE.MeshStandardMaterial({
    color: '#94a3b8',
    roughness: 0.68,
    metalness: 0.06,
  });

  const topCurb = new THREE.Mesh(
    new RoundedBoxGeometry(lotWidth + 0.6, 0.22, 0.38, 3, 0.04),
    curbMat
  );
  topCurb.position.set(0, 0.07, -lotDepth / 2 - 0.18);
  topCurb.castShadow = true;
  topCurb.receiveShadow = true;
  envGroup.add(topCurb);

  const botCurb = new THREE.Mesh(
    new RoundedBoxGeometry(lotWidth + 0.6, 0.22, 0.38, 3, 0.04),
    curbMat
  );
  botCurb.position.set(0, 0.07, lotDepth / 2 + 0.18);
  botCurb.castShadow = true;
  botCurb.receiveShadow = true;
  envGroup.add(botCurb);

  // Concrete wheel bumpers in each parking bay
  const stopperMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.62,
  });
  for (const bx of [-7.2, 0, 7.2]) {
    const topStopper = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 0.11, 0.22, 2, 0.03),
      stopperMat
    );
    topStopper.position.set(bx, 0.055, -7.15);
    topStopper.castShadow = true;
    topStopper.receiveShadow = true;
    envGroup.add(topStopper);

    const botStopper = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 0.11, 0.22, 2, 0.03),
      stopperMat
    );
    botStopper.position.set(bx, 0.055, 7.15);
    botStopper.castShadow = true;
    botStopper.receiveShadow = true;
    envGroup.add(botStopper);
  }

  // 4. Realistic Organic Trees with Mulch Rings & Bushes (matching video's lush perimeter)
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#3e2c1e', roughness: 0.92 });
  const mulchMat = new THREE.MeshStandardMaterial({ color: '#1c1510', roughness: 0.96 });
  const foliageRichMat = new THREE.MeshStandardMaterial({
    color: '#2e5318',
    roughness: 0.78,
  });
  const foliageWarmMat = new THREE.MeshStandardMaterial({
    color: '#49731e',
    roughness: 0.74,
  });

  const treePositions: Array<[number, number, number]> = [
    [-11.2, -9.8, 1.15],
    [-4.6, -10.1, 1.3],
    [4.6, -10.0, 1.25],
    [11.2, -9.8, 1.1],
    [-11.4, 9.8, 1.25],
    [-4.4, 10.1, 1.1],
    [4.4, 10.1, 1.2],
    [11.4, 9.9, 1.3],
  ];

  for (const [tx, tz, scale] of treePositions) {
    const tree = new THREE.Group();
    tree.position.set(tx, 0, tz);

    // Dark soil mulch ring at base of tree
    const mulch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85 * scale, 0.95 * scale, 0.06, 20),
      mulchMat
    );
    mulch.position.y = -0.02;
    tree.add(mulch);

    // Tapered trunk + branches
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11 * scale, 0.21 * scale, 1.85 * scale, 10),
      trunkMat
    );
    trunk.position.y = 0.9 * scale;
    trunk.castShadow = true;
    tree.add(trunk);

    // Clustered leafy canopy spheres
    const puffs = [
      [0, 2.25, 0, 1.22],
      [0.62, 1.92, 0.42, 0.92],
      [-0.58, 1.95, -0.38, 0.9],
      [-0.45, 2.1, 0.52, 0.84],
      [0.45, 2.15, -0.48, 0.86],
      [0, 2.75, 0, 0.88],
    ];
    puffs.forEach(([ox, oy, oz, r], idx) => {
      const puffGeo = new THREE.IcosahedronGeometry(r * scale, 2);
      const puff = new THREE.Mesh(
        puffGeo,
        idx % 2 === 0 ? foliageRichMat : foliageWarmMat
      );
      puff.position.set(ox * scale, oy * scale, oz * scale);
      puff.scale.set(1.08, 0.86, 1.05);
      puff.castShadow = true;
      puff.receiveShadow = true;
      tree.add(puff);
    });

    envGroup.add(tree);
  }

  // Ornamental shrubs along curb edge
  const shrubCoords = [
    [-8.4, -9.0],
    [-1.8, -8.95],
    [1.8, -8.95],
    [8.4, -9.0],
    [-8.4, 9.0],
    [-1.8, 8.95],
    [1.8, 8.95],
    [8.4, 9.0],
  ];
  for (const [sx, sz] of shrubCoords) {
    const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 2), foliageWarmMat);
    shrub.position.set(sx, 0.24, sz);
    shrub.scale.set(1.35, 0.72, 1.15);
    shrub.castShadow = true;
    envGroup.add(shrub);
  }

  // 5. Architectural Streetlamp Poles with Warm Glow Heads
  const poleMat = new THREE.MeshStandardMaterial({
    color: '#181c24',
    metalness: 0.85,
    roughness: 0.22,
  });
  const emitterMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });

  for (const bx of [-7.2, 0, 7.2]) {
    for (const side of [-1, 1]) {
      const poleZ = side * 8.85;
      const poleGroup = new THREE.Group();
      poleGroup.position.set(bx, 0, poleZ);

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.45, 12), poleMat);
      base.position.y = 0.22;
      poleGroup.add(base);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 5.8, 12), poleMat);
      shaft.position.y = 2.9;
      poleGroup.add(shaft);

      const arm = new THREE.Mesh(
        new RoundedBoxGeometry(0.1, 0.1, 1.75, 2, 0.02),
        poleMat
      );
      arm.position.set(0, 5.75, -side * 0.8);
      poleGroup.add(arm);

      const head = new THREE.Mesh(
        new RoundedBoxGeometry(0.48, 0.09, 0.32, 2, 0.02),
        poleMat
      );
      head.position.set(0, 5.72, -side * 1.55);
      poleGroup.add(head);

      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.24), emitterMat);
      lens.rotation.x = Math.PI / 2;
      lens.position.set(0, 5.67, -side * 1.55);
      poleGroup.add(lens);

      envGroup.add(poleGroup);
    }
  }

  scene.add(envGroup);
}

/**
 * Builds a forged 10-spoke Y-spoke concave luxury wheel with Michelin tire tread,
 * cross-drilled carbon-ceramic brake disc, and painted 6-piston Brembo caliper.
 */
function buildForgedWheelAssembly(
  radius: number,
  width: number,
  caliperHex: string,
  rimFinishHex: string,
  isRightSide: boolean
): THREE.Group {
  const wheelGroup = new THREE.Group();

  // 1. Contoured Tire with beveled sidewall & Michelin sidewall lettering
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#12151a',
    roughness: 0.72,
    metalness: 0.1,
  });
  const sidewallMat = new THREE.MeshStandardMaterial({
    map: getTireSidewallTexture(),
    roughness: 0.68,
    metalness: 0.12,
  });
  const tireOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width * 0.92, 36),
    [tireMat, sidewallMat, sidewallMat]
  );
  tireOuter.rotation.z = Math.PI / 2;
  tireOuter.castShadow = true;
  wheelGroup.add(tireOuter);

  // Rounded tire shoulders (torus rings on both sidewalls for realistic curved tire profile)
  const shoulderRadius = radius * 0.88;
  const tubeRadius = radius * 0.125;
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.TorusGeometry(shoulderRadius, tubeRadius, 14, 36),
      tireMat
    );
    shoulder.rotation.y = Math.PI / 2;
    shoulder.position.x = side * (width * 0.36);
    wheelGroup.add(shoulder);
  }

  // 2. Alloy Rim Barrel & Lip
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: rimFinishHex,
    metalness: 0.9,
    roughness: 0.16,
    clearcoat: 0.8,
  });
  const machinedLipMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.12,
  });

  const rimRadius = radius * 0.77;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(rimRadius, rimRadius, width * 0.94, 32, 1, true),
    rimMat
  );
  barrel.rotation.z = Math.PI / 2;
  wheelGroup.add(barrel);

  // Outer machined flange ring
  const outerX = (isRightSide ? -1 : 1) * (width * 0.44);
  const lipRing = new THREE.Mesh(
    new THREE.TorusGeometry(rimRadius, 0.018, 12, 36),
    machinedLipMat
  );
  lipRing.rotation.y = Math.PI / 2;
  lipRing.position.x = outerX;
  wheelGroup.add(lipRing);

  // 3. 10-Spoke Y-Spoke Concave Star Pattern
  const spokeGroup = new THREE.Group();
  spokeGroup.position.x = outerX * 0.82;
  const numYSpokes = 5;
  for (let i = 0; i < numYSpokes; i++) {
    const angle = (i / numYSpokes) * Math.PI * 2;
    const yBranch = new THREE.Group();
    yBranch.rotation.x = angle;

    // Left & Right forks of each Y-spoke
    for (const forkAngle of [-0.19, 0.19]) {
      const strut = new THREE.Mesh(
        new THREE.BoxGeometry(0.028, rimRadius * 0.92, 0.026),
        rimMat
      );
      strut.position.y = rimRadius * 0.46;
      strut.rotation.x = forkAngle;
      strut.rotation.z = (isRightSide ? 1 : -1) * 0.12; // Concave dish angle!
      yBranch.add(strut);
    }
    spokeGroup.add(yBranch);
  }
  wheelGroup.add(spokeGroup);

  // Center Hub & Center-Lock Cap
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.19, radius * 0.22, 0.08, 20),
    rimMat
  );
  hub.rotation.z = Math.PI / 2;
  hub.position.x = outerX * 0.72;
  wheelGroup.add(hub);

  const centerCap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.09, radius * 0.09, 0.09, 16),
    new THREE.MeshStandardMaterial({
      color: caliperHex,
      metalness: 0.75,
      roughness: 0.2,
    })
  );
  centerCap.rotation.z = Math.PI / 2;
  centerCap.position.x = outerX * 0.76;
  wheelGroup.add(centerCap);

  // 4. Cross-Drilled Carbon-Ceramic Brake Rotor & 6-Piston Caliper
  const rotorTex = getBrakeRotorTexture();
  const rotorMat = new THREE.MeshStandardMaterial({
    map: rotorTex,
    metalness: 0.72,
    roughness: 0.32,
  });
  const rotor = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.035, 28),
    rotorMat
  );
  rotor.rotation.z = Math.PI / 2;
  rotor.position.x = outerX * 0.42;
  wheelGroup.add(rotor);

  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: caliperHex,
    metalness: 0.35,
    roughness: 0.2,
    clearcoat: 1.0,
  });
  const caliper = new THREE.Mesh(
    new RoundedBoxGeometry(0.09, radius * 0.52, radius * 0.26, 3, 0.02),
    caliperMat
  );
  caliper.position.set(outerX * 0.45, radius * 0.14, -radius * 0.38);
  caliper.rotation.x = 0.35;
  wheelGroup.add(caliper);

  return wheelGroup;
}

/**
 * Creates a smooth extruded side-profile geometry for the car's central fuselage
 * with real curved wheel-arch cutouts so wheels sit naturally inside the body.
 */
function createSculptedProfileGeometry(
  style: CarBodyStyle,
  width: number,
  wheelbaseHalf: number,
  archRadius: number
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();

  // Z goes from rear (-L/2) to front (+L/2); Y is height above ride base
  const rearZ = -2.22;
  const frontZ = 2.24;
  const rearArchZ = -wheelbaseHalf;
  const frontArchZ = wheelbaseHalf;

  // Start at rear bottom behind rear wheel arch
  shape.moveTo(rearZ, 0.14);
  shape.lineTo(rearArchZ - archRadius, 0.06);

  // Rear wheel arch cutout (semicircle)
  shape.absarc(rearArchZ, 0.06, archRadius, Math.PI, 0, true);

  // Lower rocker panel between wheels
  shape.lineTo(frontArchZ - archRadius, 0.04);

  // Front wheel arch cutout (semicircle)
  shape.absarc(frontArchZ, 0.06, archRadius, Math.PI, 0, true);

  // Front overhang lower chin
  shape.lineTo(frontZ - 0.08, 0.06);

  if (style === 'gwagon') {
    // Iconic upright boxy G-Wagon profile with rounded edges
    shape.quadraticCurveTo(frontZ + 0.04, 0.28, frontZ - 0.02, 0.68); // Vertical front grille
    shape.quadraticCurveTo(frontZ - 0.08, 0.74, 0.98, 0.76); // Flat muscular hood
    shape.lineTo(0.62, 1.46); // Steep iconic G-Class windshield
    shape.lineTo(-2.06, 1.46); // Flat expedition roofline
    shape.lineTo(-2.18, 0.72); // Vertical rear door
    shape.quadraticCurveTo(rearZ - 0.04, 0.42, rearZ, 0.14);
  } else if (style === 'urus') {
    // Aggressive Super-SUV Coupe profile (Lamborghini Urus)
    shape.quadraticCurveTo(frontZ + 0.08, 0.32, frontZ - 0.12, 0.58); // Shark-nose front fascia
    shape.bezierCurveTo(1.75, 0.72, 1.25, 0.78, 0.85, 0.82); // Powerdome hood
    shape.bezierCurveTo(0.45, 1.18, 0.05, 1.32, -0.35, 1.3); // Raked windshield to coupe peak
    shape.bezierCurveTo(-1.05, 1.26, -1.68, 1.08, -2.12, 0.82); // Fastback roofline
    shape.quadraticCurveTo(rearZ - 0.06, 0.52, rearZ, 0.14);
  } else if (style === 'f8') {
    // Low-slung Mid-Engine Wedge Supercar (Ferrari F8 Tributo)
    shape.quadraticCurveTo(frontZ + 0.12, 0.18, frontZ - 0.18, 0.38); // Razor-sharp front nose
    shape.bezierCurveTo(1.65, 0.5, 1.18, 0.56, 0.88, 0.58); // S-Duct front hood
    shape.bezierCurveTo(0.42, 0.88, 0.05, 0.98, -0.28, 0.96); // Low teardrop canopy
    shape.bezierCurveTo(-0.85, 0.92, -1.48, 0.74, -2.08, 0.58); // Lexan engine decklid
    shape.quadraticCurveTo(rearZ - 0.08, 0.38, rearZ, 0.14);
  } else if (style === 'continental') {
    // Aristocratic Grand Tourer Coupe (Bentley Continental GT)
    shape.quadraticCurveTo(frontZ + 0.06, 0.28, frontZ - 0.06, 0.54); // Upright matrix grille nose
    shape.bezierCurveTo(1.68, 0.64, 1.12, 0.68, 0.72, 0.7); // Long W12 bonnet
    shape.bezierCurveTo(0.28, 1.02, -0.15, 1.08, -0.55, 1.05); // Sweeping GT roof
    shape.bezierCurveTo(-1.15, 0.98, -1.65, 0.76, -2.14, 0.62); // Muscular fastback tail
    shape.quadraticCurveTo(rearZ - 0.06, 0.36, rearZ, 0.14);
  } else {
    // Iconic Porsche 911 GT3 / 911 Turbo S Flyline Silhouette!
    shape.quadraticCurveTo(frontZ + 0.08, 0.22, frontZ - 0.14, 0.44); // Rounded 911 front bumper
    shape.bezierCurveTo(1.65, 0.54, 1.18, 0.58, 0.78, 0.61); // Sloping 911 frunk hood
    shape.bezierCurveTo(0.35, 0.94, -0.05, 1.04, -0.42, 1.01); // Classic 911 curved roof peak
    shape.bezierCurveTo(-0.98, 0.94, -1.55, 0.72, -2.08, 0.56); // Iconic 911 sloping rear flyline
    shape.quadraticCurveTo(rearZ - 0.08, 0.36, rearZ, 0.14);
  }

  const extrudeSettings: THREE.ExtrudeGeometryOptions = {
    steps: 2,
    depth: width,
    bevelEnabled: true,
    bevelThickness: style === 'gwagon' ? 0.07 : 0.14,
    bevelSize: style === 'gwagon' ? 0.06 : 0.12,
    bevelOffset: 0,
    bevelSegments: 8,
    curveSegments: 28,
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  // Center extrusion along X (since ExtrudeGeometry extrudes along Z, we rotate Y by +PI/2 so shape X->Z, shape Y->Y, depth->X)
  geo.translate(0, 0, -width / 2);
  geo.rotateY(Math.PI / 2);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Builds a high-detail 3D luxury vehicle with sculpted bodywork, flared wheel arches,
 * carbon-fiber aero package, projector headlights, opening doors, and full cockpit.
 */
export function buildLuxuryCarRig(spec: LuxuryCarSpec): CarRig3D {
  const root = new THREE.Group();
  root.name = `CarRig_${spec.id}`;
  root.position.set(spec.parkingSlot.x, 0, spec.parkingSlot.z);
  root.rotation.y = spec.parkingSlot.rotationY;

  const bodyShellGroup = new THREE.Group();
  root.add(bodyShellGroup);

  const customModelGroup = new THREE.Group();
  customModelGroup.visible = false;
  root.add(customModelGroup);

  const paintMaterials: THREE.MeshPhysicalMaterial[] = [];
  const headlightMeshes: THREE.Mesh[] = [];
  const taillightMeshes: THREE.Mesh[] = [];
  const wheels: THREE.Group[] = [];

  const isGwagon = spec.bodyStyle === 'gwagon';
  const isUrus = spec.bodyStyle === 'urus';
  const isF8 = spec.bodyStyle === 'f8';
  const isGT3 = spec.bodyStyle === 'gt3';
  const isTurboS = spec.bodyStyle === 'turbos';
  const isContinental = spec.bodyStyle === 'continental';

  // 0. Soft Under-Car Ambient Occlusion Contact Shadow Decal on the Asphalt
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(2.65, 5.15),
    new THREE.MeshBasicMaterial({
      map: getCarContactShadowTexture(),
      transparent: true,
      depthWrite: false,
      opacity: 0.92,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.012;
  root.add(shadowPlane);

  // 1. Pro Automotive Metallic Flake + Clearcoat Orange-Peel Paint Material
  const flakeNormal = getMetallicFlakeNormalMap();
  const orangePeelNormal = getOrangePeelClearcoatNormalMap();
  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(spec.colorHex),
    metalness: isGwagon ? 0.32 : 0.56,
    roughness: isGwagon ? 0.36 : 0.11,
    normalMap: flakeNormal,
    normalScale: new THREE.Vector2(0.02, 0.02),
    clearcoat: isGwagon ? 0.35 : 1.0,
    clearcoatRoughness: isGwagon ? 0.28 : 0.035,
    clearcoatNormalMap: orangePeelNormal,
    clearcoatNormalScale: new THREE.Vector2(0.012, 0.012),
    reflectivity: 1.0,
    envMapIntensity: 2.1,
  });
  paintMaterials.push(bodyPaintMat);

  // 2x2 Twill Carbon Fiber Material
  const { map: carbonMap, normalMap: carbonNormal } = getCarbonFiberTextures();
  const carbonMat = new THREE.MeshPhysicalMaterial({
    map: carbonMap,
    normalMap: carbonNormal,
    normalScale: new THREE.Vector2(0.15, 0.15),
    roughness: 0.26,
    metalness: 0.35,
    clearcoat: 0.85,
    clearcoatRoughness: 0.08,
  });

  // Tinted Automotive Laminated Glass Material
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#080d18',
    metalness: 0.15,
    roughness: 0.04,
    transmission: 0.42,
    transparent: true,
    opacity: 0.88,
    clearcoat: 1.0,
    envMapIntensity: 2.2,
  });

  // Dark Chrome & Brushed Aluminum Trim
  const chromeMat = new THREE.MeshStandardMaterial({
    color: '#e2e8f0',
    metalness: 0.95,
    roughness: 0.12,
  });

  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: '#11141c',
    metalness: 0.6,
    roughness: 0.32,
  });

  const grilleMat = new THREE.MeshStandardMaterial({
    map: getHoneycombGrilleTexture(),
    roughness: 0.45,
    metalness: 0.5,
  });

  // Proportions per Vehicle Class
  const wheelRadius = isGwagon ? 0.45 : isUrus ? 0.44 : 0.37;
  const wheelWidth = isGwagon || isUrus ? 0.32 : 0.31;
  const trackHalfWidth = isGwagon ? 0.95 : isUrus ? 1.01 : 0.95;
  const wheelbaseHalf = isGwagon ? 1.44 : isUrus ? 1.48 : 1.36;
  const rideBaseY = isGwagon ? 0.32 : isUrus ? 0.26 : 0.16;

  // 2. Build 4 Forged Wheels with Michelin Tires & Carbon-Ceramic Brakes
  const rimFinish = isContinental
    ? '#cbd5e1'
    : isGT3 || isF8
      ? '#1e232d'
      : '#14171f';

  const wheelCoords: Array<[number, number, number, boolean]> = [
    [-trackHalfWidth, wheelRadius, wheelbaseHalf, true],
    [trackHalfWidth, wheelRadius, wheelbaseHalf, false],
    [-trackHalfWidth, wheelRadius, -wheelbaseHalf, true],
    [trackHalfWidth, wheelRadius, -wheelbaseHalf, false],
  ];

  for (const [wx, wy, wz, isRight] of wheelCoords) {
    const wheel = buildForgedWheelAssembly(
      wheelRadius,
      wheelWidth,
      spec.caliperColorHex,
      rimFinish,
      isRight
    );
    wheel.position.set(wx, wy, wz);
    root.add(wheel);
    wheels.push(wheel);
  }

  // 3. Sculpted Central Body Profile with Real Curved Wheel Arch Cutouts
  const coreWidth = isGwagon ? 1.72 : isUrus ? 1.68 : 1.58;
  const archCutoutRadius = wheelRadius + 0.065;
  const bodyGeo = createSculptedProfileGeometry(
    spec.bodyStyle,
    coreWidth,
    wheelbaseHalf,
    archCutoutRadius
  );
  const mainBodyMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
  mainBodyMesh.position.y = rideBaseY;
  mainBodyMesh.castShadow = true;
  mainBodyMesh.receiveShadow = true;
  bodyShellGroup.add(mainBodyMesh);

  // Dark inner wheel well liners so you never see through the wheel arches
  const wheelWellMat = new THREE.MeshBasicMaterial({ color: '#07090d' });
  for (const wz of [-wheelbaseHalf, wheelbaseHalf]) {
    const liner = new THREE.Mesh(
      new THREE.CylinderGeometry(archCutoutRadius * 0.96, archCutoutRadius * 0.96, coreWidth + 0.32, 24),
      wheelWellMat
    );
    liner.rotation.z = Math.PI / 2;
    liner.position.set(0, rideBaseY + 0.06, wz);
    bodyShellGroup.add(liner);
  }

  // 4. Sculpted Muscular Widebody Fender Flares / Haunches over all 4 Wheels
  const flarePositions: Array<[number, number, boolean]> = [
    [-coreWidth * 0.5 - 0.08, wheelbaseHalf, false],
    [coreWidth * 0.5 + 0.08, wheelbaseHalf, false],
    [-coreWidth * 0.5 - 0.11, -wheelbaseHalf, true],
    [coreWidth * 0.5 + 0.11, -wheelbaseHalf, true],
  ];

  for (const [fx, fz, isRear] of flarePositions) {
    const sideSign = Math.sign(fx);
    // Smooth flared wheel arch torus lip
    const archFlare = new THREE.Mesh(
      new THREE.TorusGeometry(
        archCutoutRadius + 0.01,
        isGwagon ? 0.095 : isRear ? 0.135 : 0.11,
        14,
        28,
        Math.PI
      ),
      bodyPaintMat
    );
    archFlare.rotation.y = Math.PI / 2;
    archFlare.position.set(fx, rideBaseY + 0.06, fz);
    archFlare.scale.set(1.08, 1.0, isGwagon ? 1.1 : 1.45);
    archFlare.castShadow = true;
    archFlare.receiveShadow = true;
    bodyShellGroup.add(archFlare);

    // Muscular shoulder haunch blending the arch into the body waist
    if (!isGwagon) {
      const haunchHeight = isUrus ? 0.42 : 0.34;
      const haunchLength = isRear ? 1.52 : 1.32;
      const haunch = new THREE.Mesh(
        new RoundedBoxGeometry(0.28, haunchHeight, haunchLength, 5, 0.11),
        bodyPaintMat
      );
      haunch.position.set(
        fx - sideSign * 0.04,
        rideBaseY + archCutoutRadius + 0.02,
        fz + (isRear ? -0.05 : 0.05)
      );
      haunch.rotation.z = -sideSign * 0.14;
      haunch.castShadow = true;
      haunch.receiveShadow = true;
      bodyShellGroup.add(haunch);
    }
  }

  // 5. Carbon Fiber Front Splitter, Side Skirts & Rear Diffuser with Quad Exhausts
  const totalWidth = coreWidth + 0.34;
  const splitter = new THREE.Mesh(
    new RoundedBoxGeometry(totalWidth, 0.045, 0.48, 3, 0.015),
    carbonMat
  );
  splitter.position.set(0, rideBaseY + 0.03, 2.08);
  splitter.castShadow = true;
  bodyShellGroup.add(splitter);

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.06, wheelbaseHalf * 1.15, 2, 0.02),
      carbonMat
    );
    skirt.position.set(side * (totalWidth * 0.48), rideBaseY + 0.04, 0);
    bodyShellGroup.add(skirt);
  }

  // Rear Diffuser + Vertical Aero Strakes + Exhaust Tailpipes
  const diffuser = new THREE.Mesh(
    new RoundedBoxGeometry(totalWidth * 0.92, 0.16, 0.32, 3, 0.03),
    carbonMat
  );
  diffuser.position.set(0, rideBaseY + 0.11, -2.14);
  bodyShellGroup.add(diffuser);

  for (const sx of [-0.45, -0.15, 0.15, 0.45]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.25), carbonMat);
    fin.position.set(sx, rideBaseY + 0.1, -2.18);
    bodyShellGroup.add(fin);
  }

  // Exhaust tips (Center twin pipes for GT3, Quad outboard pipes for others)
  const exhaustXs = isGT3 ? [-0.11, 0.11] : [-0.66, -0.52, 0.52, 0.66];
  for (const ex of exhaustXs) {
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.18, 20),
      chromeMat
    );
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(ex, rideBaseY + 0.13, -2.26);
    bodyShellGroup.add(pipe);

    const pipeInner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.19, 16),
      new THREE.MeshBasicMaterial({ color: '#090b10' })
    );
    pipeInner.rotation.x = Math.PI / 2;
    pipeInner.position.set(ex, rideBaseY + 0.13, -2.26);
    bodyShellGroup.add(pipeInner);
  }

  // 6. Flush Curved Windshield, Side Glass & Rear Glass Window
  if (isGwagon) {
    // G-Wagon Flat Framed Glass Windows
    const ws = new THREE.Mesh(new RoundedBoxGeometry(1.56, 0.58, 0.04, 2, 0.01), glassMat);
    ws.position.set(0, rideBaseY + 1.11, 0.81);
    ws.rotation.x = -0.46;
    bodyShellGroup.add(ws);

    const rearWin = new THREE.Mesh(new RoundedBoxGeometry(1.48, 0.54, 0.04, 2, 0.01), glassMat);
    rearWin.position.set(0, rideBaseY + 1.12, -2.13);
    rearWin.rotation.x = 0.16;
    bodyShellGroup.add(rearWin);

    // Side cargo windows
    const sideWin = new THREE.Mesh(
      new RoundedBoxGeometry(1.78, 0.48, 1.85, 2, 0.02),
      glassMat
    );
    sideWin.position.set(0, rideBaseY + 1.13, -0.95);
    bodyShellGroup.add(sideWin);

    // Panamericana Vertical Chrome Bar Grille + Bullbar
    const grilleBox = new THREE.Mesh(
      new RoundedBoxGeometry(1.18, 0.36, 0.08, 2, 0.02),
      grilleMat
    );
    grilleBox.position.set(0, rideBaseY + 0.48, 2.24);
    bodyShellGroup.add(grilleBox);

    for (let gx = -0.5; gx <= 0.5; gx += 0.1) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.32, 0.09), chromeMat);
      slat.position.set(gx, rideBaseY + 0.48, 2.245);
      bodyShellGroup.add(slat);
    }

    // Rear-mounted G63 Spare Tire Cover with Chrome Band
    const spareGroup = new THREE.Group();
    spareGroup.position.set(0.16, rideBaseY + 0.62, -2.28);
    const spareFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.41, 0.24, 32),
      bodyPaintMat
    );
    spareFace.rotation.x = Math.PI / 2;
    spareFace.castShadow = true;
    spareGroup.add(spareFace);

    const spareChrome = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.022, 14, 36),
      chromeMat
    );
    spareGroup.add(spareChrome);
    bodyShellGroup.add(spareGroup);
  } else {
    // Sleek Flush Curved Windshield & Rear Glass for GT3 / F8 / Urus / Turbo S / Continental
    const windshieldY = isUrus ? rideBaseY + 1.04 : rideBaseY + 0.79;
    const windshieldZ = isUrus ? 0.56 : 0.45;
    const windshield = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.88, 0.05, 0.92, 4, 0.02),
      glassMat
    );
    windshield.position.set(0, windshieldY, windshieldZ);
    windshield.rotation.x = isUrus ? 0.56 : 0.48;
    bodyShellGroup.add(windshield);

    // Side Greenhouse Glass Dome
    const greenhouse = new THREE.Mesh(
      new RoundedBoxGeometry(
        coreWidth * 0.94,
        isUrus ? 0.42 : 0.34,
        isUrus ? 1.85 : 1.48,
        5,
        0.12
      ),
      glassMat
    );
    greenhouse.position.set(0, isUrus ? rideBaseY + 1.02 : rideBaseY + 0.78, -0.35);
    bodyShellGroup.add(greenhouse);

    // Rear Window / Ferrari F8 Slotted Lexan V8 Engine Cover
    const rearGlass = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.82, 0.05, 0.96, 4, 0.02),
      glassMat
    );
    rearGlass.position.set(0, isUrus ? rideBaseY + 1.02 : rideBaseY + 0.76, -1.28);
    rearGlass.rotation.x = isUrus ? -0.42 : -0.36;
    bodyShellGroup.add(rearGlass);

    // Front Honeycomb Air Intakes
    const frontGrille = new THREE.Mesh(
      new RoundedBoxGeometry(totalWidth * 0.84, isUrus ? 0.32 : 0.2, 0.1, 3, 0.03),
      grilleMat
    );
    frontGrille.position.set(0, rideBaseY + (isUrus ? 0.24 : 0.16), 2.21);
    bodyShellGroup.add(frontGrille);

    // High Swan-Neck GT3 Carbon Rear Wing (Porsche 911 GT3 & Turbo S)
    if (isGT3 || isTurboS) {
      const wingHeight = isGT3 ? 0.46 : 0.22;
      const wingGroup = new THREE.Group();
      wingGroup.position.set(0, rideBaseY + 0.62 + wingHeight, -2.02);

      // CNC Aluminum Swan-Neck Uprights
      for (const sx of [-0.38, 0.38]) {
        const upright = new THREE.Mesh(
          new RoundedBoxGeometry(0.035, wingHeight, 0.22, 2, 0.01),
          darkTrimMat
        );
        upright.position.set(sx, -wingHeight * 0.48, 0);
        upright.rotation.x = -0.18;
        wingGroup.add(upright);
      }

      // Contoured Carbon Airfoil Wing Blade
      const blade = new THREE.Mesh(
        new RoundedBoxGeometry(1.84, 0.045, 0.34, 4, 0.018),
        carbonMat
      );
      blade.rotation.x = 0.14;
      blade.castShadow = true;
      wingGroup.add(blade);

      // Painted Wing Endplates
      for (const ex of [-0.93, 0.93]) {
        const endplate = new THREE.Mesh(
          new RoundedBoxGeometry(0.035, 0.22, 0.42, 3, 0.012),
          bodyPaintMat
        );
        endplate.position.set(ex, 0.01, 0);
        wingGroup.add(endplate);
      }

      bodyShellGroup.add(wingGroup);
    }
  }

  // 7. Detailed Interior Cockpit (Visible through windshield & when doors swing open!)
  const interiorGroup = new THREE.Group();
  interiorGroup.position.set(0, rideBaseY + 0.12, 0);

  const leatherMat = new THREE.MeshStandardMaterial({
    color: '#161922',
    roughness: 0.55,
    metalness: 0.08,
  });
  const stitchMat = new THREE.MeshStandardMaterial({
    color: spec.caliperColorHex,
    roughness: 0.4,
  });

  for (const side of [-0.42, 0.42]) {
    const seat = new THREE.Group();
    seat.position.set(side, 0.08, -0.15);

    const baseCushion = new THREE.Mesh(
      new RoundedBoxGeometry(0.48, 0.12, 0.52, 3, 0.03),
      leatherMat
    );
    seat.add(baseCushion);

    const backrest = new THREE.Mesh(
      new RoundedBoxGeometry(0.46, 0.62, 0.12, 3, 0.03),
      leatherMat
    );
    backrest.position.set(0, 0.34, -0.2);
    backrest.rotation.x = -0.2;
    seat.add(backrest);

    const accentStripe = new THREE.Mesh(
      new RoundedBoxGeometry(0.12, 0.48, 0.13, 2, 0.01),
      stitchMat
    );
    accentStripe.position.set(0, 0.36, -0.2);
    accentStripe.rotation.x = -0.2;
    seat.add(accentStripe);

    interiorGroup.add(seat);
  }

  const dashY = isGwagon ? 0.54 : isUrus ? 0.48 : 0.38;
  const dash = new THREE.Mesh(
    new RoundedBoxGeometry(coreWidth * 0.88, 0.24, 0.44, 3, 0.04),
    leatherMat
  );
  dash.position.set(0, dashY, 0.58);
  interiorGroup.add(dash);

  const steeringWheel = new THREE.Mesh(
    new THREE.TorusGeometry(0.15, 0.024, 12, 28),
    leatherMat
  );
  steeringWheel.position.set(0.42, dashY + 0.04, 0.32);
  steeringWheel.rotation.x = 0.32;
  interiorGroup.add(steeringWheel);

  bodyShellGroup.add(interiorGroup);

  // 8. Sculpted Flush-Fitting Opening Doors with Side Mirrors & Handles
  const doorHeight = isGwagon ? 0.58 : isUrus ? 0.48 : 0.38;
  const doorLength = 1.18;
  const doorY = rideBaseY + doorHeight * 0.5 + 0.14;
  const doorX = coreWidth * 0.5 + 0.05;

  const buildDoorAssembly = (sideSign: 1 | -1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * doorX, doorY, 0.52);

    // Contoured painted outer door skin
    const doorPanel = new THREE.Mesh(
      new RoundedBoxGeometry(0.11, doorHeight, doorLength, 4, 0.035),
      bodyPaintMat
    );
    doorPanel.position.set(0, 0, -doorLength * 0.5);
    doorPanel.castShadow = true;
    doorPanel.receiveShadow = true;
    pivot.add(doorPanel);

    // Frameless tinted side window glass on the door
    const doorGlass = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, doorHeight * 0.65, doorLength * 0.82, 2, 0.01),
      glassMat
    );
    doorGlass.position.set(-sideSign * 0.04, doorHeight * 0.68, -doorLength * 0.52);
    doorGlass.rotation.z = sideSign * (isGwagon ? 0.05 : 0.28);
    pivot.add(doorGlass);

    // Aerodynamic wing mirror on stalk
    const mirrorStalk = new THREE.Mesh(
      new RoundedBoxGeometry(0.14, 0.04, 0.06, 2, 0.01),
      carbonMat
    );
    mirrorStalk.position.set(sideSign * 0.08, doorHeight * 0.42, -0.18);
    pivot.add(mirrorStalk);

    const mirrorCap = new THREE.Mesh(
      new RoundedBoxGeometry(0.18, 0.1, 0.14, 4, 0.035),
      bodyPaintMat
    );
    mirrorCap.position.set(sideSign * 0.15, doorHeight * 0.46, -0.2);
    mirrorCap.castShadow = true;
    pivot.add(mirrorCap);

    // Flush door handle
    const handle = new THREE.Mesh(
      new RoundedBoxGeometry(0.03, 0.035, 0.18, 2, 0.01),
      chromeMat
    );
    handle.position.set(sideSign * 0.055, doorHeight * 0.18, -doorLength * 0.78);
    pivot.add(handle);

    return pivot;
  };

  const leftDoorPivot = buildDoorAssembly(1);
  const rightDoorPivot = buildDoorAssembly(-1);
  bodyShellGroup.add(leftDoorPivot);
  bodyShellGroup.add(rightDoorPivot);

  // 8B. Opening Rear Trunk / Decklid (ԲԱԳԱԺՆԻԿ) & Front Frunk / Hood (ԿԱՊՈՏ) + Interior Bays
  const trunkPivot = new THREE.Group();
  const frunkPivot = new THREE.Group();

  // Detailed 3D Engine Block & Luggage Bay visible when Trunk/Frunk is opened
  const bayRecessMat = new THREE.MeshStandardMaterial({
    color: '#080a0f',
    roughness: 0.75,
    metalness: 0.2,
  });
  const manifoldMat = new THREE.MeshStandardMaterial({
    color: isF8 ? '#dc2626' : spec.caliperColorHex,
    roughness: 0.28,
    metalness: 0.65,
  });
  const luggageBagMat = new THREE.MeshStandardMaterial({
    color: '#78350f',
    roughness: 0.55,
    metalness: 0.1,
  });

  if (isGwagon) {
    // G-Wagon: Side-hinged rear cargo door (hinged on left side of rear, swings open sideways!)
    trunkPivot.position.set(0.84, rideBaseY + 0.76, -2.18);

    const rearCargoDoor = new THREE.Mesh(
      new RoundedBoxGeometry(1.66, 0.96, 0.11, 3, 0.03),
      bodyPaintMat
    );
    rearCargoDoor.position.set(-0.84, 0, -0.02);
    rearCargoDoor.castShadow = true;
    trunkPivot.add(rearCargoDoor);

    const doorSpareGroup = new THREE.Group();
    doorSpareGroup.position.set(-0.68, -0.1, -0.14);
    const doorSpareFace = new THREE.Mesh(
      new THREE.CylinderGeometry(0.41, 0.41, 0.24, 32),
      bodyPaintMat
    );
    doorSpareFace.rotation.x = Math.PI / 2;
    doorSpareGroup.add(doorSpareFace);
    const doorSpareChrome = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.022, 14, 36),
      chromeMat
    );
    doorSpareGroup.add(doorSpareChrome);
    trunkPivot.add(doorSpareGroup);

    // G-Wagon Rear Cargo Trunk Interior + Bespoke Leather Luggage Bags
    const cargoWell = new THREE.Mesh(
      new RoundedBoxGeometry(1.48, 0.68, 0.85, 2, 0.02),
      bayRecessMat
    );
    cargoWell.position.set(0, rideBaseY + 0.56, -1.72);
    bodyShellGroup.add(cargoWell);

    const weekenderBag = new THREE.Mesh(
      new RoundedBoxGeometry(0.62, 0.28, 0.36, 3, 0.04),
      luggageBagMat
    );
    weekenderBag.position.set(-0.22, rideBaseY + 0.38, -1.75);
    bodyShellGroup.add(weekenderBag);

    // G-Wagon Front Hood (pivots up from windshield base)
    frunkPivot.position.set(0, rideBaseY + 0.77, 0.92);
    const gwagonHood = new THREE.Mesh(
      new RoundedBoxGeometry(1.62, 0.08, 1.24, 4, 0.03),
      bodyPaintMat
    );
    gwagonHood.position.set(0, 0.01, 0.62);
    gwagonHood.castShadow = true;
    frunkPivot.add(gwagonHood);
  } else {
    // Rear Trunk / Engine Decklid Pivot (hinged near rear window, lifts up when opened!)
    const rearHingeY = isUrus ? rideBaseY + 0.96 : rideBaseY + 0.68;
    const rearHingeZ = isUrus ? -1.05 : -1.08;
    trunkPivot.position.set(0, rearHingeY, rearHingeZ);

    const rearLidLength = isUrus ? 1.12 : 1.04;
    const rearLid = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.86, 0.07, rearLidLength, 4, 0.025),
      isF8 ? glassMat : bodyPaintMat
    );
    rearLid.position.set(0, -0.06, -rearLidLength * 0.5);
    rearLid.rotation.x = isUrus ? -0.24 : -0.18;
    rearLid.castShadow = true;
    trunkPivot.add(rearLid);

    // Rear Compartment underneath (Twin-Turbo V8/Flat-6 Engine for 911/F8, or Luxury Boot for Urus/Continental)
    const rearBay = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.78, 0.22, 0.88, 2, 0.02),
      bayRecessMat
    );
    rearBay.position.set(0, rideBaseY + 0.44, -1.55);
    bodyShellGroup.add(rearBay);

    if (isGT3 || isTurboS || isF8) {
      // Twin Intake Plenums + Carbon Strut Bar in Rear Engine Bay
      for (const ex of [-0.24, 0.24]) {
        const plenum = new THREE.Mesh(
          new RoundedBoxGeometry(0.22, 0.14, 0.56, 3, 0.03),
          manifoldMat
        );
        plenum.position.set(ex, rideBaseY + 0.54, -1.52);
        bodyShellGroup.add(plenum);
      }
      const strutBrace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, coreWidth * 0.72, 12),
        carbonMat
      );
      strutBrace.rotation.z = Math.PI / 2;
      strutBrace.position.set(0, rideBaseY + 0.62, -1.52);
      bodyShellGroup.add(strutBrace);
    } else {
      // Tailored Leather Luggage Set in Rear Trunk for Urus & Continental GT
      for (const bx of [-0.28, 0.26]) {
        const suitcase = new THREE.Mesh(
          new RoundedBoxGeometry(0.44, 0.22, 0.36, 3, 0.04),
          luggageBagMat
        );
        suitcase.position.set(bx, rideBaseY + 0.54, -1.56);
        bodyShellGroup.add(suitcase);
      }
    }

    // Front Hood / Frunk Lid Pivot (hinged near base of windshield, lifts open!)
    const frontHingeY = isUrus ? rideBaseY + 0.82 : rideBaseY + 0.61;
    const frontHingeZ = 0.82;
    frunkPivot.position.set(0, frontHingeY, frontHingeZ);

    const hoodLength = 1.24;
    const frontHood = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.86, 0.065, hoodLength, 4, 0.025),
      bodyPaintMat
    );
    frontHood.position.set(0, -0.07, hoodLength * 0.5);
    frontHood.rotation.x = 0.14;
    frontHood.castShadow = true;
    frunkPivot.add(frontHood);

    // Front Frunk / Engine Compartment underneath
    const frontBay = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.74, 0.22, 0.86, 2, 0.02),
      bayRecessMat
    );
    frontBay.position.set(0, rideBaseY + 0.36, 1.42);
    bodyShellGroup.add(frontBay);

    if (isUrus || isContinental) {
      // V8 / W12 Engine Cover under Front Hood
      for (const vx of [-0.22, 0.22]) {
        const bank = new THREE.Mesh(
          new RoundedBoxGeometry(0.22, 0.14, 0.58, 3, 0.03),
          manifoldMat
        );
        bank.position.set(vx, rideBaseY + 0.48, 1.42);
        bodyShellGroup.add(bank);
      }
    } else {
      // Porsche / Ferrari Front Luggage Frunk with Leather Weekender Bag
      const frunkBag = new THREE.Mesh(
        new RoundedBoxGeometry(0.56, 0.2, 0.38, 3, 0.04),
        luggageBagMat
      );
      frunkBag.position.set(0, rideBaseY + 0.44, 1.44);
      bodyShellGroup.add(frunkBag);
    }
  }

  bodyShellGroup.add(trunkPivot);
  bodyShellGroup.add(frunkPivot);

  // 9. Multi-Element Projector Headlights + LED DRL Rings + Full-Width Taillight Bar
  const drlMat = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#e0f2fe',
    emissiveIntensity: 2.6,
    roughness: 0.08,
  });

  const frontLightZ = 2.12;
  const frontLightY = rideBaseY + (isGwagon ? 0.54 : isUrus ? 0.48 : 0.36);

  for (const lx of [-0.68, 0.68]) {
    const hlGroup = new THREE.Group();
    hlGroup.position.set(lx, frontLightY, frontLightZ);

    if (isGT3 || isTurboS || isGwagon || isContinental) {
      // Iconic Oval/Round Porsche & G-Wagon Projector Headlight with 4-Point / Halo LED Ring
      const housing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24),
        darkTrimMat
      );
      housing.rotation.x = isGwagon ? Math.PI / 2 : Math.PI / 2 - 0.42;
      hlGroup.add(housing);

      const haloRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.135, 0.018, 12, 28),
        drlMat
      );
      if (!isGwagon) haloRing.rotation.x = -0.42;
      haloRing.position.z = 0.04;
      hlGroup.add(haloRing);
      headlightMeshes.push(haloRing);

      const projectorLens = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 16, 16),
        drlMat
      );
      projectorLens.position.z = 0.03;
      hlGroup.add(projectorLens);
      headlightMeshes.push(projectorLens);
    } else {
      // Sharp Angular LED Matrix Blade Headlight (Ferrari F8 / Lamborghini Urus)
      const blade = new THREE.Mesh(
        new RoundedBoxGeometry(0.38, 0.07, 0.12, 3, 0.02),
        drlMat
      );
      blade.rotation.y = Math.sign(lx) * -0.24;
      blade.rotation.z = Math.sign(lx) * -0.12;
      hlGroup.add(blade);
      headlightMeshes.push(blade);
    }

    bodyShellGroup.add(hlGroup);
  }

  // Sculpted LED Taillight Strip / Ferrari Quad Round Taillights
  const tailMat = new THREE.MeshStandardMaterial({
    color: '#ff1e27',
    emissive: '#ef4444',
    emissiveIntensity: 2.8,
    roughness: 0.1,
  });

  if (isF8) {
    // Classic Ferrari Quad Round Taillights
    for (const tx of [-0.72, -0.52, 0.52, 0.72]) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.07, 0.02, 12, 24),
        tailMat
      );
      ring.position.set(tx, rideBaseY + 0.46, -2.23);
      bodyShellGroup.add(ring);
      taillightMeshes.push(ring);
    }
  } else {
    // Continuous LED Lightbar + Side Brake Clusters
    const lightBar = new THREE.Mesh(
      new RoundedBoxGeometry(coreWidth * 0.92, 0.055, 0.06, 3, 0.015),
      tailMat
    );
    lightBar.position.set(0, rideBaseY + (isGwagon ? 0.42 : 0.48), -2.23);
    bodyShellGroup.add(lightBar);
    taillightMeshes.push(lightBar);
  }

  // Clean White Front License Plate (matching video)
  const plateFrame = new THREE.Mesh(
    new RoundedBoxGeometry(0.52, 0.13, 0.03, 2, 0.008),
    darkTrimMat
  );
  plateFrame.position.set(0, rideBaseY + 0.15, 2.25);
  bodyShellGroup.add(plateFrame);

  const plateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.49, 0.11),
    new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.25 })
  );
  plateFace.position.set(0, rideBaseY + 0.15, 2.268);
  bodyShellGroup.add(plateFace);

  // 10. High-Intensity Headlight SpotLight Beams (activated on "START IT UP")
  const headlightBeamLeft = new THREE.SpotLight(0xe0f2fe, 0, 16, Math.PI / 5, 0.45, 1.4);
  headlightBeamLeft.position.set(0.68, frontLightY, 2.25);
  headlightBeamLeft.target.position.set(0.68, 0, 10);
  bodyShellGroup.add(headlightBeamLeft);
  bodyShellGroup.add(headlightBeamLeft.target);

  const headlightBeamRight = new THREE.SpotLight(0xe0f2fe, 0, 16, Math.PI / 5, 0.45, 1.4);
  headlightBeamRight.position.set(-0.68, frontLightY, 2.25);
  headlightBeamRight.target.position.set(-0.68, 0, 10);
  bodyShellGroup.add(headlightBeamRight);
  bodyShellGroup.add(headlightBeamRight.target);

  // Tag all meshes for click raycasting
  root.traverse((obj) => {
    obj.userData.carId = spec.id;
  });

  return {
    carId: spec.id,
    root,
    bodyShellGroup,
    leftDoorPivot,
    rightDoorPivot,
    trunkPivot,
    frunkPivot,
    isSideHingedTrunk: isGwagon,
    doorType: spec.doorType,
    paintMaterials,
    headlightMeshes,
    taillightMeshes,
    headlightBeamLeft,
    headlightBeamRight,
    wheels,
    customModelGroup,
  };
}
