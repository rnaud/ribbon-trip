import {createCanvas} from '@napi-rs/canvas';
import {writeFileSync,mkdirSync} from 'node:fs';
import {drawScene} from '../src/platformer/drawing.js';
import {createDrawingState,PUZZLES} from '../src/platformer/puzzles.js';
import {createPlayer} from '../src/platformer/physics.js';
mkdirSync('/tmp/linea-review',{recursive:true});
const canvas=createCanvas(1280,720),pen=canvas.getContext('2d');
const p=createPlayer();p.x=2476;p.mood='impatient';p.viewerLook=1;p.waiting=7;
const frame={p,cam:p.x-560,time:7,state:'playing',askTime:0,fallTime:0,drawings:createDrawingState(),vw:1280/.72,ground:547/.72,width:1280,height:720,scale:.72,dpr:1};
drawScene(pen,frame);writeFileSync('/tmp/linea-review/autonomous-cartoon.png',canvas.toBuffer('image/png'));
p.mood='watch';p.viewerLook=0;frame.drawings.active=PUZZLES[0];frame.drawings.age=1.1;
drawScene(pen,frame);writeFileSync('/tmp/linea-review/drawing-bridge.png',canvas.toBuffer('image/png'));
const strip=createCanvas(960,360),ctx=strip.getContext('2d'),tile=createCanvas(240,360),tp=tile.getContext('2d');
for(let i=0;i<4;i++){
  const actor=createPlayer();actor.mood=['curious','watch','impatient','delighted'][i];actor.facing=i===1?-1:1;
  drawScene(tp,{...frame,p:actor,cam:310,vw:240,width:240,height:360,ground:300,scale:1,dpr:1,drawings:createDrawingState()});
  ctx.drawImage(tile,i*240,0);ctx.fillStyle='#fff';ctx.font='12px Arial';ctx.fillText(['THINKING','THINKING · LEFT','COMPLAINING','THANK YOU'][i],i*240+15,340);
}
writeFileSync('/tmp/linea-review/occlusion-poses.png',strip.toBuffer('image/png'));
console.log('Rendered autonomous scenes and hand occlusion poses in /tmp/linea-review');
