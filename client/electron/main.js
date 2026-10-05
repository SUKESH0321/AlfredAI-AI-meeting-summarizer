import { app, BrowserWindow, systemPreferences, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
let serverProcess = null;

function waitForServer(url, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) { resolve(); } else { retry(); }
      }).on('error', retry);
    };
    const retry = () => {
      if (Date.now() - start > timeout) { reject(new Error("Server start timeout")); } else { setTimeout(poll, 1000); }
    };
    poll();
  });
}

function terminateServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function startServer() {
  const userDataPath = app.getPath('userData');
  const env = { ...process.env };
  env.UPLOADS_DIR = path.join(userDataPath, 'uploads');
  env.TEMP_DIR = path.join(userDataPath, 'temp');

  const serverPath = isDev 
    ? path.resolve(__dirname, '../../server/index.js')
    : path.resolve(process.resourcesPath, 'server/index.js');

  serverProcess = spawn('node', [serverPath], { env, stdio: 'pipe' });

  serverProcess.stdout.on('data', (d) => console.log(`[Backend]: ${d}`));
  serverProcess.stderr.on('data', (d) => console.error(`[Backend Err]: ${d}`));

  await waitForServer('http://localhost:5000/api/health');
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1920, height: 1080,
    minWidth: 800, minHeight: 600,
    title: 'AlfredAI-V1.1.020',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.maximize();

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../dist/public/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (error) {
    dialog.showErrorBox("Startup Error", `AlfredAI could not start its local server.\n\n${error.message}`);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  terminateServer();
});
