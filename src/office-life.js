// Local-only ambient simulation. No model calls, task execution, or persistent business state.
export const MAP = { width: 32, depth: 22, minX: -15.5, maxX: 15.5, minZ: -10.5, maxZ: 10.5, step: .5 };
export const ROOMS = [
  { id: 'office', name: '워크스페이스', subtitle: '작은 팀의 큰 아이디어', x: -6.5, z: -5, label: [-7, 0, .4], color: '#eee4cc' },
  { id: 'pantry', name: '탕비실', subtitle: '카페인 충전소', x: 6.2, z: -5, label: [6.2, 0, -.9], color: '#e7d9bd' },
  { id: 'restroom', name: '화장실', subtitle: '잠시 자리 비움', x: 13.2, z: -5, label: [13.2, 0, -.9], color: '#d5e5df' },
  { id: 'meeting', name: '회의실', subtitle: '일단 모여 봅시다', x: -7, z: 7, label: [-8, 0, 9.7], color: '#d7e2d3' },
  { id: 'lounge', name: '휴게실', subtitle: '오늘도 수고한 어깨에게', x: 8.5, z: 7, label: [9, 0, 9.7], color: '#e3dbea' }
];
export const STATIONS = [
  { id:'coffee-1',kind:'coffee',room:'pantry',x:5.1,z:-8.1,yaw:Math.PI,seconds:10,lines:['컴파일보다 중요한 커피.','카페인 의존성 설치 중…','샷 추가는 병렬 처리로.'] },
  { id:'coffee-2',kind:'coffee',room:'pantry',x:7.5,z:-8.1,yaw:Math.PI,seconds:11,lines:['디카페인도 커피인가요?','머그컵 메모리 확보 중.'] },
  { id:'snack-1',kind:'snack',room:'pantry',x:8.3,z:-4.2,yaw:Math.PI/2,seconds:9,lines:['과자 한 개만… 마지막으로.','당 충전 87%… 88%…'] },
  { id:'massage-1',kind:'massage',room:'lounge',x:5.3,z:8.5,yaw:0,seconds:14,lines:['어깨 버그 수정 중…','으어어… 이건 복지다.','긴장감 가비지 컬렉션.'] },
  { id:'massage-2',kind:'massage',room:'lounge',x:8,z:8.5,yaw:0,seconds:13,lines:['목 디스크 사용량 감소 중.','회의보다 강한 압박이군…'] },
  { id:'sofa-1',kind:'nap',room:'lounge',x:12.5,z:8.7,yaw:0,seconds:12,lines:['눈만 감고 생각 중입니다.','절전 모드… z Z Z','꿈에서 테스트는 다 통과했는데.'] },
  { id:'meeting-1',kind:'meeting',room:'meeting',x:-10,z:5.1,yaw:0,seconds:11,lines:['이 회의… 이메일로 될까요?','포스트잇 하나로 세상을 바꾸자.'] },
  { id:'meeting-2',kind:'meeting',room:'meeting',x:-6,z:8.9,yaw:Math.PI,seconds:10,lines:['좋은 생각! 방금 뭐였더라…','안건: 다음 회의 줄이기.'] },
  { id:'stretch-1',kind:'stretch',room:'meeting',x:-13.2,z:6.7,yaw:.5,seconds:9,lines:['허리도 리팩터링이 필요해.','의자와 잠시 헤어지는 중.'] },
  { id:'restroom-1',kind:'restroom',room:'restroom',x:12.1,z:-5.7,yaw:Math.PI,seconds:6,lines:['잠시 자리 비움 🚪'] },
  { id:'restroom-2',kind:'restroom',room:'restroom',x:14.5,z:-5.7,yaw:Math.PI,seconds:6,lines:['잠시 자리 비움 🚪'] },
  { id:'wash-1',kind:'wash',room:'restroom',x:14.1,z:-2.6,yaw:Math.PI/2,seconds:6,lines:['손 씻기 테스트 통과!','깨끗한 손, 깨끗한 코드.'] },
  { id:'wash-2',kind:'wash',room:'restroom',x:14.1,z:-4.2,yaw:Math.PI/2,seconds:6,lines:['비누 거품 로딩 중…'] }
];
export function deskPosition(index){return {x:-12+(index%4)*3.4,z:-7+Math.floor(index/4)*2.8};}
export function homePosition(index){const p=deskPosition(index);return {x:p.x,z:p.z+1.05};}
export function createNavigator(obstacles, clearance=.24){
  const step=MAP.step,cols=Math.round((MAP.maxX-MAP.minX)/step)+1,rows=Math.round((MAP.maxZ-MAP.minZ)/step)+1;
  const point=i=>({x:MAP.minX+(i%cols)*step,z:MAP.minZ+Math.floor(i/cols)*step});
  const blocked=new Uint8Array(cols*rows);
  const isBlocked=p=>p.x<MAP.minX||p.x>MAP.maxX||p.z<MAP.minZ||p.z>MAP.maxZ||obstacles.some(o=>p.x>o.x-o.w/2-clearance&&p.x<o.x+o.w/2+clearance&&p.z>o.z-o.d/2-clearance&&p.z<o.z+o.d/2+clearance);
  for(let i=0;i<blocked.length;i++)blocked[i]=isBlocked(point(i))?1:0;
  function nearest(p){let best=-1,dist=Infinity;for(let i=0;i<blocked.length;i++){if(blocked[i])continue;const q=point(i),d=(p.x-q.x)**2+(p.z-q.z)**2;if(d<dist){dist=d;best=i;}}return best;}
  function clearSegment(a,b){
    if(isBlocked(a)||isBlocked(b))return false;
    for(const o of obstacles){let near=0,far=1;for(const [axis,size] of [['x','w'],['z','d']]){const lo=o[axis]-o[size]/2-clearance,hi=o[axis]+o[size]/2+clearance,delta=b[axis]-a[axis];if(Math.abs(delta)<1e-10){if(a[axis]<=lo||a[axis]>=hi){far=-1;break;}}else{const t1=(lo-a[axis])/delta,t2=(hi-a[axis])/delta;near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));}}if(near<far-1e-9)return false;}
    return true;
  }
  function path(from,to){
    const start=nearest(from),goal=nearest(to);if(start<0||goal<0)return null;
    const queue=[start],previous=new Int32Array(blocked.length).fill(-1);previous[start]=start;let head=0;
    while(head<queue.length&&previous[goal]===-1){const i=queue[head++],x=i%cols,z=Math.floor(i/cols);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz;if(nx<0||nx>=cols||nz<0||nz>=rows)continue;const next=nz*cols+nx;if(!blocked[next]&&previous[next]===-1){previous[next]=i;queue.push(next);}}}
    if(previous[goal]===-1)return null;
    const route=[];for(let i=goal;i!==start;i=previous[i])route.push(point(i));route.push(point(start));route.reverse();
    if(clearSegment(route.at(-1),to))route.push({...to});
    // Preserve collision-free corners, but remove redundant points along the corridor.
    const smooth=[];let anchor={...from};for(let i=0;i<route.length;){let far=i;while(far+1<route.length&&clearSegment(anchor,route[far+1]))far++;if(!clearSegment(anchor,route[far]))return null;smooth.push(route[far]);anchor=route[far];i=far+1;}
    return smooth;
  }
  return {path,isBlocked,clearSegment};
}
const activityOrder=['coffee','massage','meeting','restroom','stretch','snack','nap'];
export class OfficeLife {
  constructor(navigator){this.navigator=navigator;this.people=new Map();this.reservations=new Map();this.enabled=true;this.elapsed=0;}
  sync(agents){const ids=new Set(agents.map(a=>a.id));for(const [id,p] of this.people)if(!ids.has(id)){this.release(p);this.people.delete(id);}agents.forEach((a,index)=>{if(!this.people.has(a.id))this.people.set(a.id,{id:a.id,index,home:homePosition(index),position:homePosition(index),mode:'idle',work:null,activity:null,station:null,route:[],yaw:0,wait:1.4+index*1.1,duration:0,phase:0,cycle:0,bubble:'',completed:0});});}
  release(p){if(p.station&&this.reservations.get(p.station.id)===p.id)this.reservations.delete(p.station.id);p.station=null;}
  setEnabled(value){this.enabled=value;if(!value)for(const p of this.people.values()){this.release(p);p.position={...p.home};p.route=[];p.mode=p.work?'working':'idle';p.activity=null;p.bubble='';p.wait=2+p.index*.7;}}
  setWork(statuses){for(const p of this.people.values()){const next=statuses[p.id]||null;if(next===p.work)continue;p.work=next;if(next){this.release(p);p.activity=null;p.bubble='커피는 잠시 보류! 자리로 복귀 중';if(this.enabled)this.goHome(p);else{p.position={...p.home};p.route=[];p.mode='working';p.yaw=Math.PI;}}else if(p.mode==='working'){p.mode='idle';p.activity=null;p.bubble='수고했어요. 잠깐 충전!';p.wait=4+p.index*.5;}}}
  goHome(p){p.route=this.navigator.path(p.position,p.home)||[];p.mode=p.route.length?'returning':p.work?'working':'idle';if(!p.route.length){p.wait=4;p.bubble=p.work?'업무에 집중하는 중':'';}p.destination='home';}
  choose(p,kind){const preferred=kind||activityOrder[(p.index+p.cycle)%activityOrder.length];const available=STATIONS.filter(s=>!this.reservations.has(s.id)&&(kind?s.kind===kind:s.kind!=='wash')).sort((a,b)=>(a.kind===preferred?-1:0)-(b.kind===preferred?-1:0));
    for(const s of available){const route=this.navigator.path(p.position,s);if(!route)continue;p.station=s;this.reservations.set(s.id,p.id);p.route=route;p.mode='walking';p.activity=s.kind;p.destination=s.id;p.bubble=`${ROOMS.find(r=>r.id===s.room).name} 가는 중`;p.phase=0;return true;}p.mode='idle';p.wait=3;p.bubble='자리 비면 제가 갈게요.';return false;
  }
  tick(dt){dt=Math.min(.15,Math.max(0,dt));this.elapsed+=dt;if(!this.enabled)return;
    for(const p of this.people.values()){
      p.phase+=dt;
      if(p.mode==='walking'||p.mode==='returning'){
        let travel=2.7*dt;while(travel>0&&p.route.length){const q=p.route[0],dx=q.x-p.position.x,dz=q.z-p.position.z,d=Math.hypot(dx,dz);if(d>.001)p.yaw=Math.atan2(dx,dz);if(d<=travel){p.position={...q};p.route.shift();travel-=d;}else{p.position.x+=dx/d*travel;p.position.z+=dz/d*travel;travel=0;}}
        if(!p.route.length){p.phase=0;if(p.mode==='returning'){p.mode=p.work?'working':'idle';p.yaw=p.work?Math.PI:0;p.wait=4;p.bubble=p.work?'업무에 집중하는 중':'';p.activity=null;}else{p.mode='resting';p.duration=p.station.seconds;p.yaw=p.station.yaw;p.bubble=p.station.lines[(p.cycle+p.index)%p.station.lines.length];}}
      }else if(p.mode==='resting'){
        p.duration-=dt;if(p.duration<=0){const was=p.activity;this.release(p);p.completed++;p.cycle++;if(was==='restroom'){if(!this.choose(p,'wash'))this.goHome(p);}else this.goHome(p);}
      }else if(p.mode==='idle'&&!p.work){p.wait-=dt;if(p.wait<=0)this.choose(p);}
      else if(p.work){p.mode='working';p.yaw=Math.PI;}
    }
  }
  snapshot(){return [...this.people.values()].map(p=>({id:p.id,mode:p.mode,activity:p.activity,station:p.station?.id||null,x:p.position.x,z:p.position.z,home:{...p.home},route:p.route.map(q=>({...q})),work:p.work,completed:p.completed,bubble:p.bubble}));}
}
