const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
function fixture(t){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-events-test-'));
  const codex=new EventEmitter();codex.ready=true;
  const engine=new Engine(path.join(folder,'office.json'),codex,{liveFlushMs:5,logFlushMs:10});
  t.after(()=>{clearTimeout(engine.changeTimer);for(const w of engine.waiters.values())clearTimeout(w.item.liveTimer);fs.rmSync(folder,{recursive:true,force:true});});
  let writes=0;const persist=engine.persist.bind(engine);engine.persist=()=>{writes++;return persist();};
  const task={id:'work',agentId:'dev',logs:[]};
  const item={project:{id:'p'},task,threadId:'thread',messages:new Map(),pendingDeltas:new Map(),liveTimer:null,text:''};
  const completed=[];engine.waiters.set('thread',{item,resolve:text=>completed.push(text),reject:e=>completed.push(e.message)});
  engine.state.projects=[{id:'p',status:'running',tasks:[task]}];
  const notify=(method,params={})=>engine.onNotification({method,params:{threadId:'thread',...params}});
  return {engine,task,item,notify,completed,folder,writes:()=>writes};
}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

test('text bursts are batched and final content is emitted immediately without losing trailing chunks',async t=>{
  const {engine,task,notify,completed}=fixture(t),live=[];engine.on('live',event=>live.push(event));
  for(let i=0;i<1000;i++)notify('item/agentMessage/delta',{itemId:'message',delta:'x'});
  assert.equal(live.length,0);await delay(20);assert.equal(live.length,1);assert.equal(task.live.length,1000);
  notify('item/agentMessage/delta',{itemId:'message',delta:' trailing'});
  notify('turn/completed',{turn:{id:'turn',status:'completed'}});
  assert.equal(live.length,2);assert.equal(completed[0],'x'.repeat(1000)+' trailing');
  await delay(20);assert.equal(live.length,2);
});

test('final message replaces buffered fragments and PM live text is kept current',async t=>{
  const {engine,task,item,notify,completed}=fixture(t);task.id='_plan';const live=[];engine.on('live',event=>live.push(event));
  notify('item/agentMessage/delta',{itemId:'final',delta:'partial'});
  notify('item/completed',{item:{id:'final',type:'agentMessage',text:'complete plan'}});
  notify('turn/completed',{turn:{status:'completed'}});
  assert.equal(task.live,'complete plan');assert.equal(item.project.pmLive,'complete plan');assert.deepEqual(completed,['complete plan']);
  await delay(20);assert.equal(live.length,1);
});

test('buffered commentary keeps its order when the final message arrives before the flush',t=>{
  const {task,notify,completed}=fixture(t);
  notify('item/agentMessage/delta',{itemId:'commentary',delta:'Working'});
  notify('item/completed',{item:{id:'final',type:'agentMessage',text:'Verified final result'}});
  notify('turn/completed',{turn:{status:'completed'}});
  assert.equal(task.live,'Working\n\nVerified final result');assert.deepEqual(completed,['Verified final result']);
});

test('command log bursts produce one write; approvals flush pending logs synchronously',async t=>{
  const {engine,task,notify,writes}=fixture(t);
  for(let i=0;i<200;i++)notify('item/started',{item:{type:'commandExecution',command:`command ${i}`}});
  assert.equal(writes(),0);assert.equal(task.logs.length,80);
  await delay(25);assert.equal(writes(),1);
  notify('item/completed',{item:{type:'commandExecution',command:'final command'}});
  engine.onRequest({id:1,method:'item/commandExecution/requestApproval',params:{threadId:'thread'}});
  assert.equal(writes(),2);assert.equal(engine.changeTimer,null);
  const saved=JSON.parse(fs.readFileSync(engine.file,'utf8'));
  assert.ok(saved.projects[0].tasks[0].logs.at(-1).includes('final command'));
  await delay(25);assert.equal(writes(),2);
});

test('explicit persistence cancels scheduled writes and a failed background write is reported',async t=>{
  const {engine,notify,writes}=fixture(t);
  notify('item/started',{item:{type:'commandExecution',command:'test'}});engine.persist();
  await delay(25);assert.equal(writes(),1);
  const failures=[];engine.on('persistenceError',message=>failures.push(message));
  engine.persist=()=>{throw new Error('Disk full');};engine.queueChanged();await delay(25);
  assert.deepEqual(failures,['Disk full']);assert.equal(engine.changeTimer,null);
});

test('separate worker streams cannot overwrite each other',async t=>{
  const {engine,notify}=fixture(t);const other={project:{id:'p'},task:{id:'other'},threadId:'other',messages:new Map(),pendingDeltas:new Map(),liveTimer:null};
  engine.waiters.set('other',{item:other,resolve:()=>{}});
  const live=[];engine.on('live',e=>live.push(e));
  notify('item/agentMessage/delta',{itemId:'message',delta:'First worker'});
  engine.onNotification({method:'item/agentMessage/delta',params:{threadId:'other',itemId:'message',delta:'Second worker'}});
  await delay(20);assert.equal(live.length,2);assert.deepEqual(live.map(e=>e.text).sort(),['First worker','Second worker']);
});
