import * as THREE from 'three';
import {createPlayer, stepPlayer, respawn, surfaces} from './platformer/physics.js';

const $=id=>document.getElementById(id);
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
let width=innerWidth,height=innerHeight,dpr=1,scale=1,vw=1280,ground=550;
let p=createPlayer(),state='idle',cam=0,time=0,elapsed=0,repaired=false,repairTime=-1,fallTime=0,askTime=0;
let muted=true,audio=null;
const input={left:false,right:false,jump:false};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize(){width=$('stage').clientWidth;height=$('stage').clientHeight;dpr=Math.min(devicePixelRatio,2);scale=Math.min(height/720,width/650);vw=width/scale;ground=Math.min(height*.76,height-135)/scale;sheet.width=Math.round(width*dpr);sheet.height=Math.round(height*dpr);renderer.setSize(width,height,false);}
new ResizeObserver(resize).observe($('stage'));resize();cam=p.x-vw*.58;

function sound(freq,duration=.1,volume=.06,end=freq){if(muted)return;audio ||= new AudioContext();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='triangle';o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,end),audio.currentTime+duration);g.gain.setValueAtTime(volume,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}
function mutter(){[0,.13,.27,.4].forEach((delay,i)=>setTimeout(()=>sound([180,260,210,330][i],.12,.07,[300,150,320,160][i]),delay*1000));}
$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-pressed',String(!muted));if(!muted)sound(330,.12);};
function clearInput(){input.left=input.right=input.jump=false;}
function setState(next){state=next;$('intro').hidden=next!=='idle';$('end').hidden=next!=='over';$('pause-panel').hidden=next!=='paused';$('pause').hidden=!['playing','paused'].includes(next);$('pause').textContent=next==='paused'?'▶':'Ⅱ';$('pause').setAttribute('aria-label',next==='paused'?'Resume game':'Pause game');document.body.classList.toggle('playing',next==='playing');clearInput();}
function start(){p=createPlayer();elapsed=0;repaired=false;repairTime=-1;fallTime=0;setState('playing');$('hint').textContent='Take a walk. The line has a few ideas.';sound(320,.16,.04,450);}
function pause(){if(state==='playing')setState('paused');else if(state==='paused')setState('playing');}
function jump(){if(state==='idle'){start();return;}if(state==='playing'&&!fallTime){p.buffer=.14;input.jump=true;}}
function ask(){if(state!=='playing'||fallTime)return;askTime=.95;mutter();if(!repaired&&repairTime<0&&p.x>2280&&p.x<2535&&p.grounded){repairTime=0;$('hint').textContent='All right, all right. A little help from above.';}else{$('hint').textContent='The artist seems to think you can handle this one.';}}
$('play').onclick=start;$('replay').onclick=start;$('restart').onclick=start;$('pause').onclick=pause;$('resume').onclick=pause;$('touch-ask').onclick=ask;
const keys={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump'};
window.addEventListener('keydown',e=>{if(keys[e.code]||['Enter','KeyE','Escape','KeyP','KeyR'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Enter'){if(state==='idle'||state==='over')start();else if(state==='paused')pause();return;}if(e.code==='Escape'||e.code==='KeyP'){pause();return;}if(e.code==='KeyR'){start();return;}if(e.code==='KeyE'){ask();return;}const key=keys[e.code];if(key==='jump')jump();else if(key&&state==='playing')input[key]=true;});
window.addEventListener('keyup',e=>{const key=keys[e.code];if(key)input[key]=false;});
for(const button of document.querySelectorAll('[data-hold]')){button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);const key=button.dataset.hold;if(key==='jump')jump();else if(state==='playing')input[key]=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,()=>input[button.dataset.hold]=false);}
window.addEventListener('blur',()=>{if(state==='playing')setState('paused');});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')setState('paused');});

function render(){
  drawScene(pen,{p,cam,time,state,askTime,fallTime,repairTime,repaired,vw,ground,width,height,scale,dpr});
  texture.needsUpdate=true;renderer.render(scene,camera);
}
function update(dt){
  if(state==='paused')return;
  time+=dt;askTime=Math.max(0,askTime-dt);
  if(state==='playing'){
    elapsed+=dt;
    if(repairTime>=0){repairTime+=dt;if(repairTime>=1.65&&!repaired){repaired=true;$('hint').textContent='There. Try not to break it.';sound(500,.15,.04,650);}}
    if(fallTime>0){fallTime+=dt;if(fallTime>1.1){respawn(p,surfaces(repaired));fallTime=0;$('hint').textContent='Let’s pretend that didn’t happen.';}}
    else{
      const wasGrounded=p.grounded;const result=stepPlayer(p,input,dt,surfaces(repaired));
      if(wasGrounded&&!p.grounded&&p.vy>0)sound(230,.18,.035,510);
      if(!wasGrounded&&p.grounded)sound(115,.07,.04,65);
      if(result.fallen){fallTime=.01;mutter();clearInput();}
      if(result.finished){setState('over');askTime=5;$('summary').textContent=`${Math.floor(elapsed/60)}m ${Math.floor(elapsed%60)}s of wandering · ${p.falls===0?'not a single tumble':p.falls+' little tumble'+(p.falls===1?'':'s')}`;$('hint').textContent='';mutter();}
      if(p.x>2260&&p.x<2500&&!repaired&&repairTime<0){$('hint').textContent='The line is missing. Press E to have a word with the artist.';}
      else if(p.x<2250&&elapsed>5&&!askTime)$('hint').textContent='';
      else if(p.x>2900)$('hint').textContent='';
    }
    const chapter=p.x<1370?0:p.x<2500?1:p.x<3960?2:3;
    $('chapter-no').textContent=String(chapter+1).padStart(2,'0');$('chapter-name').textContent=['THE FIRST STEP','MIND THE GAP','A WORD WITH THE ARTIST','ONE LAST LITTLE WALK'][chapter];
  }
  const target=p.x-vw*(state==='idle'?.58:.32);
  cam+= (target-cam)*Math.min(1,dt*(reduced?20:4));
}
let last=performance.now(),accumulator=0;
function tick(now){const dt=Math.min(.05,(now-last)/1000);last=now;accumulator+=dt;while(accumulator>=1/120){update(1/120);accumulator-=1/120;}render();requestAnimationFrame(tick);}
setState('idle');render();requestAnimationFrame(tick);
