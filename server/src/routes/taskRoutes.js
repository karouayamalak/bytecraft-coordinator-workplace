import express from 'express';
import { taskController } from '../controllers/taskController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, taskController.getAll);
router.get('/deadlines', authenticate, taskController.getDeadlines);
router.get('/:id', authenticate, taskController.getById);
router.post('/', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), taskController.create);
router.patch('/:id', authenticate, taskController.update);
router.delete('/:id', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), taskController.delete);

export default router;
