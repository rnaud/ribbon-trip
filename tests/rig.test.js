import test from 'node:test';
import assert from 'node:assert/strict';
import {contourRig} from '../src/platformer/rig.js';
import {createPlayer} from '../src/platformer/physics.js';

test('projected rig preserves foot contacts through animated poses',()=>{
  const p=createPlayer();p.vx=260;
  for(let i=0;i<60;i++){
    p.walk=i/60*Math.PI*2;p.anticipation=i<10?.07-i*.007:0;p.land=i>40?.15-(i-40)*.007:0;
    const project=contourRig(p,i/60);
    for(const x of [-27,30]){const foot=project(x,0);assert.ok(Math.abs(foot[0]-x)<1e-8);assert.ok(Math.abs(foot[1])<1e-8);}
    for(const pt of [[-55,-100],[0,-185],[63,-163],[27,-63]])assert.ok(project(...pt).every(Number.isFinite));
  }
});
test('arm swing foreshortens in projection and head has independent follow-through',()=>{
  const p=createPlayer();p.vx=260;p.walk=.2;
  let project=contourRig(p,0);const handA=project(-55,-100),headA=project(63,-163),chestA=project(10,-110);
  p.walk=2.4;project=contourRig(p,.4);const handB=project(-55,-100),headB=project(63,-163),chestB=project(10,-110);
  assert.ok(Math.hypot(handA[0]-handB[0],handA[1]-handB[1])>3);
  assert.ok(Math.abs((headA[0]-chestA[0])-(headB[0]-chestB[0]))>1);
});

test('idle audience glance eases in, holds, and yields to movement and reactions',async()=>{
  const {updateIdleActing,idleGlance}=await import('../src/platformer/acting.js');
  assert.equal(idleGlance(1),0);assert.equal(idleGlance(5),1);assert.equal(idleGlance(9),0);
  const p=createPlayer();p.idle=5;
  for(let i=0;i<120;i++)updateIdleActing(p,1/120);
  assert.ok(p.viewerLook>.99);
  p.vx=260;for(let i=0;i<60;i++)updateIdleActing(p,1/120);
  assert.ok(p.viewerLook<.01);
  p.vx=0;p.viewerLook=1;for(let i=0;i<60;i++)updateIdleActing(p,1/120,{blocked:true});
  assert.ok(p.viewerLook<.01);
});

test('mood switches blend the arm contour continuously and can be interrupted',async()=>{
  const {updateActing}=await import('../src/platformer/acting.js');
  const {armContour}=await import('../src/platformer/poses.js');
  const p=createPlayer();updateActing(p,1/120);
  let previous=armContour(p.acting);p.mood='impatient';
  for(let i=0;i<120;i++){
    if(i===45)p.mood='curious';
    updateActing(p,1/120);const next=armContour(p.acting);
    assert.equal(next.length,previous.length);
    assert.ok(Math.max(...next.map((v,j)=>Math.hypot(v[0]-previous[j][0],v[1]-previous[j][1])))<4);
    previous=next;
  }
  assert.ok(p.acting.point>.95);assert.ok(p.acting.open<.02);
});
test('feet retain the same contact spacing through every stationary reaction',async()=>{
  const {stepPlayer,surfaces}=await import('../src/platformer/physics.js');
  const {updateActing}=await import('../src/platformer/acting.js');
  const p=createPlayer();for(let i=0;i<35;i++)stepPlayer(p,{right:true},1/120,surfaces());
  for(let i=0;i<25;i++)stepPlayer(p,{},1/120,surfaces());
  p.x=2490;p.y=0;p.vx=0;
  const stride=p.footStride,x=p.x;
  for(const mood of ['look','skeptical','sigh','impatient','shrug','delighted']){
    p.mood=mood;
    for(let i=0;i<120;i++){stepPlayer(p,{},1/120,surfaces());updateActing(p,1/120);}
    assert.equal(p.footStride,stride);assert.equal(p.x,x);
    const project=contourRig(p,10);
    for(const foot of [-27-stride*.4,30+stride*.5])assert.ok(Math.abs(project(foot,0)[0]-foot)<1e-8);
  }
});

test('projected hands retain their shape throughout pose transitions',async()=>{
  const {armContour,projectArm}=await import('../src/platformer/poses.js');
  const {updateActing}=await import('../src/platformer/acting.js');
  const p=createPlayer();let reference=null;
  for(const mood of ['neutral','curious','impatient','sigh','delighted']){
    p.mood=mood;
    for(let frame=0;frame<60;frame++){
      updateActing(p,1/120);
      for(const front of [false,true]){
        const arm=armContour(p.acting,front);
        const projected=projectArm(arm,(x,y)=>[x+.002*y*y,y+Math.sin(x*.04)*8]);
        const hand=projected.slice(arm.handStart,arm.handEnd);
        const distances=hand.map(a=>hand.map(b=>Math.hypot(a[0]-b[0],a[1]-b[1]))).flat();
        reference??=distances;
        distances.forEach((distance,i)=>assert.ok(Math.abs(distance-reference[i])<1e-8));
      }
    }
  }
});
