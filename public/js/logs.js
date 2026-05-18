const LogsModule = {
  _page: 1,
  _pageSize: 50,
  _total: 0,
  _filters: { type: 'all', search: '', startDate: '', endDate: '' },

  init(container) {
    container.innerHTML = `
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-semibold text-warm-800">处理记录</h2>
          <p class="text-xs text-warm-400 mt-0.5">修改物流与补发订单的操作历史</p>
        </div>
        <div class="flex gap-2">
          <button id="btn-logs-export"
            class="flex items-center gap-1.5 border border-warm-200 text-warm-600 px-3 py-1.5 rounded-md text-sm hover:bg-warm-100 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            导出表格
          </button>
          <button id="btn-logs-refresh"
            class="flex items-center gap-1.5 border border-warm-200 text-warm-600 px-3 py-1.5 rounded-md text-sm hover:bg-warm-100 transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            刷新
          </button>
        </div>
      </div>

      <!-- 筛选栏 -->
      <div class="card p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div class="flex-1 min-w-48">
          <input id="logs-search" type="text" placeholder="搜索订单号 / 快递单号 / 店铺 / 买家"
            class="w-full border border-warm-200 rounded-md px-3 py-1.5 text-sm bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        </div>
        <div class="flex gap-2 items-center text-sm text-warm-500">
          <input id="logs-start" type="date"
            class="border border-warm-200 rounded-md px-2 py-1.5 text-sm bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
          <span>至</span>
          <input id="logs-end" type="date"
            class="border border-warm-200 rounded-md px-2 py-1.5 text-sm bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
        </div>
        <select id="logs-type"
          class="border border-warm-200 rounded-md px-3 py-1.5 text-sm bg-warm-50 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand">
          <option value="all">全部类型</option>
          <option value="update">修改物流</option>
          <option value="compensate">补发订单</option>
        </select>
        <button id="btn-logs-search"
          class="bg-warm-800 text-white px-4 py-1.5 rounded-md text-sm hover:bg-warm-700 transition-colors">查询</button>
        <button id="btn-logs-reset"
          class="border border-warm-200 text-warm-500 px-3 py-1.5 rounded-md text-sm hover:bg-warm-100 transition-colors">重置</button>
      </div>

      <!-- 表格 -->
      <div class="card overflow-hidden">
        <div id="logs-table-wrap" class="overflow-x-auto">
          <p class="text-warm-400 text-sm p-6">加载中...</p>
        </div>
        <div id="logs-pagination" class="flex items-center justify-between px-4 py-3 border-t border-warm-100 text-sm text-warm-500"></div>
      </div>
    `;

    document.getElementById('btn-logs-search').onclick = () => this.search();
    document.getElementById('btn-logs-reset').onclick = () => this.reset();
    document.getElementById('btn-logs-refresh').onclick = () => this.load();
    document.getElementById('btn-logs-export').onclick = () => this.exportCsv();
    document.getElementById('logs-search').addEventListener('keydown', e => { if (e.key === 'Enter') this.search(); });

    this._page = 1;
    this.load();
  },

  search() {
    this._filters.search = document.getElementById('logs-search').value.trim();
    this._filters.startDate = document.getElementById('logs-start').value;
    this._filters.endDate = document.getElementById('logs-end').value;
    this._filters.type = document.getElementById('logs-type').value;
    this._page = 1;
    this.load();
  },

  reset() {
    document.getElementById('logs-search').value = '';
    document.getElementById('logs-start').value = '';
    document.getElementById('logs-end').value = '';
    document.getElementById('logs-type').value = 'all';
    this._filters = { type: 'all', search: '', startDate: '', endDate: '' };
    this._page = 1;
    this.load();
  },

  async load() {
    const wrap = document.getElementById('logs-table-wrap');
    if (!wrap) return;
    wrap.innerHTML = '<p class="text-warm-400 text-sm p-6">加载中...</p>';

    try {
      const result = await API.getLogs({
        ...this._filters,
        type: this._filters.type === 'all' ? '' : this._filters.type,
        page: this._page,
        pageSize: this._pageSize,
      });
      this._total = result.total;
      this.renderTable(wrap, result.list);
      this.renderPagination(result.total);
    } catch (err) {
      wrap.innerHTML = `<p class="text-red-500 text-sm p-6">加载失败: ${err.message}</p>`;
    }
  },

  renderTable(wrap, list) {
    if (!list.length) {
      wrap.innerHTML = '<p class="text-warm-400 text-sm p-6 text-center">暂无记录</p>';
      return;
    }

    const typeLabel = { update: '修改物流', compensate: '补发订单' };
    const typeColor = { update: 'bg-blue-50 text-blue-600', compensate: 'bg-amber-50 text-amber-600' };

    const rows = list.map(r => {
      const timeStr = new Date(r.time).toLocaleString('zh-CN', { hour12: false });
      const resultBadge = r.result === 'success'
        ? '<span class="inline-flex items-center gap-1 text-green-600 text-xs font-medium"><span class="w-1.5 h-1.5 rounded-full bg-green-500 inline-block"></span>成功</span>'
        : '<span class="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><span class="w-1.5 h-1.5 rounded-full bg-red-400 inline-block"></span>失败</span>';
      const typeBadge = `<span class="px-2 py-0.5 rounded text-xs font-medium ${typeColor[r.type] || 'bg-warm-100 text-warm-600'}">${typeLabel[r.type] || r.type}</span>`;

      const storeEsc = (r.storeName || '').replace(/"/g, '&quot;');
      const notesEsc = (r.notes || '').replace(/"/g, '&quot;');
      return `<tr class="border-t border-warm-100 hover:bg-warm-50 transition-colors">
        <td class="px-3 py-2 text-xs text-warm-500 whitespace-nowrap">${timeStr}</td>
        <td class="px-3 py-2 whitespace-nowrap">${typeBadge}</td>
        <td class="px-3 py-2 text-xs text-warm-700 max-w-[7rem] truncate" title="${storeEsc}">${r.storeName || '—'}</td>
        <td class="px-3 py-2 text-xs text-warm-500 whitespace-nowrap">${r.buyerName || '—'}</td>
        <td class="px-3 py-2 font-mono text-xs text-warm-700 whitespace-nowrap">${r.orderId || '—'}</td>
        <td class="px-3 py-2 font-mono text-xs text-warm-600 whitespace-nowrap">${r.waybillId || '—'}</td>
        <td class="px-3 py-2 text-xs text-warm-500 whitespace-nowrap">${r.deliveryId || '—'}</td>
        <td class="px-3 py-2 whitespace-nowrap">${resultBadge}</td>
        <td class="px-3 py-2 text-xs text-warm-400 whitespace-nowrap">${r.duration != null ? r.duration + 'ms' : '—'}</td>
        <td class="px-3 py-2 text-xs ${r.result === 'fail' ? 'text-red-400' : 'text-warm-400'} max-w-[10rem] truncate" title="${notesEsc}">${r.notes || '—'}</td>
      </tr>`;
    }).join('');

    wrap.innerHTML = `
      <table class="w-full text-left text-sm">
        <thead class="bg-warm-50 text-xs text-warm-500 uppercase tracking-wide border-b border-warm-200">
          <tr>
            <th class="px-3 py-2 font-medium whitespace-nowrap">时间</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">类型</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">店铺</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">买家</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">订单号</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">快递单号</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">快递</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">结果</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">耗时</th>
            <th class="px-3 py-2 font-medium whitespace-nowrap">备注</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>`;
  },

  renderPagination(total) {
    const el = document.getElementById('logs-pagination');
    if (!el) return;
    const totalPages = Math.ceil(total / this._pageSize) || 1;
    el.innerHTML = `
      <span>共 ${total} 条记录</span>
      <div class="flex items-center gap-2">
        <button id="btn-pg-prev" ${this._page <= 1 ? 'disabled' : ''}
          class="px-3 py-1 rounded border border-warm-200 text-warm-500 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">上一页</button>
        <span class="text-warm-600">${this._page} / ${totalPages}</span>
        <button id="btn-pg-next" ${this._page >= totalPages ? 'disabled' : ''}
          class="px-3 py-1 rounded border border-warm-200 text-warm-500 hover:bg-warm-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">下一页</button>
      </div>`;
    document.getElementById('btn-pg-prev').onclick = () => { this._page--; this.load(); };
    document.getElementById('btn-pg-next').onclick = () => { this._page++; this.load(); };
  },

  async exportCsv() {
    try {
      // 导出全部（不分页）
      const result = await API.getLogs({
        ...this._filters,
        type: this._filters.type === 'all' ? '' : this._filters.type,
        page: 1,
        pageSize: 9999,
      });
      const list = result.list;
      if (!list.length) { alert('暂无数据可导出'); return; }

      const typeLabel = { update: '修改物流', compensate: '补发订单' };
      const header = ['时间', '类型', '店铺', '买家', '订单号', '快递单号', '快递', '结果', '耗时(ms)', '备注'];
      const rows = list.map(r => [
        new Date(r.time).toLocaleString('zh-CN', { hour12: false }),
        typeLabel[r.type] || r.type,
        r.storeName || '',
        r.buyerName || '',
        r.orderId || '',
        r.waybillId || '',
        r.deliveryId || '',
        r.result === 'success' ? '成功' : '失败',
        r.duration != null ? r.duration : '',
        r.notes || '',
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

      const csv = '﻿' + [header.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `处理记录_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('导出失败: ' + err.message);
    }
  },
};
