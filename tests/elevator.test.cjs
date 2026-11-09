const {test}=require('node:test'),assert=require('node:assert/strict');
async function setup(){const life=await import('../src/office-life.js'),{buildMap}=await import('../src/office-map.js'),{LIFT,BASEMENT_BOUNDS}=await import('../src/transport-config.js');const map=buildMap({room:{},box(){},plant(){}});return {...life,map,LIFT,BASEMENT_BOUNDS,nav:life.createNavigator(map.obstacles)};}
test('expanded B1 and all three elevator landings have usable routes while stair routes remain available',async()=>{
  const {map,nav,LIFT,BASEMENT_BOUNDS}=await setup();assert.ok((BASEMENT_BOUNDS.maxX-BASEMENT_BOUNDS.minX)*(BASEMENT_BOUNDS.maxZ-BASEMENT_BOUNDS.minZ)>880*2.5);
  assert.deepEqual(map.architecture.filter(f=>f.type==='elevator').map(f=>f.floor),[-6,-5,-4,-3,-2,-1,1,2,3,4,5]);
  for(const floor of [-1,1,2]){
    const from={x:LIFT.x,z:LIFT.entryZ,floor,y:floor===-1?-6:floor===2?6:0};assert.equal(nav.isBlocked(from),false);
    for(const toFloor of [-1,1,2]){
      const to={...from,floor:toFloor,y:toFloor===-1?-6:toFloor===2?6:0};
      const route=nav.path(from,to,'elevator');assert.ok(route?.length);assert.equal(route.some(p=>p.liftTo!==undefined),floor!==toFloor);
      assert.ok(nav.path(from,to,'stairs')?.length);
    }
    assert.equal(nav.isBlocked({x:LIFT.x,z:LIFT.z,floor}),true,'shaft is not a walking shortcut');
  }
});
test('ground and upper floor foundation slabs leave the elevator shaft open',async()=>{
  const {buildMap}=await import('../src/office-map.js'),{LIFT}=await import('../src/transport-config.js');
  const room={},upper={},boxes=[];buildMap({room,upper,garden:{},stairs:{},structure:{},basement:{},basementStairs:{},box(root,x,y,z,w,h,d){boxes.push({root,x,y,z,w,h,d});},plant(){}});
  for(const [root,y] of [[room,-.2],[upper,5.8]])assert.equal(boxes.some(b=>b.root===root&&Math.abs(b.x-LIFT.x)<b.w/2&&Math.abs(b.z-LIFT.z)<b.d/2&&Math.abs(b.y-y)<b.h/2),false);
});
test('elevator serves a FIFO queue with one passenger, closed doors while travelling, and gradual movement',async()=>{
  const {ElevatorLife}=await import('../src/elevator-life.js'),{LIFT}=await setup();const lift=new ElevatorLife(),people=new Map();
  for(const [id,to] of [['a',-1],['b',2],['c',-1]]){const p={id,mode:'walking',position:{x:LIFT.x,z:LIFT.entryZ,floor:1,y:0}};people.set(id,p);lift.request(p,to);}
  const order=[];
  for(let i=0;i<1500&&order.length<3;i++){
    const before=lift.y;order.push(...lift.tick(.1,people));assert.ok(Math.abs(lift.y-before)<=.300001);
    if(lift.phase==='travel')assert.equal(lift.doorOpen,0);
    assert.ok([...people.values()].filter(p=>['lift-boarding','lift-riding','lift-exiting'].includes(p.mode)).length<=1);
  }
  assert.deepEqual(order,['a','b','c']);assert.equal(lift.completedTrips,3);assert.equal(people.get('b').position.floor,2);assert.equal(people.get('c').position.y,-6);
});
test('staff finish a safe landing before returning to work when interrupted in the elevator',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'rider'}]);const p=life.people.get('rider');p.transportPreference='elevator';assert.ok(life.choose(p,'golf'));
  let riding=false;for(let i=0;i<3000;i++){life.tick(.1);assert.equal(nav.isBlocked(p.position),false);if(life.elevator.phase==='travel'&&p.position.y<-.5&&p.position.y>-5){riding=true;break;}}
  assert.ok(riding);const before={...p.position};life.setWork({rider:'working'});assert.deepEqual(p.position,before);assert.ok(p.pendingHome);
  for(let i=0;i<4000&&p.mode!=='working';i++){life.tick(.1);assert.equal(nav.isBlocked(p.position),false);}
  assert.equal(p.mode,'working');assert.equal(p.position.floor,1);assert.equal(p.position.y,0);assert.equal(p.transport,undefined);assert.equal(p.pendingHome,undefined);assert.ok(life.elevator.completedTrips>=2);
});
test('canceling and re-requesting the same passenger does not lose the call or produce a vertical walking shortcut',async()=>{
  const {ElevatorLife}=await import('../src/elevator-life.js'),{LIFT}=await setup(),lift=new ElevatorLife();
  const p={id:'a',mode:'walking',position:{x:LIFT.x,z:LIFT.entryZ,floor:1,y:0}},people=new Map([['a',p]]);
  lift.request(p,-1);lift.tick(.1,people);lift.cancel('a');p.mode='returning';delete p.transport;lift.request(p,2);
  for(let i=0;i<1000&&lift.completedTrips<1;i++)lift.tick(.1,people);
  assert.equal(lift.completedTrips,1);assert.equal(p.position.floor,2);assert.equal(p.mode,'returning');assert.equal(p.transport,undefined);
});
test('pausing ambient motion clears pending elevator calls and leaves every employee safely at their desk',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'},{id:'b'}]);
  for(const p of life.people.values()){p.transportPreference='elevator';life.choose(p,'golf');}
  for(let i=0;i<500&&!life.elevator.job;i++)life.tick(.1);assert.ok(life.elevator.job);life.setEnabled(false);
  assert.equal(life.elevator.job,null);assert.equal(life.elevator.queue.length,0);
  for(const p of life.people.values()){assert.deepEqual(p.position,p.home);assert.equal(p.transport,undefined);assert.ok(!nav.isBlocked(p.position));}
});
test('older B1 furniture in the new elevator shaft is relocated without losing its identity',t=>{
  const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs'),{validatePlacement}=require('../electron/furniture.cjs');
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-lift-migration-'));t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const file=path.join(folder,'office.json'),engine=new Engine(file,new EventEmitter());engine.state.furniture=[{id:'my-b1-chair',type:'armchair',floor:-1,x:-18.7,z:8.1,rotation:90}];engine.persist();
  const restored=new Engine(file,new EventEmitter()),chair=restored.state.furniture[0];assert.equal(chair.id,'my-b1-chair');assert.equal(chair.floor,-1);assert.equal(chair.rotation,90);assert.doesNotThrow(()=>validatePlacement(chair,restored.state.furniture));assert.notDeepEqual([chair.x,chair.z],[-18.7,8.1]);
});
