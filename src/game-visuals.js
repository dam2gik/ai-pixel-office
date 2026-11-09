import * as THREE from 'three';
import C from '../electron/game-catalog.json';
import {paintCharacter} from './character-visuals.js';
import {floorElevation} from './floors.js';

// Material pools draw the whole NPC roster in a few calls. NPCs never enter the
// agent list, acquire desks, create Codex turns, or reset the real staff's life.
export function createGameVisuals({scene,box}){
  const root=new THREE.Group();scene.add(root);const poolMap=new Map(),pools=[],dummy=new THREE.Group();
  let game=null,previous=null,lastUpdate=0,lastLive=-Infinity,revision=0,drawnRevision=-1,drawnView=null,uploads=0;
  const visibleEntities={visibleNpcs:0,visibleMonsters:0,visibleDrops:0},visibleFloors=new Set();
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),scale=new THREE.Vector3(),v=new THREE.Vector3(),euler=new THREE.Euler();
  const templates={};
  function record(list,part,x,y,z,w,h,d,color,kind){
    const mesh=box(dummy,0,0,0,w,h,d,color,kind),key=mesh.geometry.uuid+'|'+mesh.material.uuid;mesh.removeFromParent();
    if(!poolMap.has(key)){const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,5000);batch.count=0;batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;batch.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,-18,0),140);batch.userData.gamePool=true;root.add(batch);const pool={mesh:batch,count:0,ids:[]};poolMap.set(key,pool);pools.push(pool);}
    poolMap.get(key).mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const local=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(w,h,d));list.push({part,pool:poolMap.get(key),local});
  }
  for(const job of ['miner','guard','roamer']){
    const list=[],parts=Object.fromEntries(['body','head','left','right','legL','legR'].map(k=>[k,k]));
    paintCharacter(parts,{hairStyle:'short',outfit:'shirt',accessory:'none',skinColor:'#d8b38e',hairColor:'#685345',shirtColor:job==='miner'?'#b69b6a':job==='guard'?'#7d8da0':'#739587',pantsColor:'#52606a',shoeColor:'#e5e4dc'},(_part,...args)=>record(list,_part,...args));
    if(job!=='roamer'){record(list,'head',0,.36,0,.68,.16,.59,job==='miner'?'#d3b777':'#8a9d9b');record(list,'head',0,.29,0,.76,.04,.67,job==='miner'?'#d3b777':'#8a9d9b');}
    if(job==='miner'){record(list,'right',0,-.87,.15,.055,.8,.055,'#aa7954','wood');record(list,'right',0,-1.22,.15,.65,.08,.1,'#9ba9a3');}
    if(job==='guard'){record(list,'right',0,-.82,.15,.08,.85,.08,'#c7d9df');record(list,'left',0,-.35,.2,.36,.48,.08,'#65766f');}
    templates[job]=list;
  }
  for(const type of Object.keys(C.monsters)){
    const list=[],color=C.monsters[type].color;
    if(type==='slime'){record(list,'body',0,.4,0,1,.75,.9,color);for(const x of [-.2,.2])record(list,'body',x,.5,.46,.1,.12,.035,'#252c2e');}
    if(type==='bat'){record(list,'body',0,.75,0,.4,.6,.35,color);for(const x of [-.55,.55]){record(list,'wing',x,.83,0,.8,.13,.5,color);record(list,'body',x*.22,1.1,0,.13,.25,.15,color);}for(const x of [-.09,.09])record(list,'body',x,.82,.2,.055,.065,.025,'#d5b34f');}
    if(type==='golem'){record(list,'body',0,.75,0,.9,.95,.55,color);record(list,'body',0,1.4,0,.62,.55,.5,color);for(const x of [-.64,.64])record(list,'body',x,.72,0,.35,.9,.4,color);for(const x of [-.23,.23])record(list,'body',x,.22,0,.32,.4,.4,color);for(const x of [-.14,.14])record(list,'body',x,1.45,.265,.09,.07,.025,'#d29779','lamp');}
    templates[type]=list;
  }
  for(const [key,item] of Object.entries(C.items)){const list=[];record(list,'body',0,.24,0,.32,.32,.32,item.color);templates[key]=list;}
  const bones=Object.fromEntries(['body','head','left','right','legL','legR','wing'].map(k=>[k,new THREE.Matrix4()])),rootMatrix=new THREE.Matrix4(),boneMatrix=new THREE.Matrix4();
  const up=new THREE.Vector3(0,1,0),joints={body:[0,0,0],head:[0,1.23,0],left:[-.37,.97,0],right:[.37,.97,0],legL:[-.15,.43,0],legR:[.15,.43,0],wing:[0,0,0]};
  function emit(list,id,kind){for(const d of list){const p=d.pool;if(p.count>=5000)continue;m.multiplyMatrices(bones[d.part],d.local);p.mesh.setMatrixAt(p.count,m);p.ids[p.count]={id,kind};p.count++;}}
  function position(entity,kind,time){const old=previous?.[kind]?.find(v=>v.id===entity.id);const t=game?.running&&performance.now()-lastLive<1800?Math.min(1,Math.max(0,(performance.now()-lastUpdate)/1000)):1;return {x:old&&old.floor===entity.floor?THREE.MathUtils.lerp(old.x,entity.x,t):entity.x,z:old&&old.floor===entity.floor?THREE.MathUtils.lerp(old.z,entity.z,t):entity.z};}
  function skeleton(entity,kind,time){
    const p=position(entity,kind,time),floor=kind==='monsters'?entity.originFloor:entity.floor,y=floorElevation(floor),walking=entity.phase==='walking'||kind==='monsters',step=walking?Math.sin(time*9+entity.x)*.45:0;
    q.setFromAxisAngle(up,entity.yaw||0);rootMatrix.compose(v.set(p.x,y+.04+(kind==='monsters'&&entity.type==='bat'?Math.sin(time*7)*.08:0),p.z),q,scale.setScalar(kind==='npcs'?.92:1));
    for(const [part,pos] of Object.entries(joints)){
      let angle=part==='left'||part==='legR'?step:part==='right'||part==='legL'?-step:0;
      if(part==='right'&&entity.phase==='mining')angle=-1.1+Math.sin(time*4)*.9;
      if(part==='right'&&entity.phase==='combat')angle=-1.2+Math.sin(time*6)*.6;
      euler.set(angle,0,0);q.setFromEuler(euler);boneMatrix.compose(v.set(...pos),q,scale.set(1,1,1));bones[part].multiplyMatrices(rootMatrix,boneMatrix);
    }
    if(kind==='monsters'){for(const key of Object.keys(bones))bones[key].copy(rootMatrix);if(entity.type==='bat'){boneMatrix.makeScale(1,1+Math.sin(time*13)*.6,1);bones.wing.multiply(boneMatrix);}}
  }
  return {
    update(next,live=false){previous=game;game=next;revision++;lastUpdate=performance.now();if(live)lastLive=lastUpdate;},
    active(view){const visible=floor=>view===undefined||view==='all'||String(floor)===view;return !!game?.running&&performance.now()-lastLive<1800&&(game.npcs.some(n=>n.enabled&&visible(n.floor))||game.monsters.some(m=>visible(m.originFloor))||game.drops.some(d=>visible(d.floor)));},
    draw(time,view){
      if(drawnRevision===revision&&drawnView===view&&!this.active(view))return;
      drawnRevision=revision;drawnView=view;
      visibleEntities.visibleNpcs=visibleEntities.visibleMonsters=visibleEntities.visibleDrops=0;visibleFloors.clear();
      for(const p of pools){p.count=0;p.ids.length=0;}
      if(game){time=game.running?time:0;
        const visible=floor=>view==='all'||String(floor)===view;
        for(const n of game.npcs||[]){if(!visible(n.floor)||n.phase==='recovering')continue;visibleEntities.visibleNpcs++;visibleFloors.add(n.floor);skeleton(n,'npcs',time);emit(templates[n.job],n.id,'npc');}
        for(const monster of game.monsters||[]){if(!visible(monster.originFloor))continue;visibleEntities.visibleMonsters++;visibleFloors.add(monster.originFloor);skeleton(monster,'monsters',time);emit(templates[monster.type],monster.id,'monster');}
        for(const d of game.drops||[]){if(!visible(d.floor))continue;visibleEntities.visibleDrops++;visibleFloors.add(d.floor);rootMatrix.makeRotationY(time*.8);rootMatrix.setPosition(d.x,floorElevation(d.floor)+.08+Math.sin(time*3)*.06,d.z);bones.body.copy(rootMatrix);emit(templates[d.item],d.id,'drop');}
      }
      for(const p of pools){p.mesh.count=p.count;if(p.count){p.mesh.instanceMatrix.clearUpdateRanges();p.mesh.instanceMatrix.addUpdateRange(0,p.count*16);p.mesh.instanceMatrix.needsUpdate=true;uploads++;}}
    },
    pick(raycaster){for(const hit of raycaster.intersectObjects(pools.filter(p=>p.count).map(p=>p.mesh),false)){const pool=pools.find(p=>p.mesh===hit.object),selected=pool.ids[hit.instanceId];if(selected)return selected;}return null;},
    stats(){return {npcs:game?.npcs?.length||0,monsters:game?.monsters?.length||0,drops:game?.drops?.length||0,pools:pools.filter(p=>p.count).length,uploads,...visibleEntities,visibleFloors:[...visibleFloors]};},
    dispose(){for(const p of pools)p.mesh.dispose();root.removeFromParent();}
  };
}
