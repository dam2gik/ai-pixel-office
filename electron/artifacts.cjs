const fs = require('node:fs/promises');
const path = require('node:path');
const { allTasks } = require('./project-history.cjs');

const images = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.gif':'image/gif', '.bmp':'image/bmp' };
const textExtensions = new Set('.txt .md .markdown .json .csv .tsv .log .js .jsx .ts .tsx .mjs .cjs .css .scss .html .htm .svg .xml .yaml .yml .toml .ini .py .sql .sh .ps1 .c .h .cpp .rs .go .java'.split(' '));
const kind = name => images[path.extname(name).toLowerCase()] ? 'image' : ['.html','.htm'].includes(path.extname(name).toLowerCase()) ? 'html' : textExtensions.has(path.extname(name).toLowerCase()) ? 'text' : 'unsupported';
function inside(root, target) {
  const relative = path.relative(root, target);
  return !path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`);
}
function projectFor(state, projectId, agentId) {
  const p = state.projects.find(p => p.id === projectId);
  if (!p || !state.agents.some(a => a.id === agentId)) throw new Error('프로젝트 또는 직원을 찾을 수 없습니다.');
  return p;
}
async function taskRoot(p, taskId, agentId) {
  const task = allTasks(p).find(t => t.id === taskId && t.agentId === agentId);
  if (p.mode !== 'codex' || !p.directory || !task?.directory) throw new Error('아직 생성된 작업 폴더가 없습니다.');
  const projectRoot = await fs.realpath(p.directory);
  const root = await fs.realpath(task.directory);
  if (!inside(projectRoot, root) || root === projectRoot) throw new Error('결과물 폴더에 접근할 수 없습니다.');
  return root;
}
async function listArtifacts(state, projectId, agentId) {
  const p = projectFor(state, projectId, agentId), files = [];
  let scanned = 0, truncated = false;
  const tasks=allTasks(p),order=new Map(tasks.map((t,i)=>[t.id,i]));
  for (const task of tasks.filter(t => t.agentId === agentId && t.directory).reverse()) {
    let root;
    try { root = await taskRoot(p, task.id, agentId); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    async function walk(dir, depth = 0) {
      const entries = await fs.readdir(dir, { withFileTypes:true });
      for (const entry of entries) {
        if (++scanned > 2000 || files.length >= 200) { truncated = true; return; }
        if (entry.isSymbolicLink() || ['node_modules','.git','.venv','__pycache__'].includes(entry.name)) continue;
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (depth < 6) await walk(file, depth + 1); else truncated = true; }
        else if (entry.isFile()) {
          try {
            const real = await fs.realpath(file);
            if (!inside(root, real)) continue;
            const stat = await fs.stat(real);
            files.push({ taskId:task.id, taskTitle:task.title, path:path.relative(root, file).split(path.sep).join('/'), size:stat.size, kind:kind(file) });
          } catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
      }
    }
    await walk(root);
    if (truncated && (scanned > 2000 || files.length >= 200)) break;
  }
  return { files:files.sort((a,b) => order.get(b.taskId)-order.get(a.taskId) || a.path.localeCompare(b.path)), truncated };
}
async function readArtifact(state, projectId, agentId, taskId, relativePath) {
  const p = projectFor(state, projectId, agentId), root = await taskRoot(p, taskId, agentId);
  if (typeof relativePath !== 'string' || !relativePath || relativePath.includes('\0') || relativePath.includes(':') || path.isAbsolute(relativePath)) throw new Error('파일 경로가 올바르지 않습니다.');
  const candidate = path.resolve(root, relativePath);
  if (!inside(root, candidate)) throw new Error('작업 폴더 밖의 파일은 열 수 없습니다.');
  const file = await fs.realpath(candidate);
  if (!inside(root, file)) throw new Error('작업 폴더 밖의 파일은 열 수 없습니다.');
  const type = kind(file), limit = type === 'image' ? 8 * 1024 * 1024 : 512 * 1024;
  if (type === 'unsupported') return { kind:type, message:'이 형식은 미리보기를 지원하지 않습니다. 산출물 폴더에서 확인해 주세요.' };
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    if (!stat.isFile()) throw new Error('파일만 미리 볼 수 있습니다.');
    if (stat.size > limit) return { kind:'unsupported', message:`미리보기 용량을 초과했습니다. ${type === 'image' ? '8MB' : '512KB'} 이하의 파일을 선택해 주세요.` };
    const buffer = Buffer.alloc(limit + 1), { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    if (bytesRead > limit) throw new Error('파일 용량이 미리보기 한도를 초과했습니다.');
    const data = buffer.subarray(0, bytesRead);
    return type === 'image' ? { kind:type, data:`data:${images[path.extname(file).toLowerCase()]};base64,${data.toString('base64')}` } : { kind:type, text:data.toString('utf8') };
  } finally { await handle.close(); }
}
module.exports = { listArtifacts, readArtifact };
