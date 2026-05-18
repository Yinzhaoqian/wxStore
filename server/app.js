const express = require('express');
const path = require('path');
const config = require('./config');
const orderRoutes = require('./routes/order');
const deliveryRoutes = require('./routes/delivery');
const storeConfigRoutes = require('./routes/store-config');

const app = express();

const publicDir = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(publicDir));

app.use('/api', storeConfigRoutes);
app.use('/api', orderRoutes);
app.use('/api', deliveryRoutes);

app.listen(config.port, () => {
  console.log('');
  console.log('========================================');
  console.log('   微信小店管理系统');
  console.log('========================================');
  console.log('');
  console.log(`  ✔ 服务已启动，请在浏览器中打开：`);
  console.log(`    http://localhost:${config.port}`);
  console.log('');
  console.log(`  ✔ 数据文件：${config.STORES_FILE}`);
  console.log('');
  console.log('  ⚠ 请勿关闭此窗口，关闭后程序将停止运行');
  console.log('');
  console.log('========================================');
});
