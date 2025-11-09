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
  min: { x: -1, y: -1, z: 3 },
  max: { x: 1, y: 1, z: 5 },
  color: { x: 1, y: 0, z: 0 }
};

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
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

  for (const axis of ["x", "y", "z"] as const) {
    const invD = 1 / D[axis];
    let t1 = (cube.min[axis] - O[axis]) * invD;
    let t2 = (cube.max[axis] - O[axis]) * invD;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMax < tMin) return { t1: Infinity, t2: Infinity }; // no hit
  }

  return { t1: tMin, t2: tMax };
}

function traceRay(O: Vec3, D: Vec3): Vec3 {
  const { t1, t2 } = IntersectRayWithCube(O, D, cube);
  if (t1 === Infinity) return { x: 0.8, y: 0.9, z: 1.0 }; // background

  const t = t1 > 0 ? t1 : t2;
  if (t < 0) return { x: 0.8, y: 0.9, z: 1.0 };

  // Compute intersection point
  const P = {
    x: O.x + D.x * t,
    y: O.y + D.y * t,
    z: O.z + D.z * t,
  };

  // Simple shading
  const lightDir = normalize({ x: -1, y: -1, z: -1 });

  // Pick the normal of the front face (you can improve this later)
  const normal = { x: 0, y: 0, z: -1 };

  const intensity = Math.max(
    0,
    lightDir.x * normal.x + lightDir.y * normal.y + lightDir.z * normal.z
  );

  return {
    x: cube.color.x * intensity,
    y: cube.color.y * intensity,
    z: cube.color.z * intensity
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
  const O = { x: 0, y: 0, z: 0 };
  
  for (let y = 0; y < Ch; y++) {
    for (let x = 0; x < Cw; x++) {
      const D = normalize(canvasToViewport(x, y));
      const color = traceRay(O, D);
      putPixel(x, y, color, buffer);
    }
  }
  
  ctx.putImageData(image, 0, 0);
  // Removed the fillRect that was drawing over your image
}

render();
