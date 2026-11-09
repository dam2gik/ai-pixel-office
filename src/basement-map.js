import {LIFT} from './transport-config.js';
import {slabWithVoids} from './slab-geometry.js';
import {paintFurniture} from './furniture-models.js';
export function buildBasement({basement,basementStairs,room,box,obstacles,architecture}){
  const {panel,door}=architecture,b=(x,y,z,w,h,d,c,k='mineral')=>box(basement,x,y-6,z,w,h,d,c,k);
  const block=(x,z,w,d)=>obstacles.push({floor:-1,x,z,w,d});
  const solid=(x,y,z,w,h,d,c,k)=>{b(x,y,z,w,h,d,c,k);block(x,z,w,d);};
  const wall=(x,z,length,finish='glass',axis='x',height=3.2)=>panel(basement,{floor:-1,x,z,length,finish,axis,height});
  function furnish(type,x,z,w,d,rotation=0){
    const side=rotation===90||rotation===270;block(x,z,side?d:w,side?w:d);
    paintFurniture(type,basement,(_r,lx,ly,lz,bw,bh,bd,c,k)=>{const a=rotation*Math.PI/180;b(x+lx*Math.cos(a)+lz*Math.sin(a),ly,z-lx*Math.sin(a)+lz*Math.cos(a),side?bd:bw,bh,side?bw:bd,c,k);});
  }
  // 60 x 40 wellness floor with a wide promenade and an independent arrival lobby.
  slabWithVoids({root:basement,box,x:-1,y:-6.3,z:1,w:60,h:.5,d:40,color:'#687476',kind:'stone',voids:[{x:LIFT.x,z:LIFT.z,w:3.1,d:2.8}]});
  for(let x=-30.5;x<=28.5;x++)for(let z=-18.5;z<=20.5;z++){
    if(Math.abs(x-LIFT.x)<1.65&&Math.abs(z-LIFT.z)<1.5)continue;
    const passage=Math.abs(z)<3||Math.abs(x)<3||x<-16&&z>-7,quiet=x<-3&&z<-7,golf=x>3&&z<-3,gym=x>3&&z>3;
    b(x,-.015,z,.994,.08,.994,passage?'#d1d5cd':quiet?'#b8a084':golf?'#52695b':gym?'#5c676d':'#d9cbb6',passage?'marble':quiet?'wood':golf||gym?'fabric':'tile');
  }
  wall(-1,-18.9,60,'stone');wall(-30.9,1,40,'stone','z');wall(29,1,40,'glass','z');wall(-1,20.9,60,'glass');
  wall(-3,-13,11.8,'wood','z');wall(-20.6,-7,20.6,'wood');wall(-5.35,-7,4.7,'wood');
  door(basement,{floor:-1,x:-9,z:-7,width:2.6,finish:'wood',name:'capsule-room'});
  // Six double capsules; the open fronts face two separate circulation aisles.
  for(const z of [-15.5,-10.5])for(const x of [-26,-19,-12]){
    block(x,z,3.6,2.8);b(x,1.45,z-1.35,3.6,2.9,.1,'#aa7954','wood');
    for(const dx of [-1.75,1.75])b(x+dx,1.45,z,.1,2.9,2.8,'#aa7954','wood');
    for(const h of [.08,1.45,2.85])b(x,h,z,3.6,.12,2.8,'#aa7954','wood');b(x,1.4,z-1.27,3.24,2.54,.045,'#465259','fabric');
    for(const h of [0,1.4]){
      b(x,.22+h,z+.3,3.25,.12,2.25,'#e5e4dc');b(x,.38+h,z+.3,3.1,.2,2.1,'#e3dfcd','fabric');
      b(x,.51+h,z-.27,1,.14,.65,'#f5f0e2','fabric');b(x,.5+h,z+.8,2.8,.035,.9,'#8daba1','fabric');
      b(x,.18+h,z+1.48,3.32,.09,.18,'#e5e4dc');b(x,1.25+h,z+1.49,3.22,.035,.04,'#ecd7a4');
    }
  }
  furnish('sideboard',-26,-5.7,2.1,.55);furnish('armchair',-24,-4.2,1.1,1.05);
  wall(3,-10.9,16,'stone','z');wall(8.25,-3,10.5,'glass');wall(22.75,-3,12.5,'glass');
  door(basement,{floor:-1,x:15,z:-3,width:3,name:'golf-room'});
  // Three golf bays with their own stance area, projector and spectator seating.
  for(const x of [7,15,23]){
    solid(x,1.6,-18.25,7.2,3.2,.2,'#354843','fabric');b(x,1.75,-18.11,6.8,2.6,.055,'#b7d6d9');b(x,1.05,-18.07,6.8,1.25,.025,'#7b9d6c','leaf');
    for(let i=0;i<6;i++)b(x-.7+i*.23,.8+i*.15,-18.04,1.8-i*.2,.35,.015,'#b4c998','leaf');
    b(x+.6,1.23,-18.01,.025,.7,.018,'#f5f0e2');b(x+.81,1.52,-18,.4,.16,.018,'#bd836b');
    b(x,.065,-14,7,.09,8,'#354843','fabric');b(x,.13,-11.5,1.55,.06,1.5,'#7b9d6c','leaf');
    b(x+.7,.19,-11.85,.085,.075,.085,'#f5f0e2');b(x-1.1,.19,-11.5,.4,.2,.65,'#65766f');b(x,2.98,-12,.65,.24,.45,'#e5e4dc');
  }
  for(const x of [11,19])wall(x,-14.1,8.4,'glass','z',2.6);
  for(const x of [6,10,21,25])furnish('armchair',x,-5.4,1.1,1.05,180);for(const x of [8,23])furnish('coffeeTable',x,-5.4,1.5,.85);
  // Cafe seating, serving counter, prep aisle, drinks cooler and stocked shelves.
  wall(-15,12,18,'brick','z');wall(-3,12,18,'wood','z');wall(-12.75,3,4.5,'glass');wall(-5.25,3,4.5,'glass');
  door(basement,{floor:-1,x:-9,z:3,width:3,name:'snack-bar'});
  solid(-9,.55,14.2,10,1.1,1.6,'#aa7954','wood');b(-9,1.16,14.2,10.3,.12,1.75,'#e5e4dc','marble');
  for(let i=0;i<36;i++)b(-13.8+i*.27,.57,13.36,.07,.94,.065,'#bca489','wood');
  solid(-13.4,1.2,18.9,1.8,2.4,.9,'#65766f');b(-13.4,1.35,18.41,1.55,1.9,.055,'#b3d4d4','glass');solid(-8,1.1,19,7.5,2.2,.7,'#aa7954','wood');
  for(let row=0;row<3;row++)for(let i=0;i<15;i++)b(-11.4+i*.47,.42+row*.57,18.59,.28,.36,.15,['#bd836b','#d3bf88','#739587'][i%3],'fabric');
  b(-11,1.6,14.2,.8,.8,.65,'#354843');b(-11,1.63,13.85,.56,.36,.045,'#b3d4d4','glass');b(-11,1.3,13.75,.22,.21,.22,'#e5e4dc');
  for(const x of [-12,-6])for(const z of [7,10.4])furnish('cafeSet',x,z,2.2,1.4);
  // Cardio row, strength benches, mirrors, stretching deck and a locker strip.
  wall(3,12,18,'glass','z');wall(8.25,3,10.5,'glass');wall(22.75,3,12.5,'glass');
  door(basement,{floor:-1,x:15,z:3,width:3,name:'fitness-room'});
  for(const x of [6,10,14]){
    solid(x,.16,8,2,.32,3,'#65766f');b(x,.34,7.85,1.55,.045,2.45,'#354843','fabric');
    for(const dx of [-.83,.83])b(x+dx,1.1,9,.09,1.7,.09,'#65766f');b(x,1.92,9,1.8,.2,.45,'#354843');b(x,2.04,8.9,.7,.06,.23,'#b3d4d4','glass');
  }
  b(28.8,1.75,11,.045,2.35,14,'#b3d4d4','glass');solid(27,.55,10.5,1,1.1,7.5,'#65766f');
  for(let i=0;i<12;i++){const z=7.2+i*.6;for(const x of [26.75,27.25])b(x,.99,z,.22,.26,.35,'#354843');b(27,.99,z,.45,.065,.065,'#a9afa4');}
  for(const x of [21,24.5]){solid(x,.45,14.2,2,.9,1.1,'#65766f');b(x,.95,14.2,1.9,.16,1,'#739587','fabric');}
  for(const x of [6,9,12])b(x,.055,16.5,1.5,.045,3,'#a0b3a7','fabric');wall(21.8,17.1,11,'wood','x',2.4);
  for(let i=0;i<8;i++){solid(18+i*1.25,1.15,19.6,1.1,2.3,.75,'#a9afa4');b(18+i*1.25,1.3,19.19,.04,.27,.04,'#65766f');}
  solid(-25,.55,6.6,4.5,1.1,1.3,'#aa7954','wood');b(-25,1.15,6.6,4.7,.12,1.4,'#e5e4dc','marble');
  for(const x of [-28,-24])furnish('armchair',x,11.4,1.1,1.05,180);furnish('coffeeTable',-26,11.4,1.5,.85);furnish('displayShelf',-29,17.7,1.6,.55);
  for(const [x,z] of [[-29,-3],[-4,-5],[26,-5],[-16,18],[4,18]]){
    solid(x,.25,z,.65,.5,.65,'#e5e4dc','marble');for(let i=0;i<12;i++)b(x+Math.cos(i*2.4)*.28,.7+i*.065,z+Math.sin(i*2.4)*.28,.28,.2,.28,'#739587','leaf');
  }
  for(const [x,z,w] of [[-16,-18.7,25],[16,-18.7,24],[-9,20.7,10],[16,20.7,24]])b(x,2.9,z,w,.06,.06,'#ecd7a4');
  // Existing stair run stays usable as the alternative to the elevator.
  for(let i=0;i<36;i++){const h=(i+1)/6,z=-3.8+(i+.5)*9.3/36;box(basementStairs,-20.5,-6+h/2,z,2.1,h,9.3/36+.02,'#a9afa4','stone');box(basementStairs,-20.5,-6+h+.025,z,2.14,.05,9.3/36,'#e5e4dc','marble');}
  for(const x of [-21.65,-19.35])for(let i=0;i<=12;i++)box(basementStairs,x,-6+i*.5+.55,-3.8+i*9.3/12,.055,1.1,.055,'#65766f');
  for(const floor of [-1,1])obstacles.push({floor,x:-20.5,z:.8,w:2.1,d:7.5});
  for(const x of [-21.65,-19.35])for(let i=0;i<=10;i++)box(room,x,.55,-3.8+i*.93,.055,1.1,.055,'#65766f');
}
