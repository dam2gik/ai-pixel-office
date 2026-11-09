const catalog=require('./appearance.json');
const color=value=>typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value);
const enums={hairStyle:catalog.hairStyles,outfit:catalog.outfits,accessory:catalog.accessories};
function normalizeAppearance(agent,index=0){
  const result={...catalog.defaults,hairColor:catalog.legacyHair[index%catalog.legacyHair.length],shirtColor:color(agent.color)?agent.color:catalog.defaults.shirtColor};
  for(const [key,value] of Object.entries(agent.appearance||{}))if(Object.hasOwn(catalog.colors,key)?color(value):Object.hasOwn(enums,key)&&Object.hasOwn(enums[key],value))result[key]=value;
  return result;
}
function applyAppearance(agent,patch,index=0){
  if(!patch||typeof patch!=='object'||Array.isArray(patch))throw new Error('캐릭터 외형 설정이 올바르지 않습니다.');
  const result=normalizeAppearance(agent,index);
  for(const [key,value] of Object.entries(patch)){
    if(Object.hasOwn(catalog.colors,key)){if(!color(value))throw new Error('색상은 #RRGGBB 형식으로 지정해 주세요.');}
    else if(!Object.hasOwn(enums,key)||!Object.hasOwn(enums[key],value))throw new Error('지원하지 않는 캐릭터 옵션입니다.');
    result[key]=value;
  }
  return result;
}
module.exports={normalizeAppearance,applyAppearance};
