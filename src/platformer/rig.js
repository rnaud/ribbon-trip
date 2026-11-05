import {actingPose} from './acting.js';
import {Bone, OrthographicCamera, Vector3} from 'three';

const clamp=(x)=>Math.max(0,Math.min(1,x));
const smooth=(x)=>{x=clamp(x);return x*x*(3-2*x);};
const camera=new OrthographicCamera(-256,256,256,-256,.1,2000);
camera.position.z=800;camera.updateMatrixWorld();

// A small 3D skeleton skins the original ink contour rather than replacing it
// with a shaded mesh. Depth is discarded only after the bones have articulated.
const root=new Bone(),hips=new Bone(),spine=new Bone(),head=new Bone(),arm=new Bone();
root.add(hips);hips.position.y=-64;
hips.add(spine);spine.position.y=-48;
spine.add(head);head.position.y=-28;
spine.add(arm);arm.position.set(-22,4,18);
const vertex=new Vector3(),posed=new Vector3(),part=new Vector3();
const hipRest=new Vector3(0,-64,0),spineRest=new Vector3(0,-112,0),headRest=new Vector3(0,-140,0),armRest=new Vector3(-22,-108,18);

export function contourRig(p,time,playing=true){
  const pose=actingPose(p);
  const motion=playing?pose.walk:0;
  const gaze=p.viewerLook??0;
  const resting=p.grounded?(1-motion):0;
  const settle=resting*Math.sin(p.idle*1.2)*.035;
  const phase=p.walk;
  const swing=Math.sin(phase),double=Math.cos(phase*2);
  const asking=pose.point;
  const upset=pose.panic+pose.annoyed;
  const breath=Math.sin(time*2.5);
  const crouch=p.anticipation>0?Math.sin(p.anticipation/.07*Math.PI)*.18:p.land>0?Math.sin(p.land/.15*Math.PI)*.14:0;
  const rise=!p.grounded?clamp(p.vy/620)*.08:0;
  const airborne=p.grounded?0:Math.max(-1,Math.min(1,p.vy/620));
  root.scale.set(1/Math.sqrt(1-crouch+rise),1-crouch+rise,1/Math.sqrt(1-crouch+rise));
  // Hips, ribcage, and head counter-rotate with different phases. These are
  // genuine rotations in depth, so the projecting arm changes apparent length.
  hips.rotation.set(motion*.07*swing,motion*.22*swing,motion*.035*swing+settle);
  hips.position.y=-64-motion*(3+double*3)-breath*(.7+resting*1.5);
  spine.rotation.set(motion*.055*Math.cos(phase),-motion*.4*swing+asking*.22-gaze*.18,
    (p.bodyLean??motion)*.075+motion*.04*Math.sin(phase-.5)-settle*.7);
  head.rotation.set(.06*breath,-motion*.2*Math.sin(phase-.7)+-asking*.3-gaze*.3,
    -(p.headLean??motion)*.065+motion*.065*Math.sin(phase-.85)+pose.shame*.18+-asking*.12+gaze*.09+resting*Math.sin(time*1.8)*.025);
  arm.rotation.set(motion*.95*Math.sin(phase+.5)+-asking*.45-airborne*.65,
    motion*.35*Math.cos(phase),motion*.22*Math.sin(phase+.25)+upset*Math.sin(time*6)*.06+resting*Math.sin(time*2.5-.6)*.055);
  root.updateMatrixWorld(true);
  return (x,y)=>{
    // Rounded cross-section supplies depth to the otherwise hand-drawn shape.
    const depth=18*Math.sin(clamp((x+65)/145)*Math.PI)*smooth(-y/75);
    vertex.set(x,y,depth);
    const upper=smooth((-y-72)/55);
    const hand=smooth((-x-25)/22)*smooth((-y-68)/25)*(1-smooth((-y-168)/15));
    const skull=smooth((-y-125)/33)*(1-hand);
    const weights=[(1-upper)*(1-hand),upper*(1-skull)*(1-hand),upper*skull,hand];
    const sum=weights.reduce((a,b)=>a+b,0);
    posed.set(0,0,0);
    for(const [i,bone] of [hips,spine,head,arm].entries()){
      part.copy(vertex).sub([hipRest,spineRest,headRest,armRest][i]).applyMatrix4(bone.matrixWorld);
      posed.addScaledVector(part,weights[i]/sum);
    }
    // Keep the foot contacts on the terrain; let the rest of the body follow
    // the skeleton. This also keeps the silhouette joined to the ground line.
    posed.lerp(vertex,1-smooth(-y/65));
    posed.project(camera);
    return [posed.x*256,posed.y*256];
  };
}
