const express        = require('express');
const router         = express.Router();
const { db }         = require('../db');
const { notify }     = require('../events');

// ─── POST /api/orders ─────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const { orderCode, firstName, lastName, email, phone, paymentMethod, total, items } = req.body;

  if (!orderCode || !firstName || !lastName || !email || !total || !items?.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (order_code, first_name, last_name, email, phone, payment_method, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, event_id, event_title, event_style, ticket_name, unit_price, qty, subtotal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  try {
    const createOrder = db.transaction(() => {
      const { lastInsertRowid } = insertOrder.run(
        orderCode, firstName, lastName, email, phone || '', paymentMethod || 'card', total
      );
      items.forEach(item => {
        insertItem.run(lastInsertRowid, item.eventId, item.eventTitle, item.eventStyle,
          item.ticketName, item.unitPrice, item.qty, item.subtotal);
      });
      return lastInsertRowid;
    });

    const orderId = createOrder();

    // Notificar al panel admin en tiempo real
    notify({ type: 'new_order', orderCode, total, firstName, lastName, email });

    return res.status(201).json({ success: true, orderId, orderCode });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: 'Código de pedido duplicado.' });
    }
    console.error(err);
    return res.status(500).json({ error: 'Error interno del servidor.' });
  }
});

// ─── GET /api/orders ──────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const { page = 1, limit = 20, search = '', style = '' } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  // Construir consulta base con filtros
  const conditions = ['1=1'];
  const params = [];

  if (search) {
    conditions.push(`(o.first_name LIKE ? OR o.last_name LIKE ? OR o.email LIKE ? OR o.order_code LIKE ?)`);
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }
  if (style) {
    conditions.push(`EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.event_style = ?)`);
    params.push(style);
  }
  const where = conditions.join(' AND ');

  const rows = db.prepare(`
    SELECT
      o.id, o.order_code, o.first_name, o.last_name, o.email,
      o.phone, o.payment_method, o.total, o.created_at,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) AS item_count,
      (SELECT SUM(qty)  FROM order_items WHERE order_id = o.id) AS ticket_count
    FROM orders o
    WHERE ${where}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, parseInt(limit), offset);

  const totalRow = db.prepare(`SELECT COUNT(*) as n FROM orders o WHERE ${where}`).get(...params);

  return res.json({ orders: rows, total: totalRow.n, page: parseInt(page), limit: parseInt(limit) });
});

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
  return res.json({ order, items });
});

// ─── PUT /api/orders/:id ─────────────────────────────────────────────────────
router.put('/:id', (req, res) => {
  const { firstName, lastName, email, phone, paymentMethod } = req.body;
  if (!firstName || !lastName || !email) {
    return res.status(400).json({ error: 'Nombre, apellidos y email son obligatorios.' });
  }
  const { changes } = db.prepare(`
    UPDATE orders SET first_name=?, last_name=?, email=?, phone=?, payment_method=? WHERE id=?
  `).run(firstName, lastName, email, phone || '', paymentMethod || 'card', req.params.id);
  if (changes === 0) return res.status(404).json({ error: 'Pedido no encontrado.' });
  return res.json({ success: true });
});

// ─── DELETE /api/orders/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  if (changes === 0) return res.status(404).json({ error: 'No encontrado.' });
  return res.json({ success: true });
});

module.exports = router;
