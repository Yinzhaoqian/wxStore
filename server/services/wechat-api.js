const axios = require('axios');
const { getToken } = require('../token-manager');

async function callWechatApi(url, data = {}, method = 'POST') {
  let token = await getToken();
  let res = await axios({
    method,
    url: `${url}${url.includes('?') ? '&' : '?'}access_token=${token}`,
    data: method === 'POST' ? data : undefined,
    params: method === 'GET' ? data : undefined,
    timeout: 10000,
  });

  if (res.data.errcode === 40001 || res.data.errcode === 42001) {
    token = await getToken(true);
    res = await axios({
      method,
      url: `${url}${url.includes('?') ? '&' : '?'}access_token=${token}`,
      data: method === 'POST' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      timeout: 10000,
    });
  }

  if (res.data.errcode && res.data.errcode !== 0) {
    const err = new Error(res.data.errmsg || '微信API调用失败');
    err.wxErrcode = res.data.errcode;
    err.wxErrmsg = res.data.errmsg;
    throw err;
  }

  return res.data;
}

module.exports = { callWechatApi };
