var canvas = document.getElementById("canvas");
console.log("Canvas:", canvas);
if (!canvas) {
    throw new Error("Canvas not found!");
}
var ctx = canvas.getContext("2d");
console.log("Context:", ctx);
if (!ctx) {
    throw new Error("Could not get 2D context!");
}
var Cw = canvas.width;
var Ch = canvas.height;
console.log("Canvas size: ".concat(Cw, "x").concat(Ch));
// viewport and camera
var Vw = 2; // Increased from 1
var Vh = 2; // Increased from 1
var d = 1;
function normalize(v) {
    var len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}
function canvasToViewport(x, y) {
    return {
        x: (x - Cw / 2) * (Vw / Cw),
        y: -(y - Ch / 2) * (Vh / Ch), // flip Y so up is +Y
        z: d
    };
}
function traceRay(origin, direction) {
    // Simple white to blue gradient background
    var t = 0.5 * (direction.y + 1.0);
    var r = (1 - t) * 1.0 + t * 0.2;
    var g = (1 - t) * 1.0 + t * 0.8;
    var b = (1 - t) * 1.0 + t * 1;
    return {
        x: Math.max(0, Math.min(1, r)),
        y: Math.max(0, Math.min(1, g)),
        z: Math.max(0, Math.min(1, b))
    };
}
function putPixel(x, y, color, data) {
    var i = (y * Cw + x) * 4;
    data[i] = Math.floor(255 * color.x);
    data[i + 1] = Math.floor(255 * color.y);
    data[i + 2] = Math.floor(255 * color.z);
    data[i + 3] = 255; // alpha
}
function render() {
    var image = ctx.createImageData(Cw, Ch);
    var buffer = image.data;
    var O = { x: 0, y: 0, z: 0 };
    for (var y = 0; y < Ch; y++) {
        for (var x = 0; x < Cw; x++) {
            var D = normalize(canvasToViewport(x, y));
            var color = traceRay(O, D);
            putPixel(x, y, color, buffer);
        }
    }
    ctx.putImageData(image, 0, 0);
    // Removed the fillRect that was drawing over your image
}
render();
