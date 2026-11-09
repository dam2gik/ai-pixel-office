// Bake navigable nodes from the same modeled walls, rocks, machines and shafts
// used by the renderer. The packaged game never needs to load browser code.
const fs=require('node:fs');
(async()=>{
  const {buildMap}=await import('../src/office-map.js'),{createNavigator,MAP}=await import('../src/office-life.js'),{FLOOR_IDS}=await import('../src/floors.js'),{BASEMENT_BOUNDS,LIFT}=await import('../src/transport-config.js');
  const map=buildMap({room:{},box(){},plant(){}}),nav=createNavigator(map.obstacles),world={version:1,floors:{}};
  for(const floor of FLOOR_IDS){
    const bounds=floor<0?BASEMENT_BOUNDS:floor===1?MAP:{...MAP,minZ:-10.5,maxZ:10.5},nodes=[],lookup=new Map();
    for(let x=bounds.minX;x<=bounds.maxX;x++)for(let z=bounds.minZ;z<=bounds.maxZ;z++)if(!nav.isBlocked({x,z,floor})){lookup.set(x+','+z,nodes.length);nodes.push([x,z]);}
    const edges=nodes.map(([x,z])=>[[1,0],[-1,0],[0,1],[0,-1]].flatMap(([dx,dz])=>{const index=lookup.get((x+dx)+','+(z+dz));return index!==undefined&&nav.clearSegment({x,z,floor},{x:x+dx,z:z+dz,floor})?[index]:[];}));
    let arrival=0;for(let i=1;i<nodes.length;i++)if(Math.hypot(nodes[i][0]-LIFT.x,nodes[i][1]-LIFT.entryZ)<Math.hypot(nodes[arrival][0]-LIFT.x,nodes[arrival][1]-LIFT.entryZ))arrival=i;
    const reachable=new Set([arrival]),queue=[arrival];for(let i=0;i<queue.length;i++)for(const n of edges[queue[i]])if(!reachable.has(n)){reachable.add(n);queue.push(n);}
    const active=[...reachable].sort((a,b)=>a-b),remap=new Map(active.map((id,i)=>[id,i])),free=active.map(i=>nodes[i]);
    const mine=free.flatMap(([x,z],i)=>floor<=-3&&z<3&&Math.hypot(x-LIFT.x,z-LIFT.entryZ)>7&&map.obstacles.some(o=>o.floor===floor&&o.w<4&&o.d<4&&Math.hypot(x-o.x,z-o.z)<2.4)?[i]:[]);
    const encounters=free.flatMap(([x,z],i)=>floor<=-5&&Math.hypot(x-LIFT.x,z-LIFT.entryZ)>10?[i]:[]);
    world.floors[floor]={nodes:free,edges:active.map(i=>edges[i].filter(n=>remap.has(n)).map(n=>remap.get(n))),arrival:remap.get(arrival),mining:mine,encounters};
    console.log('Floor',floor,free.length,'connected nodes;',mine.length,'mining points.');
  }
  fs.writeFileSync('electron/game-world.json',JSON.stringify(world));
})().catch(e=>{console.error(e);process.exitCode=1;});
