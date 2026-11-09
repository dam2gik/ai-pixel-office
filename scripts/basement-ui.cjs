const {focusRoom}=require('./room-navigation.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs');
(async()=>{
  const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5188}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-b1-ui-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.exposeFunction('editOffice',(method,...args)=>({add:()=>engine.addFurniture(...args),move:()=>engine.moveFurniture(...args),remove:()=>engine.removeFurniture(...args),validate:()=>engine.validateFurniture(...args)})[method]());
    engine.on('state',state=>page.evaluate(s=>window.emitState?.(s),state).catch(()=>{}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:fn=>window.emitState=fn,onLive:()=>{},onConnection:()=>{},onVisibility:()=>{},furniture:input=>window.editOffice('add',input),moveFurniture:(...args)=>window.editOffice('move',...args),removeFurniture:id=>window.editOffice('remove',id),validateFurniture:(...args)=>window.editOffice('validate',...args)};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));await page.goto('http://127.0.0.1:5188');await page.waitForFunction(()=>window.readOfficeRenderStats?.().frames>0);
    await page.locator('[data-floor="-1"]').click();assert.equal(await page.locator('.floor-tag').textContent(),'B1');
    fs.mkdirSync('test-results',{recursive:true});await page.waitForTimeout(450);await page.screenshot({path:'test-results/basement-overview.png'});
    for(const [room,label] of [['capsules','캡슐 수면실'],['golf','스크린골프'],['snackbar','스낵바'],['gym','헬스장']]){
      assert.ok((await page.locator(`[data-room=${room}]`).textContent()).includes(label));await focusRoom(page,room);
      assert.equal(await page.evaluate(()=>window.readOfficeRenderStats().floor),'-1');await page.waitForTimeout(350);await page.screenshot({path:`test-results/basement-${room}.png`});
    }
    await page.locator('#menuToggle').click();await page.locator('#decorate').click();assert.equal(await page.locator('#addFurnitureFloor').inputValue(),'-1');
    assert.ok((await page.locator('#addFurnitureArea option:checked').textContent()).includes('B1'));
    await page.locator('[data-furniture=armchair]').click();await page.locator('#furnitureX').waitFor();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.length===1);
    assert.equal(engine.state.furniture[0].floor,-1);await page.locator('#rotateFurniture').click();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture[0].rotation===90);
    const before=structuredClone(engine.state.furniture[0]),start=await page.evaluate(()=>window.readOfficeRenderStats().furniture[0].screen),end=await page.evaluate(f=>window.projectOfficePoint(f.x+.5,-5.35,f.z+.5),before);
    await page.mouse.move(start.x,start.y);await page.mouse.down();await page.mouse.move(end.x,end.y,{steps:12});await page.mouse.up();await page.waitForFunction(x=>window.readOfficeRenderStats().furniture[0].x!==x,before.x);
    await page.locator('#furnitureFloor').selectOption('1');await page.waitForFunction(()=>window.readOfficeRenderStats().furniture[0].floor===1);
    await page.locator('#furnitureFloor').selectOption('-1');await page.waitForFunction(()=>window.readOfficeRenderStats().furniture[0].floor===-1);engine.persist();
    assert.equal(new Engine(engine.file,new EventEmitter()).state.furniture[0].floor,-1);
    await page.locator('#closeFurnitureEditor').click();await page.setViewportSize({width:650,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    await page.locator('[data-floor="2"]').click();assert.equal(await page.evaluate(()=>window.readOfficeRenderStats().floor),'2');
    assert.deepEqual(errors,[]);console.log('PASS: B1 and four facility views, Korean names, B1 furniture editing/drag/rotation/floor transfer/persistence and mobile layout.');
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
