// Vercel Serverless Entry Point — exports Express app as a handler
// WebSocket and reminder services are not available in serverless (stateless functions)
import app from '../src/app.js';

export default app;
