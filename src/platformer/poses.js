// Fingers are one rigid drawing. Only the wrist, elbow, and shoulder move;
// matching arm landmarks blend without reassigning points between fingers.
const HAND=[[-6,0],[-10,-8],[-17,-12],[-18,-16],[-15,-18],[-8,-14],[-10,-26],[-7,-29],[-4,-26],[-2,-16],[0,-30],[3,-31],[5,-28],[5,-16],[9,-26],[12,-26],[14,-23],[10,-11],[7,-5],[6,0]];
const mix=(base,targets,weights)=>base.map((x,k)=>x+weights.reduce((sum,w,i)=>sum+w*(targets[i][k]-x),0));
function curve(a,c,b,n=20){return Array.from({length:n},(_,i)=>{const t=i/(n-1),u=1-t;return a.map((v,k)=>u*u*v+2*u*t*c[k]+t*t*b[k]);});}
export function armContour(pose,front=false){
  const raw=[pose.point,pose.open,pose.hip].map(x=>Math.max(0,x));
  const sum=Math.max(1,raw.reduce((a,b)=>a+b,0)),weights=raw.map(x=>x/sum);
  const wrist=mix(front?[33,-95]:[-44,-101],front?[[55,-124],[87,-148],[33,-96]]:[[-35,-145],[-65,-145],[-34,-107]],weights);
  const elbow=mix(front?[40,-78]:[-35,-84],front?[[62,-99],[76,-108],[42,-80]]:[[-42,-112],[-46,-111],[-55,-91]],weights);
  const angle=mix([front?.5:-1.05],front?[[.15],[.12],[.5]]:[[.55],[-.4],[1.15]],weights)[0];
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const hand=HAND.map(([x,y])=>[wrist[0]+x*cos-y*sin,wrist[1]+x*sin+y*cos]);
  const start=front?[10,-130]:[-22,-66],end=front?[27,-63]:[-29,-139];
  const outer=curve(start,[elbow[0]-7,elbow[1]],hand[0]);
  const inner=curve(hand.at(-1),[elbow[0]+7,elbow[1]],end);
  const points=[...outer.slice(0,-1),...hand,...inner.slice(1)];
  points.handStart=outer.length-1;points.handEnd=points.handStart+HAND.length;
  points.wrist=wrist;points.angle=angle;
  return points;
}
export function projectArm(points,project){
  const projected=points.map(([x,y])=>project(x,y));
  const [wx,wy]=points.wrist,anchor=project(wx,wy);
  const axis=project(wx+Math.cos(points.angle)*10,wy+Math.sin(points.angle)*10);
  const angle=Math.atan2(axis[1]-anchor[1],axis[0]-anchor[0]);
  const cos=Math.cos(angle),sin=Math.sin(angle);
  // Project the wrist's orientation once, not each finger through body skinning.
  // This preserves palm width and finger lengths even as the torso deforms.
  HAND.forEach(([x,y],i)=>{projected[points.handStart+i]=[anchor[0]+x*cos-y*sin,anchor[1]+x*sin+y*cos];});
  return projected;
}
