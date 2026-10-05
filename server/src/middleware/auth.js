import jwt from 'jsonwebtoken';
import { CONFIG } from '../config/index.js';
import { db } from '../store/database.js';

export function authenticate(req, res, next) {
  // Support demo switch header or Bearer token
  const authHeader = req.headers.authorization;
  const demoUserId = req.headers['x-demo-user-id'];

  if (demoUserId) {
    const demoUser = db.findById('users', demoUserId);
    if (demoUser && demoUser.isActive) {
      req.user = demoUser;
      return next();
    }
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET);
    const user = db.findById('users', decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account not active or found' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of [${allowedRoles.join(', ')}] role`
      });
    }
    next();
  };
}
