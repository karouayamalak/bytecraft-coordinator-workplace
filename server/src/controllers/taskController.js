import { db } from '../store/database.js';
import { logActivity, createNotification } from '../services/auditService.js';
import { wsService } from '../services/wsService.js';

export const taskController = {
  getAll: (req, res) => {
    const {
      departmentId,
      assignedMemberId,
      status,
      priority,
      eventId,
      isOverdue,
      search,
      view
    } = req.query;

    let tasks = db.find('tasks');
    const todayStr = new Date().toISOString().split('T')[0];
    const { role, departmentId: userDeptId, id: userId } = req.user;

    // Board roles: full access to all tasks across all departments
    const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
    const isCoordinator = BOARD_ROLES.includes(role);

    // Helpers to check multi-assignee and cross-department
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

    // Role-based scoping:
    if (role === 'MANAGER' || role === 'DEPARTMENT_LEADER') {
      if (view === 'mine') {
        // 'mine' mode: strictly tasks specifically assigned to this manager
        tasks = tasks.filter(t => isAssigned(t, userId));
      } else {
        // Department mode: all tasks belonging to their department OR assigned to this manager (cross-department)
        tasks = tasks.filter(t => isDeptMatch(t, userDeptId) || isAssigned(t, userId));
      }
    } else if (!isCoordinator) {
      // Regular members: only see own assigned tasks
      tasks = tasks.filter(t => isAssigned(t, userId));
    }

    // Additional optional filters
    if (departmentId && (isCoordinator || departmentId === userDeptId)) {
      tasks = tasks.filter(t => isDeptMatch(t, departmentId));
    }
    if (assignedMemberId) {
      tasks = tasks.filter(t => isAssigned(t, assignedMemberId));
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    if (priority) {
      tasks = tasks.filter(t => t.priority === priority);
    }
    if (eventId) {
      tasks = tasks.filter(t => t.eventId === eventId);
    }
    if (isOverdue === 'true') {
      tasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr);
    }
    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    const users = db.find('users');
    const departments = db.find('departments');
    const events = db.find('events');

    const enriched = tasks.map(t => {
      const assigneeIds = Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.length > 0
        ? t.assignedMemberIds
        : (t.assignedMemberId ? [t.assignedMemberId] : []);
      const deptIds = Array.isArray(t.departmentIds) && t.departmentIds.length > 0
        ? t.departmentIds
        : (t.departmentId ? [t.departmentId] : []);

      const assignees = users.filter(u => assigneeIds.includes(u.id)).map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarUrl: u.avatarUrl
      }));
      const deptList = departments.filter(d => deptIds.includes(d.id)).map(d => ({
        id: d.id,
        name: d.name,
        color: d.color
      }));

      const primaryAssignee = assignees[0] || (t.assignedMemberId ? users.find(u => u.id === t.assignedMemberId) : null);
      const creator = users.find(u => u.id === t.createdById);
      const primaryDept = deptList[0] || (t.departmentId ? departments.find(d => d.id === t.departmentId) : null);
      const event = t.eventId ? events.find(e => e.id === t.eventId) : null;
      const isPastDue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr;
      const isDueToday = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline === todayStr;

      return {
        ...t,
        assignee: primaryAssignee ? { id: primaryAssignee.id, name: primaryAssignee.name, email: primaryAssignee.email, avatarUrl: primaryAssignee.avatarUrl } : null,
        assignees,
        creator: creator ? { id: creator.id, name: creator.name } : null,
        department: primaryDept ? { id: primaryDept.id, name: primaryDept.name, color: primaryDept.color } : null,
        departments: deptList,
        event: event ? { id: event.id, name: event.name, date: event.date } : null,
        isPastDue,
        isDueToday
      };
    });

    res.json({ success: true, data: enriched });
  },

  getDeadlines: (req, res) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const { role, departmentId: userDeptId, id: userId } = req.user;
    const { view, departmentId } = req.query;

    const getOffsetDate = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    const tomorrowStr = getOffsetDate(1);
    const endOfWeekStr = getOffsetDate(7);
    const endOfNextWeekStr = getOffsetDate(14);

    let tasks = db.find('tasks');
    const users = db.find('users');
    const departments = db.find('departments');

    const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
    const isCoordinator = BOARD_ROLES.includes(role);

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

    // Role-based scoping for deadlines
    if (role === 'MANAGER' || role === 'DEPARTMENT_LEADER') {
      if (view === 'mine') {
        // Only deadlines assigned specifically to this manager
        tasks = tasks.filter(t => isAssigned(t, userId));
      } else {
        // Department deadlines (all tasks belonging to this department or assigned to this manager)
        tasks = tasks.filter(t => isDeptMatch(t, userDeptId) || isAssigned(t, userId));
      }
    } else if (!isCoordinator) {
      tasks = tasks.filter(t => isAssigned(t, userId));
    }

    if (departmentId && (isCoordinator || departmentId === userDeptId)) {
      tasks = tasks.filter(t => isDeptMatch(t, departmentId));
    }

    const enrich = (t) => {
      const assigneeIds = Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.length > 0
        ? t.assignedMemberIds
        : (t.assignedMemberId ? [t.assignedMemberId] : []);
      const deptIds = Array.isArray(t.departmentIds) && t.departmentIds.length > 0
        ? t.departmentIds
        : (t.departmentId ? [t.departmentId] : []);

      const assignees = users.filter(u => assigneeIds.includes(u.id)).map(u => ({
        id: u.id,
        name: u.name,
        avatarUrl: u.avatarUrl
      }));
      const deptList = departments.filter(d => deptIds.includes(d.id)).map(d => ({
        id: d.id,
        name: d.name,
        color: d.color
      }));

      const primaryAssignee = assignees[0] || (t.assignedMemberId ? users.find(u => u.id === t.assignedMemberId) : null);
      const primaryDept = deptList[0] || (t.departmentId ? departments.find(d => d.id === t.departmentId) : null);

      return {
        ...t,
        assignee: primaryAssignee ? { id: primaryAssignee.id, name: primaryAssignee.name, avatarUrl: primaryAssignee.avatarUrl } : null,
        assignees,
        department: primaryDept ? { id: primaryDept.id, name: primaryDept.name, color: primaryDept.color } : null,
        departments: deptList
      };
    };

    const active = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
    const completed = tasks.filter(t => t.status === 'COMPLETED').map(enrich);

    const overdue = active.filter(t => t.deadline < todayStr).map(enrich);
    const today = active.filter(t => t.deadline === todayStr).map(enrich);
    const tomorrow = active.filter(t => t.deadline === tomorrowStr).map(enrich);
    const thisWeek = active.filter(t => t.deadline > tomorrowStr && t.deadline <= endOfWeekStr).map(enrich);
    const nextWeek = active.filter(t => t.deadline > endOfWeekStr && t.deadline <= endOfNextWeekStr).map(enrich);

    res.json({
      success: true,
      data: {
        overdue,
        today,
        tomorrow,
        thisWeek,
        nextWeek,
        completed
      }
    });
  },

  getById: (req, res) => {
    const task = db.findById('tasks', req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    const users = db.find('users');
    const departments = db.find('departments');

    const assigneeIds = Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0
      ? task.assignedMemberIds
      : (task.assignedMemberId ? [task.assignedMemberId] : []);
    const deptIds = Array.isArray(task.departmentIds) && task.departmentIds.length > 0
      ? task.departmentIds
      : (task.departmentId ? [task.departmentId] : []);

    const assignees = users.filter(u => assigneeIds.includes(u.id)).map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarUrl: u.avatarUrl
    }));
    const deptList = departments.filter(d => deptIds.includes(d.id)).map(d => ({
      id: d.id,
      name: d.name,
      color: d.color
    }));

    const primaryAssignee = assignees[0] || (task.assignedMemberId ? users.find(u => u.id === task.assignedMemberId) : null);
    const creator = users.find(u => u.id === task.createdById);
    const primaryDept = deptList[0] || (task.departmentId ? departments.find(d => d.id === task.departmentId) : null);
    const event = task.eventId ? db.findById('events', task.eventId) : null;

    res.json({
      success: true,
      data: {
        ...task,
        assignee: primaryAssignee ? { id: primaryAssignee.id, name: primaryAssignee.name, email: primaryAssignee.email, avatarUrl: primaryAssignee.avatarUrl } : null,
        assignees,
        creator: creator ? { id: creator.id, name: creator.name } : null,
        department: primaryDept ? { id: primaryDept.id, name: primaryDept.name, color: primaryDept.color } : null,
        departments: deptList,
        event: event ? { id: event.id, name: event.name } : null
      }
    });
  },

  create: (req, res, next) => {
    try {
      const {
        title,
        description,
        departmentId,
        departmentIds: reqDeptIds,
        assignedMemberId,
        assignedMemberIds: reqMemberIds,
        eventId,
        priority,
        status,
        startDate,
        deadline,
        notes,
        attachments
      } = req.body;

      const departmentIds = Array.isArray(reqDeptIds) && reqDeptIds.length > 0
        ? reqDeptIds
        : (departmentId ? [departmentId] : []);
      const primaryDeptId = departmentIds[0] || departmentId;

      if (!title || !primaryDeptId || !deadline) {
        return res.status(400).json({ success: false, message: 'Title, department, and deadline are required' });
      }

      // Permission check: MANAGER/DEPARTMENT_LEADER can create tasks if their department is included
      const userDeptId = req.user.departmentId;
      if ((req.user.role === 'DEPARTMENT_LEADER' || req.user.role === 'MANAGER')) {
        const hasDeptAccess = departmentIds.includes(userDeptId) || primaryDeptId === userDeptId;
        if (!hasDeptAccess) {
          return res.status(403).json({ success: false, message: 'You can only create tasks within your own department' });
        }
      }

      const assignedMemberIds = Array.isArray(reqMemberIds) && reqMemberIds.length > 0
        ? reqMemberIds
        : (assignedMemberId ? [assignedMemberId] : []);
      const primaryAssigneeId = assignedMemberIds[0] || assignedMemberId || null;

      const newTask = db.insert('tasks', {
        title,
        description: description || '',
        departmentId: primaryDeptId,
        departmentIds: departmentIds.length > 0 ? departmentIds : [primaryDeptId],
        assignedMemberId: primaryAssigneeId,
        assignedMemberIds,
        createdById: req.user.id,
        eventId: eventId || null,
        priority: priority || 'MEDIUM',
        status: status || 'TODO',
        startDate: startDate || new Date().toISOString().split('T')[0],
        deadline,
        progressPercent: status === 'COMPLETED' ? 100 : 0,
        notes: notes || '',
        attachments: attachments || []
      });

      logActivity({
        actor: req.user,
        action: 'TASK_CREATED',
        entityType: 'TASK',
        entityId: newTask.id,
        details: `Created task "${title}" (Due: ${deadline})`
      });

      assignedMemberIds.forEach(mId => {
        createNotification({
          userId: mId,
          title: 'New Task Assigned',
          message: `You were assigned: "${title}" (Deadline: ${deadline})`,
          type: 'TASK',
          priority: priority === 'URGENT' ? 'URGENT' : 'INFO',
          linkUrl: '/tasks'
        });
      });

      wsService.broadcast('TASK_CREATED', newTask);
      res.status(201).json({ success: true, data: newTask });
    } catch (err) {
      next(err);
    }
  },

  update: (req, res, next) => {
    try {
      const { id } = req.params;
      const existing = db.findById('tasks', id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
      const isBoard = BOARD_ROLES.includes(req.user.role);

      const existingAssigneeIds = Array.isArray(existing.assignedMemberIds) && existing.assignedMemberIds.length > 0
        ? existing.assignedMemberIds
        : (existing.assignedMemberId ? [existing.assignedMemberId] : []);
      const existingDeptIds = Array.isArray(existing.departmentIds) && existing.departmentIds.length > 0
        ? existing.departmentIds
        : (existing.departmentId ? [existing.departmentId] : []);

      const isUserAssigned = existingAssigneeIds.includes(req.user.id);
      const isUserInDept = req.user.departmentId && existingDeptIds.includes(req.user.departmentId);

      const canEditFull = isBoard || ((req.user.role === 'DEPARTMENT_LEADER' || req.user.role === 'MANAGER') && isUserInDept);
      if (!canEditFull && !isUserAssigned) {
        return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you or in your department' });
      }

      const {
        title,
        description,
        departmentId,
        departmentIds,
        assignedMemberId,
        assignedMemberIds,
        eventId,
        priority,
        status,
        startDate,
        deadline,
        progressPercent,
        notes,
        attachments
      } = req.body;

      // Enforce: Non-board managers can check/complete if they are assigned OR if they are manager of the task's department
      if (!isBoard && !isUserInDept && !isUserAssigned) {
        if (status !== undefined || progressPercent !== undefined) {
          return res.status(403).json({ success: false, message: 'You can only check or complete tasks assigned to you' });
        }
      }

      const updates = {};
      if (canEditFull) {
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (departmentId !== undefined) updates.departmentId = departmentId;
        if (departmentIds !== undefined) {
          updates.departmentIds = departmentIds;
          if (departmentIds.length > 0 && !departmentId) updates.departmentId = departmentIds[0];
        }
        if (assignedMemberId !== undefined) updates.assignedMemberId = assignedMemberId;
        if (assignedMemberIds !== undefined) {
          updates.assignedMemberIds = assignedMemberIds;
          if (assignedMemberIds.length > 0 && !assignedMemberId) updates.assignedMemberId = assignedMemberIds[0];
        }
        if (eventId !== undefined) updates.eventId = eventId;
        if (priority !== undefined) updates.priority = priority;
        if (startDate !== undefined) updates.startDate = startDate;
        if (deadline !== undefined) updates.deadline = deadline;
      }

      // Update status, progress, notes, attachments
      if (status !== undefined) {
        updates.status = status;
        if (status === 'COMPLETED' && (progressPercent === undefined || progressPercent < 100)) {
          updates.progressPercent = 100;
        }
      }
      if (progressPercent !== undefined) {
        updates.progressPercent = Number(progressPercent);
        if (updates.progressPercent === 100 && updates.status !== 'COMPLETED') {
          updates.status = 'COMPLETED';
        }
      }
      if (notes !== undefined) updates.notes = notes;
      if (attachments !== undefined) updates.attachments = attachments;

      const updated = db.update('tasks', id, updates);

      // Log activity
      let action = 'TASK_UPDATED';
      let details = `Updated task "${updated.title}"`;
      if (updates.status && updates.status !== existing.status) {
        if (updates.status === 'COMPLETED') {
          action = 'TASK_COMPLETED';
          details = `${req.user.name} marked task "${updated.title}" as COMPLETED`;
        } else {
          action = 'TASK_STATUS_CHANGED';
          details = `Status changed to ${updates.status} on "${updated.title}"`;
        }
      }

      logActivity({
        actor: req.user,
        action,
        entityType: 'TASK',
        entityId: id,
        details
      });

      // Notification if re-assigned or completed
      if (updates.assignedMemberId && updates.assignedMemberId !== existing.assignedMemberId) {
        createNotification({
          userId: updates.assignedMemberId,
          title: 'Task Assigned',
          message: `You were assigned: "${updated.title}"`,
          type: 'TASK',
          priority: 'INFO',
          linkUrl: '/tasks'
        });
      }

      if (action === 'TASK_COMPLETED' && existing.createdById && existing.createdById !== req.user.id) {
        createNotification({
          userId: existing.createdById,
          title: 'Task Finished',
          message: `${req.user.name} completed "${updated.title}"`,
          type: 'TASK',
          priority: 'INFO',
          linkUrl: '/tasks'
        });
      }

      wsService.broadcast('TASK_UPDATED', updated);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  delete: (req, res) => {
    const { id } = req.params;
    const task = db.findById('tasks', id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    db.delete('tasks', id);

    logActivity({
      actor: req.user,
      action: 'TASK_DELETED',
      entityType: 'TASK',
      entityId: id,
      details: `Deleted task "${task.title}"`
    });

    wsService.broadcast('TASK_DELETED', { id });
    res.json({ success: true, message: 'Task deleted successfully' });
  }
};
