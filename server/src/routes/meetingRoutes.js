import express from 'express';
import { meetingController } from '../controllers/meetingController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, meetingController.getAll);
router.get('/:id', authenticate, meetingController.getById);
router.post('/', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), meetingController.create);
router.patch('/:id', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), meetingController.update);
router.post('/:id/actions/:actionId/convert-to-task', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), meetingController.convertActionToTask);

export default router;
