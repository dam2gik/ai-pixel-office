import terrain from '../electron/mine-terrain.json' with {type:'json'};
import {FLOOR_IDS,floorElevation} from './floors.js';
import {LIFT} from './transport-config.js';
import {slabWithVoids} from './slab-geometry.js';

// Both the model and the navigator use these real footprints. Floor detail is
// instanced, while the large rock bodies reserve conservative walking bounds.
export function buildDeepCampus({deepFloors={},room,box,obstacles,architecture}){
  for(const floor of FLOOR_IDS.filter(f=>f<=-2)){
    const root=deepFloors[floor]||room,y=floorElevation(floor),mine=floor<=-3,deep=floor<=-4;
    const b=(x,h,z,w,height,d,c,k='mineral')=>box(root,x,y+h,z,w,height,d,c,k);
    const block=(x,z,w,d)=>obstacles.push({floor,x,z,w,d});
    const solid=(x,h,z,w,height,d,c,k)=>{b(x,h,z,w,height,d,c,k);block(x,z,w,d);};
    const wall=(x,z,length,finish='glass',axis='x',height=3.2)=>architecture.panel(root,{floor,x,z,length,finish,axis,height});
    const hole={x:LIFT.x,z:LIFT.z,w:3.1,d:2.8};
    slabWithVoids({root,box,x:-1,y:y-.3,z:1,w:60,h:.5,d:40,color:mine?'#454c4b':'#bbc3b0',kind:mine?'stone':'mineral',voids:[hole]});
    for(let x=-30.5;x<=28.5;x++)for(let z=-18.5;z<=20.5;z++){
      if(Math.abs(x-LIFT.x)<1.65&&Math.abs(z-LIFT.z)<1.5)continue;
      const lobby=x<-16&&z>3,kitchen=!mine&&z<-9;
      b(x,-.015,z,.994,.08,.994,mine?(lobby?'#707969':deep?'#474b47':'#626356'):kitchen?'#91aaa4':'#ddd9c8',mine?'earth':lobby?'marble':'tile');
    }
    architecture.features.push({type:mine?'mine-floor':'canteen-floor',floor,width:60,depth:40});
    if(!mine){
      wall(-1,-18.9,60,'plaster');wall(-30.9,1,40,'brick','z');wall(29,1,40,'glass','z');wall(-1,20.9,60,'glass');
      wall(-15,-14,9.8,'plaster','z');
      // Kitchen is separate from guests; the serving line has a wide queue aisle.
      wall(2.8,-9,35.6,'glass');wall(26.2,-9,5.6,'glass');
      architecture.door(root,{floor,x:22,z:-9,width:2.8,finish:'wood',name:'canteen-kitchen'});
      for(const x of [-11,-3,5,13]){
        solid(x,.55,-15.8,6.6,1.1,1.3,'#9ba9a3');b(x,1.15,-15.8,6.8,.12,1.45,'#e5e4dc','marble');
        for(const dx of [-1.8,1.8]){b(x+dx,1.28,-15.8,1.1,.13,.9,'#354843');b(x+dx,1.4,-15.8,.65,.14,.65,'#65766f');}
      }
      for(const x of [20,24]){solid(x,1.35,-17.8,2.5,2.7,1.2,'#9ba9a3');b(x,1.5,-17.15,.06,1.5,.06,'#354843');}
      solid(5,.55,-12,13,1.1,1.5,'#9ba9a3');b(5,1.16,-12,13.2,.12,1.7,'#e5e4dc','marble');
      solid(1,.6,-6.8,30,1.2,1.55,'#aa7954','wood');b(1,1.26,-6.8,30.3,.12,1.7,'#e5e4dc','marble');
      for(let i=0;i<12;i++){
        const x=-12+i*2.2;b(x,1.37,-6.8,1.65,.12,1.1,'#9ba9a3');
        for(let j=0;j<3;j++)b(x-.45+j*.45,1.48,-6.8,.33,.15,.65,['#98b07b','#bd836b','#e8d5a4'][i%3],'fabric');
        if(i%3===0){b(x,1.9,-7.5,.055,1.1,.055,'#65766f');b(x,2.4,-6.8,1.9,.055,1.7,'#b3d4d4','glass');}
      }
      for(let i=0;i<10;i++)b(-14.5,1.05+i*.035,-6.8,1,.03,.75,'#e5e4dc');
      solid(23,.7,-5,5,1.4,1.3,'#aa7954','wood');for(const x of [22,24]){b(x,1.7,-5,.8,.65,.8,'#354843');b(x,1.72,-4.56,.55,.3,.04,'#b3d4d4','glass');}
      // Fifteen four-seat tables; clear cross aisles connect serving and returns.
      for(const x of [-10,-2,6,14,22])for(const z of [1,9,16]){
        solid(x,.85,z,3.5,.16,1.6,'#d1b68d','wood');for(const dx of [-1.35,1.35])b(x+dx,.4,z,.09,.8,1.2,'#65766f');
        for(const dx of [-1,1])for(const side of [-1,1]){
          const cz=z+side*1.5;solid(x+dx,.46,cz,.65,.12,.65,'#739587','fabric');b(x+dx,.85,cz+side*.29,.65,.7,.08,'#739587','fabric');
          for(const fx of [-.23,.23])for(const fz of [-.23,.23])b(x+dx+fx,.21,cz+fz,.045,.42,.045,'#65766f');
          b(x+dx,.965,z+side*.42,.5,.055,.38,'#e5e4dc');b(x+dx,.997,z+side*.42,.22,.035,.19,'#98b07b','leaf');
        }
      }
      solid(-25,.65,2,5.5,1.3,1.5,'#9ba9a3');for(const x of [-26.5,-24.5]){b(x,1.35,2,1.4,.12,1.1,'#65766f');b(x,1.48,2,.9,.15,.75,'#354843');}
      solid(-25,.7,10,5,1.4,1.2,'#aa7954','wood');b(-25,1.46,10,5.2,.12,1.4,'#e5e4dc','marble');
      for(let i=0;i<8;i++)b(-28.5+i,.065,-3.7,.7,.025,.09,'#8daba1','fabric');
      continue;
    }
    // Timber-supported coal galleries: uneven columns form the rock volume.
    const rock=deep?['#41484b','#535956','#343b3e']:['#6d7065','#77786a','#5d635d'];
    const cave=terrain.floors[floor];
    for(const [x,z,w,d,h,tilt,index] of cave.cells){block(x,z,w,d);const mesh=b(x,h/2,z,w,h,d,rock[index%3],'rock');if(mesh?.rotation)mesh.rotation.y=tilt;}
    for(const [x,z,h,item] of cave.ores){b(x,h,z,.3,.22,.12,item==='coal'?'#252c2e':item==='crystal'?'#91c5cd':'#aa7954','rock');}
    for(const [x,z,size,turn] of cave.rubble){const mesh=b(x,size*.18,z,size,size*.36,size*.8,rock[Math.floor(turn*3)],'rock');if(mesh?.rotation){mesh.rotation.y=turn*3;mesh.rotation.z=turn*.3;}}
    // Exposed work faces stay beside the existing employee activity points.
    for(const [x,z,w,d] of [[-20,-6.3,4,1.5],[10,-6.3,4,1.5],[14.5,10,1.5,4]]){solid(x,1.45,z,w,2.9,d,rock[0],'rock');for(let i=0;i<6;i++)b(x-w/2+.3+i*(w-.6)/5,.8+(i%3)*.4,z+d/2+.07,.27,.22,.12,'#252c2e');}
    for(const x of [-30.7,28.9]){solid(x,1.7,1,.7,3.4,40,rock[0],'rock');}
    solid(-1,1.7,-18.7,60,3.4,.7,rock[0],'rock');solid(-1,.65,20.7,60,1.3,.7,rock[1],'rock');
    for(const [x,z,h] of cave.supports){for(const side of [-1,1])solid(x,h/2,z+side*2.15,.22,h,.22,'#aa7954','wood');const beam=b(x,h,z,.27,.22,4.65,'#aa7954','wood');if(beam?.rotation)beam.rotation.z=(x%3)*.025;b(x,h-.18,z,.42,.15,.48,'#ecd7a4','lamp');}
    for(const [x,z,angle] of cave.rails){const tie=b(x,.08,z,.14,.13,1.4,'#aa7954','wood');if(tie?.rotation)tie.rotation.y=-angle;for(const side of [-1,1]){const rail=b(x-Math.sin(angle)*side*.43,.16,z+Math.cos(angle)*side*.43,1,.07,.065,'#9ba9a3');if(rail?.rotation)rail.rotation.y=-angle;}}
    for(const x of [-23,deep?8:18]){
      block(x,0,2,1.4);b(x,.45,0,1.9,.16,1.2,'#65766f');
      for(const z of [-.59,.59])b(x,.8,z,1.9,.65,.1,'#65766f');for(const dx of [-.91,.91])b(x+dx,.8,0,.1,.65,1.2,'#65766f');
      for(const dx of [-.63,.63])for(const z of [-.64,.64])b(x+dx,.25,z,.3,.3,.13,'#252c2e');
      for(let i=0;i<12;i++)b(x-.68+(i%4)*.44,1.05+Math.floor(i/4)*.055,-.38+Math.floor(i/4)*.36,.38,.26,.34,'#252c2e');
    }
    solid(-5,.55,11.2,20,1.1,1.5,'#65766f');b(-5,1.14,11.2,19.5,.08,1.1,'#252c2e','fabric');
    for(let i=0;i<40;i++)b(-14.5+i*.48,1.2,11.2,.08,.06,1.1,'#9ba9a3');
    solid(6,1.3,11.2,3.5,2.6,3.5,'#65766f');b(6,2.75,11.2,4,.3,4,'#aa7954','wood');
    for(let i=0;i<15;i++)b(4.7+(i%5)*.62,2.98+Math.floor(i/5)*.09,10.1+Math.floor(i/5)*.65,.55,.3,.55,'#252c2e');
    for(const x of [-27,-24])for(const z of [12,15]){solid(x,.55,z,1.5,1.1,1.4,'#aa7954','wood');b(x,.58,z,1.57,.12,1.46,'#65766f');}
    solid(-21,1.05,17,2,2.1,1.7,'#65766f');b(-21,1.2,16.1,1.2,.7,.08,'#b3d4d4','glass');
    for(const x of [-18,-15]){b(x,.45,17,1.9,.12,.65,'#aa7954','wood');for(const dx of [-.7,.7])b(x+dx,.2,17,.08,.4,.5,'#65766f');block(x,17,1.9,.65);}
    b(LIFT.x,2.7,LIFT.entryZ-.1,3.3,.15,.15,'#ecd7a4','lamp');
    if(deep)b(LIFT.x,-.75,LIFT.z,3.1,.15,2.8,'#454c4b','stone');
  }
}
