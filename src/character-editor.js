import * as THREE from 'three';
import {createDetailGeometry} from './detail-geometry.js';
import {detailedMaterial} from './surface-materials.js';
import catalog from '../electron/appearance.json';
import {appearanceFor,characterPortrait,paintCharacter} from './character-visuals.js';
export function openCharacterEditor({agent,index,api,modal,esc,onState,notify}){
  const original=appearanceFor(agent,index);let draft={...original},angle=0,disposed=false,renderer,resize;
  const select=(name,label,items)=>`<label>${label}<select name="${name}">${Object.entries(items).map(([value,text])=>`<option value="${value}" ${draft[name]===value?'selected':''}>${esc(text)}</option>`).join('')}</select></label>`;
  modal(`${esc(agent.name)}의 캐릭터 꾸미기`,'미리보기를 확인한 뒤 저장하면 사무실에 반영됩니다.',`<div class="character-editor"><div class="character-stage"><div id="characterPreview" role="img" aria-label="캐릭터 3D 미리보기"></div><div class="character-preview-actions"><button type="button" id="turnCharacter">↻ 각도 돌리기</button><button type="button" id="randomCharacter">랜덤 스타일</button></div><p>미리보기 · 아직 저장하지 않은 외형</p></div><form id="appearanceForm"><div class="character-selects">${select('hairStyle','헤어스타일',catalog.hairStyles)}${select('outfit','의상 스타일',catalog.outfits)}${select('accessory','액세서리',catalog.accessories)}</div><div class="character-colors">${Object.entries(catalog.colors).map(([key,label])=>`<label><span>${label}</span><input name="${key}" type="color" value="${draft[key]}" aria-label="${label}"></label>`).join('')}</div><p class="character-editor-note">외형을 바꿔도 직원의 역할·업무와 이동 상태는 유지됩니다.</p><div class="character-save-actions"><button type="button" id="resetCharacter" class="button secondary">원래대로</button><button type="submit" id="saveCharacter" class="button primary">외형 저장</button></div></form></div>`);
  const dialog=document.querySelector('#modal'),form=document.querySelector('#appearanceForm'),container=document.querySelector('#characterPreview');dialog.classList.add('character-dialog');
  form.querySelector('.character-save-actions').insertAdjacentHTML('afterbegin','<button type="button" id="cancelCharacter" class="button secondary">취소</button>');document.querySelector('#cancelCharacter').onclick=()=>dialog.close();
  const scene=new THREE.Scene();scene.background=new THREE.Color('#e8eddf');
  const camera=new THREE.OrthographicCamera(-1.3,1.3,1.3,-1.3,.1,30);camera.position.set(3,2.1,5);camera.lookAt(0,.95,0);
  const geometry=createDetailGeometry(),root=new THREE.Group(),materials=new Map();scene.add(root);
  scene.add(new THREE.HemisphereLight(0xffffff,0x8c9c80,2));const sun=new THREE.DirectionalLight(0xfff8ec,2.7);sun.position.set(-3,6,5);scene.add(sun);
  const shadowGeometry=new THREE.CircleGeometry(.5,32),shadowMaterial=new THREE.MeshBasicMaterial({color:'#99ab88',transparent:true,opacity:.3,depthWrite:false}),shadow=new THREE.Mesh(shadowGeometry,shadowMaterial);shadow.rotation.x=-Math.PI/2;shadow.position.y=-.015;scene.add(shadow);
  function box(parent,x,y,z,w,h,d,color,kind){const key=color+'|'+(kind||'auto');if(!materials.has(key))materials.set(key,detailedMaterial(color,{kind}));const mesh=new THREE.Mesh(geometry.forBox(w,h,d),materials.get(key));mesh.position.set(x,y,z);mesh.scale.set(w,h,d);parent.add(mesh);}
  function part(parent,x=0,y=0,z=0){const group=new THREE.Group();group.position.set(x,y,z);parent.add(group);return group;}
  function draw(){
    if(disposed)return;
    if(!renderer){container.innerHTML=characterPortrait({...agent,appearance:draft},false,index);return;}
    root.clear();for(const material of materials.values())material.dispose();materials.clear();
    const parts={body:part(root),head:part(root,0,1.23),left:part(root,-.37,.97),right:part(root,.37,.97),legL:part(root,-.15,.43),legR:part(root,.15,.43)};
    paintCharacter(parts,draft,box);root.rotation.y=angle;renderer.render(scene,camera);
  }
  try{renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(Math.max(devicePixelRatio,1.5),2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;container.append(renderer.domElement);resize=new ResizeObserver(()=>{if(disposed)return;const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h);camera.left=-1.3*w/h;camera.right=1.3*w/h;camera.updateProjectionMatrix();draw();});resize.observe(container);}catch{renderer?.dispose();renderer=null;}
  function setForm(){for(const [key,value] of Object.entries(draft))if(form.elements.namedItem(key))form.elements.namedItem(key).value=value;draw();}
  form.oninput=()=>{draft={...draft,...Object.fromEntries(new FormData(form))};draw();};
  document.querySelector('#turnCharacter').onclick=()=>{angle+=Math.PI/4;draw();};
  document.querySelector('#resetCharacter').onclick=()=>{draft={...original};setForm();};
  document.querySelector('#randomCharacter').onclick=()=>{const pick=items=>items[Math.floor(Math.random()*items.length)];draft={hairStyle:pick(Object.keys(catalog.hairStyles)),outfit:pick(Object.keys(catalog.outfits)),accessory:pick(Object.keys(catalog.accessories)),hairColor:pick(['#493e38','#80634c','#b88c52','#c9bda7','#a5b9b3']),skinColor:pick(['#edc6a3','#d9aa83','#b77d59','#8f6049','#f2d8bd']),shirtColor:pick(['#82b7ee','#b3a1ef','#e9a783','#9fc99a','#d29cae']),pantsColor:pick(['#43546a','#68765c','#7a6664','#b4ad94']),shoeColor:pick(['#f4eee2','#536256','#a8947c'])};setForm();};
  form.onsubmit=async event=>{
    event.preventDefault();const desired={...draft};for(const field of form.querySelectorAll('input,select,button'))field.disabled=true;
    try{await api.updateAppearance(agent.id,desired);const loaded=await api.get();onState(loaded.state);if(dialog.contains(form))dialog.close();notify(`${agent.name}의 외형을 저장했습니다.`);}
    catch(e){notify(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''));for(const field of form.querySelectorAll('input,select,button'))field.disabled=false;}
  };
  function dispose(){if(disposed)return;disposed=true;resize?.disconnect();renderer?.dispose();renderer?.forceContextLoss();geometry.dispose();shadowGeometry.dispose();shadowMaterial.dispose();for(const material of materials.values())material.dispose();dialog.classList.remove('character-dialog');}
  dialog.addEventListener('close',dispose,{once:true});draw();
}
