const {test}=require('node:test');
const assert=require('node:assert/strict');
async function setup(){const m=await import('../src/office-life.js');const {buildMap}=await import('../src/office-map.js');const map=buildMap({room:{},box(){},plant(){}});return {...m,map,nav:m.createNavigator(map.obstacles)};}
test('all 12 desks and all facilities are reachable without crossing walls or furniture',async()=>{
  const {STATIONS,homePosition,nav}=await setup();
  for(let i=0;i<12;i++)for(const station of STATIONS){let from=homePosition(i);assert.equal(nav.isBlocked(from),false,`desk ${i}`);assert.equal(nav.isBlocked(station),false,station.id);const route=nav.path(from,station);assert.ok(route?.length,`desk ${i} -> ${station.id}`);for(const point of route){assert.ok(nav.clearSegment(from,point),`blocked segment ${station.id}`);from=point;}assert.ok(Math.hypot(from.x-station.x,from.z-station.z)<.01);}
});
test('ambient staff visit rooms, reserve distinct seats, and return to their desks',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'},{id:'b'},{id:'c'},{id:'d'}]);const visited=new Set();
  for(let i=0;i<2000;i++){life.tick(.1);const busy=[];for(const p of life.people.values()){assert.ok(!nav.isBlocked(p.position),`${p.id}: ${JSON.stringify(p.position)}`);if(p.station)busy.push(p.station.id);if(p.mode==='resting')visited.add(p.activity);}assert.equal(new Set(busy).size,busy.length);}
  for(const kind of ['coffee','massage','meeting','restroom','wash'])assert.ok(visited.has(kind),kind);
  assert.ok([...life.people.values()].every(p=>p.completed>0));
});
test('assigning work cancels a break and routes staff home; queued work does not roam',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'},{id:'b'}]);
  for(let i=0;i<220;i++)life.tick(.1);assert.ok(life.people.get('b').station);
  life.setWork({a:'working',b:'waiting'});assert.equal(life.reservations.size,0);
  for(let i=0;i<300;i++)life.tick(.1);
  for(const p of life.people.values()){assert.equal(p.mode,'working');assert.ok(Math.hypot(p.position.x-p.home.x,p.position.z-p.home.z)<.01);assert.equal(p.station,null);}
  life.setWork({});for(let i=0;i<80;i++)life.tick(.1);assert.ok([...life.people.values()].some(p=>p.mode==='walking'));
});
test('ambient pause returns actors home, survives new work, and resumes locally',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'}]);for(let i=0;i<100;i++)life.tick(.1);
  life.setEnabled(false);assert.equal(life.reservations.size,0);life.setWork({a:'working'});assert.equal(life.people.get('a').mode,'working');assert.deepEqual(life.people.get('a').position,life.people.get('a').home);
  life.setWork({});const before=life.snapshot();for(let i=0;i<100;i++)life.tick(.1);assert.deepEqual(life.snapshot(),before);life.setEnabled(true);for(let i=0;i<100;i++)life.tick(.1);assert.equal(life.people.get('a').mode,'walking');
});
test('adding staff preserves existing activity and does not reset a break',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'a'}]);for(let i=0;i<80;i++)life.tick(.1);const before=life.snapshot()[0];life.sync([{id:'a'},{id:'b'}]);assert.deepEqual(life.snapshot()[0],before);assert.equal(life.people.size,2);
});

test('staff use the staircase to reach the second floor and return when work arrives mid-climb',async()=>{
  const {OfficeLife,nav}=await setup(),life=new OfficeLife(nav);life.sync([{id:'reader'}]);const p=life.people.get('reader');p.transportPreference='stairs';
  assert.equal(life.choose(p,'reading'),true);assert.ok(p.route.some(q=>q.transition));
  for(let i=0;i<3000&&p.mode!=='resting';i++){life.tick(.1);assert.equal(nav.isBlocked(p.position),false);}
  assert.equal(p.mode,'resting');assert.equal(p.position.floor,2);assert.equal(p.position.y,6);
  life.goHome(p);let climbing=false;
  for(let i=0;i<3000;i++){life.tick(.1);if(p.position.transition&&(p.position.y||0)>1&&(p.position.y||0)<5){climbing=true;break;}}
  assert.equal(climbing,true);life.setWork({reader:'working'});
  for(let i=0;i<3000&&p.mode!=='working';i++)life.tick(.1);
  assert.equal(p.mode,'working');assert.equal(p.position.floor,1);assert.ok(Math.hypot(p.position.x-p.home.x,p.position.z-p.home.z)<.01);
});
