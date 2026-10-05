import { db } from '../store/database.js';
import { logActivity, createNotification } from '../services/auditService.js';
import { wsService } from '../services/wsService.js';

export const meetingController = {
  getAll: (req, res) => {
    let meetings = db.find('meetings');
    const users = db.find('users');

    const enriched = meetings.map(m => {
      const participants = (m.participantIds || []).map(pid => {
        const u = users.find(user => user.id === pid);
        return u ? { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl } : null;
      }).filter(Boolean);

      return {
        ...m,
        participants
      };
    });

    enriched.sort((a, b) => b.date.localeCompare(a.date));
    res.json({ success: true, data: enriched });
  },

  getById: (req, res) => {
    const { id } = req.params;
    const meeting = db.findById('meetings', id);
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const users = db.find('users');
    const participants = (meeting.participantIds || []).map(pid => {
      const u = users.find(user => user.id === pid);
      return u ? { id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl } : null;
    }).filter(Boolean);

    res.json({
      success: true,
      data: {
        ...meeting,
        participants
      }
    });
  },

  create: (req, res, next) => {
    try {
      const { title, date, startTime, endTime, location, participantIds, agenda, notes, decisions, actionItems } = req.body;
      if (!title || !date) {
        return res.status(400).json({ success: false, message: 'Title and date are required' });
      }

      const newMeeting = db.insert('meetings', {
        title,
        date,
        startTime: startTime || '18:00',
        endTime: endTime || '19:00',
        location: location || 'Discord Club Voice / Room 402',
        participantIds: participantIds || [],
        agenda: agenda || '',
        notes: notes || '',
        decisions: decisions || [],
        actionItems: (actionItems || []).map(ai => ({
          id: ai.id || `act-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          title: ai.title,
          departmentId: ai.departmentId,
          responsibleId: ai.responsibleId,
          deadline: ai.deadline,
          taskCreated: false
        }))
      });

      logActivity({
        actor: req.user,
        action: 'MEETING_CREATED',
        entityType: 'MEETING',
        entityId: newMeeting.id,
        details: `Created meeting "${title}" on ${date}`
      });

      res.status(201).json({ success: true, data: newMeeting });
    } catch (err) {
      next(err);
    }
  },

  update: (req, res, next) => {
    try {
      const { id } = req.params;
      const meeting = db.findById('meetings', id);
      if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

      const updates = { ...req.body };
      delete updates.id;
      delete updates.createdAt;

      const updated = db.update('meetings', id, updates);
      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  },

  convertActionToTask: (req, res, next) => {
    try {
      const { id, actionId } = req.params;
      const meeting = db.findById('meetings', id);
      if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });

      const actionItem = (meeting.actionItems || []).find(a => a.id === actionId);
      if (!actionItem) return res.status(404).json({ success: false, message: 'Action item not found' });

      if (actionItem.taskCreated && actionItem.taskId) {
        return res.status(400).json({ success: false, message: 'Task already created from this action item' });
      }

      // Create new official task
      const newTask = db.insert('tasks', {
        title: actionItem.title,
        description: `Generated from meeting "${meeting.title}" decisions`,
        departmentId: actionItem.departmentId || req.user.departmentId,
        assignedMemberId: actionItem.responsibleId || null,
        createdById: req.user.id,
        priority: 'HIGH',
        status: 'TODO',
        startDate: new Date().toISOString().split('T')[0],
        deadline: actionItem.deadline || meeting.date,
        progressPercent: 0,
        notes: `Meeting source: ${meeting.title} (${meeting.date})`,
        attachments: []
      });

      // Update action item in meeting
      const updatedActionItems = meeting.actionItems.map(ai => {
        if (ai.id === actionId) {
          return { ...ai, taskCreated: true, taskId: newTask.id };
        }
        return ai;
      });

      db.update('meetings', id, { actionItems: updatedActionItems });

      logActivity({
        actor: req.user,
        action: 'TASK_CREATED_FROM_MEETING',
        entityType: 'TASK',
        entityId: newTask.id,
        details: `Converted action item "${actionItem.title}" to official task`
      });

      if (newTask.assignedMemberId) {
        createNotification({
          userId: newTask.assignedMemberId,
          title: 'Action Item Task Created',
          message: `Task generated from meeting: "${newTask.title}"`,
          type: 'TASK',
          priority: 'HIGH',
          linkUrl: '/tasks'
        });
      }

      wsService.broadcast('TASK_CREATED', newTask);
      res.json({
        success: true,
        message: 'Action item successfully converted to task',
        data: newTask
      });
    } catch (err) {
      next(err);
    }
  }
};
