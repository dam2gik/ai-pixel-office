import terrain from '../electron/mine-terrain.json' with {type:'json'};
import {FLOOR_IDS,floorElevation} from './floors.js';
import {LIFT} from './transport-config.js';

export const LIGHTS_PER_FLOOR=8;
export const LIGHTING_PRESETS={
  day:{label:'낮',sun:'#fff1d2',sky:'#9dc8e3',horizon:'#f0e8d2',ground:'#8e9e89',direction:[-.46,.82,.34],sunPower:3.1,skyPower:.8,daylight:1,lamps:.7,exposure:1.0},
  sunset:{label:'노을',sun:'#ffb775',sky:'#a6aaca',horizon:'#efbe97',ground:'#857b7f',direction:[-.84,.31,.44],sunPower:2.8,skyPower:.55,daylight:.55,lamps:1.1,exposure:1.05},
  night:{label:'밤',sun:'#a7c8ed',sky:'#14253a',horizon:'#33485e',ground:'#697e87',direction:[-.38,.65,-.66],sunPower:.55,skyPower:.55,daylight:.08,lamps:1.55,exposure:1.12}
};
export const FLOOR_LIGHTS=Object.fromEntries(FLOOR_IDS.map(floor=>{
  const y=floorElevation(floor);
  if(floor<=-3){
    const supports=terrain.floors[floor].supports;
    const selected=supports.filter((_,i)=>i%Math.max(1,Math.ceil(supports.length/7))===0).slice(0,7).map(([x,z,h])=>({x,y:y+h-.18,z,radius:9,existing:true}));
    return [floor,[...selected,{x:LIFT.x,y:y+2.7,z:LIFT.entryZ-.1,radius:9,existing:true}]];
  }
  const points=floor>0?[[-12,-7],[-4,-7],[5,-7],[13,-7],[-12,7],[-4,7],[5,7],[13,7]]:[[-23,-12],[-8,-12],[8,-12],[23,-12],[-23,10],[-8,10],[8,10],[23,10]];
  return [floor,points.map(([x,z])=>({x,y:y+3.45,z,radius:floor>0?9:12,existing:false}))];
}));
// These positions match the streetlight fittings in exterior.js.
export const STREET_LIGHTS=[...[-61,61].flatMap(x=>[-32,-10,12,34].map(z=>({x,y:3.78,z:z+.7,radius:12}))),...[-40,49].flatMap(z=>[-47,-21,9,35].map(x=>({x,y:3.78,z:z+.7,radius:12})))];
export const EXTERIOR_ACCENT_LIGHTS=[{x:-2,y:3.4,z:15.4,radius:11},{x:31,y:1.9,z:38.6,radius:8},{x:50,y:2.8,z:-4,radius:9}];
