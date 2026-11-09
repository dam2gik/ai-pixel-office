const {focusRoom}=require('./room-navigation.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
(async()=>{
  const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5189}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-elevator-ui-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());engine.furnishOfficeOnce();let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:()=>{},onLive:()=>{},onConnection:()=>{},onVisibility:()=>{}};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));await page.goto('http://127.0.0.1:5189');await page.waitForFunction(()=>window.readOfficeRenderStats?.().frames>0);
    assert.equal(await page.locator('[data-elevator-floor]').count(),11);
    for(const floor of ['1','2','-1']){
      await page.locator(`[data-floor="${floor}"]`).click();await page.waitForTimeout(250);
      const stats=await page.evaluate(()=>window.readOfficeRenderStats());assert.equal(stats.architecture.filter(f=>f.type==='elevator').length,11);
      assert.equal(await page.locator(`[data-elevator-floor="${floor}"]`).isVisible(),true);
      if(floor==='-1')assert.ok(stats.basementBounds.maxX-stats.basementBounds.minX>55);
    }
    fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/basement-expanded.png'});
    await page.locator('#ambientToggle').click();await page.waitForFunction(()=>window.readOfficeRenderStats().elevator.phase!=='idle',{},{timeout:45000,polling:100});
    console.log('Observed employee call: elevator pickup/boarding has started.');
    await page.waitForFunction(()=>window.readOfficeRenderStats().elevator.phase==='travel',{},{timeout:30000,polling:50});
    const riding=await page.evaluate(()=>window.readOfficeRenderStats());assert.equal(riding.elevator.doorOpen,0);assert.ok(riding.people.some(p=>p.transport?.stage==='riding'));
    await page.waitForFunction(()=>window.readOfficeRenderStats().elevator.completedTrips>0,{},{timeout:30000,polling:50});
    await page.screenshot({path:'test-results/elevator-b1-arrival.png'});
    console.log('Observed elevator arrival; checking dining and mining activities.');
    await page.waitForFunction(()=>window.readOfficeRenderStats().people.some(p=>p.activity==='dine'&&p.mode==='resting'),{},{timeout:90000,polling:100});
    await focusRoom(page,'canteen');await page.waitForTimeout(250);
    const dining=await page.evaluate(()=>window.readOfficeRenderStats()),diner=dining.people.find(p=>p.activity==='dine'&&p.mode==='resting');
    assert.equal(diner.floor,-2);assert.equal(dining.characters.find(c=>c.id===diner.id).gear.tray,true);await page.screenshot({path:'test-results/canteen-dining.png'});
    console.log('Observed B2 employee eating with a tray.');
    await page.waitForFunction(()=>window.readOfficeRenderStats().people.some(p=>p.activity==='mine'&&p.mode==='resting'),{},{timeout:90000,polling:100});
    const mining=await page.evaluate(()=>window.readOfficeRenderStats()),miner=mining.people.find(p=>p.activity==='mine'&&p.mode==='resting');
    assert.ok(miner.floor<=-3);assert.equal(mining.characters.find(c=>c.id===miner.id).gear.helmet,true);assert.equal(mining.characters.find(c=>c.id===miner.id).gear.pickaxe,true);
    await focusRoom(page,miner.floor===-4?'deep-mine':'mine');await page.waitForTimeout(250);await page.screenshot({path:'test-results/mine-working.png'});
    await page.locator('#ambientToggle').click();assert.equal((await page.evaluate(()=>window.readOfficeRenderStats())).elevator.passenger,null);
    assert.deepEqual(errors,[]);console.log('PASS: eleven-floor elevator service and actual ride, B2 dining with tray, coal mining with helmet/pickaxe, and safe ambient pause.');
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
