/* =========================================
   ⚙️  CONFIGURACIÓN EMAILJS
   -----------------------------------------
   1. Crea cuenta gratuita en https://www.emailjs.com
   2. Crea un "Email Service" (Gmail, Outlook…)
   3. Crea un "Email Template" con las variables:
        {{to_name}}, {{to_email}}, {{order_code}},
        {{order_items}}, {{order_total}}, {{event_list}}
   4. Copia tus claves aquí abajo:
   ========================================= */
const EMAILJS_CONFIG = {
  publicKey:   'TU_PUBLIC_KEY',       // Account → API Keys
  serviceId:   'TU_SERVICE_ID',       // Email Services → Service ID
  templateId:  'TU_TEMPLATE_ID',      // Email Templates → Template ID
};

/* =========================================
   ⚙️  CONFIGURACIÓN BACKEND
   ========================================= */
const BACKEND_URL = (() => {
  const h = window.location.hostname;
  if (h.includes('.app.github.dev')) {
    // GitHub Codespaces: reemplaza el puerto de la URL actual con 3002
    return 'https://' + h.replace(/-\d+\.app\.github\.dev$/, '-3002.app.github.dev') + '/api';
  }
  if (h.includes('railway.app')) {
    // Railway: frontend y backend en el mismo servidor
    return window.location.origin + '/api';
  }
  return 'http://localhost:3002/api';
})();

// ¿Está EmailJS configurado con credenciales reales?
const EMAILJS_READY = (
  EMAILJS_CONFIG.publicKey  !== 'TU_PUBLIC_KEY'  &&
  EMAILJS_CONFIG.serviceId  !== 'TU_SERVICE_ID'  &&
  EMAILJS_CONFIG.templateId !== 'TU_TEMPLATE_ID'
);

/* =========================================
   DATOS DE EVENTOS (cargados desde el backend)
   ========================================= */
let EVENTS = [];

async function loadEventsFromAPI() {
  try {
    const res = await fetch(`${BACKEND_URL}/manage-events`);
    if (res.ok) {
      const data = await res.json();
      EVENTS = data.map(ev => ({
        id:          ev.id,
        title:       ev.title,
        style:       ev.style,
        emoji:       ev.emoji,
        date:        ev.date,
        dateDisplay: ev.date_display,
        location:    ev.location,
        artist:      ev.artist,
        desc:        ev.description,
        soldOut:     !!ev.sold_out,
        tickets:     ev.tickets.map(t => ({ name: t.name, desc: t.desc, price: t.price }))
      }));
    }
  } catch (e) {
    console.warn('[AkiTix] No se pudieron cargar eventos del backend:', e.message);
  }
}

// Datos de respaldo por si el backend no está disponible
const EVENTS_FALLBACK = [
  {
    id: 1,
    title: "Salsa World Congress Madrid",
    style: "salsa",
    emoji: "💃",
    date: "2026-04-18",
    dateDisplay: "18 Abr 2026 · 21:00",
    location: "📍 Palacio de los Deportes, Madrid",
    artist: "🎵 DJ Kachamba + Orquesta Havana Club",
    desc: "El mayor festival de salsa de España regresa con más de 20 workshops, competiciones internacionales y noches de baile hasta el amanecer. Artistas de Cuba, Colombia y Puerto Rico.",
    soldOut: false,
    tickets: [
      { name: "Entrada General", desc: "Acceso a todas las pistas de baile", price: 35 },
      { name: "Entrada VIP", desc: "Zona VIP + Consumición incluida", price: 65 },
      { name: "Pase Completo (3 días)", desc: "Acceso total al congreso + talleres", price: 120 },
    ]
  },
  {
    id: 2,
    title: "Bachata Sensual Night",
    style: "bachata",
    emoji: "🌹",
    date: "2026-04-25",
    dateDisplay: "25 Abr 2026 · 22:00",
    location: "📍 Club Privé, Barcelona",
    artist: "🎵 Demarco Flamenco & Romeo Santos Tribute",
    desc: "Una noche íntima y apasionada dedicada a la bachata sensual dominicana. El mejor ambiente, la mejor música y un suelo de madera perfectamente pulido para deslizarte entre los compases.",
    soldOut: false,
    tickets: [
      { name: "Entrada Individual", desc: "Acceso nocturno estándar", price: 20 },
      { name: "Entrada Pareja", desc: "Descuento especial para parejas", price: 34 },
    ]
  },
  {
    id: 3,
    title: "Tango Milonga Clásica",
    style: "tango",
    emoji: "🎩",
    date: "2026-05-02",
    dateDisplay: "2 May 2026 · 20:30",
    location: "📍 Teatro Colón, Sevilla",
    artist: "🎵 Quinteto Porteño",
    desc: "Milonga tradicional con la elegancia del Buenos Aires de los años 40. Código de vestimenta requerido. Cortinas de tango, milonga y vals cruzado bajo la batuta del maestro Carlos Pérez.",
    soldOut: false,
    tickets: [
      { name: "Mesa individual", desc: "1 asiento en mesa compartida", price: 28 },
      { name: "Mesa privada (2 personas)", desc: "Mesa reservada para 2", price: 50 },
      { name: "Mesa privada (4 personas)", desc: "Mesa reservada para 4 + botella", price: 95 },
    ]
  },
  {
    id: 4,
    title: "Festival Flamenco Granada",
    style: "flamenco",
    emoji: "🌺",
    date: "2026-05-10",
    dateDisplay: "10 May 2026 · 19:00",
    location: "📍 Cueva del Sacromonte, Granada",
    artist: "🎵 Sara Baras + Grupo flamenco Los Faroles",
    desc: "Un espectáculo único al abrigo de las cuevas del Sacromonte. La mejor bailaora de flamenco de España en una actuación íntima con cantaores y guitarristas de primer nivel.",
    soldOut: true,
    tickets: [
      { name: "Butaca", desc: "Asiento en primera fila", price: 45 },
      { name: "Anfiteatro", desc: "Vista panorámica completa", price: 30 },
    ]
  },
  {
    id: 5,
    title: "Swing & Jazz Valenciano",
    style: "swing",
    emoji: "🎺",
    date: "2026-05-16",
    dateDisplay: "16 May 2026 · 20:00",
    location: "📍 Sala Ultramarinos, Valencia",
    artist: "🎵 The Valencia Stompers",
    desc: "Una noche de Lindy Hop, Charleston y West Coast Swing al ritmo del jazz en vivo. Apta para todos los niveles. Clase introductoria gratuita a las 20:00 antes de la fiesta de las 21:30.",
    soldOut: false,
    tickets: [
      { name: "Clase + Fiesta", desc: "Incluye clase introductoria", price: 18 },
      { name: "Solo Fiesta", desc: "Entrada a partir de las 21:30", price: 12 },
    ]
  },
  {
    id: 6,
    title: "Kizomba Fusion Weekend",
    style: "kizomba",
    emoji: "🌊",
    date: "2026-05-23",
    dateDisplay: "23-25 May 2026",
    location: "📍 Hotel Meliá, Málaga",
    artist: "🎵 Mestre Petchu + DJ Deejay Ticat",
    desc: "Fin de semana completo de kizomba, semba y urbankiz. Más de 15 instructores internacionales, 3 pistas de baile simultáneas y fiestas hasta las 6 de la mañana.",
    soldOut: false,
    tickets: [
      { name: "Pase Viernes", desc: "Solo noche del viernes", price: 25 },
      { name: "Pase Fin de Semana", desc: "Viernes + Sábado + Domingo", price: 85 },
      { name: "Pase Full + Talleres", desc: "Todo incluido + workshops premium", price: 140 },
    ]
  },
  {
    id: 7,
    title: "Noche Salsa en la Terraza",
    style: "salsa",
    emoji: "🌴",
    date: "2026-06-05",
    dateDisplay: "5 Jun 2026 · 22:30",
    location: "📍 Terraza Azul, Alicante",
    artist: "🎵 DJs Rotativos + Sesión en Vivo",
    desc: "El verano arranca con salsa en la mejor terraza de la costa. Vistas al mar, brisa mediterránea y la mejor selección de salsa cubana y puertorriqueña. Aforo muy limitado.",
    soldOut: false,
    tickets: [
      { name: "Entrada General", desc: "Acceso a la terraza", price: 15 },
      { name: "Entrada + Cóctel", desc: "Incluye cóctel de bienvenida", price: 25 },
    ]
  },
  {
    id: 8,
    title: "Gran Gala de Tango Argentino",
    style: "tango",
    emoji: "🥀",
    date: "2026-06-14",
    dateDisplay: "14 Jun 2026 · 21:00",
    location: "📍 Palau de la Música, Valencia",
    artist: "🎵 Orquesta Típica El Arranque",
    desc: "Espectáculo gala de danza argentina con los mejores bailarines de Buenos Aires. Un viaje visual y emocional a través de la historia del tango con vestuario de época.",
    soldOut: false,
    tickets: [
      { name: "Patio de butacas", desc: "Vista frontal al escenario", price: 55 },
      { name: "Platea alta", desc: "Segunda planta, vista general", price: 35 },
      { name: "Palco VIP", desc: "Palco privado para 4 + champán", price: 220 },
    ]
  },
  {
    id: 9,
    title: "Bachata Urban Summer Fest",
    style: "bachata",
    emoji: "🎧",
    date: "2026-07-04",
    dateDisplay: "4 Jul 2026 · 22:00",
    location: "📍 Estadio La Peineta (Exterior), Madrid",
    artist: "🎵 Prince Royce + Juan Luis Guerra Tribute",
    desc: "El festival de bachata urbana más grande del verano. Conciertos, competiciones, workshops y fiesta al aire libre con capacidad para 5.000 personas.",
    soldOut: false,
    tickets: [
      { name: "General", desc: "Acceso zona general", price: 30 },
      { name: "VIP Pit", desc: "Zona delantera junto al escenario", price: 75 },
      { name: "Premium Lounge", desc: "Área VIP con barra libre 3h", price: 130 },
    ]
  },
];

/* =========================================
   ESTADO DE LA APP
   ========================================= */
let cart = [];
let currentEvent = null;
let currentFilter = 'todos';
let currentSearch = '';

/* =========================================
   UTILIDADES
   ========================================= */
function formatPrice(amount) {
  return amount.toFixed(2).replace('.', ',') + ' €';
}

function generateCode() {
  return 'AKT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getStyleClass(style) {
  return `tag-${style} bg-${style}`;
}

function getStyleLabel(style) {
  const labels = {
    salsa: 'Salsa', bachata: 'Bachata', tango: 'Tango',
    flamenco: 'Flamenco', swing: 'Swing', kizomba: 'Kizomba'
  };
  return labels[style] || style;
}

/* =========================================
   RENDER DE CARDS
   ========================================= */
function renderEvents() {
  const grid = document.getElementById('eventsGrid');
  const noResults = document.getElementById('noResults');

  const filtered = EVENTS.filter(ev => {
    const matchStyle = currentFilter === 'todos' || ev.style === currentFilter;
    const q = currentSearch.toLowerCase();
    const matchSearch = !q ||
      ev.title.toLowerCase().includes(q) ||
      ev.location.toLowerCase().includes(q) ||
      ev.style.toLowerCase().includes(q);
    return matchStyle && matchSearch;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    noResults.classList.remove('hidden');
    return;
  }
  noResults.classList.add('hidden');

  filtered.forEach(ev => {
    const minPrice = Math.min(...ev.tickets.map(t => t.price));
    const card = document.createElement('div');
    card.className = 'event-card';
    card.innerHTML = `
      <div class="card-image bg-${ev.style}">
        ${ev.emoji}
        ${ev.soldOut ? '<div class="card-sold-out">AGOTADO</div>' : ''}
      </div>
      <div class="card-body">
        <span class="card-tag tag-${ev.style}">${getStyleLabel(ev.style)}</span>
        <h3 class="card-title">${ev.title}</h3>
        <div class="card-meta">
          <span>📅 ${ev.dateDisplay}</span>
          <span>${ev.location}</span>
        </div>
        <div class="card-footer">
          <div>
            <span class="card-price-from">desde</span>
            <span class="card-price">${formatPrice(minPrice)}</span>
          </div>
          <button class="card-btn" ${ev.soldOut ? 'disabled' : ''} data-id="${ev.id}">
            ${ev.soldOut ? 'Agotado' : 'Ver entradas'}
          </button>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });

  // Eventos de click en cards
  grid.querySelectorAll('.card-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openEventModal(parseInt(btn.dataset.id));
    });
  });
  grid.querySelectorAll('.event-card').forEach(card => {
    card.addEventListener('click', () => {
      const btn = card.querySelector('.card-btn');
      if (btn && !btn.disabled) {
        openEventModal(parseInt(btn.dataset.id));
      }
    });
  });
}

/* =========================================
   MODAL DE EVENTO
   ========================================= */
function openEventModal(id) {
  currentEvent = EVENTS.find(e => e.id === id);
  if (!currentEvent) return;

  document.getElementById('modalImage').className = `modal-image bg-${currentEvent.style}`;
  document.getElementById('modalImage').textContent = currentEvent.emoji;
  document.getElementById('modalTag').className = `modal-tag tag-${currentEvent.style}`;
  document.getElementById('modalTag').textContent = getStyleLabel(currentEvent.style);
  document.getElementById('modalTitle').textContent = currentEvent.title;
  document.getElementById('modalDate').textContent = '📅 ' + currentEvent.dateDisplay;
  document.getElementById('modalLocation').textContent = currentEvent.location;
  document.getElementById('modalArtist').textContent = currentEvent.artist;
  document.getElementById('modalDesc').textContent = currentEvent.desc;

  // Ticket types
  const container = document.getElementById('ticketTypes');
  container.innerHTML = '';
  currentEvent.tickets.forEach((t, i) => {
    const div = document.createElement('div');
    div.className = 'ticket-type';
    div.innerHTML = `
      <div class="ticket-type-info">
        <div class="ticket-type-name">${t.name}</div>
        <div class="ticket-type-desc">${t.desc}</div>
      </div>
      <div class="ticket-type-price">${formatPrice(t.price)}</div>
      <div class="qty-control">
        <button class="qty-btn" data-idx="${i}" data-action="minus">−</button>
        <span class="qty-value" id="qty-${i}">0</span>
        <button class="qty-btn" data-idx="${i}" data-action="plus">+</button>
      </div>
    `;
    container.appendChild(div);
  });

  updateModalTotal();

  document.getElementById('modalOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function updateModalTotal() {
  if (!currentEvent) return;
  let total = 0;
  currentEvent.tickets.forEach((t, i) => {
    const qty = parseInt(document.getElementById(`qty-${i}`)?.textContent || 0);
    total += t.price * qty;
  });
  document.getElementById('modalTotal').textContent = formatPrice(total);
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
  document.body.style.overflow = '';
  currentEvent = null;
}

/* =========================================
   CARRITO
   ========================================= */
function addToCart() {
  if (!currentEvent) return;
  let added = false;

  currentEvent.tickets.forEach((t, i) => {
    const qty = parseInt(document.getElementById(`qty-${i}`)?.textContent || 0);
    if (qty > 0) {
      const key = `${currentEvent.id}-${i}`;
      const existing = cart.find(c => c.key === key);
      if (existing) {
        existing.qty += qty;
      } else {
        cart.push({
          key,
          eventId:    currentEvent.id,
          eventTitle: currentEvent.title,
          eventEmoji: currentEvent.emoji,
          eventStyle: currentEvent.style,
          ticketName: t.name,
          price:      t.price,
          qty,
        });
      }
      added = true;
    }
  });

  if (!added) {
    shakeElement(document.getElementById('addToCartBtn'));
    showToast({ type: 'info', title: 'Selecciona al menos una entrada', msg: 'Usa los botones + para añadir cantidad.' });
    return;
  }

  renderCart();
  closeModal();
  openCart();
  showToast({ type: 'success', title: '¡Añadido al carrito!', msg: currentEvent ? currentEvent.title : '' });
}

function removeFromCart(key) {
  cart = cart.filter(c => c.key !== key);
  renderCart();
}

function renderCart() {
  const itemsEl = document.getElementById('cartItems');
  const emptyEl = document.getElementById('cartEmpty');
  const summaryEl = document.getElementById('cartSummary');
  const badgeEl = document.getElementById('cartBadge');

  const totalQty = cart.reduce((s, c) => s + c.qty, 0);
  badgeEl.textContent = totalQty;

  if (cart.length === 0) {
    emptyEl.classList.remove('hidden');
    summaryEl.classList.add('hidden');
    // Remove all items but keep empty msg
    Array.from(itemsEl.querySelectorAll('.cart-item')).forEach(el => el.remove());
    return;
  }

  emptyEl.classList.add('hidden');
  summaryEl.classList.remove('hidden');

  Array.from(itemsEl.querySelectorAll('.cart-item')).forEach(el => el.remove());
  cart.forEach(item => {
    const div = document.createElement('div');
    div.className = 'cart-item';
    div.innerHTML = `
      <div class="cart-item-emoji">${item.eventEmoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.eventTitle}</div>
        <div class="cart-item-detail">${item.ticketName} × ${item.qty}</div>
      </div>
      <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
      <button class="cart-item-remove" data-key="${item.key}" title="Eliminar">✕</button>
    `;
    itemsEl.appendChild(div);
  });

  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  document.getElementById('cartTotal').textContent = formatPrice(total);

  itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.key));
  });
}

function openCart() {
  document.getElementById('cartPanel').classList.remove('hidden');
  document.getElementById('cartOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  document.getElementById('cartPanel').classList.add('hidden');
  document.getElementById('cartOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* =========================================
   CHECKOUT
   ========================================= */
let checkoutStep = 1;

function openCheckout() {
  closeCart();
  checkoutStep = 1;
  showCheckoutStep(1);
  renderOrderSummaryPreview();
  document.getElementById('checkoutOverlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeCheckout() {
  document.getElementById('checkoutOverlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function showCheckoutStep(step) {
  [1, 2, 3].forEach(n => {
    document.getElementById(`checkoutStep${n}`).classList.toggle('hidden', n !== step);
    const ind = document.getElementById(`step${n}Indicator`);
    ind.classList.remove('active', 'done');
    if (n === step) ind.classList.add('active');
    if (n < step) ind.classList.add('done');
  });
}

function renderOrderSummaryPreview() {
  const el = document.getElementById('orderSummaryPreview');
  const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
  el.innerHTML = cart.map(c =>
    `<div>${c.eventEmoji} <strong>${c.ticketName}</strong> × ${c.qty} — ${formatPrice(c.price * c.qty)}</div>`
  ).join('') + `<div style="margin-top:10px;font-weight:700;color:var(--text)">Total: ${formatPrice(total)}</div>`;
}

function validateStep1() {
  const fn = document.getElementById('firstName');
  const ln = document.getElementById('lastName');
  const em = document.getElementById('email');
  let valid = true;

  [fn, ln, em].forEach(f => {
    f.classList.remove('error');
    if (!f.value.trim()) { f.classList.add('error'); valid = false; }
  });

  if (em.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value)) {
    em.classList.add('error'); valid = false;
  }

  return valid;
}

function shakeElement(el) {
  el.style.animation = 'none';
  el.style.transform = 'translateX(0)';
  el.animate([
    { transform: 'translateX(-6px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-4px)' },
    { transform: 'translateX(4px)' },
    { transform: 'translateX(0)' },
  ], { duration: 300 });
}

/* =========================================
   SISTEMA DE TOASTS
   ========================================= */
function showToast({ type = 'info', title, msg, duration = 5000 }) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = { success: '✅', error: '❌', info: 'ℹ️', loading: null };
  const iconHtml = type === 'loading'
    ? `<div class="toast-spinner"></div>`
    : `<div class="toast-icon">${iconMap[type]}</div>`;

  toast.innerHTML = `
    ${iconHtml}
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
    </div>
  `;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }
  return toast;
}

function dismissToast(toast) {
  toast.classList.add('toast-hide');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}

/* =========================================
   GUARDAR PEDIDO EN EL BACKEND
   ========================================= */
async function saveOrderToBackend({ orderCode, firstName, lastName, email, phone, paymentMethod, total, cartItems }) {
  const body = {
    orderCode,
    firstName,
    lastName,
    email,
    phone,
    paymentMethod,
    total,
    items: cartItems.map(c => ({
      eventId:    c.eventId,
      eventTitle: c.eventTitle,
      eventStyle: c.eventStyle,
      ticketName: c.ticketName,
      unitPrice:  c.price,
      qty:        c.qty,
      subtotal:   c.price * c.qty,
    })),
  };

  const res = await fetch(`${BACKEND_URL}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

/* =========================================
   ENVÍO DE EMAIL CON EMAILJS
   ========================================= */
async function sendConfirmationEmail({ name, email, code, cartItems, total }) {
  // Construir lista de entradas para el template
  const orderItems = cartItems.map(c =>
    `${c.eventEmoji} ${c.eventTitle} — ${c.ticketName} × ${c.qty} → ${formatPrice(c.price * c.qty)}`
  ).join('\n');

  const templateParams = {
    to_name:     name,
    to_email:    email,
    order_code:  code,
    order_items: orderItems,
    order_total: formatPrice(total),
    event_list:  cartItems.map(c => c.eventTitle).join(', '),
  };

  if (!EMAILJS_READY) {
    // Sin credenciales: simular envío
    console.warn('[AkiTix] EmailJS no configurado. Simulando envío a:', email);
    await new Promise(r => setTimeout(r, 1200)); // simular latencia
    return { simulated: true };
  }

  return emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.templateId,
    templateParams
  );
}

/* =========================================
   FORMATO DE TARJETA
   ========================================= */
function formatCardNumber(e) {
  let val = e.target.value.replace(/\D/g, '').substring(0, 16);
  e.target.value = val.replace(/(.{4})/g, '$1 ').trim();
}

function formatExpiry(e) {
  let val = e.target.value.replace(/\D/g, '').substring(0, 4);
  if (val.length >= 3) val = val.substring(0,2) + '/' + val.substring(2);
  e.target.value = val;
}

/* =========================================
   BANNER DE CONFIGURACIÓN EMAILJS
   ========================================= */
function injectEmailJSBanner() {
  const step3 = document.getElementById('checkoutStep3');
  if (!step3 || step3.querySelector('.emailjs-banner')) return;
  const banner = document.createElement('div');
  banner.className = 'emailjs-banner';
  banner.innerHTML = `
    <strong>⚙️ EmailJS no configurado — modo demostración</strong>
    Para enviar emails reales, edita <code>app.js</code> y rellena
    <code>EMAILJS_CONFIG</code> con tus claves de
    <a href="https://www.emailjs.com" target="_blank" rel="noopener">emailjs.com</a>
    (plan gratuito: 200 emails/mes).
  `;
  step3.querySelector('.confirmation').prepend(banner);
}

/* =========================================
   INICIALIZACIÓN
   ========================================= */
document.addEventListener('DOMContentLoaded', async () => {
  // Inicializar EmailJS si está configurado
  if (EMAILJS_READY) {
    emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
  } else {
    injectEmailJSBanner();
  }

  // Cargar eventos desde el backend (con fallback si no está disponible)
  await loadEventsFromAPI();
  if (EVENTS.length === 0) EVENTS = EVENTS_FALLBACK;

  renderEvents();
  renderCart();

  // Filtros

  document.getElementById('filterTabs').addEventListener('click', e => {
    if (e.target.classList.contains('filter-tab')) {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderEvents();
    }
  });

  // Búsqueda
  document.getElementById('searchInput').addEventListener('input', e => {
    currentSearch = e.target.value;
    renderEvents();
  });

  // Abrir carrito
  document.getElementById('cartBtn').addEventListener('click', openCart);
  document.getElementById('cartClose').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);

  // Modal de evento
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });

  // Qty buttons
  document.getElementById('ticketTypes').addEventListener('click', e => {
    const btn = e.target.closest('.qty-btn');
    if (!btn) return;
    const idx = btn.dataset.idx;
    const qtyEl = document.getElementById(`qty-${idx}`);
    let val = parseInt(qtyEl.textContent);
    if (btn.dataset.action === 'plus') val = Math.min(val + 1, 10);
    if (btn.dataset.action === 'minus') val = Math.max(val - 1, 0);
    qtyEl.textContent = val;
    updateModalTotal();
  });

  // Añadir al carrito
  document.getElementById('addToCartBtn').addEventListener('click', addToCart);

  // Checkout
  document.getElementById('checkoutBtn').addEventListener('click', openCheckout);
  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  document.getElementById('checkoutOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('checkoutOverlay')) closeCheckout();
  });

  document.getElementById('goToPayment').addEventListener('click', () => {
    if (validateStep1()) {
      checkoutStep = 2;
      showCheckoutStep(2);
      renderOrderSummaryPreview();
    }
  });

  document.getElementById('backToData').addEventListener('click', () => {
    checkoutStep = 1;
    showCheckoutStep(1);
  });

  // Formateo de tarjeta
  document.getElementById('cardNumber').addEventListener('input', formatCardNumber);
  document.getElementById('cardExpiry').addEventListener('input', formatExpiry);

  // Método de pago — mostrar/ocultar campos de tarjeta
  document.querySelectorAll('input[name="payment"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('cardFields').style.display =
        radio.value === 'card' ? 'block' : 'none';
    });
  });

  document.getElementById('confirmPayment').addEventListener('click', async () => {
    const name  = document.getElementById('firstName').value;
    const email = document.getElementById('email').value;
    const total = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const totalQty = cart.reduce((s, c) => s + c.qty, 0);
    const code  = generateCode();
    const cartSnapshot = [...cart];

    // Pasar a paso 3
    checkoutStep = 3;
    showCheckoutStep(3);

    document.getElementById('confirmationMsg').textContent =
      `¡Gracias, ${name}! Has adquirido ${totalQty} entrada(s) por un total de ${formatPrice(total)}.`;
    document.getElementById('ticketCode').textContent = code;

    // Vaciar carrito
    cart = [];
    renderCart();

    // ── Guardar en backend (sin bloquear la UI) ──
    const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'card';
    const phone = document.getElementById('phone').value;

    saveOrderToBackend({
      orderCode: code,
      firstName: name,
      lastName:  document.getElementById('lastName').value,
      email,
      phone,
      paymentMethod,
      total,
      cartItems: cartSnapshot,
    })
    .then(() => console.info('[Backend] Pedido guardado correctamente:', code))
    .catch(err => console.warn('[Backend] No se pudo guardar el pedido (¿servidor apagado?):', err.message));

    // Enviar email de confirmación
    const loadingToast = showToast({
      type: 'loading',
      title: 'Enviando confirmación…',
      msg: `A ${email}`,
      duration: 0,
    });

    try {
      const result = await sendConfirmationEmail({
        name, email, code,
        cartItems: cartSnapshot,
        total,
      });

      dismissToast(loadingToast);

      if (result?.simulated) {
        showToast({
          type: 'info',
          title: 'Modo demostración',
          msg: 'Configura EmailJS para enviar emails reales. Revisa las instrucciones en app.js.',
          duration: 8000,
        });
        document.getElementById('confirmationMsg').textContent +=
          ' (Email simulado — configura EmailJS para envíos reales)';
      } else {
        showToast({
          type: 'success',
          title: '¡Email enviado!',
          msg: `Confirmación enviada a ${email}`,
        });
        document.getElementById('confirmationMsg').textContent +=
          ` Confirmación enviada a ${email}.`;
      }
    } catch (err) {
      dismissToast(loadingToast);
      console.error('[EmailJS error]', err);
      showToast({
        type: 'error',
        title: 'Error al enviar email',
        msg: 'Verifica tu configuración de EmailJS. Tu compra sí se registró correctamente.',
        duration: 8000,
      });
    }
  });

  document.getElementById('finishBtn').addEventListener('click', () => {
    closeCheckout();
    // Reset form
    document.getElementById('checkoutForm').reset();
    document.getElementById('cardNumber').value = '';
    document.getElementById('cardExpiry').value = '';
    document.getElementById('cardCvv').value = '';
  });
});
