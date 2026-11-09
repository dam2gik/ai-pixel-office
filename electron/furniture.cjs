const layout=require('./furniture-layout.json');
function footprint(item){const type=layout.types[item.type];const sideways=item.rotation===90||item.rotation===270;return {w:sideways?type.d:type.w,d:sideways?type.w:type.d};}
function overlap(a,b,pad=.18){return Math.abs(a.x-b.x)<(a.w+b.w)/2+pad&&Math.abs(a.z-b.z)<(a.d+b.d)/2+pad;}
function validatePlacement(item,items=[]){
  if(!layout.types[item.type])throw new Error('지원하지 않는 가구입니다.');
  if(!layout.zones.some(zone=>zone.floor===item.floor)||![0,90,180,270].includes(item.rotation)||!Number.isFinite(item.x)||!Number.isFinite(item.z))throw new Error('층·위치·회전 값이 올바르지 않습니다.');
  const box={...item,...footprint(item)};
  if(!layout.zones.some(r=>r.floor===item.floor&&Math.abs(item.x-r.x)+box.w/2<=r.w/2&&Math.abs(item.z-r.z)+box.d/2<=r.d/2))throw new Error('로비·정원·2층 테라스의 배치 영역 안으로 옮겨 주세요.');
  if(layout.reserved.some(r=>r.floor===item.floor&&overlap(box,r,.12)))throw new Error('계단·통로·고정 시설 앞은 비워 두어야 합니다.');
  if(items.some(other=>other.id!==item.id&&other.floor===item.floor&&overlap(box,{...other,...footprint(other)})))throw new Error('다른 가구와 겹칩니다.');
  return item;
}
function findPlacement(type,floor,items=[],id,rotation=0,area){
  for(const zone of layout.zones.filter(z=>z.floor===floor&&(!area||z.id===area)))for(let z=Math.ceil((zone.z-zone.d/2)*2)/2;z<=zone.z+zone.d/2;z+=.5)for(let x=Math.ceil((zone.x-zone.w/2)*2)/2;x<=zone.x+zone.w/2;x+=.5){
    const item={id,type,floor,x,z,rotation};try{return validatePlacement(item,items);}catch{}
  }
  throw new Error('이 층에 배치할 공간이 없습니다. 가구를 옮기거나 삭제해 주세요.');
}
function normalizeFurniture(items){
  const normalized=[];
  for(const old of items){
    if(!layout.types[old.type])continue;
    const item={...old,floor:old.floor??1,rotation:old.rotation??0};
    try{validatePlacement(item,normalized);normalized.push(item);}catch{try{const rotation=[0,90,180,270].includes(item.rotation)?item.rotation:0;normalized.push({...old,...findPlacement(old.type,item.floor,normalized,old.id,rotation)});}catch{}}
  }
  return normalized;
}
module.exports={layout,footprint,validatePlacement,findPlacement,normalizeFurniture};
