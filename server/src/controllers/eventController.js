import { db } from '../store/database.js';
import { logActivity, createNotification } from '../services/auditService.js';
import { wsService } from '../services/wsService.js';

export const eventController = {
  getAll: (req, res) => {
    const { status, type, departmentId, search } = req.query;
    let events = db.find('events');

    if (status) events = events.filter(e => e.status === status);
    if (type) events = events.filter(e => e.eventType === type);
    if (departmentId) events = events.filter(e => e.responsibleDepartmentId === departmentId);
    if (search) {
      const q = search.toLowerCase();
      events = events.filter(e => e.name.toLowerCase().includes(q) || (e.description && e.description.toLowerCase().includes(q)));
    }

    const tasks = db.find('tasks');
    const departments = db.find('departments');
    const users = db.find('users');

    const enriched = events.map(e => {
      const dept = departments.find(d => d.id === e.responsibleDepartmentId);
      const organizer = users.find(u => u.id === e.organizerId);
      const eventTasks = tasks.filter(t => t.eventId === e.id);
      const completedTasks = eventTasks.filter(t => t.status === 'COMPLETED');
      const progressPercent = eventTasks.length > 0
        ? Math.round((completedTasks.length / eventTasks.length) * 100)
        : (e.status === 'COMPLETED' ? 100 : 0);

      return {
        ...e,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
        organizer: organizer ? { id: organizer.id, name: organizer.name, avatarUrl: organizer.avatarUrl } : null,
        tasksCount: eventTasks.length,
        completedTasksCount: completedTasks.length,
        progressPercent
      };
    });

    // Sort by date ascending
    enriched.sort((a, b) => a.date.localeCompare(b.date));
    res.json({ success: true, data: enriched });
  },

  getById: (req, res) => {
    const { id } = req.params;
    const event = db.findById('events', id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const departments = db.find('departments');
    const users = db.find('users');
    const tasks = db.find('tasks', t => t.eventId === id);
    const sections = db.find('agendaSections', s => s.eventId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
    const agendaItems = db.find('agendaItems', a => a.eventId === id).sort((a, b) => (a.order || 0) - (b.order || 0));
    const enrichedSections = sections.map(sec => ({
      ...sec,
      items: agendaItems.filter(item => item.sectionId === sec.id).sort((a, b) => (a.order || 0) - (b.order || 0))
    }));
    const unsectionedAgenda = agendaItems.filter(item => !item.sectionId);

    const comPlan = db.findOne('communicationPlans', c => c.eventId === id);
    const comItems = comPlan ? db.find('communicationItems', ci => ci.communicationPlanId === comPlan.id) : [];

    const dept = departments.find(d => d.id === event.responsibleDepartmentId);
    const organizer = users.find(u => u.id === event.organizerId);
    const responsibleMembers = (event.responsibleMemberIds || []).map(mid => {
      const u = users.find(user => user.id === mid);
      return u ? { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl, email: u.email } : null;
    }).filter(Boolean);

    const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
    const progressPercent = tasks.length > 0
      ? Math.round((completedTasks.length / tasks.length) * 100)
      : (event.status === 'COMPLETED' ? 100 : 0);

    const activity = db.find('activityLogs', a => a.entityId === id || tasks.some(t => t.id === a.entityId)).slice(0, 15);

    res.json({
      success: true,
      data: {
        event: {
          ...event,
          department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null,
          organizer: organizer ? { id: organizer.id, name: organizer.name, avatarUrl: organizer.avatarUrl } : null,
          responsibleMembers,
          progressPercent
        },
        agendaSections: enrichedSections,
        unsectionedAgenda,
        agenda: agendaItems,
        tasks,
        communicationPlan: comPlan ? { ...comPlan, items: comItems } : null,
        activity
      }
    });
  },

  create: (req, res, next) => {
    try {
      const {
        name,
        description,
        eventType,
        date,
        startTime,
        endTime,
        location,
        responsibleDepartmentId,
        responsibleMemberIds,
        expectedParticipants,
        notes,
        attachments,
        initialTasks
      } = req.body;

      if (!name || !date || !startTime) {
        return res.status(400).json({ success: false, message: 'Event name, date, and start time are required' });
      }

      const newEvent = db.insert('events', {
        name,
        description: description || '',
        eventType: eventType || 'WORKSHOP',
        date,
        startTime,
        endTime: endTime || '',
        location: location || 'ByteCraft Innovation Lab',
        organizerId: req.user.id,
        responsibleDepartmentId: responsibleDepartmentId || req.user.departmentId,
        responsibleMemberIds: responsibleMemberIds || [],
        status: 'PLANNED',
        expectedParticipants: expectedParticipants ? Number(expectedParticipants) : 50,
        notes: notes || '',
        attachments: attachments || []
      });

      // Also create an associated Communication Plan automatically
      const comPlan = db.insert('communicationPlans', {
        eventId: newEvent.id,
        title: `${name} — Communication Plan`,
        targetAudience: 'University Students and Tech Community',
        createdAt: new Date().toISOString()
      });

      // If initial preparation tasks were supplied, add them
      if (Array.isArray(initialTasks) && initialTasks.length > 0) {
        initialTasks.forEach(task => {
          if (task.title) {
            db.insert('tasks', {
              title: task.title,
              description: task.description || '',
              departmentId: task.departmentId || newEvent.responsibleDepartmentId,
              assignedMemberId: task.assignedMemberId || null,
              createdById: req.user.id,
              eventId: newEvent.id,
              priority: task.priority || 'HIGH',
              status: 'TODO',
              startDate: new Date().toISOString().split('T')[0],
              deadline: task.deadline || date,
              progressPercent: 0,
              notes: '',
              attachments: []
            });
          }
        });
      }

      logActivity({
        actor: req.user,
        action: 'EVENT_CREATED',
        entityType: 'EVENT',
        entityId: newEvent.id,
        details: `Created event "${name}" on ${date}`
      });

      wsService.broadcast('EVENT_CREATED', newEvent);
      res.status(201).json({ success: true, data: newEvent });
    } catch (err) {
      next(err);
    }
  },

  update: (req, res, next) => {
    try {
      const { id } = req.params;
      const event = db.findById('events', id);
      if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

      const updates = { ...req.body };
      delete updates.id;
      delete updates.createdAt;

      const updated = db.update('events', id, updates);

      logActivity({
        actor: req.user,
        action: 'EVENT_UPDATED',
        entityType: 'EVENT',
        entityId: id,
        details: `Updated details for event "${updated.name}"`
      });

      wsService.broadcast('EVENT_UPDATED', updated);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  delete: (req, res) => {
    const { id } = req.params;
    const event = db.findById('events', id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    db.delete('events', id);

    logActivity({
      actor: req.user,
      action: 'EVENT_DELETED',
      entityType: 'EVENT',
      entityId: id,
      details: `Deleted event "${event.name}"`
    });

    wsService.broadcast('EVENT_DELETED', { id });
    res.json({ success: true, message: 'Event deleted successfully' });
  },

  // --- AGENDA SECTION MANAGEMENT ---
  addSection: (req, res) => {
    const { id } = req.params;
    const { title, description, order, timing, startTime, endTime, duration, responsiblePerson, notes } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Section title is required' });
    }
    const currentSections = db.find('agendaSections', s => s.eventId === id);
    const secOrder = order ?? (currentSections.length + 1);

    const newSection = db.insert('agendaSections', {
      eventId: id,
      title,
      description: description || '',
      timing: timing || '',
      startTime: startTime || '',
      endTime: endTime || '',
      duration: duration || '',
      responsiblePerson: responsiblePerson || '',
      notes: notes || '',
      order: secOrder
    });

    logActivity({
      actor: req.user,
      action: 'AGENDA_SECTION_ADDED',
      entityType: 'EVENT',
      entityId: id,
      details: `Added agenda section "${title}"`
    });

    res.status(201).json({ success: true, data: { ...newSection, items: [] } });
  },

  updateSection: (req, res) => {
    const { sectionId } = req.params;
    const section = db.findById('agendaSections', sectionId);
    if (!section) return res.status(404).json({ success: false, message: 'Agenda section not found' });

    const updated = db.update('agendaSections', sectionId, req.body);
    res.json({ success: true, data: updated });
  },

  deleteSection: (req, res) => {
    const { sectionId } = req.params;
    const items = db.find('agendaItems', i => i.sectionId === sectionId);
    items.forEach(i => db.delete('agendaItems', i.id));
    db.delete('agendaSections', sectionId);
    res.json({ success: true, message: 'Section and items removed' });
  },

  reorderSections: (req, res) => {
    const { id } = req.params;
    const { sections } = req.body;
    if (Array.isArray(sections)) {
      sections.forEach(s => db.update('agendaSections', s.id, { order: s.order }));
    }
    const reordered = db.find('agendaSections', s => s.eventId === id).sort((a, b) => a.order - b.order);
    res.json({ success: true, data: reordered });
  },

  // --- AGENDA ITEM MANAGEMENT ---
  addAgendaItem: (req, res) => {
    const { id } = req.params;
    const { title, description, sectionId, startTime, endTime, duration, responsiblePerson, location, notes } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required for agenda item' });
    }

    const currentAgendas = db.find('agendaItems', a => a.eventId === id && (sectionId ? a.sectionId === sectionId : true));
    const order = currentAgendas.length + 1;

    const item = db.insert('agendaItems', {
      eventId: id,
      sectionId: sectionId || null,
      title,
      description: description || '',
      startTime: startTime || '',
      endTime: endTime || '',
      duration: duration || '',
      responsiblePerson: responsiblePerson || '',
      location: location || '',
      notes: notes || '',
      order
    });

    logActivity({
      actor: req.user,
      action: 'AGENDA_ADDED',
      entityType: 'EVENT',
      entityId: id,
      details: `Added agenda item "${title}" to event`
    });

    res.status(201).json({ success: true, data: item });
  },

  updateAgendaItem: (req, res) => {
    const { itemId } = req.params;
    const item = db.findById('agendaItems', itemId);
    if (!item) return res.status(404).json({ success: false, message: 'Agenda item not found' });

    const updated = db.update('agendaItems', itemId, req.body);
    res.json({ success: true, data: updated });
  },

  reorderAgenda: (req, res) => {
    const { id } = req.params;
    const { items } = req.body; // array of { id, order }

    if (Array.isArray(items)) {
      items.forEach(it => {
        db.update('agendaItems', it.id, { order: it.order });
      });
    }

    const reordered = db.find('agendaItems', a => a.eventId === id).sort((a, b) => a.order - b.order);
    res.json({ success: true, data: reordered });
  },

  deleteAgendaItem: (req, res) => {
    const { itemId } = req.params;
    db.delete('agendaItems', itemId);
    res.json({ success: true, message: 'Agenda item removed' });
  },

  getAllAgenda: (req, res) => {
    const agendaItems = db.find('agendaItems');
    const events = db.find('events');
    const departments = db.find('departments');
    const enriched = agendaItems.map(item => {
      const event = events.find(e => e.id === item.eventId);
      const dept = event ? departments.find(d => d.id === event.responsibleDepartmentId) : null;
      return {
        ...item,
        event: event ? { id: event.id, name: event.name, date: event.date, location: event.location, eventType: event.eventType } : null,
        department: dept ? { id: dept.id, name: dept.name, color: dept.color } : null
      };
    });
    enriched.sort((a, b) => {
      const dateA = a.event?.date || '';
      const dateB = b.event?.date || '';
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      return (a.order || 0) - (b.order || 0);
    });
    res.json({ success: true, data: enriched });
  }
};
