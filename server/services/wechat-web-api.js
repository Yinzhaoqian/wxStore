const axios = require('axios');
const { getActiveStore } = require('../config');

const WEB_BASE = 'https://store.weixin.qq.com/shop-faas/mmchannelstradeorder';

function buildHeaders(ck, bizMagic) {
  return {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Origin: 'https://store.weixin.qq.com',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    biz_magic: bizMagic || '',
    Cookie: ck || '',
    'potter-scene': 'weixinShop',
  };
}

async function callWebApi(path, data) {
  const store = getActiveStore();
  if (!store) throw new Error('未配置店铺，请先在店铺管理中添加店铺');
  if (!store.ck) throw new Error('当前店铺未设置 Cookie，请在店铺管理中编辑');

  const resp = await axios.post(`${WEB_BASE}${path}`, data, {
    headers: buildHeaders(store.ck, store.bizMagic),
    timeout: 20000,
  });

  const d = resp.data;
  const ok = d.code === 0 || d.errcode === 0 || d.success === true;
  if (!ok) {
    const err = new Error(d.errmsg || d.msg || d.message || '微信接口返回错误');
    err.wxCode = d.code ?? d.errcode;
    throw err;
  }
  return d;
}

module.exports = { callWebApi };
