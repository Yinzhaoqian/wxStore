const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const net = require('net');
const fs = require('fs');
const crypto = require('crypto');

const PORT = 3001;
const LICENSE_SECRET = 'XD-WX-STORE-2026-TRIAL';
const TRIAL_DURATION_MS = 30 * 60 * 1000; // 30 分钟

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

function validateKeyChecksum(key) {
  const raw = key.replace(/-/g, '').toUpperCase();
  if (raw.length !== 16) return false;
  if (!/^[0-9A-F]{16}$/.test(raw)) return false;
  const payload = raw.slice(0, 12);
  const checksum = raw.slice(12, 16);
  const expected = crypto
    .createHmac('sha256', LICENSE_SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase()
    .slice(0, 4);
  return checksum === expected;
}

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
    usedAt: new Date().toISOString(),
    expiresAt: new Date(expiresAt).toISOString(),
  }), 'utf-8');
}

// 检查当前会话是否仍然有效，返回剩余毫秒数或 0
function getActiveSessionRemainingMs() {
  const session = readSession();
  if (!session || !session.expiresAt) return 0;
  const remaining = new Date(session.expiresAt).getTime() - Date.now();
  return remaining > 0 ? remaining : 0;
}

// 尝试使用密匙：返回 { ok, message, remainingMs }
function activateKey(key) {
  const normalized = key.replace(/-/g, '').toUpperCase();
  const formatted = normalized.match(/.{4}/g).join('-');

  if (!validateKeyChecksum(formatted)) {
    return { ok: false, message: '密匙格式错误或无效，请检查后重新输入' };
  }

  const session = readSession();
  if (session && session.key === formatted) {
    // 同一个密匙：检查是否仍在有效期
    const remaining = new Date(session.expiresAt).getTime() - Date.now();
    if (remaining > 0) {
      return { ok: true, remainingMs: remaining };
    } else {
      return { ok: false, message: '此密匙已过期（30 分钟试用已结束），请使用新密匙' };
    }
  }

  if (session && session.key !== formatted) {
    // 不同的密匙：检查旧密匙是否已用过（记录在案就算用过）
    // 只要 session 文件存在说明之前已激活过一个密匙
    const remaining = getActiveSessionRemainingMs();
    if (remaining > 0) {
      return { ok: false, message: '当前已有活跃会话，无需再次激活' };
    }
    // 旧会话已过期，但新密匙也需要验证是否是"曾经用过的密匙"
    // 为简单起见：每次只允许一个密匙被记录，新密匙可以激活（覆盖旧会话）
    // 如需严格防止复用同一密匙，需要维护已用密匙列表（此处不做）
  }

  const expiresAt = Date.now() + TRIAL_DURATION_MS;
  writeSession(formatted, expiresAt);
  return { ok: true, remainingMs: TRIAL_DURATION_MS };
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

ipcMain.on('license-validate', (_, key) => {
  const result = activateKey(key);
  if (result.ok) {
    isTransitioning = true; // 先置标志，再销毁窗口，防止 closed 事件触发 quit
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
    // 有效会话，直接打开主窗口
    openMainWindow(remainingMs);
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
