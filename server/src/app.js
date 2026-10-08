import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import { CONFIG } from './config/index.js';
import { db } from './store/database.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';


// Route imports
import authRoutes from './routes/authRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import userRoutes from './routes/userRoutes.js';
import deptRoutes from './routes/deptRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import comPlanRoutes from './routes/comPlanRoutes.js';
import meetingRoutes from './routes/meetingRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import systemRoutes from './routes/systemRoutes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-demo-user-id']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads folder (local dev only — Vercel doesn't persist files)
app.use('/uploads', express.static(CONFIG.UPLOADS_DIR));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ByteCraft Platform API',
    database: db.mongoConnected ? 'MongoDB' : 'Local JSON',
    timestamp: new Date().toISOString()
  });
});

// Ensure MongoDB is connected when MONGODB_URI is configured (vital for Vercel serverless cold starts)
app.use(async (req, res, next) => {
  if (CONFIG.MONGODB_URI && !db.mongoConnected) {
    try {
      await db.connectMongo();
    } catch (err) {
      console.error('Mongo connection error:', err);
    }
  }
  next();
});

// API Routes

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', deptRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/communication', comPlanRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/system', systemRoutes);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
