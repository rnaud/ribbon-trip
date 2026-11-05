import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as Three from 'three';
import {createCanvas} from '@napi-rs/canvas';
import * as physics from '../src/platformer/physics.js';
import {drawScene} from '../src/platformer/drawing.js';

function harness(){
  const elements=new Map(),handlers={};
  const get=id=>{if(!elements.has(id))elements.set(id,{clientWidth:1280,clientHeight:720,hidden:false,textContent:'',classList:{toggle(){}},setAttribute(){}});return elements.get(id);};
  const context=vm.createContext({
    THREE:{...Three,WebGLRenderer:class{setPixelRatio(){}setSize(){}render(){}}},...physics,drawScene,
    document:{getElementById:get,createElement:()=>createCanvas(1280,720),querySelectorAll:()=>[],body:get('body'),addEventListener(){}},
    window:{addEventListener:(name,fn)=>handlers[name]=fn},innerWidth:1280,innerHeight:720,devicePixelRatio:1,
    matchMedia:()=>({matches:false}),ResizeObserver:class{observe(){}},performance:{now:()=>0},requestAnimationFrame(){},setTimeout(){},console,
  });
  const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'');
  vm.runInContext(source+'\nglobalThis.inspect=()=>({p,state,repaired,repairTime,elapsed});globalThis.advance=seconds=>{for(let i=0;i<seconds*120;i++)update(1/120);render();};globalThis.setPlayer=(values)=>Object.assign(p,values);',context);
  return {context,get,key:(code,down=true)=>handlers[down?'keydown':'keyup']({code,repeat:false,preventDefault(){}})};
}
test('runtime starts, moves with held input, freezes on pause and restarts cleanly',()=>{const h=harness();assert.equal(h.context.inspect().state,'idle');h.get('play').onclick();h.key('ArrowRight');h.context.advance(.5);assert.ok(h.context.inspect().p.x>500);h.key('Escape');const x=h.context.inspect().p.x;h.context.advance(1);assert.equal(h.context.inspect().p.x,x);assert.equal(h.context.inspect().state,'paused');h.get('resume').onclick();assert.equal(h.context.inspect().state,'playing');h.get('restart').onclick();assert.equal(h.context.inspect().p.x,430);assert.equal(h.context.inspect().p.falls,0);});
test('artist interaction builds the bridge and finish exposes replay',()=>{const h=harness();h.get('play').onclick();h.context.setPlayer({x:2440,y:0,grounded:true});h.key('KeyE');assert.equal(h.context.inspect().repaired,false);h.context.advance(1.7);assert.equal(h.context.inspect().repaired,true);h.context.setPlayer({x:5581,y:0});h.context.advance(.02);assert.equal(h.context.inspect().state,'over');assert.equal(h.get('end').hidden,false);h.get('replay').onclick();assert.equal(h.context.inspect().repaired,false);assert.equal(h.context.inspect().state,'playing');});
