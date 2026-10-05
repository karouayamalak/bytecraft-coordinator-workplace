import express from 'express';
import { deptController } from '../controllers/deptController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, deptController.getAll);
router.get('/:id', authenticate, deptController.getById);
router.post('/', authenticate, requireRole('COORDINATOR'), deptController.create);
router.patch('/:id', authenticate, requireRole('COORDINATOR'), deptController.update);
router.patch('/:id/archive', authenticate, requireRole('COORDINATOR'), deptController.archive);

export default router;
