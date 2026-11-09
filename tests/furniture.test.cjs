const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
const {layout,footprint,validatePlacement}=require('../electron/furniture.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'office-furniture-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const codex=new EventEmitter();return {engine:new Engine(path.join(dir,'office.json'),codex),codex};}
test('added furniture can move, rotate, change floors, persist and be removed',t=>{
  const {engine,codex}=fixture(t),id=engine.addFurniture('plant');let item=engine.state.furniture[0];
  assert.equal(item.floor,1);engine.moveFurniture(id,{x:item.x+2,z:item.z+.5,rotation:90});assert.equal(engine.state.furniture[0].rotation,90);
  engine.moveFurniture(id,{floor:2});assert.equal(engine.state.furniture[0].floor,2);assert.equal(engine.state.furniture[0].rotation,90);
  const restored=new Engine(engine.file,codex);assert.deepEqual(restored.state.furniture,engine.state.furniture);
  restored.removeFurniture(id);assert.equal(restored.state.furniture.length,0);assert.throws(()=>restored.removeFurniture(id));
});
test('overlaps, protected corridors, invalid coordinates and unsafe rotations are rejected',t=>{
  const {engine}=fixture(t),a=engine.addFurniture('table'),b=engine.addFurniture('sofa'),other=engine.state.furniture[1],before=structuredClone(engine.state.furniture);
  for(const patch of [{x:0,z:12},{x:999,z:0},{x:NaN},{floor:9},{rotation:45},{x:other.x,z:other.z}])assert.throws(()=>engine.moveFurniture(a,patch));
  assert.equal(engine.validateFurniture(a,{x:0,z:12}).valid,false);assert.deepEqual(engine.state.furniture,before);
  assert.throws(()=>engine.moveFurniture('missing',{x:1}));assert.ok(b);
});
test('legacy furniture receives safe positions without changing IDs and supports garden placement',t=>{
  const {engine,codex}=fixture(t);engine.state.furniture=[{id:'old-1',type:'sofa'},{id:'old-2',type:'plant'}];engine.persist();
  const restored=new Engine(engine.file,codex);assert.deepEqual(restored.state.furniture.map(f=>f.id),['old-1','old-2']);for(const f of restored.state.furniture)validatePlacement(f,restored.state.furniture);
  const id=restored.addFurniture({type:'bench',floor:1,area:'garden'}),garden=restored.state.furniture.find(f=>f.id===id);assert.ok(garden.z>16);
  assert.throws(()=>restored.addFurniture({type:'bench',floor:2,area:'garden'}));
});
test('60 varied furniture pieces leave all facilities and both floors accessible',async t=>{
  const {engine}=fixture(t),types=Object.keys(layout.types);
  for(let i=0;i<60;i++)engine.addFurniture({type:types[i%types.length],floor:i%3===0?2:1});
  assert.throws(()=>engine.addFurniture('plant'),/60/);
  const {buildMap}=await import('../src/office-map.js'),{createNavigator,STATIONS,homePosition}=await import('../src/office-life.js');
  const map=buildMap({room:{},box(){},plant(){}}),obstacles=engine.state.furniture.map(f=>({...f,...footprint(f)}));
  const nav=createNavigator([...map.obstacles,...obstacles]);
  for(const station of STATIONS)assert.ok(nav.path(homePosition(0),station),station.id);
});
test('garden-side walls and entrances stay clear and older furniture is relocated safely',t=>{
  const {engine,codex}=fixture(t),id=engine.addFurniture('plant');
  assert.equal(engine.validateFurniture(id,{x:8.5,z:11.5}).valid,false);
  assert.equal(engine.validateFurniture(id,{x:12,z:11.3}).valid,false);
  engine.state.furniture=[{id:'old-entry',type:'plant',floor:1,x:8.5,z:11.5,rotation:0}];engine.persist();
  const restored=new Engine(engine.file,codex),item=restored.state.furniture[0];assert.equal(item.id,'old-entry');
  assert.notDeepEqual([item.x,item.z],[8.5,11.5]);assert.doesNotThrow(()=>validatePlacement(item,restored.state.furniture));
});
