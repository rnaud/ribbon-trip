import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Three from 'three';
import {createCanvas} from '@napi-rs/canvas';
import {updateIdleActing, updateActing} from '../src/platformer/acting.js';
import * as puzzles from '../src/platformer/puzzles.js';
import * as physics from '../src/platformer/physics.js';
import {drawScene} from '../src/platformer/drawing.js';

function harness(){
  const elements=new Map(),handlers={};
  const get=id=>{if(!elements.has(id))elements.set(id,{clientWidth:1280,clientHeight:720,hidden:false,textContent:'',classList:{toggle(){}},setAttribute(){}});return elements.get(id);};
  const context=vm.createContext({
    THREE:{...Three,WebGLRenderer:class{setPixelRatio(){}setSize(){}render(){}}},...physics,...puzzles,drawScene,updateIdleActing,updateActing,
    document:{getElementById:get,createElement:()=>createCanvas(1280,720),querySelectorAll:()=>[],body:get('body'),addEventListener(){}},
    window:{addEventListener:(name,fn)=>handlers[name]=fn},innerWidth:1280,innerHeight:720,devicePixelRatio:1,
    matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},console,
  });
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  vm.runInContext(source+'\nglobalThis.inspect=()=>({p,state,drawings,elapsed});globalThis.advance=seconds=>{for(let i=0;i<seconds*120;i++)update(1/120);render();};globalThis.setPlayer=(values)=>Object.assign(p,values);',context);
  return {context,get,key:(code,down=true)=>handlers[down?'keydown':'keyup']({code,repeat:false,preventDefault(){}})};
}
test('runtime walks autonomously, freezes on pause, and restarts cleanly',()=>{
  const h=harness();assert.equal(h.context.inspect().state,'idle');h.get('play').onclick();
  h.context.advance(1);assert.ok(h.context.inspect().p.x>550);
  h.key('Escape');const x=h.context.inspect().p.x;h.context.advance(1);assert.equal(h.context.inspect().p.x,x);
  h.get('resume').onclick();h.get('restart').onclick();assert.equal(h.context.inspect().p.x,430);
});
test('he stops, addresses the audience angrily, and resumes when helped',()=>{
  const h=harness();h.get('play').onclick();h.context.setPlayer({x:2476,y:0,vx:0});
  h.context.advance(7);const p=h.context.inspect().p;
  assert.equal(p.mood,'impatient');assert.ok(p.viewerLook>.95);assert.equal(p.y,0);assert.ok(p.x<2500);
  h.key('Space');assert.equal(h.context.inspect().drawings.active.id,'bridge');
  h.context.advance(4);assert.ok(h.context.inspect().p.x>2740);assert.equal(h.context.inspect().drawings.done.has('bridge'),true);
  h.context.inspect().drawings.done.add('door');h.context.setPlayer({x:10831,y:240});h.context.advance(.02);
  assert.equal(h.context.inspect().state,'over');assert.equal(h.get('end').hidden,false);
});
