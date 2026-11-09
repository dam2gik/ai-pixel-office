const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {EventEmitter}=require('node:events');
const {Engine}=require('../electron/engine.cjs');
const {normalizeAppearance,applyAppearance}=require('../electron/appearance.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'office-appearance-')),codex=new EventEmitter();t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));return {engine:new Engine(path.join(dir,'office.json'),codex),codex};}
test('legacy characters preserve their original clothing and hair colors',t=>{
  const {engine,codex}=fixture(t),old=engine.state.agents.map(({appearance,...agent})=>agent);engine.state.agents=old;engine.persist();
  const restored=new Engine(engine.file,codex);assert.equal(restored.state.agents[0].appearance.shirtColor,old[0].color);
  assert.equal(restored.state.agents[1].appearance.hairColor,'#403c42');assert.equal(restored.state.agents[1].appearance.skinColor,'#edc6a3');
  assert.equal(normalizeAppearance({color:'invalid',appearance:{skinColor:'url(test)',hairStyle:'unknown'}}).skinColor,'#edc6a3');
});
test('appearance edits persist, preserve employee identity and affect only that employee',t=>{
  const {engine,codex}=fixture(t),before=structuredClone(engine.state.agents),patch={hairStyle:'ponytail',hairColor:'#332211',skinColor:'#b77d59',shirtColor:'#739ca3',pantsColor:'#445566',shoeColor:'#eeeecc',outfit:'jacket',accessory:'glasses'};
  engine.updateAppearance('dev',patch);const agent=engine.state.agents[1];assert.deepEqual(agent.appearance,patch);assert.equal(agent.color,patch.shirtColor);
  for(const key of ['id','name','role','instructions'])assert.equal(agent[key],before[1][key]);assert.deepEqual(engine.state.agents[0],before[0]);
  const restored=new Engine(engine.file,codex);assert.deepEqual(restored.state.agents[1].appearance,patch);
});
test('invalid appearance values and business fields cannot be written through the appearance API',t=>{
  const {engine}=fixture(t),before=structuredClone(engine.state.agents);
  for(const patch of [{hairStyle:'script'},{shirtColor:'red'},{skinColor:'#fff'},{role:'PM'},{id:'other'},{outfit:'unknown'},{accessory:'hat'},{constructor:'prototype'},null,[]])assert.throws(()=>engine.updateAppearance('dev',patch));
  assert.deepEqual(engine.state.agents,before);assert.throws(()=>engine.updateAppearance('missing',{}));
  assert.equal(applyAppearance(engine.state.agents[0],{accessory:'headphones'}).hairColor,before[0].appearance.hairColor);
});
test('new employees support custom appearances and editing an active employee leaves its work untouched',t=>{
  const {engine}=fixture(t),id=engine.addAgent({name:'미루',role:'개발자',color:'#aabbcc',instructions:'Implement carefully',appearance:{hairStyle:'bob',accessory:'headphones'}});
  assert.equal(engine.state.agents.at(-1).appearance.hairStyle,'bob');assert.equal(engine.state.agents.at(-1).appearance.shirtColor,'#aabbcc');
  const control={cancelled:false,tasks:new Map([['task',{agentId:id}]])};engine.active.set('project',control);engine.state.projects=[{id:'project',status:'running',tasks:[{id:'task',agentId:id,status:'running',result:'in progress'}]}];const before=structuredClone(engine.state.projects);
  engine.updateAppearance(id,{outfit:'hoodie'});assert.equal(engine.active.get('project'),control);assert.deepEqual(engine.state.projects,before);
});
