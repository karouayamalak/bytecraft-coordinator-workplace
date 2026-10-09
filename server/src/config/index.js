import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const CONFIG = {
  PORT: process.env.PORT || 5000,
  JWT_SECRET: process.env.JWT_SECRET || 'bytecraft-super-secret-jwt-key-2026',
  JWT_EXPIRY: '7d',
  DB_FILE: path.join(__dirname, '../../data/db.json'),
  UPLOADS_DIR: path.join(__dirname, '../../uploads'),
  DEMO_MODE: false,
  MONGODB_URI: process.env.MONGODB_URI || '',
  MONGODB_DB_NAME: process.env.MONGODB_DB_NAME || 'bytecraft',
};

