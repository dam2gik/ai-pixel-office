const {focusRoom}=require('./room-navigation.cjs');
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs'),layout=require('../electron/furniture-layout.json');
(async()=>{
  const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5187}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-furniture-design-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());engine.furnishOfficeOnce();let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));
    await page.exposeFunction('editOffice',(method,...args)=>({add:()=>engine.addFurniture(...args),move:()=>engine.moveFurniture(...args),remove:()=>engine.removeFurniture(...args),validate:()=>engine.validateFurniture(...args)})[method]());
    engine.on('state',state=>page.evaluate(s=>window.emitState?.(s),state).catch(()=>{}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),onState:fn=>window.emitState=fn,onLive:()=>{},onConnection:()=>{},onVisibility:()=>{},furniture:input=>window.editOffice('add',input),moveFurniture:(...args)=>window.editOffice('move',...args),removeFurniture:id=>window.editOffice('remove',id),validateFurniture:(...args)=>window.editOffice('validate',...args)};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));await page.goto('http://127.0.0.1:5187');await page.waitForFunction(()=>window.readOfficeRenderStats?.().furniture.length===29);
    await page.locator('#menuToggle').click();await page.locator('#decorate').click();
    assert.equal(await page.locator('.furniture-palette [data-furniture]').count(),Object.keys(layout.types).length);
    const id='design-1-welcome-lamp';await page.locator(`[data-furniture-id="${id}"]`).click();
    await page.locator('[data-dz="0.5"]').click();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.find(f=>f.id==='design-1-welcome-lamp').z===13.2);
    await page.locator('#rotateFurniture').click();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.find(f=>f.id==='design-1-welcome-lamp').rotation===90);
    await page.locator('#deleteFurniture').click();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.length===28);
    await page.locator('#addFurnitureArea').selectOption('garden');
    for(const type of ['armchair','ottoman','sideboard','coffeeTable','cafeSet','floorLamp','privacySofa','displayShelf']){
      await page.locator(`[data-furniture="${type}"]`).click();await page.locator('#deleteFurniture').waitFor();
      assert.equal(engine.state.furniture.at(-1).type,type);await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.length===29);
      await page.locator('#deleteFurniture').click();await page.waitForFunction(()=>window.readOfficeRenderStats().furniture.length===28);
    }
    engine.persist();const restored=new Engine(engine.file,new EventEmitter());assert.equal(restored.furnishOfficeOnce().added,0);assert.ok(!restored.state.furniture.some(f=>f.id===id));
    await page.locator('#closeFurnitureEditor').click();await focusRoom(page,'meeting');await page.waitForTimeout(400);fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/furniture-reference-lobby.png'});
    await focusRoom(page,'library');await page.waitForTimeout(400);await page.screenshot({path:'test-results/furniture-reference-library.png'});
    await page.setViewportSize({width:650,height:800});await page.locator('#menuToggle').click();await page.locator('#decorate').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);console.log('PASS: 29-piece furnishing preset, 14-item palette, all eight new models, editable preset furniture, persistence, no reseeding and mobile layout.');
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
