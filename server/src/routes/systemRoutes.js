import express from 'express';
import multer from 'multer';
import path from 'path';
import { systemController } from '../controllers/systemController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { CONFIG } from '../config/index.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CONFIG.UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 6)}${ext}`);
  }
});
const upload = multer({ storage });

const router = express.Router();

router.get('/search', authenticate, systemController.globalSearch);
router.get('/activity', authenticate, systemController.getActivity);
router.get('/settings', authenticate, systemController.getSettings);
router.patch('/settings', authenticate, requireRole('COORDINATOR'), systemController.updateSettings);
router.post('/reset-demo', authenticate, requireRole('COORDINATOR'), systemController.resetDemoData);
router.post('/upload', authenticate, upload.single('file'), systemController.uploadAttachment);

export default router;
