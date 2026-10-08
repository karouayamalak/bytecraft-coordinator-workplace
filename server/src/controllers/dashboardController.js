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

    // Enrich active tasks with assignee and department for attention display
    const enrichTask = (t) => {
      const assignee = users.find(u => u.id === t.assignedMemberId);
      const dept = departments.find(d => d.id === t.departmentId);
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        deadline: t.deadline,
        assignee: assignee ? { id: assignee.id, name: assignee.name, avatarUrl: assignee.avatarUrl } : null,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null
      };
    };

    const overdueList = overdueTasks.map(enrichTask);
    const dueTodayList = tasksDueToday.map(enrichTask);
    const dueSoonList = activeTasks.filter(t => t.deadline > todayStr && t.deadline <= getOffsetDate(3)).map(enrichTask);
    const blockedList = activeTasks.filter(t => t.status === 'BLOCKED').map(enrichTask);

    // Enriched upcoming communication items (next 8 scheduled publications)
    const sortedComms = [...communicationItems]
      .filter(c => c.status !== 'CANCELLED')
      .map(c => {
        const responsible = users.find(u => u.id === c.responsiblePersonId);
        const ev = events.find(e => e.id === c.eventId);
        return {
          id: c.id,
          title: c.title,
          contentType: c.contentType || 'POST',
          platform: c.platform || c.channel || 'Instagram',
          publicationDate: c.publicationDate,
          publicationTime: c.publicationTime || '18:00',
          status: c.status || 'PLANNED',
          responsiblePerson: responsible ? { id: responsible.id, name: responsible.name, avatarUrl: responsible.avatarUrl } : null,
          eventName: ev ? ev.name : null
        };
      })
      .sort((a, b) => {
        const dateA = `${a.publicationDate}T${a.publicationTime || '00:00'}`;
        const dateB = `${b.publicationDate}T${b.publicationTime || '00:00'}`;
        return dateA.localeCompare(dateB);
      })
      .slice(0, 8);

    // Enriched upcoming events list
    const enrichedEvents = upcomingEvents.slice(0, 5).map(e => {
      const dept = departments.find(d => d.id === e.responsibleDepartmentId);
      const organizer = users.find(u => u.id === e.organizerId);
      const eventTasks = tasks.filter(t => t.eventId === e.id);
      const completed = eventTasks.filter(t => t.status === 'COMPLETED').length;
      const progressPercent = eventTasks.length > 0 ? Math.round((completed / eventTasks.length) * 100) : (e.status === 'COMPLETED' ? 100 : 0);
      return {
        id: e.id,
        name: e.name,
        date: e.date,
        startTime: e.startTime || '14:00',
        endTime: e.endTime || '17:00',
        location: e.location || 'ESTIN Campus',
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
        organizer: organizer ? { id: organizer.id, name: organizer.name, avatarUrl: organizer.avatarUrl } : null,
        progressPercent,
        tasksCount: eventTasks.length,
        completedTasksCount: completed
      };
    });

    // User-specific scoping (for Department Managers)
    const userId = req.user?.id;
    const userDeptId = req.user?.departmentId;
    const isAssigned = (t, uId) => {
      if (t.assignedMemberId === uId) return true;
      if (Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.includes(uId)) return true;
      return false;
    };
    const isDeptMatch = (t, dId) => {
      if (t.departmentId === dId) return true;
      if (Array.isArray(t.departmentIds) && t.departmentIds.includes(dId)) return true;
      return false;
    };

    let managerView = null;
    if (userDeptId) {
      const userDept = departments.find(d => d.id === userDeptId);
      const deptManagers = users.filter(u => u.departmentId === userDeptId);
      const myActive = activeTasks.filter(t => isAssigned(t, userId));
      const myCompleted = completedTasks.filter(t => isAssigned(t, userId));
      const myOverdue = overdueTasks.filter(t => isAssigned(t, userId));

      const deptActive = activeTasks.filter(t => isDeptMatch(t, userDeptId));
      const deptCompleted = completedTasks.filter(t => isDeptMatch(t, userDeptId));
      const deptOverdue = overdueTasks.filter(t => isDeptMatch(t, userDeptId));

      const deptDeadlines = deptActive
        .slice()
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .map(enrichTask);

      const myDeadlines = myActive
        .slice()
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .map(enrichTask);

      managerView = {
        department: userDept ? { id: userDept.id, name: userDept.name, color: userDept.color, description: userDept.description } : null,
        managers: deptManagers.map(m => ({ id: m.id, name: m.name, position: m.position, avatarUrl: m.avatarUrl, email: m.email })),
        personal: {
          activeCount: myActive.length,
          completedCount: myCompleted.length,
          overdueCount: myOverdue.length,
          upcomingDeadlines: myDeadlines.slice(0, 5)
        },
        departmentStats: {
          activeCount: deptActive.length,
          completedCount: deptCompleted.length,
          overdueCount: deptOverdue.length,
          upcomingDeadlines: deptDeadlines.slice(0, 8)
        }
      };
    }

    // Return the complete executive view answering 'What needs my attention right now?'
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
          tasksDueToday: tasksDueToday.length,
          upcomingPublications: pendingComms.length
        },
        managerView,
        attention: {
          overdueTasks: overdueList,
          tasksDueToday: dueTodayList,
          tasksDueSoon: dueSoonList,
          blockedTasks: blockedList,
          upcomingEvents: enrichedEvents.slice(0, 3),
          upcomingPublications: sortedComms.slice(0, 5)
        },
        upcomingEvents: enrichedEvents,
        upcomingCommunication: sortedComms,
        nextEventPrep,
        departmentBreakdown: deptSummaries,
        overloadedMembers,
        recentActivity
      }
    });
  }
};
