/**
 * 打包脚本
 * 用法:
 *   node scripts/build.js          → 试用版（需密匙，30分钟）
 *   node scripts/build.js --paid   → 正式版（无密匙限制）
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const isPaid = process.argv.includes('--paid');
const appName = isPaid ? 'XD管理-正式版' : 'XD管理-试用版';
const mainEntry = isPaid ? 'electron/main-paid.js' : 'electron/main.js';

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const tag = isPaid ? 'paid' : 'trial';
const outDir = path.join(__dirname, '..', 'dist-electron', `${timestamp}_${tag}`);
const appDir = path.join(outDir, `${appName}-win32-x64`);

// 打包时临时把 package.json 的 main 改成对应入口
const pkgPath = path.join(__dirname, '..', 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
const originalMain = pkg.main;
pkg.main = mainEntry;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');

const ignores = [
  '^/\\.git',
  '^/\\.claude',
  '^/dist-electron',
  '^/dist[^-]',
  '^/scripts',
  '^\\.env',
  '^\\.gitignore',
  '^/build\\.log',
  '^/stores\\.json',
  '^/package-lock\\.json',
  '^/node_modules/electron-packager',
  '^/node_modules/electron-builder',
  '^/node_modules/nodemon',
  '^/node_modules/concurrently',
  '^/node_modules/wait-on',
].map(p => `--ignore="${p}"`).join(' ');

const cmd = `npx electron-packager . "${appName}" --platform=win32 --arch=x64 --out="${outDir}" ${ignores}`;

console.log(`\n类型: ${isPaid ? '正式版（无密匙）' : '试用版（30分钟密匙）'}`);
console.log(`输出目录: dist-electron/${timestamp}_${tag}/\n`);

try {
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

  // 生成卸载脚本
  const uninstallBat = `@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════╗
echo ║        XD管理 — 卸载程序            ║
echo ╚══════════════════════════════════════╝
echo.
echo 此操作将删除 XD管理 程序文件夹。
echo.
set /p confirm=确认卸载？请输入 Y 继续，其他键取消：
if /i not "%confirm%"=="Y" (
  echo 已取消。
  pause
  exit /b 0
)
echo.
echo 正在关闭运行中的程序...
taskkill /f /im "${appName}.exe" >nul 2>&1
timeout /t 1 >nul

echo 正在删除程序文件...
set "APP_DIR=%~dp0"
cd /d "%TEMP%"
rd /s /q "%APP_DIR%"

echo.
echo 是否同时删除用户数据（店铺配置、操作记录等）？
set /p deldata=输入 Y 删除数据，其他键保留：
if /i "%deldata%"=="Y" (
  rd /s /q "%APPDATA%\\wxstore" >nul 2>&1
  echo 用户数据已删除。
) else (
  echo 用户数据已保留在 %APPDATA%\\wxstore
)
echo.
echo XD管理 已卸载完成。
pause
`;

  fs.writeFileSync(path.join(appDir, '卸载.bat'), uninstallBat, 'utf-8');
  console.log(`✓ 打包完成: dist-electron/${timestamp}_${tag}/${appName}-win32-x64/${appName}.exe`);
  console.log(`✓ 卸载脚本: dist-electron/${timestamp}_${tag}/${appName}-win32-x64/卸载.bat\n`);
} finally {
  // 还原 package.json
  pkg.main = originalMain;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf-8');
}
