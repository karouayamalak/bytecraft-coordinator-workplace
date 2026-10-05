import bcrypt from 'bcryptjs';
import { db } from '../store/database.js';
import { logActivity, createNotification } from '../services/auditService.js';

export const userController = {
  getAll: (req, res) => {
    const { departmentId, role, search, status, position } = req.query;
    let users = db.find('users');

    if (departmentId) {
      users = users.filter(u => u.departmentId === departmentId);
    }
    if (role) {
      users = users.filter(u => u.role === role);
    }
    if (position) {
      users = users.filter(u => (u.position || '').toLowerCase().includes(position.toLowerCase()));
    }
    if (status === 'active' || status === 'ACTIVE') {
      users = users.filter(u => u.isActive);
    } else if (status === 'inactive' || status === 'INACTIVE') {
      users = users.filter(u => !u.isActive);
    }
    if (search) {
      const q = search.toLowerCase().trim();
      users = users.filter(u => {
        const nameMatch = (u.name || '').toLowerCase().includes(q);
        const emailMatch = (u.email || '').toLowerCase().includes(q);
        const phoneMatch = (u.phone || '').toLowerCase().includes(q) || (u.whatsapp || '').toLowerCase().includes(q);
        const posMatch = (u.position || '').toLowerCase().includes(q);
        return nameMatch || emailMatch || phoneMatch || posMatch;
      });
    }

    const tasks = db.find('tasks');
    const departments = db.find('departments');
    const responsibilities = db.find('responsibilities');
    const todayStr = new Date().toISOString().split('T')[0];

    // Enrich users with active & completed task counts, current task, next deadline, and department details
    const enriched = users.map(u => {
      const safe = { ...u };
      delete safe.passwordHash;
      const userTasks = tasks.filter(t => t.assignedMemberId === u.id);
      const activeTasks = userTasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
      const completedTasks = userTasks.filter(t => t.status === 'COMPLETED');
      const dept = departments.find(d => d.id === u.departmentId);
      const userResp = responsibilities.filter(r => r.memberId === u.id);

      // Sort active tasks by deadline ascending to find current task & next deadline
      activeTasks.sort((a, b) => {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
      const currentTask = activeTasks[0] || null;
      const nextDeadline = currentTask?.deadline || null;

      const positionName = u.position || (u.role === 'COORDINATOR' ? 'Club Coordinator' : 'Department Manager');

      return {
        ...safe,
        position: positionName,
        whatsapp: u.whatsapp || u.phone || '',
        socialLinks: u.socialLinks || {},
        status: u.isActive ? 'ACTIVE' : 'INACTIVE',
        departmentName: dept ? dept.name : 'Unassigned',
        departmentColor: dept ? dept.color : '#6B7280',
        activeTasksCount: activeTasks.length,
        completedTasksCount: completedTasks.length,
        responsibilitiesCount: userResp.length,
        ongoingResponsibilities: userResp.map(r => r.title),
        currentTask: currentTask ? { id: currentTask.id, title: currentTask.title, deadline: currentTask.deadline, priority: currentTask.priority, status: currentTask.status } : null,
        nextDeadline,
        isOverloaded: activeTasks.length >= 4
      };
    });

    res.json({ success: true, data: enriched });
  },

  getById: (req, res) => {
    const user = db.findById('users', req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }
    const safe = { ...user };
    delete safe.passwordHash;

    const department = safe.departmentId ? db.findById('departments', safe.departmentId) : null;
    const allTasks = db.find('tasks', t => t.assignedMemberId === user.id);
    const responsibilities = db.find('responsibilities', r => r.memberId === user.id);
    const events = db.find('events', e => (e.responsibleMemberIds || []).includes(user.id) || e.organizerId === user.id);
    const activity = db.find('activityLogs', a => a.actorId === user.id).slice(0, 15);
    const comItems = db.find('communicationItems', c => c.responsiblePersonId === user.id);

    // Enforce task enrichment with event details
    const allEvents = db.find('events');
    const enrichedTasks = allTasks.map(t => {
      const ev = t.eventId ? allEvents.find(e => e.id === t.eventId) : null;
      return {
        ...t,
        eventName: ev ? ev.name : null
      };
    });

    // Sort tasks by deadline ascending
    enrichedTasks.sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });

    // Enforce communication items enrichment
    const enrichedComItems = comItems.map(ci => {
      const ev = ci.eventId ? allEvents.find(e => e.id === ci.eventId) : null;
      return {
        ...ci,
        contentType: ci.contentType || 'POST',
        platform: ci.platform || ci.channel || 'Instagram',
        publicationTime: ci.publicationTime || '18:00',
        eventName: ev ? ev.name : null
      };
    });
    enrichedComItems.sort((a, b) => (a.publicationDate || '').localeCompare(b.publicationDate || ''));

    const positionName = safe.position || (safe.role === 'COORDINATOR' ? 'Club Coordinator' : 'Department Manager');

    res.json({
      success: true,
      data: {
        user: {
          ...safe,
          position: positionName,
          whatsapp: safe.whatsapp || safe.phone || '',
          socialLinks: safe.socialLinks || {},
          status: safe.isActive ? 'ACTIVE' : 'INACTIVE'
        },
        department,
        tasks: enrichedTasks,
        responsibilities,
        events,
        communicationItems: enrichedComItems,
        activity
      }
    });
  },

  create: (req, res, next) => {
    try {
      const { name, email, role, departmentId, phone, whatsapp, position, avatarUrl, socialLinks, initialResponsibilities } = req.body;
      if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and email are required' });
      }

      const existing = db.findOne('users', u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        return res.status(400).json({ success: false, message: 'A member with this email already exists' });
      }

      const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`;
      const newUser = db.insert('users', {
        name,
        email: email.toLowerCase(),
        passwordHash: bcrypt.hashSync('bytecraft2026', 10),
        role: role || 'MEMBER',
        departmentId: departmentId || null,
        position: position || (role === 'COORDINATOR' ? 'Club Coordinator' : 'Department Manager'),
        phone: phone || '',
        whatsapp: whatsapp || phone || '',
        avatarUrl: defaultAvatar,
        socialLinks: socialLinks || {},
        joinedDate: new Date().toISOString().split('T')[0],
        isActive: true
      });

      if (Array.isArray(initialResponsibilities)) {
        initialResponsibilities.forEach(title => {
          if (title && title.trim()) {
            db.insert('responsibilities', {
              memberId: newUser.id,
              departmentId: newUser.departmentId,
              title: title.trim(),
              description: ''
            });
          }
        });
      }

      logActivity({
        actor: req.user,
        action: 'MEMBER_CREATED',
        entityType: 'USER',
        entityId: newUser.id,
        details: `Added new member ${name} (${role || 'MEMBER'})`
      });

      const safe = { ...newUser };
      delete safe.passwordHash;
      res.status(201).json({ success: true, data: safe });
    } catch (err) {
      next(err);
    }
  },

  update: (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, email, role, departmentId, phone, whatsapp, position, avatarUrl, socialLinks, isActive, status } = req.body;

      const user = db.findById('users', id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Member not found' });
      }

      const updates = {};
      if (name) updates.name = name;
      if (email) updates.email = email.toLowerCase();
      if (role) updates.role = role;
      if (departmentId !== undefined) updates.departmentId = departmentId;
      if (phone !== undefined) updates.phone = phone;
      if (whatsapp !== undefined) updates.whatsapp = whatsapp;
      if (position !== undefined) updates.position = position;
      if (avatarUrl) updates.avatarUrl = avatarUrl;
      if (socialLinks !== undefined) updates.socialLinks = socialLinks;

      if (typeof isActive === 'boolean') {
        updates.isActive = isActive;
      } else if (status !== undefined) {
        updates.isActive = status === 'ACTIVE' || status === 'active';
      }

      const updated = db.update('users', id, updates);
      const safe = { ...updated };
      delete safe.passwordHash;

      logActivity({
        actor: req.user,
        action: 'MEMBER_UPDATED',
        entityType: 'USER',
        entityId: id,
        details: `Updated details for member ${updated.name}`
      });

      res.json({ success: true, data: safe });
    } catch (err) {
      next(err);
    }
  },

  delete: (req, res) => {
    const { id } = req.params;
    const user = db.findById('users', id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Soft deactivate instead of hard delete to preserve history
    const updated = db.update('users', id, { isActive: false });

    logActivity({
      actor: req.user,
      action: 'MEMBER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      details: `Deactivated member account for ${user.name}`
    });

    res.json({ success: true, message: 'Member deactivated', data: updated });
  },

  // Responsibilities
  addResponsibility: (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    const user = db.findById('users', id);
    if (!user) return res.status(404).json({ success: false, message: 'Member not found' });

    const resp = db.insert('responsibilities', {
      memberId: id,
      departmentId: user.departmentId,
      title,
      description: description || ''
    });

    logActivity({
      actor: req.user,
      action: 'RESPONSIBILITY_ADDED',
      entityType: 'RESPONSIBILITY',
      entityId: resp.id,
      details: `Assigned ongoing responsibility "${title}" to ${user.name}`
    });

    createNotification({
      userId: id,
      title: 'New Responsibility Assigned',
      message: `You were assigned responsibility: "${title}"`,
      type: 'TASK',
      priority: 'INFO',
      linkUrl: `/team/${id}`
    });

    res.status(201).json({ success: true, data: resp });
  },

  deleteResponsibility: (req, res) => {
    const { respId } = req.params;
    db.delete('responsibilities', respId);
    res.json({ success: true, message: 'Responsibility removed' });
  }
};
