const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

// ─── GET /api/dashboard/stats ─────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) AS v FROM orders').get().v;
  const totalOrders  = db.prepare('SELECT COUNT(*) AS v FROM orders').get().v;
  const totalTickets = db.prepare('SELECT COALESCE(SUM(qty), 0) AS v FROM order_items WHERE order_id IN (SELECT id FROM orders)').get().v;
  const avgOrder     = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Hoy (comparando solo la parte de fecha)
  const today = new Date().toISOString().substring(0, 10);
  const todayRevenue = db.prepare(`SELECT COALESCE(SUM(total),0) AS v FROM orders WHERE substr(created_at,1,10) = ?`).get(today).v;
  const todayOrders  = db.prepare(`SELECT COUNT(*) AS v FROM orders WHERE substr(created_at,1,10) = ?`).get(today).v;

  const topStyleRow = db.prepare(`
    SELECT event_style, SUM(subtotal) AS revenue
    FROM order_items WHERE order_id IN (SELECT id FROM orders)
    GROUP BY event_style ORDER BY revenue DESC LIMIT 1
  `).get();
  const topEventRow = db.prepare(`
    SELECT event_title, SUM(subtotal) AS revenue
    FROM order_items WHERE order_id IN (SELECT id FROM orders)
    GROUP BY event_title ORDER BY revenue DESC LIMIT 1
  `).get();

  return res.json({
    totalRevenue, totalOrders, totalTickets, avgOrder,
    todayRevenue, todayOrders,
    topStyle: topStyleRow?.event_style  || '—',
    topEvent: topEventRow?.event_title  || '—',
  });
});

// ─── GET /api/dashboard/revenue-by-day ────────────────────────────────────────
router.get('/revenue-by-day', (req, res) => {
  // Últimos 30 días con datos reales
  const rows = db.prepare(`
    SELECT substr(created_at,1,10) AS day,
           SUM(total)  AS revenue,
           COUNT(*)    AS orders
    FROM orders
    GROUP BY day
    ORDER BY day ASC
  `).all();

  // Rellenar días sin ventas con 0
  const result = [];
  const today  = new Date();
  for (let i = 29; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().substring(0, 10);
    const found = rows.find(r => r.day === key);
    result.push({ day: key, revenue: found?.revenue || 0, orders: found?.orders || 0 });
  }
  return res.json(result);
});

// ─── GET /api/dashboard/sales-by-style ────────────────────────────────────────
router.get('/sales-by-style', (req, res) => {
  const rows = db.prepare(`
    SELECT event_style,
           SUM(subtotal) AS revenue,
           SUM(qty)      AS tickets,
           COUNT(DISTINCT order_id) AS orders
    FROM order_items
    WHERE order_id IN (SELECT id FROM orders)
    GROUP BY event_style
    ORDER BY revenue DESC
  `).all();
  return res.json(rows);
});

// ─── GET /api/dashboard/top-events ────────────────────────────────────────────
router.get('/top-events', (req, res) => {
  const rows = db.prepare(`
    SELECT event_id, event_title, event_style,
           SUM(subtotal) AS revenue,
           SUM(qty)      AS tickets,
           COUNT(DISTINCT order_id) AS orders
    FROM order_items
    WHERE order_id IN (SELECT id FROM orders)
    GROUP BY event_id
    ORDER BY revenue DESC
    LIMIT 8
  `).all();
  return res.json(rows);
});

// ─── GET /api/dashboard/payment-methods ───────────────────────────────────────
router.get('/payment-methods', (req, res) => {
  const rows = db.prepare(`
    SELECT payment_method,
           COUNT(*)   AS orders,
           SUM(total) AS revenue
    FROM orders
    GROUP BY payment_method
    ORDER BY orders DESC
  `).all();
  return res.json(rows);
});

// ─── GET /api/dashboard/tickets-by-type ──────────────────────────────────────
router.get('/tickets-by-type', (req, res) => {
  const rows = db.prepare(`
    SELECT ticket_name, event_style,
           SUM(qty)      AS tickets,
           SUM(subtotal) AS revenue
    FROM order_items
    WHERE order_id IN (SELECT id FROM orders)
    GROUP BY ticket_name
    ORDER BY tickets DESC
    LIMIT 10
  `).all();
  return res.json(rows);
});

// ─── GET /api/dashboard/recent-orders ─────────────────────────────────────────
router.get('/recent-orders', (req, res) => {
  const rows = db.prepare(`
    SELECT o.id, o.order_code,
           o.first_name || ' ' || o.last_name AS full_name,
           o.email, o.payment_method, o.total, o.created_at,
           (SELECT SUM(qty) FROM order_items WHERE order_id = o.id)               AS ticket_count,
           (SELECT GROUP_CONCAT(event_style,',') FROM order_items WHERE order_id = o.id) AS styles
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all();
  return res.json(rows);
});

module.exports = router;
