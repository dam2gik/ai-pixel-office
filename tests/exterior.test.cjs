const {test}=require('node:test'),assert=require('node:assert/strict');
test('traffic follows two separate closed lanes on the road at constant spacing',async()=>{
  const {roadPosition,routeLength,trafficPosition,TRAFFIC_COUNT}=await import('../src/exterior-layout.js');
  for(const lane of [-1,1]){
    const length=routeLength(lane),start=roadPosition(0,lane),end=roadPosition(length,lane);assert.ok(Math.hypot(start.x-end.x,start.z-end.z)<1e-8);
    for(let d=0;d<length;d+=.25){const p=roadPosition(d,lane),onRoad=Math.abs(Math.abs(p.x)-69)<=5.01&&p.z>=-53&&p.z<=62||Math.min(Math.abs(p.z+48),Math.abs(p.z-57))<=5.01&&Math.abs(p.x)<=74;assert.ok(onRoad,JSON.stringify(p));assert.ok(Number.isFinite(p.yaw));}
  }
  for(let t=0;t<1000;t+=7){const cars=Array.from({length:TRAFFIC_COUNT},(_,i)=>trafficPosition(i,t));for(let i=0;i<cars.length;i++)for(let j=i+1;j<cars.length;j++)assert.ok(Math.hypot(cars[i].x-cars[j].x,cars[i].z-cars[j].z)>4,'vehicles must not overlap');}
});
test('parking spaces and road loops stay outside the office and existing garden',async()=>{
  const {PARKING_SLOTS,SITE_BOUNDS,TRAFFIC_COUNT}=await import('../src/exterior-layout.js');assert.equal(PARKING_SLOTS.length,24);assert.equal(PARKING_SLOTS.filter(p=>p.occupied).length,16);assert.equal(TRAFFIC_COUNT,16);
  for(const p of PARKING_SLOTS){assert.ok(p.x<-30);assert.ok(p.x>SITE_BOUNDS.minX&&p.z>SITE_BOUNDS.minZ);}
});
