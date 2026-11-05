// All arm drawings share endpoints and equal sample counts. Blending their
// geometry preserves one contour instead of cross-fading two separate figures.
function contour(start,commands,count=96){
  let at=start;const points=[start];
  for(const cmd of commands){
    const a=at,b=cmd.length===2?cmd:cmd.slice(4);
    for(let n=1;n<=12;n++){
      const t=n/12,u=1-t;
      points.push(cmd.length===2?a.map((v,i)=>v+(b[i]-v)*t):a.map((v,i)=>u*u*u*v+3*u*u*t*cmd[i]+3*u*t*t*cmd[i+2]+t*t*t*b[i]));
    }
    at=b;
  }
  const lengths=[0];for(let i=1;i<points.length;i++)lengths.push(lengths[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  let j=1;return Array.from({length:count},(_,i)=>{
    const d=lengths.at(-1)*i/(count-1);while(j<points.length-1&&lengths[j]<d)j++;
    const t=(d-lengths[j-1])/(lengths[j]-lengths[j-1]||1);
    return points[j-1].map((v,k)=>v+(points[j][k]-v)*t);
  });
}
const left=[-22,-66];
const relaxed=contour(left,[[-25,-79,-37,-90,-44,-87],[-51,-80,-59,-80,-55,-88],[-47,-98],[-59,-91,-63,-94,-55,-101],[-43,-108],[-53,-108,-55,-114,-46,-114],[-34,-113,-24,-104,-20,-99],[-25,-117,-27,-129,-29,-139]]);
const point=contour(left,[[-26,-88,-42,-123,-48,-143],[-23,-158],[-12,-164,-10,-159,-20,-153],[-32,-144],[-23,-146,-20,-141,-30,-137],[-34,-135],[-28,-124,-19,-116,-19,-112],[-22,-124,-25,-132,-29,-139]]);
const open=contour(left,[[-29,-88,-56,-123,-69,-142],[-81,-143,-84,-150,-77,-152],[-65,-148],[-78,-159,-77,-165,-71,-162],[-57,-151],[-64,-167,-59,-170,-55,-163],[-48,-145],[-43,-133,-27,-118,-19,-112],[-22,-124,-25,-132,-29,-139]]);
const hip=contour(left,[[-35,-72,-61,-88,-57,-108],[-52,-119,-34,-120,-24,-115],[-16,-114,-15,-108,-24,-108],[-38,-110,-43,-105,-44,-100],[-39,-92,-31,-90,-24,-90],[-23,-108,-26,-125,-29,-139]]);
const frontRest=contour([10,-130],[[19,-109,27,-88,27,-63]]);
const frontOpen=contour([10,-130],[[28,-124,39,-121,44,-133],[47,-146,43,-158,50,-165],[53,-169,56,-163,54,-155],[61,-168,66,-166,62,-155],[71,-162,75,-158,67,-150],[76,-151,78,-146,65,-141],[62,-126,60,-111,53,-106],[42,-104,33,-104,27,-106],[29,-90,29,-76,27,-63]]).map(([x,y])=>[x+Math.max(0,Math.min(1,(x-29)/18))*36,y]);
export function armContour(pose,front=false){
  if(front){const w=Math.min(1,pose.open*.9+pose.point*.35);return frontRest.map((v,i)=>v.map((x,k)=>x+(frontOpen[i][k]-x)*w));}
  const weights=[pose.point,pose.open,pose.hip],total=Math.max(1,weights.reduce((a,b)=>a+b,0));
  return relaxed.map((v,i)=>v.map((x,k)=>x+weights.reduce((sum,w,j)=>sum+w*([point,open,hip][j][i][k]-x)/total,0)));
}
