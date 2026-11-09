const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { listArtifacts, readArtifact } = require('../electron/artifacts.cjs');
async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'office-artifact-'));
  t.after(()=>fs.rm(directory,{recursive:true,force:true}));
  const root = path.join(directory,'project'), work = path.join(root,'build');
  await fs.mkdir(work,{recursive:true});
  const state = { agents:[{id:'dev'},{id:'qa'}], projects:[{id:'p',mode:'codex',directory:root,tasks:[{id:'build',agentId:'dev',title:'Build',directory:work}]}] };
  return {state,directory,root,work};
}
test('lists nested artifacts, excludes dependency trees and reads text, HTML and images',async t=>{
  const {state,work}=await fixture(t);
  await fs.mkdir(path.join(work,'src'));await fs.mkdir(path.join(work,'node_modules'));
  await fs.writeFile(path.join(work,'src','notes.md'),'# 결과\n완료');
  await fs.writeFile(path.join(work,'index.html'),'<h1>Preview</h1>');
  await fs.writeFile(path.join(work,'image.png'),Buffer.from([137,80,78,71]));
  await fs.writeFile(path.join(work,'node_modules','skip.js'),'ignored');
  const {files}=await listArtifacts(state,'p','dev');assert.equal(files.length,3);
  assert.ok(files.some(f=>f.path==='src/notes.md'&&f.kind==='text'));
  assert.equal((await readArtifact(state,'p','dev','build','src/notes.md')).text,'# 결과\n완료');
  assert.equal((await readArtifact(state,'p','dev','build','index.html')).kind,'html');
  assert.match((await readArtifact(state,'p','dev','build','image.png')).data,/^data:image\/png;base64,/);
});
test('rejects traversal, absolute paths, foreign tasks and escaped task roots',async t=>{
  const {state,root,directory}=await fixture(t);await fs.writeFile(path.join(root,'private.txt'),'secret');
  await assert.rejects(readArtifact(state,'p','dev','build','../private.txt'));
  await assert.rejects(readArtifact(state,'p','dev','build',path.join(root,'private.txt')));
  await assert.rejects(readArtifact(state,'p','qa','build','file.txt'));
  assert.deepEqual((await listArtifacts(state,'p','qa')).files,[]);
  state.projects[0].tasks[0].directory=directory;
  await assert.rejects(listArtifacts(state,'p','dev'));
});
test('rejects symlink escapes and skips linked files in the list',async t=>{
  const {state,work,root}=await fixture(t);await fs.mkdir(path.join(root,'other'));await fs.writeFile(path.join(root,'other','secret.md'),'secret');
  try { await fs.symlink(path.join(root,'other'),path.join(work,'linked'),process.platform==='win32'?'junction':'dir'); }
  catch(e) { if(e.code==='EPERM'){t.skip('Symlink creation unavailable');return;}throw e; }
  assert.deepEqual((await listArtifacts(state,'p','dev')).files,[]);
  await assert.rejects(readArtifact(state,'p','dev','build','linked/secret.md'));
});
test('large files and unsupported binaries produce a preview message',async t=>{
  const {state,work}=await fixture(t);await fs.writeFile(path.join(work,'large.txt'),Buffer.alloc(512*1024+1));await fs.writeFile(path.join(work,'app.exe'),'binary');
  assert.equal((await readArtifact(state,'p','dev','build','large.txt')).kind,'unsupported');
  assert.equal((await readArtifact(state,'p','dev','build','app.exe')).kind,'unsupported');
});
