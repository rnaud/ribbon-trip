import * as THREE from 'three';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const renderer = new THREE.WebGLRenderer({ canvas: $('world'), antialias: true });
renderer.setPixelRatio(1); // Keep vector strokes one full CSS pixel wide.
const camera = new THREE.OrthographicCamera(-19, 19, 13, -5, .1, 100);
camera.position.set(0, 4, 30);
camera.lookAt(0, 4, 0);
const ink = new THREE.LineBasicMaterial({ color: 0xffffff });
const faint = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
function line(points, parent = scene, material = ink, closed = false) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
  const object = closed ? new THREE.LineLoop(geometry, material) : new THREE.Line(geometry, material);
  parent.add(object);
  return object;
}
function oval(x, y, rx, ry, parent, material = ink, segments = 14) {
  return line(Array.from({ length: segments }, (_, i) => {
    const a = i / segments * Math.PI * 2;
    return [x + Math.cos(a) * rx, y + Math.sin(a) * ry, 0];
  }), parent, material, true);
}
let seed = 48;
function rand() { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }
const trackX = z => -7 + (4 - z) * .45;
// One white thread in empty black space. The bends are drawn, never shaded.
const ribbon = line(Array.from({length: 241}, (_, i) => [-30 + i * .25, 0, 0]));
const background = new THREE.Group(); scene.add(background);
const mushrooms = [];
function mushroom(x, y, scale, tilt) {
  const g = new THREE.Group(); background.add(g);
  g.position.set(x, y, -4); g.scale.setScalar(scale); g.rotation.z = tilt;
  line([[-.3,0,0],[-.18,1.9,0],[-1.7,1.9,0],[-1.35,2.65,0],[-.7,3.2,0],[0,3.4,0],[.7,3.2,0],[1.35,2.65,0],[1.7,1.9,0],[.18,1.9,0],[.3,0,0]],g,faint,true);
  line([[-1.7,1.9,0],[0,2.15,.3],[1.7,1.9,0]],g,faint);
  oval(-.65,2.65,.2,.13,g,faint,7); oval(.45,2.9,.25,.13,g,faint,7);
  mushrooms.push(g);
}
mushroom(-15,1.1,1.1,-.15); mushroom(3,3.3,.85,.22); mushroom(15,1.5,1.6,-.18);
const floaters = [];
for (const [x,y,r] of [[-12,8,.35],[8,8,.45],[19,6,.25],[-1,7,.18]]) {
  const g = new THREE.Group(); background.add(g); g.position.set(x,y,-3);
  line([[0,r,0],[r,0,0],[0,-r,0],[-r,0,0]],g,faint,true);floaters.push(g);
}
// Disconnected, impossible staircases preserve the platformer fever dream in line art.
line([[6,1,-4],[7,1,-4],[7,2,-4],[8,2,-4],[8,3,-4],[9,3,-4],[9,4,-4],[10,4,-4]],background,faint);
line([[-20,5,-4],[-18,5,-4],[-17,6,-4],[-15,6,-4]],background,faint);
// An angular paper creature, built entirely from white strokes.
const player = new THREE.Group(); scene.add(player);
const torso = new THREE.Group(); player.add(torso);
line([[-.4,.85,0],[-.7,1.7,0],[-.4,2.2,0],[.4,2.2,0],[.7,1.7,0],[.4,.85,0]],torso,ink,true);
line([[-.42,2.1,0],[-.72,3.2,0],[-.3,2.98,0],[-.1,2.2,0]],torso);
line([[.08,2.2,0],[.35,3.28,0],[.64,3.45,0],[.43,2.15,0]],torso);
line([[-.35,1.9,.01],[-.25,1.9,.01]],torso);line([[.18,1.9,.01],[.28,1.9,.01]],torso);
line([[-.13,1.6,.01],[.12,1.5,.01],[.35,1.65,.01]],torso);
line([[-.4,.9,0],[0,.5,0],[.4,.9,0]],torso);
const arms = [line([[-.5,1.4,0],[-.95,.95,0],[-1.1,1.25,0]],torso),line([[.5,1.4,0],[.9,1.05,0],[1.1,1.5,0]],torso)];
const feet = [new THREE.Group(),new THREE.Group()];
feet.forEach((f,i)=>{player.add(f);const side=i?1:-1;line([[side*.2,.65,0],[side*.35,.18,0],[side*.8,.05,0],[side*.2,.05,0]],f);});
const obstacles = [];
function obstacle(type,z) {
  const g = new THREE.Group();scene.add(g);g.position.set(trackX(z),0,0);
  if(type==='jump') line([[-.8,0,0],[-.8,1,0],[.8,1,0],[.8,0,0]],g);
  else if(type==='duck') {line([[-.7,0,0],[-.7,2.8,0],[.7,2.8,0],[.7,0,0]],g);line([[-.7,1.25,0],[.7,1.25,0]],g);}
  else {oval(0,1.35,.85,1.35,g);line([[-.55,.3,0],[.55,2.4,0]],g);}
  obstacles.push({g,type,z,done:false});
}
let playing=false,paused=false,score=0,streak=0,energy=5,elapsed=0,spawnTimer=0,action=null,actionTime=0,feedbackTime=0,sound=false,audio,beat=-1;
const playerZ=4;
function updateHud(){$('score').textContent=String(score).padStart(5,'0');$('streak').innerHTML=streak+'<span>×</span>';$('energy').textContent='● '.repeat(energy)+'○ '.repeat(5-energy);}
function tone(freq,time,duration,volume=.1,type='sine'){if(!audio||!sound)return;const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(gain).connect(audio.destination);o.start(time);o.stop(time+duration);}
function enableSound(){audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();sound=true;syncSound();}
function syncSound(){$('sound').classList.toggle('on',sound);$('sound').querySelector('span').textContent=sound?'SOUND ON':'SOUND OFF';}
$('sound').onclick=()=>{if(!sound)enableSound();else{sound=false;syncSound();}};
function feedback(text){$('feedback').textContent=text;feedbackTime=1;}
function removeObstacle(o){scene.remove(o.g);o.g.traverse(m=>{if(m.isLine)m.geometry.dispose();});}
function start(){obstacles.forEach(removeObstacle);obstacles.length=0;score=0;streak=0;energy=5;elapsed=0;spawnTimer=0;beat=-1;action=null;playing=true;paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('end').classList.add('hidden');$('pause').classList.remove('hidden');document.body.classList.add('playing');$('status').innerHTML='FOLLOW THE FEELING <span>✦</span>';enableSound();updateHud();obstacle('jump',playerZ-12*(60/112)*6);feedback('HERE WE GO');}
function finish(){playing=false;$('end').classList.remove('hidden');$('pause').classList.add('hidden');$('result').textContent=`${score.toLocaleString()} points · ${Math.floor(elapsed)} seconds of beautiful weirdness`;$('status').innerHTML='THAT WAS A TRIP <span>✦</span>';}
function pause(){if(!playing)return;paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');feedback(paused?'TAKE A BREATHER':'BACK IN THE FLOW');}
function move(type){if(!playing||paused)return;action=type;actionTime=0;document.querySelectorAll('.move-card').forEach(e=>e.classList.toggle('active',e.dataset.move===type));tone(type==='jump'?660:type==='duck'?165:880,audio?.currentTime||0,.13,.045,'triangle');}
$('play').onclick=start;$('replay').onclick=start;$('pause').onclick=pause;document.querySelectorAll('.move-card').forEach(e=>e.onclick=()=>move(e.dataset.move));
window.addEventListener('keydown',e=>{if(['Space','ArrowDown','ArrowRight','ArrowUp','Enter','Escape','KeyP'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Enter'){if(!playing)start();else if(paused)pause();}if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='Space'||e.code==='ArrowUp')move('jump');if(e.code==='ArrowDown')move('duck');if(e.code==='ArrowRight')move('phase');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)pause();});
const resize=()=>{const r=$('world').getBoundingClientRect();renderer.setSize(r.width,r.height,false);const halfWidth=Math.max(12,9*r.width/r.height);camera.left=-halfWidth;camera.right=halfWidth;camera.top=9;camera.bottom=-9;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('world'));resize();
const clock=new THREE.Clock();let worldTime=0;
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);worldTime+=dt;const active=playing&&!paused;
if(active){elapsed+=dt;spawnTimer+=dt;const b=Math.floor(elapsed/(60/112));if(b!==beat){beat=b;const now=audio?.currentTime||0;tone([130.81,164.81,196,174.61][Math.floor(b/4)%4],now,.22,.1,'triangle');tone(b%4===0?65:330,now,.08,.065);if(b%2===0)tone([523.25,659.25,783.99,587.33][Math.floor(b/2)%4],now+.12,.22,.045);}const spawnInterval=(60/112)*4;if(spawnTimer>=spawnInterval){spawnTimer-=spawnInterval;obstacle(['jump','duck','phase'][Math.floor(rand()*3)],playerZ-12*(60/112)*8+spawnTimer*12);}const speed=12;for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.z+=dt*speed;o.g.position.set(trackX(o.z),0,0);if(!o.done&&o.z>=playerZ){o.done=true;if(action===o.type){streak++;score+=100+Math.min(streak,20)*10;feedback(streak%5===0?'IN THE FLOW!':'NICE! +'+(100+Math.min(streak,20)*10));tone(1046,audio?.currentTime||0,.18,.07);}else{energy--;streak=0;feedback('KEEP FLOWING');tone(80,audio?.currentTime||0,.2,.09,'sawtooth');if(energy<=0)finish();}updateHud();}if(o.z>22){removeObstacle(o);obstacles.splice(i,1);}}}
if(!paused){if(action){actionTime+=dt;if(actionTime>.78){action=null;document.querySelectorAll('.move-card').forEach(e=>e.classList.remove('active'));}}if(feedbackTime>0){feedbackTime-=dt;if(feedbackTime<=0)$('feedback').textContent='';}}
const bob=active?Math.abs(Math.sin(elapsed*11))*.065:Math.sin(worldTime*3)*.045;
player.position.set(-7,.1+bob+(action==='jump'?Math.sin(actionTime/.78*Math.PI)*2.2:0),0);
player.scale.y=action==='duck'?.35:1;
player.rotation.z=action==='phase'?Math.sin(actionTime*10)*.3:Math.sin(worldTime*3)*.035;
player.visible=action!=='phase'||Math.floor(worldTime*12)%3!==0;
feet[0].rotation.z=Math.sin(elapsed*12)*.23;feet[1].rotation.z=-Math.sin(elapsed*12)*.23;
arms[0].rotation.z=Math.sin(worldTime*4)*.08;arms[1].rotation.z=-Math.sin(worldTime*4)*.08;
const points=ribbon.geometry.attributes.position;
for(let i=0;i<points.count;i++) {const x=points.getX(i);const distance=Math.min(1,Math.abs(x+7)/8);points.setY(i,Math.sin(x*.32+worldTime*.7)*.16*distance);}
points.needsUpdate=true;
mushrooms.forEach((m,i)=>{m.rotation.z=Math.sin(worldTime*.35+i)*.13;});
floaters.forEach((f,i)=>{f.rotation.z=worldTime*.2+i;});
renderer.render(scene,camera);}
tick();
