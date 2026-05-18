const EXPRESS_COMPANIES = [
  { delivery_id: 'SF',   delivery_name: '顺丰速递' },
  { delivery_id: 'JTSD', delivery_name: '极兔速递' },
  { delivery_id: 'ZTO',  delivery_name: '中通快递' },
  { delivery_id: 'YTO',  delivery_name: '圆通速递' },
  { delivery_id: 'YD',   delivery_name: '韵达快递' },
  { delivery_id: 'STO',  delivery_name: '申通快递' },
  { delivery_id: 'EMS',  delivery_name: '邮政EMS' },
  { delivery_id: 'JD',   delivery_name: '京东物流' },
  { delivery_id: 'DBL',  delivery_name: '德邦快递' },
  { delivery_id: 'HTKY', delivery_name: '百世快递' },
];

function buildCompanyOptions(selectedId) {
  return EXPRESS_COMPANIES.map((c) =>
    `<option value="${c.delivery_id}" ${c.delivery_id === selectedId ? 'selected' : ''}>
      ${c.delivery_id} - ${c.delivery_name}
    </option>`
  ).join('');
}
