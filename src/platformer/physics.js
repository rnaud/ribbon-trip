import {PUZZLES,liftHeight,drawingTip,drawingProgress} from './puzzles.js';
export const SPEED=170;
export const FINISH=10830;
export const SEGMENTS=[
  {a:-1200,b:2500,y:0},{a:2740,b:5600,y:0},
  {a:6050,b:7000,y:240},{a:7660,b:8580,y:0},
  {a:8920,b:11400,y:240},
];
export const REPAIR={a:2500,b:2740,y:0};
export function surfaces(drawn=false,time=0){
  const done=drawn instanceof Set?drawn:drawn?.done??new Set(drawn?['bridge']:[]);
  const extras=[];
  for(const q of PUZZLES){
    if(!['bridge','stairs','slope','lift'].includes(q.id))continue;
    const complete=done.has(q.id),active=drawn?.active?.id===q.id;
    if(!complete&&!active)continue;
    if(q.id==='lift'&&complete){extras.push({a:8580,b:8920,y:liftHeight(time-(drawn?.liftStartedAt??0)),id:'lift'});continue;}
    const points=complete?q.points:drawingTip(q,drawingProgress(drawn));
    for(let i=1;i<points.length;i++){
      const [a,y]=points[i-1],[b,endY]=points[i];
      if(b>a&&(y===endY||q.id==='slope')&&(q.id!=='lift'||i===1))extras.push({a,b,y,...(endY!==y?{endY}:{}),...(q.id==='stairs'?{step:true}:{}),...(q.id==='lift'?{id:'lift'}:{})});
    }
  }
  return [...SEGMENTS,...extras].sort((a,b)=>a.a-b.a);
}
export function support(x,list){return list.find(s=>x>=s.a&&x<s.b);}
export function surfaceHeight(s,x){return s.y+(s.endY===undefined?0:(s.endY-s.y)*Math.max(0,Math.min(1,(x-s.a)/(s.b-s.a))));}
export function createPlayer(){return {x:430,y:0,vx:0,vy:0,grounded:true,facing:1,walk:0,footStride:0,bodyLean:0,headLean:0,land:0,anticipation:0,idle:0,viewerLook:0,mood:'neutral',moodTime:0,platform:null,platformY:0,waiting:0};}
// Autonomous walking on a drawn contour. Missing ink and a misaligned lift
// are stopping points, never pits to jump across or fall into.
export function stepPlayer(p,_input,dt,list,done=new Set()){
  const current=support(p.x,list);
  if(!current){p.vx=0;return {blocked:true,finished:false};}
  const next=support(current.b+.01,list);
  const end=surfaceHeight(current,current.b);
  const canCross=next&&Math.abs(surfaceHeight(next,next.a)-end)<(next.step?65:9);
  let speed=SPEED;
  if(!canCross)speed=Math.min(speed,Math.max(0,(current.b-p.x-24)*4));
  if(!done.has('door'))speed=Math.min(speed,Math.max(0,(10700-p.x)*4));
  if(speed<1)speed=0;
  p.vx+=(speed-p.vx)*(1-Math.exp(-dt*12));
  if(speed===0)p.vx=0;
  const oldX=p.x;
  p.x+=p.vx*dt;
  const under=support(p.x,list)??current;
  const targetY=surfaceHeight(under,p.x);
  p.y+=(targetY-p.y)*(1-Math.exp(-dt*16));
  p.vy=0;p.grounded=true;p.platform=under.id??null;p.platformY=targetY;
  p.walk+=(p.x-oldX)*.035;
  if(p.x-oldX>1e-8)p.footStride=Math.sin(p.walk)*18;
  p.bodyLean+=(p.vx/SPEED-p.bodyLean)*(1-Math.exp(-dt*12));
  p.headLean+=(p.bodyLean-p.headLean)*(1-Math.exp(-dt*6));
  return {blocked:speed===0,finished:p.x>=FINISH};
}
