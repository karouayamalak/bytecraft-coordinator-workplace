import express from 'express';
import { authController } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', authController.login);
router.post('/google', authController.googleLogin);
router.post('/switch-demo', authController.switchDemo);
router.post('/forgot-password', authController.forgotPassword);
router.get('/me', authenticate, authController.me);
router.patch('/profile', authenticate, authController.updateProfile);

export default router;
