const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// A deliberate glance: notice the audience, hold eye contact, then look away.
// The longer cycle avoids continuously staring out of the screen.
export function idleGlance(idle){
  const t=idle%15;
  return smooth((t-3.2)/.85)*(1-smooth((t-6.3)/1.1));
}
export function updateIdleActing(p,dt,{blocked=false,demand=false}={}){
  const resting=p.grounded&&Math.abs(p.vx)<12;
  const target=resting&&!blocked?(demand?1:idleGlance(p.idle)):0;
  p.viewerLook??=0;
  p.viewerLook+=(target-p.viewerLook)*(1-Math.exp(-dt*(target>p.viewerLook?9:12)));
}

export function poseTarget(p){
  const mood=p.mood??'neutral',age=p.reactionAge??1;
  const windup=smooth(age/.22);
  const accent=windup*(.78+.22*Math.cos(Math.max(0,age-.22)*7));
  const is=(...names)=>names.includes(mood)?1:0;
  const open=is('impatient','panic','delighted','surprised','shrug')*windup;
  return {
    walk:p.grounded?Math.min(1,Math.abs(p.vx)/170):0,
    point:is('curious','watch','ask')*windup,
    open,hip:is('skeptical','sigh')*windup,
    nod:is('look','watch','curious')*-8+is('embarrassed','sigh')*12-is('delighted','shrug')*10*accent,
    lean:is('curious','watch','ask')*9+is('embarrassed','sigh')*12-is('surprised','delighted')*9*accent,
    mouth:is('impatient','panic','ask','delighted')*accent,
    laugh:is('delighted')*accent,panic:is('panic')*accent,
    annoyed:is('impatient')*accent,shame:is('embarrassed'),sigh:is('sigh'),
  };
}
export function actingPose(p){return p.acting??poseTarget(p);}
export function updateActing(p,dt){
  if(p.previousMood!==p.mood){p.previousMood=p.mood;p.reactionAge=0;}
  p.reactionAge=(p.reactionAge??0)+dt;
  const target=poseTarget(p);
  p.acting??=Object.fromEntries(Object.keys(target).map(k=>[k,0]));
  p.actingVelocity??=Object.fromEntries(Object.keys(target).map(k=>[k,0]));
  // Critically damped springs preserve velocity when a reaction is interrupted.
  for(const key of Object.keys(target)){
    const omega=key==='mouth'?18:14;
    const delta=p.acting[key]-target[key],v=p.actingVelocity[key];
    const carry=v+omega*delta,decay=Math.exp(-omega*dt);
    p.acting[key]=target[key]+(delta+carry*dt)*decay;
    p.actingVelocity[key]=(v-omega*carry*dt)*decay;
  }
}
