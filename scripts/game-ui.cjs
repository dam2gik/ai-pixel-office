const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events'),{Engine}=require('../electron/engine.cjs'),{createGame,stepGame}=require('../electron/game.cjs');
(async()=>{
  const {createServer}=await import('vite'),server=await createServer({configFile:false,server:{host:'127.0.0.1',port:5191}});await server.listen();
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'office-game-ui-')),engine=new Engine(path.join(folder,'office.json'),new EventEmitter());engine.state.game=createGame(13);let browser;
  try{
    browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
    const page=await browser.newPage({viewport:{width:1540,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    await page.exposeFunction('getOffice',()=>({state:engine.snapshot(),connection:{}}));await page.exposeFunction('runGame',cmd=>engine.gameCommand(cmd));
    engine.on('game',game=>page.evaluate(g=>window.emitGame?.(g),game).catch(()=>{}));
    await page.addInitScript(()=>{localStorage.setItem('pixelOffice.ambient','off');window.office={get:()=>window.getOffice(),gameCommand:c=>window.runGame(c),onGame:fn=>window.emitGame=fn,onState:()=>{},onLive:()=>{},onConnection:()=>{},onVisibility:()=>{}};});
    await page.route('**/favicon.ico',route=>route.fulfill({status:204,body:''}));await page.goto('http://127.0.0.1:5191');await page.waitForFunction(()=>window.readOfficeRenderStats?.().game.npcs===5);
    assert.equal(engine.state.agents.length,4);assert.ok((await page.locator('#gameShopButton').textContent()).includes('5 / 40'));await page.locator('#gameShopButton').click();
    // Fast-forward the real server simulation, not an inventory or gold grant.
    for(let i=0;i<7000;i++)stepGame(engine.state.game,1,engine.gameWorld,engine.state.furniture);engine.persist();engine.emit('game',engine.gameSnapshot());
    await page.waitForFunction(()=>!document.querySelector('#sellAll').disabled);await page.locator('#sellAll').click();await page.waitForFunction(()=>document.querySelector('#sellAll').disabled);
    assert.ok(engine.state.game.gold>25000);await page.locator('[data-game-tab=shop]').click();await page.locator('#npcHireFloor').selectOption('-6');
    for(let i=0;i<35;i++){await page.locator('#hireNpc').click();await page.waitForFunction(n=>window.readOfficeRenderStats().game.npcs===n,6+i);}
    assert.equal(engine.state.game.npcs.length,40);assert.equal(engine.state.agents.length,4);assert.equal(await page.locator('#hireNpc').isDisabled(),true);
    await page.locator('[data-game-tab=npcs]').click();assert.equal(await page.locator('.game-npc').count(),40);await page.locator('#closeGamePanel').click();
    await page.locator('[data-floor="-6"]').click();for(let i=0;i<45;i++)stepGame(engine.state.game,1,engine.gameWorld);engine.emit('game',engine.gameSnapshot());await page.waitForTimeout(300);
    const stats=await page.evaluate(()=>window.readOfficeRenderStats());assert.equal(stats.game.npcs,40);assert.ok(stats.game.pools<50);assert.ok(stats.drawCalls<180,'40 NPCs should share instanced draw calls');
    fs.mkdirSync('test-results',{recursive:true});await page.screenshot({path:'test-results/npc-mine-b6.png'});
    await page.locator('#gameShopButton').click();await page.locator('[data-game-tab=monsters]').click();await page.locator('#monsterCap').fill('2');await page.locator('#applyMonsterCap').click();await page.waitForFunction(()=>document.querySelector('#monsterCap').value==='2');
    assert.ok(engine.state.game.monsters.filter(m=>m.originFloor===-5).length<=2);assert.ok(engine.state.game.monsters.filter(m=>m.originFloor===-6).length<=2);
    await page.screenshot({path:'test-results/gold-shop-monsters.png'});await page.locator('#gameRunning').click();await page.waitForFunction(()=>document.querySelector('#gameRunning').textContent.includes('재개'));
    engine.persist();const restored=new Engine(engine.file,new EventEmitter());assert.equal(restored.state.game.npcs.length,40);assert.equal(restored.state.game.monsterCap,2);assert.equal(restored.state.game.gold,engine.state.game.gold);assert.equal(restored.state.game.running,false);
    await page.setViewportSize({width:650,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'test-results/gold-shop-mobile.png'});
    assert.deepEqual(errors,[]);console.log(JSON.stringify({pass:true,npcs:40,agents:4,gold:engine.state.game.gold,pools:stats.game.pools,drawCalls:stats.drawCalls,checks:'real mining/loot income, sale, 35 hires, full roster, spawn caps, persistence, mobile'}));
  }finally{engine.stopGameplay();clearTimeout(engine.changeTimer);await browser?.close();await server.close();fs.rmSync(folder,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
