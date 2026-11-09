const C=require('./game-catalog.json'),W=require('./game-world.json');
const own=(o,k)=>Object.hasOwn(o,k),integer=(v,min,max,fallback)=>Number.isSafeInteger(v)&&v>=min&&v<=max?v:fallback;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),MAX_GOLD=1e12,MAX_STOCK=1e9;
function random(g){g.seed=(Math.imul(g.seed,1664525)+1013904223)>>>0;return g.seed/4294967296;}
function pick(g,values){return values[Math.floor(random(g)*values.length)];}
function point(floor,node){const [x,z]=W.floors[floor].nodes[node];return {x,z};}
function nearest(floor,x,z){const nodes=W.floors[floor].nodes;let best=0;for(let i=1;i<nodes.length;i++)if(Math.hypot(nodes[i][0]-x,nodes[i][1]-z)<Math.hypot(nodes[best][0]-x,nodes[best][1]-z))best=i;return best;}
function log(g,text){g.history.push({at:g.time,text});g.history=g.history.slice(-32);}
function addItem(g,item,count){g.inventory[item]=Math.min(MAX_STOCK,(g.inventory[item]||0)+count);}
const names=['민준','서연','도윤','지우','하은','준서','지민','시우','서아','예준','수빈','유준','하린','서준','예린','도하','지안','주원','민서','은우','서현','우진','채원','이준','다은','시윤','윤서','건우','소율','현우','유나','도현','수아','준우','나은','지훈','예은','하준','다온','유빈'];
function allowed(job,floor){return Number.isInteger(floor)&&own(C.jobs,job)&&own(W.floors,floor)&&(job==='miner'?floor<=-3:job==='guard'?C.monsterFloors.includes(floor):floor>=-2);}
function npc(id,job,floor){const data=W.floors[floor],arrival=point(floor,data.arrival),near=data.nodes.flatMap(([x,z],i)=>Math.hypot(x-arrival.x,z-arrival.z)<4.5?[i]:[]),node=near[(id-1)%near.length]??data.arrival;return {id:'npc-'+id,name:'NPC '+String(id).padStart(2,'0')+' · '+names[(id-1)%names.length],job,floor,node,...point(floor,node),hp:job==='guard'?75:45,enabled:true,phase:'idle',route:[],target:null,progress:0,cooldown:0,recover:0,yaw:0};}
function createGame(seed=Date.now()){
  return {version:1,seed:seed>>>0,time:0,running:true,gold:C.initialGold,inventory:Object.fromEntries(Object.keys(C.items).map(k=>[k,0])),npcs:[npc(1,'miner',-3),npc(2,'miner',-4),npc(3,'guard',-5),npc(4,'guard',-6),npc(5,'roamer',1)],monsters:[],drops:[],monsterCap:C.defaultMonsterCap,spawnClock:5,nextNpc:6,nextEntity:1,history:[]};
}
function normalizeGame(raw){
  if(!raw||raw.version!==1)return createGame();
  const g=createGame(integer(raw.seed,0,4294967295,1234));g.time=Number.isFinite(raw.time)?Math.max(0,raw.time):0;g.running=raw.running!==false;g.gold=integer(raw.gold,0,MAX_GOLD,0);g.monsterCap=integer(raw.monsterCap,0,C.maxMonsterCap,C.defaultMonsterCap);
  for(const k of Object.keys(C.items))g.inventory[k]=integer(raw.inventory?.[k],0,MAX_STOCK,0);
  const seen=new Set();g.npcs=[];
  for(const n of Array.isArray(raw.npcs)?raw.npcs.slice(0,C.maxNpcs):[]){
    if(!/^npc-[1-9][0-9]{0,3}$/.test(n.id)||seen.has(n.id)||!allowed(n.job,n.floor))continue;seen.add(n.id);
    const id=Number(n.id.slice(4));if(id>C.maxNpcs)continue;const entry=npc(id,n.job,n.floor),node=nearest(n.floor,Number.isFinite(n.x)?n.x:entry.x,Number.isFinite(n.z)?n.z:entry.z);
    g.npcs.push({...entry,node,...point(n.floor,node),enabled:n.enabled!==false});
  }
  for(let i=1;g.npcs.length<C.initialNpcs;i++)if(!seen.has('npc-'+i)){g.npcs.push(npc(i,'miner',-3));seen.add('npc-'+i);}
  g.nextNpc=Math.max(6,...g.npcs.map(n=>Number(n.id.slice(4))+1));g.nextEntity=integer(raw.nextEntity,1,1e9,1);
  const perFloor={};g.monsters=[];
  for(const m of Array.isArray(raw.monsters)?raw.monsters:[]){
    if(!C.monsterFloors.includes(m.originFloor)||!own(C.monsters,m.type)||g.monsters.some(v=>v.id===m.id)||typeof m.id!=='string'||m.id.length>64)continue;
    if((perFloor[m.originFloor]||0)>=g.monsterCap||g.monsters.length>=C.globalMonsterCap)continue;
    const node=nearest(m.originFloor,Number.isFinite(m.x)?m.x:0,Number.isFinite(m.z)?m.z:0);
    g.monsters.push({id:m.id,type:m.type,floor:m.originFloor,originFloor:m.originFloor,node,...point(m.originFloor,node),hp:integer(m.hp,1,C.monsters[m.type].hp,C.monsters[m.type].hp),route:[],cooldown:0,wander:0,yaw:0});perFloor[m.originFloor]=(perFloor[m.originFloor]||0)+1;
  }
  g.drops=[];for(const d of Array.isArray(raw.drops)?raw.drops:[]){if(g.drops.length>=C.maxDrops)break;if(!own(C.items,d.item)||!own(W.floors,d.floor)||typeof d.id!=='string'||g.drops.some(v=>v.id===d.id))continue;const node=nearest(d.floor,d.x||0,d.z||0);g.drops.push({id:d.id,item:d.item,count:integer(d.count,1,99,1),floor:d.floor,node,...point(d.floor,node),available:g.time,expires:g.time+120});}
  g.history=Array.isArray(raw.history)?raw.history.filter(e=>typeof e?.text==='string').slice(-32).map(e=>({at:Number(e.at)||0,text:e.text.slice(0,200)})):[];return g;
}
function hirePrice(g){return C.hireBase+Math.max(0,g.npcs.length-C.initialNpcs)*C.hireIncrement;}
class GameWorld{
  constructor(){this.signature='';this.blocked={};}
  furniture(items=[]){const signature=JSON.stringify(items);if(signature===this.signature)return;this.signature=signature;const layout=require('./furniture-layout.json');
    for(const [floor,data] of Object.entries(W.floors)){const relevant=items.filter(i=>String(i.floor)===floor&&own(layout.types,i.type));this.blocked[floor]=new Set(data.nodes.flatMap(([x,z],index)=>relevant.some(f=>{const spec=layout.types[f.type],side=f.rotation===90||f.rotation===270;return Math.abs(x-f.x)<(side?spec.d:spec.w)/2+.25&&Math.abs(z-f.z)<(side?spec.w:spec.d)/2+.25;})?[index]:[]));}
  }
  free(floor,node){return !this.blocked[floor]?.has(node);}
  nearest(floor,x,z){let best=null,bestD=Infinity;for(let i=0;i<W.floors[floor].nodes.length;i++){if(!this.free(floor,i))continue;const p=point(floor,i),d=Math.hypot(p.x-x,p.z-z);if(d<bestD){best=i;bestD=d;}}return best;}
  path(floor,from,to){const data=W.floors[floor],queue=[from],prev=new Int32Array(data.nodes.length).fill(-1);prev[from]=from;for(let head=0;head<queue.length&&prev[to]===-1;head++)for(const n of data.edges[queue[head]])if(prev[n]===-1&&this.free(floor,n)){prev[n]=queue[head];queue.push(n);}if(prev[to]===-1)return [];const route=[];for(let n=to;n!==from;n=prev[n])route.push(n);return route.reverse();}
}
function walk(entity,dt,speed,world){let left=dt*speed;while(left>0&&entity.route.length){const node=entity.route[0];if(!world.free(entity.floor,node)){entity.route=[];break;}const target=point(entity.floor,node),dx=target.x-entity.x,dz=target.z-entity.z,d=Math.hypot(dx,dz);if(d>.001)entity.yaw=Math.atan2(dx,dz);if(d<=left){entity.x=target.x;entity.z=target.z;entity.node=node;entity.route.shift();left-=d;}else{entity.x+=dx/d*left;entity.z+=dz/d*left;left=0;}}}
function go(entity,node,world){if(entity.target!==node||!entity.route.length){entity.node=world.nearest(entity.floor,entity.x,entity.z);entity.route=[entity.node,...world.path(entity.floor,entity.node,node)];entity.target=node;}entity.phase='walking';}
function spawn(g,world){
  for(const floor of C.monsterFloors){
    if(g.monsters.length>=C.globalMonsterCap||g.monsters.filter(m=>m.originFloor===floor).length>=g.monsterCap)continue;
    const candidates=W.floors[floor].encounters.filter(n=>world.free(floor,n));if(!candidates.length)continue;let node;
    for(let i=0;i<20;i++){const n=pick(g,candidates),p=point(floor,n);if(!g.npcs.some(v=>v.floor===floor&&distance(v,p)<4)){node=n;break;}}
    if(node===undefined)continue;const type=pick(g,Object.keys(C.monsters));g.monsters.push({id:'monster-'+g.nextEntity++,type,floor,originFloor:floor,node,...point(floor,node),hp:C.monsters[type].hp,route:[],cooldown:0,wander:0,yaw:0});
  }
}
function drop(g,m){if(g.drops.length>=C.maxDrops)return;g.drops.push({id:'drop-'+g.nextEntity++,item:C.monsters[m.type].loot,count:1+Math.floor(random(g)*2),floor:m.originFloor,node:m.node,x:m.x,z:m.z,available:g.time+1,expires:g.time+120});}
function collect(g,d){addItem(g,d.item,d.count);g.drops=g.drops.filter(v=>v.id!==d.id);log(g,C.items[d.item].name+' '+d.count+'개 획득');}
function ore(g,floor){const table=floor===-3?['coal','coal','coal','copper','iron']:floor===-4?['coal','iron','iron','silver']:floor===-5?['iron','silver','silver','goldOre','crystal']:['silver','goldOre','goldOre','crystal','crystal'];return pick(g,table);}
function stepGame(g,seconds,world,furniture=[]){
  if(!g.running)return;const dt=Math.max(0,Math.min(1,Number(seconds)||0));if(!dt)return;world.furniture(furniture);g.time+=dt;g.spawnClock+=dt;if(g.spawnClock>=C.spawnSeconds){g.spawnClock=0;spawn(g,world);}
  g.drops=g.drops.filter(d=>d.expires>g.time);g.monsters=g.monsters.filter(m=>m.hp>0);
  for(const m of g.monsters){
    if(m.floor!==m.originFloor){m.floor=m.originFloor;m.route=[];m.node=world.nearest(m.floor,m.x,m.z);Object.assign(m,point(m.floor,m.node));}
    if(!world.free(m.floor,m.node)){m.node=world.nearest(m.floor,m.x,m.z);Object.assign(m,point(m.floor,m.node));m.route=[];}
    m.cooldown=Math.max(0,m.cooldown-dt);m.wander-=dt;
    const targets=g.npcs.filter(n=>n.floor===m.originFloor&&n.hp>0&&n.enabled).sort((a,b)=>distance(a,m)-distance(b,m)),target=targets[0];
    if(target&&distance(m,target)<1.65){m.route=[];if(m.cooldown===0){target.hp=Math.max(0,target.hp-C.monsters[m.type].damage);m.cooldown=2;}}
    else if(target&&distance(m,target)<9){const node=world.nearest(m.floor,target.x,target.z);go(m,node,world);}
    else if(m.wander<=0||!m.route.length){m.wander=4+random(g)*5;const choices=W.floors[m.floor].encounters.filter(n=>world.free(m.floor,n));if(choices.length)go(m,pick(g,choices),world);}
    walk(m,dt,C.monsters[m.type].speed,world);
  }
  for(const n of g.npcs){
    n.cooldown=Math.max(0,n.cooldown-dt);if(!n.enabled){n.phase='paused';continue;}
    if(n.hp<=0){n.phase='recovering';n.recover+=dt;if(n.recover>=8){n.hp=n.job==='guard'?75:45;n.recover=0;n.node=W.floors[n.floor].arrival;Object.assign(n,point(n.floor,n.node));n.route=[];n.target=null;}continue;}
    if(!world.free(n.floor,n.node)){const node=world.nearest(n.floor,n.x,n.z);n.node=node;Object.assign(n,point(n.floor,node));n.route=[];n.target=null;}
    const nearby=g.drops.filter(d=>d.floor===n.floor&&d.available<=g.time).sort((a,b)=>distance(a,n)-distance(b,n))[0];
    if(nearby&&distance(n,nearby)<1.6){collect(g,nearby);n.route=[];n.target=null;}
    else if(nearby&&distance(n,nearby)<7){go(n,nearby.node,world);walk(n,dt,2.4,world);continue;}
    const enemies=g.monsters.filter(m=>m.originFloor===n.floor&&m.hp>0).sort((a,b)=>(a.id===n.focus?-1000:distance(a,n))-(b.id===n.focus?-1000:distance(b,n))),enemy=enemies[0];
    if(enemy&&(n.job==='guard'||distance(n,enemy)<2)){
      if(distance(n,enemy)<1.8){n.phase='combat';n.route=[];n.yaw=Math.atan2(enemy.x-n.x,enemy.z-n.z);if(n.cooldown===0){enemy.hp=Math.max(0,enemy.hp-(n.job==='guard'?9:4));n.cooldown=1;if(enemy.hp===0){drop(g,enemy);log(g,n.name+' · '+C.monsters[enemy.type].name+' 처치');}}}
      else{go(n,enemy.node,world);walk(n,dt,2.6,world);}continue;
    }
    if(n.job==='miner'){
      const choices=W.floors[n.floor].mining.filter(id=>world.free(n.floor,id));
      if(!choices.includes(n.target)){const busy=new Set(g.npcs.filter(v=>v.id!==n.id&&v.floor===n.floor).map(v=>v.target)),free=choices.filter(id=>!busy.has(id));if(free.length)go(n,pick(g,free),world);}
      if(choices.includes(n.target)&&distance(n,point(n.floor,n.target))>.05){if(!n.route.length)go(n,n.target,world);n.phase='walking';walk(n,dt,2.3,world);}else if(choices.includes(n.target)){n.phase='mining';n.progress+=dt;if(n.progress>=C.mineSeconds){const item=ore(g,n.floor),count=1+Math.floor(random(g)*3);addItem(g,item,count);n.progress=0;n.target=null;log(g,n.name+' · '+C.items[item].name+' '+count+'개 채굴');}}
    }else{
      if(!n.route.length){const choices=n.job==='guard'?W.floors[n.floor].encounters:W.floors[n.floor].nodes.map((_v,i)=>i);if(choices.length)go(n,pick(g,choices),world);}walk(n,dt,1.7,world);
    }
  }
  g.monsters=g.monsters.filter(m=>m.hp>0);
}
function commandGame(g,command){
  if(!command||typeof command!=='object')throw new Error('게임 명령이 올바르지 않습니다.');
  if(command.type==='hire'){
    if(g.npcs.length>=C.maxNpcs)throw new Error('일반 NPC는 최대 40명까지 고용할 수 있습니다.');if(!allowed(command.job,command.floor))throw new Error('직무와 근무 층을 확인해 주세요.');const price=hirePrice(g);if(g.gold<price)throw new Error('고용에 '+price+' 골드가 필요합니다.');g.gold-=price;const n=npc(g.nextNpc++,command.job,command.floor);g.npcs.push(n);log(g,n.name+' 고용 · '+price+' 골드');return {hired:n.id};
  }
  if(command.type==='sell'||command.type==='sellAll'){
    const entries=command.type==='sellAll'?Object.keys(C.items):[command.item];if(entries.some(k=>!own(C.items,k)))throw new Error('판매할 수 없는 아이템입니다.');
    const sales=entries.map(item=>{const count=command.type==='sellAll'||command.count==='all'?g.inventory[item]:command.count;if(!Number.isSafeInteger(count)||count<0||count>(g.inventory[item]||0))throw new Error('판매 수량이 올바르지 않습니다.');return {item,count};});
    if(command.type==='sell'&&!sales[0].count)throw new Error('판매할 아이템이 없습니다.');const gold=sales.reduce((v,s)=>v+s.count*C.items[s.item].price,0);if(g.gold+gold>MAX_GOLD)throw new Error('보유 골드 한도를 초과합니다.');for(const s of sales)g.inventory[s.item]-=s.count;g.gold+=gold;if(gold)log(g,'아이템 판매 · '+gold+' 골드 획득');return {gold};
  }
  if(command.type==='monsterCap'){
    const cap=command.value;if(!Number.isInteger(cap)||cap<0||cap>C.maxMonsterCap)throw new Error('층별 몬스터 정원은 0~12마리입니다.');g.monsterCap=cap;const counts={};g.monsters=g.monsters.filter(m=>{counts[m.originFloor]=(counts[m.originFloor]||0)+1;return counts[m.originFloor]<=cap;});return {cap};
  }
  if(command.type==='running'){if(typeof command.value!=='boolean')throw new Error('실행 상태가 올바르지 않습니다.');g.running=command.value;return {};}
  if(command.type==='collect'){
    if(!own(W.floors,command.floor))throw new Error('층이 올바르지 않습니다.');const drops=g.drops.filter(d=>d.floor===command.floor&&d.available<=g.time);for(const d of drops)collect(g,d);return {collected:drops.length};
  }
  if(command.type==='target'){
    const target=g.monsters.find(m=>m.id===command.id);if(!target)throw new Error('몬스터가 이미 사라졌습니다.');const guards=g.npcs.filter(n=>n.job==='guard'&&n.floor===target.originFloor&&n.enabled);if(!guards.length)throw new Error('해당 층에 전투 NPC가 필요합니다.');for(const n of guards){n.focus=target.id;n.route=[];n.target=null;}return {};
  }
  if(command.type==='npcEnabled'){const n=g.npcs.find(v=>v.id===command.id);if(!n||typeof command.value!=='boolean')throw new Error('NPC 설정이 올바르지 않습니다.');n.enabled=command.value;n.phase=n.enabled?'idle':'paused';n.route=[];n.target=null;return {};}
  throw new Error('지원하지 않는 게임 명령입니다.');
}
module.exports={createGame,normalizeGame,stepGame,commandGame,hirePrice,GameWorld,catalog:C,world:W};
