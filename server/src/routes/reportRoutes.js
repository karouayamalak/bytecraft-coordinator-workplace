import express from 'express';
import { reportController } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/analytics', authenticate, reportController.getAnalytics);
router.get('/workload', authenticate, reportController.getWorkload);

export default router;
