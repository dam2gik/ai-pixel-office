import * as THREE from 'three';
import {SITE_BOUNDS,PARKING_SLOTS,TRAFFIC_COUNT,trafficPosition} from './exterior-layout.js';

export function createExterior({scene,box,batchStatic}){
  const root=new THREE.Group(),site=new THREE.Group(),shell=new THREE.Group(),traffic=new THREE.Group();scene.add(root);root.add(site,shell,traffic);root.visible=false;
  const stone='#c7cbbc',wood='#aa7954',frame='#586d67',grass='#a2b38b',paint='#e9e5cd',asphalt='#606b69';
  const b=(parent,x,y,z,w,h,d,color,kind)=>box(parent,x,y,z,w,h,d,color,kind);
  const s=(...args)=>b(site,...args),f=(...args)=>b(shell,...args);
  const features={parkingSpaces:PARKING_SLOTS.length,parkedCars:0,trees:0,benches:0,streetlights:0,roads:4,busStops:1,bikeRacks:1};
  s(0,-.82,4,180,.6,152,grass,'earth');
  // The loop is wide enough for two separate lanes, with curb-separated walks.
  for(const z of [-48,57]){s(0,-.43,z,148,.16,10,asphalt,'earth');s(0,-.37,z+(z<0?7:-7),137,.24,3,stone,'stone');for(let x=-57;x<59;x+=8)s(x,-.335,z,3,.025,.14,paint);}
  for(const x of [-69,69]){s(x,-.43,4.5,10,.16,115,asphalt,'earth');s(x+(x<0?7:-7),-.37,4.5,3,.24,99,stone,'stone');for(let z=-36;z<46;z+=8)s(x,-.335,z,.14,.025,3,paint);}
  // Crosswalks and traffic islands stay outside the vehicles' curved corners.
  for(const x of [-45,44])for(let i=0;i<9;i++)s(x-3+i*.75,-.325,57,.4,.03,8.8,'#e4e7da');
  for(const z of [-23,24])for(let i=0;i<9;i++)s(69,-.325,z-3+i*.75,8.8,.03,.4,'#e4e7da');
  s(-45,-.39,37,6,.19,31,asphalt,'earth');s(-45,-.39,3,30,.19,45,asphalt,'earth');
  for(const p of PARKING_SLOTS){for(const dx of [-1.4,1.4])s(p.x+dx,-.275,p.z,.07,.025,5.3,paint);s(p.x,-.275,p.z-2.65,2.8,.025,.07,paint);s(p.x,-.11,p.z-1.9,1.7,.2,.18,'#c5c8b7');}
  for(const z of [-20,27]){s(-45,-.22,z,31,.4,1.6,stone,'stone');for(const x of [-58,-32])s(x,.27,z,2.5,.55,1.5,'#79916e','leaf');}
  // Dedicated EV charging, entry barrier, and a tiny security cabin.
  for(const x of [-56,-50]){s(x,-.265,-15,2.6,.035,4.8,'#6d938a');s(x,.8,-18.9,.45,1.8,.35,frame);s(x,.95,-18.68,.3,.6,.04,'#9bc3be');}
  s(-50,.65,32,2.6,2,2.6,'#c7d3c5');s(-50,1,33.32,2.15,.85,.04,'#617e82');s(-50,1.75,32,3,.15,3,frame);s(-48.3,.4,31.4,.25,1.4,.25,frame);s(-45.4,1.1,31.4,5.7,.12,.12,'#ddc49b');for(let i=0;i<6;i++)s(-47.8+i,.1+1,31.32,.35,.14,.05,'#b37b65');
  // Broad entrance plaza links the original garden to the public sidewalk.
  s(-2,-.3,35.5,40,.3,15,'#d6d8c7','stone');s(-2,-.12,29,12,.12,2,'#dedecd','stone');
  for(const x of [-7,3])for(let z=30;z<42;z+=3)s(x,.2,z,.18,.65,.18,frame);
  function tree(x,z,size=1){features.trees++;s(x,1.25*size,z,.4*size,2.8*size,.4*size,'#8a765b','wood');for(let layer=0;layer<3;layer++)for(let j=0;j<9;j++){const angle=j*2.4,rad=(.4+(j%3)*.27)*size;s(x+Math.cos(angle)*rad,(2.5+layer*.55+(j%2)*.17)*size,z+Math.sin(angle)*rad,(.8+(j%2)*.25)*size,.75*size,.8*size,['#708e69','#86a077','#99b185'][(layer+j)%3],'leaf');}}
  function bench(x,z,angle=0){features.benches++;const g=new THREE.Group();site.add(g);g.position.set(x,0,z);g.rotation.y=angle;for(let j=0;j<4;j++)b(g,0,.3,-.32+j*.2,2.5,.12,.16,wood,'wood');for(let j=0;j<3;j++)b(g,0,.55+j*.21,-.4,2.5,.17,.12,wood,'wood');for(const dx of [-.9,.9])b(g,dx,.02,0,.12,.55,.7,frame);}
  function lamp(x,z){features.streetlights++;s(x,1.7,z,.12,4.3,.12,frame);s(x,3.85,z+.4,.14,.12,.85,frame);s(x,3.78,z+.7,.55,.09,.38,'#eee0b1','lamp');s(x,-.1,z,.5,.3,.5,stone);}
  for(const x of [-61,61])for(const z of [-32,-10,12,34])lamp(x,z);
  for(const z of [-40,49])for(const x of [-47,-21,9,35])lamp(x,z);
  // The park has winding stepping stones, a pond, trees, pavilion and play area.
  s(44,-.35,5,31,.32,53,'#91ab82','earth');
  for(let i=0;i<44;i++){const z=-20+i*1.15,x=44+Math.sin(i*.16)*5;s(x,-.13,z,3,.12,1.25,'#d5d4bc','stone');}
  s(36,-.12,6,10,.28,8,stone,'rock');s(36,.04,6,8.8,.08,6.8,'#86b3b4','water');
  for(let i=0;i<22;i++){const angle=i*Math.PI/11;s(36+Math.cos(angle)*4.7,.16,6+Math.sin(angle)*3.7,.65,.33+(i%3)*.12,.65,'#a9afa4','rock');}
  for(let i=0;i<5;i++){s(33+i*.8,.13,6+(i%2)*1.3,.5,.05,.55,'#688b68','leaf');s(33+i*.8,.23,6+(i%2)*1.3,.13,.13,.13,'#d7a4b5');}
  for(const [x,z,size] of [[32,-18,1.3],[54,-17,1.4],[55,-7,1],[57,5,1.2],[53,17,1.4],[34,20,1],[31,28,1.3],[56,28,1.2],[-59,-31,1],[-46,-32,1.3],[-31,-32,1],[-13,-31,1.3],[2,-32,1.2],[17,-32,1.4],[-79,-15,1.2],[-80,12,1.4],[-78,37,1.2],[79,-31,1.3],[80,4,1.2],[79,38,1.5],[-25,38,1],[20,38,1.2]])tree(x,z,size);
  for(const [x,z,a] of [[47,15,Math.PI/2],[35,14,0],[48,-15,Math.PI],[36,27,0],[-17,36,0],[12,36,0]])bench(x,z,a);
  for(const x of [47,53])for(const z of [-7,-1])s(x,1.3,z,.2,3,.2,wood,'wood');
  s(50,2.9,-4,7,.25,7,wood,'wood');for(let i=0;i<9;i++)s(46.7+i*.82,3.12,-4,.65,.16,7.5,'#c2b18b','wood');s(50,.45,-4,3,.12,2,wood,'wood');
  // A fenced small sports court, plus a café kiosk at the park entrance.
  s(43,-.23,-31,24,.16,13,'#829b8c');for(const x of [32,54])s(x,-.125,-31,.09,.03,11,paint);for(const z of [-36.5,-25.5])s(43,-.125,z,22,.03,.09,paint);s(43,-.125,-31,.09,.03,11,paint);
  for(const x of [31,55])for(let z=-37;z<=-25;z+=3)s(x,.8,z,.07,2,.07,frame);for(const x of [33,53]){s(x,1.5,-31,.1,3.5,.1,frame);s(x,2.8,-31,1.5,.9,.08,'#d8d8c8');s(x+(x<43?.6:-.6),2.45,-31,.6,.06,.6,'#a66f50');}
  s(31,.75,36,5,2.5,4,'#b4b9a7');s(31,2.1,36,5.7,.2,4.8,frame);s(31,1.1,38.05,3.8,1.2,.07,'#496a6a');s(31,.6,38.45,4.2,.14,.65,wood,'wood');for(let i=0;i<7;i++)s(28.6+i*.8,1.9,38.6,.4,.2,1.3,i%2?'#d8c9a7':'#6f8c76');
  // Bus shelter, bicycles, bins, utility cabinets and roadside furnishings.
  for(const x of [43,51])s(x,1.2,45,.12,3,.12,frame);s(47,2.75,45,9,.18,3.7,frame);s(47,1.2,43.5,8,2.8,.07,'#91b4b4','glass');bench(47,44.5);s(53,1.5,44,.13,3.8,.13,frame);s(53,3,44,1,.9,.1,'#789993');
  for(let i=0;i<7;i++){const x=-27+i*1.2;for(const dx of [-.35,.35])s(x+dx,.3,35,.06,1.15,.06,frame);s(x,.87,35,.75,.06,.06,frame);if(i%2===0){for(const z of [34.5,35.6])s(x,.2,z,.09,.55,.55,'#4b5f59');s(x,.55,35,.08,.08,1.3,['#b27c69','#7899a0'][i%2]);s(x,.7,35.4,.55,.07,.1,frame);}}
  for(const [x,z] of [[24,37],[55,20],[-30,27],[-15,42],[56,-20]]){s(x,.22,z,.65,1.15,.65,frame);s(x,.83,z,.72,.1,.72,'#a7b49b');}
  for(const [x,z] of [[-58,29],[60,41],[-58,-38],[60,-37]]){s(x,1.35,z,.13,3.4,.13,frame);s(x,2.4,z,.48,1.1,.28,'#405650');for(let i=0;i<3;i++)s(x,2.75-i*.32,z+.16,.18,.18,.025,['#bd8170','#c9ac70','#9fc39b'][i],'lamp');}
  for(const [x,z] of [[-27,-27],[-24,-27],[22,-27]]){s(x,.55,z,1.8,1.7,1,'#a4afa0');s(x,.55,z+.52,1.5,1.3,.035,'#899688');}
  for(let i=0;i<8;i++){const x=-58+i*3;s(x,-.1,40,.55,.12,.55,'#d4b77f');s(x,.24,40,.25,.6,.25,'#b88160');}
  // Opaque reflective panes enclose the five-floor building in exterior mode.
  f(-2,14.3,1,40.8,28.6,26.4,'#d9d8c9','plaster');
  for(const y of [2.6,8.6,14.6,20.6,26.6])for(let i=0;i<10;i++){
    const x=-20+i*4;
    for(const z of [-12.23,14.23]){f(x,y,z,3.3,2.8,.12,'#74989c','glazing');f(x,y+.85,z+.08,3.15,.09,.04,'#abc6c5');for(const dx of [-1.7,0,1.7])f(x+dx,y,z+.1,.07,2.95,.12,frame);}
  }
  for(const x of [-22.45,18.45])for(const y of [2.6,8.6,14.6,20.6,26.6])for(let i=0;i<6;i++){const z=-10+i*4;f(x,y,z,.12,2.8,3.15,'#74989c','glazing');for(const dz of [-1.65,0,1.65])f(x+.08,y,z+dz,.1,2.95,.07,frame);}
  for(const y of [.3,5.5,11.5,17.5,23.5,28.6]){f(-2,y,1,41.8,.35,27.5,'#bfc5b7','stone');}
  // Timber screen gives the stair tower a distinct vertical expression.
  for(let i=0;i<15;i++)f(-21.7+i*.29,14.5,14.5,.15,28.2,.22,wood,'wood');
  f(-2,1.6,14.45,4.5,3.3,.3,frame);for(const x of [-3.05,-.95]){f(x,1.6,14.63,1.98,3.05,.1,'#729c9d','glazing');f(x+(x<-2?.65:-.65),1.5,14.71,.055,.55,.05,'#d5ddd2');}
  f(-2,3.65,15.5,8,.35,3.6,frame);f(-2,3.4,15.4,6,.08,2.8,'#e8d9b0','lamp');for(const x of [-5.6,1.6])f(x,1.5,16.7,.12,3.6,.12,frame);f(-2,.05,15.5,9,.2,4,'#dedecd','marble');
  const roof=new THREE.Group();roof.position.y=18;shell.add(roof);const r=(...args)=>b(roof,...args);
  r(-2,10.95,1,42.3,.3,28.1,'#687d75');
  for(const x of [-22.8,18.8])r(x,11.35,1,.3,.65,28.7,stone,'stone');for(const z of [-13.2,15.2])r(-2,11.35,z,42,.65,.3,stone,'stone');
  // Roof equipment sits behind a low parapet and stays visible from above.
  for(let row=0;row<2;row++)for(let col=0;col<5;col++){const x=-14+col*5,z=-7+row*5;r(x,11.3,z,4.4,.18,3.4,'#3f606c');for(let i=0;i<4;i++)r(x-1.7+i*1.1,11.405,z,.04,.025,3.2,'#9bb7b7');}
  for(const x of [11,15]){r(x,11.65,-5,2.5,1.2,3.2,'#a8b3a7');for(let i=0;i<6;i++)r(x-1+i*.4,12.27,-5,.18,.04,2.6,frame);}
  r(12,11.85,7,8,1.7,6,'#b9c1b2');r(12,12.75,7,8.4,.15,6.4,frame);r(12,11.75,10.05,1.7,1.5,.08,frame);
  // A sign uses a small canvas texture, not hundreds of tiny meshes.
  const signCanvas=document.createElement('canvas');signCanvas.width=1024;signCanvas.height=160;const ctx=signCanvas.getContext('2d');ctx.fillStyle='#edf0df';ctx.fillRect(0,0,1024,160);ctx.fillStyle='#49634f';ctx.font='600 80px sans-serif';ctx.textAlign='center';ctx.fillText('PIXEL OFFICE',512,108);
  const signTexture=new THREE.CanvasTexture(signCanvas);signTexture.colorSpace=THREE.SRGBColorSpace;const signMaterial=new THREE.MeshBasicMaterial({map:signTexture}),signGeometry=new THREE.PlaneGeometry(10,1.55),sign=new THREE.Mesh(signGeometry,signMaterial);sign.position.set(-2,5.02,14.44);shell.add(sign);
  const palette=['#9e7464','#d6d2bc','#658f95','#859775','#c4a26c','#78869b'];
  function paintCar(draw,color,van=false){draw(0,.36,0,1.72,.5,3.65,color);draw(0,.82,-.15,1.48,.68,van?2.8:1.9,color);draw(0,1.18,-.18,1.5,.12,van?2.85:1.95,color);draw(0,.89,van?1.28:.82,1.3,.45,.045,'#526e77');draw(0,.88,van?-1.58:-1.12,1.3,.42,.045,'#526e77');for(const x of [-.76,.76]){draw(x,.89,-.15,.045,.43,van?2.3:1.55,'#526e77');draw(x,.89,-.15,.06,.47,.07,color);for(const z of [-1.12,1.12])draw(x*1.13,.1,z,.22,.55,.65,'#394844');}for(const x of [-.52,.52]){draw(x,.4,1.85,.45,.16,.05,'#eee4bd');draw(x,.4,-1.85,.4,.15,.05,'#b97c68');}draw(0,.18,1.87,.7,.12,.04,'#d8dfcf');}
  for(const [i,p] of PARKING_SLOTS.entries())if(p.occupied){features.parkedCars++;const car=new THREE.Group();site.add(car);car.position.set(p.x,-.12,p.z);car.rotation.y=i%2?Math.PI:0;paintCar((...args)=>b(car,...args),palette[i%palette.length],i%7===0);}
  s(31,1.9,38.6,3.8,.06,.2,'#f5dfac','lamp');s(50,2.8,-4,2.3,.07,.25,'#f5dfac','lamp');batchStatic(site);batchStatic(shell);
  const pools=new Map(),templates=[],scratch=new THREE.Group(),matrix=new THREE.Matrix4(),pose=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0),position=new THREE.Vector3(),scale=new THREE.Vector3(1,1,1);
  for(let i=0;i<TRAFFIC_COUNT;i++){const template=[];paintCar((x,y,z,w,h,d,color)=>{const mesh=b(scratch,x,y,z,w,h,d,color);mesh.removeFromParent();const key=mesh.geometry.uuid+'|'+mesh.material.uuid;if(!pools.has(key)){const batch=new THREE.InstancedMesh(mesh.geometry,mesh.material,TRAFFIC_COUNT*20);batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);batch.castShadow=false;batch.receiveShadow=true;batch.frustumCulled=false;traffic.add(batch);pools.set(key,{mesh:batch,count:0});}const local=new THREE.Matrix4().makeScale(w,h,d);local.setPosition(x,y,z);template.push({pool:pools.get(key),local});},palette[i%palette.length],i%5===0);templates.push(template);}
  let trafficTime=0,trafficEnabled=true,visible=false;const poses=[];
  function draw(){for(const pool of pools.values())pool.count=0;for(let i=0;i<TRAFFIC_COUNT;i++){const p=trafficPosition(i,trafficTime);poses[i]=p;pose.compose(position.set(p.x,-.22,p.z),q.setFromAxisAngle(up,p.yaw),scale);for(const item of templates[i]){matrix.multiplyMatrices(pose,item.local);item.pool.mesh.setMatrixAt(item.pool.count++,matrix);}}for(const pool of pools.values()){pool.mesh.count=pool.count;pool.mesh.instanceMatrix.clearUpdateRanges();pool.mesh.instanceMatrix.addUpdateRange(0,pool.count*16);pool.mesh.instanceMatrix.needsUpdate=true;}}
  draw();
  return {
    setVisible(value){visible=value;root.visible=value;},
    setTraffic(value){trafficEnabled=value;},
    active(){return visible&&trafficEnabled;},
    tick(dt,animate){if(visible&&trafficEnabled&&animate){trafficTime+=dt;draw();}},
    stats(){return {buildingFloors:5,visible,trafficEnabled,trafficTime,trafficCount:TRAFFIC_COUNT,trafficPools:pools.size,bounds:SITE_BOUNDS,...features,cars:poses.map(p=>({...p}))};},
    dispose(){root.removeFromParent();root.traverse(m=>{if(m.isInstancedMesh)m.dispose();});signGeometry.dispose();signMaterial.dispose();signTexture.dispose();}
  };
}
