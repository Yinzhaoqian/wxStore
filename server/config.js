const fs = require('fs');
const path = require('path');

// 优先级：pkg exe → Electron userData → 开发模式
const isExe = Boolean(process.pkg);
const isElectron = Boolean(process.versions && process.versions.electron);

let dataDir;
if (isExe) {
  dataDir = path.dirname(process.execPath);
} else if (process.env.WX_DATA_DIR) {
  // Electron 主进程在 require 此文件前已设置
  dataDir = process.env.WX_DATA_DIR;
} else {
  dataDir = path.join(__dirname, '..');
  require('dotenv').config({ path: path.join(dataDir, '.env') });
}

// 确保数据目录存在（Electron 首次启动时 userData 目录可能不存在）
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const STORES_FILE = path.join(dataDir, 'stores.json');

function readStores() {
  if (!fs.existsSync(STORES_FILE)) {
    const initial = { stores: [], activeStoreId: null };
    fs.writeFileSync(STORES_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
}

function writeStores(data) {
  fs.writeFileSync(STORES_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

function getActiveStore() {
  const data = readStores();
  if (!data.activeStoreId || !data.stores.length) return null;
  return data.stores.find((s) => s.id === data.activeStoreId) || null;
}

module.exports = {
  port: process.env.PORT || 3001,
  readStores,
  writeStores,
  getActiveStore,
  STORES_FILE,
  dataDir,
};
