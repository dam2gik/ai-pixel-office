import {LIFT} from './transport-config.js';
import {slabWithVoids} from './slab-geometry.js';
import {createArchitecture} from './architecture.js';
import {FLOOR_HEIGHT} from './office-life.js';
export function buildCampus({room,upper=room,garden=room,stairs=room,structure=upper,box,plant,obstacles,architecture}){
  architecture??=createArchitecture({box,obstacles});
  const {panel,door,windowWall}=architecture;
  const solid=(root,floor,x,y,z,w,h,d,color)=>{box(root,x,y,z,w,h,d,color);obstacles.push({floor,x,z,w,d});};
  // A generous entrance gallery wraps the original ground-floor rooms.
  for(let x=-21.75;x<=17.75;x+=.5)for(let z=-11.75;z<=13.75;z+=.5)if((x<-16||x>16||z<-11||z>11)&&!(x<-19.3&&x>-21.7&&z>=-3.9&&z<=5.6)&&!(Math.abs(x-LIFT.x)<1.55&&Math.abs(z-LIFT.z)<1.4))box(room,x,-.015,z,.493,.08,.493,(Math.round((x+z)*2)%2)?'#e6dfcc':'#f0e9d8');
  for(const x of [-20,16.5]){plant(room,x,12.5,1);obstacles.push({floor:1,x,z:12.5,w:.7,d:.7});}
  box(room,-18.8,1,11.2,3.2,.15,1.2,'#e5e4dc','marble');box(room,-18.8,.48,11.2,2.9,.9,.9,'#aa7954','wood');for(let i=0;i<15;i++)box(room,-20.15+i*.19,.48,11.67,.07,.82,.06,'#65766f','mineral');
  obstacles.push({floor:1,x:-18.8,z:11.2,w:3.2,d:1.2});
  // Actual stair opening and sloped traversal connect the two levels.
  const count=36;
  for(let i=0;i<count;i++){const z=5.5-(i+.5)*9.3/count,h=(i+1)*FLOOR_HEIGHT/count;box(stairs,-18,h/2,z,2.2,h,9.3/count+.02,'#b9a58b');box(stairs,-18,h+.025,z,2.25,.05,9.3/count,'#e8dbc1');}
  for(const x of [-19.25,-16.75])for(let i=0;i<=6;i++){const z=5.5-i*9.3/6,y=i*FLOOR_HEIGHT/6;box(stairs,x,y+.5,z,.07,1,.07,'#87998b');}
  obstacles.push({floor:1,x:-18,z:.8,w:2.2,d:7.5},{floor:2,x:-18,z:1,w:2.2,d:7.6});
  // Ground-level garden: stone promenade, a pond, pergola, and flowering borders.
  box(garden,-2,-.25,21,40,.5,13,'#9eb38a');
  for(let x=-21.75;x<=17.75;x+=.5)for(let z=14.25;z<=26.75;z+=.5)box(garden,x,-.005,z,.5,.08,.5,(Math.round((x+z)*2)%3)?'#bace9e':'#b4c997','leaf');
  for(let z=14.5;z<=26.5;z++)for(const x of [-1,0,1])box(garden,x,.045,z,.97,.08,.97,'#e7e1cb');
  for(let x=-21.5;x<=17.5;x++)for(const z of [19.5,20.5])box(garden,x,.047,z,.98,.08,.98,'#e7e1cb');
  solid(garden,1,-10,.05,23.7,6.1,.22,4.5,'#a9afa4','stone');box(garden,-10,.2,23.7,5.1,.08,3.5,'#91bfc0','water');
  for(const [x,z] of [[-11,24],[-9,23],[-10.4,22.7]]){box(garden,x,.27,z,.55,.06,.45,'#789a68');box(garden,x+.1,.34,z,.15,.1,.15,'#ecc2cf');}
  // Natural stone coping, reeds, a small stone fountain and a timber pond deck.
  for(let i=0;i<13;i++)for(const edge of [-1,1])box(garden,-12.75+i*.46,.27,23.7+edge*2.02,.42,.26+(i%3)*.035,.42,'#a9afa4','stone');
  for(let i=0;i<8;i++)for(const edge of [-1,1])box(garden,-10+edge*2.8,.26,22.08+i*.46,.42,.25+(i%2)*.04,.42,'#a9afa4','stone');
  for(let i=0;i<12;i++)box(garden,-12.55+i*.46,.36,21.62,.42,.09,.48,'#aa7954','wood');
  box(garden,-11.6,.43,24.5,.65,.35,.65,'#a9afa4','stone');box(garden,-11.6,.68,24.5,.9,.15,.9,'#e5e4dc','marble');
  box(garden,-11.6,.98,24.5,.06,.55,.06,'#b3d4d4','glass');
  for(let i=0;i<7;i++){const x=-7.65+(i%2)*.12,z=22.4+i*.38;box(garden,x,.49,z,.045,.55+(i%3)*.09,.045,'#aa7954','wood');box(garden,x,.8+(i%3)*.05,z,.09,.2,.08,'#87a477','leaf');}
  panel(garden,{x:-2,z:27.1,length:40,height:.65,finish:'brick',collision:false});
  for(let i=0;i<21;i++)box(garden,-21.5+i*1.95,1.05,27.1,.075,.8,.075,'#aa7954','wood');
  box(garden,-2,1.4,27.1,40,.08,.09,'#aa7954','wood');
  function tree(x,z){box(garden,x,1.25,z,.34,2.5,.34,'#988467');for(let i=0;i<96;i++){const angle=i*2.4,r=.25+(i%7)*.135,dy=2.4+(i%9)*.135;box(garden,x+Math.cos(angle)*r,dy,z+Math.sin(angle)*r,.34,.29,.34,['#87a477','#9bb889','#adc69a'][i%3],'leaf');}obstacles.push({floor:1,x,z,w:.8,d:.8});}
  for(const [x,z] of [[-19,16],[-19,25.5],[15,25.5],[16,16]])tree(x,z);
  for(const x of [-20.7,17])for(const z of [17.5,23,26]){solid(garden,1,x,.18,z,.8,.35,1.8,'#a9b58d');for(let j=0;j<3;j++){box(garden,x,.55,z-.5+j*.5,.35,.45,.35,'#89a476');box(garden,x,.83,z-.5+j*.5,.32,.2,.32,['#dec198','#d9a5b8','#eee0ac'][j]);}}
  for(const [x,z] of [[-15.8,17.1],[13.7,16.8]]){solid(garden,1,x,.48,z,2.2,.16,.7,'#b99e7b');box(garden,x,.9,z-.35,2.2,.8,.12,'#ceb48f');for(const dx of [-.85,.85])box(garden,x+dx,.23,z,.12,.45,.55,'#7f9580');}
  for(const x of [7,13])for(const z of [22.3,26])solid(garden,1,x,1.7,z,.18,3.4,.18,'#a88e6d');
  for(let x=6.8;x<=13.2;x+=.8)box(garden,x,3.45,24.15,.14,.16,4.2,'#d1b994');
  box(garden,10,3.52,24.15,6.6,.08,4.2,'#d6dbc1');
  solid(garden,1,10,.4,25.6,4,.7,1,'#a5b699');box(garden,10,.95,26,4,1,.16,'#bcc8aa');solid(garden,1,10,.4,23,2.5,.15,1,'#cdb78f');
  // The upper floor has an open stair void instead of an opaque slab over it.
  const y=FLOOR_HEIGHT;
  box(structure,-2,3,-11,40,6,.16,'#e1e5d8');
  for(const x of [-21.4,17.2])for(const z of [-10.5,10.5]){box(structure,x,3,z,.38,6,.38,'#e4dfcf');box(structure,x,5.7,z,.7,.35,.7,'#d7d2c0');for(const floor of [1,2])obstacles.push({floor,x,z,w:.4,d:.4});}
  box(upper,.75,y-.2,0,34.5,.4,22,'#b7bcae');box(upper,-19.25,y-.2,-7.4,5.5,.4,7.2,'#b7bcae');slabWithVoids({root:upper,box,x:-19.25,y:y-.2,z:8.25,w:5.5,h:.4,d:5.5,color:'#b7bcae',voids:[{x:LIFT.x,z:LIFT.z,w:3.1,d:2.8}]});box(upper,-20.9,y-.2,.9,2.2,.4,10.1,'#b7bcae');
  for(let x=-21.75;x<=17.75;x+=.5)for(let z=-10.75;z<=10.75;z+=.5)if(!(x>=-19.5&&x<=-16.5&&z>=-3&&z<=5.5)&&!(Math.abs(x-LIFT.x)<1.55&&Math.abs(z-LIFT.z)<1.4)){
    const finish=z>1?'wood':x<2?'wood':'marble';
    box(upper,x,y-.015,z,.493,.08,.493,finish==='marble'?'#e5e4dc':z>1?'#cfa77d':'#ba946c',finish);
  }
  windowWall(upper,{floor:2,x:-2,z:-10.9,length:40,finish:'brick'});
  for(const z of [-6.7,7])panel(upper,{floor:2,axis:'z',x:-15.9,z,length:z<0?8.5:8,finish:'glass'});
  panel(upper,{floor:2,axis:'z',x:-15.9,z:-.775,length:3.35,finish:'glass'});
  panel(upper,{floor:2,axis:'z',x:17.25,z:-5,length:11.8,finish:'glass'});
  panel(upper,{floor:2,axis:'z',x:1.8,z:-5.1,length:11.6,finish:'glass'});
  for(const [x,length,finish] of [[-8.45,14.9,'glass'],[1.4,.8,'wood'],[4.5,5.4,'glass'],[12.95,8.3,'glass']])panel(upper,{floor:2,x,z:.9,length,finish});
  door(upper,{floor:2,x:0,z:.9,width:2,name:'focus'});
  door(upper,{floor:2,x:8,z:.9,width:1.6,name:'library'});
  // Brick cafe wall and timber battens define the sky lounge coffee corner.
  panel(upper,{floor:2,x:-7,z:2.55,length:4.1,height:2.45,finish:'brick'});
  for(let i=0;i<17;i++)box(upper,-15.5+i*.18,y+1.45,7.4,.065,2.9,.12,'#aa7954','wood');
  obstacles.push({floor:2,x:-14.06,z:7.4,w:3.1,d:.12});
  for(const x of [-12,-8,-4])for(const z of [-7,-3]){solid(upper,2,x,y+.9,z,2.5,.16,1.2,'#cfb58c');for(const dx of [-1,1])box(upper,x+dx,y+.43,z,.13,.85,.8,'#9ba58f');box(upper,x,y+1.36,z-.15,.85,.65,.08,'#526860');box(upper,x,y+1.36,z-.1,.72,.5,.03,'#c1d6c5');box(upper,x,y+1.01,z+.3,.7,.035,.25,'#f5eedc');}
  for(const x of [5,9,13]){solid(upper,2,x,y+1,-9,3.1,2,.6,'#b79f7d');for(let row=0;row<3;row++)for(let j=0;j<9;j++)box(upper,x-1.3+j*.3,y+.35+row*.6,-8.64,.18,.45,.12,['#a4b89e','#d4b5a4','#c4c7dc','#e3ce96'][j%4]);}
  solid(upper,2,8,y+.85,-4.2,6,.16,2,'#e5e4dc','marble');for(const x of [6,10]){box(upper,x,y+1,-4,.7,.06,.5,'#ede9da');box(upper,x,y+.4,-2.9,.7,.15,.5,'#91a99b');}
  solid(upper,2,-7,y+.6,3.3,3.4,1.2,1,'#c7b18b');box(upper,-7,y+1.25,3.3,3.6,.1,1.15,'#f9eedb');box(upper,-7,y+1.6,3.2,.65,.65,.5,'#547064');
  solid(upper,2,8,y+.4,4.3,4,.7,1.2,'#c4b1b7');box(upper,8,y+1,3.8,4,1,.18,'#dfccd0');solid(upper,2,8,y+.4,6.8,2.1,.15,.8,'#c9b493');
  for(const x of [-20.5,16.5]){plant(upper,x,6,1.1,y);obstacles.push({floor:2,x,z:6,w:.8,d:.8});}
  box(upper,-2,y+.55,10.85,39.5,.9,.055,'#b3d4d4','glass');
  // Open front railing keeps the entire upper terrace visible.
  for(let x=-21;x<=17;x+=2)box(upper,x,y+.55,10.85,.08,1.1,.08,'#91a292');box(upper,-2,y+1.1,10.85,40,.08,.08,'#b0bcaa');
}
