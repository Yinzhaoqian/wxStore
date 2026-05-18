const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

const PORT = 3001;
const LICENSE_SERVER = 'http://123.57.141.65:4000';

let mainWindow = null;
let agreementWindow = null;
let licenseWindow = null;
let countdownTimer = null;
let isTransitioning = false; // 窗口切换中，禁止 window-all-closed 触发退出

// 数据目录设置（必须在 require server 之前）
process.env.WX_DATA_DIR = app.getPath('userData');

// 启动 Express 后端
require('../server/app');

// ===== 协议状态管理（每次启动都需同意） =====

// ===== 授权密匙管理 =====

function getSessionFile() {
  return path.join(app.getPath('userData'), '.session.json');
}

// 机器唯一标识（hostname + username 的哈希）
const os = require('os');
const MACHINE_ID = crypto
  .createHash('sha256')
  .update(os.hostname() + (os.userInfo().username || ''))
  .digest('hex')
  .slice(0, 16);

function readSession() {
  try {
    return JSON.parse(fs.readFileSync(getSessionFile(), 'utf-8'));
  } catch {
    return null;
  }
}

function writeSession(key, expiresAt) {
  fs.writeFileSync(getSessionFile(), JSON.stringify({
    key: key.toUpperCase(),
    activatedAt: new Date().toISOString(),
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
  }), 'utf-8');
}

function getActiveSessionRemainingMs() {
  const session = readSession();
  if (!session) return 0;
  if (!session.expiresAt) return Infinity; // 永久卡密
  const remaining = new Date(session.expiresAt).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

// 向卡密服务器请求验证，返回 Promise<{ ok, message, remainingMs }>
function activateKey(key) {
  return new Promise((resolve) => {
    const normalized = (key.replace(/-/g, '').toUpperCase().match(/.{4}/g) || []).join('-');
    if (!normalized || normalized.length < 4) {
      return resolve({ ok: false, message: '卡密格式错误' });
    }

    // 先检查本地缓存的会话
    const session = readSession();
    if (session && session.key === normalized) {
      const remaining = getActiveSessionRemainingMs();
      if (remaining > 0) {
        return resolve({ ok: true, remainingMs: remaining === Infinity ? 0 : remaining });
      }
    }

    // 请求远程服务器验证
    const body = JSON.stringify({ key: normalized, machineId: MACHINE_ID });
    const url = new URL('/api/validate', LICENSE_SERVER);
    const mod = url.protocol === 'https:' ? https : http;

    const req = mod.request({
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 8000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.valid) {
            writeSession(normalized, json.expiresAt || null);
            const remainingMs = json.expiresAt
              ? Math.max(0, new Date(json.expiresAt).getTime() - Date.now())
              : 0;
            resolve({ ok: true, remainingMs });
          } else {
            resolve({ ok: false, message: json.message || '卡密无效' });
          }
        } catch {
          resolve({ ok: false, message: '服务器响应异常，请重试' });
        }
      });
    });

    req.on('error', () => resolve({ ok: false, message: '无法连接到授权服务器，请检查网络' }));
    req.on('timeout', () => { req.destroy(); resolve({ ok: false, message: '授权服务器连接超时，请重试' }); });
    req.write(body);
    req.end();
  });
}

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

// ===== 倒计时徽章（注入主窗口） =====

function startCountdown(remainingMs) {
  if (countdownTimer) clearInterval(countdownTimer);
  if (!remainingMs || remainingMs <= 0) return; // 永久卡密不显示倒计时

  const injectBadge = (ms) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    const label = `试用剩余 ${mins}:${String(secs).padStart(2, '0')}`;
    const urgent = ms < 5 * 60 * 1000; // < 5分钟变橙色

    const script = `
      (function() {
        let badge = document.getElementById('__trial-badge__');
        if (!badge) {
          badge = document.createElement('div');
          badge.id = '__trial-badge__';
          badge.style.cssText = [
            'position:fixed','bottom:18px','right:18px',
            'padding:6px 14px','border-radius:999px',
            'font-size:12px','font-weight:500',
            'font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
            'pointer-events:none','z-index:99999',
            'box-shadow:0 2px 8px rgba(0,0,0,0.18)',
            'transition:background 0.3s,color 0.3s',
          ].join(';');
          document.body.appendChild(badge);
        }
        badge.textContent = ${JSON.stringify(label)};
        badge.style.background = ${urgent ? '"#f39c12"' : '"#352e26"'};
        badge.style.color = ${urgent ? '"#1a1a1a"' : '"#c4a96a"'};
      })();
    `;
    mainWindow.webContents.executeJavaScript(script).catch(() => {});
  };

  let remaining = remainingMs;
  injectBadge(remaining);

  countdownTimer = setInterval(() => {
    remaining -= 1000;
    if (remaining <= 0) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      // 到期：关闭主窗口，重置
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.executeJavaScript(`
          alert('试用时间已到（30 分钟），程序将关闭。如需继续使用，请联系开发方获取新密匙。');
        `).catch(() => {}).finally(() => {
          if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
        });
      }
    } else {
      injectBadge(remaining);
    }
  }, 1000);
}

// ===== 打开主窗口 =====

async function openMainWindow(remainingMs) {
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
    startCountdown(remainingMs);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(`http://localhost:${PORT}`)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    if (countdownTimer) clearInterval(countdownTimer);
    countdownTimer = null;
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

  // 点叉直接退出
  agreementWindow.on('closed', () => {
    if (!isTransitioning) app.quit();
  });
}

// ===== 授权窗口 =====

function openLicenseWindow() {
  licenseWindow = new BrowserWindow({
    width: 500,
    height: 420,
    resizable: false,
    maximizable: false,
    title: 'XD工具 — 授权验证',
    backgroundColor: '#1a1a1a',
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  Menu.setApplicationMenu(null);
  licenseWindow.loadFile(path.join(__dirname, 'license.html'));
  licenseWindow.once('ready-to-show', () => licenseWindow.show());

  // 点叉直接退出（过渡期间不退出）
  licenseWindow.on('closed', () => {
    licenseWindow = null;
    if (!mainWindow && !isTransitioning) app.quit();
  });
}

// ===== IPC 处理 =====

ipcMain.on('agreement-accepted', () => {
  isTransitioning = true;
  if (agreementWindow && !agreementWindow.isDestroyed()) {
    agreementWindow.destroy();
    agreementWindow = null;
  }
  isTransitioning = false;
  afterAgreement();
});

ipcMain.on('agreement-rejected', () => {
  app.quit();
});

ipcMain.on('license-validate', async (_, key) => {
  const result = await activateKey(key);
  if (result.ok) {
    isTransitioning = true;
    if (licenseWindow && !licenseWindow.isDestroyed()) {
      licenseWindow.destroy();
      licenseWindow = null;
    }
    openMainWindow(result.remainingMs);
  } else {
    if (licenseWindow && !licenseWindow.isDestroyed()) {
      licenseWindow.webContents.send('license-result', { ok: false, message: result.message });
    }
  }
});

// ===== 启动逻辑 =====

function afterAgreement() {
  const remainingMs = getActiveSessionRemainingMs();
  if (remainingMs > 0) {
    // 有效会话，直接打开主窗口（永久卡密传 0 表示不显示倒计时）
    openMainWindow(remainingMs === Infinity ? 0 : remainingMs);
  } else {
    // 需要输入授权密匙
    openLicenseWindow();
  }
}

app.whenReady().then(() => {
  openAgreementWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) openAgreementWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && !isTransitioning) app.quit();
});
