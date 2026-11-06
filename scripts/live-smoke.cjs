// Opt-in: this test uses the signed-in ChatGPT account and consumes Codex usage.
const fs = require('node:fs');
const path = require('node:path');
const { Codex } = require('../electron/codex.cjs');
const { Engine } = require('../electron/engine.cjs');
(async()=>{
  const folder=path.resolve('.test-data','live-'+Date.now());fs.mkdirSync(folder,{recursive:true});
  const codex=new Codex();let engine;
  try {
    await codex.connect();const {account}=await codex.request('account/read');if(account?.type!=='chatgpt')throw new Error('ChatGPT login required');
    engine=new Engine(path.join(folder,'office.json'),codex);
    engine.state.settings={...engine.state.settings,mode:'codex',workspace:folder,concurrency:2};
    let last='',max=0;
    engine.on('state',s=>{const p=s.projects[0];if(!p)return;max=Math.max(max,p.tasks.filter(t=>t.status==='running').length);const line=p.status+' '+p.tasks.map(t=>t.id+':'+t.status).join(' ');if(line!==last){last=line;console.log(line);}});
    const pid=engine.start('Pixel Office 연결 검증용 아주 작은 문서 작업입니다. 외부 웹, MCP, 서브에이전트, 패키지 설치는 사용하지 마세요. 정확히 세 작업으로 분해하세요. (1) 디자이너가 DESIGN.txt에 BLUE 한 줄 작성 (2) 개발자가 BUILD.txt에 GREEN 한 줄 작성. 이 두 작업은 서로 독립적으로 병렬 실행. (3) QA가 두 파일을 직접 읽고 자신의 작업 폴더에 두 원본 파일을 복사하고 COMBINED.txt에 BLUE 다음 줄 GREEN을 기록한 뒤 내용이 일치하는지 확인하세요. 이것이 통합 및 검증 단계입니다. PM은 실제 파일 경로와 검증 결과만 짧게 보고하세요.');
    const started=Date.now();while(engine.active.size){if(Date.now()-started>300000){await engine.stop(pid);throw new Error('Live test timed out after 5 minutes');}await new Promise(r=>setTimeout(r,500));}
    const p=engine.state.projects[0];const outputs=[];
    function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name==='COMBINED.txt')outputs.push(fs.readFileSync(full,'utf8').trim().replace(/\r/g,''));}}
    walk(p.directory);
    const ok=p.status==='completed'&&max>=2&&outputs.some(s=>s==='BLUE\nGREEN');
    console.log(JSON.stringify({status:p.status,parallelPeak:max,handoffs:engine.state.events.filter(e=>e.type==='handoff').length,verifiedCombined:outputs.some(s=>s==='BLUE\nGREEN'),reportCreated:!!p.report,error:p.error||null,artifactDirectory:p.directory}));
    if(!ok)process.exitCode=1;
  }catch(e){console.error(e.message);process.exitCode=1;}finally{codex.close();}
})();
