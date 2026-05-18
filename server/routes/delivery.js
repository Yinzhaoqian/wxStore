const { Router } = require('express');
const { callWebApi } = require('../services/wechat-web-api');

const router = Router();

// 修改物流
// 请求体: { order_id, old_express: {deliveryId,waybillId,productInfos}, new_delivery_id, new_waybill_id }
router.post('/delivery/update', async (req, res) => {
  const { order_id, old_express, new_delivery_id, new_waybill_id } = req.body;
  if (!order_id || !new_waybill_id) {
    return res.status(400).json({ code: -1, message: '缺少 order_id 或 new_waybill_id' });
  }
  try {
    const oldInfo = old_express || {};
    const newInfo = { ...oldInfo, waybillId: new_waybill_id };
    if (new_delivery_id) newInfo.deliveryId = new_delivery_id;

    const data = await callWebApi('/ship/cgi/updateDeliveryInfo', {
      orderId: order_id,
      changeInfo: [{ old: oldInfo, new: newInfo }],
    });
    res.json({ code: 0, message: '物流信息修改成功', data });
  } catch (err) {
    res.status(500).json({ code: -1, message: err.message, wxCode: err.wxCode });
  }
});

// 补发包裹
// 请求体: { order_id, reason, delivery_id, waybill_id, product_infos }
router.post('/delivery/compensate', async (req, res) => {
  const { order_id, reason, delivery_id, waybill_id, product_infos } = req.body;
  if (!order_id || !reason || !waybill_id || !delivery_id) {
    return res.status(400).json({ code: -1, message: '缺少必填字段' });
  }
  try {
    const data = await callWebApi('/ship/cgi/compensationDelivery', {
      orderId: order_id,
      reason: String(reason),
      deliveryProductInfo: [
        {
          deliveryId: delivery_id,
          waybillId: waybill_id,
          productInfos: product_infos || [],
        },
      ],
    });
    res.json({ code: 0, message: '补发成功', data });
  } catch (err) {
    res.status(500).json({ code: -1, message: err.message, wxCode: err.wxCode });
  }
});

module.exports = router;
