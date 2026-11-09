const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
const {listArtifacts,readArtifact}=require('../electron/artifacts.cjs');
const {createRequestStarter}=require('../electron/request-start.cjs');
function fixture(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-lifecycle-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const codex=new EventEmitter();codex.ready=true;codex.send=()=>{};let threads=0,turns=0;
  const calls=[];
  codex.request=async(method,params)=>{
    calls.push({method,params});
    if(method==='account/read')return {account:{type:'chatgpt'}};
    if(method==='thread/start')return {thread:{id:`thread-${++threads}`}};
    if(method==='turn/start'){
      const id=`turn-${++turns}`,name=path.basename(params.cwd);
      const text=name==='_plan'?JSON.stringify({title:'Team project',tasks:[{id:'build',title:'Build',agentId:'dev',eligibleAgentIds:['dev'],instructions:'Create output',dependsOn:[]},{id:'verify',title:'Verify',agentId:'qa',eligibleAgentIds:['qa'],instructions:'Verify output',dependsOn:['build']}]}):`Verified ${name}`;
      if(!name.startsWith('_'))fs.writeFileSync(path.join(params.cwd,'output.txt'),text);
      setTimeout(()=>{codex.emit('notification',{method:'item/completed',params:{threadId:params.threadId,turnId:id,item:{id,type:'agentMessage',text}}});codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id,status:'completed'}}});},5);
      return {turn:{id}};
    }
    return {};
  };
  const engine=new Engine(path.join(folder,'office.json'),codex,{demoDelay:1});
  engine.state.settings={...engine.state.settings,mode:'codex',workspace:folder};
  return {engine,codex,calls,folder};
}
async function done(engine){const end=Date.now()+3000;while(engine.active.size){if(Date.now()>end)throw new Error('Timed out');await new Promise(r=>setTimeout(r,5));}return engine.state.projects[0];}

test('AI output enters review; follow-ups preserve project, history, folders, artifacts and worker context',async t=>{
  const {engine,calls}=fixture(t),id=engine.start('README 문구 수정');let p=await done(engine);
  assert.equal(p.status,'review');assert.equal(p.completedAt,undefined);assert.equal(p.userCompletedAt,undefined);assert.equal(p.messages.length,2);
  const title=p.title,root=p.directory,first=p.tasks[0],firstText=fs.readFileSync(path.join(first.directory,'output.txt'),'utf8');
  assert.equal(engine.continueProject(id,'README 오타도 수정해줘'),id);p=await done(engine);
  assert.equal(engine.state.projects.length,1);assert.equal(p.title,title);assert.equal(p.directory,root);assert.equal(p.status,'review');
  assert.equal(p.roundNumber,2);assert.equal(p.rounds.length,1);assert.equal(p.messages.length,4);
  assert.equal(p.tasks[0].id,'r2_direct');assert.equal(p.tasks[0].threadId,first.threadId);
  assert.notEqual(p.tasks[0].directory,first.directory);assert.equal(fs.readFileSync(path.join(first.directory,'output.txt'),'utf8'),firstText);
  assert.match(calls.filter(c=>c.method==='turn/start').at(-1).params.input[0].text,/PROJECT-HISTORY.md/);
  assert.ok(calls.filter(c=>c.method==='turn/start').at(-1).params.input[0].text.includes(JSON.stringify(first.directory)));
  assert.match(fs.readFileSync(path.join(root,'PROJECT-HISTORY.md'),'utf8'),/README 오타도/);
  const files=(await listArtifacts(engine.state,id,'dev')).files;
  assert.ok(files.some(f=>f.taskId==='direct'));assert.ok(files.some(f=>f.taskId==='r2_direct'));
  assert.equal((await readArtifact(engine.state,id,'dev','direct','output.txt')).text,firstText);
  engine.continueProject(id,'README 문구 다시 수정');p=await done(engine);assert.equal(p.roundNumber,3);assert.equal(p.messages.length,6);
  assert.equal(p.tasks[0].id,'r3_direct');assert.equal(p.tasks[0].threadId,first.threadId);assert.equal(p.rounds.length,2);
  assert.equal((await readArtifact(engine.state,id,'dev','direct','output.txt')).text,firstText);
});

test('only manual completion closes a project and it stays closed after reopening the app',async t=>{
  const {engine,codex}=fixture(t),id=engine.start('README 문구 수정');await done(engine);
  engine.completeProject(id);const p=engine.state.projects[0];assert.equal(p.status,'completed');assert.ok(p.userCompletedAt);assert.equal(engine.projectSessions.has(id),false);
  assert.throws(()=>engine.continueProject(id,'추가 요청'),/검수 완료/);
  const restored=new Engine(engine.file,codex);assert.equal(restored.state.projects[0].status,'completed');assert.equal(restored.state.projects[0].userCompletedAt,p.userCompletedAt);
});

test('review survives app restart and follow-up uses stored history in a fresh session',async t=>{
  const {engine,codex,calls}=fixture(t),id=engine.start('README 문구 수정');const first=await done(engine);
  const oldThread=first.tasks[0].threadId,restored=new Engine(engine.file,codex);
  assert.equal(restored.state.projects[0].status,'review');restored.continueProject(id,'README 오타 수정');const p=await done(restored);
  assert.equal(p.roundNumber,2);assert.notEqual(p.tasks[0].threadId,oldThread);assert.equal(p.messages.length,4);
  assert.match(calls.filter(c=>c.method==='turn/start').at(-1).params.input[0].text,/같은 프로젝트/);
});

test('busy projects cannot be completed or given a second simultaneous request',async t=>{
  const {engine}=fixture(t),id=engine.start('README 문구 수정');
  assert.throws(()=>engine.completeProject(id),/진행 중/);assert.throws(()=>engine.continueProject(id,'README 추가 수정'));
  await done(engine);assert.equal(engine.state.projects[0].roundNumber,1);
});

test('team follow-ups remap dependency IDs and preserve their execution order',async t=>{
  const {engine}=fixture(t),id=engine.start('팀으로 기능 구현');await done(engine);
  engine.continueProject(id,'팀으로 기능 확장');const p=await done(engine);assert.equal(p.status,'review');
  assert.deepEqual(p.tasks.map(t=>t.id),['r2_build','r2_verify']);assert.deepEqual(p.tasks[1].dependsOn,['r2_build']);
  assert.ok(Date.parse(p.tasks[1].startedAt)>=Date.parse(p.tasks[0].completedAt));
});

test('legacy automatic completion becomes review without duplicating its saved conversation',async t=>{
  const {engine,codex}=fixture(t);engine.state.projects=[{id:'old',status:'completed',goal:'Original goal',title:'Old',report:'Original report',tasks:[],completedAt:'2026-11-01T00:00:00Z'}];engine.persist();
  const restored=new Engine(engine.file,codex),p=restored.state.projects[0];assert.equal(p.status,'review');assert.equal(p.messages.length,2);assert.equal(p.completedAt,undefined);
  restored.persist();const again=new Engine(engine.file,codex);assert.equal(again.state.projects[0].messages.length,2);
});

test('request routing continues an open project without a folder picker and completion prevents routing',async t=>{
  const {engine,codex}=fixture(t),id=engine.start('README 문구 수정');await done(engine);let picks=0;
  const start=createRequestStarter(engine,codex,async()=>{picks++;return {canceled:true};});
  assert.equal(await start('README 오타 수정',{projectId:id}),id);await done(engine);assert.equal(picks,0);
  await assert.rejects(start('README 수정',{projectId:id,chooseProjectFolder:true}),/폴더/);assert.equal(picks,0);
  engine.completeProject(id);await assert.rejects(start('README 수정',{projectId:id}),/검수 완료/);
});

test('a partial result stays open and a follow-up preserves its failed tasks',async t=>{
  const {engine}=fixture(t),work=engine.work.bind(engine);let fail=true;
  engine.work=async(...args)=>{if(fail){fs.mkdirSync(args[0].directory,{recursive:true});throw new Error('Verification failed');}return work(...args);};
  const id=engine.start('README 문구 수정');let p=await done(engine);assert.equal(p.status,'partial');fail=false;
  engine.continueProject(id,'README 오류를 수정해줘');p=await done(engine);assert.equal(p.status,'review');
  assert.equal(p.rounds[0].status,'partial');assert.equal(p.rounds[0].tasks[0].status,'failed');assert.match(p.rounds[0].report,/Verification failed/);
});

test('history write failures do not lose the review state or falsely complete a project',async t=>{
  const {engine}=fixture(t),id=engine.start('README 문구 수정');const p=await done(engine),write=fs.writeFileSync;
  fs.writeFileSync=(file,...args)=>{if(String(file).endsWith('PROJECT-HISTORY.md.tmp'))throw new Error('History write denied');return write(file,...args);};
  try{
    assert.throws(()=>engine.continueProject(id,'README 추가 수정'),/History write denied/);
    assert.equal(p.status,'review');assert.equal(p.roundNumber,1);assert.equal(p.messages.length,2);assert.equal(p.rounds.length,0);
    assert.throws(()=>engine.completeProject(id),/History write denied/);assert.equal(p.status,'review');assert.equal(p.userCompletedAt,undefined);
  }finally{fs.writeFileSync=write;}
});
