import {BASEMENT_BOUNDS,LIFT} from './transport-config.js';
import {ElevatorLife} from './elevator-life.js';
import {FLOOR_IDS,floorElevation} from './floors.js';
import {HIGH_ROOMS,HIGH_STATIONS} from './high-floor-data.js';
// Local-only ambient simulation. No model calls, task execution, or persistent business state.
export const MAP = { width:40,depth:39,minX:-21.5,maxX:17.5,minZ:-11.5,maxZ:26.5,step:.5 };
export const FLOOR_HEIGHT=6;
export const STAIRS={bottom:{x:-18,z:5.5,y:0,floor:1},top:{x:-18,z:-3.8,y:6,floor:2}};
export const BASEMENT_STAIRS={id:'basement',bottom:{x:-20.5,z:-3.8,y:-6,floor:-1},top:{x:-20.5,z:5.5,y:0,floor:1}};
export const FLOOR_LINKS=[{id:'upper',...STAIRS},BASEMENT_STAIRS];
export const ROOMS = [
  {id:'monster-mine',name:'B5 · 몬스터 갱도',subtitle:'층을 벗어나지 않는 지하 몬스터 서식지',floor:-5,x:0,z:0,label:[0,0,3.3],color:'#616766'},
  {id:'monster-depths',name:'B6 · 심층 마굴',subtitle:'더 깊은 광맥과 몬스터 전리품',floor:-6,x:0,z:0,label:[0,0,3.3],color:'#535956'},
  {id:'canteen',name:'B2 · 구내식당',subtitle:'배식·식사·퇴식 동선을 나눈 사내 식당',floor:-2,x:5,z:7,label:[5,0,18.5],color:'#d9cbb6'},
  {id:'mine',name:'B3 · 채굴·운반층',subtitle:'석탄 광맥과 광차·컨베이어를 갖춘 탄광',floor:-3,x:0,z:0,label:[0,0,3.3],color:'#77786a'},
  {id:'deep-mine',name:'B4 · 심층 갱도',subtitle:'더 깊은 석탄 광맥과 지하 운반 시설',floor:-4,x:0,z:0,label:[0,0,3.3],color:'#535956'},
  {id:'capsules',name:'B1 · 캡슐 수면실',subtitle:'조용하게 재충전하는 개인 수면 캡슐',floor:-1,x:-17,z:-12,label:[-17,0,-8],color:'#bca994'},
  {id:'golf',name:'B1 · 스크린골프',subtitle:'두 개의 스크린 타석과 퍼팅 매트',floor:-1,x:16,z:-11,label:[16,0,-4],color:'#729c79'},
  {id:'snackbar',name:'B1 · 스낵바',subtitle:'음료와 간식을 즐기는 지하 카페',floor:-1,x:-9,z:12,label:[-9,0,18],color:'#c0a183'},
  {id:'gym',name:'B1 · 헬스장',subtitle:'러닝머신·웨이트·스트레칭 공간',floor:-1,x:16,z:12,label:[16,0,18],color:'#87969c'},
  { id: 'office', name: '워크스페이스', subtitle: '작은 팀의 큰 아이디어', x: -6.5, z: -5, label: [-7, 0, .4], color: '#eee4cc' },
  { id: 'pantry', name: '탕비실', subtitle: '카페인 충전소', x: 6.2, z: -5, label: [6.2, 0, -.9], color: '#e7d9bd' },
  { id: 'restroom', name: '화장실', subtitle: '잠시 자리 비움', x: 13.2, z: -5, label: [13.2, 0, -.9], color: '#d5e5df' },
  { id: 'meeting', name: '회의실', subtitle: '일단 모여 봅시다', x: -7, z: 7, label: [-8, 0, 9.7], color: '#d7e2d3' },
  { id: 'lounge', name: '휴게실', subtitle: '오늘도 수고한 어깨에게', x: 8.5, z: 7, label: [9, 0, 9.7], color: '#e3dbea' },
  {id:'garden',name:'가든 파크',subtitle:'잠시 쉬어 가는 초록 정원',floor:1,x:-2,z:21,label:[-2,0,25.5],color:'#b9cfa6'},
  {id:'focus',name:'2F · 포커스 스튜디오',subtitle:'깊이 몰입하는 조용한 업무 공간',floor:2,x:-7,z:-5,label:[-8,0,.3],color:'#ded4bf'},
  {id:'library',name:'2F · 라이브러리',subtitle:'책과 아이디어가 만나는 곳',floor:2,x:8,z:-5,label:[8,0,.3],color:'#d4ddd2'},
  {id:'terrace',name:'2F · 스카이 라운지',subtitle:'정원을 내려다보는 테라스',floor:2,x:4,z:5,label:[4,0,8],color:'#e9d9c8'}
];
ROOMS.push(...HIGH_ROOMS);
export const STATIONS = [
  {id:'dine-1',kind:'dine',room:'canteen',x:-11,z:-1.4,y:-12,floor:-2,yaw:0,seconds:18,lines:['구내식당에서 든든하게 식사 중.','오늘 메뉴도 좋아요!']},
  {id:'dine-2',kind:'dine',room:'canteen',x:-1,z:-1.4,y:-12,floor:-2,yaw:0,seconds:18,lines:['점심 먹고 다시 힘내볼까요.']},
  {id:'dine-3',kind:'dine',room:'canteen',x:5,z:6.6,y:-12,floor:-2,yaw:0,seconds:18,lines:['편안한 식사 시간.']},
  {id:'dine-4',kind:'dine',room:'canteen',x:21,z:13.6,y:-12,floor:-2,yaw:0,seconds:18,lines:['오후 업무를 위한 에너지 충전.']},
  {id:'coal-1',kind:'mine',room:'mine',x:-20,z:-3.8,y:-18,floor:-3,yaw:Math.PI,seconds:16,lines:['석탄 광맥을 살펴보는 중.','곡괭이로 차근차근 채굴 중.']},
  {id:'coal-2',kind:'mine',room:'mine',x:10,z:-3.8,y:-18,floor:-3,yaw:Math.PI,seconds:16,lines:['광차에 실을 석탄을 채굴 중.']},
  {id:'deep-coal-1',kind:'mine',room:'deep-mine',x:-20,z:-3.8,y:-24,floor:-4,yaw:Math.PI,seconds:18,lines:['심층 석탄층을 탐사 중.']},
  {id:'deep-coal-2',kind:'mine',room:'deep-mine',x:12.6,z:10,y:-24,floor:-4,yaw:Math.PI/2,seconds:18,lines:['깊은 갱도에서도 한 걸음씩.']},
  {id:'capsule-1',kind:'capsule',room:'capsules',x:-26,z:-13.1,y:-6,floor:-1,yaw:0,seconds:18,lines:['캡슐에서 잠깐 충전 중… z Z','조용한 개인 수면 시간.']},
  {id:'capsule-2',kind:'capsule',room:'capsules',x:-19,z:-8.1,y:-6,floor:-1,yaw:0,seconds:18,lines:['편안하게 쉬고 돌아갈게요.']},
  {id:'golf-1',kind:'golf',room:'golf',x:7,z:-11.5,y:-6,floor:-1,yaw:Math.PI,seconds:15,lines:['이번 샷은 페어웨이로!','스윙 연습 중.']},
  {id:'golf-2',kind:'golf',room:'golf',x:15,z:-11.5,y:-6,floor:-1,yaw:Math.PI,seconds:15,lines:['나이스 샷!']},
  {id:'bar-coffee',kind:'coffee',room:'snackbar',x:-11,z:12.3,y:-6,floor:-1,yaw:0,seconds:10,lines:['지하 카페에서 한 잔.']},
  {id:'bar-snack',kind:'snack',room:'snackbar',x:-7,z:12.3,y:-6,floor:-1,yaw:0,seconds:10,lines:['간식으로 에너지 충전.']},
  {id:'gym-run',kind:'run',room:'gym',x:6,z:6,y:-6,floor:-1,yaw:0,seconds:15,lines:['가볍게 달리는 중!']},
  {id:'gym-weights',kind:'workout',room:'gym',x:22,z:11,y:-6,floor:-1,yaw:0,seconds:14,lines:['업무 체력도 충전 중.']} ,
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
  { id:'wash-2',kind:'wash',room:'restroom',x:14.1,z:-4.2,yaw:Math.PI/2,seconds:6,lines:['비누 거품 로딩 중…'] },
  {id:'garden-1',kind:'garden',room:'garden',x:-15.8,z:18,floor:1,yaw:0,seconds:12,lines:['초록색으로 눈을 리셋 중.','잠깐, 바람도 업데이트할게요.']},
  {id:'garden-2',kind:'garden',room:'garden',x:13.7,z:17.7,floor:1,yaw:0,seconds:12,lines:['아이디어가 자라는 정원.','꽃은 데드라인을 모른다.']},
  {id:'reading-1',kind:'reading',room:'library',x:6,z:-2.3,floor:2,y:6,yaw:Math.PI,seconds:13,lines:['다음 페이지에 해답이 있을지도.','조용히 지식을 충전하는 중.']},
  {id:'reading-2',kind:'reading',room:'library',x:10,z:-2.3,floor:2,y:6,yaw:Math.PI,seconds:12,lines:['책갈피에 아이디어 저장!']},
  {id:'focus-1',kind:'meeting',room:'focus',x:-8,z:-1.8,floor:2,y:6,yaw:Math.PI,seconds:10,lines:['2층에서는 조금 더 집중 모드.']},
  {id:'sky-coffee',kind:'coffee',room:'terrace',x:-7,z:4.8,floor:2,y:6,yaw:Math.PI,seconds:10,lines:['정원 뷰가 더해진 커피.']},
  {id:'sky-nap',kind:'nap',room:'terrace',x:8,z:5.7,floor:2,y:6,yaw:Math.PI,seconds:12,lines:['하늘 가까이에서 잠깐 충전.']}
];
STATIONS.push(...HIGH_STATIONS);
export function deskPosition(index){return {x:-12+(index%4)*3.4,z:-7+Math.floor(index/4)*2.8};}
export function homePosition(index){const p=deskPosition(index);return {x:p.x,z:p.z+1.05,floor:1,y:0};}
function createGridNavigator(obstacles, clearance=.24,bounds=MAP){
  const step=bounds.step,cols=Math.round((bounds.maxX-bounds.minX)/step)+1,rows=Math.round((bounds.maxZ-bounds.minZ)/step)+1;
  const point=i=>({x:bounds.minX+(i%cols)*step,z:bounds.minZ+Math.floor(i/cols)*step});
  const blocked=new Uint8Array(cols*rows);
  const isBlocked=p=>p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ||obstacles.some(o=>p.x>o.x-o.w/2-clearance&&p.x<o.x+o.w/2+clearance&&p.z>o.z-o.d/2-clearance&&p.z<o.z+o.d/2+clearance);
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
  return {path,isBlocked,clearSegment,nearestFree:p=>{const i=nearest(p);return i<0?null:point(i);}};
}
export function createNavigator(obstacles,clearance=.24){
  const grids=Object.fromEntries(FLOOR_IDS.map(f=>[f,createGridNavigator(obstacles.filter(o=>(o.floor||1)===f),clearance,f<0?{...MAP,...BASEMENT_BOUNDS}:f===1?MAP:{...MAP,minZ:-10.5,maxZ:10.5})]));
  const floor=p=>p.floor||1,tag=(points,f)=>points?.map(p=>({...p,floor:f,y:floorElevation(f)}));
  function stairsPath(from,to){
    if(!grids[floor(from)]||!grids[floor(to)])return null;
    if(from.transition){
      const link=FLOOR_LINKS.find(l=>l.id===from.stairId)||FLOOR_LINKS.find(l=>Math.abs(from.x-l.bottom.x)<.5);
      if(!link)return null;
      const exit=Math.abs((from.y||0)-link.bottom.y)<Math.abs((from.y||0)-link.top.y)?link.bottom:link.top;
      const tail=stairsPath({...exit,transition:false},to);return tail?[{...exit,transition:true,stairId:link.id},...tail]:null;
    }
    if(floor(from)<-1||floor(to)<-1||floor(from)>2||floor(to)>2)return floor(from)===floor(to)?tag(grids[floor(from)].path(from,to),floor(from)):null;
    const route=[];let current={...from};
    while(floor(current)!==floor(to)){
      const a=floor(current),b=floor(to),link=a===-1||a===1&&b===-1?BASEMENT_STAIRS:FLOOR_LINKS[0];
      const entry=link.bottom.floor===a?link.bottom:link.top,exit=entry===link.bottom?link.top:link.bottom;
      const first=tag(grids[a].path(current,entry),a);if(!first)return null;
      route.push(...first,{...exit,transition:true,stairId:link.id});current={...exit};
    }
    const last=tag(grids[floor(to)].path(current,to),floor(to));return last?[...route,...last]:null;
  }
  const length=(route,from)=>{if(!route)return Infinity;let total=0,p=from;for(const q of route){total+=Math.hypot(q.x-p.x,q.z-p.z,(q.y||0)-(p.y||0));p=q;}return total;};
  function path(from,to,preference='auto'){
    if(from.lift)return null;
    const stairs=preference==='elevator'&&floor(from)!==floor(to)&&!from.transition?null:stairsPath(from,to);
    if(floor(from)===floor(to)||from.transition||preference==='stairs')return stairs;
    const entry={x:LIFT.x,z:LIFT.entryZ,floor:floor(from),y:floorElevation(floor(from))},exit={...entry,floor:floor(to),y:floorElevation(floor(to))};
    const first=tag(grids[floor(from)]?.path(from,entry),floor(from)),last=tag(grids[floor(to)]?.path(exit,to),floor(to));
    if(!first||!last)return stairs;
    const lift=[...first,{...entry,liftTo:floor(to)},exit,...last];
    const cost=length(first,from)+length(last,exit)+6+Math.abs(exit.y-entry.y)/LIFT.speed;
    return preference==='elevator'||cost<length(stairs,from)?lift:stairs;
  }
  const onLift=p=>p.lift&&Math.abs(p.x-LIFT.x)<.2&&p.z>=LIFT.entryZ-.05&&p.z<=LIFT.z+.05&&(p.y||0)>=floorElevation(Math.min(...FLOOR_IDS))-.01&&(p.y||0)<=floorElevation(Math.max(...FLOOR_IDS))+.01;
  const onStair=p=>p.transition&&FLOOR_LINKS.some(l=>Math.abs(p.x-l.bottom.x)<.4&&p.z>=-3.9&&p.z<=5.6&&(p.y||0)>=l.bottom.y-.01&&(p.y||0)<=l.top.y+.01);
  const same=(a,b)=>Math.abs(a.x-b.x)<.1&&Math.abs(a.z-b.z)<.1&&floor(a)===floor(b);
  return {path,isBlocked:p=>onStair(p)||onLift(p)?false:!grids[floor(p)]||grids[floor(p)].isBlocked(p),clearSegment:(a,b)=>floor(a)!==floor(b)&&Math.abs(a.x-LIFT.x)<.1&&Math.abs(b.x-LIFT.x)<.1&&Math.abs(a.z-LIFT.entryZ)<.1&&Math.abs(b.z-LIFT.entryZ)<.1?true:floor(a)===floor(b)?grids[floor(a)].clearSegment(a,b):FLOOR_LINKS.some(l=>same(a,l.bottom)&&same(b,l.top)||same(a,l.top)&&same(b,l.bottom)),nearestFree:p=>{const q=grids[floor(p)]?.nearestFree(p);return q&&{...q,floor:floor(p),y:floorElevation(floor(p))};}};
}
const activityOrder=['coffee','massage','dine','mine','meeting','restroom','stretch','snack','nap','garden','reading','capsule','golf','run','workout','maker','research','talk','studio','gaming','greenhouse','skytea','yoga'];
export class OfficeLife {
  constructor(navigator){this.navigator=navigator;this.people=new Map();this.reservations=new Map();this.enabled=true;this.elapsed=0;this.elevator=new ElevatorLife();}
  setNavigator(navigator){this.navigator=navigator;for(const p of this.people.values()){if(p.transport)continue;if(navigator.isBlocked(p.position))p.position=navigator.nearestFree(p.position)||{...p.home};if(p.mode==='walking'&&p.station){p.route=navigator.path(p.position,p.station)||[];if(!p.route.length){this.release(p);this.goHome(p);}}else if(p.mode==='returning')this.goHome(p);}}
  sync(agents){const ids=new Set(agents.map(a=>a.id));for(const [id,p] of this.people)if(!ids.has(id)){this.release(p);this.elevator.cancel(id);this.people.delete(id);}agents.forEach((a,index)=>{if(!this.people.has(a.id))this.people.set(a.id,{id:a.id,index,home:homePosition(index),position:homePosition(index),mode:'idle',work:null,activity:null,station:null,route:[],yaw:0,wait:1.4+index*1.1,duration:0,phase:0,cycle:0,bubble:'',completed:0});});}
  release(p){if(p.station&&this.reservations.get(p.station.id)===p.id)this.reservations.delete(p.station.id);p.station=null;}
  setEnabled(value){this.enabled=value;if(!value){this.elevator.reset();for(const p of this.people.values()){delete p.transport;delete p.pendingHome;this.release(p);p.position={...p.home};p.route=[];p.mode=p.work?'working':'idle';p.activity=null;p.bubble='';p.wait=2+p.index*.7;}}}
  setWork(statuses){for(const p of this.people.values()){const next=statuses[p.id]||null;if(next===p.work)continue;p.work=next;if(next){this.release(p);p.activity=null;p.bubble='커피는 잠시 보류! 자리로 복귀 중';if(this.enabled)this.goHome(p);else{p.position={...p.home};p.route=[];p.mode='working';p.yaw=Math.PI;}}else if(p.mode==='working'){p.mode='idle';p.activity=null;p.bubble='수고했어요. 잠깐 충전!';p.wait=4+p.index*.5;}}}
  goHome(p){if(this.elevator.isRiding(p.id)){p.pendingHome=true;return;}this.elevator.cancel(p.id);delete p.transport;delete p.pendingHome;p.route=this.navigator.path(p.position,p.home,p.transportPreference||'auto')||[];p.mode=p.route.length?'returning':p.work?'working':'idle';if(!p.route.length){p.wait=4;p.bubble=p.work?'업무에 집중하는 중':'';}p.destination='home';}
  choose(p,kind){const preferred=kind||activityOrder[(p.index+p.cycle)%activityOrder.length];const available=STATIONS.filter(s=>!this.reservations.has(s.id)&&(kind?s.kind===kind:s.kind!=='wash')).sort((a,b)=>(a.kind===preferred?-1:0)-(b.kind===preferred?-1:0));
    for(const s of available){const route=this.navigator.path(p.position,s,p.transportPreference||'auto');if(!route)continue;p.station=s;this.reservations.set(s.id,p.id);p.route=route;p.mode='walking';p.activity=s.kind;p.destination=s.id;p.bubble=`${ROOMS.find(r=>r.id===s.room).name} 가는 중`;p.phase=0;return true;}p.mode='idle';p.wait=3;p.bubble='자리 비면 제가 갈게요.';return false;
  }
  tick(dt){dt=Math.min(.15,Math.max(0,dt));this.elapsed+=dt;if(!this.enabled)return;
    for(const id of this.elevator.tick(dt,this.people)){const p=this.people.get(id);if(p?.pendingHome)this.goHome(p);}
    for(const p of this.people.values()){
      p.phase+=dt;if(p.mode.startsWith('lift-'))continue;
      if(p.mode==='walking'||p.mode==='returning'){
        let travel=2.7*dt;while(travel>0&&p.route.length){const q=p.route[0],dx=q.x-p.position.x,dz=q.z-p.position.z,dy=(q.y||0)-(p.position.y||0),d=Math.hypot(dx,dz,dy);if(d>.001)p.yaw=Math.atan2(dx,dz);if(d<=travel){p.position={...q};p.route.shift();travel-=d;if(q.liftTo!==undefined){this.elevator.request(p,q.liftTo);break;}}else{p.position.x+=dx/d*travel;p.position.z+=dz/d*travel;p.position.y=(p.position.y||0)+dy/d*travel;p.position.transition=!!q.transition;p.position.stairId=q.stairId;travel=0;}}
        if(!p.route.length&&!p.transport){p.phase=0;if(p.mode==='returning'){p.mode=p.work?'working':'idle';p.yaw=p.work?Math.PI:0;p.wait=4;p.bubble=p.work?'업무에 집중하는 중':'';p.activity=null;}else{p.mode='resting';p.duration=p.station.seconds;p.yaw=p.station.yaw;p.bubble=p.station.lines[(p.cycle+p.index)%p.station.lines.length];}}
      }else if(p.mode==='resting'){
        p.duration-=dt;if(p.duration<=0){const was=p.activity;this.release(p);p.completed++;p.cycle++;if(was==='restroom'){if(!this.choose(p,'wash'))this.goHome(p);}else this.goHome(p);}
      }else if(p.mode==='idle'&&!p.work){p.wait-=dt;if(p.wait<=0)this.choose(p);}
      else if(p.work){p.mode='working';p.yaw=Math.PI;}
    }
  }
  snapshot(){return [...this.people.values()].map(p=>({id:p.id,mode:p.mode,activity:p.activity,station:p.station?.id||null,x:p.position.x,z:p.position.z,y:p.position.y||0,floor:p.position.floor||1,home:{...p.home},route:p.route.map(q=>({...q})),work:p.work,completed:p.completed,bubble:p.bubble,transport:p.transport?{...p.transport}:null}));}
}
