import {floorElevation} from './floors.js';
// Structural panels occupy real navigation footprints; door openings remain
// clear. Sliding leaves are parked beside the opening, not across the route.
export const FINISH={glass:'#b3d4d4',frame:'#65766f',wood:'#aa7954',brick:'#b77860',stone:'#a9afa4',marble:'#e5e4dc',plaster:'#e6e5d9'};
export function createArchitecture({box,obstacles,features=[]}){
  function panel(root,{floor=1,axis='x',x,z,length,finish='glass',height=3.1,collision=true}){
    const y=floorElevation(floor),along=axis==='x';
    const draw=(offset,h,v,span,thickness,color,kind)=>box(root,x+(along?offset:0),y+v,z+(along?0:offset),along?span:thickness,h,along?thickness:span,color,kind);
    if(collision)obstacles.push({floor,x,z,w:along?length:.18,d:along?.18:length});
    features.push({type:'wall',floor,axis,x,z,length,finish});
    if(finish==='glass'){
      draw(0,.55,.275,length,.2,FINISH.stone,'stone');
      draw(0,height-.65,(height+.55)/2,length,.055,FINISH.glass,'glass');
      for(const v of [.58,height])draw(0,.065,v,length,.12,FINISH.frame,'mineral');
      const count=Math.max(1,Math.ceil(length/2.2));
      for(let i=0;i<=count;i++)draw(-length/2+i*length/count,height-.55,(height+.55)/2,.055,.12,FINISH.frame,'mineral');
      draw(0,.045,1.25,length,.063,'#edf4e7','mineral');
    }else{
      draw(0,height,height/2,length,.2,FINISH[finish],finish);
      draw(0,.12,.08,length,.24,FINISH.stone,'stone');
      draw(0,.09,height,length,.24,FINISH.wood,'wood');
    }
  }
  function door(root,{floor=1,x,z,width=2,finish='glass',name='entry'}){
    const y=floorElevation(floor),height=2.65;
    for(const side of [-1,1])box(root,x+side*(width/2+.05),y+height/2,z,.1,height,.22,FINISH.frame,'mineral');
    box(root,x,y+height,z,width+.2,.14,.23,FINISH.frame,'mineral');
    box(root,x,y+3,z,width+.2,.55,.065,FINISH.glass,'glass');
    box(root,x,y+.035,z,width,.025,.3,FINISH.marble,'marble');
    // Double sliding leaves sit visibly behind the adjacent wall panels.
    for(const side of [-1,1]){
      const leafX=x+side*(width*.75+.1);
      box(root,leafX,y+1.28,z+.13,width/2,2.48,.06,FINISH[finish],finish);
      box(root,leafX-side*(width/4-.09),y+1.2,z+.2,.04,.42,.035,FINISH.frame,'mineral');
    }
    box(root,x,y+2.99,z+.13,Math.min(width*.7,1.25),.22,.055,FINISH.wood,'wood');
    features.push({type:'door',name,floor,x,z,width,finish,open:true});
  }
  function windowWall(root,{floor=1,x,z,length,finish='brick',height=3.3}){
    const y=floorElevation(floor);
    box(root,x,y+.42,z,length,.84,.2,FINISH[finish],finish);
    box(root,x,y+height-.18,z,length,.36,.2,FINISH[finish],finish);
    const count=Math.ceil(length/3.4),span=length/count;
    for(let i=0;i<count;i++){
      const cx=x-length/2+(i+.5)*span;
      box(root,cx,y+1.9,z,span-.22,2.12,.06,FINISH.glass,'glass');
      for(const dx of [-span/2,span/2])box(root,cx+dx,y+1.9,z,.16,2.12,.22,FINISH[finish],finish);
      for(const v of [.88,1.9,2.94])box(root,cx,y+v,z+.07,span-.16,.06,.1,FINISH.frame,'mineral');
      box(root,cx,y+1.9,z+.07,.055,2.12,.1,FINISH.frame,'mineral');
      box(root,cx,y+.84,z+.13,span-.14,.09,.38,FINISH.marble,'marble');
    }
    obstacles.push({floor,x,z,w:length,d:.2});features.push({type:'window-wall',floor,x,z,length,finish});
  }
  return {panel,door,windowWall,features};
}
