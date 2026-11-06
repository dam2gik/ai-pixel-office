const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('node:path');
const { Codex } = require('./codex.cjs');
const { Engine } = require('./engine.cjs');
let win, engine, codex, connection = { connected: false };
if (process.env.PIXEL_OFFICE_DATA) app.setPath('userData', path.resolve(process.env.PIXEL_OFFICE_DATA));
const send = (topic, value) => { if (win && !win.isDestroyed()) win.webContents.send(topic, value); };
function handle(name, fn) {
  ipcMain.handle(name, async (event, ...args) => {
    if (event.sender !== win?.webContents || event.senderFrame !== win.webContents.mainFrame) throw new Error('접근할 수 없는 화면입니다.');
    return fn(...args);
  });
}
app.whenReady().then(() => {
  codex = new Codex(); engine = new Engine(path.join(app.getPath('userData'), 'office.json'), codex);
  engine.on('state', s => send('office:state', s)); engine.on('live', s => send('office:live', s));
  engine.on('connection', c => { connection = c; send('office:connection', c); });
  engine.on('codexNotification', async ({ method, params }) => {
    if (method === 'account/login/completed' || method === 'account/updated') {
      try { const a = await codex.request('account/read'); connection = { ...connection, account: a.account, loginError: params.error || '' }; send('office:connection', connection); } catch {}
    }
  });
  handle('office:get', () => ({ state: engine.snapshot(), connection }));
  handle('office:fullscreen', value => { win.setFullScreen(typeof value === 'boolean' ? value : !win.isFullScreen()); return win.isFullScreen(); });
  handle('office:close', () => win.close());
  handle('office:settings', s => engine.settings(s));
  handle('office:addAgent', a => engine.addAgent(a));
  handle('office:furniture', type => engine.addFurniture(type));
  handle('office:start', async goal => {
    if (engine.state.settings.mode === 'codex') {
      const { account } = await codex.request('account/read');
      if (account?.type !== 'chatgpt') throw new Error('ChatGPT 계정 로그인이 필요합니다. 설정에서 로그인해 주세요.');
    }
    return engine.start(goal);
  });
  handle('office:steer', (projectId, agentId, text) => engine.steer(projectId, agentId, text));
  handle('office:stop', projectId => engine.stop(projectId));
  handle('office:resume', async projectId => {
    const p = engine.state.projects.find(p => p.id === projectId);
    if (p?.mode === 'codex') {
      const { account } = await codex.request('account/read');
      if (account?.type !== 'chatgpt') throw new Error('ChatGPT 계정 로그인이 필요합니다.');
    }
    engine.resume(projectId);
  });
  handle('office:approve', (key, allow) => engine.approve(key, allow));
  handle('office:chooseWorkspace', async () => {
    if (engine.active.size) throw new Error('진행 중에는 저장 폴더를 바꿀 수 없습니다.');
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], title: '산출물 저장 폴더 선택' });
    if (!r.canceled) { engine.state.settings.workspace = r.filePaths[0]; engine.changed(); }
  });
  handle('office:chooseExecutable', async () => {
    if (engine.active.size || codex.ready) throw new Error('Codex 연결 전 실행 파일을 선택해 주세요.');
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], title: 'Codex 실행 파일 선택', filters: [{ name: 'Codex', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }] });
    if (!r.canceled) { engine.state.settings.executable = r.filePaths[0]; engine.changed(); }
  });
  handle('office:connect', async () => {
    await codex.connect(engine.state.settings.executable);
    const { account } = await codex.request('account/read');
    let models = [], limits;
    try { models = (await codex.request('model/list', {})).data; } catch {}
    try { limits = await codex.request('account/rateLimits/read'); } catch {}
    connection = { connected: true, account, models, limits, executable: codex.executable }; send('office:connection', connection); return connection;
  });
  handle('office:login', async () => {
    await codex.connect(engine.state.settings.executable);
    const r = await codex.request('account/login/start', { type: 'chatgpt' });
    const url = new URL(r.authUrl);
    if (url.protocol !== 'https:' || !['auth.openai.com', 'auth0.openai.com', 'chatgpt.com'].includes(url.hostname)) throw new Error('예상하지 못한 로그인 URL입니다.');
    await shell.openExternal(r.authUrl); return { pending: true };
  });
  handle('office:openOutput', async projectId => {
    const p = engine.state.projects.find(p => p.id === projectId);
    if (!p?.directory) throw new Error('실제 산출물 폴더가 없습니다.');
    const error = await shell.openPath(p.directory); if (error) throw new Error(error);
  });
  handle('office:exportReport', async projectId => {
    const p = engine.state.projects.find(p => p.id === projectId); if (!p?.report) throw new Error('보고서가 없습니다.');
    const r = await dialog.showSaveDialog(win, { defaultPath: 'PM-REPORT.md', filters: [{ name: 'Markdown', extensions: ['md'] }] });
    if (!r.canceled) require('node:fs').writeFileSync(r.filePath, p.report);
  });
  win = new BrowserWindow({ width: 1540, height: 980, minWidth: 1000, minHeight: 720, backgroundColor: '#f6f5f1', title: 'Pixel Office', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.removeMenu(); win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  for (const event of ['minimize','hide']) win.on(event,()=>send('office:visibility',false));
  for (const event of ['restore','show']) win.on(event,()=>send('office:visibility',true));
  win.webContents.on('will-navigate', e => e.preventDefault());
  win.loadFile(path.join(__dirname, '../dist/index.html')); win.once('ready-to-show', () => { win.setFullScreen(process.env.PIXEL_OFFICE_WINDOWED !== '1'); win.show(); });
  win.webContents.on('before-input-event', (event, input) => {
    if(input.type !== 'keyDown') return;
    if(input.key === 'F11') { event.preventDefault(); win.setFullScreen(!win.isFullScreen()); }
  });
  win.on('close', e => {
    if (engine.active.size && !app.isQuitting) {
      const choice = dialog.showMessageBoxSync(win, { type: 'question', buttons: ['계속 작업', '중단하고 종료'], defaultId: 0, cancelId: 0, message: '진행 중인 업무가 있습니다.', detail: '종료하면 Codex 실행이 중단됩니다. 다음 실행에서 미완료 업무를 다시 시작할 수 있습니다.' });
      if (choice === 0) { e.preventDefault(); return; }
    }
    engine.persist(); codex.close();
  });
});
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { app.isQuitting = true; codex?.close(); });
