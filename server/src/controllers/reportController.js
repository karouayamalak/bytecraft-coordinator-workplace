import { db } from '../store/database.js';

export const reportController = {
  getAnalytics: (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];

    const tasks = db.find('tasks');
    const departments = db.find('departments');
    const events = db.find('events');
    const communicationItems = db.find('communicationItems');

    // 1. Task Performance
    const taskStatusCounts = {
      COMPLETED: tasks.filter(t => t.status === 'COMPLETED').length,
      IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
      BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
      REVIEW: tasks.filter(t => t.status === 'REVIEW').length,
      TODO: tasks.filter(t => t.status === 'TODO').length,
      CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
      OVERDUE: tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr).length
    };

    // 2. Department Performance comparison
    const deptPerformance = departments.map(d => {
      const deptTasks = tasks.filter(t => t.departmentId === d.id);
      const active = deptTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const completed = deptTasks.filter(t => t.status === 'COMPLETED');
      const overdue = active.filter(t => t.deadline < todayStr);
      const completionRate = deptTasks.length > 0 ? Math.round((completed.length / deptTasks.length) * 100) : 0;

      return {
        id: d.id,
        name: d.name,
        color: d.color,
        totalTasks: deptTasks.length,
        activeTasks: active.length,
        completedTasks: completed.length,
        overdueTasks: overdue.length,
        completionRate
      };
    });

    // 3. Event Preparation Tracking
    const eventReadiness = events.map(e => {
      const evTasks = tasks.filter(t => t.eventId === e.id);
      const completed = evTasks.filter(t => t.status === 'COMPLETED');
      const overdue = evTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr);
      const percent = evTasks.length > 0 ? Math.round((completed.length / evTasks.length) * 100) : (e.status === 'COMPLETED' ? 100 : 0);

      return {
        id: e.id,
        name: e.name,
        date: e.date,
        eventType: e.eventType,
        totalTasks: evTasks.length,
        completedTasks: completed.length,
        remainingTasks: evTasks.length - completed.length,
        overdueTasks: overdue.length,
        percent
      };
    });

    // 4. Communication Performance
    const communicationCounts = {
      PLANNED: communicationItems.filter(c => c.status === 'PLANNED').length,
      IN_PROGRESS: communicationItems.filter(c => c.status === 'IN_PROGRESS').length,
      READY: communicationItems.filter(c => c.status === 'READY').length,
      PUBLISHED: communicationItems.filter(c => c.status === 'PUBLISHED').length,
      OVERDUE: communicationItems.filter(c => c.status !== 'PUBLISHED' && c.status !== 'CANCELLED' && c.publicationDate < todayStr).length
    };

    res.json({
      success: true,
      data: {
        taskStatusCounts,
        deptPerformance,
        eventReadiness,
        communicationCounts
      }
    });
  },

  getWorkload: (req, res) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const tasks = db.find('tasks');
    const users = db.find('users', u => u.isActive);
    const departments = db.find('departments');

    const overloadThreshold = 4;

    const members = users.map(u => {
      const userTasks = tasks.filter(t => t.assignedMemberId === u.id);
      const active = userTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const overdue = active.filter(t => t.deadline && t.deadline < todayStr);
      const completed = userTasks.filter(t => t.status === 'COMPLETED');
      const safeUser = { ...u };
      delete safeUser.passwordHash;
      return {
        user: safeUser,
        activeTasksCount: active.length,
        overdueCount: overdue.length,
        completedCount: completed.length,
        isOverloaded: active.length >= overloadThreshold
      };
    });

    const depts = departments.map(d => {
      const deptTasks = tasks.filter(t => t.departmentId === d.id);
      const active = deptTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const overdue = active.filter(t => t.deadline && t.deadline < todayStr);
      const completed = deptTasks.filter(t => t.status === 'COMPLETED');
      const members = users.filter(u => u.departmentId === d.id);
      return {
        dept: d,
        activeTasks: active.length,
        overdueTasks: overdue.length,
        completedTasks: completed.length,
        memberCount: members.length
      };
    });

    res.json({
      success: true,
      data: {
        members,
        departments: depts,
        thresholds: { overloadedAt: overloadThreshold }
      }
    });
  }
};
