import test from 'node:test';
import assert from 'node:assert/strict';
import {PUZZLES,createDrawingState,requestDrawing,advanceDrawing,drawingTip} from '../src/platformer/puzzles.js';
import {surfaces,support} from '../src/platformer/physics.js';
test('all five drawings complete once and reject overlapping requests',()=>{const d=createDrawingState();for(const q of PUZZLES){assert.equal(requestDrawing(d,q.near[0]+20)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);assert.equal(advanceDrawing(d,q.duration-.01),null);assert.equal(advanceDrawing(d,.02)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);}assert.equal(d.done.size,5);});
test('pencil follows each shape from beginning to end',()=>{for(const q of PUZZLES){assert.deepEqual(drawingTip(q,0).at(-1),q.points[0]);const end=drawingTip(q,1).at(-1);assert.ok(Math.hypot(end[0]-q.points.at(-1)[0],end[1]-q.points.at(-1)[1])<1e-6);}});
test('partial bridge and stairs expose only ink that exists',()=>{
  const d=createDrawingState();requestDrawing(d,2440);d.age=1.1;
  assert.ok(support(2600,surfaces(d)));assert.equal(support(2621,surfaces(d)),undefined);
  advanceDrawing(d,3);requestDrawing(d,5500);d.age=.25+(210/690)*(d.active.duration-.5);
  assert.equal(surfaces(d).find(s=>s.a===5600).y,60);assert.equal(surfaces(d).some(s=>s.a===5700),false);
});
test('lift starts at ground level after drawing and matches the exit height',()=>{
  const d=createDrawingState();requestDrawing(d,8400);d.age=.1;assert.equal(surfaces(d).some(s=>s.id==='lift'),false);
  d.age=.5;assert.ok(surfaces(d).find(s=>s.id==='lift').b<8920);
  advanceDrawing(d,3);d.liftStartedAt=37;
  assert.equal(surfaces(d,37).find(s=>s.id==='lift').y,0);assert.equal(surfaces(d,40).find(s=>s.id==='lift').y,240);
});
