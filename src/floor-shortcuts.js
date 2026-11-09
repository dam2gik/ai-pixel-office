import {FLOOR_IDS} from './floors.js';

export function createFloorShortcuts({getWorld}){
  let lastFloor=1;
  const host=document.querySelector('#world'),bar=document.querySelector('.floor-switch');
  const hint=document.createElement('span');hint.className='floor-key-hint';hint.textContent='Q ↑ · E ↓';hint.title='Q: 윗층 · E: 아랫층';bar.append(hint);bar.setAttribute('aria-keyshortcuts','Q E');
  function remember(event){const floor=Number(event.detail.floor);if(FLOOR_IDS.includes(floor))lastFloor=floor;}
  function keydown(event){
    if(!['KeyQ','KeyE'].includes(event.code)||event.defaultPrevented||event.repeat||event.isComposing||event.ctrlKey||event.metaKey||event.altKey)return;
    if(document.querySelector('dialog[open]')||event.target?.closest?.('input,textarea,select')||event.target?.isContentEditable||document.activeElement?.isContentEditable)return;
    const world=getWorld();if(!world)return;const current=Number(world.currentFloor()),base=FLOOR_IDS.includes(current)?current:lastFloor,index=FLOOR_IDS.indexOf(base),next=index+(event.code==='KeyQ'?1:-1);
    event.preventDefault();event.stopImmediatePropagation();if(next>=0&&next<FLOOR_IDS.length)world.setFloor(String(FLOOR_IDS[next]));
  }
  host.addEventListener('office:floor',remember);document.addEventListener('keydown',keydown,true);
  return {dispose(){host.removeEventListener('office:floor',remember);document.removeEventListener('keydown',keydown,true);hint.remove();}};
}
