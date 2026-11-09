const {test}=require('node:test'),assert=require('node:assert/strict');
let setupPromise;function setup(){return setupPromise||=(async()=>{const {buildMap}=await import('../src/office-map.js'),life=await import('../src/office-life.js'),floors=await import('../src/floors.js'),high=await import('../src/high-floor-data.js');const map=buildMap({room:{},box(){},plant(){}});return {...life,...floors,...high,map,nav:life.createNavigator(map.obstacles)};})();}
test('all upper facilities have clear routes and use the elevator rather than imaginary stairs',async()=>{
  const {nav,HIGH_STATIONS,FLOOR_IDS,floorElevation,homePosition,map}=await setup();assert.equal(FLOOR_IDS.length,11);assert.equal(floorElevation(5),24);assert.equal(map.architecture.filter(f=>f.type==='high-floor').length,3);
  for(const station of HIGH_STATIONS){assert.equal(nav.isBlocked(station),false,station.id);const route=nav.path(homePosition(0),station);assert.ok(route,station.id);assert.ok(route.some(p=>p.liftTo===station.floor),station.id);assert.equal(route.some(p=>p.transition),false);assert.ok(nav.path(station,homePosition(0)).some(p=>p.liftTo===1));}
  assert.equal(nav.path(homePosition(0),HIGH_STATIONS.find(s=>s.floor===5),'stairs'),null);
});
test('staff visit the new upper activities and return to their desk when real work arrives',async()=>{
  const {OfficeLife,nav,homePosition}=await setup();
  for(const kind of ['maker','studio','gaming','skytea','yoga']){const life=new OfficeLife(nav);life.sync([{id:'a'}]);assert.equal(life.choose(life.people.get('a'),kind),true);const p=life.people.get('a'),floor=p.station.floor;
    for(let i=0;i<6000&&p.mode!=='resting';i++){life.tick(.05);assert.equal(nav.isBlocked(p.position),false,kind+' '+JSON.stringify(p.position));}assert.equal(p.mode,'resting',kind);assert.equal(p.position.floor,floor);assert.ok(life.elevator.completedTrips>0);
    life.setWork({a:'working'});for(let i=0;i<6000&&p.mode!=='working';i++)life.tick(.05);assert.equal(p.mode,'working',kind);assert.equal(p.position.floor,1);assert.ok(Math.hypot(p.position.x-homePosition(0).x,p.position.z-homePosition(0).z)<.1);
  }
});
test('upper floor furniture and hired NPCs use the new floors without changing the real agent roster',async()=>{
  const {findPlacement,validatePlacement,normalizeFurniture}=require('../electron/furniture.cjs'),{createGame,commandGame,stepGame,GameWorld}=require('../electron/game.cjs'),{nav}=await setup();
  const items=[];for(const floor of [3,4,5]){const item=findPlacement('plant',floor,items,'upper-'+floor);validatePlacement(item,items);items.push(item);}assert.deepEqual(normalizeFurniture(items),items);
  const g=createGame(17);g.gold=1000;commandGame(g,{type:'hire',job:'roamer',floor:5});const npc=g.npcs.at(-1),world=new GameWorld();for(let i=0;i<120;i++){stepGame(g,1,world,items);assert.equal(npc.floor,5);assert.equal(nav.isBlocked(npc),false);}assert.equal(g.npcs.length,6);
});
