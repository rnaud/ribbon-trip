export const PUZZLES = [
  {id:'bridge',name:'A BRIDGE, PLEASE',x:2500,y:0,near:[2260,2535],duration:2.2,hint:'A missing line. Help the artist draw a bridge.',thanks:'Yes. Much better.',points:[[2500,0],[2740,0]]},
  {id:'stairs',name:'A MATTER OF HEIGHT',x:5630,y:0,near:[5420,5660],duration:3.2,hint:'That wall is a bit much. Help the artist draw some stairs.',thanks:'Stairs! You could have started with those.',points:[[5600,0],[5600,60],[5700,60],[5700,120],[5800,120],[5800,180],[5900,180],[5900,240],[6050,240]]},
  {id:'slope',name:'A WAY DOWN',x:7000,y:240,near:[6660,7030],duration:3,hint:'He wants a way down. Help the artist draw it.',thanks:'A gentle slope. Finally, some consideration.',points:[[7000,240],[7080,240],[7660,0]]},
  {id:'lift',name:'GOING UP',x:8580,y:0,near:[8290,8600],duration:3,hint:'An elevator would be nice. Help the artist draw a lift.',thanks:'A lift! Wait for it, step on, let it carry him to the top.',points:[[8580,0],[8920,0],[8920,-20],[8580,-20],[8580,0],[8695,0],[8695,340],[8706,340],[8706,0]]},
  {id:'door',name:'ONE LAST REQUEST',x:10720,y:240,near:[10400,10830],duration:3,hint:'No way out? Help the artist draw a door.',thanks:'Finally. A little peace and quiet.',points:[[10720,240],[10720,445],[10810,445],[10810,240],[10720,240],[10720,445],[10782,423],[10782,258],[10720,240]]},
];
export function createDrawingState(){return {done:new Set(),active:null,age:0};}
export function nearbyPuzzle(x,drawings){return PUZZLES.find(q=>!drawings.done.has(q.id)&&x>=q.near[0]&&x<=q.near[1]);}
export function requestDrawing(drawings,x){if(drawings.active)return null;const q=nearbyPuzzle(x,drawings);if(!q)return null;drawings.active=q;drawings.age=0;return q;}
export function advanceDrawing(drawings,dt){if(!drawings.active)return null;drawings.age+=dt;if(drawings.age<drawings.active.duration)return null;const q=drawings.active;drawings.done.add(q.id);drawings.active=null;drawings.age=0;return q;}
export function liftHeight(time){const t=((time%8)+8)%8;return t<1?0:t<3?(t-1)*120:t<5?240:t<7?(7-t)*120:0;}
export function drawingTip(q,progress){const lengths=q.points.slice(1).map((b,i)=>Math.hypot(b[0]-q.points[i][0],b[1]-q.points[i][1]));let remaining=lengths.reduce((a,b)=>a+b,0)*Math.max(0,Math.min(1,progress));const points=[q.points[0]];for(let i=0;i<lengths.length;i++){if(remaining>=lengths[i]){points.push(q.points[i+1]);remaining-=lengths[i];}else{const a=q.points[i],b=q.points[i+1],f=remaining/lengths[i];points.push([a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f]);break;}}return points;}

// Shared by rendering and collisions, including pencil arrival/departure.
export function drawingProgress(drawings){const q=drawings.active;return q?Math.max(0,Math.min(1,(drawings.age-.25)/(q.duration-.5))):0;}
