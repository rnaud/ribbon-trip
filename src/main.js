import * as THREE from 'three';
import {createPlayer, stepPlayer, surfaces} from './platformer/physics.js';

const $=id=>document.getElementById(id);
import {createDrawingState, nearbyPuzzle, requestDrawing, advanceDrawing} from './platformer/puzzles.js';
import {updateIdleActing, updateActing} from './platformer/acting.js';
import {drawScene} from './platformer/drawing.js';
const sheet=document.createElement('canvas');
const pen=sheet.getContext('2d');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,alpha:false});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace;
const texture=new THREE.CanvasTexture(sheet);texture.colorSpace=THREE.SRGBColorSpace;
texture.minFilter=THREE.LinearFilter;texture.magFilter=THREE.LinearFilter;
const scene=new THREE.Scene();
const camera=new THREE.OrthographicCamera(-1,1,1,-1,0,2);camera.position.z=1;
scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.MeshBasicMaterial({map:texture,depthTest:false})));
let width=innerWidth,height=innerHeight,dpr=1,scale=1,vw=1280,ground=550,baseGround=550,viewY=0;
let p=createPlayer(),state='idle',cam=0,time=0,elapsed=0,drawings=createDrawingState(),fallTime=0,askTime=0;
let muted=true,audio=null;
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){width=$('stage').clientWidth;height=$('stage').clientHeight;dpr=Math.min(devicePixelRatio,2);scale=Math.min(height/1000,width/900);vw=width/scale;baseGround=Math.min(height*.76,height-135)/scale;ground=baseGround;sheet.width=Math.round(width*dpr);sheet.height=Math.round(height*dpr);renderer.setSize(width,height,false);}
new ResizeObserver(resize).observe($('stage'));resize();cam=p.x-vw*.58;

function sound(freq,duration=.1,volume=.06,end=freq){if(muted)return;audio ||= new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function mutter(){[0,.13,.27,.4].forEach((delay,i)=>setTimeout(()=>sound([180,260,210,330][i],.12,.07,[300,150,320,160][i]),delay*1000));}
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!muted));if(!muted)sound(330,.12);};
function setState(next){state=next;$('intro').hidden=next!=='idle';$('end').hidden=next!=='over';$('pause-panel').hidden=next!=='paused';$('pause').hidden=!['playing','paused'].includes(next);$('pause').textContent=next==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',next==='paused'?'Resume game':'Pause game');document.body.classList.toggle('playing',next==='playing');}
function start(){p=createPlayer();elapsed=0;drawings=createDrawingState();fallTime=0;setState('playing');$('hint').textContent='He does the walking. You help when the line runs out.';sound(320,.16,.04,450);}
function pause(){if(state==='playing')setState('paused');else if(state==='paused')setState('playing');}
function mood(name,duration=1.4){p.mood=name;p.moodTime=duration;}
function ask(){
  if(state!=='playing'||drawings.active)return;
  const q=requestDrawing(drawings,p.x);
  if(!q)return;
  askTime=1.4;mood('watch');mutter();
  $('hint').textContent='All right, all right. The artist is drawing.';
}
$('play').onclick=start;$('replay').onclick=start;$('restart').onclick=start;$('pause').onclick=pause;$('resume').onclick=pause;$('touch-ask').onclick=ask;
$('world').onclick=ask;
window.addEventListener('keydown',e=>{
  if(['Enter','KeyE','Space','Escape','KeyP','KeyR'].includes(e.code))e.preventDefault();
  if(e.repeat)return;
  if(e.code==='Enter'){if(state==='idle'||state==='over')start();else if(state==='paused')pause();return;}
  if(e.code==='Escape'||e.code==='KeyP'){pause();return;}
  if(e.code==='KeyR'){start();return;}
  if(e.code==='KeyE'||e.code==='Space')ask();
});
window.addEventListener('blur',()=>{if(state==='playing')setState('paused');});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')setState('paused');});

function render(){
  drawScene(pen,{p,cam,time,state,askTime,fallTime,drawings,vw,ground,width,height,scale,dpr});
  texture.needsUpdate=true;renderer.render(scene,camera);
}
function update(dt){
  if(state==='paused')return;
  time+=dt;askTime=Math.max(0,askTime-dt);
  if(state==='playing'){
    elapsed+=dt;
    const completed=advanceDrawing(drawings,dt);
    if(completed){if(completed.id==='lift')drawings.liftStartedAt=time;$('hint').textContent=completed.thanks;mood('delighted',1.5);sound(500,.15,.04,650);}
    const result=stepPlayer(p,null,dt,surfaces(drawings,time),drawings.done);
    p.waiting=result.blocked?p.waiting+dt:0;
    p.idle=Math.abs(p.vx)<12?p.idle+dt:0;
    p.moodTime=Math.max(0,p.moodTime-dt);
    const nearby=nearbyPuzzle(p.x,drawings);
    if(p.moodTime===0){
      p.mood=drawings.active?'watch':p.waiting>5?(p.waiting%12>9?'sigh':'impatient'):p.waiting>2?'ask':p.waiting>.4?'curious':p.idle>2?'look':'neutral';
      if(p.waiting>2&&nearby&&!drawings.active)$('hint').textContent=p.waiting>5?'Well? I cannot draw it myself. Help him out.':nearby.hint;
      else if(p.waiting>2&&!nearby)$('hint').textContent='He is waiting for the lift.';
      else if(!drawings.active&&elapsed>5)$('hint').textContent='';
    }
    if(p.waiting===0)p.nextComplaint=3;
    if(p.waiting>(p.nextComplaint??3)&&nearby&&!drawings.active){mutter();p.nextComplaint=p.waiting+8;}
    updateIdleActing(p,dt,{blocked:!!drawings.active,demand:p.waiting>2&&!!nearby});
    if(result.finished&&drawings.done.has('door')){
      p.vx=0;mood('delighted',3);setState('over');
      $('summary').textContent=`Five little favors. ${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s of very strong opinions.`;
      $('hint').textContent='';mutter();
    }
    const chapter=[1370,2500,5260,6440,7990,9300].filter(x=>p.x>=x).length;
    $('chapter-no').textContent=String(chapter+1).padStart(2,'0');
    $('chapter-name').textContent=['A PERFECTLY ORDINARY WALK','MIND THE GAP','A WORD WITH THE ARTIST','A MATTER OF HEIGHT','A WAY DOWN','GOING UP','THE LAST WORD'][chapter];
  }
  const help=nearbyPuzzle(p.x,drawings);
  $('touch-ask').disabled=state!=='playing'||!help||!!drawings.active;
  $('touch-ask').textContent=drawings.active?'DRAWING…':help?'HELP HIM · E':'HE DOES THE WALKING';
  if(state==='idle'){p.idle+=dt;updateIdleActing(p,dt);}
  updateActing(p,dt);
  viewY+=(Math.max(0,p.y-120)*.4-viewY)*Math.min(1,dt*4);ground=baseGround+viewY;
  const target=p.x-vw*(state==='idle'?.58:.32);
  cam+=(target-cam)*Math.min(1,dt*(reduced?20:4));
}
let last=performance.now(),accumulator=0;
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;}render();requestAnimationFrame(tick);}
setState('idle');render();requestAnimationFrame(tick);
