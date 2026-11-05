import test from 'node:test';
import assert from 'node:assert/strict';
import {PUZZLES,createDrawingState,requestDrawing,advanceDrawing,drawingTip} from '../src/platformer/puzzles.js';
import {surfaces} from '../src/platformer/physics.js';
test('all five puzzles draw once, unlock in order, and reject overlapping requests',()=>{const d=createDrawingState();for(const q of PUZZLES){assert.equal(requestDrawing(d,q.near[0]+20)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);assert.equal(advanceDrawing(d,q.duration-.01),null);assert.equal(d.done.has(q.id),false);assert.equal(advanceDrawing(d,.02)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);}assert.equal(d.done.size,5);});
test('pencil follows the shape instead of teleporting to a completed drawing',()=>{for(const q of PUZZLES){assert.deepEqual(drawingTip(q,0).at(-1),q.points[0]);const end=drawingTip(q,1).at(-1);assert.ok(Math.hypot(end[0]-q.points.at(-1)[0],end[1]-q.points.at(-1)[1])<1e-6);assert.ok(drawingTip(q,.5).length>1);}});
test('stairs and lift are absent before drawing and produce usable surfaces afterward',()=>{assert.equal(surfaces().some(s=>s.a===5700),false);assert.equal(surfaces(new Set(['stairs'])).find(s=>s.a===5700).y,120);assert.equal(surfaces().some(s=>s.id==='lift'),false);assert.equal(surfaces(new Set(['lift']),4).find(s=>s.id==='lift').y,250);});

test('half-drawn bridge supports the player only up to the visible pencil tip',async()=>{
  const {drawingProgress}=await import('../src/platformer/puzzles.js');
  const {createPlayer,stepPlayer,support}=await import('../src/platformer/physics.js');
  const d=createDrawingState();requestDrawing(d,2440);d.age=d.active.duration/2;
  const tip=drawingTip(d.active,drawingProgress(d)).at(-1)[0];
  assert.equal(tip,2620);
  const list=surfaces(d);assert.equal(support(2580,list).y,0);assert.equal(support(tip+1,list),undefined);
  const p=createPlayer();p.x=2530;for(let i=0;i<25;i++)stepPlayer(p,{right:true},1/120,list);
  assert.ok(p.grounded);assert.equal(p.y,0);
  p.x=tip+20;p.vx=0;for(let i=0;i<15;i++)stepPlayer(p,{},1/120,list);
  assert.ok(p.y<0);assert.equal(p.grounded,false);
});
test('stair treads are solid as they are traced, without creating the undrawn steps',()=>{
  const d=createDrawingState();requestDrawing(d,5500);
  // 210 of 690 stroke units: first tread complete, second riser partly drawn.
  d.age=.25+(210/690)*(d.active.duration-.5);
  const list=surfaces(d);
  assert.deepEqual(list.find(s=>s.a===5600),{a:5600,b:5700,y:60});
  assert.equal(list.some(s=>s.a===5700),false);
});
test('pencil arrival creates no phantom floor and the lift starts where it was drawn',()=>{
  const d=createDrawingState();requestDrawing(d,8400);d.age=.1;
  assert.equal(surfaces(d).some(s=>s.id==='lift'),false);
  d.age=.5;const partial=surfaces(d).find(s=>s.id==='lift');
  assert.ok(partial.b>8580&&partial.b<8810);assert.equal(partial.y,0);
  advanceDrawing(d,3);d.liftStartedAt=37;
  assert.equal(surfaces(d,37).find(s=>s.id==='lift').y,0);
  assert.equal(surfaces(d,39).find(s=>s.id==='lift').y,125);
});
