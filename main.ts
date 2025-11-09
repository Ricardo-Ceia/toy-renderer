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
const cube = {
  min: { x: -1, y: -1, z: -1 },
  max: { x: 1, y: 1, z: 1 },
  color: { x: 1, y: 0, z: 0 }
};

let rotationAngle = 0;
const cubeCenter = { x: 0, y: 0, z: 4 }; // Cube center in world space

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function rotateY(point: Vec3, angle: number): Vec3 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: point.x * cos - point.z * sin,
    y: point.y,
    z: point.x * sin + point.z * cos
  };
}

function canvasToViewport(x: number, y: number): Vec3 {
  return {
    x: (x - Cw / 2) * (Vw / Cw),
    y: -(y - Ch / 2) * (Vh / Ch),
    z: d
  };
}

function IntersectRayWithCube(O: Vec3, D: Vec3, cube: {min: Vec3, max: Vec3}) {
  let tMin = -Infinity;
  let tMax = Infinity;
  let minAxis = '';
  
  for (const axis of ["x", "y", "z"] as const) {
    const invD = 1 / D[axis];
    let t1 = (cube.min[axis] - O[axis]) * invD;
    let t2 = (cube.max[axis] - O[axis]) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    
    if (t1 > tMin) {
      tMin = t1;
      minAxis = axis;
    }
    tMax = Math.min(tMax, t2);
    
    if (tMax < tMin) return { t1: Infinity, t2: Infinity, axis: '' };
  }
  return { t1: tMin, t2: tMax, axis: minAxis };
}

function getCubeNormal(P: Vec3, cube: {min: Vec3, max: Vec3}, axis: string): Vec3 {
  const epsilon = 0.0001;
  
  if (axis === 'x') {
    if (Math.abs(P.x - cube.min.x) < epsilon) return { x: -1, y: 0, z: 0 };
    if (Math.abs(P.x - cube.max.x) < epsilon) return { x: 1, y: 0, z: 0 };
  } else if (axis === 'y') {
    if (Math.abs(P.y - cube.min.y) < epsilon) return { x: 0, y: -1, z: 0 };
    if (Math.abs(P.y - cube.max.y) < epsilon) return { x: 0, y: 1, z: 0 };
  } else if (axis === 'z') {
    if (Math.abs(P.z - cube.min.z) < epsilon) return { x: 0, y: 0, z: -1 };
    if (Math.abs(P.z - cube.max.z) < epsilon) return { x: 0, y: 0, z: 1 };
  }
  
  return { x: 0, y: 0, z: 1 };
}

function traceRay(O: Vec3, D: Vec3, angle: number): Vec3 {
  // Transform ray into cube's local space (inverse rotation around Y axis)
  const localO = subtract(O, cubeCenter);
  const rotatedO = rotateY(localO, -angle);
  const rotatedD = rotateY(D, -angle);
  
  const { t1, t2, axis } = IntersectRayWithCube(rotatedO, rotatedD, cube);
  if (t1 === Infinity) return { x: 1, y: 1, z: 1 };
  const t = t1 > 0 ? t1 : t2;
  if (t < 0) return { x: 1, y: 1, z: 1 };
  
  const P = {
    x: rotatedO.x + rotatedD.x * t,
    y: rotatedO.y + rotatedD.y * t,
    z: rotatedO.z + rotatedD.z * t,
  };
  
  const localNormal = getCubeNormal(P, cube, axis);
  // Transform normal back to world space
  const worldNormal = rotateY(localNormal, angle);
  
  const lightDir = normalize({ x: -1, y: -1, z: -1 });
  const intensity = Math.max(
    0,
    -(lightDir.x * worldNormal.x + lightDir.y * worldNormal.y + lightDir.z * worldNormal.z)
  );
  
  const ambient = 0.3;
  const finalIntensity = ambient + (1 - ambient) * intensity;
  
  return {
    x: cube.color.x * finalIntensity,
    y: cube.color.y * finalIntensity,
    z: cube.color.z * finalIntensity
  };
}

function putPixel(x: number, y: number, color: Vec3, data: Uint8ClampedArray) {
  const i = (y * Cw + x) * 4;
  data[i]     = Math.floor(255 * color.x);
  data[i + 1] = Math.floor(255 * color.y);
  data[i + 2] = Math.floor(255 * color.z);
  data[i + 3] = 255;
}

function render() {
  const image = ctx.createImageData(Cw, Ch);
  const buffer = image.data;
  
  const O = { x: 0, y: 0, z: 0 }; // Camera stays fixed at origin
  
  for (let y = 0; y < Ch; y++) {
    for (let x = 0; x < Cw; x++) {
      const D = normalize(canvasToViewport(x, y));
      const color = traceRay(O, D, rotationAngle);
      putPixel(x, y, color, buffer);
    }
  }
  
  ctx.putImageData(image, 0, 0);
}

function animate() {
  rotationAngle += 0.02; // Adjust rotation speed here
  render();
  requestAnimationFrame(animate);
}

animate();
