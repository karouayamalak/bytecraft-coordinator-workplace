import { db } from '../store/database.js';
import { createNotification } from './auditService.js';

class ReminderService {
  constructor() {
    this.intervalId = null;
  }

  init() {
    setTimeout(() => this.checkAllReminders(), 3000);
    this.intervalId = setInterval(() => this.checkAllReminders(), 30 * 60 * 1000);
  }

  checkAllReminders() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const tomorrowDate = new Date();
      tomorrowDate.setDate(tomorrowDate.getDate() + 1);
      const tomorrow = tomorrowDate.toISOString().split('T')[0];

      const tasks = db.find('tasks') || [];
      const currentNotifications = db.find('notifications') || [];

      // Case-insensitive check
      const alreadyNotifiedToday = (userId, tag) => {
        const lowerTag = tag.toLowerCase();
        return currentNotifications.some(n =>
          n.userId === userId &&
          n.message && n.message.toLowerCase().includes(lowerTag) &&
          n.createdAt && n.createdAt.startsWith(today)
        );
      };

      const sendNotif = (notifData) => {
        const notif = createNotification(notifData);
        currentNotifications.push(notif);
        return notif;
      };

      // 1. Task Reminders
      tasks.forEach(task => {
        if (task.status === 'COMPLETED' || task.status === 'CANCELLED' || !task.deadline) return;

        const assigneeIds = Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0
          ? task.assignedMemberIds
          : (task.assignedMemberId ? [task.assignedMemberId] : []);

        if (assigneeIds.length === 0) return;

        // Due today
        if (task.deadline === today) {
          assigneeIds.forEach(uId => {
            if (!alreadyNotifiedToday(uId, `due today: "${task.title}"`)) {
              sendNotif({
                userId: uId,
                title: 'Task Due Today',
                message: `⏰ Reminder: "${task.title}" is due today!`,
                type: 'TASK',
                priority: 'URGENT',
                linkUrl: '/tasks'
              });
            }
          });
        }
        // Due tomorrow
        else if (task.deadline === tomorrow) {
          assigneeIds.forEach(uId => {
            if (!alreadyNotifiedToday(uId, `due tomorrow: "${task.title}"`)) {
              sendNotif({
                userId: uId,
                title: 'Task Due Tomorrow',
                message: `⏳ Reminder: "${task.title}" is due tomorrow.`,
                type: 'TASK',
                priority: 'WARNING',
                linkUrl: '/tasks'
              });
            }
          });
        }
        // Overdue
        else if (task.deadline < today) {
          assigneeIds.forEach(uId => {
            if (!alreadyNotifiedToday(uId, `overdue: "${task.title}"`)) {
              sendNotif({
                userId: uId,
                title: 'Task Overdue',
                message: `🚨 Overdue: "${task.title}" was due on ${task.deadline}.`,
                type: 'TASK',
                priority: 'URGENT',
                linkUrl: '/tasks'
              });
            }
          });
        }
      });

      // 2. Communication Plan Reminders
      const comItems = db.find('communicationItems') || [];
      comItems.forEach(item => {
        if (item.status === 'PUBLISHED' || item.status === 'CANCELLED' || !item.publicationDate) return;

        if (item.publicationDate === today && item.responsiblePersonId) {
          if (!alreadyNotifiedToday(item.responsiblePersonId, `com action today: "${item.title}"`)) {
            sendNotif({
              userId: item.responsiblePersonId,
              title: 'Com Action Due Today',
              message: `📢 Com Action: "${item.title}" (${item.platform || item.channel}) is scheduled for today at ${item.publicationTime || '18:00'}`,
              type: 'COMMUNICATION',
              priority: 'URGENT',
              linkUrl: '/communication'
            });
          }
        }
      });
    } catch (err) {
      console.warn('Error running reminder service:', err);
    }
  }
}

export const reminderService = new ReminderService();
