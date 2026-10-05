import express from 'express';
import { eventController } from '../controllers/eventController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/agenda/all', authenticate, eventController.getAllAgenda);
router.get('/', authenticate, eventController.getAll);
router.get('/:id', authenticate, eventController.getById);
router.post('/', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.create);
router.patch('/:id', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.update);
router.delete('/:id', authenticate, requireRole('COORDINATOR'), eventController.delete);

// Agenda endpoints
router.post('/:id/agenda', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.addAgendaItem);
router.patch('/:id/agenda/:itemId', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.updateAgendaItem);
router.put('/:id/agenda/reorder', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.reorderAgenda);
router.delete('/:id/agenda/:itemId', authenticate, requireRole('COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'), eventController.deleteAgendaItem);

export default router;
