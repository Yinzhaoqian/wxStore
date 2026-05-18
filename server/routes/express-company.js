const { Router } = require('express');
const { callWechatApi } = require('../services/wechat-api');

const router = Router();

let companyCache = null;
let companyCacheTime = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

router.get('/express-companies', async (req, res) => {
  try {
    if (companyCache && Date.now() - companyCacheTime < CACHE_TTL) {
      return res.json({ code: 0, data: companyCache });
    }
    const result = await callWechatApi(
      'https://api.weixin.qq.com/channels/ec/order/deliverycompanylist/new/get',
      { ewaybill_only: false }
    );
    companyCache = result.company_list || [];
    companyCacheTime = Date.now();
    res.json({ code: 0, data: companyCache });
  } catch (err) {
    res.status(500).json({
      code: -1,
      message: err.message,
      wx_errcode: err.wxErrcode,
    });
  }
});

module.exports = router;
