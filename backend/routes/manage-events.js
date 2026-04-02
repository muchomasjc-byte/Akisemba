const express = require('express');
const router  = express.Router();
const { db }  = require('../db');

function getEventWithTickets(id) {
  const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
  if (!ev) return null;
  const tickets = db.prepare('SELECT * FROM event_tickets WHERE event_id = ? ORDER BY sort_order').all(id);
  return { ...ev, soldOut: !!ev.sold_out, tickets: tickets.map(t => ({ id: t.id, name: t.name, desc: t.description, price: t.price })) };
}

// GET /api/manage-events
router.get('/', (req, res) => {
  const events = db.prepare('SELECT * FROM events WHERE active = 1 ORDER BY date ASC').all();
  const result = events.map(ev => {
    const tickets = db.prepare('SELECT * FROM event_tickets WHERE event_id = ? ORDER BY sort_order').all(ev.id);
    return { ...ev, soldOut: !!ev.sold_out, tickets: tickets.map(t => ({ name: t.name, desc: t.description, price: t.price })) };
  });
  return res.json(result);
});

// GET /api/manage-events/all (admin — incluye inactivos)
router.get('/all', (req, res) => {
  const events = db.prepare('SELECT * FROM events ORDER BY date ASC').all();
  const result = events.map(ev => {
    const tickets = db.prepare('SELECT * FROM event_tickets WHERE event_id = ? ORDER BY sort_order').all(ev.id);
    return { ...ev, soldOut: !!ev.sold_out, tickets: tickets.map(t => ({ id: t.id, name: t.name, desc: t.description, price: t.price })) };
  });
  return res.json(result);
});

// GET /api/manage-events/:id
router.get('/:id', (req, res) => {
  const ev = getEventWithTickets(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado.' });
  return res.json(ev);
});

// POST /api/manage-events
router.post('/', (req, res) => {
  const { title, style, emoji, date, dateDisplay, location, artist, desc, soldOut, tickets } = req.body;
  if (!title || !style || !date || !location || !tickets?.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  try {
    const create = db.transaction(() => {
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO events (title, style, emoji, date, date_display, location, artist, description, sold_out)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(title, style, emoji || '🎵', date, dateDisplay || date, location, artist || '', desc || '', soldOut ? 1 : 0);
      tickets.forEach((t, i) => {
        db.prepare('INSERT INTO event_tickets (event_id, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?)').run(lastInsertRowid, t.name, t.desc || '', parseFloat(t.price), i);
      });
      return lastInsertRowid;
    });
    const id = create();
    return res.status(201).json({ success: true, id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

// PUT /api/manage-events/:id
router.put('/:id', (req, res) => {
  const { title, style, emoji, date, dateDisplay, location, artist, desc, soldOut, tickets } = req.body;
  if (!title || !style || !date || !location || !tickets?.length) {
    return res.status(400).json({ error: 'Faltan campos obligatorios.' });
  }
  try {
    const update = db.transaction(() => {
      const { changes } = db.prepare(`
        UPDATE events SET title=?, style=?, emoji=?, date=?, date_display=?, location=?, artist=?, description=?, sold_out=? WHERE id=?
      `).run(title, style, emoji || '🎵', date, dateDisplay || date, location, artist || '', desc || '', soldOut ? 1 : 0, req.params.id);
      if (changes === 0) throw new Error('not_found');
      db.prepare('DELETE FROM event_tickets WHERE event_id = ?').run(req.params.id);
      tickets.forEach((t, i) => {
        db.prepare('INSERT INTO event_tickets (event_id, name, description, price, sort_order) VALUES (?, ?, ?, ?, ?)').run(req.params.id, t.name, t.desc || '', parseFloat(t.price), i);
      });
    });
    update();
    return res.json({ success: true });
  } catch (err) {
    if (err.message === 'not_found') return res.status(404).json({ error: 'Evento no encontrado.' });
    console.error(err);
    return res.status(500).json({ error: 'Error interno.' });
  }
});

// DELETE /api/manage-events/:id
router.delete('/:id', (req, res) => {
  const { changes } = db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  if (changes === 0) return res.status(404).json({ error: 'No encontrado.' });
  return res.json({ success: true });
});

module.exports = router;
