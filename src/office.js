import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMap } from './office-map.js';
import { OfficeLife, createNavigator, deskPosition, ROOMS } from './office-life.js';

export function createOffice(container,onSelect){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9eee7');
  const camera=new THREE.PerspectiveCamera(33,1,.1,160);camera.position.set(27,29,35);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  const pixelRatio=Math.min(window.devicePixelRatio,1.5);renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.enablePan=true;controls.screenSpacePanning=false;controls.minDistance=12;controls.maxDistance=68;controls.maxPolarAngle=Math.PI/2.4;
  scene.add(new THREE.HemisphereLight(0xffffff,0x8c9b8c,2.5));
  const sun=new THREE.DirectionalLight(0xfff8e8,3.2);sun.position.set(-10,24,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-24,right:24,top:24,bottom:-24,far:80});sun.shadow.normalBias=.035;scene.add(sun);
  const materials=new Map();
  function mat(color){if(!materials.has(color))materials.set(color,new THREE.MeshStandardMaterial({color,roughness:.85}));return materials.get(color);}
  const cubeGeometry=new THREE.BoxGeometry(1,1,1),ringGeometry=new THREE.RingGeometry(.48,.55,4),shadowGeometry=new THREE.CircleGeometry(.34,12);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#3d6e54',side:THREE.DoubleSide});
  const shadowMaterial=new THREE.MeshBasicMaterial({color:'#4c5f43',transparent:true,opacity:.16,depthWrite:false});
  function box(parent,x,y,z,w,h,d,color){const m=new THREE.Mesh(cubeGeometry,mat(color));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function batchStatic(root){root.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();root.traverse(m=>{if(m.isMesh&&m.geometry===cubeGeometry&&!m.isInstancedMesh){if(!groups.has(m.material))groups.set(m.material,[]);groups.get(m.material).push(m);}});for(const [material,meshes] of groups){const batch=new THREE.InstancedMesh(cubeGeometry,material,meshes.length);batch.castShadow=true;batch.receiveShadow=true;meshes.forEach((m,i)=>{batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));m.removeFromParent();});batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch);}}
  function clearInstances(root){root.traverse(m=>{if(m.isInstancedMesh)m.dispose();});root.clear();}
  function plant(parent,x,z,scale=1){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);parent.add(g);box(g,0,.28,0,.58,.56,.58,'#d8b499');box(g,0,.6,0,.47,.08,.47,'#655447');box(g,0,1,0,.12,.8,.12,'#6d8560');box(g,-.2,1.15,0,.55,.55,.55,'#739468');box(g,.2,1.35,.03,.55,.6,.5,'#89a877');box(g,0,1.6,0,.45,.45,.45,'#a4ba87');}
  const room=new THREE.Group();scene.add(room);const map=buildMap({room,box,plant});batchStatic(room);
  const life=new OfficeLife(createNavigator(map.obstacles));
  const agentsGroup=new THREE.Group(),furnitureGroup=new THREE.Group(),deskGroup=new THREE.Group();scene.add(agentsGroup,furnitureGroup,deskGroup);
  const actors=new Map(),labelLayer=document.createElement('div');labelLayer.className='world-labels';container.appendChild(labelLayer);
  const roomLabels=ROOMS.map(r=>{const label=document.createElement('button');label.className='room-label';label.textContent=r.name;label.title=r.subtitle;label.addEventListener('click',()=>focusRoom(r.id));labelLayer.appendChild(label);return {label,point:new THREE.Vector3(...r.label)};});
  const actorLabelLayer=document.createElement('div');labelLayer.appendChild(actorLabelLayer);
  let agentSignature='',furnitureSignature='',selected='pm',statusMap={},workingCount=0,handoff=null,lastHandoff=null;
  let raf=0,disposed=false,lastFrame=-Infinity,simulationTime=0,frames=0,dirty=true,interacting=false,width=1,height=1,hostVisible=true,ambientEnabled=true;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  try{ambientEnabled=localStorage.getItem('pixelOffice.ambient')!=='off';}catch{}
  life.setEnabled(ambientEnabled&&!reducedMotion.matches);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  function pointerDown(e){down=[e.clientX,e.clientY];}
  function pointerUp(e){if(!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);for(const hit of raycaster.intersectObjects(agentsGroup.children,true)){let p=hit.object;while(p&&!p.userData.agentId)p=p.parent;if(p?.userData.agentId){onSelect(p.userData.agentId);break;}}}
  renderer.domElement.addEventListener('pointerdown',pointerDown);renderer.domElement.addEventListener('pointerup',pointerUp);
  function joint(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function buildAgents(agents){
    clearInstances(agentsGroup);clearInstances(deskGroup);actors.clear();actorLabelLayer.replaceChildren();life.sync(agents);
    agents.forEach((a,i)=>{
      const {x,z}=deskPosition(i),desk=joint(deskGroup,x,0,z);
      box(desk,0,.92,0,2.1,.16,1.1,'#d1b68d');for(const dx of [-.85,.85])box(desk,dx,.43,0,.12,.86,.85,'#8b9183');
      box(desk,.1,1.42,-.23,.9,.6,.09,'#3f4d47');box(desk,.1,1.42,-.17,.77,.47,.02,'#a5c5b3');box(desk,.1,1.1,-.23,.1,.25,.1,'#52645c');box(desk,.1,1.02,-.23,.4,.04,.28,'#52645c');box(desk,.1,1.02,.2,.65,.04,.25,'#f0e9dc');box(desk,-.7,1.08,.12,.18,.23,.18,a.color);
      const p=life.people.get(a.id),avatar=joint(agentsGroup,p.position.x,.04,p.position.z);avatar.userData.agentId=a.id;
      const pose=joint(avatar,0,0,0);box(pose,0,.68,0,.52,.6,.32,a.color);batchStatic(pose);
      const head=joint(pose,0,1.23,0);box(head,0,0,0,.6,.6,.52,'#edc6a3');const hair=['#675146','#403c42','#9b6541','#605244'][i%4];box(head,0,.32,-.02,.64,.15,.56,hair);box(head,-.27,.15,-.02,.12,.24,.54,hair);box(head,-.14,.03,.267,.07,.08,.02,'#384339');box(head,.14,.03,.267,.07,.08,.02,'#384339');batchStatic(head);
      const left=joint(pose,-.37,.97,0),right=joint(pose,.37,.97,0);
      for(const arm of [left,right]){box(arm,0,-.23,0,.2,.48,.23,a.color);box(arm,0,-.51,0,.2,.14,.23,'#edc6a3');batchStatic(arm);}
      const legL=joint(pose,-.15,.43,0),legR=joint(pose,.15,.43,0);
      for(const leg of [legL,legR]){box(leg,0,-.17,0,.22,.37,.25,'#43546a');box(leg,0,-.36,.08,.24,.13,.4,'#f4eee2');batchStatic(leg);}
      const cup=joint(right,0,-.53,.13);box(cup,0,0,0,.2,.24,.2,'#f9ebc9');box(cup,0,.125,0,.14,.015,.14,'#6e5344');box(cup,.14,0,0,.08,.14,.07,'#f9ebc9');batchStatic(cup);cup.visible=false;
      const snack=box(right,0,-.53,.14,.19,.13,.19,'#d7a26c');snack.visible=false;
      avatar.traverse(m=>{if(m.isMesh)m.castShadow=false;});
      const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/4;ring.position.y=.045;avatar.add(ring);
      const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;avatar.add(shadow);
      const label=document.createElement('button');label.className='world-label';const name=document.createElement('span');name.textContent=a.name;const activity=document.createElement('small');activity.className='actor-activity';const bubble=document.createElement('span');bubble.className='actor-bubble';bubble.hidden=true;label.append(name,activity,bubble);label.addEventListener('click',()=>onSelect(a.id));actorLabelLayer.appendChild(label);
      actors.set(a.id,{avatar,pose,head,left,right,legL,legR,cup,snack,ring,shadow,label,activity,bubble,name:a.name,previousBubble:'',yaw:0});
    });batchStatic(deskGroup);
  }
  function update(state,selectedId){
    selected=selectedId;
    const nextAgents=JSON.stringify(state.agents.map(a=>[a.id,a.name,a.color]));if(nextAgents!==agentSignature){agentSignature=nextAgents;buildAgents(state.agents);renderer.shadowMap.needsUpdate=true;}
    const nextFurniture=JSON.stringify(state.furniture);if(nextFurniture!==furnitureSignature){furnitureSignature=nextFurniture;clearInstances(furnitureGroup);state.furniture.forEach((f,i)=>{const x=-13.6+(i%10)*2.8,z=10.35;if(f.type==='plant')plant(furnitureGroup,x,z,.65);else if(f.type==='bookshelf'){box(furnitureGroup,x,.5,z,1,.95,.35,'#bea07c');for(let j=0;j<4;j++)box(furnitureGroup,x-.3+j*.2,.65,z+.12,.12,.4,.2,['#9fb6a4','#c4a0a0','#e0c58b','#98a9b8'][j]);}else{box(furnitureGroup,x,.3,z,1.3,.5,.65,'#b5a3bf');box(furnitureGroup,x,.65,z-.25,1.3,.6,.15,'#b5a3bf');}});batchStatic(furnitureGroup);renderer.shadowMap.needsUpdate=true;}
    const p=state.projects.find(p=>['planning','running','reporting','stopping'].includes(p.status));statusMap={};
    if(p){for(const t of p.tasks)if(t.status==='queued'&&!statusMap[t.agentId])statusMap[t.agentId]='waiting';for(const t of p.tasks)if(t.status==='running')statusMap[t.agentId]='working';if(['planning','reporting'].includes(p.status))statusMap[p.pmId]='working';}
    life.setWork(statusMap);workingCount=Object.values(statusMap).filter(s=>s==='working').length;
    const event=state.events.filter(e=>e.type==='handoff').at(-1);if(event&&event.id!==lastHandoff){lastHandoff=event.id;if(Date.now()-Date.parse(event.at)<5000)handoff={from:event.fromAgentId,to:event.agentId,start:simulationTime};}
    for(const [id,a] of actors){a.ring.visible=id===selected;a.label.classList.toggle('selected',id===selected);a.label.classList.toggle('working',statusMap[id]==='working');}
    invalidate();
  }
  const packet=box(scene,0,-10,0,.18,.18,.18,'#efd08d');packet.visible=false;packet.castShadow=false;
  const vector=new THREE.Vector3(),labelOffset=new THREE.Vector3(0,2.15,0);
  function invalidate(){dirty=true;if(!raf&&!disposed&&!document.hidden&&hostVisible)raf=requestAnimationFrame(frame);}
  function visibility(){lastFrame=-Infinity;if(document.hidden||!hostVisible){cancelAnimationFrame(raf);raf=0;}else invalidate();}
  function interactionStart(){interacting=true;invalidate();}function interactionEnd(){interacting=false;invalidate();}
  function motionPreference(){life.setEnabled(ambientEnabled&&!reducedMotion.matches);invalidate();}
  controls.addEventListener('change',invalidate);controls.addEventListener('start',interactionStart);controls.addEventListener('end',interactionEnd);document.addEventListener('visibilitychange',visibility);reducedMotion.addEventListener('change',motionPreference);
  function positionLabel(label,point){vector.copy(point).project(camera);const x=Math.round((vector.x*.5+.5)*width),y=Math.round((-vector.y*.5+.5)*height),transform=`translate(-50%,-50%) translate(${x}px,${y}px)`;if(label._transform!==transform){label.style.transform=transform;label._transform=transform;}const visible=vector.z>-1&&vector.z<1&&x>-80&&x<width+80&&y>-40&&y<height+40;if(label.hidden===visible)label.hidden=!visible;}
  const activityNames={coffee:'☕ 커피 충전',snack:'🍪 간식 시간',massage:'안마의자 충전',nap:'z Z 절전 모드',meeting:'아이디어 회의',stretch:'스트레칭',restroom:'잠시 자리 비움',wash:'손 씻는 중'};
  function animateActor(a,p,dt){
    const moving=p.mode==='walking'||p.mode==='returning',resting=p.mode==='resting',phase=p.phase;
    a.avatar.position.set(p.position.x,.04,p.position.z);
    const yawDelta=Math.atan2(Math.sin(p.yaw-a.yaw),Math.cos(p.yaw-a.yaw));a.yaw+=yawDelta*Math.min(1,dt*10);a.avatar.rotation.y=a.yaw;
    a.pose.visible=!(resting&&p.activity==='restroom');a.shadow.visible=a.pose.visible;
    a.pose.position.set(0,0,0);a.pose.rotation.set(0,0,0);a.head.rotation.set(0,0,0);a.left.rotation.set(0,0,0);a.right.rotation.set(0,0,0);a.legL.rotation.set(0,0,0);a.legR.rotation.set(0,0,0);a.cup.visible=false;a.snack.visible=false;
    if(!reducedMotion.matches){
      if(moving){const step=Math.sin(phase*10);a.left.rotation.x=step*.5;a.right.rotation.x=-step*.5;a.legL.rotation.x=-step*.5;a.legR.rotation.x=step*.5;a.pose.position.y=Math.abs(step)*.045;}
      else if(p.mode==='working'&&p.work==='working'){a.left.rotation.x=-.9+Math.sin(simulationTime*11)*.15;a.right.rotation.x=-.9-Math.sin(simulationTime*11)*.15;a.head.rotation.x=.1;}
      else if(resting){
        if(p.activity==='coffee'||p.activity==='snack'){a.right.rotation.x=-1.9+Math.sin(phase*1.6)*.32;a.right.rotation.z=-.18;a.head.rotation.z=-.08;a.cup.visible=p.activity==='coffee';a.snack.visible=p.activity==='snack';}
        if(p.activity==='massage'){a.pose.position.set(Math.sin(phase*32)*.018,.36,-.95);a.pose.rotation.x=-.23;a.head.rotation.z=Math.sin(phase*3)*.07;a.legL.rotation.x=-1.2;a.legR.rotation.x=-1.2;a.left.rotation.x=-.25;a.right.rotation.x=-.25;}
        if(p.activity==='nap'){a.pose.position.set(0,.35,-.9);a.legL.rotation.x=-1.4;a.legR.rotation.x=-1.4;a.head.rotation.z=.25+Math.sin(phase*1.4)*.04;a.head.rotation.x=.18;}
        if(p.activity==='stretch'){a.left.rotation.z=-2.6;a.right.rotation.z=2.6;a.pose.rotation.z=Math.sin(phase*1.4)*.13;a.head.rotation.x=-.13;}
        if(p.activity==='meeting'){a.right.rotation.x=-.9;a.right.rotation.z=Math.sin(phase*3)*.4;a.head.rotation.y=Math.sin(phase*.7)*.28;}
        if(p.activity==='wash'){a.left.rotation.x=-1;a.right.rotation.x=-1;a.left.rotation.z=.2+Math.sin(phase*12)*.12;a.right.rotation.z=-.2-Math.sin(phase*12)*.12;a.head.rotation.x=.15;}
      }
    }
    const activity=moving?(p.mode==='returning'?'자리로 복귀 중':'잠깐 산책 중'):p.mode==='working'?(p.work==='working'?'업무에 집중 중':'다음 업무 대기'):resting?activityNames[p.activity]:'잠시 생각 중';
    if(a.activity.textContent!==activity){a.activity.textContent=activity;a.label.setAttribute('aria-label',`${a.name} · ${activity}`);container.dispatchEvent(new CustomEvent('office:activity',{detail:{id:p.id,text:activity,bubble:p.bubble}}));}
    if(a.previousBubble!==p.bubble){a.bubble.textContent=p.bubble;a.previousBubble=p.bubble;}
    const showBubble=resting&&(p.phase%9<5||p.id===selected);a.bubble.hidden=!showBubble;
    vector.copy(a.avatar.position).add(labelOffset);if(resting&&['massage','nap'].includes(p.activity))vector.z-=.9;positionLabel(a.label,vector);
  }
  function frame(time){
    raf=0;if(disposed||document.hidden||!hostVisible)return;
    const interval=1000/(interacting?60:workingCount?30:24);if(time-lastFrame<interval){raf=requestAnimationFrame(frame);return;}
    const dt=Number.isFinite(lastFrame)?Math.min((time-lastFrame)/1000,.12):0;const cameraChanged=controls.update();if(reducedMotion.matches)handoff=null;
    const animated=!reducedMotion.matches&&(workingCount>0||!!handoff||(ambientEnabled&&actors.size>0));if(!dirty&&!cameraChanged&&!animated&&!interacting)return;
    dirty=false;lastFrame=time;simulationTime+=dt;life.tick(dt);
    for(const [id,a] of actors)animateActor(a,life.people.get(id),dt);
    for(const item of roomLabels)positionLabel(item.label,item.point);
    packet.visible=false;if(handoff){const a=actors.get(handoff.from),b=actors.get(handoff.to),t=(simulationTime-handoff.start)/2.4;if(a&&b&&t<1){packet.visible=true;packet.position.lerpVectors(a.avatar.position,b.avatar.position,t);packet.position.y=2+Math.sin(t*Math.PI);}else handoff=null;}
    renderer.render(scene,camera);frames++;if(animated||cameraChanged||interacting)invalidate();
  }
  function focusRoom(id){const room=ROOMS.find(r=>r.id===id);if(!room){camera.position.set(27,29,35);controls.target.set(0,0,0);}else{controls.target.set(room.x,0,room.z);camera.position.set(room.x+13,16,room.z+17);}controls.update();invalidate();}
  const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();invalidate();});resize.observe(container);renderer.shadowMap.needsUpdate=true;invalidate();
  return {update,focusRoom,setVisible(value){hostVisible=value;visibility();},setAmbientEnabled(value){ambientEnabled=Boolean(value);life.setEnabled(ambientEnabled&&!reducedMotion.matches);try{localStorage.setItem('pixelOffice.ambient',value?'on':'off');}catch{}invalidate();return ambientEnabled;},stats(){return {frames,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,pixelRatio,shadowSize:1024,workingCount,ambientEnabled,reducedMotion:reducedMotion.matches,paused:document.hidden||!hostVisible,rooms:ROOMS.map(r=>r.id),people:life.snapshot()};},reset(){focusRoom('all');},zoom(delta){camera.position.sub(controls.target).multiplyScalar(delta).add(controls.target);invalidate();},dispose(){disposed=true;cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',visibility);reducedMotion.removeEventListener('change',motionPreference);renderer.domElement.removeEventListener('pointerdown',pointerDown);renderer.domElement.removeEventListener('pointerup',pointerUp);controls.dispose();scene.traverse(m=>{if(m.isInstancedMesh)m.dispose();});for(const g of [cubeGeometry,ringGeometry,shadowGeometry])g.dispose();ringMaterial.dispose();shadowMaterial.dispose();for(const m of materials.values())m.dispose();sun.shadow.map?.dispose();renderer.dispose();labelLayer.remove();renderer.domElement.remove();}}
}
