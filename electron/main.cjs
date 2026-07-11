const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

let win = null;

// ── Serveur de synchronisation en réseau local (PC = hôte) ────────────────
let syncServer = null;
let syncToken = '';
let syncPayload = '';

function localIPs() {
  const out = [];
  for (const [, addrs] of Object.entries(os.networkInterfaces())) {
    for (const a of addrs ?? []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return out;
}

function landingPage(host) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lennyx Sync</title>
<style>body{background:#0a0a0d;color:#eae6dc;font-family:system-ui;display:flex;flex-direction:column;
align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}
h1{color:#d4af37;letter-spacing:.2em;font-size:22px}.code{font-size:42px;letter-spacing:.2em;color:#d4af37;
font-weight:800;margin:10px 0}.box{border:1px solid #333;border-radius:14px;padding:24px 32px;background:#111116}
p{color:#8f8a80;max-width:420px;line-height:1.5}</style></head><body>
<h1>LENNYX — SYNC</h1><div class="box"><p>Adresse du PC</p><div class="code">${host}</div>
<p>Code de session</p><div class="code">${syncToken}</div></div>
<p>Ouvre Lennyx sur ton téléphone → Réglages → Synchronisation, puis saisis cette adresse et ce code.</p>
</body></html>`;
}

function startSyncServer(payload) {
  return new Promise((resolve, reject) => {
    stopSyncServer();
    syncPayload = payload;
    syncToken = String(crypto.randomInt(100000, 999999));
    syncServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
      const url = new URL(req.url, 'http://x');
      if (url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(landingPage(req.headers.host || ''));
        return;
      }
      if (url.searchParams.get('token') !== syncToken) {
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'code invalide' }));
        return;
      }
      if (url.pathname === '/save' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(syncPayload);
        return;
      }
      if (url.pathname === '/save' && req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; if (body.length > 10_000_000) req.destroy(); });
        req.on('end', () => {
          try {
            JSON.parse(body);
            if (win) win.webContents.send('lennyx-sync-incoming', body);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
          } catch {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'json invalide' }));
          }
        });
        return;
      }
      res.writeHead(404);
      res.end();
    });
    syncServer.on('error', reject);
    syncServer.listen(41214, '0.0.0.0', () => {
      resolve({ ips: localIPs(), port: 41214, token: syncToken });
    });
  });
}

function stopSyncServer() {
  if (syncServer) {
    try { syncServer.close(); } catch {}
    syncServer = null;
  }
}

ipcMain.handle('lennyx-sync-start', async (_e, payload) => startSyncServer(payload));
ipcMain.handle('lennyx-sync-stop', async () => { stopSyncServer(); return true; });
ipcMain.handle('lennyx-sync-update', async (_e, payload) => { syncPayload = payload; return true; });

// ── Proxy vers l'Oracle en ligne (contourne le CORS, aucune restriction côté Node) ──
ipcMain.handle('lennyx-llm-request', async (_e, { url, body }) => {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: String(e && e.message ? e.message : e) };
  }
});

// ── Widget flottant (le "L" majestueux toujours visible sur le bureau) ─────
let widgetWin = null;

function createWidgetWindow() {
  if (widgetWin) { widgetWin.show(); widgetWin.focus(); return; }
  widgetWin = new BrowserWindow({
    width: 220,
    height: 130,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  widgetWin.setAlwaysOnTop(true, 'screen-saver');
  widgetWin.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), { search: 'widget=1' });
  widgetWin.on('closed', () => { widgetWin = null; });
}

ipcMain.handle('lennyx-widget-toggle', async () => {
  if (widgetWin) { widgetWin.close(); widgetWin = null; return false; }
  createWidgetWindow();
  return true;
});
ipcMain.handle('lennyx-widget-open-app', async () => {
  if (win) { win.show(); win.focus(); }
  else createWindow();
});
ipcMain.handle('lennyx-widget-hide', async () => {
  if (widgetWin) { widgetWin.close(); widgetWin = null; }
});

// ── Fenêtre ───────────────────────────────────────────────────────────────
function createWindow() {
  win = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 380,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0d',
    title: 'Lennyx',
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.on('closed', () => { win = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopSyncServer();
  if (widgetWin) { widgetWin.close(); widgetWin = null; }
  if (process.platform !== 'darwin') app.quit();
});
