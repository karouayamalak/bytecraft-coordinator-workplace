import { db } from '../store/database.js';
import { wsService } from './wsService.js';

export function logActivity({ actor, action, entityType, entityId, details }) {
  const log = db.insert('activityLogs', {
    actorId: actor?.id || 'system',
    actorName: actor?.name || 'System',
    action,
    entityType,
    entityId,
    details,
    timestamp: new Date().toISOString()
  });

  wsService.broadcast('ACTIVITY_LOGGED', log);
  return log;
}

export function createNotification({ userId, title, message, type = 'TASK', priority = 'INFO', linkUrl = '#' }) {
  const notification = db.insert('notifications', {
    userId,
    title,
    message,
    type,
    priority,
    isRead: false,
    linkUrl,
    createdAt: new Date().toISOString()
  });

  wsService.broadcast('NOTIFICATION_NEW', notification);
  return notification;
}
