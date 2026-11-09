import catalog from '../electron/appearance.json';
export function appearanceFor(agent,index=0){
  const result={...catalog.defaults,hairColor:catalog.legacyHair[index%4],shirtColor:/^#[0-9a-f]{6}$/i.test(agent.color)?agent.color:catalog.defaults.shirtColor},enums={hairStyle:catalog.hairStyles,outfit:catalog.outfits,accessory:catalog.accessories};
  for(const [key,value] of Object.entries(agent.appearance||{}))if(Object.hasOwn(catalog.colors,key)?/^#[0-9a-f]{6}$/i.test(value):Object.hasOwn(enums,key)&&Object.hasOwn(enums[key],value))result[key]=value;
  return result;
}
export function characterPortrait(agent,small=false,index=0){
  const a=appearanceFor(agent,index);
  return `<span class="pixel-portrait ${small?'small':''} hair-${a.hairStyle} outfit-${a.outfit} accessory-${a.accessory}" style="--shirt:${a.shirtColor};--hair:${a.hairColor};--skin:${a.skinColor};--pants:${a.pantsColor};--shoes:${a.shoeColor}"><i class="pixel-hair"></i><i class="pixel-face"></i><i class="pixel-shirt"></i><i class="pixel-accessory"></i></span>`;
}
export function paintCharacter(parts,a,drawBox,batch=()=>{}){
  const box=(...args)=>{args[8]??=args[7]===a.skinColor?'mineral':args[7]===a.hairColor?'hair':args[7]===a.shirtColor||args[7]===a.pantsColor?'fabric':'mineral';return drawBox(...args);};
  const {body,head,left,right,legL,legR}=parts;
  box(body,0,.68,0,.52,.6,.32,a.shirtColor,'fabric');
  box(body,0,.4,.166,.5,.035,.014,a.shirtColor,'fabric');
  if(a.outfit==='shirt'){
    for(const x of [-.065,.065])box(body,x,.93,.18,.1,.08,.025,'#e8e6da');
    for(let i=0;i<4;i++)box(body,0,.82-i*.1,.177,.018,.018,.012,'#e8e6da');
    box(body,-.15,.76,.17,.1,.025,.02,'#e8e6da');
  }
  if(a.outfit==='hoodie'){box(body,0,.55,.18,.3,.15,.04,a.shirtColor);box(body,0,1.02,-.1,.5,.18,.4,a.shirtColor);for(const x of [-.08,.08])box(body,x,.86,.18,.025,.2,.02,'#f3eedb');}
  if(a.outfit==='jacket'){box(body,0,.72,.18,.19,.48,.025,'#f3eedb');for(const x of [-.13,.13])box(body,x,.88,.2,.08,.23,.035,'#dedfce');box(body,0,.69,.2,.02,.34,.015,'#7d8777');}
  box(head,0,0,0,.6,.6,.52,a.skinColor);
  if(a.hairStyle!=='bald'){
    box(head,0,.32,-.02,.64,.15,.56,a.hairColor);
    if(a.hairStyle==='short')box(head,-.27,.15,-.02,.12,.24,.54,a.hairColor);
    if(a.hairStyle==='bob'){for(const x of [-.29,.29])box(head,x,-.01,-.01,.13,.5,.55,a.hairColor);box(head,0,-.03,-.26,.6,.48,.12,a.hairColor);box(head,0,.18,.28,.5,.14,.08,a.hairColor);}
    if(a.hairStyle==='spiky')for(let i=0;i<7;i++)box(head,-.255+i*.085,.38+(i%3)*.035,-.02,.08,.2+(i%3)*.06,.42,a.hairColor);
    if(a.hairStyle==='ponytail'){box(head,0,-.03,-.36,.24,.6,.22,a.hairColor);box(head,0,.12,-.37,.27,.075,.25,'#bba3c6');box(head,0,.2,.26,.5,.1,.08,a.hairColor);}
  }
  for(const x of [-.14,.14])box(head,x,.03,.267,.07,.08,.02,'#384339');box(head,0,-.14,.27,.1,.025,.02,'#b37f6a');
  for(const x of [-.14,.14]){
    box(head,x,.115,.272,.085,.024,.018,a.hairColor);
    box(head,x-.014,.046,.28,.022,.026,.008,'#f7f3df');
  }
  box(head,0,-.06,.282,.065,.06,.045,a.skinColor);
  for(const x of [-.315,.315])box(head,x,-.025,0,.06,.13,.12,a.skinColor);
  if(a.hairStyle!=='bald')for(let i=0;i<12;i++)box(head,-.265+i*.048,.255+(i%3)*.018,.269,.034,.09+(i%2)*.035,.025,a.hairColor,'hair');
  if(a.accessory==='glasses'){
    for(const x of [-.15,.15]){for(const y of [-.04,.1])box(head,x,y,.29,.23,.025,.035,'#43554d');for(const dx of [-.11,.11])box(head,x+dx,.03,.29,.025,.14,.035,'#43554d');}
    box(head,0,.04,.29,.09,.03,.035,'#43554d');for(const x of [-.3,.3])box(head,x,.04,.12,.025,.025,.34,'#43554d');
  }
  if(a.accessory==='headphones'){box(head,0,.49,-.02,.76,.07,.14,'#68796e');for(const x of [-.36,.36]){box(head,x,.25,-.02,.07,.45,.12,'#68796e');box(head,x,0,0,.14,.28,.26,'#465d53');box(head,x*1.1,0,.01,.06,.2,.18,'#b4c6ad');}}
  for(const arm of [left,right]){box(arm,0,-.23,0,.2,.48,.23,a.shirtColor,'fabric');box(arm,0,-.45,0,.205,.045,.235,a.shirtColor,'fabric');box(arm,0,-.51,0,.2,.14,.23,a.skinColor);}
  for(const leg of [legL,legR]){box(leg,0,-.17,0,.22,.37,.25,a.pantsColor,'fabric');box(leg,0,-.36,.08,.24,.13,.4,a.shoeColor);box(leg,0,-.421,.08,.245,.025,.405,'#d4d6cb');for(const z of [.12,.18])box(leg,0,-.29,z,.11,.015,.018,'#e8e6da');}
  for(const part of Object.values(parts))batch(part);
}
