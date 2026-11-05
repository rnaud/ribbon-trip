import {surfaces} from './physics.js';
import {PUZZLES, drawingTip, liftHeight} from './puzzles.js';
export const INK='#fffef4';
export const BLUE='#07569b';

export function drawScene(pen, frame) {
const {p,cam,time,state,askTime,fallTime,drawings,vw,ground,width,height,scale,dpr}=frame;
function strokePoints(points){path(c=>{points.forEach(([x,y],i)=>i?c.lineTo(x-cam,ground-y):c.moveTo(x-cam,ground-y));});}
function path(draw){pen.beginPath();draw(pen);pen.stroke();}
function terrain(){
  const list=surfaces(drawings.done,time);pen.beginPath();let previous=null;
  for(const s of list){const a=s.a-cam,b=s.b-cam,y=ground-s.y;if(previous&&previous.b===s.a&&!s.id&&!previous.id){pen.lineTo(a,y);}else pen.moveTo(a,y);pen.lineTo(b,y);previous=s;}
  pen.stroke();
  for(const q of PUZZLES){
    if(q.x-cam < -400 || q.x-cam > vw+400)continue;
    if(drawings.done.has(q.id)){
      if(q.id==='spring'||q.id==='door')strokePoints(q.points);
      if(q.id==='lift'){
        const y=ground-liftHeight(time);
        path(c=>{c.moveTo(8695-cam,y);c.lineTo(8695-cam,ground-360);c.bezierCurveTo(8695-cam,ground-380,8730-cam,ground-380,8730-cam,ground-360);c.lineTo(8730-cam,ground-40);});
        path(c=>{c.moveTo(8580-cam,y);c.lineTo(8580-cam,y+18);c.lineTo(8810-cam,y+18);c.lineTo(8810-cam,y);});
      }
    }else if(drawings.active?.id!==q.id){
      pen.save();pen.globalAlpha=.3;pen.setLineDash([3,9]);
      if(q.id==='stairs')strokePoints(q.points);
      else if(q.id==='lift')strokePoints([[8580,0],[8810,0]]);
      else if(q.id==='door')strokePoints(q.points.slice(0,4));
      pen.restore();
    }
  }

}

function character(){
  const x=p.x-cam,y=ground-p.y;
  if(x<-160||x>vw+160)return;
  const walking=Math.abs(p.vx)>10&&p.grounded&&state==='playing';
  const stride=walking?Math.sin(p.walk)*18: p.mood==='tap'?Math.sin(time*11)*3:0;
  const bounce=0;
  const emotion=p.mood??'neutral';
  const gesture=askTime>0||state==='over'||['impatient','panic','delighted','surprised','shrug'].includes(emotion);
  const pointing=['curious','watch','ask'].includes(emotion);
  const nod=walking?Math.sin(p.walk*2)*4:['look','watch','curious'].includes(emotion)?-8:emotion==='embarrassed'?10:0;
  const lean=walking?8+Math.sin(p.walk)*4:pointing?9:emotion==='embarrassed'?12:0;
  const squish=p.anticipation>0?.22*Math.sin(p.anticipation/.07*Math.PI):p.land>0?Math.sin(p.land/.15*Math.PI)*.16:0;
  pen.save();pen.translate(x,y);pen.scale(p.facing,1);
  // Erase only the ground under the figure, allowing its contour to become the ground.
  if(p.grounded){pen.fillStyle=BLUE;pen.fillRect(-27-stride*.4,-3,57+stride*.9,6);pen.fillStyle=INK;}
  pen.translate(0,-bounce);pen.scale(1+squish,1-squish);
  if(fallTime>0){pen.rotate(Math.sin(fallTime*7)*.12);}
  // One outline: heel, back, gesturing hand, shoulder, enormous nose, chin, belly, toe.
  const warp=(x,y)=>{
    const h=Math.max(0,Math.min(1,-y/185));
    const arm=x<-32&&y<-80&&y>-175;
    const flourish=emotion==='delighted'?Math.sin(time*11)*11:emotion==='panic'?Math.sin(time*22)*15:emotion==='impatient'?Math.sin(time*8)*6:emotion==='shrug'?12:0;
    return [x+lean*h+(arm?flourish*.25:0),y+nod*h*h+(arm?flourish:0)];
  };
  const c={moveTo:(x,y)=>pen.moveTo(...warp(x,y)),lineTo:(x,y)=>pen.lineTo(...warp(x,y)),bezierCurveTo:(a,b,d,e,f,g)=>pen.bezierCurveTo(...warp(a,b),...warp(d,e),...warp(f,g))};
  pen.beginPath();c.moveTo(-27-stride*.4,bounce);
  c.bezierCurveTo(-19-stride*.3,-13,-21,-39,-22,-66);
  if(pointing){
    c.bezierCurveTo(-26,-88,-42,-123,-48,-143);
    c.lineTo(-23,-158);c.bezierCurveTo(-12,-164,-10,-159,-20,-153);
    c.lineTo(-32,-144);c.bezierCurveTo(-23,-146,-20,-141,-30,-137);
    c.lineTo(-34,-135);c.bezierCurveTo(-28,-124,-19,-116,-19,-112);
  }else if(gesture){
    c.bezierCurveTo(-29,-88,-56,-123,-69,-142);
    c.bezierCurveTo(-81,-143,-84,-150,-77,-152);
    c.lineTo(-65,-148);c.bezierCurveTo(-78,-159,-77,-165,-71,-162);
    c.lineTo(-57,-151);c.bezierCurveTo(-64,-167,-59,-170,-55,-163);
    c.lineTo(-48,-145);c.bezierCurveTo(-43,-133,-27,-118,-19,-112);
  }else{
    const swing=walking?Math.sin(p.walk)*9:0;
    c.bezierCurveTo(-25,-79,-37,-90,-44,-87+swing);
    c.bezierCurveTo(-51,-80+swing,-59,-80+swing,-55,-88+swing);
    c.lineTo(-47,-98+swing);c.bezierCurveTo(-59,-91+swing,-63,-94+swing,-55,-101+swing);
    c.lineTo(-43,-108+swing);c.bezierCurveTo(-53,-108+swing,-55,-114+swing,-46,-114+swing);
    c.bezierCurveTo(-34,-113+swing,-24,-104,-20,-99);
    c.bezierCurveTo(-25,-117,-27,-129,-29,-139);
  }
  // The forehead and nose are a single long, rounded lobe; no separate eyes or hair.
  c.bezierCurveTo(-44,-163,-28,-184,4,-185);
  c.bezierCurveTo(27,-187,51,-176,63,-163);
  c.bezierCurveTo(76,-148,66,-141,53,-145);
  c.bezierCurveTo(43,-148,35,-154,27,-160);
  c.bezierCurveTo(34,-147,42,-141,46,-140);
  const mouth=['impatient','panic','ask','delighted'].includes(emotion)?5+Math.sin(time*18)*3:0;
  c.bezierCurveTo(37,-137+mouth,28,-141+mouth,24,-145);
  c.bezierCurveTo(24,-134,15,-131,10,-130);
  c.bezierCurveTo(19,-109,27,-88,27,-63);
  c.bezierCurveTo(28,-36,24,-13,22+stride*.5,0);
  c.lineTo(30+stride*.5,0);pen.fillStyle=BLUE;pen.fill();pen.stroke();pen.fillStyle=INK;
  // Expressive action strokes appear only for a complaint or a hard landing.
  if(gesture){path(c=>{c.moveTo(77,-165);c.lineTo(90,-171);c.moveTo(80,-151);c.lineTo(96,-150);c.moveTo(76,-138);c.lineTo(86,-131);});}
  if(p.land>.06){path(c=>{c.moveTo(-43,-12);c.lineTo(-52,-20);c.moveTo(43,-12);c.lineTo(52,-20);});}
  if(!p.grounded&&fallTime===0){ // Feet draw little unfinished curls while airborne.
    path(c=>{c.moveTo(-27-stride*.4,0);c.quadraticCurveTo(-40,3,-44,-4);c.moveTo(30+stride*.5,0);c.quadraticCurveTo(42,3,46,-3);});
  }
  if(['curious','look','watch','embarrassed','impatient','panic','delighted','shrug'].includes(emotion)){
    pen.save();pen.font='italic 27px Georgia';pen.textAlign='center';
    const symbol={curious:'?',look:'…',watch:'…',embarrassed:'hm.',impatient:'!?',panic:'!',delighted:'ha!',shrug:'…'}[emotion];
    pen.fillText(symbol,6,-211+Math.sin(time*3)*2);pen.restore();
  }
  pen.restore();
}

function pencil(){
  const q=drawings.active;if(!q)return;
  const progress=Math.max(0,Math.min(1,(drawings.age-.25)/(q.duration-.5)));
  const points=drawingTip(q,progress);strokePoints(points);
  const tip=points.at(-1),lift=drawings.age<.25?(1-drawings.age/.25)*140:drawings.age>q.duration-.25?(drawings.age-q.duration+.25)*560:0;
  pen.save();pen.translate(tip[0]-cam,ground-tip[1]-lift);pen.rotate(.5);
  pen.fillStyle=BLUE;pen.beginPath();pen.moveTo(0,0);pen.lineTo(-11,-31);pen.lineTo(-11,-650);pen.lineTo(11,-650);pen.lineTo(11,-31);pen.closePath();pen.fill();pen.stroke();
  path(c=>{c.moveTo(-11,-31);c.lineTo(11,-31);c.moveTo(0,-31);c.lineTo(0,-650);});pen.restore();
}
function littleAnnotations(){
  if(state==='idle')return;
  pen.save();pen.font='italic 17px Georgia';pen.globalAlpha=.68;pen.textAlign='center';
  if(p.x<1000)pen.fillText('a small step…',865-cam,ground-105);
  if(p.x>1060&&p.x<1700)pen.fillText('…a little leap.',1300-cam,ground-110);
  if(!drawings.done.has('bridge')&&p.x>2050&&p.x<2850)pen.fillText('ahem?',2510-cam,ground-110);
  if(p.x>5400&&p.x<6300)pen.fillText('not a chance.',5990-cam,ground-290);
  if(p.x>6670&&p.x<7300)pen.fillText('boing?',6900-cam,ground-125);
  if(p.x>8280&&p.x<8850)pen.fillText('going up…',8695-cam,ground-400);
  pen.restore();
}

pen.setTransform(1,0,0,1,0,0);pen.fillStyle=BLUE;pen.fillRect(0,0,width*dpr,height*dpr);
pen.setTransform(dpr*scale,0,0,dpr*scale,0,0);pen.strokeStyle=INK;pen.fillStyle=INK;pen.lineWidth=3.3;pen.lineCap='round';pen.lineJoin='round';
terrain();littleAnnotations();character();pencil();
}
