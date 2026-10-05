import { db } from '../store/database.js';

export const dashboardController = {
  getSummary: (req, res) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    // Helper for date math
    const getOffsetDate = (offsetDays) => {
      const d = new Date(now);
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().split('T')[0];
    };

    const users = db.find('users', u => u.isActive);
    const departments = db.find('departments', d => !d.isArchived);
    const tasks = db.find('tasks');
    const events = db.find('events');
    const communicationItems = db.find('communicationItems');

    // Calculations
    const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const overdueTasks = activeTasks.filter(t => t.deadline < todayStr);
    const tasksDueToday = activeTasks.filter(t => t.deadline === todayStr);

    const endOfWeek = getOffsetDate(7);
    const tasksDueThisWeek = activeTasks.filter(t => t.deadline >= todayStr && t.deadline <= endOfWeek);

    const upcomingEvents = events.filter(e => e.date >= todayStr && e.status !== 'CANCELLED');
    
    // Check next event
    upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));
    const nextEvent = upcomingEvents[0] || null;
    let nextEventPrep = null;

    if (nextEvent) {
      const eventTasks = tasks.filter(t => t.eventId === nextEvent.id);
      const totalPrep = eventTasks.length;
      const completedPrep = eventTasks.filter(t => t.status === 'COMPLETED').length;
      const percent = totalPrep > 0 ? Math.round((completedPrep / totalPrep) * 100) : 0;
      nextEventPrep = {
        event: nextEvent,
        totalTasks: totalPrep,
        completedTasks: completedPrep,
        percent,
        tasks: eventTasks
      };
    }

    // Pending communication actions
    const pendingComms = communicationItems.filter(c => c.status !== 'PUBLISHED' && c.status !== 'CANCELLED');

    // Workload calculation (members with >= 3 active tasks are flagged as overloaded)
    const settings = db.data.settings || {};
    const threshold = settings.overloadThreshold || 3;
    const memberWorkload = users.map(user => {
      const userTasks = activeTasks.filter(t => t.assignedMemberId === user.id);
      const userOverdue = userTasks.filter(t => t.deadline < todayStr);
      const isOverloaded = userTasks.length >= threshold;
      return {
        user: { id: user.id, name: user.name, role: user.role, avatarUrl: user.avatarUrl, departmentId: user.departmentId },
        activeTasksCount: userTasks.length,
        overdueCount: userOverdue.length,
        isOverloaded
      };
    });

    const overloadedMembers = memberWorkload.filter(m => m.isOverloaded);

    // Department summaries
    const deptSummaries = departments.map(d => {
      const deptMembers = users.filter(u => u.departmentId === d.id);
      const deptTasks = tasks.filter(t => t.departmentId === d.id);
      const deptActive = deptTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const deptOverdue = deptActive.filter(t => t.deadline < todayStr);
      const deptLeader = users.find(u => u.id === d.leaderId) || null;
      return {
        id: d.id,
        name: d.name,
        color: d.color,
        icon: d.icon,
        leader: deptLeader ? { id: deptLeader.id, name: deptLeader.name, avatarUrl: deptLeader.avatarUrl } : null,
        memberCount: deptMembers.length,
        activeTasksCount: deptActive.length,
        overdueTasksCount: deptOverdue.length
      };
    });

    // Recent activity
    const recentActivity = (db.data.activityLogs || []).slice(0, 10);

    // Return the complete executive view
    res.json({
      success: true,
      data: {
        stats: {
          totalMembers: users.length,
          departmentsCount: departments.length,
          activeTasks: activeTasks.length,
          completedTasks: completedTasks.length,
          overdueTasks: overdueTasks.length,
          upcomingEvents: upcomingEvents.length,
          tasksDueThisWeek: tasksDueThisWeek.length,
          tasksDueToday: tasksDueToday.length
        },
        radar: {
          tasksDueTodayCount: tasksDueToday.length,
          overdueTasksCount: overdueTasks.length,
          daysUntilNextEvent: nextEvent ? Math.ceil((new Date(nextEvent.date) - now) / (1000 * 60 * 60 * 24)) : null,
          pendingCommunicationCount: pendingComms.length,
          overloadedMembersCount: overloadedMembers.length
        },
        nextEventPrep,
        departmentBreakdown: deptSummaries,
        overloadedMembers,
        recentActivity
      }
    });
  }
};
