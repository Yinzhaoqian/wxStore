const ShopModule = {
  init(container) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-warm-800 mb-4">店铺信息</h2>
      <div id="shop-content"><p class="text-warm-400 text-sm">加载中...</p></div>
    `;
    this.load();
  },

  async load() {
    try {
      const data = await API.getStores();
      const activeId = data.activeStoreId;
      const store = data.stores.find((s) => s.id === activeId);
      this.render(store);
    } catch (err) {
      document.getElementById('shop-content').innerHTML =
        `<p class="text-red-500">加载失败: ${err.message}</p>`;
    }
  },

  render(store) {
    const el = document.getElementById('shop-content');
    if (!store) {
      el.innerHTML = `
        <div class="card p-6 text-center text-warm-400">
          <p class="text-lg">暂无活动店铺</p>
          <p class="text-sm mt-1">请先在「店铺管理」中添加并配置店铺</p>
        </div>`;
      return;
    }
    el.innerHTML = `
      <div class="card p-6">
        <div class="flex items-center gap-4 mb-6 pb-5 border-b border-warm-100">
          <div class="w-16 h-16 rounded-full bg-warm-100 flex items-center justify-center text-warm-600 text-2xl font-bold">
            ${(store.name || '?')[0]}
          </div>
          <div>
            <h3 class="text-xl font-semibold text-warm-800">${store.name}</h3>
            <span class="inline-block mt-1 text-xs px-2.5 py-0.5 rounded-full bg-brand/10 text-brand font-medium">当前使用中</span>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-warm-50 rounded-lg p-4">
            <p class="text-sm text-warm-500 mb-1">Cookie (CK)</p>
            ${store.hasCk
              ? `<p class="text-green-600 font-medium text-sm">✓ 已配置</p>
                 <p class="text-xs text-warm-400 font-mono mt-1">${store.ckPreview}</p>`
              : `<p class="text-red-500 text-sm">✗ 未配置</p>
                 <p class="text-xs text-warm-400 mt-1">请在「店铺管理」中编辑店铺并填写 Cookie</p>`}
          </div>
          <div class="bg-warm-50 rounded-lg p-4">
            <p class="text-sm text-warm-500 mb-1">biz_magic</p>
            ${store.hasBizMagic
              ? `<p class="text-green-600 font-medium text-sm">✓ 已配置</p>`
              : `<p class="text-warm-400 text-sm">未配置（可选）</p>`}
          </div>
        </div>
      </div>
    `;
  },
};
