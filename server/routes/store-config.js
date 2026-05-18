const { Router } = require('express');
const crypto = require('crypto');
const { readStores, writeStores } = require('../config');

const router = Router();

router.get('/stores', (req, res) => {
  const data = readStores();
  const safes = data.stores.map((s) => ({
    id: s.id,
    name: s.name,
    ckPreview: s.ck ? s.ck.slice(0, 12) + '...' : '',
    hasCk: Boolean(s.ck),
    hasBizMagic: Boolean(s.bizMagic),
  }));
  res.json({ code: 0, data: { stores: safes, activeStoreId: data.activeStoreId } });
});

router.post('/stores', (req, res) => {
  const { name, ck, bizMagic } = req.body;
  if (!name || !ck) {
    return res.status(400).json({ code: -1, message: '请填写店铺名称和 Cookie' });
  }
  const data = readStores();
  const id = crypto.randomBytes(8).toString('hex');
  data.stores.push({ id, name: name.trim(), ck: ck.trim(), bizMagic: (bizMagic || '').trim() });
  if (!data.activeStoreId) data.activeStoreId = id;
  writeStores(data);
  res.json({ code: 0, message: `店铺 "${name}" 添加成功`, data: { id, name } });
});

router.put('/stores/:id', (req, res) => {
  const { name, ck, bizMagic } = req.body;
  const data = readStores();
  const store = data.stores.find((s) => s.id === req.params.id);
  if (!store) return res.status(404).json({ code: -1, message: '店铺不存在' });
  if (name) store.name = name.trim();
  if (ck) store.ck = ck.trim();
  if (bizMagic !== undefined) store.bizMagic = bizMagic.trim();
  writeStores(data);
  res.json({ code: 0, message: '店铺更新成功' });
});

router.delete('/stores/:id', (req, res) => {
  const data = readStores();
  const idx = data.stores.findIndex((s) => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ code: -1, message: '店铺不存在' });
  data.stores.splice(idx, 1);
  if (data.activeStoreId === req.params.id) {
    data.activeStoreId = data.stores.length ? data.stores[0].id : null;
  }
  writeStores(data);
  res.json({ code: 0, message: '店铺已删除' });
});

router.post('/stores/switch', (req, res) => {
  const { storeId } = req.body;
  const data = readStores();
  const store = data.stores.find((s) => s.id === storeId);
  if (!store) return res.status(404).json({ code: -1, message: '店铺不存在' });
  data.activeStoreId = storeId;
  writeStores(data);
  res.json({ code: 0, message: `已切换到: ${store.name}` });
});

module.exports = router;
