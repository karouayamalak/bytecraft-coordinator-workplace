import express from 'express';
import { comPlanController } from '../controllers/comPlanController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, comPlanController.getAll);
router.post('/', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), comPlanController.createItem);
router.patch('/:id', authenticate, comPlanController.updateItem);
router.delete('/:id', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), comPlanController.deleteItem);

export default router;
