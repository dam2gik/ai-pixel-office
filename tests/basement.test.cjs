const {test}=require('node:test'),assert=require('node:assert/strict');
async function setup(){const life=await import('../src/office-life.js'),{buildMap}=await import('../src/office-map.js');const map=buildMap({room:{},box(){},plant(){}});return {...life,map,nav:life.createNavigator(map.obstacles)};}
test('B1 facilities connect to both upper levels through the two independent stair runs',async()=>{
  const {nav,STATIONS,homePosition}=await setup();
  for(const station of STATIONS.filter(s=>s.floor===-1)){
    assert.equal(nav.isBlocked(station),false,station.id);
    for(const from of [homePosition(0),{x:-8,z:-1.8,floor:2,y:6}]){
      const route=nav.path(from,station,'stairs');assert.ok(route?.length,station.id);assert.ok(route.some(p=>p.stairId==='basement'));
      if(from.floor===2)assert.ok(route.some(p=>p.stairId==='upper'));
      let previous=from;for(const p of route){assert.ok(nav.clearSegment(previous,p),`${station.id}: segment`);previous=p;}
      assert.equal(route.at(-1).floor,-1);assert.equal(route.at(-1).y,-6);
    }
  }
});
test('each new B1 activity can be visited and staff can return to work mid-descent',async()=>{
  const {OfficeLife,nav}=await setup();
  for(const kind of ['capsule','golf','run','workout']){
    const life=new OfficeLife(nav);life.sync([{id:'visitor'}]);const person=life.people.get('visitor');assert.equal(life.choose(person,kind),true);
    for(let i=0;i<3000&&person.mode!=='resting';i++){life.tick(.1);assert.equal(nav.isBlocked(person.position),false);}
    assert.equal(person.mode,'resting',kind);assert.equal(person.position.floor,-1);assert.equal(person.position.y,-6);
    life.setWork({visitor:'working'});for(let i=0;i<3000&&person.mode!=='working';i++)life.tick(.1);assert.equal(person.mode,'working');assert.equal(person.position.floor,1);
  }
  const life=new OfficeLife(nav);life.sync([{id:'visitor'}]);const p=life.people.get('visitor');p.transportPreference='stairs';life.choose(p,'golf');
  let descending=false;for(let i=0;i<3000;i++){life.tick(.1);if(p.position.transition&&p.position.y<-1&&p.position.y>-5){descending=true;break;}}
  assert.ok(descending);life.setWork({visitor:'working'});for(let i=0;i<3000&&p.mode!=='working';i++)life.tick(.1);assert.equal(p.mode,'working');assert.equal(p.position.floor,1);
});
test('B1 furniture supports persistence, floor transfers and protects the stairs',t=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-b1-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));const file=path.join(folder,'office.json'),engine=new Engine(file,new EventEmitter());
  const id=engine.addFurniture({type:'armchair',floor:-1,area:'basement-lobby'});assert.equal(engine.state.furniture[0].floor,-1);
  assert.equal(engine.validateFurniture(id,{x:-20.5,z:1}).valid,false);engine.moveFurniture(id,{rotation:90});engine.persist();
  const restored=new Engine(file,new EventEmitter());assert.equal(restored.state.furniture[0].floor,-1);assert.equal(restored.state.furniture[0].rotation,90);
  restored.moveFurniture(id,{floor:2});assert.equal(restored.state.furniture[0].floor,2);clearTimeout(restored.changeTimer);
});
