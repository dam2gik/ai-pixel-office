import {floorElevation} from './floors.js';
import {LIFT} from './transport-config.js';
import {slabWithVoids} from './slab-geometry.js';

export function buildHighFloors({highFloors={},room,box,obstacles,architecture}){
  for(const floor of [3,4,5]){
    const root=highFloors[floor]||room,y=floorElevation(floor),b=(x,h,z,w,height,d,c,kind)=>box(root,x,y+h,z,w,height,d,c,kind);
    const solid=(x,h,z,w,height,d,c,kind)=>{b(x,h,z,w,height,d,c,kind);obstacles.push({floor,x,z,w,d});};
    slabWithVoids({root,box,x:-2,y:y-.25,z:0,w:40,h:.45,d:22,color:'#b5bdae',voids:[{x:LIFT.x,z:LIFT.z,w:3.1,d:2.8}]});
    for(let x=-21.5;x<18;x++)for(let z=-10.5;z<11;z++)if(!(Math.abs(x-LIFT.x)<1.65&&Math.abs(z-LIFT.z)<1.5))b(x,0,z,.99,.07,.99,Math.abs(z)<1.4?'#e0dfd0':floor===4?'#b0a5a5':floor===5?'#c8b58f':'#c6d0c4',Math.abs(z)<1.4?'marble':floor===4?'fabric':'wood');
    const wall=(x,z,length,axis='x',finish='glass',height=3.15)=>architecture.panel(root,{floor,x,z,length,axis,finish,height});
    architecture.windowWall(root,{floor,x:-2,z:-10.9,length:40,finish:floor===4?'brick':'plaster'});wall(-21.9,0,22,'z');wall(17.9,0,22,'z');wall(-2,10.9,40);
    for(const z of [-6.1,6.1]){wall(-15.9,z,9.4,'z',floor===4?'wood':'glass');wall(1.5,z,9.4,'z',floor===4?'wood':'glass');}
    for(const z of [-1.4,1.4]){
      for(const [x,length] of [[-12.375,7.05],[-2.325,7.65],[4.675,6.35],[14.225,7.35]])if(floor!==4||x>0)wall(x,z,length,'x',floor===4?'wood':'glass');
      for(const x of floor===4?[9.2]:[-7.5,9.2])architecture.door(root,{floor,x,z,width:2.4,name:'high-'+floor+'-'+x+'-'+z});
    }
    function chair(x,z,color='#8b9f98'){solid(x,.4,z,.7,.15,.7,color,'fabric');b(x,.85,z-.3,.7,.85,.13,color,'fabric');for(const dx of [-.25,.25])b(x+dx,.18,z,.07,.36,.55,'#65766f');}
    function table(x,z,w=3,d=1.5){solid(x,.78,z,w,.14,d,'#d2b793','wood');for(const dx of [-w/2+.2,w/2-.2])b(x+dx,.37,z,.12,.74,d-.2,'#65766f');}
    function plant(x,z,large=false){solid(x,.25,z,large?1.7:.7,.5,large?1.1:.7,'#b6ac92','stone');for(let i=0;i<(large?7:4);i++)b(x+Math.sin(i*2.4)*(large?.55:.2),.8+(i%3)*.15,z+Math.cos(i*2.4)*.2,.35,.55,.35,['#78996a','#93ad7f','#b1c59a'][i%3],'leaf');}
    function sofa(x,z,color='#a0afa2'){solid(x,.35,z,3.4,.65,1.15,color,'fabric');b(x,.85,z-.45,3.4,.9,.17,color,'fabric');for(const dx of [-1.6,1.6])b(x+dx,.7,z,.2,.7,1.15,'#7b9180');}
    if(floor===3){
      for(const x of [-12,-7,-2]){table(x,-8.2,3.4,1.5);for(const dx of [-.54,.54])for(const dz of [-.46,.46])b(x+dx,1.3,-8.2+dz,.1,.85,.1,'#65766f');b(x,.93,-8.2,1.2,.1,1.1,'#65766f');b(x,1.32,-7.64,.95,.65,.035,'#a9c7c5','glass');b(x,1.2,-8.05,.35,.4,.35,'#ce9d78');b(x,1.75,-8.2,1.3,.12,1.2,'#819890');b(x+.75,1.1,-8.2,.18,.5,.7,'#9ab0c0');}
      for(const x of [5,9,13])for(const z of [-8,-4]){solid(x,1.35,z,1.7,2.7,1.3,'#405650');for(let row=0;row<7;row++){b(x,.3+row*.34,z+.67,1.4,.22,.055,'#667b75');for(const dx of [-.4,-.15,.1])b(x+dx,.33+row*.34,z+.71,.05,.05,.025,row%2?'#82c3c1':'#d6c88c','lamp');}}
      table(-8,5.5,9,2.2);for(const x of [-11,-8,-5]){chair(x,7.1);b(x,.95,5.5,1.2,.06,.8,'#e8e4d4');b(x,1.3,5.1,.9,.65,.07,'#607d83');}b(-8,2,-10.7,12,1.5,.08,'#cadad0');
      for(const x of [5,10,15]){solid(x,.5,6,2.4,1,1.6,'#c8c4b1','stone');b(x,1.3,6,2.2,.9,1.4,'#b8d4d3','glass');b(x,1.1,6,.8,.7,.8,['#b68b75','#839fab','#9baf7e'][Math.round(x)%3]);}plant(15,9);plant(4,9);
    }else if(floor===4){
      solid(-8,.3,-8.2,13,.6,3.8,'#ac8d72','wood');b(-8,2,-10.65,12,2.3,.12,'#496976');b(-8,2,-10.55,11.1,1.8,.04,'#afcad0');for(const x of [-14.5,-1.5]){solid(x,1.1,-8,1.1,2.2,1,'#394c49');for(const h of [.7,1.5])b(x,h,-7.46,.7,.6,.04,'#6f867b');}
      for(const z of [3.3,6,8.7])for(const x of [-12,-8,-4]){solid(x,.42,z,3.1,.7,.75,'#a39aac','fabric');b(x,.9,z-.32,3.1,.65,.15,'#bab0c3','fabric');}b(-8,2.8,1.7,.8,.4,1.1,'#7f9288');
      for(let i=0;i<14;i++)b(2.1+i*1.1,1.5,-10.65,.55,2.6,.16,i%2?'#65796c':'#a39076','fabric');table(9,-8.1,10,1.5);for(let i=0;i<10;i++)b(5+i*.85,.93,-8.1,.45,.04,.8,'#5a716e');b(8.7,1.45,-8.5,2.1,1,.08,'#7899a0');
      for(const x of [5.5,12.5]){b(x,1.2,-5.9,.055,2.4,.055,'#65766f');b(x,2.35,-5.9,.26,.3,.28,'#3f5650');b(x+.35,1,-5.9,.8,.04,.7,'#697e70');}b(9,1.2,-6.6,.05,1.9,.05,'#62776e');b(9,2.1,-6.6,.13,.3,.13,'#405852');
      for(const x of [4.5,7.5,10.5,13.5]){solid(x,.9,9,2.1,1.8,1.15,['#91a1af','#b7a273'][Math.round(x)%2]);b(x,1.2,9.61,1.6,1,.06,'#739caa');b(x,.73,9.8,1.8,.12,.5,'#687e75');for(const dx of [-.35,.35])b(x+dx,.85,9.8,.09,.1,.09,'#e1c98d');for(let j=0;j<3;j++)b(x-.5+j*.5,1.1+j*.17,9.65,.25,.16,.02,['#c7dca2','#ddc28a','#bad7dd'][j],'lamp');}sofa(9,3.6,'#9ba5b5');table(9,6,3,.9);
    }else{
      for(const x of [-12,-8,-4])for(const z of [-8,-4]){plant(x,z,true);for(let j=0;j<4;j++)b(x-.6+j*.4,1.25+(j%2)*.25,z,.25,.55,.3,['#89ad76','#c6b68c','#a7be88'][j%3],'leaf');}
      for(const x of [-15.2,-.2])for(const z of [-10,-2.5])b(x,2,z,.09,4,.09,'#aebdaf');b(-7.7,4,-6.3,15.3,.06,7.6,'#c5dcd4','glass');for(let x=-15;x<0;x+=2)b(x,4.05,-6.3,.07,.09,7.6,'#91a292');
      solid(10,.6,-8.8,11,1.2,1.2,'#ac9073','wood');b(10,1.25,-8.8,11.2,.1,1.4,'#e4dfcc','marble');b(7,1.65,-8.8,1,.8,.7,'#698477');b(13,1.7,-8.8,2.2,.9,.8,'#a2b9aa');for(const x of [5,10,15]){table(x,-4.8,2,1.2);chair(x,-3.2);}
      for(const x of [-12,-7,-2])for(const z of [4,7])b(x,.09,z,2.4,.1,1.4,['#afc2b2','#b9aec5','#c5b994'][Math.abs(x)%3],'fabric');solid(-10,.08,9.4,8,.2,1.2,'#b0b9a4','rock');b(-10,.2,9.4,7,.05,.8,'#98bfc0','water');for(const x of [-13,-11,-9])b(x,.35,9.4,.5,.35,.5,'#8f9f92','rock');
      sofa(9,8,'#aab9a0');sofa(14,4,'#c0b3bb');table(9,5.8,3,1.2);plant(16,9);plant(4,9);b(9,1.4,10.6,13,.08,.08,'#65766f');
    }
    plant(-20.5,-8);b(-20.7,1.6,1,1.6,.9,.1,'#c3d5c9');architecture.features.push({type:'high-floor',floor,rooms:floor===4?3:4,width:40,depth:22});
  }
}
