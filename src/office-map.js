import {FLOOR_IDS} from './floors.js';
import {buildDeepCampus} from './deep-campus.js';
import {slabWithVoids} from './slab-geometry.js';
import {LIFT} from './transport-config.js';
import { ROOMS, deskPosition } from './office-life.js';
import {buildBasement} from './basement-map.js';
import {createArchitecture} from './architecture.js';
import {buildCampus} from './campus-map.js';
import {buildHighFloors} from './high-floor-map.js';

export function buildMap({room,upper,garden,stairs,structure,basement=room,basementStairs=room,deepFloors={},highFloors={},box,plant}){
  const obstacles=[],architecture=createArchitecture({box,obstacles});
  const solid=(x,y,z,w,h,d,color)=>{box(room,x,y,z,w,h,d,color);obstacles.push({x,z,w,d});};
  slabWithVoids({root:room,box,x:-2,y:-.4,z:1,w:40,h:.7,d:26,color:'#bbc3b0',voids:[{x:-20.5,z:.85,w:2.4,d:9.5},{x:LIFT.x,z:LIFT.z,w:3.1,d:2.8}]});
  for(let x=-15.75;x<16;x+=.5)for(let z=-10.75;z<11;z+=.5){
    const finish=z>.3&&z<3.55?'marble':z<.3&&x>10.5?'tile':z<.3&&x>2.4?'marble':'wood';
    const color=finish==='wood'?(z>3.55?'#bf9a70':'#d0b28b'):finish==='marble'?'#e5e4dc':'#c7d7d0';
    box(room,x,-.015,z,.493,.08,.493,color,finish);
  }
  const {panel,door,windowWall}=architecture;
  windowWall(room,{x:-6.75,z:-10.9,length:18.3,finish:'brick'});
  windowWall(room,{x:9.15,z:-10.9,length:13.5,finish:'plaster'});
  panel(room,{axis:'z',x:-15.9,z:-5.3,length:10.8,finish:'glass'});
  panel(room,{axis:'z',x:-15.9,z:7.2,length:7.3,finish:'brick'});
  panel(room,{axis:'z',x:15.9,z:0,length:22,finish:'glass'});
  panel(room,{axis:'z',x:2.4,z:-5.3,length:10.8,finish:'glass'});
  panel(room,{axis:'z',x:10.5,z:-5.3,length:10.8,finish:'plaster'});
  // Every room has a framed entrance from the marble circulation hall.
  for(const [x,length,finish] of [[-8.25,15.3,'glass'],[2.1,.6,'wood'],[4,3.2,'brick'],[8.8,3.4,'brick'],[11.35,1.7,'plaster'],[15,1.8,'plaster']])panel(room,{x,z:.35,length,finish});
  door(room,{x:.6,z:.35,width:2.4,name:'workspace'});
  door(room,{x:6.35,z:.35,width:1.5,name:'pantry',finish:'wood'});
  door(room,{x:13.15,z:.35,width:1.9,name:'restroom',finish:'wood'});
  for(const [x,length,finish] of [[-12.35,7.1,'glass'],[-3,6.4,'glass'],[3.7,2.6,'wood'],[11.6,8.6,'glass']])panel(room,{x,z:3.55,length,finish});
  door(room,{x:-7.5,z:3.55,width:2.6,name:'meeting'});
  door(room,{x:1.3,z:3.55,width:2.2,name:'gallery'});
  door(room,{x:6.15,z:3.55,width:2.3,name:'lounge'});
  panel(room,{axis:'z',x:2.4,z:7.25,length:7.3,finish:'wood'});
  // Glazed garden-side walls enclose rooms without hiding the interior.
  panel(room,{x:-7.9,z:10.9,length:16,finish:'glass'});
  panel(room,{x:2.25,z:10.9,length:.3,finish:'glass'});
  door(room,{x:1.1,z:10.9,width:2,name:'garden-gallery'});
  panel(room,{x:4.9,z:10.9,length:5,finish:'glass'});
  panel(room,{x:12.75,z:10.9,length:6.3,finish:'glass'});
  door(room,{x:8.5,z:10.9,width:2.2,name:'lounge-garden'});
  // Pantry: coffee machines, mugs, fridge, snack shelf and a standing island.
  solid(6.1,.65,-9.6,6,1.3,1.1,'#cbb38a');box(room,6.1,1.34,-9.6,6.2,.12,1.25,'#e5e4dc','marble');
  for(const x of [5.1,7.5]){box(room,x,1.75,-9.65,.7,.75,.55,'#485b50');box(room,x,1.78,-9.34,.46,.3,.06,'#a4c8b8');box(room,x,1.47,-9.24,.2,.22,.19,'#f4e0ba');box(room,x+.15,1.98,-9.33,.06,.06,.03,'#e5b56d');}
  solid(9.5,1.15,-9.4,1.25,2.3,1.3,'#e6eee7');box(room,9.5,1.7,-8.72,1.17,.04,.04,'#b8c9bd');box(room,9.95,1.3,-8.7,.05,.6,.05,'#91aa9c');
  solid(9.65,.95,-4.2,.75,1.9,2.4,'#bca17c');for(let row=0;row<3;row++)for(let j=0;j<5;j++)box(room,9.22,.35+row*.55,-5+j*.4,.2,.3,.25,['#e7ba81','#a6b690','#dca69b'][row]);
  solid(5.7,.9,-3.8,2.5,1.8,1,'#c5b08d');box(room,5.7,1.86,-3.8,2.7,.1,1.12,'#e5e4dc','marble');
  box(room,5.1,1.95,-3.8,.35,.08,.3,'#ebe6d0');box(room,5.8,2,-3.8,.18,.25,.18,'#b1bd92');
  // Restroom: two enclosed stalls, visible doors, dual washbasins and mirrors.
  for(const x of [12.1,14.5]){
    solid(x,1,-8.1,2.05,2,.12,'#d5e3dc');solid(x-1,1,-7.1,.12,2,2.1,'#d5e3dc');solid(x,1,-6.15,2.05,2,.12,'#b7cec4');
    box(room,x+.65,1,-6.03,.09,.1,.06,'#f1d88e');box(room,x,1.65,-6.04,.25,.12,.04,'#f1efe1');
    box(room,x,.36,-7.15,.6,.5,.85,'#fbfcf3');box(room,x,.75,-7.5,.65,.75,.2,'#f2f6eb');
  }
  solid(15.5,1,-7.1,.12,2,2.1,'#d5e3dc');
  solid(15.25,.5,-3.4,.7,1,3.2,'#b5cfc3');for(const z of [-2.6,-4.2]){box(room,15.25,1.05,z,.9,.15,1.3,'#f9fcf1');box(room,15.25,1.14,z,.45,.07,.75,'#c8dbd1');box(room,15.42,1.38,z,.08,.4,.08,'#89a99b');box(room,15.67,1.95,z,.08,.9,1.3,'#a8c9c2');}
  // Meeting room: table, rolling chairs, screen, whiteboard and sticky notes.
  solid(-7.4,.85,7,7.8,.18,2.2,'#ceb58f');for(const x of [-10,-7.4,-4.8]){box(room,x,.43,7,.18,.85,1.4,'#a58e6f');for(const z of [5.65,8.35]){box(room,x,.44,z,.75,.16,.7,'#91aaa0');box(room,x,.82,z+(z<7?-.3:.3),.75,.7,.14,'#a2b8ab');box(room,x,.2,z,.12,.4,.12,'#6e8377');}}
  for(const x of [-9.4,-7.3,-5.1]){box(room,x,1.02,7,.65,.08,.48,'#e7e9da');box(room,x+.35,1.1,7.3,.15,.22,.15,'#b5c8b0');}
  box(room,-15.72,2,6,.08,1.7,3.8,'#d3d6c7');box(room,-15.65,2,6,.06,1.5,3.55,'#f9f6e7');for(let i=0;i<6;i++)box(room,-15.59,1.8+(i%2)*.45,4.9+Math.floor(i/2)*.8,.03,.28,.35,['#e7ce8b','#b3c7ae','#d9b3b0'][i%3]);
  box(room,-3,1.8,10.1,.13,2.7,.14,'#758b7b');box(room,-3,2.6,9.99,3,1.7,.13,'#465d53');box(room,-3,2.6,9.9,2.8,1.45,.04,'#a7c8bb');
  // Lounge: two reclining massage chairs with armrests and raised leg support.
  for(const x of [5.3,8]){
    solid(x,.4,7.2,1.7,.6,1.6,'#938aa3');box(room,x,.85,7.2,1.05,.32,1.1,'#c2b4cd');box(room,x,1.35,6.65,1.3,1.45,.32,'#aa9bb8');box(room,x,1.96,6.73,.85,.3,.32,'#d0c3d7');
    for(const dx of [-.76,.76])box(room,x+dx,.96,7.25,.32,.6,1.35,'#a295af');box(room,x,.55,8.03,1,.45,.65,'#b4a6c1');box(room,x+.76,1.3,7.45,.18,.06,.35,'#7b8e87');
  }
  solid(12.7,.42,7.4,3.8,.7,1.5,'#9caf9b');box(room,12.7,1,6.85,3.8,1.2,.3,'#b4c4a7');for(const x of [10.9,14.5])box(room,x,.85,7.45,.3,.9,1.5,'#8fa58f');box(room,12.7,.85,7.4,3.2,.15,1,'#c4cfb6');
  solid(11.3,.35,5.5,2.2,.15,.9,'#c6ae8a');box(room,11.2,.49,5.5,.6,.09,.4,'#d9c1a0');
  for(const [x,z] of [[-14.8,-9.8],[1.3,-9.8],[-14.8,9.5],[14.8,9.6],[3.5,5],[8.9,-1.2]]){plant(room,x,z,1.05);obstacles.push({x,z,w:.7,d:.7});}
  // Reserve desk footprints for all 12 seats so later hires do not invalidate walking routes.
  for(let i=0;i<12;i++){const p=deskPosition(i);obstacles.push({x:p.x,z:p.z,w:2.1,d:1.15});}
  buildCampus({room,upper,garden,stairs,structure,box,plant,obstacles,architecture});
  buildBasement({basement,basementStairs,room,box,obstacles,architecture});
  buildDeepCampus({deepFloors,room,box,obstacles,architecture});
  buildHighFloors({highFloors,room,box,obstacles,architecture});
  for(const floor of FLOOR_IDS){obstacles.push({floor,x:LIFT.x,z:LIFT.z,w:LIFT.w,d:LIFT.d});architecture.features.push({type:'elevator',floor,x:LIFT.x,z:LIFT.z});}
  return {obstacles,rooms:ROOMS,architecture:architecture.features};
}
