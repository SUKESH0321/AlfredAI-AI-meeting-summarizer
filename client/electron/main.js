import { app, BrowserWindow, systemPreferences, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
let serverProcess = null;

const HOST = '127.0.0.1';
const PORT = 5000;
const SERVER_URL = `http://${HOST}:${PORT}`;
const HEALTH_URL = `${SERVER_URL}/api/health`;

let serverOutput = '';
let serverExit = null;

function pingHealth(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (serverExit) throw new Error(`Backend exited (${serverExit}) before becoming healthy.

${serverOutput.slice(-1500)}`);
    if (await pingHealth(url)) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Backend did not answer ${url} within ${timeout / 1000}s.

${serverOutput.slice(-1500)}`);
}

function terminateServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

async function startServer() {
  const userDataPath = app.getPath('userData');
  const uploadsDir = path.join(userDataPath, 'uploads');
  const tempDir = path.join(userDataPath, 'temp');
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(tempDir, { recursive: true });

  const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1', HOST, PORT: String(PORT) };
  env.UPLOADS_DIR = uploadsDir;
  env.TEMP_DIR = tempDir;

  const serverDir = isDev
    ? path.resolve(__dirname, '../../server')
    : path.join(process.resourcesPath, 'server');

  if (!isDev) {
    // Secrets are never bundled: production config lives in <userData>/.env
    const envFile = path.join(userDataPath, '.env');
    if (!fs.existsSync(envFile)) {
      throw new Error(`Configuration file not found:
${envFile}

Create it with DATABASE_URL, JWT_SECRET and GROQ_API_KEY (see server/.env.example).`);
    }
    env.ENV_FILE = envFile;
    env.STATIC_DIR = path.join(__dirname, '../dist/public');
  }

  // process.execPath is Electron itself; with ELECTRON_RUN_AS_NODE it acts as a bundled Node runtime.
  serverProcess = spawn(process.execPath, [path.join(serverDir, 'index.js')], { env, cwd: serverDir, stdio: 'pipe' });
  serverProcess.on('error', (e) => { serverExit = `spawn error: ${e.message}`; });
  serverProcess.on('exit', (code, sig) => { serverExit = `code ${code}${sig ? `, signal ${sig}` : ''}`; });

  const onData = (tag) => (d) => { serverOutput += d; console.log(`[${tag}]: ${d}`); };
  serverProcess.stdout.on('data', onData('Backend'));
  serverProcess.stderr.on('data', onData('Backend Err'));

  await waitForServer(HEALTH_URL);
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
    },
    icon: path.join(__dirname, process.env.NODE_ENV === 'development' ? '../public/icon.ico' : '../dist/public/icon.ico')
  });

  win.maximize();

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadURL(SERVER_URL);
  }
}

app.whenReady().then(async () => {
  app.setAppUserModelId("com.alfredai.app");
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
