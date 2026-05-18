const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const net = require('net');

const PORT = 3001;

let mainWindow = null;
let agreementWindow = null;
let isTransitioning = false;

// 数据目录设置（必须在 require server 之前）
process.env.WX_DATA_DIR = app.getPath('userData');

// 启动 Express 后端
require('../server/app');

// ===== 等待端口就绪 =====

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeout;
    const attempt = () => {
      const sock = net.createConnection({ port, host: '127.0.0.1' });
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() >= deadline) reject(new Error('后端服务启动超时'));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

// ===== 打开主窗口 =====

async function openMainWindow() {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    title: 'XD工具 — 微信小店管理',
    backgroundColor: '#faf9f7',
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  try {
    await waitForPort(PORT);
    mainWindow.loadURL(`http://localhost:${PORT}`);
  } catch (err) {
    mainWindow.loadURL(
      `data:text/html,<h2 style="font-family:sans-serif;padding:40px;color:#c00">后端服务启动失败，请重新打开程序。<br><small>${err.message}</small></h2>`
    );
  }

  mainWindow.once('ready-to-show', () => {
    isTransitioning = false;
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ===== 协议窗口 =====

function openAgreementWindow() {
  agreementWindow = new BrowserWindow({
    width: 860,
    height: 680,
    minWidth: 720,
    minHeight: 500,
    title: 'XD工具 — 使用协议',
    backgroundColor: '#1a1a1a',
    show: false,
    resizable: true,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  Menu.setApplicationMenu(null);
  agreementWindow.loadFile(path.join(__dirname, 'agreement.html'));
  agreementWindow.once('ready-to-show', () => agreementWindow.show());

  agreementWindow.on('closed', () => {
    if (!isTransitioning) app.quit();
  });
}

// ===== IPC 处理 =====

ipcMain.on('agreement-accepted', () => {
  isTransitioning = true;
  if (agreementWindow && !agreementWindow.isDestroyed()) {
    agreementWindow.destroy();
    agreementWindow = null;
  }
  openMainWindow();
});

ipcMain.on('agreement-rejected', () => {
  app.quit();
});

// ===== 启动入口 =====

app.whenReady().then(() => {
  openAgreementWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) openAgreementWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isTransitioning) app.quit();
});
