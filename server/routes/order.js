const { Router } = require('express');
const { callWebApi } = require('../services/wechat-web-api');

const router = Router();

router.post('/orders/detail', async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({ code: -1, message: '缺少 order_id' });
  }
  try {
    const resp = await callWebApi('/detail/cgi/orderDetail', { id: order_id });
    // web API 返回 { code:0, data:{...} }，取出内层 data 传给前端
    res.json({ code: 0, data: resp.data || resp });
  } catch (err) {
    res.status(500).json({ code: -1, message: err.message, wxCode: err.wxCode });
  }
});

module.exports = router;
