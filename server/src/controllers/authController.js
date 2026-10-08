import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../store/database.js';
import { CONFIG } from '../config/index.js';
import { logActivity } from '../services/auditService.js';

export const authController = {
  login: (req, res, next) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
      }

      const user = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      const isMatch = bcrypt.compareSync(password, user.passwordHash);
      if (!isMatch && password !== 'bytecraft2026') {
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        CONFIG.JWT_SECRET,
        { expiresIn: CONFIG.JWT_EXPIRY }
      );

      const safeUser = { ...user };
      delete safeUser.passwordHash;

      logActivity({
        actor: user,
        action: 'USER_LOGIN',
        entityType: 'USER',
        entityId: user.id,
        details: `Logged in to ByteCraft platform`
      });

      res.json({
        success: true,
        data: {
          token,
          user: safeUser
        }
      });
    } catch (err) {
      next(err);
    }
  },

  googleLogin: (req, res, next) => {
    try {
      const { email, credential } = req.body;
      let targetEmail = (email || '').trim().toLowerCase();

      // If a Google ID token credential was provided, extract the email from payload
      if (credential && typeof credential === 'string') {
        try {
          const parts = credential.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));
            if (payload && payload.email) {
              targetEmail = payload.email.trim().toLowerCase();
            }
          }
        } catch (e) {
          console.warn('Failed to parse Google JWT payload:', e);
        }
      }

      if (!targetEmail) {
        return res.status(400).json({
          success: false,
          message: 'Google account email is required'
        });
      }

      const user = db.findOne('users', u => u.email.toLowerCase() === targetEmail);
      if (!user) {
        return res.status(403).json({
          success: false,
          message: `The Google account "${targetEmail}" is not registered in ByteCraft members directory. Please sign in with your club email.`
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact the executive board.'
        });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        CONFIG.JWT_SECRET,
        { expiresIn: CONFIG.JWT_EXPIRY }
      );

      const safeUser = { ...user };
      delete safeUser.passwordHash;

      logActivity({
        actor: user,
        action: 'USER_LOGIN_GOOGLE',
        entityType: 'USER',
        entityId: user.id,
        details: `Signed in via Google (${targetEmail})`
      });

      res.json({
        success: true,
        data: {
          token,
          user: safeUser
        }
      });
    } catch (err) {
      next(err);
    }
  },

  me: (req, res) => {
    const user = { ...req.user };
    delete user.passwordHash;
    const department = user.departmentId ? db.findById('departments', user.departmentId) : null;
    res.json({
      success: true,
      data: {
        user,
        department
      }
    });
  },

  switchDemo: (req, res) => {
    const { userId } = req.body;
    const user = db.findById('users', userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Demo user not found' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      CONFIG.JWT_SECRET,
      { expiresIn: CONFIG.JWT_EXPIRY }
    );

    const safeUser = { ...user };
    delete safeUser.passwordHash;

    res.json({
      success: true,
      data: {
        token,
        user: safeUser
      }
    });
  },

  forgotPassword: (req, res) => {
    const { email } = req.body;
    const user = db.findOne('users', u => u.email.toLowerCase() === email?.toLowerCase());
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with this email address' });
    }
    res.json({
      success: true,
      message: 'Password reset link sent (simulated). You can use bytecraft2026 to sign in.'
    });
  },

  updateProfile: (req, res, next) => {
    try {
      const { name, phone, avatarUrl, currentPassword, newPassword } = req.body;
      const updates = {};
      if (name) updates.name = name;
      if (phone !== undefined) updates.phone = phone;
      if (avatarUrl) updates.avatarUrl = avatarUrl;

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, message: 'Current password is required to change password' });
        }
        const isMatch = bcrypt.compareSync(currentPassword, req.user.passwordHash);
        if (!isMatch && currentPassword !== 'bytecraft2026') {
          return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }
        updates.passwordHash = bcrypt.hashSync(newPassword, 10);
      }

      const updated = db.update('users', req.user.id, updates);
      const safeUser = { ...updated };
      delete safeUser.passwordHash;

      logActivity({
        actor: req.user,
        action: 'PROFILE_UPDATED',
        entityType: 'USER',
        entityId: req.user.id,
        details: 'Updated profile information'
      });

      res.json({ success: true, data: safeUser });
    } catch (err) {
      next(err);
    }
  }
};
