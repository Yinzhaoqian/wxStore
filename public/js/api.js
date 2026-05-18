const API = {
  async request(url, data, method = 'POST') {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (method !== 'GET' && data) {
      options.body = JSON.stringify(data);
    }
    const res = await fetch(`/api${url}`, options);
    const json = await res.json();
    if (json.code !== 0) {
      throw new Error(json.message || '请求失败');
    }
    return json.data;
  },

  getStores() {
    return this.request('/stores', null, 'GET');
  },
  addStore(data) {
    return this.request('/stores', data);
  },
  updateStore(id, data) {
    return this.request(`/stores/${id}`, data, 'PUT');
  },
  deleteStore(id) {
    return this.request(`/stores/${id}`, null, 'DELETE');
  },
  switchStore(storeId) {
    return this.request('/stores/switch', { storeId });
  },

  getOrderDetail(orderId) {
    return this.request('/orders/detail', { order_id: orderId });
  },

  // data: { order_id, old_express, new_delivery_id, new_waybill_id, buyer_name }
  updateDelivery(data) {
    return this.request('/delivery/update', data);
  },

  // data: { order_id, reason, delivery_id, waybill_id, product_infos, buyer_name }
  compensateDelivery(data) {
    return this.request('/delivery/compensate', data);
  },

  // params: { type, search, startDate, endDate, page, pageSize }
  getLogs(params = {}) {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null)).toString();
    return this.request(`/logs${qs ? '?' + qs : ''}`, null, 'GET');
  },
};
