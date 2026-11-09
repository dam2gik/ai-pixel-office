const {test}=require('node:test'),assert=require('node:assert/strict');
async function setup(){const life=await import('../src/office-life.js'),floors=await import('../src/floors.js'),{buildMap}=await import('../src/office-map.js');const map=buildMap({room:{},box(){},plant(){}});return {...life,...floors,map,nav:life.createNavigator(map.obstacles)};}
test('canteen and two mining levels are reachable from every elevator landing and never invent deep stair links',async()=>{
  const {nav,FLOOR_IDS,floorElevation,STATIONS}=await setup();
  for(const floor of FLOOR_IDS)for(const target of STATIONS.filter(s=>s.floor<=-2)){
    const from={x:-18.7,z:6.1,floor,y:floorElevation(floor)},route=nav.path(from,target);assert.ok(route?.length,`${floor} -> ${target.id}`);
    if(floor!==target.floor)assert.ok(route.some(p=>p.liftTo!==undefined));
    assert.equal(route.at(-1).floor,target.floor);assert.equal(route.at(-1).y,floorElevation(target.floor));
    let last=from;for(const p of route){assert.ok(nav.clearSegment(last,p),target.id);last=p;}
    if(floor!==target.floor)assert.equal(nav.path(from,target,'stairs'),null);
  }
});
test('staff reach a dining seat and return from B2 when work arrives',async()=>{
  const {nav,OfficeLife}=await setup(),life=new OfficeLife(nav);life.sync([{id:'diner'}]);const p=life.people.get('diner');assert.ok(life.choose(p,'dine'));
  for(let i=0;i<4000&&p.mode!=='resting';i++){life.tick(.1);assert.equal(nav.isBlocked(p.position),false);}
  assert.equal(p.mode,'resting');assert.equal(p.position.floor,-2);assert.equal(p.activity,'dine');
  life.setWork({diner:'working'});for(let i=0;i<4000&&p.mode!=='working';i++)life.tick(.1);assert.equal(p.mode,'working');assert.equal(p.position.floor,1);
});
test('reserved mining faces send a third employee to B4 and all return through the shared elevator',async()=>{
  const {nav,OfficeLife}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'},{id:'b'},{id:'c'}]);
  for(const p of life.people.values())assert.ok(life.choose(p,'mine'));
  const p=life.people.get('c');assert.equal(p.station.floor,-4);
  for(let i=0;i<5000&&p.mode!=='resting';i++){life.tick(.1);for(const actor of life.people.values())assert.equal(nav.isBlocked(actor.position),false);}
  assert.equal(p.mode,'resting');assert.equal(p.position.y,-24);assert.equal(p.activity,'mine');assert.ok(life.elevator.completedTrips>=1);
  life.setWork({a:'working',b:'working',c:'working'});for(let i=0;i<5000&&[...life.people.values()].some(a=>a.mode!=='working');i++)life.tick(.1);
  for(const actor of life.people.values()){assert.equal(actor.mode,'working');assert.equal(actor.position.floor,1);}
  assert.ok(life.elevator.completedTrips>=2);
});
test('all new underground levels accept persistent furniture and keep their elevator entrances clear',t=>{
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-deep-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const file=path.join(folder,'office.json'),engine=new Engine(file,new EventEmitter());
  for(const [floor,area] of [[-2,'canteen-lobby'],[-3,'mine-lobby'],[-4,'mine-deep-lobby']]){const id=engine.addFurniture({type:'armchair',floor,area});assert.equal(engine.validateFurniture(id,{x:-18.7,z:6.1}).valid,false);}
  engine.persist();const restored=new Engine(file,new EventEmitter());assert.deepEqual(restored.state.furniture.map(f=>f.floor),[-2,-3,-4]);
});
