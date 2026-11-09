const {focusRoom}=require('./room-navigation.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
(async()=>{
  const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5190}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-deep-ui-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.exposeFunction('editOffice',(method,...args)=>({add:()=>engine.addFurniture(...args),move:()=>engine.moveFurniture(...args),remove:()=>engine.removeFurniture(...args),validate:()=>engine.validateFurniture(...args)})[method]());
    engine.on('state',state=>page.evaluate(s=>window.emitState?.(s),state).catch(()=>{}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:fn=>window.emitState=fn,onLive:()=>{},onConnection:()=>{},onVisibility:()=>{},furniture:input=>window.editOffice('add',input),moveFurniture:(...args)=>window.editOffice('move',...args),removeFurniture:id=>window.editOffice('remove',id),validateFurniture:(...args)=>window.editOffice('validate',...args)};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));await page.goto('http://127.0.0.1:5190');await page.waitForFunction(()=>window.readOfficeRenderStats?.().frames>0);
    assert.equal(await page.locator('[data-elevator-floor]').count(),11);fs.mkdirSync('test-results',{recursive:true});
    for(const [floor,room,label] of [[-2,'canteen','구내식당'],[-3,'mine','채굴'],[-4,'deep-mine','심층']]){
      await page.locator(`[data-floor="${floor}"]`).click();assert.equal(await page.locator('.floor-tag').textContent(),`B${-floor}`);
      assert.ok((await page.locator(`[data-room="${room}"]`).textContent()).includes(label));await focusRoom(page,room);assert.equal((await page.evaluate(()=>window.readOfficeRenderStats())).floor,String(floor));
      await page.waitForTimeout(350);await page.screenshot({path:`test-results/deep-campus-b${-floor}.png`});
    }
    await page.locator('#menuToggle').click();await page.locator('#decorate').click();assert.equal(await page.locator('#addFurnitureFloor').inputValue(),'-4');
    await page.locator('[data-furniture=armchair]').click();await page.locator('#furnitureX').waitFor();assert.equal(engine.state.furniture[0].floor,-4);
    for(const floor of ['-3','-2','1','2','-4']){await page.locator('#furnitureFloor').selectOption(floor);await page.waitForFunction(f=>window.readOfficeRenderStats().furniture[0].floor===f,Number(floor));}
    engine.persist();assert.equal(new Engine(engine.file,new EventEmitter()).state.furniture[0].floor,-4);
    await page.locator('#closeFurnitureEditor').click();await page.setViewportSize({width:650,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const floor of ['-2','-3','-4']){await page.locator(`[data-floor="${floor}"]`).click();assert.equal((await page.evaluate(()=>window.readOfficeRenderStats())).floor,floor);}
    assert.deepEqual(errors,[]);console.log('PASS: B2 canteen and B3/B4 mines, eleven elevator landings, Korean labels, deep furniture floor transfers/persistence, and mobile floor controls.');
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
