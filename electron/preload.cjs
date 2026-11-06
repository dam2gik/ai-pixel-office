const { contextBridge, ipcRenderer } = require('electron');
const invoke = name => (...args) => ipcRenderer.invoke(`office:${name}`, ...args);
const listen = name => callback => { const listener = (_, value) => callback(value); ipcRenderer.on(`office:${name}`, listener); return () => ipcRenderer.removeListener(`office:${name}`, listener); };
contextBridge.exposeInMainWorld('office', {
  fullscreen: invoke('fullscreen'),
  onVisibility: listen('visibility'),
  close: invoke('close'),
  get: invoke('get'), settings: invoke('settings'), addAgent: invoke('addAgent'), furniture: invoke('furniture'), start: invoke('start'), steer: invoke('steer'), stop: invoke('stop'), resume: invoke('resume'), approve: invoke('approve'), chooseWorkspace: invoke('chooseWorkspace'), chooseExecutable: invoke('chooseExecutable'), connect: invoke('connect'), login: invoke('login'), openOutput: invoke('openOutput'), exportReport: invoke('exportReport'), onState: listen('state'), onLive: listen('live'), onConnection: listen('connection')
});
