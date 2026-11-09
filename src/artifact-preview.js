export async function openArtifactPreview({api, project, agent, modal, esc}) {
  const tasks=[...(project.rounds||[]).flatMap(r=>r.tasks||[]),...project.tasks].filter(t=>t.agentId===agent.id).reverse();
  modal(`${esc(agent.name)}의 결과물`,'파일을 선택해 내용을 확인하세요.',`<div class="artifact-toolbar"><button id="refreshArtifacts" class="button secondary">새로고침</button>${project.directory?'<button id="artifactFolder" class="button secondary">산출물 폴더 열기</button>':''}</div><div class="artifact-browser"><nav class="artifact-files" aria-label="결과물 목록"><p class="artifact-note">결과물을 찾고 있습니다…</p></nav><section class="artifact-view" aria-label="결과물 미리보기" aria-live="polite"><p class="artifact-note">파일이 생성되면 여기서 확인할 수 있습니다.</p></section></div>`);
  document.querySelector('#modal').classList.add('artifact-dialog');
  const list=document.querySelector('.artifact-files'),view=document.querySelector('.artifact-view');
  let request=0;
  const summaries=tasks.filter(t=>t.result).map(t=>({taskId:t.id,taskTitle:t.title,path:'작업 결과 요약',kind:'summary',text:t.result}));
  if(project.pmId===agent.id&&project.report)summaries.push({taskId:'_report',taskTitle:'PM 최종 보고',path:'PM 보고서',kind:'summary',text:project.report});
  if(project.pmId===agent.id)for(const round of (project.rounds||[]).slice().reverse())if(round.report)summaries.push({taskId:`_report_${round.number}`,taskTitle:`${round.number}차 PM 보고`,path:`${round.number}차 보고서`,kind:'summary',text:round.report});
  document.querySelector('#refreshArtifacts').onclick=()=>openArtifactPreview({api,project,agent,modal,esc});
  const folder=document.querySelector('#artifactFolder');
  if(folder)folder.onclick=async()=>{try{await api.openOutput(project.id);}catch(e){view.textContent=e.message;}};
  async function show(file,button) {
    const token=++request;
    list.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===button));
    view.innerHTML='<p class="artifact-note">불러오는 중…</p>';
    try {
      const result=file.kind==='summary'?{kind:'text',text:file.text}:await api.readArtifact(project.id,agent.id,file.taskId,file.path);
      if(token!==request||!view.isConnected)return;
      view.innerHTML=`<div class="artifact-heading"><strong>${esc(file.path)}</strong><small>${esc(file.taskTitle)}</small></div>`;
      if(result.kind==='image'){
        const img=document.createElement('img');img.className='artifact-image';img.alt=file.path;img.src=result.data;view.append(img);
      }else if(result.kind==='html'){
        const note=document.createElement('p');note.className='artifact-note';note.textContent='HTML 화면 미리보기 · 스크립트와 외부 리소스는 실행하지 않습니다.';view.append(note);
        const frame=document.createElement('iframe');frame.className='artifact-html';frame.title=file.path;frame.setAttribute('sandbox','');frame.referrerPolicy='no-referrer';
        frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; form-action 'none'; base-uri 'none'"><meta charset="utf-8">${result.text}`;view.append(frame);
      }else{
        const pre=document.createElement('pre');pre.className='artifact-text';pre.textContent=result.text??result.message;view.append(pre);
      }
    }catch(e){if(token===request&&view.isConnected)view.textContent=`파일을 열 수 없습니다. ${e.message}`;}
  }
  try {
    const result=project.mode==='demo'?{files:[],truncated:false}:await api.listArtifacts(project.id,agent.id);
    if(!list.isConnected)return;
    const files=[...result.files,...summaries];
    list.replaceChildren();
    for(const file of files){
      const button=document.createElement('button');button.className='artifact-file';button.title=file.path;button.innerHTML=`<span>${esc(file.path)}</span><small>${esc(file.taskTitle)}${file.size!==undefined?` · ${Math.max(1,Math.ceil(file.size/1024))}KB`:''}</small>`;button.onclick=()=>show(file,button);list.append(button);
    }
    if(result.truncated){const note=document.createElement('p');note.className='artifact-note';note.textContent='목록 일부만 표시합니다. 전체 파일은 산출물 폴더에서 확인하세요.';list.append(note);}
    const initialIndex=Math.max(0,files.findIndex(file=>file.kind==='html')>=0?files.findIndex(file=>file.kind==='html'):files.findIndex(file=>file.kind!=='unsupported'));
    if(files.length)await show(files[initialIndex],list.querySelectorAll('button')[initialIndex]);
    else list.innerHTML=`<p class="artifact-note">${project.mode==='demo'?'시뮬레이션에서는 실제 파일을 만들지 않습니다. 작업이 끝나면 결과 요약을 확인할 수 있습니다.':'아직 생성된 결과물이 없습니다. 잠시 후 새로고침해 주세요.'}</p>`;
  }catch(e){if(list.isConnected)list.textContent=`결과물을 불러올 수 없습니다. ${e.message}`;}
}
