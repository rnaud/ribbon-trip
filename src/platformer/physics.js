export const GRAVITY = 1550;
export const SPEED = 260;
export const JUMP = 620;
export const RADIUS = 17;
export const FINISH = 5580;
export const CHECKPOINTS = [430, 1440, 2800, 4020];
// The upper contour of the drawing is the collision surface.
export const SEGMENTS = [
  {a:-1200,b:780,y:0}, {a:780,b:950,y:58}, {a:950,b:1120,y:116},
  {a:1120,b:1240,y:58}, {a:1370,b:1790,y:0},
  {a:1790,b:1970,y:72}, {a:2110,b:2380,y:72}, {a:2380,b:2500,y:0},
  {a:2740,b:3160,y:0}, {a:3160,b:3340,y:65}, {a:3340,b:3510,y:130},
  {a:3670,b:3850,y:100}, {a:3960,b:4320,y:0},
  {a:4320,b:4480,y:65}, {a:4480,b:4650,y:130}, {a:4650,b:4820,y:65},
  {a:4930,b:6100,y:0},
];
export const REPAIR = {a:2500,b:2740,y:0};
export function surfaces(repaired=false){return repaired ? [...SEGMENTS,REPAIR].sort((a,b)=>a.a-b.a) : SEGMENTS;}
export function support(x, list){return list.find(s=>x>=s.a && x<=s.b);}
export function createPlayer(){return {x:430,y:0,vx:0,vy:0,grounded:true,coyote:.11,buffer:0,facing:1,checkpoint:430,falls:0,walk:0,land:0};}
export function stepPlayer(p,input,dt,list){
  p.buffer=Math.max(0,p.buffer-dt);p.coyote=p.grounded?.11:Math.max(0,p.coyote-dt);p.land=Math.max(0,p.land-dt);
  const direction=(input.right?1:0)-(input.left?1:0);
  const target=direction*SPEED;
  p.vx+=Math.sign(target-p.vx)*Math.min(Math.abs(target-p.vx),(direction?1800:2100)*dt);
  if(direction)p.facing=direction;
  if(p.buffer>0&&p.coyote>0){p.vy=JUMP;p.grounded=false;p.coyote=0;p.buffer=0;}
  if(!input.jump&&p.vy>260)p.vy=Math.max(260,p.vy-GRAVITY*dt*1.5);
  const oldX=p.x,oldY=p.y;let nx=Math.max(-150,p.x+p.vx*dt);
  for(const s of list){if(oldY<s.y-1&&oldY+160>s.y){if(p.vx>0&&oldX+RADIUS<=s.a+1&&nx+RADIUS>s.a){nx=s.a-RADIUS;p.vx=0;}if(p.vx<0&&oldX-RADIUS>=s.b-1&&nx-RADIUS<s.b){nx=s.b+RADIUS;p.vx=0;}}}
  p.x=nx;p.vy-=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
  if(p.vy<=0){for(const s of list){if(p.x+RADIUS*.5>s.a&&p.x-RADIUS*.5<s.b&&oldY>=s.y-.5&&p.y<=s.y){if(p.vy<-250)p.land=.15;p.y=s.y;p.vy=0;p.grounded=true;break;}}}
  p.walk+=Math.abs(p.x-oldX)*.035;
  if(p.grounded){for(const c of CHECKPOINTS)if(p.x>=c)p.checkpoint=Math.max(p.checkpoint,c);}
  return {jumped:oldY===p.y?false:p.vy===JUMP-GRAVITY*dt,fallen:p.y < -480,finished:p.x>=FINISH};
}
export function respawn(p,list){p.x=p.checkpoint;p.y=support(p.x,list)?.y??0;p.vx=0;p.vy=0;p.grounded=true;p.coyote=.11;p.buffer=0;p.falls++;}
