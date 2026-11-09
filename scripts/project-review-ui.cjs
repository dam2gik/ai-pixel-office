// Browser UI + real local demo engine; no model usage or user data changes.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
const {createRequestStarter}=require('../electron/request-start.cjs');
(async()=>{
  const {createServer}=await import('vite');const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5183}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-review-ui-')),codex=new EventEmitter();codex.ready=true;
  const engine=new Engine(path.join(folder,'office.json'),codex,{demoDelay:15});engine.state.settings.workspace=folder;
  const start=createRequestStarter(engine,codex,async()=>({canceled:true,filePaths:[]}));let browser;
  try{
    browser=await chromium.launch({channel:process.env.PIXEL_OFFICE_TEST_BROWSER||'msedge',headless:true,timeout:15000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.exposeFunction('startOffice',(goal,options)=>start(goal,options));
    await page.exposeFunction('completeOffice',id=>engine.completeProject(id));
    engine.on('state',state=>{if(!page.isClosed())page.evaluate(s=>window.emitState?.(s),state).catch(()=>{});});
    await page.addInitScript(()=>{window.office={get:()=>window.getOffice(),start:(...args)=>window.startOffice(...args),completeProject:id=>window.completeOffice(id),onState:fn=>window.emitState=fn,onLive:()=>{},onConnection:()=>{},onVisibility:()=>{}};});
    await page.goto('http://127.0.0.1:5183');await page.waitForLoadState('networkidle');await page.waitForSelector('.team-chip');
    await page.locator('#mission').fill('작은 앱 만들기');await page.locator('#startMission').click();
    await page.waitForSelector('.status-badge.review');assert.equal(engine.state.projects.length,1);
    const id=engine.state.projects[0].id;assert.equal(await page.locator('.conversation-message').count(),2);
    assert.equal(await page.locator('#startMission').isEnabled(),true);assert.equal(await page.locator('#chooseProjectForMission').isDisabled(),true);
    await page.locator('#mission').fill('버튼 문구 수정해줘');await page.locator('#startMission').click();
    await page.waitForFunction(()=>document.querySelectorAll('.conversation-message').length===4&&!document.querySelector('#startMission').disabled);
    assert.equal(engine.state.projects.length,1);assert.equal(engine.state.projects[0].id,id);assert.equal(engine.state.projects[0].roundNumber,2);
    await page.reload();await page.waitForSelector('.team-chip');await page.locator('#quickTasks').click();await page.locator('[data-tab=conversation]').click();
    assert.equal(await page.locator('.conversation-message').count(),4);assert.equal(await page.locator('.status-badge.review').count(),1);
    await page.screenshot({path:'test-results/project-review.png'});
    await page.locator('#closeWork').click();await page.locator('.team-chip[data-agent=dev]').click();await page.locator('#previewAgentResults').click();
    await page.waitForSelector('.artifact-file');assert.ok(await page.locator('.artifact-file').count()>0);
    await page.locator('#closeModal').click();await page.locator('#closeInspector').click();
    await page.locator('#newProject').click();assert.equal(await page.locator('#chooseProjectForMission').isEnabled(),true);
    assert.equal(engine.state.projects[0].status,'review','switching the input target must not close the old project');
    await page.locator('#quickTasks').click();await page.locator('#projectSelect').selectOption(id);await page.locator('[data-tab=conversation]').click();
    assert.equal(await page.locator('#chooseProjectForMission').isDisabled(),true);
    await page.setViewportSize({width:650,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('#completeProject').click();await page.waitForSelector('.status-badge.completed');
    assert.ok(engine.state.projects[0].userCompletedAt);assert.equal(engine.state.projects[0].status,'completed');
    await page.reload();await page.waitForSelector('.team-chip');assert.equal(await page.locator('#chooseProjectForMission').isEnabled(),true);
    await page.locator('#mission').fill('README 문구 수정');await page.locator('#startMission').click();await page.waitForSelector('.status-badge.review');
    assert.equal(engine.state.projects.length,2);assert.notEqual(engine.state.projects[0].id,id);assert.deepEqual(errors,[]);
    console.log('PASS: AI result awaits review, same-project follow-up, conversation retention on reload, prior artifacts, explicit new project, manual completion, next project and mobile layout.');
  }finally{
    for(const c of engine.active.values())c.cancelled=true;
    const end=Date.now()+2000;while(engine.active.size&&Date.now()<end)await new Promise(r=>setTimeout(r,10));
    clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
