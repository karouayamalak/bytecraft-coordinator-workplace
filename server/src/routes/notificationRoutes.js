import express from 'express';
import { notificationController } from '../controllers/notificationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, notificationController.getAll);
router.patch('/:id/read', authenticate, notificationController.markRead);
router.post('/read-all', authenticate, notificationController.markAllRead);
router.post('/check-reminders', authenticate, notificationController.checkReminders);

export default router;
