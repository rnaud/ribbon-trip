import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayer,stepPlayer,surfaces,FINISH} from '../src/platformer/physics.js';
import {createDrawingState,nearbyPuzzle,requestDrawing,advanceDrawing} from '../src/platformer/puzzles.js';
const dt=1/120;
test('he walks without input, stops at missing ink, and cannot jump',()=>{
  const p=createPlayer();for(let i=0;i<120;i++)stepPlayer(p,null,dt,surfaces());assert.ok(p.x>550);
  p.x=2470;for(let i=0;i<600;i++)stepPlayer(p,{jump:true,right:true},dt,surfaces());
  assert.ok(p.x<2500);assert.equal(p.vx,0);assert.equal(p.y,0);assert.equal(p.grounded,true);
});
test('freshly drawn bridge supports walking before the drawing completes',()=>{
  const d=createDrawingState();requestDrawing(d,2440);d.age=1.1;
  const p=createPlayer();p.x=2530;
  for(let i=0;i<120;i++)stepPlayer(p,null,dt,surfaces(d),d.done);
  assert.ok(p.x>2550&&p.x<2620);assert.equal(p.y,0);assert.equal(d.done.has('bridge'),false);
});
test('the entire cartoon completes with only five help requests and no jumping',()=>{
  const p=createPlayer(),d=createDrawingState(),helped=[],waited=new Map();let finished=false,maxY=0;
  for(let i=0;i<120*160;i++){
    const time=i*dt,completed=advanceDrawing(d,dt);
    if(completed?.id==='lift')d.liftStartedAt=time;
    const result=stepPlayer(p,null,dt,surfaces(d,time),d.done);
    assert.ok(Number.isFinite(p.y)&&p.y>=0);assert.equal(p.grounded,true);maxY=Math.max(maxY,p.y);
    const q=nearbyPuzzle(p.x,d);
    if(result.blocked&&q&&!d.active){
      const wait=(waited.get(q.id)??0)+dt;waited.set(q.id,wait);
      if(wait>5){helped.push(requestDrawing(d,p.x).id);}
    }
    if(result.finished){finished=true;break;}
  }
  assert.ok(finished,`stuck at ${p.x}, ${p.y}`);assert.ok(p.x>=FINISH);assert.ok(maxY>239);
  assert.deepEqual(helped,['bridge','stairs','slope','lift','door']);
});
