const {focusRoom}=require('./room-navigation.cjs');
// Render the actual scene and catch shader errors (which do not raise pageerror).
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
(async()=>{
  const {createServer}=await import('vite');const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5186}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-detail-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());engine.furnishOfficeOnce();let browser;
  try{
    browser=await chromium.launch({channel:process.env.PIXEL_OFFICE_TEST_BROWSER||'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:()=>{},onLive:()=>{},onConnection:()=>{},onVisibility:()=>{}};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
    await page.goto('http://127.0.0.1:5186');await page.waitForFunction(()=>window.readOfficeRenderStats?.().frames>0);await page.waitForTimeout(800);
    fs.mkdirSync('test-results',{recursive:true});const metrics=[];
    for(const floor of ['-6','-5','-4','-3','-2','-1','1','2','3','4','5','all']){
      await page.locator(`[data-floor="${floor}"]`).click();await page.waitForTimeout(600);
      const stats=await page.evaluate(()=>window.readOfficeRenderStats());
      assert.equal(stats.surfaceDetail,true);assert.equal(stats.carvedEdges,true);assert.equal(stats.shadowSize,2048);assert.equal(stats.pixelRatio,1.5);
      assert.equal(stats.architecture.filter(f=>f.type==='door').length,25);
      assert.ok(stats.architecture.filter(f=>f.type==='window-wall').length>=3);
      assert.ok(stats.drawCalls<650,`draw calls: ${stats.drawCalls}`);assert.ok(stats.triangles<(floor==='all'?700000:450000),`triangles: ${stats.triangles}`);
      assert.deepEqual(stats.visibleFloors,floor==='all'?[-6,-5,-4,-3,-2,-1,1,2,3,4,5]:[Number(floor)]);
      metrics.push({floor,drawCalls:stats.drawCalls,triangles:stats.triangles,geometries:stats.geometries,pixelRatio:stats.pixelRatio});
      await page.screenshot({path:`test-results/visual-detail-${floor}.png`});
    }
    const before=await page.evaluate(()=>window.readOfficeRenderStats().frames);await page.waitForTimeout(1000);const after=await page.evaluate(()=>window.readOfficeRenderStats().frames);assert.ok(after-before<4,'idle rendering should stop');
    await focusRoom(page,'garden');await page.waitForTimeout(500);await page.screenshot({path:'test-results/visual-detail-garden.png'});
    const hidpi=await browser.newPage({viewport:{width:900,height:650},deviceScaleFactor:2});
    await hidpi.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));
    hidpi.on('pageerror',e=>errors.push(e.message));hidpi.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await hidpi.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await hidpi.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:()=>{},onLive:()=>{},onConnection:()=>{},onVisibility:()=>{}};});
    await hidpi.goto('http://127.0.0.1:5186');await hidpi.waitForFunction(()=>window.readOfficeRenderStats?.().frames>0);
    assert.equal(await hidpi.evaluate(()=>window.readOfficeRenderStats().pixelRatio),2);await hidpi.close();
    assert.deepEqual(errors,[]);console.log(JSON.stringify({metrics,idleFrames:after-before,shaderErrors:errors.length}));
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
