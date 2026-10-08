// Local development entry point — imports the shared app + adds WS + starts HTTP server
import http from 'http';
import app from './app.js';
import { CONFIG } from './config/index.js';
import { wsService } from './services/wsService.js';
import { reminderService } from './services/reminderService.js';

const server = http.createServer(app);

// Initialize WebSocket server and automated reminder service (local dev only)
wsService.init(server);
reminderService.init();

// Start HTTP + WS Server
server.listen(CONFIG.PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 BYTECRAFT API Server running on port ${CONFIG.PORT}`);
  console.log(`📡 WebSocket ready at ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`⚡ ByteCraft Coordinator Platform ready (v2 synced)`);
  console.log(`=========================================`);
});
