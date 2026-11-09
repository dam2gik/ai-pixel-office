const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGame,normalizeGame,stepGame,commandGame,hirePrice,GameWorld,catalog:C,world:W}=require('../electron/game.cjs');
test('five normal NPCs earn minerals and loot without needing seed gold or AI turns',()=>{
  const g=createGame(1),w=new GameWorld();assert.equal(g.npcs.length,5);assert.equal(g.gold,0);
  for(let i=0;i<300;i++)stepGame(g,1,w);
  assert.ok(Object.entries(C.items).filter(([_k,v])=>v.kind==='mineral').some(([k])=>g.inventory[k]>0));
  assert.ok(Object.entries(C.items).filter(([_k,v])=>v.kind==='loot').some(([k])=>g.inventory[k]>0));
  const sold=commandGame(g,{type:'sellAll'}).gold;assert.ok(sold>=hirePrice(g));commandGame(g,{type:'hire',job:'miner',floor:-3});assert.equal(g.npcs.length,6);
});
test('monster spawning respects per-floor/global caps and never changes the birth floor',()=>{
  const g=createGame(53),w=new GameWorld(),births=new Map();g.npcs.forEach(n=>n.enabled=false);
  for(let i=0;i<900;i++){stepGame(g,1,w);assert.ok(g.monsters.length<=C.globalMonsterCap);for(const floor of C.monsterFloors)assert.ok(g.monsters.filter(m=>m.originFloor===floor).length<=g.monsterCap);for(const m of g.monsters){assert.ok(C.monsterFloors.includes(m.originFloor));assert.equal(m.floor,m.originFloor);if(births.has(m.id))assert.equal(births.get(m.id),m.originFloor);births.set(m.id,m.originFloor);}}
  assert.equal(g.monsters.length,12);const m=g.monsters[0];m.floor=1;stepGame(g,1,w);assert.equal(m.floor,m.originFloor);
  commandGame(g,{type:'monsterCap',value:2});assert.ok(g.monsters.length<=4);assert.equal(g.drops.length,0);commandGame(g,{type:'monsterCap',value:0});for(let i=0;i<20;i++)stepGame(g,1,w);assert.equal(g.monsters.length,0);
});
test('a kill creates floor-bound loot, then collection awards it exactly once',()=>{
  const g=createGame(9),w=new GameWorld(),guard=g.npcs.find(n=>n.floor===-5),node=W.floors[-5].encounters[0],[x,z]=W.floors[-5].nodes[node];
  Object.assign(guard,{node,x,z,route:[]});g.spawnClock=0;g.monsters=[{id:'test-monster',type:'slime',floor:-5,originFloor:-5,node,x,z,hp:1,route:[],cooldown:99,wander:5}];
  stepGame(g,1,w);assert.equal(g.monsters.length,0);assert.equal(g.drops.length,1);assert.equal(g.drops[0].floor,-5);const count=g.drops[0].count;
  assert.equal(commandGame(g,{type:'collect',floor:-5}).collected,0);stepGame(g,1,w);assert.equal(g.inventory.slimeGel,count);assert.equal(g.drops.length,0);commandGame(g,{type:'collect',floor:-5});assert.equal(g.inventory.slimeGel,count);
});
test('sales use fixed server prices, reject forged quantities, and cannot create negative stock or gold',()=>{
  const g=createGame(5);g.inventory.coal=10;
  for(const count of [-1,11,NaN,Infinity,1.5,'10'])assert.throws(()=>commandGame(g,{type:'sell',item:'coal',count}));
  assert.throws(()=>commandGame(g,{type:'sell',item:'__proto__',count:1}));assert.equal(g.inventory.coal,10);assert.equal(g.gold,0);
  assert.equal(commandGame(g,{type:'sell',item:'coal',count:3,price:999999}).gold,12);assert.equal(g.inventory.coal,7);assert.equal(g.gold,12);
  assert.throws(()=>commandGame(g,{type:'hire',job:'guard',floor:-5}));assert.equal(g.npcs.length,5);
});
test('NPC employment is capped at forty total and does not add real agents',()=>{
  const g=createGame(7);g.gold=1000000;const initial=hirePrice(g);
  for(let i=0;i<35;i++)commandGame(g,{type:'hire',job:i%2?'guard':'miner',floor:-5});assert.equal(g.npcs.length,40);assert.equal(new Set(g.npcs.map(n=>n.id)).size,40);assert.ok(hirePrice(g)>initial);
  const gold=g.gold;assert.throws(()=>commandGame(g,{type:'hire',job:'miner',floor:-3}),/40/);assert.equal(g.gold,gold);
  assert.throws(()=>commandGame(createGame(),{type:'hire',job:'guard',floor:1}));assert.throws(()=>commandGame(createGame(),{type:'monsterCap',value:13}));
});
test('paused gameplay cannot mine, spawn or fight and saved data retains economy and population limits',()=>{
  const g=createGame(33);g.inventory.goldOre=8;g.gold=200;commandGame(g,{type:'running',value:false});const before=structuredClone(g);stepGame(g,1,new GameWorld());assert.deepEqual(g,before);
  const loaded=normalizeGame(JSON.parse(JSON.stringify(g)));assert.equal(loaded.gold,200);assert.equal(loaded.inventory.goldOre,8);assert.equal(loaded.npcs.length,5);assert.equal(loaded.running,false);
  const malformed=normalizeGame({...g,monsterCap:100,npcs:[...g.npcs,...g.npcs,...g.npcs]});assert.ok(malformed.npcs.length<=40);assert.equal(new Set(malformed.npcs.map(n=>n.id)).size,malformed.npcs.length);assert.equal(malformed.monsterCap,6);
});
test('game commands persist, roll back failed saves, and never call Codex or mutate agent/project records',t=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-game-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const codex=new EventEmitter();codex.request=()=>{throw new Error('NPC must not use AI');};
  const file=path.join(folder,'office.json'),engine=new Engine(file,codex),business=structuredClone({agents:engine.state.agents,projects:engine.state.projects});engine.state.game.inventory.iron=20;
  const persist=engine.persist;engine.persist=()=>{throw new Error('disk full');};const before=engine.gameSnapshot();assert.throws(()=>engine.gameCommand({type:'sellAll'}),/disk full/);assert.deepEqual(engine.gameSnapshot(),before);engine.persist=persist;
  engine.gameCommand({type:'sellAll'});engine.gameCommand({type:'hire',job:'guard',floor:-5});const restored=new Engine(file,new EventEmitter());assert.equal(restored.state.game.npcs.length,6);assert.equal(restored.state.game.gold,90);assert.deepEqual({agents:engine.state.agents,projects:engine.state.projects},business);
});
test('NPC and monster movement stays on modeled walkable cells for an extended simulation',async()=>{
  const {buildMap}=await import('../src/office-map.js'),{createNavigator}=await import('../src/office-life.js');const map=buildMap({room:{},box(){},plant(){}}),nav=createNavigator(map.obstacles),g=createGame(983),w=new GameWorld();
  for(let i=0;i<240;i++){stepGame(g,1,w);for(const n of [...g.npcs,...g.monsters])assert.equal(nav.isBlocked({x:n.x,z:n.z,floor:n.floor}),false,n.id+' walked through a modeled wall');}
});
