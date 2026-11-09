const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {applyFurniturePreset}=require('../electron/furniture-preset.cjs'),{validatePlacement,footprint,layout}=require('../electron/furniture.cjs');
test('reference furniture is placed without overlaps and every facility remains reachable',async()=>{
  const state={furniture:[]};assert.deepEqual(applyFurniturePreset(state),{added:29,skipped:0});
  for(const f of state.furniture)assert.doesNotThrow(()=>validatePlacement(f,state.furniture));
  const {buildMap}=await import('../src/office-map.js'),{createNavigator,STATIONS,homePosition}=await import('../src/office-life.js');
  const map=buildMap({room:{},box(){},plant(){}}),nav=createNavigator([...map.obstacles,...state.furniture.map(f=>({...f,...footprint(f)}))]);
  for(const station of STATIONS)for(let i=0;i<12;i++)assert.ok(nav.path(homePosition(i),station),`${i} -> ${station.id}`);
  assert.deepEqual(applyFurniturePreset(state),{added:0,skipped:0});assert.equal(state.furniture.length,29);
});
test('user furniture remains untouched and removed preset furniture does not reappear',()=>{
  const mine={id:'mine',type:'plant',floor:1,x:-12,z:12,rotation:0},state={furniture:[mine]};
  applyFurniturePreset(state);assert.deepEqual(state.furniture[0],mine);
  const deleted=state.furniture.find(f=>f.id!==mine.id).id;state.furniture=state.furniture.filter(f=>f.id!==deleted);
  applyFurniturePreset(state);assert.ok(!state.furniture.some(f=>f.id===deleted));
});
test('preset saves once, preserves project state, and rolls back a failed save',t=>{
  const {Engine}=require('../electron/engine.cjs'),{EventEmitter}=require('node:events');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-preset-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const file=path.join(folder,'office.json'),engine=new Engine(file,new EventEmitter()),before=structuredClone({agents:engine.state.agents,projects:engine.state.projects});
  const persist=engine.persist;engine.persist=()=>{throw new Error('disk full');};assert.throws(()=>engine.furnishOfficeOnce(),/disk full/);assert.equal(engine.state.furniture.length,0);assert.equal(engine.state.furnishingVersion,undefined);
  engine.persist=persist;engine.furnishOfficeOnce();const restored=new Engine(file,new EventEmitter());assert.equal(restored.state.furniture.length,29);assert.deepEqual({agents:restored.state.agents,projects:restored.state.projects},before);
  restored.removeFurniture(restored.state.furniture[0].id);clearTimeout(restored.changeTimer);restored.persist();assert.equal(new Engine(file,new EventEmitter()).furnishOfficeOnce().added,0);
});
test('every new model fits its placement footprint and uses positive finite geometry',async()=>{
  const {paintFurniture}=await import('../src/furniture-models.js');
  for(const [type,spec] of Object.entries(layout.types)){
    let count=0;const painted=paintFurniture(type,{},(_g,x,y,z,w,h,d)=>{
      count++;for(const n of [x,y,z,w,h,d])assert.ok(Number.isFinite(n),type);
      assert.ok(w>0&&h>0&&d>0,type);assert.ok(Math.abs(x)+w/2<=spec.w/2+1e-6,`${type}: x extent`);assert.ok(Math.abs(z)+d/2<=spec.d/2+1e-6,`${type}: z extent`);
    });
    if(painted)assert.ok(count>0);
  }
});
