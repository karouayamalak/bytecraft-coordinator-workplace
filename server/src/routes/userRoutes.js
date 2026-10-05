import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, userController.getAll);
router.get('/:id', authenticate, userController.getById);
router.post('/', authenticate, requireRole('COORDINATOR'), userController.create);
router.patch('/:id', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER'), userController.update);
router.delete('/:id', authenticate, requireRole('COORDINATOR'), userController.delete);

router.post('/:id/responsibilities', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER'), userController.addResponsibility);
router.delete('/:id/responsibilities/:respId', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER'), userController.deleteResponsibility);

export default router;
