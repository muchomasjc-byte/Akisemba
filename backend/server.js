const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { init } = require('./db');

const PORT = process.env.PORT || 3002;

async function start() {
  console.log('⏳ Inicializando base de datos…');
  await init();   // Carga sql.js (WASM) y abre/crea la BD

  const app = express();

  // ─── Middleware ────────────────────────────────────────────────────────────
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Servir el frontend principal (index.html, app.js, styles.css…)
  app.use(express.static(path.join(__dirname, '..')));

  // Servir el panel de administración
  app.use('/admin', express.static(path.join(__dirname, '..', 'admin')));

  // ─── SSE: notificaciones en tiempo real al panel admin ────────────────────
  const { addClient, removeClient } = require('./events');
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Heartbeat cada 25 s para mantener la conexión viva
    const hb = setInterval(() => { try { res.write(': heartbeat\n\n'); } catch {} }, 25000);

    addClient(res);
    req.on('close', () => { clearInterval(hb); removeClient(res); });
  });

  // ─── Rutas API ─────────────────────────────────────────────────────────────
  app.use('/api/orders',         require('./routes/orders'));
  app.use('/api/dashboard',      require('./routes/dashboard'));
  app.use('/api/manage-events',  require('./routes/manage-events'));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

  // ─── Arrancar servidor ─────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n🎵  AkiTix Backend  →  http://localhost:${PORT}`);
    console.log(`📊  Panel de admin      →  http://localhost:${PORT}/admin`);
    console.log(`🔌  API REST            →  http://localhost:${PORT}/api\n`);
  });
}

start().catch(err => {
  console.error('❌ Error al iniciar el servidor:', err);
  process.exit(1);
});
