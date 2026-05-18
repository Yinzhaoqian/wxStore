const OrderModule = {
  init(container) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-warm-800 mb-4">订单查询</h2>
      <div class="card p-5 mb-4">
        <div class="flex gap-2">
          <input id="order-search-id" type="text" placeholder="输入订单号"
            class="border border-warm-200 rounded-md px-3 py-2 flex-1 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          <button id="btn-search-order"
            class="bg-warm-800 text-white px-4 py-2 rounded-md hover:bg-warm-700 transition-colors">查询</button>
        </div>
      </div>
      <div id="order-result"></div>
    `;
    document.getElementById('btn-search-order').onclick = () => this.search();
    document.getElementById('order-search-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.search();
    });
  },

  async search() {
    const orderId = document.getElementById('order-search-id').value.trim();
    const resultDiv = document.getElementById('order-result');
    if (!orderId) {
      resultDiv.innerHTML = '<p class="text-red-500 text-sm">请输入订单号</p>';
      return;
    }
    resultDiv.innerHTML = '<p class="text-warm-400 text-sm">查询中...</p>';
    try {
      const data = await API.getOrderDetail(orderId);
      this.renderOrder(resultDiv, data);
    } catch (err) {
      resultDiv.innerHTML = `<p class="text-red-500 text-sm">查询失败: ${err.message}</p>`;
    }
  },

  renderOrder(container, d) {
    // d = resp.data = { commonInfo, orderProducts, expressInfo, acceptInfo, ... }
    const info = d.commonInfo || {};
    const products = d.orderProducts?.orderProductInfo || [];
    const deliveries = d.expressInfo?.deliveryProductInfo || [];
    const unshipped = d.expressInfo?.formatUnshippedProductList || [];

    let html = `
      <div class="card p-5 mb-4">
        <h3 class="font-semibold text-warm-700 mb-3">订单信息</h3>
        <div class="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <p><span class="text-warm-500">订单号:</span> <span class="font-mono text-warm-800">${info.orderId || '—'}</span></p>
          <p><span class="text-warm-500">状态:</span> <span class="text-warm-700">${info.statusStr || this.getStatusText(info.status)}</span></p>
          <p><span class="text-warm-500">买家:</span> <span class="text-warm-700">${d.buyerInfo?.nickName || '—'}</span></p>
          <p><span class="text-warm-500">下单时间:</span> <span class="text-warm-700">${info.createTime ? new Date(info.createTime * 1000).toLocaleString() : '—'}</span></p>
        </div>
      </div>
    `;

    if (products.length) {
      html += `
        <div class="card p-5 mb-4">
          <h3 class="font-semibold text-warm-700 mb-3">商品列表</h3>
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-warm-100 text-warm-500">
                <th class="text-left py-2 font-medium">商品</th>
                <th class="text-left py-2 font-medium">规格</th>
                <th class="text-right py-2 font-medium">数量</th>
              </tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr class="border-b border-warm-50">
                  <td class="py-2 text-warm-700">${p.title || '—'}</td>
                  <td class="py-2 text-warm-500 text-xs">${(p.saleParam || []).join(' / ') || '—'}</td>
                  <td class="py-2 text-right text-warm-700">${p.productCnt || 1}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    if (deliveries.length) {
      html += `
        <div class="card p-5 mb-4">
          <h3 class="font-semibold text-warm-700 mb-3">物流信息（已发货）</h3>
          ${deliveries.map((d, i) => `
            <div class="text-sm bg-warm-50 rounded-md p-3 mb-2">
              <p class="text-warm-700">
                包裹${i + 1}：${d.deliveryId || '—'}
                &nbsp;|&nbsp;
                运单号: <span class="font-mono">${d.waybillId || '—'}</span>
              </p>
            </div>
          `).join('')}
        </div>`;
    }

    if (unshipped.length) {
      html += `
        <div class="card p-5">
          <h3 class="font-semibold text-warm-700 mb-2">待发货商品</h3>
          ${unshipped.map(p => `
            <p class="text-sm text-warm-600 py-1 border-b border-warm-50">
              ${p.title || '—'} &nbsp;
              <span class="text-warm-400 text-xs">${(p.saleParam || []).join(' / ')}</span>
              &nbsp;×${p.productCnt || 1}
            </p>
          `).join('')}
        </div>`;
    }

    container.innerHTML = html;
  },

  getStatusText(status) {
    const map = { 10: '待付款', 20: '待发货', 30: '已发货', 100: '已完成', 200: '已取消', 250: '已关闭' };
    return map[status] || `状态${status}`;
  },
};
