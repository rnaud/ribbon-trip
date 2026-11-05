import {surfaces, FINISH, REPAIR} from './physics.js';
export const INK='#fffef4';
export const BLUE='#07569b';

export function drawScene(pen, frame) {
const {p,cam,time,state,askTime,fallTime,repairTime,repaired,vw,ground,width,height,scale,dpr}=frame;
function path(draw){pen.beginPath();draw(pen);pen.stroke();}
function terrain(){
  const list=surfaces(repaired);pen.beginPath();let previous=null;
  for(const s of list){const a=s.a-cam,b=s.b-cam,y=ground-s.y;if(previous&&previous.b===s.a){pen.lineTo(a,y);}else pen.moveTo(a,y);pen.lineTo(b,y);previous=s;}
  pen.stroke();
  // At the unfinished stretch the artist leaves a little curl of ink.
  if(!repaired){path(c=>{c.moveTo(2488-cam,ground);c.bezierCurveTo(2505-cam,ground,2507-cam,ground-7,2500-cam,ground-11);});}
  // The final line draws its own doorway.
  path(c=>{c.moveTo(FINISH-cam,ground);c.lineTo(FINISH-cam,ground-205);c.quadraticCurveTo(FINISH+45-cam,ground-215,FINISH+90-cam,ground-205);c.lineTo(FINISH+90-cam,ground);});
  pen.beginPath();pen.arc(FINISH+69-cam,ground-93,2,0,Math.PI*2);pen.fill();
}

function character(){
  const x=p.x-cam,y=ground-p.y;
  if(x<-160||x>vw+160)return;
  const walking=Math.abs(p.vx)>10&&p.grounded&&state==='playing';
  const stride=walking?Math.sin(p.walk)*9:0;
  const bounce=0;
  const gesture=askTime>0||state==='over';
  const squish=p.land>0?Math.sin(p.land/.15*Math.PI)*.08:0;
  pen.save();pen.translate(x,y);pen.scale(p.facing,1);
  // Erase only the ground under the figure, allowing its contour to become the ground.
  if(p.grounded){pen.fillStyle=BLUE;pen.fillRect(-27-stride*.4,-3,57+stride*.9,6);pen.fillStyle=INK;}
  pen.translate(0,-bounce);pen.scale(1+squish,1-squish);
  if(fallTime>0){pen.rotate(Math.sin(fallTime*7)*.12);}
  // One outline: heel, back, gesturing hand, shoulder, enormous nose, chin, belly, toe.
  pen.beginPath();pen.moveTo(-27-stride*.4,bounce);
  pen.bezierCurveTo(-19-stride*.3,-13,-21,-39,-22,-66);
  if(gesture){
    pen.bezierCurveTo(-29,-88,-56,-123,-69,-142);
    pen.bezierCurveTo(-81,-143,-84,-150,-77,-152);
    pen.lineTo(-65,-148);pen.bezierCurveTo(-78,-159,-77,-165,-71,-162);
    pen.lineTo(-57,-151);pen.bezierCurveTo(-64,-167,-59,-170,-55,-163);
    pen.lineTo(-48,-145);pen.bezierCurveTo(-43,-133,-27,-118,-19,-112);
  }else{
    const swing=walking?Math.sin(p.walk)*9:0;
    pen.bezierCurveTo(-25,-79,-37,-90,-44,-87+swing);
    pen.bezierCurveTo(-51,-80+swing,-59,-80+swing,-55,-88+swing);
    pen.lineTo(-47,-98+swing);pen.bezierCurveTo(-59,-91+swing,-63,-94+swing,-55,-101+swing);
    pen.lineTo(-43,-108+swing);pen.bezierCurveTo(-53,-108+swing,-55,-114+swing,-46,-114+swing);
    pen.bezierCurveTo(-34,-113+swing,-24,-104,-20,-99);
    pen.bezierCurveTo(-25,-117,-27,-129,-29,-139);
  }
  // The forehead and nose are a single long, rounded lobe; no separate eyes or hair.
  pen.bezierCurveTo(-44,-163,-28,-184,4,-185);
  pen.bezierCurveTo(27,-187,51,-176,63,-163);
  pen.bezierCurveTo(76,-148,66,-141,53,-145);
  pen.bezierCurveTo(43,-148,35,-154,27,-160);
  pen.bezierCurveTo(34,-147,42,-141,46,-140);
  pen.bezierCurveTo(37,-137,28,-141,24,-145);
  pen.bezierCurveTo(24,-134,15,-131,10,-130);
  pen.bezierCurveTo(19,-109,27,-88,27,-63);
  pen.bezierCurveTo(28,-36,24,-13,22+stride*.5,0);
  pen.lineTo(30+stride*.5,0);pen.fillStyle=BLUE;pen.fill();pen.stroke();pen.fillStyle=INK;
  // Expressive action strokes appear only for a complaint or a hard landing.
  if(gesture){path(c=>{c.moveTo(77,-165);c.lineTo(90,-171);c.moveTo(80,-151);c.lineTo(96,-150);c.moveTo(76,-138);c.lineTo(86,-131);});}
  if(p.land>.06){path(c=>{c.moveTo(-43,-12);c.lineTo(-52,-20);c.moveTo(43,-12);c.lineTo(52,-20);});}
  if(!p.grounded&&fallTime===0){ // Feet draw little unfinished curls while airborne.
    path(c=>{c.moveTo(-27-stride*.4,0);c.quadraticCurveTo(-40,3,-44,-4);c.moveTo(30+stride*.5,0);c.quadraticCurveTo(42,3,46,-3);});
  }
  pen.restore();
}

function pencil(){
  if(repairTime<0||repairTime>2.2)return;
  const progress=Math.min(1,Math.max(0,(repairTime-.3)/1.35));
  const x=REPAIR.a+(REPAIR.b-REPAIR.a)*progress-cam;
  const lift=repairTime<.3?(1-repairTime/.3)*120:repairTime>1.65?(repairTime-1.65)*300:0;
  pen.save();pen.translate(x,ground-lift);pen.rotate(.55);
  // An oversized contour pencil enters the frame as the invisible artist's tool.
  pen.fillStyle=BLUE;pen.beginPath();pen.moveTo(0,0);pen.lineTo(-11,-31);pen.lineTo(-11,-390);pen.lineTo(11,-390);pen.lineTo(11,-31);pen.closePath();pen.fill();pen.stroke();
  path(c=>{c.moveTo(-11,-31);c.lineTo(11,-31);c.moveTo(0,-31);c.lineTo(0,-390);});pen.restore();
  path(c=>{c.moveTo(REPAIR.a-cam,ground);c.lineTo(REPAIR.a+(REPAIR.b-REPAIR.a)*progress-cam,ground);});
}
function littleAnnotations(){
  if(state==='idle')return;
  pen.save();pen.font='italic 17px Georgia';pen.globalAlpha=.68;pen.textAlign='center';
  if(p.x<1000)pen.fillText('a small step…',865-cam,ground-105);
  if(p.x>1060&&p.x<1700)pen.fillText('…a little leap.',1300-cam,ground-110);
  if(!repaired&&p.x>2050)pen.fillText('ahem?',2510-cam,ground-110);
  if(p.x>3890&&p.x<4650)pen.fillText('nearly there.',4545-cam,ground-185);
  pen.restore();
}

pen.setTransform(1,0,0,1,0,0);pen.fillStyle=BLUE;pen.fillRect(0,0,width*dpr,height*dpr);
pen.setTransform(dpr*scale,0,0,dpr*scale,0,0);pen.strokeStyle=INK;pen.fillStyle=INK;pen.lineWidth=3.3;pen.lineCap='round';pen.lineJoin='round';
terrain();littleAnnotations();character();pencil();
}
