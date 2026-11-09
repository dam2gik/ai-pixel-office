export const SITE_BOUNDS={minX:-90,maxX:90,minZ:-72,maxZ:80};
export const TRAFFIC_COUNT=16;
export const PARKING_SLOTS=Array.from({length:24},(_,i)=>({x:[-56,-50,-40,-34][i%4],z:-15+Math.floor(i/4)*7,occupied:i%3!==1}));
export function routeLength(lane){const r=9+lane*2.2;return 2*120+2*87+2*Math.PI*r;}
export function roadPosition(distance,lane=1){
  const r=9+lane*2.2,a=60+r,top=-39-r,bottom=48+r,total=routeLength(lane);
  let d=((distance%total)+total)%total,x,z,dx,dz;
  const straight=(length,startX,startZ,vx,vz)=>{if(d>length){d-=length;return false;}x=startX+vx*d;z=startZ+vz*d;dx=vx;dz=vz;return true;};
  const arc=(cx,cz,start)=>{if(d>Math.PI*r/2){d-=Math.PI*r/2;return false;}const angle=start+d/r;x=cx+Math.cos(angle)*r;z=cz+Math.sin(angle)*r;dx=-Math.sin(angle);dz=Math.cos(angle);return true;};
  straight(120,-60,top,1,0)||arc(60,-39,-Math.PI/2)||straight(87,a,-39,0,1)||arc(60,48,0)||straight(120,60,bottom,-1,0)||arc(-60,48,Math.PI/2)||straight(87,-a,48,0,-1)||arc(-60,-39,Math.PI);
  return {x,z,yaw:Math.atan2(dx,dz)};
}
export function trafficPosition(index,time){const lane=index<8?1:-1,length=routeLength(lane),direction=lane===1?1:-1,p=roadPosition(index%8*length/8+time*(lane===1?6.5:-7.2),lane);return {...p,yaw:p.yaw+(direction<0?Math.PI:0),lane};}
