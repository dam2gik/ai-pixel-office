const { spawn, execFileSync } = require('node:child_process');
const { EventEmitter } = require('node:events');
const readline = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');

function findCodex(explicit) {
  if (explicit) { if (!fs.existsSync(explicit)) throw new Error('Codex 실행 파일을 찾을 수 없습니다.'); return explicit; }
  if (process.env.PIXEL_OFFICE_CODEX) return process.env.PIXEL_OFFICE_CODEX;
  try {
    const matches = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', ['codex'], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/);
    const exe = matches.find(p => process.platform !== 'win32' || p.endsWith('.exe'));
    if (exe) return exe;
  } catch {}
  const extensions = path.join(require('node:os').homedir(), '.vscode', 'extensions');
  if (process.platform === 'win32' && fs.existsSync(extensions)) {
    for (const name of fs.readdirSync(extensions).filter(n => n.startsWith('openai.chatgpt-')).sort().reverse()) {
      const p = path.join(extensions, name, 'bin', 'windows-x86_64', 'codex.exe');
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('Codex를 찾을 수 없습니다. 설정에서 codex.exe를 선택해 주세요.');
}

class Codex extends EventEmitter {
  constructor() { super(); this.pending = new Map(); this.seq = 0; this.child = null; this.ready = false; }
  async connect(executable) {
    if (this.ready) return;
    if (this.connecting) return this.connecting;
    this.connecting = this._connect(executable).finally(() => { this.connecting = null; });
    return this.connecting;
  }
  async _connect(executable) {
    this.executable = findCodex(executable);
    const child = spawn(this.executable, ['app-server', '--listen', 'stdio://'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    this.child = child;
    this.diagnostics = '';
    child.stderr.on('data', data => { this.diagnostics = (this.diagnostics + data.toString()).slice(-4000); });
    child.stdin.on('error', () => {});
    const fail = error => {
      if (this.child !== child) return;
      this.ready = false; this.child = null;
      for (const p of this.pending.values()) { clearTimeout(p.timer); p.reject(error); }
      this.pending.clear(); this.emit('disconnect', error.message);
    };
    child.on('error', fail);
    child.on('exit', code => fail(new Error(`Codex 연결 종료 (${code}). 다시 연결해 주세요.`)));
    readline.createInterface({ input: child.stdout }).on('line', line => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.method) { this.emit(m.id == null ? 'notification' : 'request', m); return; }
      const p = this.pending.get(m.id);
      if (!p) return;
      clearTimeout(p.timer); this.pending.delete(m.id);
      if (m.error) p.reject(new Error(m.error.message)); else p.resolve(m.result);
    });
    try {
      await this.request('initialize', { clientInfo: { name: 'pixel_office', title: 'Pixel Office', version: '0.1.0' }, capabilities: { experimentalApi: true } });
      this.send({ method: 'initialized' }); this.ready = true;
    } catch (e) { child.kill(); throw e; }
  }
  send(message) {
    if (!this.child || this.child.stdin.destroyed) throw new Error('Codex가 연결되지 않았습니다.');
    this.child.stdin.write(JSON.stringify(message) + '\n');
  }
  request(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method} 응답 시간 초과`)); }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      try { this.send({ id, method, params }); } catch (e) { clearTimeout(timer); this.pending.delete(id); reject(e); }
    });
  }
  close() { this.child?.kill(); }
}
module.exports = { Codex, findCodex };
