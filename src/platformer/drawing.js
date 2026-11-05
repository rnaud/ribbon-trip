import {actingPose} from './acting.js';
import {armContour} from './poses.js';
import {contourRig} from './rig.js';
import {surfaces} from './physics.js';
import {PUZZLES, drawingTip, drawingProgress, liftHeight} from './puzzles.js';
export const INK='#fffef4';
export const BLUE='#07569b';

export function drawScene(pen, frame) {
const {p,cam,time,state,askTime,fallTime,drawings,vw,ground,width,height,scale,dpr}=frame;
function strokePoints(points){path(c=>{points.forEach(([x,y],i)=>i?c.lineTo(x-cam,ground-y):c.moveTo(x-cam,ground-y));});}
function path(draw){pen.beginPath();draw(pen);pen.stroke();}
function terrain(){
  const list=surfaces(drawings.done,time);pen.beginPath();let previous=null;
  for(const s of list){const a=s.a-cam,b=s.b-cam,y=ground-s.y;if(previous&&previous.b===s.a&&!s.id&&!previous.id){pen.lineTo(a,y);}else pen.moveTo(a,y);pen.lineTo(b,ground-(s.endY??s.y));previous=s;}
  pen.stroke();
  for(const q of PUZZLES){
    if(q.x-cam < -400 || q.x-cam > vw+400)continue;
    if(drawings.done.has(q.id)){
      if(q.id==='door')strokePoints(q.points);
      if(q.id==='lift'){
        const y=ground-liftHeight(time-(drawings.liftStartedAt??0));
        path(c=>{c.moveTo(8695-cam,y);c.lineTo(8695-cam,ground-360);c.bezierCurveTo(8695-cam,ground-380,8730-cam,ground-380,8730-cam,ground-360);c.lineTo(8730-cam,ground-40);});
        path(c=>{c.moveTo(8580-cam,y);c.lineTo(8580-cam,y+18);c.lineTo(8920-cam,y+18);c.lineTo(8920-cam,y);});
      }
    }else if(drawings.active?.id!==q.id){
      pen.save();pen.globalAlpha=.3;pen.setLineDash([3,9]);
      if(q.id==='stairs')strokePoints(q.points);
      else if(q.id==='lift')strokePoints([[8580,0],[8920,0]]);
      else if(q.id==='door')strokePoints(q.points.slice(0,4));
      pen.restore();
    }
  }

}

function character(){
  const x=p.x-cam,y=ground-p.y;
  if(x<-160||x>vw+160)return;
  const pose=actingPose(p);
  const walking=pose.walk;
  const stride=p.footStride??0;
  const bounce=0;
  const gaze=p.viewerLook??0;
  const nod=Math.sin(p.walk*2)*4*walking+pose.nod;
  const lean=(8+Math.sin(p.walk)*4)*walking+pose.lean;
  const project=contourRig(p,time,['playing','paused'].includes(state));
  pen.save();pen.translate(x,y);pen.scale(p.facing,1);
  // Erase only the ground under the figure, allowing its contour to become the ground.
  if(p.grounded){pen.fillStyle=BLUE;pen.fillRect(-27-stride*.4,-3,57+stride*.9,6);pen.fillStyle=INK;}
  pen.translate(0,-bounce);
  if(fallTime>0){pen.rotate(Math.sin(fallTime*7)*.12);}
  // One outline: heel, back, gesturing hand, shoulder, enormous nose, chin, belly, toe.
  const warp=(x,y)=>{
    const h=Math.max(0,Math.min(1,-y/185));
    const arm=x<-32&&y<-80&&y>-175;
    const flourish=pose.laugh*Math.sin(time*11)*11+pose.panic*Math.sin(time*22)*15+pose.annoyed*Math.sin(time*8)*6;
    return project(x+lean*h+(arm?flourish*.25:0),y+nod*h*h+(arm?flourish:0));
  };
  const c={moveTo:(x,y)=>pen.moveTo(...warp(x,y)),lineTo:(x,y)=>pen.lineTo(...warp(x,y)),bezierCurveTo:(a,b,d,e,f,g)=>pen.bezierCurveTo(...warp(a,b),...warp(d,e),...warp(f,g))};
  const backArm=armContour(pose),frontArm=armContour(pose,true);
  pen.beginPath();c.moveTo(-27-stride*.4,bounce);
  c.bezierCurveTo(-19-stride*.3,-13,-21,-39,-22,-66);
  for(const [ax,ay] of backArm)c.lineTo(ax,ay);
  // Morph the profile into a rounded three-quarter face as the head turns.
  // A separate front drawing keeps the nose readable instead of flattening it.
  const headCurve=(side,front)=>c.bezierCurveTo(...side.map((v,i)=>v+(front[i]-v)*gaze));
  headCurve([-44,-163,-28,-184,4,-185],[-42,-166,-26,-185,0,-185]);
  headCurve([27,-187,51,-176,63,-163],[25,-187,39,-174,38,-159]);
  headCurve([76,-148,66,-141,53,-145],[38,-151,35,-145,32,-141]);
  headCurve([43,-148,35,-154,27,-160],[30,-138,27,-135,24,-133]);
  headCurve([34,-147,42,-141,46,-140],[23,-132,21,-131,19,-131]);
  const mouth=pose.mouth*(15+Math.sin(time*15)*5);
  headCurve([37,-137+mouth,28,-141+mouth,24,-145+mouth],[17,-130,15,-130,14,-130]);
  headCurve([24,-134+mouth*.4,15,-131+mouth*.3,10,-130],[13,-130,11,-130,10,-130]);
  for(const [ax,ay] of frontArm)c.lineTo(ax,ay);
  c.bezierCurveTo(28,-36,24,-13,22+stride*.5,0);
  c.lineTo(30+stride*.5,0);pen.fillStyle=BLUE;pen.fill();pen.stroke();pen.fillStyle=INK;
  if(gaze>.2){
    pen.save();pen.globalAlpha=Math.min(1,(gaze-.2)/.55);pen.lineWidth=2.5;
    // Two small lids and a foreshortened nose make the audience glance legible.
    pen.beginPath();c.moveTo(-13,-163);c.bezierCurveTo(-10,-166,-7,-166+pose.annoyed*5,-4,-163+pose.annoyed*3);
    c.moveTo(13,-163);c.bezierCurveTo(16,-166+pose.annoyed*5,19,-166,22,-163);
    c.moveTo(5,-159);c.bezierCurveTo(13,-150,13,-145,3,-147);
    c.moveTo(-2,-138);c.bezierCurveTo(3,-136-pose.annoyed*7,9,-136-pose.annoyed*7,13,-139);pen.stroke();pen.restore();
  }
  // The ink is a silhouette, but the hands still have depth. Repaint their
  // opaque interiors over the head/face, then their visible open contours.
  // Filling closes the attachment internally; stroking must not draw that seam.
  for(const arm of [backArm,frontArm]){
    pen.beginPath();
    arm.forEach(([ax,ay],i)=>i?c.lineTo(ax,ay):c.moveTo(ax,ay));
    pen.fillStyle=BLUE;pen.fill();pen.stroke();
  }
  pen.fillStyle=INK;
  // Expressive action strokes appear only for a complaint or a hard landing.
  if(pose.open>.01){pen.save();pen.globalAlpha=pose.open*.7;path(c=>{c.moveTo(77,-165);c.lineTo(90,-171);c.moveTo(80,-151);c.lineTo(96,-150);});pen.restore();}
  if(p.land>.06){path(c=>{c.moveTo(-43,-12);c.lineTo(-52,-20);c.moveTo(43,-12);c.lineTo(52,-20);});}
  if(!p.grounded&&fallTime===0){ // Feet draw little unfinished curls while airborne.
    path(c=>{c.moveTo(-27-stride*.4,0);c.quadraticCurveTo(-40,3,-44,-4);c.moveTo(30+stride*.5,0);c.quadraticCurveTo(42,3,46,-3);});
  }
  pen.restore();
}

function pencil(){
  const q=drawings.active;if(!q)return;
  const progress=drawingProgress(drawings);
  const points=drawingTip(q,progress);strokePoints(points);
  const tip=points.at(-1),lift=drawings.age<.25?(1-drawings.age/.25)*140:drawings.age>q.duration-.25?(drawings.age-q.duration+.25)*560:0;
  pen.save();pen.translate(tip[0]-cam,ground-tip[1]-lift);pen.rotate(.5);
  pen.fillStyle=BLUE;pen.beginPath();pen.moveTo(0,0);pen.lineTo(-11,-31);pen.lineTo(-11,-650);pen.lineTo(11,-650);pen.lineTo(11,-31);pen.closePath();pen.fill();pen.stroke();
  path(c=>{c.moveTo(-11,-31);c.lineTo(11,-31);c.moveTo(0,-31);c.lineTo(0,-650);});pen.restore();
}
function littleAnnotations(){
  if(state==='idle')return;
  pen.save();pen.font='italic 17px Georgia';pen.globalAlpha=.68;pen.textAlign='center';
  if(p.x<1000)pen.fillText('a perfectly ordinary walk…',1100-cam,ground-85);
  if(p.x>1060&&p.x<1700)pen.fillText('what could go wrong?',1700-cam,ground-85);
  if(!drawings.done.has('bridge')&&p.x>2050&&p.x<2850)pen.fillText('ahem?',2510-cam,ground-110);
  if(p.x>5400&&p.x<6300)pen.fillText('not a chance.',5990-cam,ground-290);
  if(p.x>6670&&p.x<7300)pen.fillText('you expect me to go down there?',7040-cam,ground-310);
  if(p.x>8280&&p.x<8850)pen.fillText('going up…',8695-cam,ground-400);
  pen.restore();
}

pen.setTransform(1,0,0,1,0,0);pen.fillStyle=BLUE;pen.fillRect(0,0,width*dpr,height*dpr);
pen.setTransform(dpr*scale,0,0,dpr*scale,0,0);pen.strokeStyle=INK;pen.fillStyle=INK;pen.lineWidth=3.3;pen.lineCap='round';pen.lineJoin='round';
terrain();littleAnnotations();character();pencil();
}
