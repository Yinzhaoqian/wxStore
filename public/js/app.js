const routes = {
  '/store-config': StoreConfigModule,
  '/shop': ShopModule,
  '/logs': LogsModule,
  '/delivery-update': DeliveryUpdateModule,
  '/delivery-compensate': DeliveryCompensateModule,
};

function navigate() {
  const hash = location.hash.slice(1) || '/store-config';
  const container = document.getElementById('main-content');
  const module = routes[hash];

  document.querySelectorAll('.nav-link').forEach((el) => {
    const isActive = el.dataset.route === hash;
    el.classList.toggle('active', isActive);
    el.classList.toggle('text-white', isActive);
  });

  if (module) {
    module.init(container);
  } else {
    container.innerHTML = '<p>页面不存在</p>';
  }
}

window.addEventListener('hashchange', navigate);
window.addEventListener('DOMContentLoaded', () => {
  StoreHeader.init();
  if (!location.hash) location.hash = '#/store-config';
  navigate();
});
