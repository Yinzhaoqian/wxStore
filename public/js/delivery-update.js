const DeliveryUpdateModule = {
  currentOrder: null,
  oldExpress: null,

  init(container) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-warm-800 mb-4">修改物流</h2>
      <div class="card p-5 mb-4">
        <div class="flex gap-2">
          <input id="du-order-id" type="text" placeholder="输入订单号"
            class="border border-warm-200 rounded-md px-3 py-2 flex-1 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          <button id="btn-du-search"
            class="bg-warm-800 text-white px-4 py-2 rounded-md hover:bg-warm-700 transition-colors">查询订单</button>
        </div>
      </div>
      <div id="du-order-info"></div>
      <div id="du-form" class="hidden">
        <div class="card p-5 mt-4">
          <h3 class="font-semibold text-warm-700 mb-1">修改物流信息</h3>
          <p class="text-sm text-amber-600 mb-4">注意：未完成状态下最多可修改 3 次物流信息</p>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm text-warm-500 mb-1">快递公司</label>
              <select id="du-company"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"></select>
            </div>
            <div>
              <label class="block text-sm text-warm-500 mb-1">新快递单号</label>
              <input id="du-waybill" type="text" placeholder="输入新的快递单号"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
          </div>
          <button id="btn-du-submit"
            class="bg-warm-800 text-white px-6 py-2 rounded-md hover:bg-warm-700 transition-colors">提交修改</button>
          <span id="du-submit-status" class="ml-3 text-sm"></span>
        </div>
      </div>
    `;
    document.getElementById('btn-du-search').onclick = () => this.searchOrder();
    document.getElementById('btn-du-submit').onclick = () => this.submit();
    document.getElementById('du-order-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.searchOrder();
    });
    document.getElementById('du-company').innerHTML = buildCompanyOptions();
  },

  async searchOrder() {
    const orderId = document.getElementById('du-order-id').value.trim();
    const infoDiv = document.getElementById('du-order-info');
    const formDiv = document.getElementById('du-form');
    if (!orderId) {
      infoDiv.innerHTML = '<p class="text-red-500 text-sm">请输入订单号</p>';
      formDiv.classList.add('hidden');
      return;
    }
    infoDiv.innerHTML = '<p class="text-warm-400 text-sm">查询中...</p>';
    formDiv.classList.add('hidden');
    this.currentOrder = null;
    this.oldExpress = null;
    try {
      // API.getOrderDetail 返回的是 resp.data = { commonInfo, orderProducts, expressInfo, ... }
      const d = await API.getOrderDetail(orderId);
      this.currentOrder = d;

      // 已发货包裹
      const deliveries = d.expressInfo?.deliveryProductInfo || [];
      if (deliveries.length) {
        const first = deliveries[0];
        this.oldExpress = {
          deliveryId: first.deliveryId || '',
          waybillId: first.waybillId || '',
          productInfos: first.productInfos || [],
        };
        // 预填当前快递公司
        const sel = document.getElementById('du-company');
        if (sel && this.oldExpress.deliveryId) sel.value = this.oldExpress.deliveryId;
      }

      this.renderOrderInfo(infoDiv, d);
      formDiv.classList.remove('hidden');
    } catch (err) {
      infoDiv.innerHTML = `<p class="text-red-500 text-sm">查询失败: ${err.message}</p>`;
    }
  },

  renderOrderInfo(container, d) {
    const info = d.commonInfo || {};
    const deliveries = d.expressInfo?.deliveryProductInfo || [];
    container.innerHTML = `
      <div class="card p-4">
        <h3 class="font-semibold text-warm-700 mb-2">当前订单信息</h3>
        <p class="text-sm text-warm-600">订单号: <span class="font-mono">${info.orderId || '—'}</span></p>
        <p class="text-sm text-warm-600">状态: ${info.statusStr || '—'}</p>
        ${deliveries.length ? `
          <div class="mt-2">
            <p class="text-sm text-warm-500">当前物流:</p>
            ${deliveries.map((d, i) => `
              <p class="text-sm text-warm-700 ml-2">
                包裹${i + 1}：${d.deliveryId || '—'} &nbsp;|&nbsp; 运单号: <span class="font-mono">${d.waybillId || '—'}</span>
              </p>
            `).join('')}
          </div>
        ` : '<p class="text-sm text-amber-600 mt-1">该订单暂无已发货物流，无法修改</p>'}
      </div>
    `;
  },

  async submit() {
    const statusEl = document.getElementById('du-submit-status');
    if (!this.currentOrder) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '请先查询订单';
      return;
    }
    if (!this.oldExpress || !this.oldExpress.waybillId) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '该订单无已发货物流，无法修改';
      return;
    }
    const deliveryId = document.getElementById('du-company').value;
    const waybillId = document.getElementById('du-waybill').value.trim();
    if (!waybillId) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '请输入快递单号';
      return;
    }
    const orderId = this.currentOrder.commonInfo?.orderId;
    if (!confirm(`确认修改物流？\n快递: ${deliveryId}  单号: ${waybillId}`)) return;

    const btn = document.getElementById('btn-du-submit');
    btn.disabled = true;
    statusEl.className = 'ml-3 text-sm text-warm-400';
    statusEl.textContent = '提交中...';
    try {
      await API.updateDelivery({
        order_id: orderId,
        old_express: this.oldExpress,
        new_delivery_id: deliveryId,
        new_waybill_id: waybillId,
        buyer_name: this.currentOrder?.buyerInfo?.nickName || '',
      });
      statusEl.className = 'ml-3 text-sm text-green-600';
      statusEl.textContent = '物流信息修改成功！';
    } catch (err) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '修改失败: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  },
};
