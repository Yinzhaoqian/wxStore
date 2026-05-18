const { Router } = require('express');
const { callWebApi } = require('../services/wechat-web-api');
const { getActiveStore } = require('../config');
const { appendLog } = require('../services/operation-log');

const router = Router();

// 修改物流
// 请求体: { order_id, old_express, new_delivery_id, new_waybill_id, buyer_name }
router.post('/delivery/update', async (req, res) => {
  const { order_id, old_express, new_delivery_id, new_waybill_id, buyer_name } = req.body;
  if (!order_id || !new_waybill_id) {
    return res.status(400).json({ code: -1, message: '缺少 order_id 或 new_waybill_id' });
  }

  const store = getActiveStore();
  const storeName = store?.name || '—';
  const start = Date.now();

  try {
    const oldInfo = old_express || {};
    const newInfo = { ...oldInfo, waybillId: new_waybill_id };
    if (new_delivery_id) newInfo.deliveryId = new_delivery_id;

    const data = await callWebApi('/ship/cgi/updateDeliveryInfo', {
      orderId: order_id,
      changeInfo: [{ old: oldInfo, new: newInfo }],
    });

    appendLog({
      type: 'update',
      storeName,
      orderId: order_id,
      waybillId: new_waybill_id,
      deliveryId: new_delivery_id || oldInfo.deliveryId || '',
      result: 'success',
      duration: Date.now() - start,
      notes: '修改成功',
      buyerName: buyer_name || '',
    });

    res.json({ code: 0, message: '物流信息修改成功', data });
  } catch (err) {
    appendLog({
      type: 'update',
      storeName,
      orderId: order_id,
      waybillId: new_waybill_id,
      deliveryId: new_delivery_id || (old_express || {}).deliveryId || '',
      result: 'fail',
      duration: Date.now() - start,
      notes: err.message,
      buyerName: buyer_name || '',
    });

    res.status(500).json({ code: -1, message: err.message, wxCode: err.wxCode });
  }
});

// 补发包裹
// 请求体: { order_id, reason, delivery_id, waybill_id, product_infos, buyer_name }
router.post('/delivery/compensate', async (req, res) => {
  const { order_id, reason, delivery_id, waybill_id, product_infos, buyer_name } = req.body;
  if (!order_id || !reason || !waybill_id || !delivery_id) {
    return res.status(400).json({ code: -1, message: '缺少必填字段' });
  }

  const store = getActiveStore();
  const storeName = store?.name || '—';
  const start = Date.now();

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

    appendLog({
      type: 'compensate',
      storeName,
      orderId: order_id,
      waybillId: waybill_id,
      deliveryId: delivery_id,
      result: 'success',
      duration: Date.now() - start,
      notes: '补发成功',
      buyerName: buyer_name || '',
    });

    res.json({ code: 0, message: '补发成功', data });
  } catch (err) {
    appendLog({
      type: 'compensate',
      storeName,
      orderId: order_id,
      waybillId: waybill_id,
      deliveryId: delivery_id,
      result: 'fail',
      duration: Date.now() - start,
      notes: err.message,
      buyerName: buyer_name || '',
    });

    res.status(500).json({ code: -1, message: err.message, wxCode: err.wxCode });
  }
});

module.exports = router;
