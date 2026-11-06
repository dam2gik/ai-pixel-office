const { spawn } = require('node:child_process');
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), ['.'], { env, stdio: 'inherit', windowsHide: false });
child.on('exit', code => process.exit(code || 0));
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
