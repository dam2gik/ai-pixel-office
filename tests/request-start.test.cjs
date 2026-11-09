const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createRequestStarter}=require('../electron/request-start.cjs');
function fixture(){
  const calls=[];let picks=0;
  const engine={state:{settings:{mode:'demo',workspace:'/default'}},validateStart:goal=>{if(!goal)throw new Error('Invalid goal');},start:(...args)=>{calls.push(args);return 'project';}};
  const codex={request:async()=>({account:{type:'chatgpt'}})};
  return {engine,codex,calls,choose:async()=>{picks++;return {canceled:false,filePaths:['/selected']};},picks:()=>picks};
}
test('normal requests keep the configured folder and never open a picker',async()=>{
  const f=fixture(),start=createRequestStarter(f.engine,f.codex,f.choose);
  assert.equal(await start('first'),'project');assert.equal(await start('second',{chooseProjectFolder:false}),'project');
  assert.equal(f.picks(),0);assert.deepEqual(f.calls,[['first'],['second']]);
});
test('only an explicit folder-change option opens the picker',async()=>{
  const f=fixture(),start=createRequestStarter(f.engine,f.codex,f.choose);
  await start('choose',{chooseProjectFolder:true});assert.equal(f.picks(),1);assert.deepEqual(f.calls,[['choose','/selected']]);
});
test('canceling a folder change starts nothing and a later ordinary request still works',async()=>{
  const f=fixture(),start=createRequestStarter(f.engine,f.codex,async()=>({canceled:true,filePaths:[]}));
  assert.equal(await start('cancel',{chooseProjectFolder:true}),null);assert.equal(f.calls.length,0);
  assert.equal(await start('retry'),'project');assert.deepEqual(f.calls,[['retry']]);
});
test('duplicate requests cannot open another picker while one request is pending',async()=>{
  const f=fixture();let finish;
  const start=createRequestStarter(f.engine,f.codex,()=>new Promise(resolve=>finish=resolve));
  const pending=start('first',{chooseProjectFolder:true});
  await assert.rejects(start('duplicate',{chooseProjectFolder:true}));
  finish({canceled:true,filePaths:[]});assert.equal(await pending,null);
  assert.equal(await start('next'),'project');
});
test('invalid input and unauthenticated requests fail before opening a picker',async()=>{
  const f=fixture(),start=createRequestStarter(f.engine,f.codex,f.choose);
  await assert.rejects(start('',{chooseProjectFolder:true}),/Invalid goal/);assert.equal(f.picks(),0);
  f.engine.state.settings.mode='codex';f.codex.request=async()=>({account:{type:'apiKey'}});
  await assert.rejects(start('valid',{chooseProjectFolder:true}),/ChatGPT/);assert.equal(f.picks(),0);
});
