/* =========================================
   DB.JS — SQLite via sql.js (WASM, sin compilación nativa)
   ========================================= */
const fs   = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'ritmoboleto.db');

let _db            = null;   // instancia sql.js Database
let _inTransaction = false;

/* ── Guarda el estado en disco ────────────────────────────────────────────── */
function saveDb() {
  try {
    fs.writeFileSync(DB_PATH, Buffer.from(_db.export()));
  } catch (e) {
    console.error('[DB] Error al guardar:', e.message);
  }
}

/* ── Wrapper Statement (imita la API de better-sqlite3) ───────────────────── */
class Statement {
  constructor(sql) { this.sql = sql; }

  /* Ejecuta y devuelve { lastInsertRowid, changes } */
  run(...params) {
    _db.run(this.sql, params.flat());

    const idStmt = _db.prepare('SELECT last_insert_rowid() as id');
    idStmt.step(); const { id } = idStmt.getAsObject(); idStmt.free();

    const chStmt = _db.prepare('SELECT changes() as ch');
    chStmt.step(); const { ch } = chStmt.getAsObject(); chStmt.free();

    if (!_inTransaction) saveDb();
    return { lastInsertRowid: id, changes: ch };
  }

  /* Devuelve la primera fila o undefined */
  get(...params) {
    const stmt = _db.prepare(this.sql);
    stmt.bind(params.flat());
    const row = stmt.step() ? stmt.getAsObject() : undefined;
    stmt.free();
    return row;
  }

  /* Devuelve todas las filas */
  all(...params) {
    const stmt = _db.prepare(this.sql);
    stmt.bind(params.flat());
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
}

/* ── Wrapper DB (imita la API de better-sqlite3) ──────────────────────────── */
class DBWrapper {
  prepare(sql)  { return new Statement(sql); }
  pragma(str)   { _db.run(`PRAGMA ${str}`); return this; }

  exec(sql) {
    _db.exec(sql);
    if (!_inTransaction) saveDb();
    return this;
  }

  transaction(fn) {
    return (...args) => {
      _db.run('BEGIN');
      _inTransaction = true;
      try {
        const result = fn(...args);
        _db.run('COMMIT');
        _inTransaction = false;
        saveDb();
        return result;
      } catch (e) {
        try { _db.run('ROLLBACK'); } catch {}
        _inTransaction = false;
        throw e;
      }
    };
  }
}

/* ── Instancia única exportable ───────────────────────────────────────────── */
const db = new DBWrapper();

/* ── init(): carga o crea la BD y hace el seed ────────────────────────────── */
async function init() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    _db = new SQL.Database(fs.readFileSync(DB_PATH));
    console.log('[DB] Base de datos cargada desde', DB_PATH);
  } else {
    _db = new SQL.Database();
    console.log('[DB] Nueva base de datos creada.');
  }

  // ── Esquema ──────────────────────────────────────────────────────────────
  _db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code     TEXT    UNIQUE NOT NULL,
      first_name     TEXT    NOT NULL,
      last_name      TEXT    NOT NULL,
      email          TEXT    NOT NULL,
      phone          TEXT    DEFAULT '',
      payment_method TEXT    NOT NULL DEFAULT 'card',
      total          REAL    NOT NULL,
      created_at     TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      event_id     INTEGER NOT NULL,
      event_title  TEXT    NOT NULL,
      event_style  TEXT    NOT NULL,
      ticket_name  TEXT    NOT NULL,
      unit_price   REAL    NOT NULL,
      qty          INTEGER NOT NULL,
      subtotal     REAL    NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_email      ON orders(email);
    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_items_order_id    ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_items_event_id    ON order_items(event_id);
    CREATE INDEX IF NOT EXISTS idx_items_style       ON order_items(event_style);

    CREATE TABLE IF NOT EXISTS events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      title        TEXT NOT NULL,
      style        TEXT NOT NULL,
      emoji        TEXT DEFAULT '🎵',
      date         TEXT NOT NULL,
      date_display TEXT NOT NULL,
      location     TEXT NOT NULL,
      artist       TEXT NOT NULL DEFAULT '',
      description  TEXT NOT NULL DEFAULT '',
      sold_out     INTEGER DEFAULT 0,
      active       INTEGER DEFAULT 1,
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_tickets (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id    INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      name        TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price       REAL NOT NULL,
      sort_order  INTEGER DEFAULT 0
    );
  `);
  saveDb();

  // ── Seed de eventos (solo si la tabla está vacía) ────────────────────────
  const { ne } = db.prepare('SELECT COUNT(*) as ne FROM events').get();
  if (ne === 0) {
    const seedEvents = [
      { title:'Salsa World Congress Madrid',  style:'salsa',    emoji:'💃', date:'2026-04-18', date_display:'18 Abr 2026 · 21:00', location:'📍 Palacio de los Deportes, Madrid',    artist:'🎵 DJ Kachamba + Orquesta Havana Club',            desc:'El mayor festival de salsa de España regresa con más de 20 workshops, competiciones internacionales y noches de baile hasta el amanecer.', sold_out:0, tickets:[{name:'Entrada General',desc:'Acceso a todas las pistas de baile',price:35},{name:'Entrada VIP',desc:'Zona VIP + Consumición incluida',price:65},{name:'Pase Completo (3 días)',desc:'Acceso total al congreso + talleres',price:120}] },
      { title:'Bachata Sensual Night',         style:'bachata',  emoji:'🌹', date:'2026-04-25', date_display:'25 Abr 2026 · 22:00', location:'📍 Club Privé, Barcelona',              artist:'🎵 Demarco Flamenco & Romeo Santos Tribute',       desc:'Una noche íntima y apasionada dedicada a la bachata sensual dominicana.',                                                                    sold_out:0, tickets:[{name:'Entrada Individual',desc:'Acceso nocturno estándar',price:20},{name:'Entrada Pareja',desc:'Descuento especial para parejas',price:34}] },
      { title:'Tango Milonga Clásica',         style:'tango',    emoji:'🎩', date:'2026-05-02', date_display:'2 May 2026 · 20:30',  location:'📍 Teatro Colón, Sevilla',              artist:'🎵 Quinteto Porteño',                               desc:'Milonga tradicional con la elegancia del Buenos Aires de los años 40. Código de vestimenta requerido.',                                       sold_out:0, tickets:[{name:'Mesa individual',desc:'1 asiento en mesa compartida',price:28},{name:'Mesa privada (2 personas)',desc:'Mesa reservada para 2',price:50},{name:'Mesa privada (4 personas)',desc:'Mesa reservada para 4 + botella',price:95}] },
      { title:'Festival Flamenco Granada',     style:'flamenco', emoji:'🌺', date:'2026-05-10', date_display:'10 May 2026 · 19:00', location:'📍 Cueva del Sacromonte, Granada',      artist:'🎵 Sara Baras + Grupo flamenco Los Faroles',       desc:'Un espectáculo único al abrigo de las cuevas del Sacromonte.',                                                                               sold_out:1, tickets:[{name:'Butaca',desc:'Asiento en primera fila',price:45},{name:'Anfiteatro',desc:'Vista panorámica completa',price:30}] },
      { title:'Swing & Jazz Valenciano',       style:'swing',    emoji:'🎺', date:'2026-05-16', date_display:'16 May 2026 · 20:00', location:'📍 Sala Ultramarinos, Valencia',        artist:'🎵 The Valencia Stompers',                          desc:'Una noche de Lindy Hop, Charleston y West Coast Swing al ritmo del jazz en vivo.',                                                           sold_out:0, tickets:[{name:'Clase + Fiesta',desc:'Incluye clase introductoria',price:18},{name:'Solo Fiesta',desc:'Entrada a partir de las 21:30',price:12}] },
      { title:'Kizomba Fusion Weekend',        style:'kizomba',  emoji:'🌊', date:'2026-05-23', date_display:'23-25 May 2026',      location:'📍 Hotel Meliá, Málaga',               artist:'🎵 Mestre Petchu + DJ Deejay Ticat',                desc:'Fin de semana completo de kizomba, semba y urbankiz. Más de 15 instructores internacionales.',                                               sold_out:0, tickets:[{name:'Pase Viernes',desc:'Solo noche del viernes',price:25},{name:'Pase Fin de Semana',desc:'Viernes + Sábado + Domingo',price:85},{name:'Pase Full + Talleres',desc:'Todo incluido + workshops premium',price:140}] },
      { title:'Noche Salsa en la Terraza',     style:'salsa',    emoji:'🌴', date:'2026-06-05', date_display:'5 Jun 2026 · 22:30',  location:'📍 Terraza Azul, Alicante',            artist:'🎵 DJs Rotativos + Sesión en Vivo',                 desc:'El verano arranca con salsa en la mejor terraza de la costa.',                                                                               sold_out:0, tickets:[{name:'Entrada General',desc:'Acceso a la terraza',price:15},{name:'Entrada + Cóctel',desc:'Incluye cóctel de bienvenida',price:25}] },
      { title:'Gran Gala de Tango Argentino',  style:'tango',    emoji:'🥀', date:'2026-06-14', date_display:'14 Jun 2026 · 21:00', location:'📍 Palau de la Música, Valencia',       artist:'🎵 Orquesta Típica El Arranque',                    desc:'Espectáculo gala de danza argentina con los mejores bailarines de Buenos Aires.',                                                             sold_out:0, tickets:[{name:'Patio de butacas',desc:'Vista frontal al escenario',price:55},{name:'Platea alta',desc:'Segunda planta, vista general',price:35},{name:'Palco VIP',desc:'Palco privado para 4 + champán',price:220}] },
      { title:'Bachata Urban Summer Fest',     style:'bachata',  emoji:'🎧', date:'2026-07-04', date_display:'4 Jul 2026 · 22:00',  location:'📍 Estadio La Peineta (Exterior), Madrid', artist:'🎵 Prince Royce + Juan Luis Guerra Tribute',    desc:'El festival de bachata urbana más grande del verano. Conciertos, competiciones y fiesta al aire libre.',                                      sold_out:0, tickets:[{name:'General',desc:'Acceso zona general',price:30},{name:'VIP Pit',desc:'Zona delantera junto al escenario',price:75},{name:'Premium Lounge',desc:'Área VIP con barra libre 3h',price:130}] },
    ];
    const insEv  = db.prepare('INSERT INTO events (title,style,emoji,date,date_display,location,artist,description,sold_out) VALUES (?,?,?,?,?,?,?,?,?)');
    const insTk  = db.prepare('INSERT INTO event_tickets (event_id,name,description,price,sort_order) VALUES (?,?,?,?,?)');
    const seedEv = db.transaction(() => {
      seedEvents.forEach(ev => {
        const { lastInsertRowid } = insEv.run(ev.title,ev.style,ev.emoji,ev.date,ev.date_display,ev.location,ev.artist,ev.desc,ev.sold_out);
        ev.tickets.forEach((t,i) => insTk.run(lastInsertRowid,t.name,t.desc,t.price,i));
      });
    });
    seedEv();
    console.log('[DB] 9 eventos de muestra insertados.');
  }

  // ── Seed (solo si la BD está vacía) ──────────────────────────────────────
  const { n } = db.prepare('SELECT COUNT(*) as n FROM orders').get();
  if (n === 0) {
    const buyers = [
      { first: 'Ana',    last: 'García',    email: 'ana.garcia@example.com',   phone: '+34 600 111 222', pay: 'card'   },
      { first: 'Carlos', last: 'López',     email: 'carlos.lopez@example.com', phone: '+34 611 333 444', pay: 'paypal' },
      { first: 'María',  last: 'Rodríguez', email: 'maria.rod@example.com',    phone: '+34 622 555 666', pay: 'bizum'  },
      { first: 'Javier', last: 'Martínez',  email: 'javier.m@example.com',     phone: '+34 633 777 888', pay: 'card'   },
      { first: 'Laura',  last: 'Sánchez',   email: 'laura.s@example.com',      phone: '',               pay: 'card'   },
      { first: 'Pedro',  last: 'Díaz',      email: 'pedro.diaz@example.com',   phone: '+34 644 999 000', pay: 'paypal' },
      { first: 'Sofía',  last: 'Fernández', email: 'sofia.f@example.com',      phone: '+34 655 001 002', pay: 'bizum'  },
      { first: 'Miguel', last: 'Torres',    email: 'miguel.t@example.com',     phone: '+34 666 003 004', pay: 'card'   },
      { first: 'Elena',  last: 'Jiménez',   email: 'elena.j@example.com',      phone: '+34 677 005 006', pay: 'card'   },
      { first: 'David',  last: 'Moreno',    email: 'david.m@example.com',      phone: '+34 688 007 008', pay: 'paypal' },
      { first: 'Isabel', last: 'Ruiz',      email: 'isabel.r@example.com',     phone: '',               pay: 'card'   },
      { first: 'Pablo',  last: 'Álvarez',   email: 'pablo.a@example.com',      phone: '+34 699 009 010', pay: 'bizum'  },
      { first: 'Lucía',  last: 'Romero',    email: 'lucia.ro@example.com',     phone: '+34 600 111 333', pay: 'card'   },
      { first: 'Andrés', last: 'Gómez',     email: 'andres.g@example.com',     phone: '+34 611 333 445', pay: 'card'   },
      { first: 'Carmen', last: 'Serrano',   email: 'carmen.s@example.com',     phone: '+34 622 556 667', pay: 'paypal' },
    ];

    const sampleItems = [
      { event_id:1, event_title:'Salsa World Congress Madrid',  event_style:'salsa',   ticket_name:'Entrada General',      unit_price:35,  qty:2 },
      { event_id:1, event_title:'Salsa World Congress Madrid',  event_style:'salsa',   ticket_name:'Entrada VIP',          unit_price:65,  qty:1 },
      { event_id:2, event_title:'Bachata Sensual Night',        event_style:'bachata', ticket_name:'Entrada Individual',   unit_price:20,  qty:1 },
      { event_id:2, event_title:'Bachata Sensual Night',        event_style:'bachata', ticket_name:'Entrada Pareja',       unit_price:34,  qty:2 },
      { event_id:3, event_title:'Tango Milonga Clásica',        event_style:'tango',   ticket_name:'Mesa individual',      unit_price:28,  qty:1 },
      { event_id:3, event_title:'Tango Milonga Clásica',        event_style:'tango',   ticket_name:'Mesa privada (2)',     unit_price:50,  qty:1 },
      { event_id:5, event_title:'Swing & Jazz Valenciano',      event_style:'swing',   ticket_name:'Clase + Fiesta',       unit_price:18,  qty:3 },
      { event_id:6, event_title:'Kizomba Fusion Weekend',       event_style:'kizomba', ticket_name:'Pase Fin de Semana',   unit_price:85,  qty:1 },
      { event_id:7, event_title:'Noche Salsa en la Terraza',    event_style:'salsa',   ticket_name:'Entrada + Cóctel',     unit_price:25,  qty:2 },
      { event_id:8, event_title:'Gran Gala de Tango Argentino', event_style:'tango',   ticket_name:'Patio de butacas',     unit_price:55,  qty:2 },
      { event_id:9, event_title:'Bachata Urban Summer Fest',    event_style:'bachata', ticket_name:'VIP Pit',              unit_price:75,  qty:1 },
      { event_id:9, event_title:'Bachata Urban Summer Fest',    event_style:'bachata', ticket_name:'General',              unit_price:30,  qty:4 },
      { event_id:6, event_title:'Kizomba Fusion Weekend',       event_style:'kizomba', ticket_name:'Pase Full + Talleres', unit_price:140, qty:1 },
      { event_id:1, event_title:'Salsa World Congress Madrid',  event_style:'salsa',   ticket_name:'Pase Completo',        unit_price:120, qty:1 },
      { event_id:5, event_title:'Swing & Jazz Valenciano',      event_style:'swing',   ticket_name:'Solo Fiesta',          unit_price:12,  qty:2 },
    ];

    const insertOrder = db.prepare(`
      INSERT INTO orders (order_code, first_name, last_name, email, phone, payment_method, total, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, event_id, event_title, event_style, ticket_name, unit_price, qty, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seed = db.transaction(() => {
      const now = new Date();
      buyers.forEach((b, idx) => {
        // Fechas distribuidas en los últimos 30 días
        const daysAgo = Math.floor(Math.random() * 30);
        const d = new Date(now);
        d.setDate(d.getDate() - daysAgo);
        const dateStr = d.toISOString().replace('T', ' ').substring(0, 19);

        const item  = sampleItems[idx % sampleItems.length];
        const total = item.unit_price * item.qty;
        const code  = 'RB-' + Math.random().toString(36).substring(2, 8).toUpperCase();

        const { lastInsertRowid } = insertOrder.run(code, b.first, b.last, b.email, b.phone, b.pay, total, dateStr);
        insertItem.run(lastInsertRowid, item.event_id, item.event_title, item.event_style, item.ticket_name, item.unit_price, item.qty, total);
      });
    });

    seed();
    console.log('[DB] 15 pedidos de muestra insertados.');
  }

  return db;
}

module.exports = { init, db };
