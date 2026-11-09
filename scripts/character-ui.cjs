const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
(async()=>{
  const {createServer}=await import('vite');const server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5185}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-character-ui-')),codex=new EventEmitter(),engine=new Engine(path.join(folder,'office.json'),codex);let browser;
  try{
    browser=await chromium.launch({channel:process.env.PIXEL_OFFICE_TEST_BROWSER||'msedge',headless:true,timeout:15000,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));await page.exposeFunction('styleOffice',(id,patch)=>engine.updateAppearance(id,patch));
    engine.on('state',state=>page.evaluate(s=>window.emitState?.(s),state).catch(()=>{}));
    await page.addInitScript(()=>{window.office={get:()=>window.getOffice(),onState:fn=>window.emitState=fn,onLive:()=>{},onConnection:()=>{},onVisibility:()=>{},updateAppearance:(...args)=>window.styleOffice(...args)};});
    await page.goto('http://127.0.0.1:5185');await page.waitForLoadState('networkidle');await page.waitForSelector('.team-chip');await page.locator('#ambientToggle').click();await page.waitForTimeout(250);
    const original=structuredClone(engine.state.agents),people=await page.evaluate(()=>window.readOfficeRenderStats().people);
    await page.locator('.team-chip[data-agent=dev]').click();await page.locator('#customizeCharacter').click();await page.waitForSelector('#characterPreview canvas');
    await page.locator('[name=hairStyle]').selectOption('bob');await page.locator('[name=accessory]').selectOption('glasses');assert.deepEqual(engine.state.agents,original);
    await page.locator('#resetCharacter').click();assert.equal(await page.locator('[name=hairStyle]').inputValue(),original[1].appearance.hairStyle);
    const desired={hairStyle:'spiky',hairColor:'#443366',skinColor:'#b77d59',shirtColor:'#91b9ad',pantsColor:'#535774',shoeColor:'#f4dcb9',outfit:'hoodie',accessory:'headphones'};
    for(const [key,value] of Object.entries(desired)){const field=page.locator(`[name=${key}]`);if(['hairStyle','outfit','accessory'].includes(key))await field.selectOption(value);else await field.fill(value);}
    await page.locator('#turnCharacter').click();await page.screenshot({path:'test-results/character-customizer.png'});
    await page.locator('#saveCharacter').click();await page.locator('#modal').waitFor({state:'hidden'});
    assert.deepEqual(engine.state.agents[1].appearance,desired);assert.deepEqual(engine.state.agents[0],original[0]);
    await page.waitForFunction(()=>window.readOfficeRenderStats().characters.find(a=>a.id==='dev').appearance.accessory==='headphones');
    assert.deepEqual(await page.evaluate(()=>window.readOfficeRenderStats().people),people);
    assert.equal(await page.locator('.team-chip[data-agent=dev] .hair-spiky.accessory-headphones.outfit-hoodie').count(),1);
    await page.locator('#customizeCharacter').click();await page.locator('[name=hairStyle]').selectOption('bald');await page.locator('#cancelCharacter').click();await page.locator('#modal').waitFor({state:'hidden'});assert.deepEqual(engine.state.agents[1].appearance,desired);
    await page.reload();await page.waitForSelector('.team-chip');assert.deepEqual(new Engine(engine.file,codex).state.agents[1].appearance,desired);
    await page.locator('#menuToggle').click();await page.locator('#customizeSelected').click();await page.waitForSelector('#characterPreview canvas');await page.locator('#randomCharacter').click();await page.locator('#resetCharacter').click();
    await page.setViewportSize({width:650,height:800});await page.waitForTimeout(150);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});
    assert.deepEqual(errors,[]);console.log('PASS: 3D preview, hairstyle/clothing/accessories/colors, reset, save, cancel, matching world/portraits, unchanged movement, persistence, menu entry and mobile layout.');
  }finally{clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
