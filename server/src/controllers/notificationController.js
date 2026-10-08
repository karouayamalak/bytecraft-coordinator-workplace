import { db } from '../store/database.js';
import { reminderService } from '../services/reminderService.js';

const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];

export const notificationController = {
  getAll: (req, res) => {
    const isBoard = BOARD_ROLES.includes(req.user.role);

    // Return notifications for this user, or board members for urgent notifications
    const notifications = db.find('notifications', n =>
      n.userId === req.user.id || (isBoard && n.priority === 'URGENT' && (!n.userId || n.userId === 'all'))
    );

    // Sort by createdAt descending
    notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });
  },

  markRead: (req, res) => {
    const { id } = req.params;
    const updated = db.update('notifications', id, { isRead: true });
    res.json({ success: true, data: updated });
  },

  markAllRead: (req, res) => {
    const notifs = db.find('notifications', n => n.userId === req.user.id);
    notifs.forEach(n => {
      db.update('notifications', n.id, { isRead: true });
    });
    res.json({ success: true, message: 'All notifications marked as read' });
  },

  checkReminders: (req, res) => {
    reminderService.checkAllReminders();
    res.json({ success: true, message: 'Reminders and notifications processed' });
  }
};
