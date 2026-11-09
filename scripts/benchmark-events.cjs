// Local event replay only: no Codex connection or model usage.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {EventEmitter}=require('node:events');
const {performance}=require('node:perf_hooks');
const {Engine}=require('../electron/engine.cjs');
(async()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-events-bench-'));
  const codex=new EventEmitter();codex.ready=true;
  const engine=new Engine(path.join(folder,'office.json'),codex);
  const metrics={scenario:'local replay: 1000 text chunks, 100 commands, 10 archived projects',writes:0,stateEvents:0,stateBytes:0,liveEvents:0,liveBytes:0};
  const persist=engine.persist.bind(engine);
  engine.persist=()=>{metrics.writes++;return persist();};
  engine.on('state',s=>{metrics.stateEvents++;metrics.stateBytes+=Buffer.byteLength(JSON.stringify(s));});
  engine.on('live',s=>{metrics.liveEvents++;metrics.liveBytes+=Buffer.byteLength(JSON.stringify(s));});
  engine.state.projects=Array.from({length:10},(_,i)=>({id:`archive-${i}`,status:'completed',tasks:Array.from({length:4},(_,j)=>({id:`task-${j}`,status:'completed',result:'x'.repeat(8192)}))}));
  const project={id:'current',directory:folder},task={id:'build',agentId:'dev',logs:[]};
  engine.state.projects.unshift({...project,status:'running',tasks:[task]});
  codex.request=async(method)=>{
    if(method==='thread/start')return {thread:{id:'thread'}};
    if(method==='turn/start'){
      for(let i=0;i<1000;i++){
        codex.emit('notification',{method:'item/agentMessage/delta',params:{threadId:'thread',itemId:'message',delta:'working on artifact step '.repeat(2)}});
        if(i%10===0)for(const method of ['item/started','item/completed'])codex.emit('notification',{method,params:{threadId:'thread',item:{type:'commandExecution',command:`inspect file ${i}`}}});
      }
      codex.emit('notification',{method:'item/completed',params:{threadId:'thread',item:{id:'message',type:'agentMessage',text:'Verified final result'}}});
      codex.emit('notification',{method:'turn/completed',params:{threadId:'thread',turn:{id:'turn',status:'completed'}}});
      return {turn:{id:'turn'}};
    }
  };
  try{
    const start=performance.now();
    const result=await engine.execute(project,task,{cancelled:false,tasks:new Map()},'Benchmark');
    engine.persist();
    metrics.elapsedMs=Number((performance.now()-start).toFixed(2));metrics.finalResult=result;metrics.retainedLogs=task.logs.length;
    if(process.argv[2]){const output=path.resolve(process.argv[2]);fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(metrics,null,2));}
    console.log(JSON.stringify(metrics,null,2));
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
