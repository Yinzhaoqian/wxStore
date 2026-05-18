/**
 * 预解压 winCodeSign 缓存，绕过 Windows 符号链接权限问题。
 * 运行一次即可，之后 electron-builder 直接使用缓存不会重复下载。
 * 用法: node scripts/setup-wincsodesign.js
 */

const { execSync } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CACHE_VERSION = 'winCodeSign-2.6.0';
const DOWNLOAD_URL = `https://github.com/electron-userland/electron-builder-binaries/releases/download/${CACHE_VERSION}/${CACHE_VERSION}.7z`;
const CACHE_DIR = path.join(process.env.LOCALAPPDATA, 'electron-builder', 'Cache', 'winCodeSign', CACHE_VERSION);
const SEVEN_ZIP = path.join(__dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

if (fs.existsSync(CACHE_DIR)) {
  console.log(`✓ winCodeSign 缓存已存在: ${CACHE_DIR}`);
  process.exit(0);
}

console.log('正在下载 winCodeSign...');
const tmpFile = path.join(os.tmpdir(), `winCodeSign-${Date.now()}.7z`);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = (u, redirectCount = 0) => {
      if (redirectCount > 5) return reject(new Error('Too many redirects'));
      const mod = u.startsWith('https') ? https : require('http');
      mod.get(u, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return req(res.headers.location, redirectCount + 1);
        }
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', reject);
    };
    req(url);
  });
}

(async () => {
  try {
    await download(DOWNLOAD_URL, tmpFile);
    console.log(`✓ 下载完成，开始解压 (跳过 macOS 符号链接)...`);

    fs.mkdirSync(CACHE_DIR, { recursive: true });

    // -xr!darwin 排除 macOS 目录（含符号链接），-bd 不显示进度条
    const { spawnSync } = require('child_process');
    const result = spawnSync(
      SEVEN_ZIP,
      ['x', tmpFile, `-o${CACHE_DIR}`, '-xr!darwin', '-bd', '-y'],
      { stdio: 'inherit' }
    );
    // exit 2 = 警告（有文件被跳过），只要 windows 目录存在就算成功
    const winDir = path.join(CACHE_DIR, 'windows');
    if (result.status !== 0 && result.status !== 2 && !fs.existsSync(winDir)) {
      throw new Error(`7zip 退出码: ${result.status}`);
    }

    fs.unlinkSync(tmpFile);
    console.log(`\n✓ winCodeSign 缓存已就绪: ${CACHE_DIR}`);
    console.log('现在可以运行 node scripts/build.js --paid 打包了。\n');
  } catch (err) {
    console.error('失败:', err.message);
    process.exit(1);
  }
})();
