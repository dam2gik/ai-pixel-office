import * as THREE from 'three';
import {FLOOR_IDS,floorElevation,floorLabel} from './floors.js';
import {LIFT} from './transport-config.js';
export function createElevatorVisuals({scene,box,batchStatic,labelLayer}){
  const landings=[];
  for(const floor of FLOOR_IDS){
    const y=floorElevation(floor),root=new THREE.Group(),frame=new THREE.Group();scene.add(root);root.add(frame);
    for(const x of [LIFT.x-1.45,LIFT.x+1.45]){
      box(frame,x,y+1.65,LIFT.z,.12,3.3,2.6,'#b3d4d4','glass');
      box(frame,x,y+1.65,LIFT.z-1.3,.18,3.3,.25,'#65766f');
    }
    box(frame,LIFT.x,y+1.65,LIFT.z+1.3,2.9,3.3,.1,'#b3d4d4','glass');
    box(frame,LIFT.x,y+3.05,LIFT.z-1.3,3.05,.4,.22,'#a9afa4','stone');
    box(frame,LIFT.x,y+.025,LIFT.z-1.5,2.8,.05,.55,'#e5e4dc','marble');
    box(frame,LIFT.x+1.72,y+1.25,LIFT.z-1.4,.17,.4,.07,'#65766f');
    for(const h of [1.16,1.34])box(frame,LIFT.x+1.72,y+h,LIFT.z-1.45,.065,.065,.035,'#ecd7a4');
    const doors=[-1,1].map(side=>({side,mesh:box(root,LIFT.x+side*.64,y+1.38,LIFT.z-1.3,1.25,2.7,.075,'#9ba9a3')}));
    const doorBatch=new THREE.InstancedMesh(doors[0].mesh.geometry,doors[0].mesh.material,2);doorBatch.castShadow=doorBatch.receiveShadow=true;doorBatch.frustumCulled=false;root.add(doorBatch);
    for(const door of doors)door.mesh.removeFromParent();
    batchStatic(frame);
    const label=document.createElement('span');label.className='room-label elevator-label';label.dataset.elevatorFloor=String(floor);labelLayer.append(label);
    landings.push({floor,root,doors,doorBatch,label,point:new THREE.Vector3(LIFT.x,y+3.5,LIFT.z-1.45)});
  }
  const cabin=new THREE.Group();scene.add(cabin);cabin.position.set(LIFT.x,0,LIFT.z);
  box(cabin,0,-.06,0,2.55,.12,2.3,'#e5e4dc','marble');
  box(cabin,0,.5,1.12,2.5,1,.075,'#aa7954','wood');box(cabin,0,1.8,1.12,2.5,1.55,.065,'#b3d4d4','glass');
  for(const x of [-1.25,1.25])box(cabin,x,1.3,0,.065,2.6,2.25,'#b3d4d4','glass');
  box(cabin,0,2.65,0,2.55,.12,2.3,'#65766f');box(cabin,0,2.58,0,1.7,.035,1.5,'#ecd7a4');batchStatic(cabin);
  return {
    update(state,view,project){
      cabin.position.y=state.y;cabin.visible=view==='all'||Math.abs(state.y-floorElevation(view))<3.5;
      const nearest=FLOOR_IDS.reduce((a,b)=>Math.abs(state.y-floorElevation(a))<Math.abs(state.y-floorElevation(b))?a:b),current=floorLabel(nearest),arrow=state.phase==='travel'?(floorElevation(state.to)>state.y?' ↑':' ↓'):'';
      for(const item of landings){
        item.root.visible=view==='all'||view===String(item.floor);
        const opening=Math.abs(state.y-floorElevation(item.floor))<.05?state.doorOpen:0;
        item.doors.forEach((door,index)=>{door.mesh.position.x=LIFT.x+door.side*(.64+opening*1.18);door.mesh.updateMatrix();item.doorBatch.setMatrixAt(index,door.mesh.matrix);});item.doorBatch.instanceMatrix.needsUpdate=true;
        item.label.textContent=`엘리베이터 · ${current}${arrow}${state.queue.length?' · 대기 '+state.queue.length:''}`;
        if(item.root.visible&&view!=='all')project(item.label,item.point);else item.label.hidden=true;
      }
    },
    dispose(){for(const item of landings)item.label.remove();}
  };
}
