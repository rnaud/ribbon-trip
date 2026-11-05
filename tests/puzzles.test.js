import test from 'node:test';
import assert from 'node:assert/strict';
import {PUZZLES,createDrawingState,requestDrawing,advanceDrawing,drawingTip} from '../src/platformer/puzzles.js';
import {surfaces} from '../src/platformer/physics.js';
test('all five puzzles draw once, unlock in order, and reject overlapping requests',()=>{const d=createDrawingState();for(const q of PUZZLES){assert.equal(requestDrawing(d,q.near[0]+20)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);assert.equal(advanceDrawing(d,q.duration-.01),null);assert.equal(d.done.has(q.id),false);assert.equal(advanceDrawing(d,.02)?.id,q.id);assert.equal(requestDrawing(d,q.near[0]+20),null);}assert.equal(d.done.size,5);});
test('pencil follows the shape instead of teleporting to a completed drawing',()=>{for(const q of PUZZLES){assert.deepEqual(drawingTip(q,0).at(-1),q.points[0]);const end=drawingTip(q,1).at(-1);assert.ok(Math.hypot(end[0]-q.points.at(-1)[0],end[1]-q.points.at(-1)[1])<1e-6);assert.ok(drawingTip(q,.5).length>1);}});
test('stairs and lift are absent before drawing and produce usable surfaces afterward',()=>{assert.equal(surfaces().some(s=>s.a===5700),false);assert.equal(surfaces(new Set(['stairs'])).find(s=>s.a===5700).y,120);assert.equal(surfaces().some(s=>s.id==='lift'),false);assert.equal(surfaces(new Set(['lift']),4).find(s=>s.id==='lift').y,250);});
