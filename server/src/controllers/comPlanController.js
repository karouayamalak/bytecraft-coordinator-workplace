import { db } from '../store/database.js';
import { logActivity, createNotification } from '../services/auditService.js';
import { wsService } from '../services/wsService.js';

export const comPlanController = {
  getAll: (req, res) => {
    const { role, departmentId } = req.user;
    const userDept = departmentId ? db.findById('departments', departmentId) : null;
    const deptName = userDept?.name || '';
    const isCommDept = deptName.toLowerCase().includes('communication') || deptName.toLowerCase().includes('relations') || deptName.toLowerCase().includes('external');
    if (role !== 'COORDINATOR' && !isCommDept) {
      return res.status(403).json({ success: false, message: 'Access restricted to Coordinator and Communication Department' });
    }

    const { eventId, phase, channel, status } = req.query;
    let items = db.find('communicationItems');

    if (eventId) items = items.filter(i => i.eventId === eventId);
    if (phase) items = items.filter(i => i.phase === phase);
    if (channel) items = items.filter(i => i.channel === channel);
    if (status) items = items.filter(i => i.status === status);

    const users = db.find('users');
    const events = db.find('events');
    const plans = db.find('communicationPlans');

    const tasks = db.find('tasks');

    const enriched = items.map(item => {
      const responsible = users.find(u => u.id === item.responsiblePersonId);
      const event = events.find(e => e.id === item.eventId);
      const plan = plans.find(p => p.id === item.communicationPlanId);
      const task = item.relatedTaskId ? tasks.find(t => t.id === item.relatedTaskId) : null;

      return {
        ...item,
        contentType: item.contentType || 'POST',
        platform: item.platform || item.channel || 'Instagram',
        publicationTime: item.publicationTime || '18:00',
        responsible: responsible ? { id: responsible.id, name: responsible.name, avatarUrl: responsible.avatarUrl } : null,
        event: event ? { id: event.id, name: event.name, date: event.date } : null,
        task: task ? { id: task.id, title: task.title, status: task.status, deadline: task.deadline } : null,
        planTitle: plan ? plan.title : 'General Communication Plan'
      };
    });

    // Sort by publicationDate ascending
    enriched.sort((a, b) => a.publicationDate.localeCompare(b.publicationDate));

    res.json({
      success: true,
      data: enriched,
      plans
    });
  },

  createItem: (req, res, next) => {
    try {
      const {
        communicationPlanId,
        eventId,
        phase,
        title,
        channel,
        platform,
        contentType,
        content,
        responsiblePersonId,
        publicationDate,
        publicationTime,
        status,
        notes,
        relatedTaskId
      } = req.body;

      const chosenPlatform = platform || channel;
      if (!title || !publicationDate || !chosenPlatform) {
        return res.status(400).json({ success: false, message: 'Title, platform, and publication date are required' });
      }

      let planId = communicationPlanId;
      if (!planId && eventId) {
        let existingPlan = db.findOne('communicationPlans', p => p.eventId === eventId);
        if (!existingPlan) {
          const ev = db.findById('events', eventId);
          existingPlan = db.insert('communicationPlans', {
            eventId,
            title: `${ev ? ev.name : 'Event'} Com Plan`,
            targetAudience: 'University Tech Community'
          });
        }
        planId = existingPlan.id;
      }

      const item = db.insert('communicationItems', {
        communicationPlanId: planId || 'complan-general',
        eventId: eventId || null,
        relatedTaskId: relatedTaskId || null,
        phase: phase || 'BEFORE',
        title,
        channel: chosenPlatform.toUpperCase(),
        platform: chosenPlatform,
        contentType: (contentType || 'POST').toUpperCase(),
        content: content || '',
        responsiblePersonId: responsiblePersonId || req.user.id,
        publicationDate,
        publicationTime: publicationTime || '18:00',
        status: status || 'PLANNED',
        notes: notes || ''
      });

      logActivity({
        actor: req.user,
        action: 'COMMUNICATION_ITEM_CREATED',
        entityType: 'COMMUNICATION',
        entityId: item.id,
        details: `Scheduled ${chosenPlatform} ${contentType || 'post'} "${title}" for ${publicationDate} ${publicationTime || '18:00'}`
      });

      if (responsiblePersonId && responsiblePersonId !== req.user.id) {
        createNotification({
          userId: responsiblePersonId,
          title: 'Communication Action Assigned',
          message: `You were assigned: "${title}" (${chosenPlatform}) scheduled for ${publicationDate} at ${publicationTime || '18:00'}`,
          type: 'COMMUNICATION',
          priority: 'INFO',
          linkUrl: '/events'
        });
      }

      wsService.broadcast('COMMUNICATION_ITEM_CREATED', item);
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      next(err);
    }
  },

  updateItem: (req, res, next) => {
    try {
      const { id } = req.params;
      const item = db.findById('communicationItems', id);
      if (!item) return res.status(404).json({ success: false, message: 'Communication item not found' });

      const updates = { ...req.body };
      delete updates.id;
      delete updates.createdAt;

      const updated = db.update('communicationItems', id, updates);

      logActivity({
        actor: req.user,
        action: updates.status === 'PUBLISHED' ? 'COMMUNICATION_PUBLISHED' : 'COMMUNICATION_UPDATED',
        entityType: 'COMMUNICATION',
        entityId: id,
        details: updates.status === 'PUBLISHED'
          ? `Published post "${updated.title}" on ${updated.channel}`
          : `Updated communication item "${updated.title}"`
      });

      wsService.broadcast('COMMUNICATION_ITEM_UPDATED', updated);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  deleteItem: (req, res) => {
    const { id } = req.params;
    const item = db.findById('communicationItems', id);
    if (!item) return res.status(404).json({ success: false, message: 'Communication item not found' });

    db.delete('communicationItems', id);

    logActivity({
      actor: req.user,
      action: 'COMMUNICATION_DELETED',
      entityType: 'COMMUNICATION',
      entityId: id,
      details: `Deleted communication item "${item.title}"`
    });

    res.json({ success: true, message: 'Item deleted' });
  }
};
