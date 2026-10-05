import { db } from '../store/database.js';
import { logActivity } from '../services/auditService.js';

export const deptController = {
  getAll: (req, res) => {
    const { includeArchived } = req.query;
    let departments = db.find('departments');
    if (!includeArchived || includeArchived === 'false') {
      departments = departments.filter(d => !d.isArchived);
    }

    const users = db.find('users');
    const tasks = db.find('tasks');
    const todayStr = new Date().toISOString().split('T')[0];

    const enriched = departments.map(d => {
      const deptMembers = users.filter(u => u.departmentId === d.id && u.isActive);
      const deptTasks = tasks.filter(t => t.departmentId === d.id);
      const activeTasks = deptTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const completedTasks = deptTasks.filter(t => t.status === 'COMPLETED');
      const overdueTasks = activeTasks.filter(t => t.deadline < todayStr);
      const leader = users.find(u => u.id === d.leaderId);

      return {
        ...d,
        memberCount: deptMembers.length,
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        overdueTasksCount: overdueTasks.length,
        leader: leader ? { id: leader.id, name: leader.name, avatarUrl: leader.avatarUrl, email: leader.email } : null
      };
    });

    res.json({ success: true, data: enriched });
  },

  getById: (req, res) => {
    const { id } = req.params;
    const department = db.findById('departments', id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const users = db.find('users', u => u.departmentId === id && u.isActive);
    const tasks = db.find('tasks', t => t.departmentId === id);
    const events = db.find('events', e => e.responsibleDepartmentId === id);
    const leader = db.findById('users', department.leaderId);
    const responsibilities = db.find('responsibilities', r => r.departmentId === id);

    const safeUsers = users.map(u => {
      const safe = { ...u };
      delete safe.passwordHash;
      const userTasks = tasks.filter(t => t.assignedMemberId === u.id);
      const userActive = userTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      return {
        ...safe,
        activeTasksCount: userActive.length,
        isOverloaded: userActive.length >= 4
      };
    });

    res.json({
      success: true,
      data: {
        department,
        leader: leader ? { id: leader.id, name: leader.name, email: leader.email, avatarUrl: leader.avatarUrl } : null,
        members: safeUsers,
        tasks,
        events,
        responsibilities
      }
    });
  },

  create: (req, res, next) => {
    try {
      const { name, description, leaderId, color, icon } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: 'Department name is required' });
      }

      const newDept = db.insert('departments', {
        name,
        description: description || '',
        leaderId: leaderId || null,
        color: color || '#00F0FF',
        icon: icon || 'Briefcase',
        isArchived: false
      });

      if (leaderId) {
        db.update('users', leaderId, { departmentId: newDept.id, role: 'DEPARTMENT_LEADER' });
      }

      logActivity({
        actor: req.user,
        action: 'DEPARTMENT_CREATED',
        entityType: 'DEPARTMENT',
        entityId: newDept.id,
        details: `Created department "${name}"`
      });

      res.status(201).json({ success: true, data: newDept });
    } catch (err) {
      next(err);
    }
  },

  update: (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, leaderId, color, icon, isArchived } = req.body;

      const dept = db.findById('departments', id);
      if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

      const updates = {};
      if (name) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (leaderId !== undefined) {
        updates.leaderId = leaderId;
        if (leaderId) {
          db.update('users', leaderId, { departmentId: id, role: 'DEPARTMENT_LEADER' });
        }
      }
      if (color) updates.color = color;
      if (icon) updates.icon = icon;
      if (typeof isArchived === 'boolean') updates.isArchived = isArchived;

      const updated = db.update('departments', id, updates);

      logActivity({
        actor: req.user,
        action: 'DEPARTMENT_UPDATED',
        entityType: 'DEPARTMENT',
        entityId: id,
        details: `Updated department "${updated.name}"`
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  archive: (req, res) => {
    const { id } = req.params;
    const dept = db.findById('departments', id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const newStatus = !dept.isArchived;
    const updated = db.update('departments', id, { isArchived: newStatus });

    logActivity({
      actor: req.user,
      action: newStatus ? 'DEPARTMENT_ARCHIVED' : 'DEPARTMENT_RESTORED',
      entityType: 'DEPARTMENT',
      entityId: id,
      details: `${newStatus ? 'Archived' : 'Restored'} department "${dept.name}"`
    });

    res.json({ success: true, data: updated });
  }
};
