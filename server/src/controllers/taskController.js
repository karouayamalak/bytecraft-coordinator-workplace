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

    // Role-based scoping: MANAGER/DEPARTMENT_LEADER see only their department tasks
    if (role === 'MANAGER' || role === 'DEPARTMENT_LEADER') {
      if (view === 'mine') {
        // 'mine' mode: only tasks assigned to this specific user
        tasks = tasks.filter(t => t.assignedMemberId === userId);
      } else {
        // Default: show their department tasks
        tasks = tasks.filter(t => t.departmentId === userDeptId);
      }
    } else if (role !== 'COORDINATOR') {
      // Any other role: only see own assigned tasks
      tasks = tasks.filter(t => t.assignedMemberId === userId);
    }

    // Additional optional filters (only applied if they don't conflict with role scope)
    if (departmentId && (role === 'COORDINATOR')) {
      tasks = tasks.filter(t => t.departmentId === departmentId);
    }
    if (assignedMemberId) {
      tasks = tasks.filter(t => t.assignedMemberId === assignedMemberId);
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
      const assignee = users.find(u => u.id === t.assignedMemberId);
      const creator = users.find(u => u.id === t.createdById);
      const dept = departments.find(d => d.id === t.departmentId);
      const event = t.eventId ? events.find(e => e.id === t.eventId) : null;
      const isPastDue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr;
      const isDueToday = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline === todayStr;

      return {
        ...t,
        assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatarUrl: assignee.avatarUrl } : null,
        creator: creator ? { id: creator.id, name: creator.name } : null,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
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

    // Role-based scoping for deadlines
    if (role === 'MANAGER' || role === 'DEPARTMENT_LEADER') {
      tasks = tasks.filter(t => t.departmentId === userDeptId);
    } else if (role !== 'COORDINATOR') {
      tasks = tasks.filter(t => t.assignedMemberId === userId);
    }

    const enrich = (t) => {
      const assignee = users.find(u => u.id === t.assignedMemberId);
      const dept = departments.find(d => d.id === t.departmentId);
      return {
        ...t,
        assignee: assignee ? { id: assignee.id, name: assignee.name, avatarUrl: assignee.avatarUrl } : null,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null
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
    const assignee = db.findById('users', task.assignedMemberId);
    const creator = db.findById('users', task.createdById);
    const dept = db.findById('departments', task.departmentId);
    const event = task.eventId ? db.findById('events', task.eventId) : null;

    res.json({
      success: true,
      data: {
        ...task,
        assignee: assignee ? { id: assignee.id, name: assignee.name, email: assignee.email, avatarUrl: assignee.avatarUrl } : null,
        creator: creator ? { id: creator.id, name: creator.name } : null,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
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
        assignedMemberId,
        eventId,
        priority,
        status,
        startDate,
        deadline,
        notes,
        attachments
      } = req.body;

      if (!title || !departmentId || !deadline) {
        return res.status(400).json({ success: false, message: 'Title, department, and deadline are required' });
      }

      // Permission check: MANAGER/DEPARTMENT_LEADER can only create tasks for their own department
      if ((req.user.role === 'DEPARTMENT_LEADER' || req.user.role === 'MANAGER') && req.user.departmentId !== departmentId) {
        return res.status(403).json({ success: false, message: 'You can only create tasks within your own department' });
      }

      const newTask = db.insert('tasks', {
        title,
        description: description || '',
        departmentId,
        assignedMemberId: assignedMemberId || null,
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

      if (assignedMemberId) {
        createNotification({
          userId: assignedMemberId,
          title: 'New Task Assigned',
          message: `You were assigned: "${title}" (Deadline: ${deadline})`,
          type: 'TASK',
          priority: priority === 'URGENT' ? 'URGENT' : 'INFO',
          linkUrl: '/tasks'
        });
      }

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

      // Role check: MANAGER sees their dept; non-coordinator non-manager can only update own tasks
      const canEditFull = req.user.role === 'COORDINATOR' || req.user.role === 'DEPARTMENT_LEADER' || req.user.role === 'MANAGER';
      if (!canEditFull && existing.assignedMemberId !== req.user.id) {
        return res.status(403).json({ success: false, message: 'You can only update tasks assigned to you' });
      }
      // MANAGER/DEPARTMENT_LEADER: must belong to same department
      if ((req.user.role === 'MANAGER' || req.user.role === 'DEPARTMENT_LEADER') && existing.departmentId !== req.user.departmentId) {
        return res.status(403).json({ success: false, message: 'You can only update tasks in your department' });
      }

      const {
        title,
        description,
        departmentId,
        assignedMemberId,
        eventId,
        priority,
        status,
        startDate,
        deadline,
        progressPercent,
        notes,
        attachments
      } = req.body;

      // Enforce: Non-coordinators (managers) can check/complete ONLY the tasks assigned to them
      if (req.user.role !== 'COORDINATOR') {
        if ((status !== undefined || progressPercent !== undefined) && existing.assignedMemberId !== req.user.id) {
          return res.status(403).json({ success: false, message: 'You can only check or complete tasks assigned to you' });
        }
      }

      const updates = {};
      if (req.user.role === 'COORDINATOR' || req.user.role === 'DEPARTMENT_LEADER' || req.user.role === 'MANAGER') {
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (departmentId !== undefined) updates.departmentId = departmentId;
        if (assignedMemberId !== undefined) updates.assignedMemberId = assignedMemberId;
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
