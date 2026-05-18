/**
 * 客户验收密匙生成器
 * 用法: node scripts/keygen.js [数量]
 * 示例: node scripts/keygen.js 3
 */

const crypto = require('crypto');

const SECRET = 'XD-WX-STORE-2026-TRIAL';

function generateKey() {
  // 12位随机十六进制 + 4位 HMAC 校验码 → XXXX-XXXX-XXXX-XXXX
  const payload = crypto.randomBytes(6).toString('hex').toUpperCase(); // 12 chars
  const checksum = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase()
    .slice(0, 4); // 4 chars
  const raw = payload + checksum; // 16 chars
  return raw.match(/.{4}/g).join('-');
}

function validateKey(key) {
  const raw = key.replace(/-/g, '').toUpperCase();
  if (raw.length !== 16) return false;
  const payload = raw.slice(0, 12);
  const checksum = raw.slice(12, 16);
  const expected = crypto
    .createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex')
    .toUpperCase()
    .slice(0, 4);
  return checksum === expected;
}

const count = parseInt(process.argv[2]) || 1;
console.log(`\n生成 ${count} 个客户验收密匙（每个有效时长 30 分钟）:\n`);
for (let i = 0; i < count; i++) {
  const key = generateKey();
  console.log(`  ${key}`);
}
console.log('');

// 验证测试
if (process.argv[3] === '--test') {
  console.log('自检：');
  const k = generateKey();
  console.log(`  key=${k}  valid=${validateKey(k)}`);
  const bad = 'ABCD-EFGH-IJKL-MNOP';
  console.log(`  bad=${bad}  valid=${validateKey(bad)}`);
}

module.exports = { generateKey, validateKey, SECRET };
