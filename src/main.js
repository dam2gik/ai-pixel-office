import {createGamePanel} from './game-panel.js';
import {createInterfaceVisibility} from './interface-visibility.js';
import {createSpaceBrowser} from './space-browser.js';
import {createFloorShortcuts} from './floor-shortcuts.js';
import {FLOOR_NAMES,floorLabel} from './floors.js';
import './style.css';
import './game.css';
import { layout } from './layout.js';
import { createOffice } from './office.js';
import { openArtifactPreview } from './artifact-preview.js';
import {createFurnitureEditor} from './furniture-editor.js';
import {ROOMS} from './office-life.js';
import {characterPortrait} from './character-visuals.js';
import {openCharacterEditor} from './character-editor.js';

const icons = {
  office: '<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M8 5V3h8v2M8 10h2m4 0h2M8 14h2m4 0h2M10 21v-3h4v3"/>',
  team: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0112 0v3M17 5a3 3 0 010 6m1 3a5 5 0 013 5"/>',
  task: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6m-6 4h6"/>',
  settings:'<path d="M12 8a4 4 0 100 8 4 4 0 000-8zM9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1z"/>',
  plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>', close:'<path d="m6 6 12 12M6 18 18 6"/>', play:'<path d="m8 5 12 7-12 7z"/>', check:'<path d="m5 12 4 4L19 6"/>', leaf:'<path d="M5 20C3 8 10 3 21 3c0 11-6 17-16 17zm0 0L16 9"/>', report:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 12h7m-7 4h7"/>'
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]||icons.task}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const statusNames = {planning:'PM 계획 중',running:'업무 진행 중',reporting:'PM 보고서 작성 중',review:'검수 대기',completed:'검수 완료',partial:'일부 미완료',failed:'실행 실패',interrupted:'중단됨',stopping:'중단 중',queued:'대기',blocked:'선행 작업 대기'};
const taskStatusNames={...statusNames,completed:'작업 완료'};
const initial = { settings:{mode:'demo',concurrency:3,workspace:'',model:''},furniture:[],events:[],projects:[],agents:[{id:'pm',name:'하루',role:'PM',color:'#b3a1ef',instructions:'팀 업무를 조율하고 CEO에게 결과를 보고합니다.'},{id:'dev',name:'이든',role:'개발자',color:'#82b7ee',instructions:'기능을 구현하고 결과를 검증합니다.'},{id:'design',name:'나래',role:'디자이너',color:'#e9a783',instructions:'사용자 흐름과 화면을 설계합니다.'},{id:'qa',name:'루카',role:'QA',color:'#9fc99a',instructions:'산출물을 검증하고 문제를 전달합니다.'}] };
const unavailable=async()=>{throw new Error('브라우저 미리보기입니다. npm start로 Electron 앱을 실행해 주세요.');};
const api=window.office || new Proxy({get:async()=>({state:initial,connection:{connected:false}}),onState:()=>{},onLive:()=>{},onConnection:()=>{}},{get:(o,k)=>o[k]||unavailable});
let state=initial,connection={},selected='pm',projectId=null,tab='tasks',world;
let missionSubmitting=false;
let startingNewProject=false;
let furnitureEditor;let gamePanel;
const app=document.querySelector('#app');
app.innerHTML=layout(icon);
const $=s=>document.querySelector(s);
const interfaceVisibility=createInterfaceVisibility();
$('#quickTasks').insertAdjacentHTML('beforebegin','<button class="text-button" id="newProject">새 프로젝트</button>');
$('.project-controls').insertAdjacentHTML('beforeend','<button class="button primary" id="completeProject" hidden>검수 완료 · 종료</button>');
$('.tabs').insertAdjacentHTML('beforeend','<button data-tab="conversation">대화 · 검수</button>');
$('#navTeam').insertAdjacentHTML('afterend',`<button id="customizeSelected">${icon('team')}<span>캐릭터 꾸미기</span></button>`);
$('.world-location').insertAdjacentHTML('afterend',`<div class="floor-switch" role="group" aria-label="층 선택">${[1,2,3,4,5,-1,-2,-3,-4,-5,-6].map(f=>`<button data-floor="${f}" class="${f===1?'active':''}">${FLOOR_NAMES[f]}</button>`).join('')}<button data-floor="all">전체 단면 · 5F~B6</button></div>`);
const spaceBrowser=createSpaceBrowser({getWorld:()=>world,rooms:ROOMS});
const floorShortcuts=createFloorShortcuts({getWorld:()=>world});
furnitureEditor=createFurnitureEditor({api,getState:()=>state,onState:s=>{state=s;render();},getWorld:()=>world,closePanels,esc,notify:toast});
$('#world').addEventListener('office:floor',e=>{document.querySelectorAll('[data-floor]').forEach(b=>b.classList.toggle('active',b.dataset.floor===e.detail.floor));$('.floor-tag').textContent=e.detail.floor==='all'?'CAMPUS':floorLabel(e.detail.floor);furnitureEditor.syncFloor(e.detail.floor);spaceBrowser.setFloor(e.detail.floor);});
document.querySelectorAll('[data-floor]').forEach(b=>b.onclick=()=>world?.setFloor(b.dataset.floor));
const ambientDetail=document.createElement('p');ambientDetail.className='ambient-detail';ambientDetail.id='ambientDetail';$('#agentDetail').before(ambientDetail);
const ambientStates=new Map();
function renderAmbientDetail(){const activity=ambientStates.get(selected);ambientDetail.textContent=activity?`오피스에서 · ${activity.text}`:'';ambientDetail.title=activity?.bubble||'';}
$('#world').addEventListener('office:activity',e=>{ambientStates.set(e.detail.id,e.detail);if(e.detail.id===selected)renderAmbientDetail();});
const current=()=>state.projects.find(p=>p.id===projectId)||state.projects[0];
const requestProject=()=>!startingNewProject&&current()?.status!=='completed'?current():null;
const busy=p=>p&&['planning','running','reporting','stopping'].includes(p.status);
function closeMenu(){if($('#navigation').open)$('#navigation').close();$('#menuToggle').setAttribute('aria-expanded','false');}
function closePanels(){closeMenu();furnitureEditor?.close();$('.inspector').hidden=true;$('.work-card').hidden=true;document.body.classList.remove('panel-open');}
function openWork(nextTab='tasks'){closeMenu();furnitureEditor?.close();tab=nextTab;$('.inspector').hidden=true;$('.work-card').hidden=false;document.body.classList.add('panel-open');renderWork();$('#closeWork').focus();}
$('#menuToggle').onclick=()=>{$('#navigation').showModal();$('#menuToggle').setAttribute('aria-expanded','true');};
$('#closeMenu').onclick=closeMenu;
$('#navigation').addEventListener('close',()=>$('#menuToggle').setAttribute('aria-expanded','false'));
$('#navigation').addEventListener('click',e=>{if(e.target!==$('#navigation'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeMenu();});
$('#closeInspector').onclick=closePanels;$('#closeWork').onclick=closePanels;
$('#quickTasks').onclick=()=>openWork('tasks');$('#navActivity').onclick=()=>openWork('activity');$('#navReport').onclick=()=>openWork('report');
$('#fullscreenToggle').onclick=()=>action(async()=>{if(window.office)await api.fullscreen();else if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();});
$('#menuFullscreen').onclick=()=>{closeMenu();$('#fullscreenToggle').click();};
$('#exitApp').onclick=()=>action(()=>api.close());
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#modal').open&&!$('#navigation').open){const hadPanel=!$('.inspector').hidden||!$('.work-card').hidden;closePanels();if(!hadPanel&&window.office)action(()=>api.fullscreen(false));}});
function toast(text){$('#toast').textContent=text;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),5500);}
async function action(fn){try{return await fn();}catch(e){toast(e.message.replace(/^Error invoking remote method '[^']+': Error: /,''));}}
function portrait(a,small=false){return characterPortrait(a,small,Math.max(0,state.agents.findIndex(agent=>agent.id===a.id)));}
function customizeCharacter(){const agent=state.agents.find(a=>a.id===selected)||state.agents[0];furnitureEditor.close();openCharacterEditor({agent,index:state.agents.indexOf(agent),api,modal,esc,onState:s=>{state=s;render();},notify:toast});}
function chooseAgent(id){selected=id;closeMenu();furnitureEditor?.close();$('.work-card').hidden=true;$('.inspector').hidden=false;document.body.classList.add('panel-open');render();}
function agentTask(a){return current()?.tasks.find(t=>t.agentId===a.id&&t.status==='running')||current()?.tasks.find(t=>t.agentId===a.id&&t.status==='queued');}
let teamSignature='',worldSignature='';
function render(){
  gamePanel?.set(state.game);
  const p=current(),a=state.agents.find(a=>a.id===selected)||state.agents[0];selected=a.id;
  const running=state.projects.flatMap(p=>p.tasks).filter(t=>t.status==='running').length;
  $('#officeStats').textContent=`직원 ${state.agents.length}명 · ${running}명 작업 중`;
  $('#modeBadge').textContent=state.settings.mode==='demo'?'시뮬레이션':'CODEX LIVE';$('#modeBadge').className=state.settings.mode==='codex'?'real':'';
  $('#footerMode').textContent=state.settings.mode==='demo'?'시뮬레이션 모드 · 실제 AI 작업 없음':'Codex 모드 · ChatGPT 계정 사용';
  const nextTeamSignature=JSON.stringify([selected,state.agents.map(a=>[a.id,a.name,a.role,a.color,a.appearance,agentTask(a)?.status])]);
  if(nextTeamSignature!==teamSignature){teamSignature=nextTeamSignature;$('#teamStrip').innerHTML=state.agents.map(a=>`<button data-agent="${a.id}" class="team-chip ${selected===a.id?'selected':''}">${portrait(a,true)}<span><strong>${esc(a.name)}</strong><small>${esc(a.role)}</small></span><i class="${agentTask(a)?.status==='running'?'working':''}"></i></button>`).join('');}
  if(!$('.inspector').hidden){
  const t=agentTask(a),pmWorking=p?.pmId===a.id&&['planning','reporting'].includes(p.status);
  $('#agentDetail').innerHTML=`<div class="profile-head">${portrait(a)}<div><h2>${esc(a.name)}<span>${esc(a.role)}</span></h2><div class="profile-status"><i class="${t?.status==='running'||pmWorking?'working':''}"></i>${pmWorking?statusNames[p.status]:t?taskStatusNames[t.status]:'새 업무를 기다리고 있어요'}</div></div></div><p class="agent-instructions">${esc(a.instructions||'팀원들과 협업해 담당 업무를 수행합니다.')}</p><div class="detail-divider"></div><div class="section-label">현재 맡은 업무</div><div class="current-task">${t?`<strong>${esc(t.title)}</strong><p>${esc(t.instructions)}</p><div class="task-dependency">${t.dependsOn.length?`선행 작업 ${t.dependsOn.length}개 결과 활용`:'독립적으로 진행하는 업무'}</div>`:pmWorking?`<strong>${p.status==='planning'?'목표를 실행 계획으로 바꾸는 중':'직원 결과를 모아 보고하는 중'}</strong><p>${esc(p.goal)}</p>`:'<div class="idle-note">새로운 아이디어를 기다리는 중입니다.<br>아래에서 팀에 첫 업무를 맡겨보세요.</div>'}</div><div class="section-label activity-label">최근 작업 내용 <span>LIVE</span></div><div id="agentLive" class="agent-live">${esc(t?.live||t?.logs?.slice(-3).join('\n')||'실행 내용과 결과가 이곳에 표시됩니다.')}</div>`;
  if(pmWorking&&p.pmLive)$('#agentLive').textContent=p.pmLive;
  if(p)$('#agentDetail').insertAdjacentHTML('beforeend','<button id="previewAgentResults" class="button secondary full">결과물 미리보기 ↗</button>');
  $('#agentDetail').insertAdjacentHTML('beforeend','<button id="customizeCharacter" class="button secondary full">캐릭터 꾸미기</button>');
  }
  $('#steerText').disabled=!busy(p);$('#steerForm button').disabled=!busy(p);
  $('#taskCount').textContent=p?.tasks.length||0;$('#menuTaskCount').textContent=p?.tasks.length||0;
  $('#projectSelect').innerHTML=state.projects.length?state.projects.map(x=>`<option value="${x.id}" ${x.id===p.id?'selected':''}>${esc(x.title.slice(0,28))}</option>`).join(''):'<option>아직 진행 중인 업무가 없어요</option>';
  $('#stopProject').hidden=!busy(p);$('#resumeProject').hidden=!p||!['failed','partial','interrupted'].includes(p.status);
  $('#completeProject').hidden=!p||p.status==='completed';$('#completeProject').disabled=missionSubmitting||busy(p);
  $('#newProject').disabled=missionSubmitting||state.projects.some(busy);
  const target=requestProject();
  $('.command-heading strong').textContent=target?`이어서 요청 · ${target.title.slice(0,24)}`:'새 프로젝트를 시작해 보세요';
  $('#mission').placeholder=target?'검수 의견이나 추가 요청을 입력하세요. 같은 프로젝트에서 이어집니다.':'새 프로젝트의 목표를 입력하세요.';
  $('#mission').readOnly=missionSubmitting;
  $('#chooseProjectForMission').disabled=missionSubmitting||state.projects.some(busy)||!!target;if(target)$('#chooseProjectForMission').checked=false;
  const folder=target?.projectDirectory||state.settings.workspace;
  $('#missionProjectDirectory').textContent=folder||'프로젝트 폴더 미설정';$('#missionProjectDirectory').title=target?'현재 프로젝트의 폴더를 유지합니다. 폴더 변경은 새 프로젝트에서 선택하세요.':folder||'폴더를 지정하려면 이번 업무의 폴더 변경을 선택하세요.';
  $('#startMission').disabled=missionSubmitting||state.projects.some(busy);$('#startMission').innerHTML=missionSubmitting?'업무 준비 중…':state.projects.some(busy)?'팀이 작업 중이에요':`${target?'추가 요청 보내기':'팀에 업무 맡기기'} ${icon('arrow')}`;
  $('#reportDot').classList.toggle('ready',!!p?.report);
  if(!$('.work-card').hidden)renderWork();renderConnection();
  const active=state.projects.find(busy),lastHandoff=state.events.findLast(e=>e.type==='handoff');
  const nextWorldSignature=JSON.stringify([selected,state.agents.map(a=>[a.id,a.name,a.color,a.appearance]),state.furniture,active&&[active.id,active.status,active.pmId,active.tasks.map(t=>[t.id,t.agentId,t.status,t.title])],lastHandoff?.id]);
  if(nextWorldSignature!==worldSignature){worldSignature=nextWorldSignature;world?.update(state,selected);}
  renderAmbientDetail();
  furnitureEditor?.render();
}
function renderWork(){
  const p=current();document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  const content=$('#workContent');
  const previousScroll=content.scrollTop,atBottom=content.scrollHeight-content.scrollTop-content.clientHeight<80;
  if(!p){content.innerHTML=`<div class="empty"><span class="empty-icon">${icon('task')}</span><strong>좋은 팀은, 하나의 목표에서 시작해요.</strong><p>업무를 맡기면 PM의 계획과 직원들의 협업 과정이 여기에 펼쳐집니다.</p><div class="workflow-preview"><span>CEO 지시</span>→<span>PM 계획</span>→<span>직원 병렬 작업</span>→<span>결과 전달</span>→<span>PM 보고</span></div></div>`;return;}
  const badge=`<div class="project-summary"><span class="status-badge ${p.status}">${esc(statusNames[p.status]||p.status)}</span><strong>${esc(p.title)}</strong><span>${p.mode==='demo'?'시뮬레이션 · 실제 작업 없음':'실제 Codex 작업'}</span></div>${p.error?`<div class="error-box">${esc(p.error)}</div>`:''}`;
  const approvals=(state.approvals||[]).map(r=>`<div class="approval"><strong>작업 권한 요청</strong><pre>${esc(r.params.command||r.params.reason||JSON.stringify(r.params,null,2))}</pre><button class="button secondary" data-approval="${esc(r.id)}" data-allow="false">거절</button><button class="button primary" data-approval="${esc(r.id)}" data-allow="true">이번 작업 허용</button></div>`).join('');
  if(tab==='tasks')content.innerHTML=badge+approvals+(p.tasks.length?`<div class="task-grid">${p.tasks.map((t,i)=>{const a=state.agents.find(a=>a.id===t.agentId);return `<article class="task-card ${t.status}"><div class="task-card-top"><span class="task-number">${String(i+1).padStart(2,'0')}</span><span class="task-status">${t.status==='completed'?icon('check'):''}${esc(taskStatusNames[t.status]||t.status)}</span></div><h3>${esc(t.title)}</h3><p>${esc(t.instructions)}</p><div class="dependencies">${t.dependsOn.length?t.dependsOn.map(d=>`<span>↳ ${esc(p.tasks.find(t=>t.id===d)?.title||d)}</span>`).join(''):'<span>↗ 독립 업무 · 병렬 실행 가능</span>'}</div><div class="task-person">${portrait(a,true)}<span>${esc(a.name)} <small>${esc(a.role)}</small></span><button data-agent="${a.id}" class="text-button">보기 ↗</button></div>${t.error?`<p class="task-error">${esc(t.error)}</p>`:''}${t.result?`<details><summary>전달한 결과 보기</summary><pre>${esc(t.result)}</pre></details>`:''}</article>`}).join('')}</div>`:`<div class="planning"><span class="pulse"></span>PM이 목표를 분석하고 업무를 나누고 있습니다.</div>`);
  else if(tab==='conversation'){
    const messages=p.messages||[p.goal&&{role:'user',text:p.goal,round:1},p.report&&{role:'assistant',text:p.report,round:1}].filter(Boolean);
    content.innerHTML=badge+approvals+`<div class="project-conversation"><p class="review-note">${p.status==='completed'?'사용자가 검수 완료한 프로젝트입니다. 새 요청은 새 프로젝트로 시작합니다.':'AI 작업 결과가 나와도 프로젝트는 유지됩니다. 아래 입력창에 추가 요청을 보내고, 검수가 끝나면 검수 완료 · 종료를 눌러주세요.'}</p>${messages.map(m=>`<article class="conversation-message ${esc(m.role)}"><strong>${m.role==='user'?'나의 요청':m.role==='assistant'?'팀의 결과':'프로젝트 상태'} <small>${m.round||1}차</small></strong><pre>${esc(m.text)}</pre></article>`).join('')}</div>`;
  }else if(tab==='activity'){
    const events=state.events.filter(e=>e.projectId===p.id).slice().reverse();content.innerHTML=badge+approvals+`<div class="timeline">${events.map(e=>`<div class="timeline-item"><span class="timeline-symbol ${e.type}">${e.type==='handoff'?'↗':e.type==='report'?'✓':'•'}</span><div><strong>${esc(e.message)}</strong><small>${new Date(e.at).toLocaleTimeString('ko-KR')}</small></div><span class="event-tag">${({handoff:'결과 전달',working:'작업 시작',complete:'결과 제출',report:'CEO 보고',plan:'계획',steer:'수정 지시',assignment:'업무 배정'})[e.type]||'상태 변경'}</span></div>`).join('')}</div>`;
  }else content.innerHTML=badge+approvals+(p.report?`<div class="report-toolbar"><span>${icon('report')} PM의 최종 보고</span><button class="button secondary" id="exportReport">보고서 저장</button>${p.mode==='codex'?'<button class="button primary" id="openOutput">산출물 폴더 열기</button>':''}</div><pre class="report-body">${esc(p.report)}</pre>`:'<div class="empty"><span class="empty-icon">'+icon('report')+'</span><strong>PM이 팀의 결과를 취합해 보고합니다.</strong><p>작업이 완료되면 산출물, 검증 결과와 남은 과제를 확인할 수 있어요.</p></div>');
  if(p.metrics){const info=document.createElement('div');info.className='execution-metrics';info.textContent=`${p.executionPath==='direct'?'직접 처리':'팀 협업'} · 최대 ${p.metrics.peakParallel}명 동시 작업${p.metrics.totalMs?` · 누적 실행 ${(p.metrics.totalMs/1000).toFixed(1)}초`:''}`;content.querySelector('.project-summary')?.after(info);}
  if(p.projectDirectory){const folder=document.createElement('div');folder.className='project-directory';folder.textContent=`프로젝트 폴더 · ${p.projectDirectory}`;folder.title=p.projectDirectory;content.querySelector('.project-summary')?.after(folder);}
  if(tab==='conversation')content.scrollTop=atBottom?content.scrollHeight:previousScroll;
}
function renderConnection(){const b=$('#connectionButton');b.classList.toggle('connected',connection.connected&&connection.account?.type==='chatgpt');b.querySelector('span').textContent=connection.connected?(connection.account?.type==='chatgpt'?'Codex 연결됨':'ChatGPT 로그인 필요'):'Codex 연결 설정';}
function modal(title,subtitle,body){closeMenu();$('#modal').classList.remove('artifact-dialog','character-dialog');$('#modalContent').innerHTML=`<div class="modal-heading"><div><h2>${title}</h2><p>${subtitle}</p></div><button class="icon-button" id="closeModal" aria-label="닫기">${icon('close')}</button></div>${body}`;if(!$('#modal').open)$('#modal').showModal();$('#closeModal').onclick=()=>$('#modal').close();}
function settingsModal(){modal('오피스 설정','ChatGPT 계정의 Codex를 우리 팀과 연결하세요.',`<div class="settings-connection"><span class="connection-state">${connection.connected?'● Codex 프로세스 연결됨':'○ 연결 전'}</span><p>${connection.account?.type==='chatgpt'?'ChatGPT 계정으로 로그인되어 있습니다.':connection.account?.type==='apiKey'?'API 키로 로그인되어 있습니다. 이 앱은 ChatGPT 로그인 모드로 실행합니다.':'실제 업무에는 ChatGPT 계정 로그인이 필요합니다.'}</p><div class="button-row"><button class="button secondary" id="connectCodex">연결 확인</button><button class="button primary" id="loginCodex">ChatGPT로 로그인</button></div><p class="field-note">${esc(connection.loginError||connection.error||'로그인은 기본 브라우저에서 진행됩니다.')}</p></div><form id="settingsForm"><label>실행 모드<select name="mode"><option value="demo" ${state.settings.mode==='demo'?'selected':''}>시뮬레이션 — AI 호출과 실제 파일 작업 없음</option><option value="codex" ${state.settings.mode==='codex'?'selected':''}>Codex — 실제 AI 업무 실행</option></select></label><div class="form-row"><label>최대 병렬 작업<select name="concurrency">${[1,2,3,4,5,6].map(n=>`<option ${state.settings.concurrency===n?'selected':''}>${n}</option>`).join('')}</select></label><label>모델<select name="model"><option value="">Codex 기본 모델</option>${(connection.models||[]).map(m=>`<option value="${esc(m.id)}" ${state.settings.model===m.id?'selected':''}>${esc(m.displayName||m.id)}</option>`).join('')}</select></label></div><label>산출물 저장 폴더</label><div class="path-row"><code>${esc(state.settings.workspace||'폴더를 선택해 주세요')}</code><button type="button" class="button secondary" id="chooseWorkspace">선택</button></div><p class="field-note">프로젝트별 · 직원 작업별 폴더가 자동으로 생성됩니다.</p><label>Codex 실행 파일</label><div class="path-row"><code>${esc(state.settings.executable||connection.executable||'자동으로 찾기')}</code><button type="button" class="button secondary" id="chooseExecutable">선택</button></div><p class="field-note">계정 사용 한도와 권한은 Codex 설정을 따릅니다. 현재 최대 ${state.settings.concurrency}개 작업을 병렬 실행합니다.</p><button type="submit" class="button primary full">설정 저장</button></form>`);
  $('#settingsForm').insertAdjacentHTML('afterbegin',`<label>업무 처리 방식<select name="executionStrategy">${[['auto','자동 — 작은 요청은 직접 처리'],['solo','한 명이 실행·검증'],['team','PM이 계획하고 팀에 배정']].map(([value,label])=>`<option value="${value}" ${(state.settings.executionStrategy||'auto')===value?'selected':''}>${label}</option>`).join('')}</select></label><p class="field-note">자동 모드는 명확한 소규모 요청의 계획·보고 대기를 줄입니다. 큰 요청과 복잡한 목표는 팀으로 처리합니다.</p>`);
  const workspaceRow=$('#chooseWorkspace').closest('.path-row');workspaceRow.previousElementSibling.textContent='기본 프로젝트 폴더';workspaceRow.nextElementSibling.textContent='새 업무는 이 폴더를 사용합니다. 요청할 때 폴더 변경을 선택할 수 있습니다. 산출물은 폴더 아래 pixel-office-output에 저장합니다.';
  $('#connectCodex').onclick=()=>action(async()=>{const b=$('#connectCodex');b.disabled=true;b.textContent='연결 중…';try{connection=await api.connect();settingsModal();}finally{b.disabled=false;}});
  $('#loginCodex').onclick=()=>action(async()=>{await api.login();toast('브라우저에서 로그인을 완료한 뒤 연결 확인을 눌러주세요.');});
  $('#chooseWorkspace').onclick=()=>action(async()=>{await api.chooseWorkspace();settingsModal();});$('#chooseExecutable').onclick=()=>action(async()=>{await api.chooseExecutable();settingsModal();});
  $('#settingsForm').onsubmit=e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget));action(async()=>{await api.settings(data);$('#modal').close();toast('오피스 설정을 저장했습니다.');});};
}
function addAgentModal(){modal('새로운 팀원을 만나보세요','직업과 업무 방식을 설정하면 PM이 업무를 배정합니다.',`<form id="agentForm"><div class="form-row"><label>이름<input name="name" placeholder="직원의 이름" maxlength="24" required></label><label>직업<select name="role"><option>개발자</option><option>디자이너</option><option>QA</option><option>리서처</option><option>마케터</option><option>PM</option></select></label></div><label>캐릭터 의상 색상<input name="color" type="color" value="#8bb6d6"></label><label>역할과 작업 방식<textarea name="instructions" rows="4" maxlength="4000" placeholder="예: 접근성을 고려해 화면을 설계하고, 개발자가 사용할 명세를 작성합니다." required></textarea></label><button type="submit" class="button primary full">우리 팀에 합류시키기 ${icon('plus')}</button></form>`);$('#agentForm').onsubmit=e=>{e.preventDefault();const input=Object.fromEntries(new FormData(e.currentTarget));action(async()=>{await api.addAgent(input);$('#modal').close();toast(`${input.name}님이 오피스에 합류했습니다.`);});};}
document.addEventListener('click',e=>{
  if(e.target.closest('#customizeCharacter'))customizeCharacter();
  if(e.target.closest('#previewAgentResults')){const project=current(),agent=state.agents.find(a=>a.id===selected);if(project&&agent)openArtifactPreview({api,project,agent,modal,esc});}
  const agent=e.target.closest('[data-agent]');if(agent)chooseAgent(agent.dataset.agent);
  const t=e.target.closest('[data-tab]');if(t){tab=t.dataset.tab;renderWork();}
  const example=e.target.closest('[data-example]');if(example){$('#mission').value=example.dataset.example;$('#mission').focus();}
  const approval=e.target.closest('[data-approval]');if(approval)action(()=>api.approve(approval.dataset.approval,approval.dataset.allow==='true'));
  if(e.target.closest('#exportReport'))action(()=>api.exportReport(current().id));
  if(e.target.closest('#openOutput'))action(()=>api.openOutput(current().id));
});
$('#openSettings').onclick=settingsModal;$('#connectionButton').onclick=settingsModal;$('#addAgent').onclick=addAgentModal;
$('#decorate').onclick=()=>furnitureEditor.open();
$('#customizeSelected').onclick=customizeCharacter;
$('#missionForm').onsubmit=async e=>{
  e.preventDefault();if(missionSubmitting||state.projects.some(busy))return;
  const goal=$('#mission').value,chooseProjectFolder=$('#chooseProjectForMission').checked,target=requestProject();missionSubmitting=true;render();
  try{await action(async()=>{
    const started=await api.start(goal,{chooseProjectFolder,...(target?{projectId:target.id}:{})});
    if(!started){toast('폴더 선택을 취소했습니다. 요청 내용은 유지됩니다.');return;}
    projectId=started;const loaded=await api.get();state=loaded.state;startingNewProject=false;$('#mission').value='';$('#chooseProjectForMission').checked=false;openWork('conversation');toast(target?'같은 프로젝트에 추가 요청을 전달했습니다.':'새 프로젝트를 시작했습니다.');
  });}finally{missionSubmitting=false;render();}
};
$('#steerForm').onsubmit=e=>{e.preventDefault();action(async()=>{await api.steer(current()?.id,selected,$('#steerText').value);$('#steerText').value='';toast('추가 지시를 전달했습니다.');});};
$('#stopProject').onclick=()=>action(()=>api.stop(current().id));$('#resumeProject').onclick=()=>action(()=>api.resume(current().id));
$('#projectSelect').onchange=e=>{projectId=e.target.value;startingNewProject=false;render();};
$('#newProject').onclick=()=>{startingNewProject=true;$('#chooseProjectForMission').checked=false;closePanels();render();$('#mission').focus();};
$('#completeProject').onclick=()=>action(async()=>{await api.completeProject(current().id);const loaded=await api.get();state=loaded.state;render();toast('검수를 완료하고 프로젝트를 종료했습니다.');});
$('#navTeam').onclick=()=>{modal('우리 팀','직원을 선택해 담당 업무와 작업 내용을 확인하세요.',`<div class="team-list">${state.agents.map(a=>`<button data-agent="${a.id}">${portrait(a,true)}<strong>${esc(a.name)}</strong><span>${esc(a.role)}</span></button>`).join('')}</div>`);$('#modalContent').querySelectorAll('[data-agent]').forEach(b=>b.addEventListener('click',()=>$('#modal').close()));};
$('#navTasks').onclick=()=>openWork('tasks');$('#navOffice').onclick=closePanels;
$('#zoomIn').onclick=()=>world?.zoom(.9);$('#zoomOut').onclick=()=>world?.zoom(1.1);$('#resetView').onclick=()=>world?.reset();
let stateTimer,liveTimer;
api.onState(s=>{state=s;if(!stateTimer)stateTimer=setTimeout(()=>{stateTimer=null;render();if(state.approvals?.length)openWork('tasks');},80);});
api.onConnection(c=>{connection=c;renderConnection();});
if(window.office)api.onError?.(message=>toast(message));
api.onLive(({projectId:pid,taskId,text})=>{const p=state.projects.find(p=>p.id===pid),t=p?.tasks.find(t=>t.id===taskId);if(t)t.live=text;if(p&&taskId.startsWith('_'))p.pmLive=text;if(!liveTimer)liveTimer=setTimeout(()=>{liveTimer=null;if($('.inspector').hidden)return;const p=current(),t=p?.tasks.find(t=>t.agentId===selected&&t.status==='running');const text=t?.live||(p?.pmId===selected?p.pmLive:'');if(text)$('#agentLive').textContent=text;},100);});
try{world=createOffice($('#world'),chooseAgent,{onFurnitureSelect:id=>furnitureEditor.select(id),onFurnitureMove:(id,patch)=>furnitureEditor.move(id,patch),onFurniturePreview:(id,patch)=>api.validateFurniture(id,patch),onError:toast});}catch(e){$('#world').innerHTML='<div class="world-fallback">3D 화면을 시작할 수 없습니다.<br>아래 직원 목록에서 업무를 확인할 수 있습니다.</div>';console.error(e);}

function syncAmbientButton(){const enabled=world?.stats().ambientEnabled!==false;$('#ambientToggle').setAttribute('aria-pressed',String(enabled));$('#ambientToggle').textContent=enabled?'생활 모션 켜짐':'생활 모션 꺼짐';}
$('#ambientToggle').onclick=()=>{world?.setAmbientEnabled(!world.stats().ambientEnabled);syncAmbientButton();};syncAmbientButton();
if(window.office)api.onVisibility(value=>world?.setVisible(value));
const loaded=await api.get();state=loaded.state;connection=loaded.connection;render();
window.addEventListener('pagehide',()=>{floorShortcuts.dispose();spaceBrowser.dispose();interfaceVisibility.dispose();clearTimeout(stateTimer);clearTimeout(liveTimer);world?.dispose();});
window.readOfficeRenderStats=()=>world?.stats();
window.projectOfficePoint=(x,y,z)=>world?.projectPoint(x,y,z);gamePanel=createGamePanel({api,getWorld:()=>world,closePanels,esc,notify:toast,onGame:g=>{state.game=g;world?.updateGame(g,true);}});
gamePanel.set(state.game);
if(window.office?.onGame)api.onGame(g=>{state.game=g;world?.updateGame(g,true);gamePanel.set(g);});
