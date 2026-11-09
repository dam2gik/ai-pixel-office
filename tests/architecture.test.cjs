const {test}=require('node:test'),assert=require('node:assert/strict');
test('rooms have real walls and clear framed routes through every entrance on both floors',async()=>{
  const {buildMap}=await import('../src/office-map.js'),{createNavigator}=await import('../src/office-life.js');
  const materials=new Set(),map=buildMap({room:{},box(...args){if(args[8])materials.add(args[8]);},plant(){}}),nav=createNavigator(map.obstacles);
  for(const finish of ['glass','brick','wood','stone','marble','water'])assert.ok(materials.has(finish),finish);
  const doors=map.architecture.filter(f=>f.type==='door');assert.equal(doors.length,25);
  for(const door of doors){
    const a={x:door.x,z:door.z-.65,floor:door.floor},b={...a,z:door.z+.65};
    assert.equal(nav.isBlocked(a),false,`${door.name} inside`);assert.equal(nav.isBlocked(b),false,`${door.name} outside`);
    assert.ok(nav.clearSegment(a,b),`${door.name} doorway is clear`);
  }
  // A route cannot cut directly through the glazing beside an entrance.
  assert.equal(nav.clearSegment({x:-5,z:-.5,floor:1},{x:-5,z:1.2,floor:1}),false);
  assert.equal(nav.clearSegment({x:5,z:.1,floor:2},{x:5,z:1.7,floor:2}),false);
});
