const canvas = document.getElementById("canvas") as HTMLCanvasElement;
console.log("Canvas:", canvas);
if (!canvas) {
  throw new Error("Canvas not found!");
}
const ctx = canvas.getContext("2d");
console.log("Context:", ctx);
if (!ctx) {
  throw new Error("Could not get 2D context!");
}
const Cw = canvas.width;
const Ch = canvas.height;
console.log(`Canvas size: ${Cw}x${Ch}`);

// viewport and camera
const Vw = 2;  // Increased from 1
const Vh = 2;  // Increased from 1
const d = 1;

type Vec3 = { x: number; y: number; z: number };

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function canvasToViewport(x: number, y: number): Vec3 {
  return {
    x: (x - Cw / 2) * (Vw / Cw),
    y: -(y - Ch / 2) * (Vh / Ch), // flip Y so up is +Y
    z: d
  };
}

function traceRay(origin: Vec3, direction: Vec3): Vec3 {
  // Simple white to blue gradient background
  const t = 0.5 * (direction.y + 1.0);
  const r = (1 - t) * 1.0 + t * 1;
  const g = (1 - t) * 1.0 + t * 0.5;
  const b = (1 - t) * 1.0 + t * 1;
  
  return {
    x: Math.max(0, Math.min(1, r)),
    y: Math.max(0, Math.min(1, g)),
    z: Math.max(0, Math.min(1, b))
  };
}

function putPixel(x: number, y: number, color: Vec3, data: Uint8ClampedArray) {
  const i = (y * Cw + x) * 4;
  data[i]     = Math.floor(255 * color.x);
  data[i + 1] = Math.floor(255 * color.y);
  data[i + 2] = Math.floor(255 * color.z);
  data[i + 3] = 255; // alpha
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
