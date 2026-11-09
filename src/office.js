import {createGameVisuals} from './game-visuals.js';
import {createFreeCamera} from './free-camera.js';
import {createExterior} from './exterior.js';
import {fitSectionCamera} from './section-camera.js';
import {createOfficeLighting} from './office-lighting.js';
import {createLightingPanel} from './lighting-panel.js';
import {BASEMENT_BOUNDS} from './transport-config.js';
import {createElevatorVisuals} from './elevator-visuals.js';
import {FLOOR_IDS,FLOOR_NAMES,floorElevation,floorLabel} from './floors.js';
import * as THREE from 'three';
import {paintFurniture} from './furniture-models.js';
import {createDetailGeometry} from './detail-geometry.js';
import {detailedMaterial} from './surface-materials.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildMap } from './office-map.js';
import { OfficeLife, createNavigator, deskPosition, ROOMS } from './office-life.js';
import furnitureLayout from '../electron/furniture-layout.json';
import {appearanceFor,paintCharacter} from './character-visuals.js';

export function createOffice(container,onSelect,options={}){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e9eee7');
  const camera=new THREE.PerspectiveCamera(33,1,.1,240);camera.position.set(40,42,58);
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});
  const pixelRatio=Math.min(Math.max(window.devicePixelRatio,1.5),2);renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;container.appendChild(renderer.domElement);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-2,0,6);controls.enableDamping=true;controls.enablePan=true;controls.screenSpacePanning=false;controls.minDistance=12;controls.maxDistance=115;controls.maxPolarAngle=Math.PI/2.4;
  const lighting=createOfficeLighting({scene,renderer,invalidate}),sun=lighting.sun;
  const materials=new Map();
  function mat(color,kind){const key=color+'|'+(kind||'auto');if(!materials.has(key))materials.set(key,detailedMaterial(color,{kind,lighting:lighting.uniforms}));return materials.get(key);}
  const detailGeometry=createDetailGeometry(),cubeGeometry=detailGeometry.cube,ringGeometry=new THREE.RingGeometry(.48,.55,4),shadowGeometry=new THREE.CircleGeometry(.34,12);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#3d6e54',side:THREE.DoubleSide});
  const shadowMaterial=new THREE.MeshBasicMaterial({color:'#4c5f43',transparent:true,opacity:.16,depthWrite:false});
  function box(parent,x,y,z,w,h,d,color,kind,shape){kind??=h===.08&&w>=.45&&d>=.45&&(Math.abs(y)<.08||Math.abs(y-6)<.08)?'tile':undefined;const m=new THREE.Mesh(shape==='slab'?cubeGeometry:detailGeometry.forBox(w,h,d),mat(color,kind));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=kind!=='glass';m.receiveShadow=kind!=='glass';parent.add(m);return m;}
  function batchStatic(root){
    root.updateWorldMatrix(true,true);const inverse=new THREE.Matrix4().copy(root.matrixWorld).invert(),groups=new Map();
    root.traverse(m=>{if(m.isMesh&&!m.isInstancedMesh&&(m.geometry===cubeGeometry||m.geometry===detailGeometry.carved)){
      if(!groups.has(m.geometry))groups.set(m.geometry,new Map());const byMaterial=groups.get(m.geometry);
      const surface=m.material.userData.surface;
      const shared=surface==='lamp'?m.material:mat('#ffffff',surface);
      if(!byMaterial.has(shared))byMaterial.set(shared,[]);byMaterial.get(shared).push(m);
    }});
    for(const [geometry,byMaterial] of groups)for(const [material,meshes] of byMaterial){
      const batch=new THREE.InstancedMesh(geometry,material,meshes.length);batch.castShadow=material.userData.surface!=='glass';batch.receiveShadow=material.userData.surface!=='glass';
      meshes.forEach((m,i)=>{batch.setMatrixAt(i,new THREE.Matrix4().multiplyMatrices(inverse,m.matrixWorld));if(material.userData.surface!=='lamp')batch.setColorAt(i,m.material.color);m.removeFromParent();});
      batch.instanceMatrix.needsUpdate=true;batch.computeBoundingSphere();root.add(batch);
    }
    // Static descendants never need their local matrices rebuilt each frame.
    root.traverse(child=>{if(child!==root){child.updateMatrix();child.matrixAutoUpdate=false;}});
  }
  function clearInstances(root){root.traverse(m=>{if(m.isInstancedMesh)m.dispose();});root.clear();}
  function plant(parent,x,z,scale=1,elevation=0){const g=new THREE.Group();g.position.set(x,elevation,z);g.scale.setScalar(scale);parent.add(g);box(g,0,.28,0,.58,.56,.58,'#d8b499');box(g,0,.6,0,.47,.08,.47,'#655447');box(g,0,1,0,.12,.8,.12,'#6d8560');for(let i=0;i<28;i++){const angle=i*2.4,y=.91+(i%9)*.085,r=.12+(i%3)*.075;box(g,Math.cos(angle)*r,y,Math.sin(angle)*r,.17,.14,.17,['#739468','#89a877','#a4ba87'][i%3],'leaf');}}
  const deepFloors=Object.fromEntries(FLOOR_IDS.filter(f=>f<-1).map(f=>[f,new THREE.Group()]));scene.add(...Object.values(deepFloors));for(const root of Object.values(deepFloors))root.visible=false;
  const highFloors=Object.fromEntries(FLOOR_IDS.filter(f=>f>2).map(f=>[f,new THREE.Group()]));scene.add(...Object.values(highFloors));for(const root of Object.values(highFloors))root.visible=false;
  const room=new THREE.Group(),upper=new THREE.Group(),garden=new THREE.Group(),stairs=new THREE.Group(),structure=new THREE.Group(),basement=new THREE.Group(),basementStairs=new THREE.Group();scene.add(room,upper,garden,stairs,structure,basement,basementStairs);const map=buildMap({room,upper,garden,stairs,structure,basement,basementStairs,deepFloors,highFloors,box,plant});for(const root of [room,upper,garden,stairs,structure,basement,basementStairs,...Object.values(deepFloors),...Object.values(highFloors)])batchStatic(root);upper.visible=structure.visible=basement.visible=false;
  lighting.installFixtures({roots:{1:room,2:upper,'-1':basement,...deepFloors,...highFloors},box,batchStatic});
  const life=new OfficeLife(createNavigator(map.obstacles));
  const agentsGroup=new THREE.Group(),furnitureGroup=new THREE.Group(),deskGroup=new THREE.Group();scene.add(agentsGroup,furnitureGroup,deskGroup);
  const actors=new Map(),labelLayer=document.createElement('div');labelLayer.className='world-labels';container.appendChild(labelLayer);
  const roomLabels=ROOMS.map(r=>{const label=document.createElement('button');label.className='room-label';label.textContent=r.name;label.title=r.subtitle;label.addEventListener('click',()=>focusRoom(r.id));labelLayer.appendChild(label);return {label,id:r.id,floor:r.floor||1,point:new THREE.Vector3(r.label[0],r.label[1]+floorElevation(r.floor||1),r.label[2])};});
  const liftRoot=new THREE.Group();scene.add(liftRoot);
  const liftVisuals=createElevatorVisuals({scene:liftRoot,box,batchStatic,labelLayer});
  const exterior=createExterior({scene,box,batchStatic});
  const gameVisuals=createGameVisuals({scene,box});
  const actorLabelLayer=document.createElement('div');labelLayer.appendChild(actorLabelLayer);
  const sectionLabels=FLOOR_IDS.map(floor=>{
    const label=document.createElement('button'),number=document.createElement('strong'),name=document.createElement('small');label.className='section-floor-label';label.dataset.sectionFloor=String(floor);label.hidden=true;
    number.textContent=floorLabel(floor);name.textContent=FLOOR_NAMES[floor].split(' · ')[1]||'오피스';label.append(number,name);label.title=FLOOR_NAMES[floor]+' 보기';label.onclick=()=>setFloor(String(floor));labelLayer.append(label);
    return {floor,label,point:new THREE.Vector3(32,floorElevation(floor)+2,21.8)};
  });
  let agentSignature='',furnitureSignature='',selected='pm',statusMap={},workingCount=0,handoff=null,lastHandoff=null;
  let renderedFloor=null,renderedEnvironment=null;
  let raf=0,disposed=false,lastFrame=-Infinity,simulationTime=0,frames=0,dirty=true,interacting=false,width=1,height=1,hostVisible=true,ambientEnabled=true;
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let floorView='1',focusedRoom=null,editMode=false,selectedFurniture=null,furnitureItems=[],drag=null,previewTimer=null,previewSequence=0;
  let environment='inside',interiorPose=null;
  const lightingPanel=createLightingPanel(lighting);
  const furnitureObjects=new Map(),editZones=new THREE.Group();scene.add(editZones);editZones.visible=false;
  const zoneMaterial=new THREE.MeshBasicMaterial({color:'#8ab588',transparent:true,opacity:.16,depthWrite:false});
  for(const zone of furnitureLayout.zones){const mesh=new THREE.Mesh(cubeGeometry,zoneMaterial);mesh.scale.set(zone.w,.025,zone.d);mesh.position.set(zone.x,floorElevation(zone.floor)+.09,zone.z);mesh.userData.floor=zone.floor;editZones.add(mesh);}
  const previewMaterial=new THREE.MeshBasicMaterial({color:'#81bd91',transparent:true,opacity:.45,depthWrite:false}),placementPreview=new THREE.Mesh(cubeGeometry,previewMaterial);scene.add(placementPreview);placementPreview.visible=false;
  const floorVisible=floor=>environment==='inside'&&(floorView==='all'||String(floor)===floorView);
  const freeButton=document.querySelector('#freeCamera'),freeHelp=document.querySelector('#freeCameraHelp');
  const flight=createFreeCamera({camera,controls,canvas:renderer.domElement,invalidate,available:()=>hostVisible&&!document.hidden&&!editMode,onChange:value=>{freeButton?.setAttribute('aria-pressed',String(value));if(freeButton)freeButton.textContent=value?'자유시점 끄기 · F':'자유시점 · F';if(freeHelp)freeHelp.hidden=!value;if(value)flight.place(environment==='outside'?0:floorElevation(floorView==='all'?1:floorView),environment==='inside'&&Number(floorView)<0);}});
  const toggleFlight=()=>{if(editMode)return;flight.set(!flight.enabled);};
  freeButton?.addEventListener('click',toggleFlight);
  const environmentButtons=[...document.querySelectorAll('[data-environment]')],outsideNav=document.querySelector('#outsideNav'),trafficButton=document.querySelector('#trafficToggle');
  const environmentClick=e=>setEnvironment(e.currentTarget.dataset.environment);
  environmentButtons.forEach(button=>button.addEventListener('click',environmentClick));
  const outsideFocus=e=>focusOutside(e.currentTarget.dataset.outsideFocus);
  const outsideFocusButtons=[...document.querySelectorAll('[data-outside-focus]')];outsideFocusButtons.forEach(button=>button.addEventListener('click',outsideFocus));
  const trafficToggle=()=>{const enabled=!exterior.stats().trafficEnabled;exterior.setTraffic(enabled);trafficButton?.setAttribute('aria-pressed',String(enabled));if(trafficButton)trafficButton.textContent=enabled?'차량 운행 중':'차량 일시정지';invalidate();};trafficButton?.addEventListener('click',trafficToggle);
  function focusOutside(area='campus'){
    if(environment!=='outside')return;flight.set(false);
    const views={campus:{target:[-2,7,4],position:[125,115,155]},building:{target:[-2,14,2],position:[75,54,94]},parking:{target:[-45,0,5],position:[-4,38,49]},park:{target:[43,0,4],position:[80,37,54]}};
    const view=views[area]||views.campus;controls.target.set(...view.target);camera.position.set(...view.position);controls.update();invalidate();
  }
  function setEnvironment(value){
    if(!['inside','outside'].includes(value)||value===environment)return;flight.set(false);cancelDrag();
    if(value==='outside'){
      if(editMode){document.querySelector('#closeFurnitureEditor')?.click();editMode=false;editZones.visible=false;placementPreview.visible=false;}
      interiorPose={position:camera.position.clone(),target:controls.target.clone(),view:camera.view?{...camera.view}:null};camera.clearViewOffset();environment=value;
      for(const root of [room,upper,basement,basementStairs,stairs,structure,deskGroup,agentsGroup,furnitureGroup,liftRoot,...Object.values(deepFloors),...Object.values(highFloors)])root.visible=false;
      garden.visible=true;labelLayer.hidden=true;exterior.setVisible(true);camera.far=560;controls.maxDistance=340;
      scene.background.set('#dce9e6');focusOutside();
    }else{
      environment=value;exterior.setVisible(false);agentsGroup.visible=furnitureGroup.visible=liftRoot.visible=true;labelLayer.hidden=false;camera.far=240;controls.maxDistance=115;
      scene.background.set('#e9eee7');setFloor(floorView,false);
      if(interiorPose){camera.position.copy(interiorPose.position);controls.target.copy(interiorPose.target);controls.update();if(interiorPose.view?.enabled){const v=interiorPose.view;camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);}}
    }
    camera.updateProjectionMatrix();lighting.configure(environment,floorView);
    document.querySelector('.game-world')?.classList.toggle('outside-view',value==='outside');document.querySelector('.game-world')?.classList.toggle('section-view',value==='inside'&&floorView==='all');if(outsideNav)outsideNav.hidden=value!=='outside';
    environmentButtons.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.environment===value)));invalidate();
  }
  function showPlacement(item,color='#82b595'){const type=furnitureLayout.types[item.type],sideways=item.rotation===90||item.rotation===270;placementPreview.scale.set(sideways?type.d:type.w,.05,sideways?type.w:type.d);placementPreview.position.set(item.x,floorElevation(item.floor)+.12,item.z);previewMaterial.color.set(color);placementPreview.visible=editMode&&floorVisible(item.floor);invalidate();}
  function selectFurniture(id){selectedFurniture=id;const item=furnitureItems.find(f=>f.id===id);if(item){if(!floorVisible(item.floor))setFloor(String(item.floor));showPlacement(item);}else placementPreview.visible=false;invalidate();}
  function setFloor(value,fit=true){if(environment==='outside')setEnvironment('inside');if(value!=='all'&&!FLOOR_IDS.includes(Number(value)))return;floorView=String(value);document.querySelector('.game-world')?.classList.toggle('section-view',environment==='inside'&&floorView==='all');camera.clearViewOffset();controls.maxDistance=floorView==='all'?440:115;camera.far=floorView==='all'?600:240;camera.updateProjectionMatrix();room.visible=garden.visible=deskGroup.visible=floorVisible(1);upper.visible=floorVisible(2);basement.visible=floorVisible(-1);for(const [floor,root] of Object.entries({...deepFloors,...highFloors}))root.visible=floorVisible(floor);basementStairs.visible=['-1','1','all'].includes(floorView);stairs.visible=['1','2','all'].includes(floorView);structure.visible=floorView==='all';for(const item of roomLabels)item.label.hidden=!floorVisible(item.floor);for(const g of furnitureObjects.values())g.visible=floorVisible(g.userData.floor);for(const zone of editZones.children)zone.visible=floorVisible(zone.userData.floor);renderer.shadowMap.needsUpdate=true;if(fit){const freeFov=flight.enabled?camera.fov:null;if(freeFov){camera.fov=33;camera.updateProjectionMatrix();}if(Number(floorView)<0){const y=floorElevation(floorView);controls.target.set(-1,y,1);camera.position.set(56,y+54,70);}else if(floorView==='all'){fitSectionCamera(camera,controls,container);}else{const y=floorElevation(floorView);controls.target.set(-2,y,floorView==='1'||floorView==='all'?6:0);camera.position.set(40,y+42,floorView==='1'||floorView==='all'?58:46);}controls.update();if(flight.enabled){flight.rememberOrbit();camera.fov=freeFov;camera.updateProjectionMatrix();flight.place(floorElevation(floorView==='all'?1:floorView),Number(floorView)<0);}}lighting.configure(environment,floorView);selectFurniturePreview();container.dispatchEvent(new CustomEvent('office:floor',{detail:{floor:floorView}}));invalidate();}
  function selectFurniturePreview(){const item=furnitureItems.find(f=>f.id===selectedFurniture);if(item)showPlacement(item);else placementPreview.visible=false;}
  try{ambientEnabled=localStorage.getItem('pixelOffice.ambient')!=='off';}catch{}
  life.setEnabled(ambientEnabled&&!reducedMotion.matches);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let down;
  function setRay(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);}
  function dragOffset(item){const point=new THREE.Vector3();raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-floorElevation(item.floor)),point);return {x:item.x-point.x,z:item.z-point.z};}
  function pointerDown(e){down=[e.clientX,e.clientY];if(!editMode||e.button!==0)return;setRay(e);for(const hit of raycaster.intersectObjects([...furnitureObjects.values()].filter(g=>g.visible),true)){let g=hit.object;while(g&&!g.userData.furnitureId)g=g.parent;if(!g)continue;const item=furnitureItems.find(f=>f.id===g.userData.furnitureId);selectFurniture(item.id);options.onFurnitureSelect?.(item.id);drag={item:{...item},group:g,offset:dragOffset(item),patch:{x:item.x,z:item.z,floor:item.floor,rotation:item.rotation}};controls.enabled=false;renderer.domElement.setPointerCapture(e.pointerId);e.preventDefault();e.stopImmediatePropagation();break;}}
  function pointerMove(e){if(!drag)return;setRay(e);const hit=new THREE.Vector3();if(!raycaster.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-floorElevation(drag.item.floor)),hit))return;drag.patch={...drag.patch,x:Math.round((hit.x+drag.offset.x)*2)/2,z:Math.round((hit.z+drag.offset.z)*2)/2};drag.group.position.x=drag.patch.x;drag.group.position.z=drag.patch.z;showPlacement({...drag.item,...drag.patch},'#dfbf77');clearTimeout(previewTimer);const item=drag.item,patch={...drag.patch},sequence=++previewSequence;previewTimer=setTimeout(async()=>{try{const result=await options.onFurniturePreview?.(item.id,patch);if(drag&&sequence===previewSequence)showPlacement({...item,...patch},result?.valid?'#82b595':'#d88f83');}catch{}},50);e.preventDefault();}
  function cancelDrag(){if(drag){drag.group.position.x=drag.item.x;drag.group.position.z=drag.item.z;}drag=null;clearTimeout(previewTimer);previewSequence++;controls.enabled=true;selectFurniturePreview();}
  function pointerUp(e){if(drag){const item=drag.item,patch=drag.patch,changed=item.x!==patch.x||item.z!==patch.z;cancelDrag();if(renderer.domElement.hasPointerCapture(e.pointerId))renderer.domElement.releasePointerCapture(e.pointerId);if(changed)Promise.resolve(options.onFurnitureMove?.(item.id,patch)).catch(error=>options.onError?.(error.message));e.stopImmediatePropagation();return;}if(environment==='outside'||e.button!==0||editMode||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;setRay(e);for(const hit of raycaster.intersectObjects(agentsGroup.children,true)){let p=hit.object;while(p&&!p.userData.agentId)p=p.parent;if(p?.userData.agentId){onSelect(p.userData.agentId);return;}}const picked=gameVisuals.pick(raycaster);if(picked)container.dispatchEvent(new CustomEvent('game:pick',{detail:picked}));}
  renderer.domElement.addEventListener('pointerdown',pointerDown,true);renderer.domElement.addEventListener('pointermove',pointerMove);renderer.domElement.addEventListener('pointerup',pointerUp,true);renderer.domElement.addEventListener('pointercancel',cancelDrag);
  function joint(parent,x,y,z){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
  function buildFurniture(items){
    cancelDrag();clearInstances(furnitureGroup);furnitureObjects.clear();furnitureItems=items;
    for(const f of items){const g=joint(furnitureGroup,f.x,floorElevation(f.floor),f.z);g.rotation.y=f.rotation*Math.PI/180;g.userData={furnitureId:f.id,floor:f.floor};
      if(paintFurniture(f.type,g,box)){}
      else if(f.type==='plant')plant(g,0,0,.8);
      else if(f.type==='bookshelf'){box(g,0,.9,0,1.4,1.8,.65,'#bea07c');for(let row=0;row<3;row++){box(g,0,.2+row*.55,.35,1.3,.08,.07,'#dbc39a');for(let j=0;j<5;j++)box(g,-.5+j*.24,.42+row*.55,.35,.15,.35,.08,['#9fb6a4','#c4a0a0','#e0c58b','#98a9b8'][j%4]);}}
      else if(f.type==='sofa'){box(g,0,.35,0,2.2,.6,1.15,'#b5a3bf');box(g,0,.9,-.48,2.2,1,.2,'#c9bad2');for(const x of [-.53,.53]){box(g,x,.67,.04,.99,.1,.87,'#c9bad2','fabric');box(g,x,1.01,-.355,.99,.65,.06,'#c9bad2','fabric');}for(const x of [-1,1])box(g,x,.65,0,.2,.65,1.15,'#a693b3');}
      else if(f.type==='bench'){for(let slat=0;slat<4;slat++)box(g,0,.48,-.32+slat*.21,2.2,.12,.18,'#c7ac85','wood');for(let slat=0;slat<3;slat++)box(g,0,.67+slat*.23,-.36,2.2,.19,.12,'#b79a72','wood');for(const x of [-.8,.8])box(g,x,.22,0,.12,.45,.7,'#829482');}
      else if(f.type==='table'){box(g,0,.6,0,1.2,.12,1.2,'#d5bc95');for(const x of [-.45,.45])for(const z of [-.45,.45])box(g,x,.3,z,.1,.6,.1,'#a18c72');}
      else if(f.type==='planter'){box(g,0,.25,0,1.8,.5,.8,'#cfb89b');for(let i=0;i<4;i++){box(g,-.6+i*.4,.6,0,.3,.45,.45,'#8eaa78');box(g,-.6+i*.4,.87,0,.25,.22,.3,['#d5a6ba','#e1c18f','#e7dcab','#c7b6ce'][i]);}}
      batchStatic(g);g.visible=floorVisible(f.floor);furnitureObjects.set(f.id,g);
    }
    const obstacles=items.map(f=>{const spec=furnitureLayout.types[f.type],sideways=f.rotation===90||f.rotation===270;return {floor:f.floor,x:f.x,z:f.z,w:sideways?spec.d:spec.w,d:sideways?spec.w:spec.d};});life.setNavigator(createNavigator([...map.obstacles,...obstacles]));selectFurniturePreview();
  }
  function buildAgents(agents){
    clearInstances(agentsGroup);clearInstances(deskGroup);actors.clear();actorLabelLayer.replaceChildren();life.sync(agents);
    agents.forEach((a,i)=>{
      const {x,z}=deskPosition(i),desk=joint(deskGroup,x,0,z);
      box(desk,0,.92,0,2.1,.16,1.1,'#d1b68d');for(const dx of [-.85,.85])box(desk,dx,.43,0,.12,.86,.85,'#8b9183');
      box(desk,.1,1.42,-.23,.9,.6,.09,'#3f4d47');box(desk,.1,1.42,-.17,.77,.47,.02,'#a5c5b3');box(desk,.1,1.1,-.23,.1,.25,.1,'#52645c');box(desk,.1,1.02,-.23,.4,.04,.28,'#52645c');box(desk,.1,1.02,.2,.65,.04,.25,'#f0e9dc');for(let row=0;row<3;row++)for(let col=0;col<10;col++)box(desk,-.17+col*.06,1.046,.12+row*.065,.045,.009,.04,'#b7bdb1');for(let line=0;line<5;line++)box(desk,-.13+(line%2)*.04,1.57-line*.065,-.153,.33+(line%3)*.08,.018,.008,['#e0eddb','#789f8b'][line%2]);box(desk,-.7,1.08,.12,.18,.23,.18,a.color);
      const p=life.people.get(a.id),avatar=joint(agentsGroup,p.position.x,.04,p.position.z);avatar.userData.agentId=a.id;
      const pose=joint(avatar,0,0,0),body=joint(pose,0,0,0),head=joint(pose,0,1.23,0);
      const left=joint(pose,-.37,.97,0),right=joint(pose,.37,.97,0);
      const legL=joint(pose,-.15,.43,0),legR=joint(pose,.15,.43,0);
      const parts={body,head:joint(head,0,0,0),left:joint(left,0,0,0),right:joint(right,0,0,0),legL,legR},appearance=appearanceFor(a,i);paintCharacter(parts,appearance,box,batchStatic);
      const cup=joint(right,0,-.53,.13);box(cup,0,0,0,.2,.24,.2,'#f9ebc9');box(cup,0,.125,0,.14,.015,.14,'#6e5344');box(cup,.14,0,0,.08,.14,.07,'#f9ebc9');batchStatic(cup);cup.visible=false;
      const snack=box(right,0,-.53,.14,.19,.13,.19,'#d7a26c');snack.visible=false;
      const golfClub=joint(right,0,-.53,.14);box(golfClub,0,-.48,0,.035,.96,.035,'#a9afa4');box(golfClub,.09,-.96,0,.22,.1,.09,'#65766f');batchStatic(golfClub);golfClub.visible=false;
      const dumbbells=joint(right,0,-.53,.14);for(const x of [-.15,.15])box(dumbbells,x,0,0,.13,.2,.2,'#354843');box(dumbbells,0,0,0,.25,.045,.045,'#a9afa4');batchStatic(dumbbells);dumbbells.visible=false;
      const mineHelmet=joint(head,0,0,0);box(mineHelmet,0,.36,0,.67,.17,.58,'#d3b777');box(mineHelmet,0,.29,.01,.76,.045,.67,'#d3b777');box(mineHelmet,0,.37,.335,.14,.1,.045,'#ecd7a4','lamp');batchStatic(mineHelmet);mineHelmet.visible=false;
      const pickaxe=joint(right,0,-.53,.14);box(pickaxe,0,-.38,0,.055,.85,.055,'#aa7954','wood');box(pickaxe,0,-.75,0,.62,.075,.1,'#9ba9a3');for(const x of [-.29,.29])box(pickaxe,x,-.8,0,.16,.1,.095,'#9ba9a3');batchStatic(pickaxe);pickaxe.visible=false;
      const mealTray=joint(left,0,-.5,.18);box(mealTray,0,0,0,.42,.035,.32,'#739587');box(mealTray,0,.05,0,.22,.065,.18,'#e5e4dc');box(mealTray,0,.09,0,.14,.04,.11,'#98b07b','leaf');batchStatic(mealTray);mealTray.visible=false;
      avatar.traverse(m=>{if(m.isMesh)m.castShadow=false;});
      const ring=new THREE.Mesh(ringGeometry,ringMaterial);ring.rotation.x=-Math.PI/2;ring.rotation.z=Math.PI/4;ring.position.y=.045;avatar.add(ring);
      const shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=.015;avatar.add(shadow);
      const label=document.createElement('button');label.className='world-label';const name=document.createElement('span');name.textContent=a.name;const activity=document.createElement('small');activity.className='actor-activity';const bubble=document.createElement('span');bubble.className='actor-bubble';bubble.hidden=true;label.append(name,activity,bubble);label.addEventListener('click',()=>onSelect(a.id));actorLabelLayer.appendChild(label);
      actors.set(a.id,{avatar,pose,head,left,right,legL,legR,parts,appearance,appearanceSignature:JSON.stringify(appearance),cup,snack,golfClub,dumbbells,mineHelmet,pickaxe,mealTray,ring,shadow,label,activity,bubble,name:a.name,previousBubble:'',yaw:0});
    });batchStatic(deskGroup);
  }
  function update(state,selectedId){
    if(state.game)gameVisuals.update(state.game);
    selected=selectedId;
    const nextAgents=JSON.stringify(state.agents.map(a=>[a.id,a.name]));if(nextAgents!==agentSignature){agentSignature=nextAgents;buildAgents(state.agents);renderer.shadowMap.needsUpdate=true;}
    state.agents.forEach((agent,index)=>{const actor=actors.get(agent.id),appearance=appearanceFor(agent,index),signature=JSON.stringify(appearance);if(signature!==actor.appearanceSignature){for(const part of Object.values(actor.parts))clearInstances(part);paintCharacter(actor.parts,appearance,box,batchStatic);actor.pose.traverse(m=>{if(m.isMesh)m.castShadow=false;});actor.appearance=appearance;actor.appearanceSignature=signature;}});
    const nextFurniture=JSON.stringify(state.furniture);if(nextFurniture!==furnitureSignature){furnitureSignature=nextFurniture;buildFurniture(state.furniture);renderer.shadowMap.needsUpdate=true;}
    const p=state.projects.find(p=>['planning','running','reporting','stopping'].includes(p.status));statusMap={};
    if(p){for(const t of p.tasks)if(t.status==='queued'&&!statusMap[t.agentId])statusMap[t.agentId]='waiting';for(const t of p.tasks)if(t.status==='running')statusMap[t.agentId]='working';if(['planning','reporting'].includes(p.status))statusMap[p.pmId]='working';}
    life.setWork(statusMap);workingCount=Object.values(statusMap).filter(s=>s==='working').length;
    const event=state.events.filter(e=>e.type==='handoff').at(-1);if(event&&event.id!==lastHandoff){lastHandoff=event.id;if(Date.now()-Date.parse(event.at)<5000)handoff={from:event.fromAgentId,to:event.agentId,start:simulationTime};}
    for(const [id,a] of actors){
      const running=p?.tasks.find(t=>t.agentId===id&&t.status==='running');
      const queued=p?.tasks.find(t=>t.agentId===id&&t.status==='queued');
      a.workTitle=p?.pmId===id&&p.status==='planning'?'업무 계획 수립':p?.pmId===id&&p.status==='reporting'?'최종 보고서 작성':running?.title||(queued?`대기 · ${queued.title}`:'');
      a.label.title=a.workTitle;
      a.ring.visible=id===selected;a.label.classList.toggle('selected',id===selected);a.label.classList.toggle('working',statusMap[id]==='working');a.label.classList.toggle('has-task',Boolean(a.workTitle));
    }
    invalidate();
  }
  const packet=box(scene,0,-10,0,.18,.18,.18,'#efd08d');packet.visible=false;packet.castShadow=false;
  const vector=new THREE.Vector3(),labelOffset=new THREE.Vector3(0,2.15,0);
  function invalidate(){dirty=true;if(!raf&&!disposed&&!document.hidden&&hostVisible)raf=requestAnimationFrame(frame);}
  function visibility(){flight.clear();lastFrame=-Infinity;if(document.hidden||!hostVisible){cancelAnimationFrame(raf);raf=0;}else invalidate();}
  function interactionStart(){interacting=true;invalidate();}function interactionEnd(){interacting=false;invalidate();}
  function motionPreference(){life.setEnabled(ambientEnabled&&!reducedMotion.matches);invalidate();}
  controls.addEventListener('change',invalidate);controls.addEventListener('start',interactionStart);controls.addEventListener('end',interactionEnd);document.addEventListener('visibilitychange',visibility);reducedMotion.addEventListener('change',motionPreference);
  function positionLabel(label,point){vector.copy(point).project(camera);const x=Math.round((vector.x*.5+.5)*width),y=Math.round((-vector.y*.5+.5)*height),transform=`translate(-50%,-50%) translate(${x}px,${y}px)`;if(label._transform!==transform){label.style.transform=transform;label._transform=transform;}const visible=vector.z>-1&&vector.z<1&&x>-80&&x<width+80&&y>-40&&y<height+40;if(label.hidden===visible)label.hidden=!visible;}
  const activityNames={maker:'공방에서 제작 중',research:'서버 연구 중',talk:'강당 발표 관람',studio:'스튜디오 녹음',gaming:'아케이드 게임',greenhouse:'온실 식물 돌보기',skytea:'스카이 카페에서 휴식',yoga:'요가·명상',dine:'구내식당에서 식사 중',mine:'탄광에서 채굴 중',capsule:'캡슐에서 수면 중',golf:'스크린골프 연습',run:'러닝머신 운동',workout:'웨이트 트레이닝',coffee:'☕ 커피 충전',snack:'🍪 간식 시간',massage:'안마의자 충전',nap:'z Z 절전 모드',meeting:'아이디어 회의',stretch:'스트레칭',restroom:'잠시 자리 비움',wash:'손 씻는 중',garden:'정원 산책',reading:'책 읽는 중'};
  function animateActor(a,p,dt){
    const moving=p.mode==='walking'||p.mode==='returning'||p.mode==='lift-boarding'||p.mode==='lift-exiting',resting=p.mode==='resting',phase=p.phase;
    a.avatar.position.set(p.position.x,(p.position.y||0)+.04,p.position.z);a.avatar.visible=p.transport?(floorView==='all'||Math.abs((p.position.y||0)-floorElevation(floorView))<3.5):floorVisible(p.position.floor||1)||!!p.position.transition&&(floorView==='all'||(p.position.stairId==='basement'?['1','-1']:['1','2']).includes(floorView));
    const yawDelta=Math.atan2(Math.sin(p.yaw-a.yaw),Math.cos(p.yaw-a.yaw));a.yaw+=yawDelta*Math.min(1,dt*10);a.avatar.rotation.y=a.yaw;
    a.pose.visible=!(resting&&p.activity==='restroom');a.shadow.visible=a.pose.visible;
    a.pose.position.set(0,0,0);a.pose.rotation.set(0,0,0);a.head.rotation.set(0,0,0);a.left.rotation.set(0,0,0);a.right.rotation.set(0,0,0);a.legL.rotation.set(0,0,0);a.legR.rotation.set(0,0,0);a.cup.visible=false;a.snack.visible=false;a.golfClub.visible=false;a.dumbbells.visible=false;a.mineHelmet.visible=p.activity==='mine'&&(p.position.floor||1)<=-3;a.pickaxe.visible=resting&&p.activity==='mine';a.mealTray.visible=resting&&p.activity==='dine';
    if(resting&&p.activity==='dine'){a.pose.position.set(0,.1,.85);a.legL.rotation.x=a.legR.rotation.x=-1.4;a.left.rotation.x=-1.25;a.right.rotation.x=-1.6;a.head.rotation.x=.15;}
    if(!reducedMotion.matches){
      if(moving){const step=Math.sin(phase*10);a.left.rotation.x=step*.5;a.right.rotation.x=-step*.5;a.legL.rotation.x=-step*.5;a.legR.rotation.x=step*.5;a.pose.position.y=Math.abs(step)*.045;}
      else if(p.mode==='working'&&p.work==='working'){a.left.rotation.x=-.9+Math.sin(simulationTime*11)*.15;a.right.rotation.x=-.9-Math.sin(simulationTime*11)*.15;a.head.rotation.x=.1;}
      else if(resting){
        if(p.activity==='coffee'||p.activity==='skytea'||p.activity==='snack'){a.right.rotation.x=-1.9+Math.sin(phase*1.6)*.32;a.right.rotation.z=-.18;a.head.rotation.z=-.08;a.cup.visible=['coffee','skytea'].includes(p.activity);a.snack.visible=p.activity==='snack';}
        if(p.activity==='massage'){a.pose.position.set(Math.sin(phase*32)*.018,.36,-.95);a.pose.rotation.x=-.23;a.head.rotation.z=Math.sin(phase*3)*.07;a.legL.rotation.x=-1.2;a.legR.rotation.x=-1.2;a.left.rotation.x=-.25;a.right.rotation.x=-.25;}
        if(p.activity==='nap'){a.pose.position.set(0,.35,-.9);a.legL.rotation.x=-1.4;a.legR.rotation.x=-1.4;a.head.rotation.z=.25+Math.sin(phase*1.4)*.04;a.head.rotation.x=.18;}
        if(['stretch','yoga'].includes(p.activity)){a.left.rotation.z=-2.6;a.right.rotation.z=2.6;a.pose.rotation.z=Math.sin(phase*1.4)*.13;a.head.rotation.x=-.13;}
        if(['meeting','talk','studio'].includes(p.activity)){a.right.rotation.x=-.9;a.right.rotation.z=Math.sin(phase*3)*.4;a.head.rotation.y=Math.sin(phase*.7)*.28;}
        if(p.activity==='wash'){a.left.rotation.x=-1;a.right.rotation.x=-1;a.left.rotation.z=.2+Math.sin(phase*12)*.12;a.right.rotation.z=-.2-Math.sin(phase*12)*.12;a.head.rotation.x=.15;}
        if(['reading','maker','research','gaming'].includes(p.activity)){a.left.rotation.x=-1.1;a.right.rotation.x=-1.1;a.left.rotation.z=.2;a.right.rotation.z=-.2;a.head.rotation.x=.2+Math.sin(phase*.8)*.03;}
        if(p.activity==='dine'){a.right.rotation.x=-1.6+Math.sin(phase*2)*.3;a.head.rotation.x=.15+Math.sin(phase)*.035;}
        if(p.activity==='mine'){a.right.rotation.x=-1.1+Math.sin(phase*3.2)*.9;a.left.rotation.x=-.4;a.pose.rotation.y=Math.sin(phase*3.2)*.07;a.head.rotation.x=.12;}
        if(p.activity==='capsule'){a.pose.position.set(0,.65,-.9);a.pose.rotation.x=-Math.PI/2;a.left.rotation.z=.1;a.right.rotation.z=-.1;}
        if(p.activity==='golf'){const swing=Math.sin(phase*1.7);a.pose.rotation.y=swing*.35;a.left.rotation.x=-1.3+swing*.6;a.right.rotation.x=-1.5+swing*.8;a.right.rotation.z=-.3;a.golfClub.visible=true;}
        if(p.activity==='run'){const step=Math.sin(phase*12);a.pose.position.set(0,.2+Math.abs(step)*.06,1.8);a.left.rotation.x=-.5+step*.6;a.right.rotation.x=-.5-step*.6;a.legL.rotation.x=-step*.65;a.legR.rotation.x=step*.65;}
        if(p.activity==='workout'){a.right.rotation.x=-.5-(Math.sin(phase*2.5)+1)*.65;a.left.rotation.x=-.3;a.dumbbells.visible=true;}
        if(['garden','greenhouse'].includes(p.activity)){a.head.rotation.y=Math.sin(phase*.5)*.25;a.pose.position.y=Math.sin(phase*1.2)*.015;}
      }
    }
    const activity=p.transport?(p.mode==='lift-waiting'?'엘리베이터 대기 중':p.mode==='lift-riding'?'엘리베이터 이동 중':'엘리베이터 승하차 중'):a.workTitle||(moving?(p.mode==='returning'?'자리로 복귀 중':'잠깐 산책 중'):p.mode==='working'?(p.work==='working'?'업무에 집중 중':'다음 업무 대기'):resting?activityNames[p.activity]:'잠시 생각 중');
    if(a.activity.textContent!==activity){a.activity.textContent=activity;a.label.setAttribute('aria-label',`${a.name} · ${activity}`);container.dispatchEvent(new CustomEvent('office:activity',{detail:{id:p.id,text:activity,bubble:p.bubble}}));}
    if(a.previousBubble!==p.bubble){a.bubble.textContent=p.bubble;a.previousBubble=p.bubble;}
    const showBubble=resting&&(p.phase%9<5||p.id===selected);a.bubble.hidden=!showBubble;
    vector.copy(a.avatar.position).add(labelOffset);if(resting&&['massage','nap'].includes(p.activity))vector.z-=.9;if(resting&&p.activity==='dine')vector.z+=.85;positionLabel(a.label,vector);
    if(!a.avatar.visible||(floorView==='all'&&((p.position.floor||1)<0||(p.position.floor||1)===1&&p.position.z<10.5)))a.label.hidden=true;
  }
  function frame(time){
    raf=0;if(disposed||document.hidden||!hostVisible)return;
    const interval=1000/(interacting||flight.moving()?60:workingCount?30:24);if(time-lastFrame<interval){raf=requestAnimationFrame(frame);return;}
    const dt=Number.isFinite(lastFrame)?Math.min((time-lastFrame)/1000,.12):0;const cameraChanged=flight.enabled?flight.step(dt):controls.update();if(reducedMotion.matches)handoff=null;
    const targetRatio=flight.moving()?Math.min(pixelRatio,1.25):pixelRatio;
    if(renderer.getPixelRatio()!==targetRatio){renderer.setPixelRatio(targetRatio);dirty=true;}
    const animated=!reducedMotion.matches&&(environment==='outside'?exterior.active():workingCount>0||!!handoff||(ambientEnabled&&actors.size>0)||gameVisuals.active(floorView));if(!dirty&&!cameraChanged&&!animated&&!interacting)return;
    dirty=false;lastFrame=time;simulationTime+=dt;life.tick(dt);
    if(environment==='inside')for(const [id,a] of actors)animateActor(a,life.people.get(id),dt);
    gameVisuals.draw(simulationTime,environment==='outside'?'outside':floorView);exterior.tick(dt,!reducedMotion.matches);
    liftVisuals.update(life.elevator.snapshot(),floorView,positionLabel);
    for(const item of roomLabels){if(floorVisible(item.floor)&&floorView!=='all')positionLabel(item.label,item.point);else item.label.hidden=true;}
    packet.visible=false;if(handoff){const a=actors.get(handoff.from),b=actors.get(handoff.to),t=(simulationTime-handoff.start)/2.4;if(a&&b&&a.avatar.visible&&b.avatar.visible&&t<1){packet.visible=true;packet.position.lerpVectors(a.avatar.position,b.avatar.position,t);packet.position.y+=2+Math.sin(t*Math.PI);}else handoff=null;}
    for(const item of sectionLabels){if(environment==='inside'&&floorView==='all')positionLabel(item.label,item.point);else item.label.hidden=true;}camera.updateMatrixWorld();lighting.update(camera);renderer.render(scene,camera);renderedFloor=floorView;renderedEnvironment=environment;frames++;if(animated||cameraChanged||interacting||flight.moving())invalidate();
  }
  function focusRoom(id){setEnvironment('inside');flight.set(false);focusedRoom=id;const room=ROOMS.find(r=>r.id===id);if(!room){setFloor('all');}else{const y=floorElevation(room.floor||1);setFloor(String(room.floor||1),false);controls.target.set(room.x,y,room.z);camera.position.set(room.x+16,y+21,room.z+24);}controls.update();invalidate();}
  const resize=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();if(environment==='inside'&&floorView==='all'&&!flight.enabled)fitSectionCamera(camera,controls,container);invalidate();});resize.observe(container);lighting.configure(environment,floorView);invalidate();
  return {
    update,focusRoom,setFloor,selectFurniture,setEnvironment,focusOutside,
    updateGame(game,live=true){gameVisuals.update(game,live);invalidate();},
    focusGameEntity(floor,x,z){flight.set(false);setFloor(String(floor),false);const y=floorElevation(floor);controls.target.set(x,y,z);camera.position.set(x+12,y+18,z+20);controls.update();invalidate();},
    currentFloor(){return floorView;},currentRoom(){return focusedRoom;},
    setEditMode(value){if(value){setEnvironment('inside');flight.set(false);}cancelDrag();editMode=Boolean(value);editZones.visible=editMode;for(const zone of editZones.children)zone.visible=floorVisible(zone.userData.floor);selectFurniturePreview();invalidate();},
    focusFurniture(id){flight.set(false);selectFurniture(id);const item=furnitureItems.find(f=>f.id===id);if(item){setFloor(String(item.floor),false);const y=floorElevation(item.floor);controls.target.set(item.x,y,item.z);camera.position.set(item.x+12,y+18,item.z+20);controls.update();invalidate();}},
    projectPoint(x,y,z){const v=new THREE.Vector3(x,y,z).project(camera);return {x:(v.x*.5+.5)*width,y:(-v.y*.5+.5)*height};},
    setVisible(value){hostVisible=value;visibility();},
    setAmbientEnabled(value){ambientEnabled=Boolean(value);life.setEnabled(ambientEnabled&&!reducedMotion.matches);try{localStorage.setItem('pixelOffice.ambient',value?'on':'off');}catch{}invalidate();return ambientEnabled;},
    stats(){return {renderedFloor,renderedEnvironment,lighting:lighting.stats(),visibleFloors:FLOOR_IDS.filter(f=>environment==='inside'&&(f===1?room.visible:f===2?upper.visible:f===-1?basement.visible:f>2?highFloors[f].visible:deepFloors[f].visible)),colorInstancing:true,environment,exterior:exterior.stats(),renderPixelRatio:renderer.getPixelRatio(),staticMatrices:true,cameraMode:flight.enabled?'free':'orbit',cameraPosition:camera.position.toArray(),cameraDirection:camera.getWorldDirection(new THREE.Vector3()).toArray(),frames,drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries,triangles:renderer.info.render.triangles,surfaceDetail:true,carvedEdges:true,architecture:map.architecture,game:gameVisuals.stats(),basementBounds:BASEMENT_BOUNDS,elevator:life.elevator.snapshot(),pixelRatio,shadowSize:2048,workingCount,ambientEnabled,floor:floorView,editing:editMode,selectedFurniture,furniture:furnitureItems.map(f=>({...f,screen:this.projectPoint(f.x,(floorElevation(f.floor))+.65,f.z)})),reducedMotion:reducedMotion.matches,paused:document.hidden||!hostVisible,rooms:ROOMS.map(r=>r.id),characters:[...actors].map(([id,a])=>({id,appearance:a.appearance,gear:{helmet:a.mineHelmet.visible,pickaxe:a.pickaxe.visible,tray:a.mealTray.visible}})),people:life.snapshot()};},
    reset(){if(environment==='outside'){focusOutside();return;}setFloor(floorView);},zoom(delta){if(flight.enabled){camera.getWorldDirection(vector);camera.position.addScaledVector(vector,delta<1?2:-2);invalidate();return;}camera.position.sub(controls.target).multiplyScalar(delta).add(controls.target);invalidate();},
    dispose(){disposed=true;cancelDrag();cancelAnimationFrame(raf);resize.disconnect();document.removeEventListener('visibilitychange',visibility);reducedMotion.removeEventListener('change',motionPreference);renderer.domElement.removeEventListener('pointerdown',pointerDown,true);renderer.domElement.removeEventListener('pointermove',pointerMove);renderer.domElement.removeEventListener('pointerup',pointerUp,true);renderer.domElement.removeEventListener('pointercancel',cancelDrag);freeButton?.removeEventListener('click',toggleFlight);flight.dispose();environmentButtons.forEach(button=>button.removeEventListener('click',environmentClick));outsideFocusButtons.forEach(button=>button.removeEventListener('click',outsideFocus));trafficButton?.removeEventListener('click',trafficToggle);controls.dispose();lightingPanel.dispose();lighting.dispose();liftVisuals.dispose();gameVisuals.dispose();exterior.dispose();scene.traverse(m=>{if(m.isInstancedMesh)m.dispose();});detailGeometry.dispose();for(const g of [ringGeometry,shadowGeometry])g.dispose();ringMaterial.dispose();shadowMaterial.dispose();zoneMaterial.dispose();previewMaterial.dispose();for(const m of materials.values())m.dispose();sun.shadow.map?.dispose();renderer.dispose();labelLayer.remove();renderer.domElement.remove();}
  };
}
