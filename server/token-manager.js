const axios = require('axios');
const { getActiveStore } = require('./config');

const tokenCache = {};
let refreshPromises = {};

async function fetchToken(store) {
  const url = 'https://api.weixin.qq.com/cgi-bin/token';
  const res = await axios.get(url, {
    params: {
      appid: store.appId,
      secret: store.appSecret,
      grant_type: 'client_credential',
    },
    timeout: 10000,
  });
  if (res.data.errcode) {
    throw new Error(`获取token失败: ${res.data.errcode} ${res.data.errmsg}`);
  }
  return res.data;
}

async function getToken(forceRefresh = false) {
  const store = getActiveStore();
  if (!store) throw new Error('未选择店铺，请先在店铺管理中添加并选择一个店铺');

  const cacheKey = store.id;

  if (
    !forceRefresh &&
    tokenCache[cacheKey] &&
    Date.now() < tokenCache[cacheKey].expiresAt
  ) {
    return tokenCache[cacheKey].token;
  }

  if (refreshPromises[cacheKey]) return refreshPromises[cacheKey];

  refreshPromises[cacheKey] = fetchToken(store)
    .then((data) => {
      tokenCache[cacheKey] = {
        token: data.access_token,
        expiresAt: Date.now() + (data.expires_in - 300) * 1000,
      };
      delete refreshPromises[cacheKey];
      return tokenCache[cacheKey].token;
    })
    .catch((err) => {
      delete refreshPromises[cacheKey];
      throw err;
    });

  return refreshPromises[cacheKey];
}

function clearTokenCache(storeId) {
  if (storeId) {
    delete tokenCache[storeId];
    delete refreshPromises[storeId];
  }
}

module.exports = { getToken, clearTokenCache };
