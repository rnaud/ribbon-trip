import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,respawn,surfaces,support} from '../src/platformer/physics.js';
const dt=1/120;
function run(p,input,seconds,list=surfaces()){for(let i=0;i<Math.round(seconds/dt);i++)stepPlayer(p,input,dt,list);}
test('walking stops at a raised face without teleporting onto it',()=>{const p=createPlayer();p.x=730;run(p,{right:true},.5);assert.equal(p.x,763);assert.equal(p.y,0);});
test('jump clears and lands on the first step',()=>{const p=createPlayer();p.x=710;p.vx=260;p.buffer=.14;run(p,{right:true,jump:true},.55);run(p,{},.4);assert.ok(p.x>780&&p.x<950);assert.equal(p.y,58);assert.ok(p.grounded);});
test('releasing jump early reduces its height',()=>{const high=createPlayer(),low=createPlayer();high.buffer=low.buffer=.14;run(high,{jump:true},.3);run(low,{},.3);assert.ok(high.y>low.y+30);});
test('a pit drops the player and respawn returns them to a checkpoint',()=>{const p=createPlayer();p.x=1310;p.y=58;p.grounded=false;run(p,{},1.1);assert.ok(p.y<-480);p.checkpoint=1440;respawn(p,surfaces());assert.equal(p.x,1440);assert.equal(p.y,0);assert.equal(p.falls,1);});
test('artist repair adds a solid surface only after completion',()=>{assert.equal(support(2620,surfaces()),undefined);assert.equal(support(2620,surfaces(true)).y,0);const p=createPlayer();p.x=2450;run(p,{right:true},1.2,surfaces(true));assert.ok(p.x>2740);assert.ok(p.grounded);});
test('all designed gaps except the artist puzzle can be cleared',()=>{const list=surfaces(true);for(let i=0;i<list.length-1;i++){const left=list[i],right=list[i+1];if(right.a===left.b)continue;const p=createPlayer();p.x=left.b-22;p.y=left.y;p.vx=260;p.buffer=.14;let landed=false;for(let f=0;f<150;f++){stepPlayer(p,{right:true,jump:true},dt,list);if(p.grounded&&p.x>right.a){landed=true;break;}}assert.ok(landed,`Gap ${left.b} → ${right.a} must be traversable`);}});
