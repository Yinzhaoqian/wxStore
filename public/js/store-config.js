const StoreConfigModule = {
  stores: [],
  activeStoreId: null,
  editingId: null,

  init(container) {
    container.innerHTML = `
      <h2 class="text-xl font-semibold text-warm-800 mb-4">店铺管理</h2>

      <!-- 添加店铺 -->
      <div class="card p-5 mb-6">
        <h3 class="font-semibold text-warm-700 mb-1">添加新店铺</h3>
        <p class="text-sm text-warm-400 mb-4">
          如何获取 Cookie 和 biz_magic：打开
          <span class="font-mono text-warm-600">store.weixin.qq.com</span>
          登录后，按 F12 → Network → 找任意请求 → 复制请求头中的 Cookie 和 biz_magic 值
        </p>
        <div class="grid grid-cols-1 gap-3 mb-4">
          <div>
            <label class="block text-sm text-warm-500 mb-1">店铺名称 <span class="text-red-400">*</span></label>
            <input id="sc-name" type="text" placeholder="自定义名称，用于识别店铺"
              class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          </div>
          <div>
            <label class="block text-sm text-warm-500 mb-1">Cookie (CK) <span class="text-red-400">*</span></label>
            <textarea id="sc-ck" rows="3" placeholder="粘贴完整的 Cookie 字符串"
              class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-xs resize-none"></textarea>
          </div>
          <div>
            <label class="block text-sm text-warm-500 mb-1">biz_magic</label>
            <input id="sc-biz" type="text" placeholder="biz_magic 请求头的值（可选）"
              class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-xs" />
          </div>
        </div>
        <button id="btn-sc-add"
          class="bg-warm-800 text-white px-6 py-2 rounded-md hover:bg-warm-700 transition-colors">
          添加店铺
        </button>
        <span id="sc-add-status" class="ml-3 text-sm"></span>
      </div>

      <!-- 编辑弹窗 -->
      <div id="sc-edit-modal" class="hidden fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4">
          <h3 class="font-semibold text-warm-800 mb-4">编辑店铺</h3>
          <div class="space-y-3 mb-4">
            <div>
              <label class="block text-sm text-warm-500 mb-1">店铺名称</label>
              <input id="edit-name" type="text"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <label class="block text-sm text-warm-500 mb-1">Cookie (CK)</label>
              <textarea id="edit-ck" rows="3"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-xs resize-none"></textarea>
            </div>
            <div>
              <label class="block text-sm text-warm-500 mb-1">biz_magic</label>
              <input id="edit-biz" type="text"
                class="border border-warm-200 rounded-md px-3 py-2 w-full bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-mono text-xs" />
            </div>
          </div>
          <div class="flex gap-3">
            <button id="btn-edit-save"
              class="bg-warm-800 text-white px-5 py-2 rounded-md hover:bg-warm-700 transition-colors">保存</button>
            <button id="btn-edit-cancel"
              class="border border-warm-300 text-warm-600 px-5 py-2 rounded-md hover:bg-warm-100 transition-colors">取消</button>
            <span id="edit-status" class="ml-2 text-sm self-center"></span>
          </div>
        </div>
      </div>

      <div id="sc-list"></div>
    `;
    document.getElementById('btn-sc-add').onclick = () => this.addStore();
    document.getElementById('btn-edit-save').onclick = () => this.saveEdit();
    document.getElementById('btn-edit-cancel').onclick = () => this.closeEdit();
    this.loadStores();
  },

  async loadStores() {
    try {
      const data = await API.getStores();
      this.stores = data.stores;
      this.activeStoreId = data.activeStoreId;
      this.renderList();
      StoreHeader.update(this.stores, this.activeStoreId);
    } catch (err) {
      const el = document.getElementById('sc-list');
      if (el) el.innerHTML = `<p class="text-red-500">加载失败: ${err.message}</p>`;
    }
  },

  renderList() {
    const container = document.getElementById('sc-list');
    if (!container) return;
    if (!this.stores.length) {
      container.innerHTML = `
        <div class="text-center py-8 text-warm-400">
          <p class="text-lg">暂无店铺</p>
          <p class="text-sm mt-1">请在上方添加你的第一个店铺</p>
        </div>`;
      return;
    }
    container.innerHTML = `
      <h3 class="font-semibold text-warm-700 mb-3">已配置的店铺 (${this.stores.length})</h3>
      <div class="space-y-3">
        ${this.stores.map((s) => `
          <div class="card p-4 flex items-center justify-between
            ${s.id === this.activeStoreId ? 'ring-2 ring-brand/30' : ''}">
            <div class="flex items-center gap-4">
              <div class="w-11 h-11 rounded-full bg-warm-100 flex items-center justify-center text-warm-600 text-lg font-semibold">
                ${(s.name || '?')[0]}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-warm-800">${s.name}</p>
                  ${s.id === this.activeStoreId
                    ? '<span class="bg-brand/10 text-brand text-xs px-2 py-0.5 rounded-full font-medium">当前使用</span>'
                    : ''}
                </div>
                <p class="text-xs text-warm-400 mt-0.5 font-mono">
                  CK: ${s.hasCk ? (s.ckPreview + ' <span class="text-green-600">✓</span>') : '<span class="text-red-400">未设置</span>'}
                  &nbsp;|&nbsp;
                  biz_magic: ${s.hasBizMagic ? '<span class="text-green-600">✓ 已设置</span>' : '<span class="text-warm-400">未设置</span>'}
                </p>
              </div>
            </div>
            <div class="flex gap-2">
              ${s.id !== this.activeStoreId
                ? `<button onclick="StoreConfigModule.switchTo('${s.id}')"
                    class="bg-warm-800 text-white px-3 py-1.5 rounded-md text-sm hover:bg-warm-700 transition-colors">切换使用</button>`
                : ''}
              <button onclick="StoreConfigModule.openEdit('${s.id}')"
                class="border border-warm-300 text-warm-600 px-3 py-1.5 rounded-md text-sm hover:bg-warm-100 transition-colors">编辑</button>
              <button onclick="StoreConfigModule.removeStore('${s.id}', '${s.name}')"
                class="border border-warm-300 text-warm-500 px-3 py-1.5 rounded-md text-sm hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">删除</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  async addStore() {
    const name = document.getElementById('sc-name').value.trim();
    const ck = document.getElementById('sc-ck').value.trim();
    const bizMagic = document.getElementById('sc-biz').value.trim();
    const statusEl = document.getElementById('sc-add-status');
    const btn = document.getElementById('btn-sc-add');
    if (!name || !ck) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = '请填写店铺名称和 Cookie';
      return;
    }
    btn.disabled = true;
    btn.textContent = '添加中...';
    statusEl.textContent = '';
    try {
      await API.addStore({ name, ck, bizMagic });
      document.getElementById('sc-name').value = '';
      document.getElementById('sc-ck').value = '';
      document.getElementById('sc-biz').value = '';
      statusEl.className = 'ml-3 text-sm text-green-600';
      statusEl.textContent = '添加成功!';
      this.loadStores();
    } catch (err) {
      statusEl.className = 'ml-3 text-sm text-red-500';
      statusEl.textContent = err.message;
    } finally {
      btn.disabled = false;
      btn.textContent = '添加店铺';
    }
  },

  openEdit(id) {
    const store = this.stores.find((s) => s.id === id);
    if (!store) return;
    this.editingId = id;
    document.getElementById('edit-name').value = store.name;
    document.getElementById('edit-ck').value = '';
    document.getElementById('edit-biz').value = '';
    document.getElementById('edit-status').textContent = '';
    document.getElementById('sc-edit-modal').classList.remove('hidden');
  },

  closeEdit() {
    this.editingId = null;
    document.getElementById('sc-edit-modal').classList.add('hidden');
  },

  async saveEdit() {
    const name = document.getElementById('edit-name').value.trim();
    const ck = document.getElementById('edit-ck').value.trim();
    const bizMagic = document.getElementById('edit-biz').value.trim();
    const statusEl = document.getElementById('edit-status');
    if (!name) {
      statusEl.className = 'ml-2 text-sm text-red-500';
      statusEl.textContent = '名称不能为空';
      return;
    }
    const payload = { name };
    if (ck) payload.ck = ck;
    if (bizMagic !== '') payload.bizMagic = bizMagic;
    try {
      await API.updateStore(this.editingId, payload);
      statusEl.className = 'ml-2 text-sm text-green-600';
      statusEl.textContent = '已保存';
      setTimeout(() => this.closeEdit(), 600);
      this.loadStores();
    } catch (err) {
      statusEl.className = 'ml-2 text-sm text-red-500';
      statusEl.textContent = err.message;
    }
  },

  async switchTo(id) {
    try {
      await API.switchStore(id);
      this.loadStores();
    } catch (err) {
      alert('切换失败: ' + err.message);
    }
  },

  async removeStore(id, name) {
    if (!confirm(`确定删除店铺 "${name}" 吗？`)) return;
    try {
      await API.deleteStore(id);
      this.loadStores();
    } catch (err) {
      alert('删除失败: ' + err.message);
    }
  },
};

const StoreHeader = {
  update(stores, activeStoreId) {
    const el = document.getElementById('header-store-info');
    if (!el) return;
    if (!stores || !stores.length) {
      el.innerHTML = `<span class="text-sm text-warm-600 bg-warm-100 px-2.5 py-1 rounded-md">未配置店铺</span>`;
      return;
    }
    el.innerHTML = `
      <select id="header-store-select" class="bg-warm-100 text-warm-700 border border-warm-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
        ${stores.map((s) =>
          `<option value="${s.id}" ${s.id === activeStoreId ? 'selected' : ''}>${s.name}</option>`
        ).join('')}
      </select>
    `;
    document.getElementById('header-store-select').onchange = async (e) => {
      try {
        await API.switchStore(e.target.value);
        const data = await API.getStores();
        StoreHeader.update(data.stores, data.activeStoreId);
        navigate();
      } catch (err) {
        alert('切换失败: ' + err.message);
      }
    };
  },

  async init() {
    try {
      const data = await API.getStores();
      this.update(data.stores, data.activeStoreId);
    } catch (err) {
      console.error('加载店铺信息失败:', err);
    }
  },
};
