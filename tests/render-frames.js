import {createCanvas} from '@napi-rs/canvas';
import {writeFileSync,mkdirSync} from 'node:fs';
import {drawScene} from '../src/platformer/drawing.js';
import {createDrawingState, PUZZLES} from '../src/platformer/puzzles.js';
import {createPlayer} from '../src/platformer/physics.js';
mkdirSync('/tmp/linea-review',{recursive:true});
const canvas=createCanvas(1280,720),pen=canvas.getContext('2d');
const p=createPlayer();
const frame={p,cam:p.x-1280*.58,time:0,state:'idle',askTime:0,fallTime:0,drawings:createDrawingState(),vw:1280,ground:547,width:1280,height:720,scale:1,dpr:1};
drawScene(pen,frame);writeFileSync('/tmp/linea-review/idle.png',canvas.toBuffer('image/png'));
p.x=2390;frame.cam=p.x-410;frame.state='playing';frame.askTime=.8;frame.drawings.active=PUZZLES[0];frame.drawings.age=.9;p.mood='ask';
drawScene(pen,frame);writeFileSync('/tmp/linea-review/artist.png',canvas.toBuffer('image/png'));
p.x=850;p.y=160;p.grounded=false;p.vx=260;frame.cam=p.x-410;frame.askTime=0;frame.drawings.active=null;p.mood='determined';
drawScene(pen,frame);writeFileSync('/tmp/linea-review/jump.png',canvas.toBuffer('image/png'));
console.log('Rendered idle, artist, and jump frames to /tmp/linea-review');

p.x=8660;p.y=250;p.grounded=true;p.mood='delighted';frame.cam=p.x-410;frame.ground=660;frame.time=4;frame.drawings.done=new Set(['bridge','stairs','spring','lift']);drawScene(pen,frame);writeFileSync('/tmp/linea-review/lift.png',canvas.toBuffer('image/png'));
p.x=5500;p.y=0;p.mood='impatient';frame.cam=p.x-410;frame.ground=547;frame.drawings.active=PUZZLES[1];frame.drawings.age=1.6;drawScene(pen,frame);writeFileSync('/tmp/linea-review/stairs.png',canvas.toBuffer('image/png'));
// A contact sheet makes the changes in silhouette across the walk cycle reviewable.
const strip=createCanvas(1440,360),ctx=strip.getContext('2d');
const tile=createCanvas(240,360),tp=tile.getContext('2d');
for(let i=0;i<6;i++){
  const actor=createPlayer();actor.x=430;actor.walk=i*Math.PI/3;actor.vx=260;actor.mood=i<4?'neutral':i===4?'impatient':'delighted';
  drawScene(tp,{...frame,p:actor,cam:310,vw:240,width:240,height:360,ground:300,scale:1,dpr:1,time:i*.12,drawings:createDrawingState()});
  ctx.drawImage(tile,i*240,0);ctx.fillStyle='#fff';ctx.font='12px Arial';ctx.fillText(i<4?'WALK '+(i+1):i===4?'IMPATIENT':'DELIGHTED',i*240+20,340);
}
writeFileSync('/tmp/linea-review/personality.png',strip.toBuffer('image/png'));

const glances=createCanvas(960,360),gp=glances.getContext('2d');
for(let i=0;i<4;i++){
  const actor=createPlayer();actor.idle=5;actor.viewerLook=[0,.5,1,1][i];actor.facing=i===3?-1:1;
  drawScene(tp,{...frame,p:actor,cam:310,vw:240,width:240,height:360,ground:300,scale:1,dpr:1,time:5,askTime:0,drawings:createDrawingState()});
  gp.drawImage(tile,i*240,0);gp.fillStyle='#fff';gp.font='12px Arial';gp.fillText(['RESTING','TURNING','LOOKING AT YOU','FACING LEFT'][i],i*240+20,340);
}
writeFileSync('/tmp/linea-review/idle-glance.png',glances.toBuffer('image/png'));
