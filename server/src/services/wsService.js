import { WebSocketServer } from 'ws';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  init(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws) => {
      this.clients.add(ws);
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
          }
        } catch (e) {
          // ignore invalid message
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      // Send initial welcome
      ws.send(JSON.stringify({
        type: 'CONNECTED',
        payload: { message: 'ByteCraft Realtime Stream Connected', time: new Date().toISOString() }
      }));
    });

    // Heartbeat check every 30s
    const interval = setInterval(() => {
      this.clients.forEach((ws) => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);

    this.wss.on('close', () => clearInterval(interval));
    console.log('WebSocket service initialized on /ws');
  }

  broadcast(type, payload) {
    const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
    for (const client of this.clients) {
      if (client.readyState === 1) { // 1 = OPEN
        client.send(message);
      }
    }
  }
}

export const wsService = new WebSocketService();
