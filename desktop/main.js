// EcoCAD 3D — programa para Windows.
// O programa instalado é só a "casca": a cada abertura ele busca a versão mais nova do EcoCAD
// no endereço da internet (GitHub Pages) e guarda uma cópia. Sem internet, abre a última cópia.
// As bibliotecas (3D, PDF) vão dentro do instalador, então tudo funciona offline.
const { app, BrowserWindow, dialog, ipcMain, protocol, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const pkg = require('./package.json');

const APP_URL = String(process.env.ECOCAD_URL || (pkg.ecocad && pkg.ecocad.url) || '').replace(/\/?$/, '/');
// endereços das bibliotecas no HTML → cópia local dentro do programa
const VENDOR = {
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js': 'three.min.js',
  'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js': 'OrbitControls.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js': 'jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/': 'pdfjs/',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } },
]);

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null;
let projectPath = null; // arquivo do projeto aberto (Ctrl+S grava nele)
let lastDir = null;
let pendingFile = null;
let shellUpdate = null, shellNext = null; // atualização do próprio programa (instalador)

const cacheFile = () => path.join(app.getPath('userData'), 'app', 'index.html');

async function refreshApp() {
  if (!/^https?:\/\//.test(APP_URL)) return 'sem-endereco';
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await net.fetch(APP_URL + 'index.html?t=' + Date.now(), { signal: ctl.signal, cache: 'no-store' });
    clearTimeout(t);
    if (!r.ok) return 'erro ' + r.status;
    const html = await r.text();
    if (!html.includes('EcoCAD')) return 'conteudo-invalido';
    fs.mkdirSync(path.dirname(cacheFile()), { recursive: true });
    const old = fs.existsSync(cacheFile()) ? fs.readFileSync(cacheFile(), 'utf8') : '';
    if (old !== html) fs.writeFileSync(cacheFile(), html);
    return old !== html ? 'atualizado' : 'igual';
  } catch (e) {
    return 'offline';
  }
}

function localHtml() {
  if (fs.existsSync(cacheFile())) return fs.readFileSync(cacheFile(), 'utf8');
  return fs.readFileSync(path.join(__dirname, 'fallback', 'index.html'), 'utf8');
}

function rewrite(html) {
  for (const [u, f] of Object.entries(VENDOR)) html = html.split(u).join('app://ecocad/vendor/' + f);
  return html;
}

function fileFromArgv(argv) {
  return argv.slice(1).find(a => /\.ecocad(\.json)?$/i.test(a) && fs.existsSync(a)) || null;
}

function sendFile(p) {
  if (!p || !win) return;
  try {
    const text = fs.readFileSync(p, 'utf8');
    projectPath = p;
    lastDir = path.dirname(p);
    win.webContents.send('open-file', { name: path.basename(p), path: p, text });
  } catch (e) {
    dialog.showErrorBox('EcoCAD 3D', 'Não foi possível abrir ' + p + '\n' + e.message);
  }
}

const FILTERS = {
  ecocad: { name: 'Projeto EcoCAD', extensions: ['ecocad', 'json'] },
  json: { name: 'Projeto EcoCAD', extensions: ['ecocad', 'json'] },
  pdf: { name: 'PDF', extensions: ['pdf'] },
  zip: { name: 'Arquivo ZIP', extensions: ['zip'] },
  dxf: { name: 'DXF', extensions: ['dxf'] },
  ifc: { name: 'IFC', extensions: ['ifc'] },
  csv: { name: 'CSV', extensions: ['csv'] },
  png: { name: 'Imagem PNG', extensions: ['png'] },
};

function setupIpc() {
  ipcMain.handle('version', () => app.getVersion());
  // engrenagem › Buscar atualização agora: baixa o EcoCAD mais novo; a página recarrega se mudou
  ipcMain.handle('update-now', async () => refreshApp());
  ipcMain.handle('info', () => ({ shell: app.getVersion(), url: APP_URL, shellUpdate, shellNext }));
  ipcMain.handle('install-shell', () => {
    try { const { autoUpdater } = require('electron-updater'); setImmediate(() => autoUpdater.quitAndInstall(true, true)); return true; } catch (e) { return false; }
  });

  ipcMain.handle('save', async (_e, { name, data, opts }) => {
    try {
      opts = opts || {};
      let target = null;
      if (opts.project && projectPath && !opts.saveAs) target = projectPath;
      if (!target) {
        const ext = (String(name).split('.').pop() || '').toLowerCase();
        const base = lastDir || app.getPath('documents');
        const r = await dialog.showSaveDialog(win, {
          title: opts.project ? 'Salvar projeto' : 'Salvar arquivo',
          defaultPath: path.join(base, opts.project && projectPath ? path.basename(projectPath) : name),
          filters: [FILTERS[ext] || { name: ext.toUpperCase(), extensions: [ext] }, { name: 'Todos os arquivos', extensions: ['*'] }],
        });
        if (r.canceled || !r.filePath) return { ok: false, canceled: true };
        target = r.filePath;
      }
      const buf = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data);
      fs.writeFileSync(target, buf);
      lastDir = path.dirname(target);
      if (opts.project) projectPath = target;
      return { ok: true, path: target, name: path.basename(target) };
    } catch (e) {
      return { ok: false, err: e.message };
    }
  });

  ipcMain.handle('open-project', async () => {
    const r = await dialog.showOpenDialog(win, {
      title: 'Abrir projeto',
      defaultPath: lastDir || app.getPath('documents'),
      properties: ['openFile'],
      filters: [FILTERS.ecocad, { name: 'Todos os arquivos', extensions: ['*'] }],
    });
    if (r.canceled || !r.filePaths[0]) return null;
    const p = r.filePaths[0];
    const text = fs.readFileSync(p, 'utf8');
    projectPath = p;
    lastDir = path.dirname(p);
    return { name: path.basename(p), path: p, text };
  });
}

async function createWindow() {
  protocol.handle('app', async req => {
    const u = new URL(req.url);
    const p = decodeURIComponent(u.pathname);
    if (p === '/' || p === '/index.html') {
      return new Response(rewrite(localHtml()), { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }
    if (p.startsWith('/vendor/')) {
      const f = path.join(__dirname, 'vendor', p.slice('/vendor/'.length));
      if (!f.startsWith(path.join(__dirname, 'vendor'))) return new Response('', { status: 403 });
      return net.fetch(pathToFileURL(f).toString());
    }
    return new Response('', { status: 404 });
  });

  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: 'EcoCAD 3D',
    autoHideMenuBar: true,
    backgroundColor: '#1d2226',
    show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // links externos abrem no navegador
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  // F12 abre as ferramentas de diagnóstico; F5 recarrega
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return;
    if (i.key === 'F12') win.webContents.toggleDevTools();
    if (i.key === 'F5') win.webContents.reload();
  });
  win.webContents.on('did-finish-load', () => { if (pendingFile) { sendFile(pendingFile); pendingFile = null; } });

  const st = await refreshApp();
  console.log('EcoCAD: atualização do app →', st);
  await win.loadURL('app://ecocad/index.html');
}

app.on('second-instance', (_e, argv) => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
  sendFile(fileFromArgv(argv));
});

app.whenReady().then(async () => {
  setupIpc();
  pendingFile = fileFromArgv(process.argv);
  await createWindow();
  // atualização do próprio instalador (raro): baixa em segundo plano e instala ao fechar
  try {
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.on('update-downloaded', i => { shellUpdate = 'pronto'; shellNext = i && i.version; });
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 3600 * 1000);
  } catch (e) { /* sem atualizador em modo de desenvolvimento */ }
});

app.on('window-all-closed', () => app.quit());
