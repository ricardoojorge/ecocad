// Ponte entre o EcoCAD (página) e o Windows: salvar e abrir arquivos direto no disco.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ecocadDesktop', {
  version: () => ipcRenderer.invoke('version'),
  save: (name, data, opts) => ipcRenderer.invoke('save', { name, data, opts }),
  openProject: () => ipcRenderer.invoke('open-project'),
  onOpenFile: cb => ipcRenderer.on('open-file', (_e, f) => cb(f)),
});
