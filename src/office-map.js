import { ROOMS, deskPosition } from './office-life.js';

export function buildMap({room,box,plant}){
  const obstacles=[];
  const solid=(x,y,z,w,h,d,color)=>{box(room,x,y,z,w,h,d,color);obstacles.push({x,z,w,d});};
  box(room,0,-.4,0,32,.7,22,'#bbc3b0');
  for(let x=-15.5;x<16;x++)for(let z=-10.5;z<11;z++){
    let colors=z>3?(x<2?['#d9e2d2','#e0e8d9']:['#e6dfeb','#eee7f1']):z<.3?(x<2.3?['#e6ddc8','#eee5d1']:x<10.5?['#e5d3b6','#eddcc1']:['#cfe1dc','#dcebe6']):['#eeeade','#f6f2e6'];
    box(room,x,-.015,z,.985,.08,.985,colors[(Math.round(x+z)+32)%2]);
  }
  solid(0,1.8,-10.9,32,3.6,.2,'#f5f1e5');solid(-15.9,1.8,0,.2,3.6,22,'#e6e9dc');solid(15.9,.65,0,.2,1.3,22,'#e6e9dc');
  for(let x=-13;x<=8;x+=3.4){box(room,x,2.1,-10.73,2.7,2,.12,'#aac8c3');box(room,x,2.1,-10.62,.1,2.05,.08,'#faf9ed');box(room,x,2.1,-10.61,2.75,.1,.09,'#faf9ed');box(room,x,1.1,-10.48,2.9,.13,.4,'#cdc7b4');}
  // Half-height dollhouse partitions retain sightlines. Gaps are real navigable doors.
  solid(2.4,.65,-5.4,.18,1.3,10.6,'#d1d9c8');solid(10.5,1.1,-5.4,.18,2.2,10.6,'#d9e5df');
  for(const [x,w] of [[4,3.2],[8.8,3.4],[11.4,1.6],[15,1.8]])solid(x,.65,.35,w,1.3,.18,'#d9ddcf');
  for(const [x,w] of [[-12.4,6.8],[-2.7,5.4],[3.7,2.6],[11.6,8.6]])solid(x,.62,3.55,w,1.24,.18,'#c8d3c1');
  solid(2.4,.65,7.25,.18,1.3,7.3,'#d4ccdc');
  // Soft glass partition frames around the meeting doorway, no collision across the gap.
  for(const x of [-9,-6])box(room,x,1.8,3.55,.1,3.6,.1,'#a4b8ac');box(room,-7.5,3.55,3.55,3.1,.1,.1,'#a4b8ac');
  // Pantry: coffee machines, mugs, fridge, snack shelf and a standing island.
  solid(6.1,.65,-9.6,6,1.3,1.1,'#cbb38a');box(room,6.1,1.34,-9.6,6.2,.12,1.25,'#faf3df');
  for(const x of [5.1,7.5]){box(room,x,1.75,-9.65,.7,.75,.55,'#485b50');box(room,x,1.78,-9.34,.46,.3,.06,'#a4c8b8');box(room,x,1.47,-9.24,.2,.22,.19,'#f4e0ba');box(room,x+.15,1.98,-9.33,.06,.06,.03,'#e5b56d');}
  solid(9.5,1.15,-9.4,1.25,2.3,1.3,'#e6eee7');box(room,9.5,1.7,-8.72,1.17,.04,.04,'#b8c9bd');box(room,9.95,1.3,-8.7,.05,.6,.05,'#91aa9c');
  solid(9.65,.95,-4.2,.75,1.9,2.4,'#bca17c');for(let row=0;row<3;row++)for(let j=0;j<5;j++)box(room,9.22,.35+row*.55,-5+j*.4,.2,.3,.25,['#e7ba81','#a6b690','#dca69b'][row]);
  solid(5.7,.9,-3.8,2.5,1.8,1,'#c5b08d');box(room,5.7,1.86,-3.8,2.7,.1,1.12,'#e8d8b6');
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
  return {obstacles,rooms:ROOMS};
}
