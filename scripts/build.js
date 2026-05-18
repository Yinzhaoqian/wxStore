/**
 * 打包脚本
 * 用法:
 *   node scripts/build.js            → 正式版（需卡密联网验证）
 *   node scripts/build.js --no-auth  → 免验证版（内部使用）
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const noAuth = process.argv.includes('--no-auth');
const appName = noAuth ? 'XD管理-内部版' : 'XD管理-专业版';
const mainEntry = noAuth ? 'electron/main-paid.js' : 'electron/main.js';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const tag = noAuth ? 'no-auth' : 'release';
const outDir = path.join(__dirname, '..', 'dist-electron', `${timestamp}_${tag}`);

const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const originalMain = pkg.main;
const originalProductName = pkg.build.productName;
const originalOutput = pkg.build.directories.output;

pkg.main = mainEntry;
pkg.build.productName = appName;
pkg.build.directories.output = outDir;
pkg.build.files = [
  'electron/**/*',
  'server/**/*',
  'public/**/*',
  'node_modules/**/*',
  'package.json',
  '!**/.git/**',
  '!**/.claude/**',
  '!**/dist-electron/**',
  '!**/scripts/**',
  '!**/.env',
  '!**/.gitignore',
  '!**/build.log',
  '!**/stores.json',
  '!**/package-lock.json',
  '!**/node_modules/electron-packager/**',
  '!**/node_modules/electron-builder/**',
  '!**/node_modules/nodemon/**',
  '!**/node_modules/concurrently/**',
  '!**/node_modules/wait-on/**',
];

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');

console.log(`\n类型: ${noAuth ? '免验证版（内部使用）' : '正式版（需卡密验证）'}`);
console.log(`输出目录: dist-electron/${timestamp}_${tag}/\n`);

try {
  execSync('npx electron-builder --win --x64', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    env: {
      ...process.env,
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
      CSC_LINK: '',
      WIN_CSC_LINK: '',
    },
  });
  console.log(`\n✓ 打包完成: dist-electron/${timestamp}_${tag}/${appName} Setup 1.0.0.exe\n`);
} finally {
  pkg.main = originalMain;
  pkg.build.productName = originalProductName;
  pkg.build.directories.output = originalOutput;
  pkg.build.files = [
    'electron/**/*',
    'server/**/*',
    'public/**/*',
    'node_modules/**/*',
    'package.json',
  ];
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
}
