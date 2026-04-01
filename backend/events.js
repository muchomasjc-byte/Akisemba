/* =========================================
   EVENTS.JS — Server-Sent Events (SSE)
   Notifica al panel de admin en tiempo real
   cuando llega una nueva venta.
   ========================================= */
const clients = new Set();

function addClient(res) {
  clients.add(res);
}

function removeClient(res) {
  clients.delete(res);
}

function notify(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach(client => {
    try { client.write(payload); } catch { clients.delete(client); }
  });
}

module.exports = { addClient, removeClient, notify, clients };
