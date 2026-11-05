const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
// A deliberate glance: notice the audience, hold eye contact, then look away.
// The longer cycle avoids continuously staring out of the screen.
export function idleGlance(idle){
  const t=idle%15;
  return smooth((t-3.2)/.85)*(1-smooth((t-6.3)/1.1));
}
export function updateIdleActing(p,dt,{blocked=false}={}){
  const resting=p.grounded&&Math.abs(p.vx)<12;
  const target=resting&&!blocked?idleGlance(p.idle):0;
  p.viewerLook??=0;
  p.viewerLook+=(target-p.viewerLook)*(1-Math.exp(-dt*(target>p.viewerLook?9:12)));
}
