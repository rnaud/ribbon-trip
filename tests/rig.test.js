import test from 'node:test';
import assert from 'node:assert/strict';
import {contourRig} from '../src/platformer/rig.js';
import {createPlayer} from '../src/platformer/physics.js';

test('projected rig pins contact points and remains finite through walk, jump and squash',()=>{
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
