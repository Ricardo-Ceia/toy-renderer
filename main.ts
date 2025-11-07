const CAMERA_POSITION = {
  x:0,
  y:0,
  z:0
};

const d = 1;
const Vw = 1;
const Vh = 1;
const Cw = 1920;
const Ch = 1080;

function canvas_to_view_port(x:number,y:number): {vx:number,vy:number}{
  return {
    vx: x*(Vw/Cw),
    vy:y*(Vh/Ch),
    vz:d
  };
} 

console.log(CAMERA_POSITION);

console.log(canvas_to_view_port(10,10))
