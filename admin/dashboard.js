/* =========================================
   CONFIG
   ========================================= */
const API = window.location.origin + '/api';

/* =========================================
   CHART.JS DEFAULTS (tema oscuro)
   ========================================= */
Chart.defaults.color          = '#9999bb';
Chart.defaults.borderColor    = 'rgba(255,255,255,0.06)';
Chart.defaults.font.family    = "'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size      = 11;
Chart.defaults.plugins.legend.labels.boxWidth  = 10;
Chart.defaults.plugins.legend.labels.padding   = 14;
Chart.defaults.plugins.tooltip.backgroundColor = '#2a2a3e';
Chart.defaults.plugins.tooltip.borderColor     = 'rgba(255,255,255,0.1)';
Chart.defaults.plugins.tooltip.borderWidth     = 1;
Chart.defaults.plugins.tooltip.padding         = 10;
Chart.defaults.plugins.tooltip.titleFont       = { weight: '700', size: 12 };

/* =========================================
   COLORES POR ESTILO
   ========================================= */
const STYLE_COLORS = {
  salsa:    '#f87171',
  bachata:  '#c084fc',
  tango:    '#fbbf24',
  flamenco: '#fb923c',
  swing:    '#4ade80',
  kizomba:  '#2dd4bf',
};

const PAY_COLORS = {
  card:   '#3b82f6',
  paypal: '#f59e0b',
  bizum:  '#22c55e',
};

const PALETTE = ['#e0175b','#3b82f6','#22c55e','#f59e0b','#a855f7','#14b8a6','#f97316','#ec4899'];

/* =========================================
   UTILITIES
   ========================================= */
function fmt(n) { return parseFloat(n).toFixed(2).replace('.', ',') + ' €'; }
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtDateShort(s) {
  const d = new Date(s);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
}
function payIcon(m) { return { card: '💳', paypal: '🅿', bizum: '📱' }[m] || '💰'; }
function payLabel(m) { return { card: 'Tarjeta', paypal: 'PayPal', bizum: 'Bizum' }[m] || m; }
function styleChip(style) {
  const cls = `style-chip chip-${style}`;
  const labels = { salsa:'Salsa', bachata:'Bachata', tango:'Tango', flamenco:'Flamenco', swing:'Swing', kizomba:'Kizomba' };
  return `<span class="${cls}">${labels[style] || style}</span>`;
}
function uniqueStyles(csvStyles) {
  if (!csvStyles) return '';
  return [...new Set(csvStyles.split(','))].map(s => styleChip(s)).join(' ');
}

/* =========================================
   CHART REGISTRY
   ========================================= */
const charts = {};
function destroyChart(id) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } }
function saveChart(id, instance) { charts[id] = instance; }

/* =========================================
   API CALLS
   ========================================= */
async function apiFetch(path) {
  const res = await fetch(API + path);
  if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
  return res.json();
}

/* =========================================
   SECCIÓN: RESUMEN
   ========================================= */
async function loadOverview() {
  try {
    const [stats, byDay, byStyle, byPayment, topEvents, ticketTypes, recentOrders] = await Promise.all([
      apiFetch('/dashboard/stats'),
      apiFetch('/dashboard/revenue-by-day'),
      apiFetch('/dashboard/sales-by-style'),
      apiFetch('/dashboard/payment-methods'),
      apiFetch('/dashboard/top-events'),
      apiFetch('/dashboard/tickets-by-type'),
      apiFetch('/dashboard/recent-orders'),
    ]);

    renderKPIs(stats);
    renderRevenueChart(byDay);
    renderOrdersChart(byDay);
    renderStyleChart(byStyle);
    renderPaymentChart(byPayment);
    renderTicketTypeChart(ticketTypes);
    renderTopEventsChart(topEvents);
    renderRecentOrders(recentOrders);
  } catch (e) {
    console.error('Error cargando resumen:', e);
    showConnectionError('kpiGrid');
  }
}

/* ── KPIs ── */
function renderKPIs(s) {
  const kpis = [
    { icon: '💰', label: 'Ingresos totales',    value: fmt(s.totalRevenue), delta: `Hoy: ${fmt(s.todayRevenue)}`,  cls: 'up' },
    { icon: '🛒', label: 'Total pedidos',        value: s.totalOrders,       delta: `Hoy: ${s.todayOrders} pedidos`, cls: s.todayOrders > 0 ? 'up' : '' },
    { icon: '🎟️', label: 'Entradas vendidas',   value: s.totalTickets,      delta: `Prom. ${Math.round(s.totalTickets/(s.totalOrders||1))} / pedido`, cls: '' },
    { icon: '📊', label: 'Ticket medio',         value: fmt(s.avgOrder),     delta: 'Por pedido',                 cls: '' },
    { icon: '🏆', label: 'Estilo más vendido',   value: s.topStyle.charAt(0).toUpperCase()+s.topStyle.slice(1), delta: 'Por ingresos', cls: '' },
    { icon: '🌟', label: 'Evento top',           value: s.topEvent,          delta: 'Por ingresos',               cls: '' },
  ];

  document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-icon">${k.icon}</div>
      <div class="kpi-label">${k.label}</div>
      <div class="kpi-value">${k.value}</div>
      <div class="kpi-delta ${k.cls}">${k.delta}</div>
    </div>
  `).join('');
}

/* ── Revenue by day ── */
function renderRevenueChart(data) {
  destroyChart('revenue');
  const ctx = document.getElementById('revenueChart').getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, 'rgba(224,23,91,0.35)');
  gradient.addColorStop(1, 'rgba(224,23,91,0.02)');

  saveChart('revenue', new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => fmtDateShort(d.day)),
      datasets: [{
        label: 'Ingresos',
        data: data.map(d => d.revenue),
        borderColor: '#e0175b',
        backgroundColor: gradient,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) }}},
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmt(v) } }
      }
    }
  }));
}

/* ── Orders by day ── */
function renderOrdersChart(data) {
  destroyChart('orders');
  const ctx = document.getElementById('ordersChart').getContext('2d');
  saveChart('orders', new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => fmtDateShort(d.day)),
      datasets: [{
        label: 'Pedidos',
        data: data.map(d => d.orders),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3b82f6',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }},
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { stepSize: 1 } }
      }
    }
  }));
}

/* ── Sales by style (doughnut) ── */
function renderStyleChart(data) {
  destroyChart('style');
  const ctx = document.getElementById('styleChart').getContext('2d');
  saveChart('style', new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => d.event_style.charAt(0).toUpperCase() + d.event_style.slice(1)),
      datasets: [{
        data: data.map(d => d.revenue),
        backgroundColor: data.map(d => STYLE_COLORS[d.event_style] || '#888'),
        borderWidth: 2,
        borderColor: '#1e1e2e',
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: { position: 'right' },
        tooltip: { callbacks: { label: ctx => ` ${fmt(ctx.raw)}` }}
      }
    }
  }));
}

/* ── Payment methods (pie) ── */
function renderPaymentChart(data) {
  destroyChart('payment');
  const ctx = document.getElementById('paymentChart').getContext('2d');
  saveChart('payment', new Chart(ctx, {
    type: 'pie',
    data: {
      labels: data.map(d => payLabel(d.payment_method)),
      datasets: [{
        data: data.map(d => d.orders),
        backgroundColor: data.map(d => PAY_COLORS[d.payment_method] || '#888'),
        borderWidth: 2,
        borderColor: '#1e1e2e',
        hoverOffset: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right' }}
    }
  }));
}

/* ── Ticket types (horizontal bar) ── */
function renderTicketTypeChart(data) {
  destroyChart('ticketType');
  const ctx = document.getElementById('ticketTypeChart').getContext('2d');
  saveChart('ticketType', new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.ticket_name.length > 18 ? d.ticket_name.substring(0,16)+'…' : d.ticket_name),
      datasets: [{
        label: 'Entradas',
        data: data.map(d => d.tickets),
        backgroundColor: data.map((_, i) => PALETTE[i % PALETTE.length] + 'bb'),
        borderColor:     data.map((_, i) => PALETTE[i % PALETTE.length]),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }},
        y: { grid: { display: false }, ticks: { font: { size: 10 }}}
      }
    }
  }));
}

/* ── Top events (horizontal bar) ── */
function renderTopEventsChart(data) {
  destroyChart('topEvents');
  const ctx = document.getElementById('topEventsChart').getContext('2d');
  saveChart('topEvents', new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d.event_title.length > 28 ? d.event_title.substring(0,26)+'…' : d.event_title),
      datasets: [{
        label: 'Ingresos',
        data: data.map(d => d.revenue),
        backgroundColor: data.map(d => (STYLE_COLORS[d.event_style] || '#888') + 'aa'),
        borderColor:     data.map(d => STYLE_COLORS[d.event_style] || '#888'),
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ' ' + fmt(ctx.raw) }}},
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { callback: v => fmt(v) }},
        y: { grid: { display: false }, ticks: { font: { size: 10 }}}
      }
    }
  }));
}

/* ── Recent orders table ── */
function renderRecentOrders(rows) {
  const el = document.getElementById('recentOrdersTable');
  if (!rows.length) { el.innerHTML = '<div class="table-loading">No hay pedidos aún.</div>'; return; }

  el.innerHTML = `
    <table>
      <thead><tr>
        <th>Código</th><th>Cliente</th><th>Email</th>
        <th>Estilo(s)</th><th>Pago</th><th>Entradas</th><th>Total</th><th>Fecha</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr data-id="${r.id}">
            <td><code style="font-size:0.78rem;color:var(--primary-light)">${r.order_code}</code></td>
            <td><strong>${r.full_name}</strong></td>
            <td style="color:var(--text-muted)">${r.email}</td>
            <td>${uniqueStyles(r.styles)}</td>
            <td>${payIcon(r.payment_method)} ${payLabel(r.payment_method)}</td>
            <td style="text-align:center">${r.ticket_count}</td>
            <td class="amount">${fmt(r.total)}</td>
            <td style="color:var(--text-muted);white-space:nowrap">${fmtDate(r.created_at)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => openOrderDetail(tr.dataset.id));
  });
}

/* =========================================
   SECCIÓN: PEDIDOS
   ========================================= */
let ordersPage = 1;
let ordersSearch = '';
let ordersStyle  = '';
const ORDERS_PER_PAGE = 15;

async function loadOrders() {
  const el = document.getElementById('allOrdersTable');
  el.innerHTML = '<div class="table-loading">Cargando…</div>';

  try {
    const data = await apiFetch(`/orders?page=${ordersPage}&limit=${ORDERS_PER_PAGE}&search=${encodeURIComponent(ordersSearch)}&style=${ordersStyle}`);
    renderOrdersTable(data.orders);
    renderPagination(data.total);
    document.getElementById('ordersCount').textContent = `${data.total} pedido${data.total !== 1 ? 's' : ''}`;
  } catch (e) {
    el.innerHTML = `<div class="table-loading" style="color:#ef4444">❌ No se pudo conectar con el backend.<br><small>Asegúrate de que el servidor está corriendo en localhost:3001</small></div>`;
  }
}

function renderOrdersTable(rows) {
  const el = document.getElementById('allOrdersTable');
  if (!rows.length) { el.innerHTML = '<div class="table-loading">No se encontraron pedidos.</div>'; return; }

  el.innerHTML = `
    <table>
      <thead><tr>
        <th>#</th><th>Código</th><th>Cliente</th><th>Email</th><th>Teléfono</th>
        <th>Método pago</th><th>Entradas</th><th>Total</th><th>Fecha</th><th></th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `
          <tr data-id="${r.id}">
            <td style="color:var(--text-muted)">${r.id}</td>
            <td><code style="font-size:0.78rem;color:var(--primary-light)">${r.order_code}</code></td>
            <td><strong>${r.first_name} ${r.last_name}</strong></td>
            <td style="color:var(--text-muted)">${r.email}</td>
            <td style="color:var(--text-muted)">${r.phone || '—'}</td>
            <td>${payIcon(r.payment_method)} ${payLabel(r.payment_method)}</td>
            <td style="text-align:center">${r.ticket_count}</td>
            <td class="amount">${fmt(r.total)}</td>
            <td style="color:var(--text-muted);white-space:nowrap;font-size:0.78rem">${fmtDate(r.created_at)}</td>
            <td><button class="action-btn">Ver</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>`;

  el.querySelectorAll('tbody tr').forEach(tr => {
    tr.addEventListener('click', () => openOrderDetail(tr.dataset.id));
  });
}

function renderPagination(total) {
  const pages = Math.ceil(total / ORDERS_PER_PAGE);
  const el    = document.getElementById('pagination');
  if (pages <= 1) { el.innerHTML = ''; return; }

  let html = `<button class="page-btn" ${ordersPage <= 1 ? 'disabled' : ''} data-p="${ordersPage-1}">‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - ordersPage) <= 2) {
      html += `<button class="page-btn ${i === ordersPage ? 'active' : ''}" data-p="${i}">${i}</button>`;
    } else if (Math.abs(i - ordersPage) === 3) {
      html += `<span style="padding:0 4px;color:var(--text-muted)">…</span>`;
    }
  }
  html += `<button class="page-btn" ${ordersPage >= pages ? 'disabled' : ''} data-p="${ordersPage+1}">›</button>`;
  el.innerHTML = html;

  el.querySelectorAll('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => { ordersPage = parseInt(btn.dataset.p); loadOrders(); });
  });
}

/* ── Detalle de pedido ── */
async function openOrderDetail(id) {
  try {
    const { order, items } = await apiFetch(`/orders/${id}`);
    const overlay = document.getElementById('detailOverlay');
    const content = document.getElementById('detailContent');

    content.innerHTML = `
      <div class="order-code-badge">${order.order_code}</div>

      <div class="detail-section">
        <h4>Datos del comprador</h4>
        <div class="detail-grid">
          <div class="detail-field"><label>Nombre</label><span>${order.first_name} ${order.last_name}</span></div>
          <div class="detail-field"><label>Email</label><span>${order.email}</span></div>
          <div class="detail-field"><label>Teléfono</label><span>${order.phone || '—'}</span></div>
          <div class="detail-field"><label>Método de pago</label><span>${payIcon(order.payment_method)} ${payLabel(order.payment_method)}</span></div>
          <div class="detail-field"><label>Fecha de compra</label><span>${fmtDate(order.created_at)}</span></div>
        </div>
      </div>

      <div class="detail-section">
        <h4>Entradas (${items.reduce((s,i) => s+i.qty, 0)} en total)</h4>
        <div class="items-list">
          ${items.map(item => `
            <div class="item-row">
              <div class="item-row-info">
                <div class="item-row-name">${item.ticket_name} × ${item.qty}</div>
                <div class="item-row-event">${styleChip(item.event_style)} ${item.event_title}</div>
              </div>
              <div class="item-row-price">${fmt(item.subtotal)}</div>
            </div>
          `).join('')}
        </div>
        <div class="detail-total">
          <span>Total del pedido</span>
          <strong>${fmt(order.total)}</strong>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
  } catch(e) {
    console.error(e);
  }
}

/* =========================================
   SECCIÓN: ANÁLISIS
   ========================================= */
async function loadCharts() {
  try {
    const [byStyle, byPayment, byDay, ticketTypes] = await Promise.all([
      apiFetch('/dashboard/sales-by-style'),
      apiFetch('/dashboard/payment-methods'),
      apiFetch('/dashboard/revenue-by-day'),
      apiFetch('/dashboard/tickets-by-type'),
    ]);

    /* Ingresos por estilo (bar) */
    destroyChart('styleRevenue');
    saveChart('styleRevenue', new Chart(
      document.getElementById('styleRevenueChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: byStyle.map(d => d.event_style.charAt(0).toUpperCase()+d.event_style.slice(1)),
          datasets: [{
            label: 'Ingresos',
            data: byStyle.map(d => d.revenue),
            backgroundColor: byStyle.map(d => (STYLE_COLORS[d.event_style]||'#888')+'aa'),
            borderColor:     byStyle.map(d => STYLE_COLORS[d.event_style]||'#888'),
            borderWidth: 1, borderRadius: 6,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ' '+fmt(c.raw) }}},
          scales: { x: { grid:{display:false} }, y: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{callback:v=>fmt(v)} } }
        }
      }
    ));

    /* Entradas por estilo (bar) */
    destroyChart('styleTickets');
    saveChart('styleTickets', new Chart(
      document.getElementById('styleTicketsChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: byStyle.map(d => d.event_style.charAt(0).toUpperCase()+d.event_style.slice(1)),
          datasets: [{
            label: 'Entradas',
            data: byStyle.map(d => d.tickets),
            backgroundColor: byStyle.map(d => (STYLE_COLORS[d.event_style]||'#888')+'aa'),
            borderColor:     byStyle.map(d => STYLE_COLORS[d.event_style]||'#888'),
            borderWidth: 1, borderRadius: 6,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }},
          scales: { x: { grid:{display:false} }, y: { grid:{color:'rgba(255,255,255,0.04)'} } }
        }
      }
    ));

    /* Métodos de pago (doughnut) */
    destroyChart('paymentDonut');
    saveChart('paymentDonut', new Chart(
      document.getElementById('paymentDonutChart').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: byPayment.map(d => payLabel(d.payment_method)),
          datasets: [{
            data: byPayment.map(d => d.orders),
            backgroundColor: byPayment.map(d => PAY_COLORS[d.payment_method]||'#888'),
            borderWidth: 2, borderColor: '#1e1e2e', hoverOffset: 6,
          }]
        },
        options: { responsive:true, maintainAspectRatio:false, cutout:'60%',
          plugins: { legend:{position:'right'} } }
      }
    ));

    /* Top tipos de entrada */
    destroyChart('topTickets');
    saveChart('topTickets', new Chart(
      document.getElementById('topTicketsChart').getContext('2d'), {
        type: 'bar',
        data: {
          labels: ticketTypes.map(d => d.ticket_name.length>18 ? d.ticket_name.substring(0,16)+'…' : d.ticket_name),
          datasets: [{
            label: 'Entradas vendidas',
            data: ticketTypes.map(d => d.tickets),
            backgroundColor: ticketTypes.map((_,i) => PALETTE[i%PALETTE.length]+'bb'),
            borderColor:     ticketTypes.map((_,i) => PALETTE[i%PALETTE.length]),
            borderWidth:1, borderRadius:4,
          }]
        },
        options: {
          indexAxis:'y', responsive:true, maintainAspectRatio:false,
          plugins:{legend:{display:false}},
          scales:{ x:{grid:{color:'rgba(255,255,255,0.04)'}}, y:{grid:{display:false},ticks:{font:{size:10}}} }
        }
      }
    ));

    /* Ingresos acumulados */
    let cumulative = 0;
    const cumulativeData = byDay.map(d => { cumulative += d.revenue; return cumulative; });
    destroyChart('cumulative');
    const ctx = document.getElementById('cumulativeChart').getContext('2d');
    const grad = ctx.createLinearGradient(0,0,0,160);
    grad.addColorStop(0,'rgba(168,85,247,0.4)');
    grad.addColorStop(1,'rgba(168,85,247,0.02)');
    saveChart('cumulative', new Chart(ctx, {
      type: 'line',
      data: {
        labels: byDay.map(d => fmtDateShort(d.day)),
        datasets: [{
          label: 'Ingresos acumulados',
          data: cumulativeData,
          borderColor: '#a855f7',
          backgroundColor: grad,
          borderWidth: 2, fill:true, tension:0.4, pointRadius:2,
        }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:false}, tooltip:{callbacks:{label:c=>' '+fmt(c.raw)}} },
        scales:{ x:{grid:{display:false},ticks:{maxTicksLimit:8}}, y:{grid:{color:'rgba(255,255,255,0.04)'},ticks:{callback:v=>fmt(v)}} }
      }
    }));

  } catch(e) {
    console.error('Error cargando análisis:', e);
  }
}

/* =========================================
   NOTIFICACIONES TOAST (admin)
   ========================================= */
function showAdminToast(title, msg, color = '#22c55e') {
  // Crear contenedor si no existe
  let container = document.getElementById('adminToastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'adminToastContainer';
    container.style.cssText = 'position:fixed;top:80px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    display:flex;align-items:flex-start;gap:12px;padding:14px 18px;
    background:var(--surface);border:1px solid ${color}55;border-left:3px solid ${color};
    border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.5);
    min-width:280px;max-width:340px;pointer-events:all;
    animation:toastSlideIn 0.3s ease;
  `;
  toast.innerHTML = `
    <div style="font-size:1.1rem;flex-shrink:0">🎟️</div>
    <div>
      <div style="font-size:0.88rem;font-weight:700;margin-bottom:2px">${title}</div>
      <div style="font-size:0.78rem;color:var(--text-muted)">${msg}</div>
    </div>
  `;

  // Inyectar keyframes si no existen
  if (!document.getElementById('toastKeyframes')) {
    const style = document.createElement('style');
    style.id = 'toastKeyframes';
    style.textContent = `
      @keyframes toastSlideIn { from{opacity:0;transform:translateX(50px)} to{opacity:1;transform:translateX(0)} }
      @keyframes toastSlideOut{ from{opacity:1;transform:translateX(0)}  to{opacity:0;transform:translateX(50px)} }
    `;
    document.head.appendChild(style);
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastSlideOut 0.3s ease forwards';
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 5000);
}

/* =========================================
   SSE — Actualizaciones en tiempo real
   ========================================= */
function connectSSE() {
  const es = new EventSource(`${API.replace('/api', '')}/api/events`);

  es.onopen = () => {
    document.querySelector('.status-dot').style.background = '#22c55e';
    document.querySelector('.status-dot').style.boxShadow = '0 0 6px #22c55e';
  };

  es.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }

    if (data.type === 'new_order') {
      // Toast de nueva venta
      showAdminToast(
        '¡Nueva venta!',
        `${data.firstName} ${data.lastName} · ${parseFloat(data.total).toFixed(2).replace('.', ',')} €`
      );

      // Actualizar la sección activa automáticamente
      SECTIONS[currentSection].load();
      document.getElementById('lastUpdate').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-ES');

      // Hacer parpadear el botón de refresh
      const btn = document.getElementById('refreshBtn');
      btn.style.background = '#22c55e';
      btn.style.borderColor = '#22c55e';
      btn.style.color = '#fff';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.borderColor = '';
        btn.style.color = '';
      }, 3000);
    }
  };

  es.onerror = () => {
    document.querySelector('.status-dot').style.background = '#ef4444';
    document.querySelector('.status-dot').style.boxShadow = '0 0 6px #ef4444';
    es.close();
    // Reintentar conexión SSE en 5 segundos
    setTimeout(connectSSE, 5000);
  };
}

/* =========================================
   NAVEGACIÓN
   ========================================= */
const SECTIONS = {
  overview: { el: 'sectionOverview', title: 'Resumen',  sub: 'Visión general de ventas',   load: loadOverview },
  orders:   { el: 'sectionOrders',   title: 'Pedidos',  sub: 'Gestión de todas las compras', load: loadOrders  },
  charts:   { el: 'sectionCharts',   title: 'Análisis', sub: 'Gráficas detalladas',          load: loadCharts  },
};
let currentSection = 'overview';

function navigate(key) {
  if (!SECTIONS[key]) return;
  currentSection = key;

  // Actualizar sidebar
  document.querySelectorAll('.nav-item').forEach(a => {
    a.classList.toggle('active', a.dataset.section === key);
  });
  // Actualizar secciones
  Object.entries(SECTIONS).forEach(([k, s]) => {
    document.getElementById(s.el).classList.toggle('active', k === key);
  });
  // Actualizar topbar
  document.getElementById('pageTitle').textContent    = SECTIONS[key].title;
  document.getElementById('pageSubtitle').textContent = SECTIONS[key].sub;

  SECTIONS[key].load();
}

function showConnectionError(containerId) {
  document.getElementById(containerId).innerHTML = `
    <div style="grid-column:1/-1;padding:32px;text-align:center;color:#ef4444;">
      ❌ No se pudo conectar con el backend.<br>
      <small style="color:var(--text-muted)">Asegúrate de que el servidor está corriendo en <strong>localhost:3001</strong>.<br>
      Ejecuta: <code style="background:rgba(255,255,255,0.08);padding:2px 8px;border-radius:4px">cd backend && npm install && npm start</code></small>
    </div>
  `;
}

/* =========================================
   INIT
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Sidebar navigation
  document.querySelectorAll('.nav-item[data-section]').forEach(a => {
    a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.section); });
  });

  // Link buttons dentro de secciones
  document.querySelectorAll('[data-section]').forEach(el => {
    if (!el.classList.contains('nav-item')) {
      el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.section); });
    }
  });

  // Búsqueda y filtro de pedidos
  let searchTimer;
  document.getElementById('ordersSearch').addEventListener('input', e => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => { ordersSearch = e.target.value; ordersPage = 1; loadOrders(); }, 350);
  });
  document.getElementById('ordersStyleFilter').addEventListener('change', e => {
    ordersStyle = e.target.value; ordersPage = 1; loadOrders();
  });

  // Refresh
  document.getElementById('refreshBtn').addEventListener('click', () => {
    const btn = document.getElementById('refreshBtn');
    btn.classList.add('spinning');
    Promise.resolve(SECTIONS[currentSection].load()).finally(() => {
      btn.classList.remove('spinning');
      document.getElementById('lastUpdate').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-ES');
    });
  });

  // Cerrar modal detalle
  document.getElementById('detailClose').addEventListener('click',  () => document.getElementById('detailOverlay').classList.add('hidden'));
  document.getElementById('detailOverlay').addEventListener('click', e => { if (e.target === document.getElementById('detailOverlay')) document.getElementById('detailOverlay').classList.add('hidden'); });

  // Carga inicial
  navigate('overview');
  document.getElementById('lastUpdate').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-ES');

  // Conectar SSE para actualizaciones en tiempo real
  connectSSE();

  // Auto-refresh de respaldo cada 30 segundos
  setInterval(() => {
    SECTIONS[currentSection].load();
    document.getElementById('lastUpdate').textContent = 'Actualizado ' + new Date().toLocaleTimeString('es-ES');
  }, 30000);
});
