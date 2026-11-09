import C from '../electron/game-catalog.json';
import {FLOOR_IDS,FLOOR_NAMES,floorLabel} from './floors.js';
export function createGamePanel({api,getWorld,closePanels,esc,notify,onGame}){
  const host=document.querySelector('.game-world'),badge=document.createElement('button'),panel=document.createElement('aside');
  badge.id='gameShopButton';badge.className='game-shop-button';panel.id='gamePanel';panel.className='game-panel floating-panel';panel.hidden=true;panel.setAttribute('aria-label','골드 상점 · 일반 NPC');host.append(badge,panel);
  let game=null,tab='inventory',job='miner',floor=-3,busy=false,selected=null,capDraft=null;
  const floorsFor=role=>FLOOR_IDS.filter(f=>role==='miner'?f<=-3:role==='guard'?C.monsterFloors.includes(f):f>=-2);
  const price=()=>C.hireBase+Math.max(0,(game?.npcs.length||5)-C.initialNpcs)*C.hireIncrement;
  const el=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
  const btn=(parent,text,fn,id,disabled=false)=>{const b=el('button','',text);if(id)b.id=id;b.disabled=disabled;b.onclick=fn;parent.append(b);return b;};
  const note=(parent,text)=>parent.append(el('p','game-help',text));
  async function command(input){if(busy)return;busy=true;render();try{const result=await api.gameCommand(input);game=result.game;onGame(game);if(result.result?.gold)notify(result.result.gold.toLocaleString()+' 골드 획득');if(result.result?.hired)notify('일반 NPC를 고용했습니다.');if(input.type==='monsterCap')capDraft=null;}catch(error){notify(error.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}finally{busy=false;render();}}
  function open(next=tab){closePanels();tab=next;panel.hidden=false;render();}
  badge.onclick=()=>panel.hidden?open():panel.hidden=true;
  function field(parent,label,id,options,value,change){const l=el('label','',label),s=el('select');s.id=id;for(const [v,text] of options){const o=el('option','',text);o.value=String(v);s.append(o);}s.value=String(value);s.onchange=change;l.append(s);parent.append(l);}
  function render(){
    const g=game;if(!g){badge.textContent='골드 상점';return;}
    badge.innerHTML='<strong>◈ '+g.gold.toLocaleString()+' 골드</strong><small>일반 NPC '+g.npcs.length+' / 40</small>';if(panel.hidden)return;
    panel.innerHTML='<div class="editor-heading"><div><small>GOLD · NPC · MONSTERS</small><h2>광산 경제 · 고용 상점</h2></div><button id="closeGamePanel" class="icon-button" aria-label="상점 닫기">×</button></div>';
    panel.querySelector('#closeGamePanel').onclick=()=>panel.hidden=true;
    note(panel,'일반 NPC는 실제 에이전트 직원과 별도입니다. 채굴과 전투로 아이템을 모아 판매하고, 골드로 최대 40명까지 고용하세요.');
    const wallet=el('div','game-wallet');wallet.append(el('strong','',g.gold.toLocaleString()+' 골드'));btn(wallet,g.running?'시뮬레이션 일시정지':'시뮬레이션 재개',()=>command({type:'running',value:!g.running}),'gameRunning',busy);panel.append(wallet);
    const tabs=el('div','game-tabs');for(const [key,text] of [['inventory','창고 · 판매'],['shop','고용 상점'],['npcs','NPC 명단'],['monsters','몬스터']]){const b=btn(tabs,text,()=>{tab=key;render();});b.dataset.gameTab=key;b.classList.toggle('active',tab===key);}panel.append(tabs);
    const content=el('div','game-content');panel.append(content);
    if(tab==='inventory'){
      note(content,'광물은 채굴 NPC가 작업을 마칠 때 획득합니다. 전리품은 몬스터가 떨어뜨린 뒤 NPC가 수거하거나 직접 수거할 수 있습니다.');
      const stock=Object.values(g.inventory).reduce((a,b)=>a+b,0),summary=el('div','game-summary','보유 '+stock+'개 · 바닥 전리품 '+g.drops.length+'개');btn(summary,'모두 판매',()=>command({type:'sellAll'}),'sellAll',!stock||busy);content.append(summary);
      for(const [id,item] of Object.entries(C.items)){const row=el('div','game-item');row.innerHTML='<i style="background:'+item.color+'"></i><span><strong>'+esc(item.name)+'</strong><small>개당 '+item.price+' 골드 · 보유 '+(g.inventory[id]||0)+'개</small></span>';btn(row,'판매',()=>command({type:'sell',item:id,count:'all'}),null,!g.inventory[id]||busy).dataset.sell=id;content.append(row);}
      btn(content,'현재 층의 바닥 전리품 수거',()=>command({type:'collect',floor:getWorld()?.currentFloor()==='all'?1:Number(getWorld()?.currentFloor()||1)}),'collectDrops',busy);
      const history=el('div','game-history');for(const e of g.history.slice(-6).reverse())history.append(el('p','',e.text));content.append(history);
    }
    if(tab==='shop'){
      note(content,'처음 5명은 이미 근무 중입니다. 추가 35명까지 고용할 수 있으며 고용 비용은 인원에 따라 증가합니다.');
      field(content,'직무','npcHireJob',Object.entries(C.jobs),job,e=>{job=e.target.value;if(!floorsFor(job).includes(floor))floor=floorsFor(job)[0];render();});
      field(content,'근무 층','npcHireFloor',floorsFor(job).map(f=>[f,FLOOR_NAMES[f]]),floor,e=>floor=Number(e.target.value));
      const preview=el('div','game-hire-preview','다음 NPC 고용: '+price().toLocaleString()+' 골드');note(preview,'채굴 NPC는 광물을 모으고, 전투 NPC는 같은 층의 몬스터를 추적·처치합니다. 일반 순찰 NPC는 배치한 층에서 돌아다닙니다.');content.append(preview);
      btn(content,g.npcs.length>=40?'최대 40명 고용 완료':'일반 NPC 고용',()=>command({type:'hire',job,floor}),'hireNpc',busy||g.npcs.length>=40||g.gold<price());
    }
    if(tab==='npcs'){
      note(content,'실제 AI 직원과 분리된 일반 NPC '+g.npcs.length+' / 40');const phases={walking:'이동 중',mining:'채굴 중',combat:'전투 중',recovering:'회복 중',paused:'휴식',idle:'대기'};
      for(const n of g.npcs){const row=el('div','game-npc'+(selected===n.id?' selected':''));row.innerHTML='<span><strong>'+esc(n.name)+'</strong><small>'+C.jobs[n.job]+' · '+floorLabel(n.floor)+' · '+(phases[n.phase]||'대기')+' · HP '+n.hp+'</small></span>';btn(row,'위치',()=>getWorld()?.focusGameEntity(n.floor,n.x,n.z)).dataset.findNpc=n.id;btn(row,n.enabled?'휴식':'근무',()=>command({type:'npcEnabled',id:n.id,value:!n.enabled}),null,busy).dataset.toggleNpc=n.id;content.append(row);}
    }
    if(tab==='monsters'){
      note(content,'B5·B6에서만 무작위 생성되며, 생성된 층 밖으로 이동하거나 다른 층을 공격할 수 없습니다.');
      const label=el('label','','층별 최대 몬스터 수 (0~12)'),input=el('input');input.id='monsterCap';input.type='number';input.min=0;input.max=12;input.step=1;input.value=capDraft??g.monsterCap;input.oninput=e=>capDraft=e.target.value;label.append(input);content.append(label);btn(content,'정원 적용',()=>command({type:'monsterCap',value:Number(capDraft??g.monsterCap)}),'applyMonsterCap',busy);
      note(content,C.monsterFloors.map(f=>floorLabel(f)+' '+g.monsters.filter(m=>m.originFloor===f).length+'/'+g.monsterCap).join(' · ')+' · 전체 상한 '+Math.min(C.globalMonsterCap,g.monsterCap*2)+'마리');
      if(!g.monsters.length)note(content,'시뮬레이션이 실행되면 정원 안에서 몬스터가 생성됩니다.');
      for(const m of g.monsters){const row=el('div','game-npc'+(selected===m.id?' selected':''));row.innerHTML='<span><strong>'+C.monsters[m.type].name+'</strong><small>'+floorLabel(m.originFloor)+' 고정 · HP '+m.hp+'/'+C.monsters[m.type].hp+'</small></span>';btn(row,'집중 공격',()=>command({type:'target',id:m.id}),null,busy).dataset.monster=m.id;content.append(row);}
    }
  }
  document.querySelector('#world').addEventListener('game:pick',e=>{selected=e.detail.id;if(e.detail.kind==='drop')command({type:'collect',floor:Number(getWorld()?.currentFloor()||1)});else open(e.detail.kind==='npc'?'npcs':'monsters');});
  return {set(next){if(!next)return;game=next;render();},open};
}
