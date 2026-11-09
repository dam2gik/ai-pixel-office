const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { Engine, defaults, validatePlan } = require('../electron/engine.cjs');
function fixture(options = {}) {
  const folder = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'pixel-office-test-'));
  const codex = new EventEmitter(); codex.ready = true; codex.send = () => {};
  const engine = new Engine(path.join(folder, 'office.json'), codex, { demoDelay: 8, ...options });
  return { engine, codex, folder };
}
async function until(check, timeout = 3000) {
  const start = Date.now(); while (!check()) { if (Date.now() - start > timeout) throw new Error('Timed out'); await new Promise(r => setTimeout(r, 5)); }
}
test('validates unknown agents, missing dependencies, duplicate ids and cycles', () => {
  const agents = defaults().agents;
  const task = { id: 'a', agentId: 'dev', title: 'Build', instructions: 'Do it', dependsOn: [] };
  assert.doesNotThrow(() => validatePlan({ title:'x', tasks:[task] }, agents));
  assert.throws(() => validatePlan({ title:'x', tasks:[{...task, agentId:'ghost'}] }, agents));
  assert.throws(() => validatePlan({ title:'x', tasks:[{...task, dependsOn:['missing']}] }, agents));
  assert.throws(() => validatePlan({ title:'x', tasks:[task,task] }, agents));
  assert.throws(() => validatePlan({ title:'x', tasks:[{...task,dependsOn:['b']},{...task,id:'b',dependsOn:['a']}] }, agents));
  assert.throws(() => validatePlan({ title:'x', tasks:[{...task,id:'../escape'}] }, agents));
});
test('parallel tasks pass predecessor outputs, then PM reports after all tasks', async () => {
  const {engine}=fixture(); let max=0;
  engine.on('state', s=>{max=Math.max(max,s.projects[0]?.tasks.filter(t=>t.status==='running').length||0);});
  const pid=engine.start('작은 앱 만들기'); await until(()=>!engine.active.size);
  const p=engine.state.projects[0];assert.equal(p.id,pid);assert.equal(p.status,'review');assert.equal(max,2);
  const [design,build,integrate,verify]=p.tasks;
  assert.ok(Date.parse(integrate.startedAt)>=Date.parse(design.completedAt));assert.ok(Date.parse(integrate.startedAt)>=Date.parse(build.completedAt));
  assert.ok(Date.parse(verify.startedAt)>=Date.parse(integrate.completedAt));assert.match(integrate.result,/화면과 사용자 흐름 설계/);
  assert.match(p.report,/시뮬레이션/);assert.equal(engine.state.events.filter(e=>e.type==='handoff').length,3);
  assert.equal(engine.state.events.at(-1).type,'report');
});
test('global concurrency cap is honored', async () => {
  const {engine}=fixture();engine.state.settings.concurrency=1;let max=0;
  engine.on('state',s=>{max=Math.max(max,s.projects[0]?.tasks.filter(t=>t.status==='running').length||0);});
  engine.start('serial');await until(()=>!engine.active.size);assert.equal(max,1);
});
test('one worker never receives overlapping tasks', async()=>{
  const {engine}=fixture();engine.state.agents=engine.state.agents.filter(a=>['pm','dev'].includes(a.id));
  let collision=false;engine.on('state',s=>{const workers=s.projects[0]?.tasks.filter(t=>t.status==='running').map(t=>t.agentId)||[];if(new Set(workers).size!==workers.length)collision=true;});
  engine.start('single worker');await until(()=>!engine.active.size);assert.equal(collision,false);assert.equal(engine.state.projects[0].status,'review');
});
test('failed predecessors block consumers and PM reports partial',async()=>{
  const {engine}=fixture();const original=engine.work.bind(engine);
  engine.work=async(p,t,c)=>{if(t.id==='build')throw new Error('Build failed');return original(p,t,c);};
  engine.start('failure');await until(()=>!engine.active.size);const p=engine.state.projects[0];
  assert.equal(p.status,'partial');assert.equal(p.tasks.find(t=>t.id==='integrate').status,'blocked');assert.equal(p.tasks.find(t=>t.id==='verify').status,'blocked');assert.ok(p.report);
});
test('steering reaches running worker; cancellation and resume finish pending work',async()=>{
  const {engine}=fixture({demoDelay:20});const pid=engine.start('steer and stop');
  await until(()=>engine.state.projects[0].tasks.some(t=>t.status==='running'));
  await engine.steer(pid,'dev','접근성을 우선해줘');assert.equal(engine.state.projects[0].tasks.find(t=>t.id==='build').corrections[0],'접근성을 우선해줘');
  await engine.stop(pid);await until(()=>!engine.active.size);assert.equal(engine.state.projects[0].status,'interrupted');assert.equal(engine.state.projects[0].report,'');
  engine.resume(pid);await until(()=>!engine.active.size);assert.equal(engine.state.projects[0].status,'review');
});
test('restart marks in-flight work interrupted and preserves completed output',async()=>{
  const {engine,codex}=fixture();engine.state.projects=[{id:'p',status:'running',tasks:[{id:'a',status:'completed',result:'saved'},{id:'b',status:'running'}]}];engine.persist();
  const restored=new Engine(engine.file,codex);assert.equal(restored.state.projects[0].status,'interrupted');assert.equal(restored.state.projects[0].tasks[0].result,'saved');assert.equal(restored.state.projects[0].tasks[1].status,'interrupted');
});
test('Codex completion before turn/start response is not lost; final message excludes commentary',async()=>{
  const {engine,codex,folder}=fixture();const p={id:'p',directory:folder};const control={cancelled:false,tasks:new Map()};
  codex.request=async(method)=>{if(method==='thread/start')return {thread:{id:'thr'}};if(method==='turn/start'){
    codex.emit('notification',{method:'item/completed',params:{threadId:'thr',item:{id:'comment',type:'agentMessage',text:'working'}}});
    codex.emit('notification',{method:'item/completed',params:{threadId:'thr',item:{id:'final',type:'agentMessage',text:'final output'}}});
    codex.emit('notification',{method:'turn/completed',params:{threadId:'thr',turn:{id:'t',status:'completed'}}});return {turn:{id:'t'}};
  }};
  assert.equal(await engine.execute(p,{id:'task',agentId:'dev'},control,'Do work'),'final output');assert.equal(engine.waiters.size,0);
});
test('Codex turn failures are never reported as completed',async()=>{
  const {engine,codex,folder}=fixture();codex.request=async(method)=>{if(method==='thread/start')return {thread:{id:'t'}};if(method==='turn/start'){codex.emit('notification',{method:'turn/completed',params:{threadId:'t',turn:{status:'failed',error:{message:'quota reached'}}}});return {turn:{id:'turn'}};}};
  await assert.rejects(engine.execute({id:'p',directory:folder},{id:'a',agentId:'dev'},{cancelled:false,tasks:new Map()},'work'),/quota reached/);
});
test('unsupported server requests fail closed; approvals require explicit response',()=>{
  const {engine,codex}=fixture();const sent=[];codex.send=m=>sent.push(m);
  engine.onRequest({id:1,method:'unsupported',params:{}});assert.equal(sent[0].error.code,-32601);
  engine.onRequest({id:2,method:'item/commandExecution/requestApproval',params:{threadId:'t'}});assert.equal(sent.length,1);
  engine.approve('2',false);assert.equal(sent[1].result.decision,'decline');assert.equal(engine.approvals.size,0);
});
