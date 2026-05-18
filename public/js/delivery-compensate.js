const DeliveryCompensateModule = {
  currentOrder: null,
  _products: [],

  init(container) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-warm-800 mb-4">补发订单</h2>
      <div class="card p-5 mb-4">
        <div class="flex gap-2">
          <input id="dc-order-id" type="text" placeholder="输入订单号"
            class="border border-warm-200 rounded-md px-3 py-2 flex-1 bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          <button id="btn-dc-search"
            class="bg-warm-800 text-white px-4 py-2 rounded-md hover:bg-warm-700 transition-colors">查询订单</button>
        </div>
      </div>
      <div id="dc-order-info"></div>
      <div id="dc-form" class="hidden">
        <div class="card p-5 mt-4">
          <h3 class="font-semibold text-warm-700 mb-1">补发货信息</h3>
          <p class="text-sm text-amber-600 mb-4">注意：一个订单最多可补发 10 次</p>
          <div class="mb-4">
            <label class="block text-sm text-warm-500 mb-1">补发原因</label>
            <select id="dc-reason"
              class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
              <option value="1">商品漏发</option>
              <option value="2">商品拆分包裹</option>
              <option value="3">商品坏损</option>
              <option value="4">赠品</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm text-warm-500 mb-1">快递公司</label>
              <select id="dc-company"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"></select>
            </div>
            <div>
              <label class="block text-sm text-warm-500 mb-1">快递单号</label>
              <input id="dc-waybill" type="text" placeholder="输入快递单号"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
          </div>
          <div id="dc-products" class="mb-4"></div>
          <button id="btn-dc-submit"
            class="bg-warm-800 text-white px-6 py-2 rounded-md hover:bg-warm-700 transition-colors">提交补发</button>
          <span id="dc-submit-status" class="ml-3 text-sm"></span>
        </div>
      </div>
    `;
    document.getElementById('btn-dc-search').onclick = () => this.searchOrder();
    document.getElementById('btn-dc-submit').onclick = () => this.submit();
    document.getElementById('dc-order-id').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.searchOrder();
    });
    document.getElementById('dc-company').innerHTML = buildCompanyOptions();
  },

  async searchOrder() {
    const orderId = document.getElementById('dc-order-id').value.trim();
    const infoDiv = document.getElementById('dc-order-info');
    const formDiv = document.getElementById('dc-form');
    if (!orderId) {
      infoDiv.innerHTML = '<p class="text-red-500 text-sm">请输入订单号</p>';
      formDiv.classList.add('hidden');
      return;
    }
    infoDiv.innerHTML = '<p class="text-warm-400 text-sm">查询中...</p>';
    formDiv.classList.add('hidden');
    this.currentOrder = null;
    this._products = [];
    try {
      const d = await API.getOrderDetail(orderId);
      this.currentOrder = d;
      // 取商品列表：orderProducts.orderProductInfo
      this._products = d.orderProducts?.orderProductInfo || [];
      this.renderOrderInfo(infoDiv, d);
      this.renderProducts();
      formDiv.classList.remove('hidden');
    } catch (err) {
      infoDiv.innerHTML = `<p class="text-red-500 text-sm">查询失败: ${err.message}</p>`;
    }
  },

  renderOrderInfo(container, d) {
    const info = d.commonInfo || {};
    container.innerHTML = `
      <div class="card p-4">
        <h3 class="font-semibold text-warm-700 mb-2">订单信息</h3>
        <p class="text-sm text-warm-600">订单号: <span class="font-mono">${info.orderId || '—'}</span></p>
        <p class="text-sm text-warm-600">状态: ${info.statusStr || '—'}</p>
        <p class="text-sm text-warm-600">买家: ${d.buyerInfo?.nickName || '—'}</p>
      </div>
    `;
  },

  renderProducts() {
    const container = document.getElementById('dc-products');
    if (!this._products.length) {
      container.innerHTML = '<p class="text-sm text-warm-400">未获取到商品信息</p>';
      return;
    }
    container.innerHTML = `
      <label class="block text-sm text-warm-500 mb-2">选择补发商品及数量</label>
      ${this._products.map((p, i) => `
        <div class="flex items-center gap-3 mb-2">
          <input type="checkbox" class="dc-product-check" data-index="${i}" checked />
          <span class="flex-1 text-sm text-warm-700">
            ${p.title || '—'}
            <span class="text-warm-400 text-xs ml-1">${(p.saleParam || []).join(' / ')}</span>
          </span>
          <input type="number" class="dc-product-cnt border border-warm-200 rounded-md px-2 py-1 w-20 text-sm"
            data-index="${i}" value="${p.productCnt || 1}" min="1" />
        </div>
      `).join('')}
    `;
  },

  async submit() {
    const statusEl = document.getElementById('dc-submit-status');
    if (!this.currentOrder) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '请先查询订单';
      return;
    }
    const reason = document.getElementById('dc-reason').value;
    const deliveryId = document.getElementById('dc-company').value;
    const waybillId = document.getElementById('dc-waybill').value.trim();
    if (!waybillId) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '请输入快递单号';
      return;
    }

    const checks = document.querySelectorAll('.dc-product-check:checked');
    const selectedProducts = Array.from(checks).map((cb) => {
      const idx = cb.dataset.index;
      const p = this._products[idx] || {};
      const cnt = document.querySelector(`.dc-product-cnt[data-index="${idx}"]`)?.value || 1;
      return {
        productId: p.productId || '',
        skuId: p.skuId || '',
        productCount: parseInt(cnt) || 1,
      };
    });

    const orderId = this.currentOrder.commonInfo?.orderId;
    const reasonLabels = ['', '商品漏发', '拆分包裹', '商品坏损', '赠品'];
    if (!confirm(`确认补发订单？\n原因: ${reasonLabels[reason]}\n快递: ${deliveryId}  单号: ${waybillId}`)) return;

    const btn = document.getElementById('btn-dc-submit');
    btn.disabled = true;
    statusEl.className = 'ml-3 text-sm text-warm-400';
    statusEl.textContent = '提交中...';
    try {
      await API.compensateDelivery({
        order_id: orderId,
        reason,
        delivery_id: deliveryId,
        waybill_id: waybillId,
        product_infos: selectedProducts,
      });
      statusEl.className = 'ml-3 text-sm text-green-600';
      statusEl.textContent = '补发成功！';
    } catch (err) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '补发失败: ' + err.message;
    } finally {
      btn.disabled = false;
    }
  },
};
