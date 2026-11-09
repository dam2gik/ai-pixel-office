const preset=require('./furniture-preset.json');
const {layout,validatePlacement}=require('./furniture.cjs');
function applyFurniturePreset(state){
  if((state.furnishingVersion||0)>=preset.version)return {added:0,skipped:0};
  const furniture=[...(state.furniture||[])];let added=0,skipped=0;
  for(const desired of preset.items){
    if(furniture.length>=layout.limit){skipped++;continue;}
    const id=`design-${preset.version}-${desired.id}`;
    if(furniture.some(f=>f.id===id))continue;
    const zone=layout.zones.find(z=>z.id===desired.area),candidates=[];
    // Keep each seating composition in its intended room. When a user already
    // occupies a spot, search nearby without moving their furniture.
    for(let dx=-2;dx<=2;dx+=.5)for(let dz=-1;dz<=1;dz+=.5)candidates.push({dx,dz});
    candidates.sort((a,b)=>a.dx*a.dx+a.dz*a.dz-b.dx*b.dx-b.dz*b.dz);
    let placed=false;
    for(const {dx,dz} of candidates){
      const item={id,type:desired.type,floor:desired.floor,x:desired.x+dx,z:desired.z+dz,rotation:desired.rotation};
      const spec=layout.types[item.type],sideways=item.rotation===90||item.rotation===270,w=sideways?spec.d:spec.w,d=sideways?spec.w:spec.d;
      if(!zone||Math.abs(item.x-zone.x)+w/2>zone.w/2||Math.abs(item.z-zone.z)+d/2>zone.d/2)continue;
      try{validatePlacement(item,furniture);furniture.push(item);placed=true;added++;break;}catch{}
    }
    if(!placed)skipped++;
  }
  state.furniture=furniture;state.furnishingVersion=preset.version;
  return {added,skipped};
}
module.exports={applyFurniturePreset};
