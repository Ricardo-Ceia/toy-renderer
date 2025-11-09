const canvas = document.getElementById("canvas") as HTMLCanvasElement;
if (!canvas) {
  throw new Error("Canvas not found!");
}

const ctx = canvas.getContext("2d");
if (!ctx) {
  throw new Error("Could not get 2D context!");
}

const Cw = canvas.width;
const Ch = canvas.height;
const Vw = 2;
const Vh = 2;
const d = 1;

type Vec3 = { x: number; y: number; z: number };

interface Cube {
  position: Vec3;  // Center position
  size: number;
  color: Vec3;
  velocity: Vec3;
  angularVelocity: Vec3;
  rotation: Vec3;
  mass: number;
}

const mainCube: Cube = {
  position: { x: 0, y: 0, z: 4 },
  size: 2,
  color: { x: 1, y: 0, z: 0 },
  velocity: { x: 0, y: 0, z: 0 },
  angularVelocity: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  mass: 1
};

let rotationAngle = 0;
let zoomLevel = 1.0;
let isExploded = false;
let fragments: Cube[] = [];

const GRAVITY = 0.02;
const BOUNCE_DAMPING = 0.6;
const FRICTION = 0.95;
const AIR_RESISTANCE = 0.998;
const FLOOR_Y = -4;
const ANGULAR_DAMPING = 0.98;
const MIN_VELOCITY = 0.001;
const MIN_ANGULAR_VELOCITY = 0.001;

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function rotateX(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}

function rotateY(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}

function rotateZ(p: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c, z: p.z };
}

function rotate(p: Vec3, rot: Vec3): Vec3 {
  let result = rotateX(p, rot.x);
  result = rotateY(result, rot.y);
  result = rotateZ(result, rot.z);
  return result;
}

function canvasToViewport(x: number, y: number): Vec3 {
  const effectiveVw = Vw / zoomLevel;
  const effectiveVh = Vh / zoomLevel;
  
  return {
    x: (x - Cw / 2) * (effectiveVw / Cw),
    y: -(y - Ch / 2) * (effectiveVh / Ch),
    z: d
  };
}

function project3D(point: Vec3): { x: number; y: number; z: number } | null {
  const fov = 600;
  const z = point.z;
  if (z <= 0.1) return null;
  
  const scale = fov / z;
  return {
    x: point.x * scale + Cw / 2,
    y: -point.y * scale + Ch / 2,
    z: z
  };
}

interface ProjectedFace {
  vertices: Array<{ x: number; y: number }>;
  depth: number;
  color: string;
  normal: Vec3;
}

function projectCube(cube: Cube): ProjectedFace[] {
  const half = cube.size / 2;
  
  // Define cube vertices relative to center
  const localVertices = [
    { x: -half, y: -half, z: -half }, // 0
    { x: half, y: -half, z: -half },  // 1
    { x: half, y: half, z: -half },   // 2
    { x: -half, y: half, z: -half },  // 3
    { x: -half, y: -half, z: half },  // 4
    { x: half, y: -half, z: half },   // 5
    { x: half, y: half, z: half },    // 6
    { x: -half, y: half, z: half },   // 7
  ];
  
  // Apply cube's rotation and translation
  const worldVertices = localVertices.map(v => {
    let rotated = rotate(v, cube.rotation);
    return {
      x: rotated.x + cube.position.x,
      y: rotated.y + cube.position.y,
      z: rotated.z + cube.position.z
    };
  });
  
  const projected = worldVertices.map(v => project3D(v));
  
  // Check if all vertices are visible
  if (projected.some(p => p === null)) return [];
  
  const projectedValid = projected as Array<{ x: number; y: number; z: number }>;
  
  // Define faces with normals
  const faces = [
    { indices: [0, 1, 2, 3], normal: { x: 0, y: 0, z: -1 } }, // Front
    { indices: [5, 4, 7, 6], normal: { x: 0, y: 0, z: 1 } },  // Back
    { indices: [4, 5, 1, 0], normal: { x: 0, y: -1, z: 0 } }, // Bottom
    { indices: [3, 2, 6, 7], normal: { x: 0, y: 1, z: 0 } },  // Top
    { indices: [4, 0, 3, 7], normal: { x: -1, y: 0, z: 0 } }, // Left
    { indices: [1, 5, 6, 2], normal: { x: 1, y: 0, z: 0 } },  // Right
  ];
  
  const result: ProjectedFace[] = [];
  
  faces.forEach(face => {
    const avgZ = face.indices.reduce((sum, idx) => sum + projectedValid[idx].z, 0) / 4;
    
    // Calculate lighting with rotated normal
    const rotatedNormal = rotate(face.normal, cube.rotation);
    const lightDir = { x: 0.5, y: 0.7, z: 0.5 };
    const lightDirNorm = normalize(lightDir);
    const brightness = 0.4 + 0.6 * Math.max(0, dot(rotatedNormal, lightDirNorm));
    
    const r = Math.floor(cube.color.x * 255 * brightness);
    const g = Math.floor(cube.color.y * 255 * brightness);
    const b = Math.floor(cube.color.z * 255 * brightness);
    
    result.push({
      vertices: face.indices.map(idx => ({ 
        x: projectedValid[idx].x, 
        y: projectedValid[idx].y 
      })),
      depth: avgZ,
      color: `rgb(${r},${g},${b})`,
      normal: rotatedNormal
    });
  });
  
  return result;
}

function drawFloor() {
  // Draw a grid floor
  const floorSize = 20;
  const gridSpacing = 2;
  const floorColor = '#cccccc';
  const gridColor = '#999999';
  
  // Floor plane vertices
  const floorVertices = [
    { x: -floorSize, y: FLOOR_Y, z: -5 },
    { x: floorSize, y: FLOOR_Y, z: -5 },
    { x: floorSize, y: FLOOR_Y, z: 20 },
    { x: -floorSize, y: FLOOR_Y, z: 20 }
  ];
  
  const projectedFloor = floorVertices.map(v => project3D(v));
  
  if (projectedFloor.every(p => p !== null)) {
    const vertices = projectedFloor as Array<{ x: number; y: number; z: number }>;
    
    // Draw floor
    ctx.fillStyle = floorColor;
    ctx.beginPath();
    ctx.moveTo(vertices[0].x, vertices[0].y);
    ctx.lineTo(vertices[1].x, vertices[1].y);
    ctx.lineTo(vertices[2].x, vertices[2].y);
    ctx.lineTo(vertices[3].x, vertices[3].y);
    ctx.closePath();
    ctx.fill();
    
    // Draw grid lines
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    
    // Horizontal lines
    for (let z = -5; z <= 20; z += gridSpacing) {
      const p1 = project3D({ x: -floorSize, y: FLOOR_Y, z });
      const p2 = project3D({ x: floorSize, y: FLOOR_Y, z });
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
    
    // Vertical lines
    for (let x = -floorSize; x <= floorSize; x += gridSpacing) {
      const p1 = project3D({ x, y: FLOOR_Y, z: -5 });
      const p2 = project3D({ x, y: FLOOR_Y, z: 20 });
      if (p1 && p2) {
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    }
  }
}

function explodeCube() {
  if (isExploded) return;
  
  isExploded = true;
  fragments = [];
  
  const divisions = 6; // 6x6x6 = 216 pieces for better performance
  const fragmentSize = mainCube.size / divisions;
  
  for (let i = 0; i < divisions; i++) {
    for (let j = 0; j < divisions; j++) {
      for (let k = 0; k < divisions; k++) {
        // Calculate fragment center position
        const offsetX = (i - divisions / 2 + 0.5) * fragmentSize;
        const offsetY = (j - divisions / 2 + 0.5) * fragmentSize;
        const offsetZ = (k - divisions / 2 + 0.5) * fragmentSize;
        
        const fragmentCenter = {
          x: mainCube.position.x + offsetX,
          y: mainCube.position.y + offsetY,
          z: mainCube.position.z + offsetZ
        };
        
        // Calculate explosion velocity (radial from center)
        const explosionDir = {
          x: offsetX,
          y: offsetY,
          z: offsetZ
        };
        const explosionDirNorm = normalize(explosionDir);
        
        const explosionStrength = 0.15 + Math.random() * 0.1;
        const upwardBias = 0.1;
        
        fragments.push({
          position: fragmentCenter,
          size: fragmentSize * 0.95,
          color: { ...mainCube.color },
          velocity: {
            x: explosionDirNorm.x * explosionStrength,
            y: explosionDirNorm.y * explosionStrength + upwardBias,
            z: explosionDirNorm.z * explosionStrength
          },
          angularVelocity: {
            x: (Math.random() - 0.5) * 0.3,
            y: (Math.random() - 0.5) * 0.3,
            z: (Math.random() - 0.5) * 0.3
          },
          rotation: { x: 0, y: 0, z: 0 },
          mass: 1
        });
      }
    }
  }
}

function updateFragments() {
  if (!isExploded || fragments.length === 0) return;
  
  fragments.forEach(fragment => {
    // Apply gravity
    fragment.velocity.y -= GRAVITY;
    
    // Apply air resistance
    fragment.velocity.x *= AIR_RESISTANCE;
    fragment.velocity.y *= AIR_RESISTANCE;
    fragment.velocity.z *= AIR_RESISTANCE;
    
    // Update position
    fragment.position.x += fragment.velocity.x;
    fragment.position.y += fragment.velocity.y;
    fragment.position.z += fragment.velocity.z;
    
    // Update rotation
    fragment.rotation.x += fragment.angularVelocity.x;
    fragment.rotation.y += fragment.angularVelocity.y;
    fragment.rotation.z += fragment.angularVelocity.z;
    
    // Apply angular damping
    fragment.angularVelocity.x *= ANGULAR_DAMPING;
    fragment.angularVelocity.y *= ANGULAR_DAMPING;
    fragment.angularVelocity.z *= ANGULAR_DAMPING;
    
    // Floor collision detection
    const bottomY = fragment.position.y - fragment.size / 2;
    
    if (bottomY <= FLOOR_Y) {
      // Correct position to be on floor
      fragment.position.y = FLOOR_Y + fragment.size / 2;
      
      // Bounce with energy loss
      if (Math.abs(fragment.velocity.y) > MIN_VELOCITY) {
        fragment.velocity.y = -fragment.velocity.y * BOUNCE_DAMPING;
      } else {
        fragment.velocity.y = 0;
      }
      
      // Apply friction to horizontal movement
      fragment.velocity.x *= FRICTION;
      fragment.velocity.z *= FRICTION;
      
      // Reduce angular velocity on impact
      fragment.angularVelocity.x *= BOUNCE_DAMPING;
      fragment.angularVelocity.y *= BOUNCE_DAMPING;
      fragment.angularVelocity.z *= BOUNCE_DAMPING;
    }
    
    // Stop very slow movements
    if (Math.abs(fragment.velocity.x) < MIN_VELOCITY) fragment.velocity.x = 0;
    if (Math.abs(fragment.velocity.y) < MIN_VELOCITY) fragment.velocity.y = 0;
    if (Math.abs(fragment.velocity.z) < MIN_VELOCITY) fragment.velocity.z = 0;
    
    if (Math.abs(fragment.angularVelocity.x) < MIN_ANGULAR_VELOCITY) fragment.angularVelocity.x = 0;
    if (Math.abs(fragment.angularVelocity.y) < MIN_ANGULAR_VELOCITY) fragment.angularVelocity.y = 0;
    if (Math.abs(fragment.angularVelocity.z) < MIN_ANGULAR_VELOCITY) fragment.angularVelocity.z = 0;
  });
}

function render() {
  // Clear canvas
  ctx.fillStyle = '#e8f4f8';
  ctx.fillRect(0, 0, Cw, Ch);
  
  // Draw floor
  drawFloor();
  
  if (!isExploded) {
    // Render main cube
    mainCube.rotation.y = rotationAngle;
    const faces = projectCube(mainCube);
    
    // Sort faces by depth
    faces.sort((a, b) => b.depth - a.depth);
    
    // Draw faces
    faces.forEach(face => {
      ctx.fillStyle = face.color;
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      face.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  } else {
    // Render fragments
    const allFaces: ProjectedFace[] = [];
    
    fragments.forEach(fragment => {
      const faces = projectCube(fragment);
      allFaces.push(...faces);
    });
    
    // Sort all faces by depth (painter's algorithm)
    allFaces.sort((a, b) => b.depth - a.depth);
    
    // Draw all faces
    allFaces.forEach(face => {
      ctx.fillStyle = face.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.5;
      
      ctx.beginPath();
      face.vertices.forEach((v, i) => {
        if (i === 0) ctx.moveTo(v.x, v.y);
        else ctx.lineTo(v.x, v.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    });
  }
}

// Setup color sliders
const redSlider = document.getElementById("red") as HTMLInputElement;
const greenSlider = document.getElementById("green") as HTMLInputElement;
const blueSlider = document.getElementById("blue") as HTMLInputElement;

const redValue = document.getElementById("redValue");
const greenValue = document.getElementById("greenValue");
const blueValue = document.getElementById("blueValue");

if (redSlider && greenSlider && blueSlider) {
  redSlider.addEventListener("input", (e) => {
    const value = parseInt((e.target as HTMLInputElement).value) / 255;
    mainCube.color.x = value;
    fragments.forEach(f => f.color.x = value);
    if (redValue) redValue.textContent = Math.round(value * 255).toString();
  });
  
  greenSlider.addEventListener("input", (e) => {
    const value = parseInt((e.target as HTMLInputElement).value) / 255;
    mainCube.color.y = value;
    fragments.forEach(f => f.color.y = value);
    if (greenValue) greenValue.textContent = Math.round(value * 255).toString();
  });
  
  blueSlider.addEventListener("input", (e) => {
    const value = parseInt((e.target as HTMLInputElement).value) / 255;
    mainCube.color.z = value;
    fragments.forEach(f => f.color.z = value);
    if (blueValue) blueValue.textContent = Math.round(value * 255).toString();
  });
}

// Click to explode
canvas.addEventListener('click', () => {
  if (!isExploded) {
    explodeCube();
  }
});

// Zoom
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  zoomLevel *= e.deltaY > 0 ? 1.1 : 0.9;
  zoomLevel = Math.max(0.5, Math.min(zoomLevel, 5));
});

function animate() {
  if (!isExploded) {
    rotationAngle += 0.02;
  } else {
    updateFragments();
  }
  render();
  requestAnimationFrame(animate);
}

animate();
