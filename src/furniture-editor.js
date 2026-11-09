import {FLOOR_IDS,FLOOR_NAMES} from './floors.js';
import layout from '../electron/furniture-layout.json';
export function createFurnitureEditor({api,getState,onState,getWorld,closePanels,esc,notify}){
  const panel=document.createElement('aside');panel.className='furniture-editor floating-panel';panel.hidden=true;panel.setAttribute('aria-label','가구 배치 편집');document.querySelector('.game-world').append(panel);
  const floorOptions=selected=>[1,2,3,4,5,-1,-2,-3,-4,-5,-6].map(f=>`<option value="${f}" ${f===selected?'selected':''}>${FLOOR_NAMES[f]}</option>`).join('');
  let selected=null,addFloor=1,addArea='lobby',working=false,lastSignature='';
  async function mutate(fn){if(working)return;working=true;try{const result=await fn();const loaded=await api.get();onState(loaded.state);return result;}catch(e){notify(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}finally{working=false;render();}}
  function select(id,focus=false){selected=id;const item=getState().furniture.find(f=>f.id===id);if(item)addFloor=item.floor;getWorld()?.selectFurniture(id);if(focus)getWorld()?.focusFurniture(id);render();}
  async function move(id,patch){return mutate(()=>api.moveFurniture(id,patch));}
  function close(){panel.hidden=true;document.body.classList.remove('editing-office');getWorld()?.setEditMode(false);}
  function open(){closePanels();addFloor=FLOOR_IDS.includes(Number(getWorld()?.currentFloor()))?Number(getWorld().currentFloor()):1;addArea=getWorld()?.currentRoom()==='garden'?'garden':addFloor===-4?'mine-deep-lobby':addFloor===-3?'mine-lobby':addFloor===-2?'canteen-lobby':addFloor===-1?'basement-lobby':addFloor===2?'sky':'lobby';panel.hidden=false;lastSignature='';document.body.classList.add('editing-office');getWorld()?.setEditMode(true);render();}
  function render(){
    if(panel.hidden)return;
    const items=getState().furniture,item=items.find(f=>f.id===selected);if(!item)selected=null;
    if(!layout.zones.some(z=>z.id===addArea&&z.floor===addFloor))addArea=layout.zones.find(z=>z.floor===addFloor).id;
    const signature=JSON.stringify([items,selected,addFloor,addArea,working]);if(signature===lastSignature)return;lastSignature=signature;
    panel.innerHTML=`<div class="editor-heading"><div><small>OFFICE CUSTOMIZER</small><h2>나만의 오피스</h2></div><button class="icon-button" id="closeFurnitureEditor" aria-label="배치 편집 닫기">×</button></div><p class="editor-help">가구를 클릭하고 드래그해 이동하세요. 초록 영역에 배치할 수 있으며 변경 사항은 자동 저장됩니다.</p><label class="editor-floor-label">편집할 층<select id="addFurnitureFloor">${floorOptions(addFloor)}</select></label><div class="furniture-palette">${Object.entries(layout.types).map(([type,spec])=>`<button data-furniture="${type}" ${working?'disabled':''}><span>${spec.icon||({plant:'♧',bookshelf:'▤',sofa:'▰',bench:'▱',table:'⊞',planter:'✿'})[type]||'?'}</span>${esc(spec.name)}</button>`).join('')}</div><div class="editor-section-title">배치한 가구 <span>${items.length} / ${layout.limit}</span></div><div class="furniture-inventory">${items.filter(f=>f.floor===addFloor).map(f=>`<button data-furniture-id="${f.id}" class="${f.id===selected?'selected':''}"><span>${esc(layout.types[f.type].name)}</span><small>${f.x}, ${f.z} · ${f.rotation}°</small></button>`).join('')||'<p class="editor-empty">이 층에 가구를 추가해 보세요.</p>'}</div>${item?`<section class="furniture-properties"><strong>${esc(layout.types[item.type].name)}</strong><label>층 이동<select id="furnitureFloor">${floorOptions(item.floor)}</select></label><div class="furniture-coordinates"><label>X<input id="furnitureX" type="number" step="0.5" value="${item.x}"></label><label>Z<input id="furnitureZ" type="number" step="0.5" value="${item.z}"></label><button id="applyFurniturePosition">이동</button></div><div class="furniture-nudge"><button data-dz="-0.5" aria-label="가구 뒤로 이동">↑</button><button data-dx="-0.5" aria-label="가구 왼쪽으로 이동">←</button><button data-dz="0.5" aria-label="가구 앞으로 이동">↓</button><button data-dx="0.5" aria-label="가구 오른쪽으로 이동">→</button></div><div class="furniture-actions"><button id="rotateFurniture">↻ 90° 회전</button><button id="deleteFurniture">가구 삭제</button></div></section>`:'<p class="editor-empty">가구를 선택하면 이동·회전·삭제할 수 있습니다.</p>'}<p class="editor-footnote">계단·출입구·주요 통로와 고정 시설은 보호됩니다.</p>`;
    panel.querySelector('#closeFurnitureEditor').onclick=close;
    panel.querySelector('.editor-floor-label').insertAdjacentHTML('afterend',`<label class="editor-floor-label" style="margin-top:8px">추가 위치<select id="addFurnitureArea">${layout.zones.filter(z=>z.floor===addFloor).map(z=>`<option value="${z.id}" ${z.id===addArea?'selected':''}>${esc(z.name)}</option>`).join('')}</select></label>`);
    panel.querySelector('#addFurnitureArea').onchange=e=>{addArea=e.target.value;render();};
    panel.querySelector('#addFurnitureFloor').onchange=e=>{addFloor=Number(e.target.value);selected=null;getWorld()?.selectFurniture(null);getWorld()?.setFloor(String(addFloor));render();};
    panel.querySelectorAll('[data-furniture]').forEach(b=>b.onclick=()=>mutate(async()=>{const id=await api.furniture({type:b.dataset.furniture,floor:addFloor,area:addArea});selected=id;return id;}).then(()=>{if(selected)select(selected,true);}));
    panel.querySelectorAll('[data-furniture-id]').forEach(b=>b.onclick=()=>select(b.dataset.furnitureId,true));
    if(item){
      panel.querySelector('#furnitureFloor').onchange=e=>move(item.id,{floor:Number(e.target.value)}).then(()=>select(item.id,true));
      panel.querySelector('#applyFurniturePosition').onclick=()=>move(item.id,{x:Number(panel.querySelector('#furnitureX').value),z:Number(panel.querySelector('#furnitureZ').value)});
      panel.querySelectorAll('[data-dx],[data-dz]').forEach(b=>b.onclick=()=>move(item.id,{x:item.x+Number(b.dataset.dx||0),z:item.z+Number(b.dataset.dz||0)}));
      panel.querySelector('#rotateFurniture').onclick=()=>move(item.id,{rotation:(item.rotation+90)%360});
      panel.querySelector('#deleteFurniture').onclick=()=>mutate(async()=>{await api.removeFurniture(item.id);selected=null;getWorld()?.selectFurniture(null);});
    }
  }
  document.addEventListener('keydown',e=>{if(!panel.hidden&&e.key==='Delete'&&selected&&!e.target.closest('input,textarea,select')){e.preventDefault();mutate(async()=>{await api.removeFurniture(selected);selected=null;getWorld()?.selectFurniture(null);});}});
  return {open,close,render,select,move,syncFloor(floor){if(panel.hidden||floor==='all')return;addFloor=Number(floor);if(getState().furniture.find(f=>f.id===selected)?.floor!==addFloor)selected=null;render();},isOpen:()=>!panel.hidden};
}
