const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine,defaults,validatePlan}=require('../electron/engine.cjs');
const {executionPath,eligibleAgents,prioritize,handoff}=require('../electron/execution.cjs');
function fixture(t,plan) {
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-optimization-'));
  t.after(()=>fs.rmSync(folder,{recursive:true,force:true}));
  const codex=new EventEmitter();codex.ready=true;codex.send=()=>{};
  const calls=[];let thread=0,turn=0;
  codex.request=async(method,params)=>{
    calls.push({method,params});
    if(method==='thread/start')return {thread:{id:`thread-${++thread}`}};
    if(method==='turn/start'){
      const id=`turn-${++turn}`,text=path.basename(params.cwd)==='_plan'?JSON.stringify(plan):`Verified ${path.basename(params.cwd)}`;
      // Delay completion enough for the scheduler to launch all ready workers.
      setTimeout(()=>{
        codex.emit('notification',{method:'item/completed',params:{threadId:params.threadId,turnId:id,item:{id:`message-${id}`,type:'agentMessage',text}}});
        codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id,status:'completed'}}});
      },5);
      return {turn:{id}};
    }
    return {};
  };
  const engine=new Engine(path.join(folder,'office.json'),codex);
  engine.state.settings={...engine.state.settings,mode:'codex',workspace:folder};
  return {engine,codex,calls,folder};
}
async function done(engine) {
  const end=Date.now()+3000;
  while(engine.active.size){if(Date.now()>end)throw new Error('Timed out');await new Promise(r=>setTimeout(r,5));}
  return engine.state.projects[0];
}
const task=(id,agentId,dependsOn=[],eligibleAgentIds=[agentId])=>({id,title:id,agentId,eligibleAgentIds,instructions:`Do ${id}`,dependsOn});

test('auto bypasses planning only for bounded requests; explicit strategy overrides it',()=>{
  assert.equal(executionPath('README 오타 수정해줘'),'direct');
  assert.equal(executionPath('버튼 라벨을 저장으로 바꿔줘'),'direct');
  assert.equal(executionPath('전체 앱을 구현하고 README도 작성해줘'),'team');
  assert.equal(executionPath('README를 작성하고 여러 기능을 병렬 구현해줘'),'team');
  assert.equal(executionPath('README 문구 수정 후 QA가 독립 검증해줘'),'team');
  assert.equal(executionPath('할 일 관리 앱 만들어줘'),'team');
  assert.equal(executionPath('모호한 목표'),'team');
  assert.equal(executionPath('README 오타 수정','team'),'team');
  assert.equal(executionPath('복잡한 목표','solo'),'direct');
});

test('small work uses exactly one AI turn, retains verification and writes its report locally',async t=>{
  const {engine,calls}=fixture(t);
  engine.start('README 오타 수정해줘');const p=await done(engine);
  assert.equal(p.status,'review');assert.equal(p.executionPath,'direct');
  assert.equal(calls.filter(c=>c.method==='turn/start').length,1);
  assert.equal(calls.filter(c=>c.method==='thread/start').length,1);
  assert.match(calls.find(c=>c.method==='turn/start').params.input[0].text,/검증/);
  assert.equal(p.metrics.turns,1);assert.equal(p.metrics.peakParallel,1);assert.ok(p.metrics.totalMs>0);
  assert.match(p.report,/Verified direct/);assert.match(p.report,/별도의 PM 검토는 수행하지 않았습니다/);
  assert.equal(fs.readFileSync(path.join(p.directory,'PM-REPORT.md'),'utf8'),p.report);
  assert.ok(fs.existsSync(path.join(p.tasks[0].directory,'HANDOFF.md')));
});

test('a planner-selected single task also skips a redundant PM report turn',async t=>{
  const {engine,calls}=fixture(t,{title:'One task',tasks:[task('build','dev')]});
  engine.start('범위가 모호한 요청');const p=await done(engine);
  assert.equal(p.status,'review');assert.equal(p.executionPath,'direct');
  assert.equal(calls.filter(c=>c.method==='turn/start').length,2);assert.equal(p.metrics.turns,2);
  assert.match(p.report,/Verified build/);
});

test('team reuses worker and PM threads while switching cwd and retaining per-task write limits',async t=>{
  const plan={title:'Sequential specialist',tasks:[task('first','dev'),task('second','dev',['first'])]};
  const {engine,calls}=fixture(t,plan);engine.state.settings.executionStrategy='team';
  engine.start('전문 업무 두 단계');const p=await done(engine);assert.equal(p.status,'review');
  const starts=calls.filter(c=>c.method==='thread/start'),turns=calls.filter(c=>c.method==='turn/start');
  assert.equal(turns.length,4);assert.equal(starts.length,2);assert.equal(p.metrics.reusedThreads,2);
  assert.equal(turns[0].params.threadId,turns[3].params.threadId);
  assert.equal(turns[1].params.threadId,turns[2].params.threadId);
  assert.notEqual(turns[1].params.cwd,turns[2].params.cwd);
  assert.deepEqual(turns[2].params.sandboxPolicy.writableRoots,[p.tasks[1].directory]);
  assert.equal(turns[2].params.sandboxPolicy.networkAccess,false);
  assert.equal(turns[3].params.sandboxPolicy.type,'readOnly');assert.equal(turns[3].params.outputSchema,null);
  assert.ok(turns[0].params.outputSchema);assert.match(turns[2].params.input[0].text,/HANDOFF.md/);
  const old=p.tasks[0].threadId;engine.start('README 오타 수정해줘');const next=await done(engine);
  assert.notEqual(next.tasks[0].threadId,old,'different projects must not share context');
});

test('ready independent tasks are reassigned to approved idle staff and dependencies remain ordered',async t=>{
  const plan={title:'Parallel research',tasks:[task('a','dev',[],['dev','design']),task('b','dev',[],['dev','design']),task('combine','qa',['a','b'])]};
  const {engine}=fixture(t,plan);engine.start('독립 조사 후 통합');const p=await done(engine);
  assert.equal(p.status,'review');assert.equal(p.metrics.peakParallel,2);
  assert.deepEqual(p.tasks.slice(0,2).map(t=>t.agentId),['dev','design']);
  assert.equal(p.tasks[1].originalAgentId,'dev');
  assert.ok(Date.parse(p.tasks[2].startedAt)>=Date.parse(p.tasks[0].completedAt));
  assert.ok(Date.parse(p.tasks[2].startedAt)>=Date.parse(p.tasks[1].completedAt));
  assert.equal(engine.state.events.filter(e=>e.type==='reassign').length,1);
});

test('load balancing never assigns a task to an unqualified idle employee',async t=>{
  const plan={title:'Specialist only',tasks:[task('a','dev'),task('b','dev')]};
  const {engine}=fixture(t,plan);engine.start('전문 기능 구현');const p=await done(engine);
  assert.equal(p.status,'review');assert.equal(p.metrics.peakParallel,1);
  assert.ok(p.tasks.every(t=>t.agentId==='dev'));
  const agents=defaults().agents;
  assert.deepEqual(eligibleAgents({agentId:'dev'},agents).map(a=>a.id),['dev']);
  agents.push({id:'dev2',role:agents.find(a=>a.id==='dev').role});
  assert.deepEqual(eligibleAgents({agentId:'dev'},agents).map(a=>a.id),['dev','dev2']);
  assert.throws(()=>validatePlan({title:'Invalid',tasks:[{...task('a','dev'),eligibleAgentIds:['ghost']}]},agents));
});

test('critical chains start before unrelated tasks and handoff text is bounded without losing its path',()=>{
  const tasks=[task('unrelated','dev'),task('a','dev'),task('b','qa',['a']),task('c','qa',['b'])].map(t=>({...t,status:'queued'}));
  assert.equal(prioritize(tasks)[0].id,'a');
  const result=handoff({title:'Large output',result:'x'.repeat(100000),directory:'/artifacts/build'});
  assert.equal(result.result.length,1600);assert.equal(result.truncated,true);assert.ok(result.handoffFile.endsWith('HANDOFF.md'));
});

test('failed reused sessions are discarded and retries do not reuse a failed turn',async t=>{
  const {engine,codex,folder}=fixture(t);let starts=0,turns=0;
  codex.request=async(method,params)=>{
    if(method==='thread/start')return {thread:{id:`thread-${++starts}`}};
    if(method==='turn/start'){
      const id=`turn-${++turns}`;
      if(turns===2)codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id,status:'failed',error:{message:'failed worker'}}}});
      else codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id,status:'completed'}}});
      return {turn:{id}};
    }
  };
  const p={id:'p',directory:folder},control={cancelled:false,tasks:new Map()};
  await engine.execute(p,{id:'a',agentId:'dev'},control,'first');
  await assert.rejects(engine.execute(p,{id:'b',agentId:'dev'},control,'second'),/failed worker/);
  await engine.execute(p,{id:'c',agentId:'dev'},control,'retry');
  assert.equal(starts,2);assert.equal(engine.waiters.size,0);
});

test('direct failures remain partial and resume retries only the unfinished task in a new session',async t=>{
  const {engine,codex,calls}=fixture(t);const original=codex.request;
  let fail=true;
  codex.request=async(method,params)=>{
    if(method==='turn/start'&&fail){fail=false;calls.push({method,params});codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id:'failed',status:'failed',error:{message:'quota'}}}});return {turn:{id:'failed'}};}
    return original(method,params);
  };
  const pid=engine.start('README 오타 수정');let p=await done(engine);
  assert.equal(p.status,'partial');assert.match(p.report,/quota/);const old=p.tasks[0].threadId;
  engine.resume(pid);p=await done(engine);assert.equal(p.status,'review');assert.notEqual(p.tasks[0].threadId,old);
});

test('read-only and writing sessions stay separate and stale completion cannot finish a reused turn',async t=>{
  const {engine,codex,folder}=fixture(t);let starts=0,turns=0;
  codex.request=async(method,params)=>{
    if(method==='thread/start')return {thread:{id:`thread-${++starts}`}};
    if(method==='turn/start'){
      const id=`turn-${++turns}`;
      if(turns===3){
        codex.emit('notification',{method:'item/completed',params:{threadId:params.threadId,turnId:'turn-1',item:{id:'old',type:'agentMessage',text:'stale output'}}});
        codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id:'turn-1',status:'completed'}}});
      }
      codex.emit('notification',{method:'item/completed',params:{threadId:params.threadId,turnId:id,item:{id,type:'agentMessage',text:id}}});
      codex.emit('notification',{method:'turn/completed',params:{threadId:params.threadId,turn:{id,status:'completed'}}});
      return {turn:{id}};
    }
  };
  const p={id:'p',directory:folder},control={cancelled:false,tasks:new Map()};
  await engine.execute(p,{id:'_plan',agentId:'pm'},control,'plan',{},true);
  await engine.execute(p,{id:'build',agentId:'pm'},control,'write',null,false);
  assert.equal(await engine.execute(p,{id:'_report',agentId:'pm'},control,'report',null,true),'turn-3');
  assert.equal(starts,2);assert.equal(p.metrics.reusedThreads,1);
});

test('older settings default to auto and invalid execution modes are rejected',async t=>{
  const {engine,codex}=fixture(t);delete engine.state.settings.executionStrategy;engine.persist();
  const restored=new Engine(engine.file,codex);assert.equal(restored.state.settings.executionStrategy,'auto');
  restored.settings({mode:'codex',concurrency:3,executionStrategy:'solo'});assert.equal(restored.state.settings.executionStrategy,'solo');
  assert.throws(()=>restored.settings({mode:'codex',concurrency:3,executionStrategy:'unknown'}));
});

test('selected project folder scopes outputs and input context; following requests reuse it by default',async t=>{
  const {engine,calls,folder}=fixture(t);const selected=path.join(folder,'selected'),old=path.join(folder,'old');
  fs.mkdirSync(selected);fs.mkdirSync(old);fs.writeFileSync(path.join(selected,'README.md'),'Original');
  engine.state.settings.workspace=old;engine.start('README 오타 수정',selected);const p=await done(engine);
  assert.equal(p.projectDirectory,fs.realpathSync(selected));assert.equal(engine.state.settings.workspace,p.projectDirectory);
  assert.equal(path.dirname(path.dirname(p.directory)),p.projectDirectory);
  assert.ok(calls.find(c=>c.method==='turn/start').params.input[0].text.includes(p.projectDirectory));
  assert.equal(fs.readFileSync(path.join(selected,'README.md'),'utf8'),'Original');
  engine.start('README 문구 수정');const next=await done(engine);assert.equal(next.projectDirectory,p.projectDirectory);
  assert.throws(()=>engine.start('README 수정','relative/path'),/경로/);
  assert.throws(()=>engine.start('README 수정',path.join(selected,'README.md')),/폴더/);
});
