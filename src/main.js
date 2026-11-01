import * as THREE from 'three';

const $ = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c8a6d5');
scene.fog = new THREE.Fog('#c8a6d5', 38, 115);
const renderer = new THREE.WebGLRenderer({canvas: $('world'), antialias:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const camera = new THREE.PerspectiveCamera(48, 1, .1, 180);
camera.position.set(0,7.8,18);
camera.lookAt(0,1,-22);
scene.add(new THREE.HemisphereLight('#fff1cf','#6d427c',2.6));
const sunLight = new THREE.DirectionalLight('#ffe6b2',3.1); sunLight.position.set(-15,25,10); scene.add(sunLight);
const materials = {};
function mat(color, emissive=false){const key=color+emissive;return materials[key] ||= new THREE.MeshStandardMaterial({color,roughness:.8,...(emissive?{emissive:color,emissiveIntensity:.35}:{})});}
function mesh(geometry,color,parent=scene){const m=new THREE.Mesh(geometry,mat(color));parent.add(m);return m;}
function ball(x,y,z,r,color,parent=scene){const m=mesh(new THREE.SphereGeometry(r,20,14),color,parent);m.position.set(x,y,z);return m;}
function cylinder(x,y,z,rt,rb,h,color,parent=scene){const m=mesh(new THREE.CylinderGeometry(rt,rb,h,24),color,parent);m.position.set(x,y,z);return m;}
const pathX=z=>3+Math.sin(-z*.073)*5.2;
const floor = new THREE.PlaneGeometry(250,180,100,70); floor.rotateX(-Math.PI/2);
for(let i=0;i<floor.attributes.position.count;i++){const x=floor.attributes.position.getX(i),z=floor.attributes.position.getZ(i);floor.attributes.position.setY(i,-1.2+Math.sin(x*.08+z*.05)*.65+Math.cos(z*.14)*.35);}
floor.computeVertexNormals();mesh(floor,'#e9ad93');
// A continuous curved ribbon, with contrasting pinstripes along each edge.
function ribbon(offset,width,color,y){const vertices=[],indices=[];for(let i=0;i<=240;i++){const z=20-i*.55;vertices.push(pathX(z)+offset-width/2,y,z,pathX(z)+offset+width/2,y,z);if(i<240){const n=i*2;indices.push(n,n+1,n+2,n+1,n+3,n+2);}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return mesh(g,color);}
ribbon(0,3.65,'#674875',.04);ribbon(-1.88,.14,'#fff1bf',.07);ribbon(1.88,.14,'#fff1bf',.07);ribbon(-1.65,.055,'#eb91ca',.075);ribbon(1.65,.055,'#eb91ca',.075);
const dashes=[];for(let i=0;i<70;i++){const m=mesh(new THREE.BoxGeometry(.045,.015,.6),'#d8a7d1');m.position.set(pathX(15-i*1.8),.08,15-i*1.8);dashes.push(m);}
let seed=48;function rand(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;}
const scenery=[];
function mushroom(x,z,s,color){const g=new THREE.Group();scene.add(g);g.position.set(x,-.65,z);g.scale.setScalar(s);cylinder(0,1.4,0,.24,.46,2.8,'#fff0c9',g);const cap=mesh(new THREE.SphereGeometry(1.55,28,18,0,Math.PI*2,0,Math.PI*.55),color,g);cap.position.y=2.65;cap.scale.y=.65;cylinder(0,2.48,0,1.53,1.2,.12,'#f8ceac',g);for(let j=0;j<7;j++){const a=j*2.4;const r=j===0?0:.95;const dot=ball(Math.cos(a)*r,2.65+.65*Math.sqrt(1.55*1.55-r*r)+.005,Math.sin(a)*r,.23,'#fff0cf',g);dot.scale.y=.25;dot.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(a)*r/2.4025,(dot.position.y-2.65)/1.015,Math.sin(a)*r/2.4025).normalize());}scenery.push({g,z,kind:'mushroom'});return g;}
for(let i=0;i<48;i++){const z=10-rand()*110,side=i%2?1:-1,x=pathX(z)+side*(5+rand()*20);mushroom(x,z,.6+rand()*2.5,['#ed785c','#bd83d4','#f0aa54','#9cac68'][i%4]);}
mushroom(10,-7,2.5,'#f88760');mushroom(-8,-16,3.8,'#b38acd');mushroom(14,-27,4.2,'#f19763');
// Round checker hills give the world a toy-like, almost edible silhouette.
for(let i=0;i<22;i++){const z=-15-rand()*100;const x=pathX(z)+(i%2?1:-1)*(15+rand()*30);const hill=ball(x,-1.5,z,5+rand()*9,['#a6b887','#cf91bd','#c5c58a','#aa90c4'][i%4]);hill.scale.set(1,.5+rand()*.65,1);}
const flowers=[];
for(let i=0;i<38;i++){const z=10-rand()*85,x=pathX(z)+(i%2?1:-1)*(2.8+rand()*6);const g=new THREE.Group();scene.add(g);g.position.set(x,-.5,z);const s=.35+rand()*.65;g.scale.setScalar(s);cylinder(0,.7,0,.05,.07,1.4,'#7f9565',g);for(let j=0;j<6;j++){const a=j*Math.PI/3;const p=ball(Math.cos(a)*.42,1.5+Math.sin(a)*.42,0,.26,['#fff1a0','#e59fc9','#f9c078'][i%3],g);p.scale.z=.35;}ball(0,1.5,.15,.22,'#73557d',g);flowers.push(g);}
// A striped setting sun, orbital hoops, and floating dream fragments.
const sun=ball(-18,21,-85,10,'#ffe1a5');sun.scale.z=.2;
for(let i=0;i<6;i++){const line=mesh(new THREE.BoxGeometry(22,.16+i*.14,.1),'#c8a6d5');line.position.set(-18,15+i*1.3,-82.8);}
for(let i=0;i<9;i++){const g=new THREE.Group();scene.add(g);g.position.set(-35+rand()*70,14+rand()*14,-45-rand()*50);for(let j=0;j<4;j++){const c=ball(j*1.7,Math.sin(j)*.8,0,1.8,'#ead1e3',g);c.scale.set(1.6,.65,.65);}}
const floaters=[];for(let i=0;i<25;i++){const g=mesh(new THREE.OctahedronGeometry(.25+rand()*.3),'#ffebac');g.position.set(-25+rand()*50,5+rand()*18,-15-rand()*70);floaters.push(g);}
for(let i=0;i<3;i++){const torus=mesh(new THREE.TorusGeometry(4+i, .12,12,80),'#f7d5a2');torus.position.set(18-i*17,12+i*3,-45-i*18);torus.rotation.set(.2,i*.5,.5);}
// Original little traveler: a cream bean with antennae, soft shoes, and a curious face.
const player=new THREE.Group();scene.add(player);const body=ball(0,.8,0,.5,'#fff4c9',player);body.scale.set(.85,1.18,.8);ball(-.19,.94,.37,.055,'#42354c',player);ball(.19,.94,.37,.055,'#42354c',player);const smile=mesh(new THREE.TorusGeometry(.1,.018,6,14,Math.PI),'#42354c',player);smile.rotation.z=Math.PI;smile.position.set(0,.79,.405);const feet=[ball(-.24,.2,.08,.22,'#f28a5f',player),ball(.24,.2,.08,.22,'#f28a5f',player)];feet.forEach(f=>f.scale.set(.8,.65,1.5));for(const side of [-1,1]){const a=cylinder(side*.22,1.44,0,.045,.06,.5,'#fff4c9',player);a.rotation.z=side*-.25;ball(side*.28,1.7,0,.1,'#c8df8b',player);const hand=ball(side*.53,.7,0,.14,'#fff4c9',player);hand.scale.set(1,1.5,1);}
const shadow=mesh(new THREE.CircleGeometry(.65,32),'#493452');shadow.rotation.x=-Math.PI/2;shadow.position.y=.09;
const obstacles=[];const colors={jump:'#f8ae62',duck:'#b9da8c',phase:'#d5afff'};
function obstacle(type,z){const g=new THREE.Group();scene.add(g);g.position.set(pathX(z),0,z);if(type==='jump'){const b=mesh(new THREE.BoxGeometry(2.9,.55,.55),colors[type],g);b.position.y=.32;for(let i=0;i<6;i++){const stripe=mesh(new THREE.BoxGeometry(.12,.57,.57),'#fff0bd',g);stripe.position.set(-1.2+i*.48,.32,0);}}else if(type==='duck'){for(const side of [-1,1])cylinder(side*1.5,1.25,0,.085,.085,2.5,colors[type],g);const top=mesh(new THREE.BoxGeometry(3.2,.5,.5),colors[type],g);top.position.y=1.6;for(const side of [-1,1])ball(side*1.5,2.55,0,.16,'#fff4bd',g);}else{const wall=mesh(new THREE.BoxGeometry(2.9,2.7,.18),colors[type],g);wall.position.y=1.35;wall.material=new THREE.MeshStandardMaterial({color:colors[type],transparent:true,opacity:.48,emissive:colors[type],emissiveIntensity:.35});for(let i=0;i<5;i++){const bar=mesh(new THREE.BoxGeometry(.035,2.7,.2),'#fff0ff',g);bar.position.set(-1.3+i*.65,1.35,0);}}obstacles.push({g,type,z,done:false});}
let playing=false,paused=false,score=0,streak=0,energy=5,elapsed=0,spawnTimer=0,action=null,actionTime=0,feedbackTime=0,sound=false,audio,beat=-1;
const playerZ=4;
function updateHud(){$('score').textContent=String(score).padStart(5,'0');$('streak').innerHTML=streak+'<span>×</span>';$('energy').textContent='● '.repeat(energy)+'○ '.repeat(5-energy);}
function tone(freq,time,duration,volume=.1,type='sine'){if(!audio||!sound)return;const o=audio.createOscillator(),gain=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,time);gain.gain.setValueAtTime(volume,time);gain.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(gain).connect(audio.destination);o.start(time);o.stop(time+duration);}
function enableSound(){audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume();sound=true;syncSound();}
function syncSound(){$('sound').classList.toggle('on',sound);$('sound').querySelector('span').textContent=sound?'SOUND ON':'SOUND OFF';}
$('sound').onclick=()=>{if(!sound)enableSound();else{sound=false;syncSound();}};
function feedback(text){$('feedback').textContent=text;feedbackTime=1;}
function removeObstacle(o){scene.remove(o.g);o.g.traverse(m=>{if(m.isMesh){m.geometry.dispose();if(m.material.transparent)m.material.dispose();}});}
function start(){obstacles.forEach(removeObstacle);obstacles.length=0;score=0;streak=0;energy=5;elapsed=0;spawnTimer=0;beat=-1;action=null;playing=true;paused=false;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause game');$('end').classList.add('hidden');$('pause').classList.remove('hidden');document.body.classList.add('playing');$('status').innerHTML='FOLLOW THE FEELING <span>✦</span>';enableSound();updateHud();obstacle('jump',playerZ-12*(60/112)*6);feedback('HERE WE GO');}
function finish(){playing=false;$('end').classList.remove('hidden');$('pause').classList.add('hidden');$('result').textContent=`${score.toLocaleString()} points · ${Math.floor(elapsed)} seconds of beautiful weirdness`;$('status').innerHTML='THAT WAS A TRIP <span>✦</span>';}
function pause(){if(!playing)return;paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';$('pause').setAttribute('aria-label',paused?'Resume game':'Pause game');feedback(paused?'TAKE A BREATHER':'BACK IN THE FLOW');}
function move(type){if(!playing||paused)return;action=type;actionTime=0;document.querySelectorAll('.move-card').forEach(e=>e.classList.toggle('active',e.dataset.move===type));tone(type==='jump'?660:type==='duck'?165:880,audio?.currentTime||0,.13,.045,'triangle');}
$('play').onclick=start;$('replay').onclick=start;$('pause').onclick=pause;document.querySelectorAll('.move-card').forEach(e=>e.onclick=()=>move(e.dataset.move));
window.addEventListener('keydown',e=>{if(['Space','ArrowDown','ArrowRight','ArrowUp','Enter','Escape','KeyP'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='Enter'){if(!playing)start();else if(paused)pause();}if(e.code==='Escape'||e.code==='KeyP')pause();if(e.code==='Space'||e.code==='ArrowUp')move('jump');if(e.code==='ArrowDown')move('duck');if(e.code==='ArrowRight')move('phase');});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)pause();});
const resize=()=>{const r=$('world').getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();};new ResizeObserver(resize).observe($('world'));resize();
const clock=new THREE.Clock();let worldTime=0;
function tick(){requestAnimationFrame(tick);const dt=Math.min(clock.getDelta(),.05);worldTime+=dt;const active=playing&&!paused;
if(active){elapsed+=dt;spawnTimer+=dt;const b=Math.floor(elapsed/(60/112));if(b!==beat){beat=b;const now=audio?.currentTime||0;tone([130.81,164.81,196,174.61][Math.floor(b/4)%4],now,.22,.1,'triangle');tone(b%4===0?65:330,now,.08,.065);if(b%2===0)tone([523.25,659.25,783.99,587.33][Math.floor(b/2)%4],now+.12,.22,.045);}const spawnInterval=(60/112)*4;if(spawnTimer>=spawnInterval){spawnTimer-=spawnInterval;obstacle(['jump','duck','phase'][Math.floor(rand()*3)],playerZ-12*(60/112)*8+spawnTimer*12);}const speed=12;for(let i=obstacles.length-1;i>=0;i--){const o=obstacles[i];o.z+=dt*speed;o.g.position.set(pathX(o.z),0,o.z);if(!o.done&&o.z>=playerZ){o.done=true;if(action===o.type){streak++;score+=100+Math.min(streak,20)*10;feedback(streak%5===0?'IN THE FLOW!':'NICE! +'+(100+Math.min(streak,20)*10));tone(1046,audio?.currentTime||0,.18,.07);}else{energy--;streak=0;feedback('KEEP FLOWING');tone(80,audio?.currentTime||0,.2,.09,'sawtooth');if(energy<=0)finish();}updateHud();}if(o.z>22){removeObstacle(o);obstacles.splice(i,1);}}}
if(!paused){if(action){actionTime+=dt;if(actionTime>.78){action=null;document.querySelectorAll('.move-card').forEach(e=>e.classList.remove('active'));}}if(feedbackTime>0){feedbackTime-=dt;if(feedbackTime<=0)$('feedback').textContent='';}}
const bob=active?Math.abs(Math.sin(elapsed*11))*.065:Math.sin(worldTime*3)*.045;
player.position.set(pathX(playerZ),.1+bob+(action==='jump'?Math.sin(actionTime/.78*Math.PI)*1.65:0),playerZ);
player.scale.y=action==='duck'?.42:1;player.rotation.z=action==='phase'?Math.sin(actionTime*20)*.2:Math.sin(worldTime*3)*.04;
player.traverse(o=>{if(o.isMesh){o.visible=action!=='phase'||Math.floor(worldTime*24)%3!==0;}});
feet[0].position.z=.08+Math.sin(elapsed*12)*.12;feet[1].position.z=.08-Math.sin(elapsed*12)*.12;
shadow.position.x=player.position.x;shadow.position.z=playerZ;shadow.scale.setScalar(action==='jump'?.65:1);
const targetX=playing?pathX(playerZ)*.7:0;camera.position.x=THREE.MathUtils.lerp(camera.position.x,targetX,dt*2);camera.lookAt(playing?2:0,1,-22);
flowers.forEach((f,i)=>{f.rotation.z=Math.sin(worldTime*1.3+i)*.07;});floaters.forEach((f,i)=>{f.rotation.y=worldTime*.4+i;f.rotation.z=worldTime*.2;});
if(active)dashes.forEach(d=>{d.position.z+=dt*12;if(d.position.z>18)d.position.z=-105;d.position.x=pathX(d.position.z);});
renderer.render(scene,camera);}
tick();
