import {liftHeight, drawingTip, drawingProgress} from './puzzles.js';
export const GRAVITY = 1550;
export const SPEED = 260;
export const JUMP = 620;
export const RADIUS = 17;
export const FINISH = 10830;
export const CHECKPOINTS = [430, 1440, 2800, 4020, 5260, 6440, 7790, 8230, 9300, 10200];
// The upper contour of the drawing is the collision surface.
export const SEGMENTS = [
  {a:-1200,b:780,y:0}, {a:780,b:950,y:58}, {a:950,b:1120,y:116},
  {a:1120,b:1240,y:58}, {a:1370,b:1790,y:0},
  {a:1790,b:1970,y:72}, {a:2110,b:2380,y:72}, {a:2380,b:2500,y:0},
  {a:2740,b:3160,y:0}, {a:3160,b:3340,y:65}, {a:3340,b:3510,y:130},
  {a:3670,b:3850,y:100}, {a:3960,b:4320,y:0},
  {a:4320,b:4480,y:65}, {a:4480,b:4650,y:130}, {a:4650,b:4820,y:65},
  {a:4930,b:5600,y:0}, {a:6050,b:6230,y:240}, {a:6230,b:6350,y:120},
  {a:6400,b:7000,y:0}, {a:7040,b:7520,y:230}, {a:7660,b:7900,y:90},
  {a:7990,b:8580,y:0}, {a:8920,b:9460,y:240}, {a:9460,b:9580,y:160},
  {a:9710,b:9850,y:130}, {a:9980,b:10120,y:60}, {a:10120,b:11400,y:0},
];
export const REPAIR = {a:2500,b:2740,y:0};
export function surfaces(drawn=false,time=0){
  const done=drawn instanceof Set?drawn:drawn?.done??new Set(drawn?['bridge']:[]);
  const extras=[];
  if(done.has('bridge'))extras.push(REPAIR);
  if(done.has('stairs'))extras.push({a:5600,b:5700,y:60},{a:5700,b:5800,y:120},{a:5800,b:5900,y:180},{a:5900,b:6050,y:240});
  if(done.has('lift'))extras.push({a:8580,b:8810,y:liftHeight(time-(drawn?.liftStartedAt??0)),id:'lift',oneWay:true});
  // Only the ink already on the page supports the player. Ignore vertical
  // strokes and decorative lower edges of the lift carriage.
  const q=drawn?.active;
  if(q&&['bridge','stairs','lift'].includes(q.id)){
    const points=drawingTip(q,drawingProgress(drawn));
    for(let i=1;i<points.length;i++){
      const [a,y]=points[i-1],[b,by]=points[i];
      if(y===by&&b>a&&(q.id!=='lift'||i===1))extras.push({a,b,y,...(q.id==='lift'?{id:'lift',oneWay:true}:{})});
    }
  }
  return [...SEGMENTS,...extras].sort((a,b)=>a.a-b.a);
}
export function support(x, list){return list.find(s=>x>=s.a && x<=s.b);}
export function createPlayer(){return {x:430,y:0,vx:0,vy:0,grounded:true,coyote:.11,buffer:0,facing:1,checkpoint:430,falls:0,walk:0,bodyLean:0,headLean:0,land:0,anticipation:0,launch:0,idle:0,mood:"neutral",moodTime:0,platform:null,platformY:0};}
export function stepPlayer(p,input,dt,list,drawn=new Set()){
  if(p.grounded&&p.platform){const platform=list.find(s=>s.id===p.platform);if(platform)p.y+=platform.y-p.platformY;}
  let jumped=false;
  p.launch=Math.max(0,p.launch-dt);
  p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);p.land=Math.max(0,p.land-dt);
  const direction=(input.right?1:0)-(input.left?1:0);
  const target=direction*SPEED;
  p.vx+=Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),(direction?1800:2100)*dt);
  if(direction)p.facing=direction;
  p.bodyLean+=(p.vx*p.facing/SPEED-p.bodyLean)*(1-Math.exp(-dt*12));
  p.headLean+=(p.bodyLean-p.headLean)*(1-Math.exp(-dt*6));
  if(p.buffer>0&&p.coyote>0&&p.anticipation<=0){p.anticipation=.07;p.buffer=0;}
  if(p.anticipation>0){p.anticipation-=dt;if(p.anticipation<=0){const spring=drawn.has('spring')&&Math.abs(p.x-6900)<65;p.vy=spring?1030:JUMP;p.launch=spring?.65:0;p.grounded=false;p.coyote=0;jumped=true;}}
  if(!input.jump&&p.vy>260&&p.launch<=0)p.vy=Math.max(260,p.vy-GRAVITY*dt*1.5);
  const oldX=p.x,oldY=p.y;let nx=Math.max(-150,p.x+p.vx*dt);
  for(const s of list){if(!s.oneWay&&oldY<s.y-1&&oldY+160>s.y){if(p.vx>0&&oldX+RADIUS<=s.a+1&&nx+RADIUS>s.a){nx=s.a-RADIUS;p.vx=0;}if(p.vx<0&&oldX-RADIUS>=s.b-1&&nx-RADIUS<s.b){nx=s.b+RADIUS;p.vx=0;}}}
  p.x=nx;p.vy-=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;p.platform=null;
  if(p.vy<=0){for(const s of list){if(p.x+RADIUS*.5>s.a&&p.x-RADIUS*.5<s.b&&oldY>=s.y-.5&&p.y<=s.y){if(p.vy<-250)p.land=.15;p.y=s.y;p.vy=0;p.grounded=true;p.platform=s.id??null;p.platformY=s.y;break;}}}
  p.walk+=Math.abs(p.x-oldX)*.035;
  if(p.grounded){for(const c of CHECKPOINTS)if(p.x>=c)p.checkpoint=Math.max(p.checkpoint,c);}
  return {jumped,fallen:p.y < -480,finished:p.x>=FINISH};
}
export function respawn(p,list){p.x=p.checkpoint;p.y=support(p.x,list)?.y??0;p.vx=0;p.vy=0;p.grounded=true;p.coyote=.11;p.buffer=0;p.anticipation=0;p.launch=0;p.platform=null;p.falls++;}
