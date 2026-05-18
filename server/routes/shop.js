const { Router } = require('express');
const { callWechatApi } = require('../services/wechat-api');

const router = Router();

router.get('/shop/info', async (req, res) => {
  try {
    const result = await callWechatApi(
      'https://api.weixin.qq.com/channels/ec/basics/info/get',
      {},
      'GET'
    );
    res.json({ code: 0, data: result.info || result });
  } catch (err) {
    res.status(500).json({
      code: -1,
      message: err.message,
      wx_errcode: err.wxErrcode,
    });
  }
});

module.exports = router;
