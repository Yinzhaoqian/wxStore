const fs = require('fs');
const path = require('path');
const { dataDir } = require('../config');

const LOG_FILE = path.join(dataDir, 'operation-logs.json');

function readLogs() {
  try {
    if (!fs.existsSync(LOG_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeLogs(logs) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

function appendLog(entry) {
  const logs = readLogs();
  logs.unshift({
    id: Date.now() + Math.random().toString(36).slice(2, 6),
    ...entry,
    time: new Date().toISOString(),
  });
  // 最多保留 5000 条
  if (logs.length > 5000) logs.splice(5000);
  writeLogs(logs);
}

// 查询日志，支持分页和筛选
function queryLogs({ type, search, startDate, endDate, page = 1, pageSize = 50 } = {}) {
  let logs = readLogs();

  if (type && type !== 'all') {
    logs = logs.filter(l => l.type === type);
  }
  if (search) {
    const kw = search.toLowerCase();
    logs = logs.filter(l =>
      (l.orderId || '').includes(kw) ||
      (l.waybillId || '').toLowerCase().includes(kw) ||
      (l.storeName || '').includes(kw) ||
      (l.buyerName || '').includes(kw)
    );
  }
  if (startDate) {
    const start = new Date(startDate).getTime();
    logs = logs.filter(l => new Date(l.time).getTime() >= start);
  }
  if (endDate) {
    // endDate 取当天结束
    const end = new Date(endDate).getTime() + 86400000 - 1;
    logs = logs.filter(l => new Date(l.time).getTime() <= end);
  }

  const total = logs.length;
  const list = logs.slice((page - 1) * pageSize, page * pageSize);
  return { list, total, page, pageSize };
}

module.exports = { appendLog, queryLogs };
