import { db } from '../store/database.js';

export const notificationController = {
  getAll: (req, res) => {
    // Return notifications for this user or coordinator
    const notifications = db.find('notifications', n =>
      n.userId === req.user.id || (req.user.role === 'COORDINATOR' && n.priority === 'URGENT')
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
  }
};
