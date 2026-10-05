import { db } from '../store/database.js';
import { logActivity } from '../services/auditService.js';
import { wsService } from '../services/wsService.js';

export const systemController = {
  globalSearch: (req, res) => {
    const { q } = req.query;
    if (!q || !q.trim()) {
      return res.json({
        success: true,
        data: { members: [], tasks: [], departments: [], events: [], meetings: [], communication: [] }
      });
    }

    const query = q.trim().toLowerCase();

    const members = db.find('users', u =>
      u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)
    ).map(u => ({ id: u.id, title: u.name, subtitle: u.role, type: 'MEMBER', url: `/team/${u.id}`, avatarUrl: u.avatarUrl }));

    const tasks = db.find('tasks', t =>
      t.title.toLowerCase().includes(query) || (t.description && t.description.toLowerCase().includes(query))
    ).map(t => ({ id: t.id, title: t.title, subtitle: `Priority: ${t.priority} • Status: ${t.status}`, type: 'TASK', url: `/tasks?selected=${t.id}` }));

    const departments = db.find('departments', d =>
      d.name.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query))
    ).map(d => ({ id: d.id, title: d.name, subtitle: 'Department', type: 'DEPARTMENT', url: `/departments/${d.id}` }));

    const events = db.find('events', e =>
      e.name.toLowerCase().includes(query) || (e.description && e.description.toLowerCase().includes(query))
    ).map(e => ({ id: e.id, title: e.name, subtitle: `Event Date: ${e.date}`, type: 'EVENT', url: `/events/${e.id}` }));

    const meetings = db.find('meetings', m =>
      m.title.toLowerCase().includes(query) || (m.notes && m.notes.toLowerCase().includes(query))
    ).map(m => ({ id: m.id, title: m.title, subtitle: `Meeting Date: ${m.date}`, type: 'MEETING', url: `/meetings` }));

    const communication = db.find('communicationItems', c =>
      c.title.toLowerCase().includes(query) || (c.content && c.content.toLowerCase().includes(query))
    ).map(c => ({ id: c.id, title: c.title, subtitle: `Channel: ${c.channel} • ${c.status}`, type: 'COMMUNICATION', url: `/communication` }));

    res.json({
      success: true,
      data: {
        members: members.slice(0, 5),
        tasks: tasks.slice(0, 5),
        departments: departments.slice(0, 5),
        events: events.slice(0, 5),
        meetings: meetings.slice(0, 5),
        communication: communication.slice(0, 5)
      }
    });
  },

  getActivity: (req, res) => {
    const { limit = 50 } = req.query;
    const logs = (db.data.activityLogs || []).slice(0, Number(limit));
    res.json({ success: true, data: logs });
  },

  getSettings: (req, res) => {
    res.json({ success: true, data: db.data.settings || {} });
  },

  updateSettings: (req, res) => {
    const updates = { ...req.body };
    db.data.settings = { ...db.data.settings, ...updates };
    db.save();

    logActivity({
      actor: req.user,
      action: 'SETTINGS_UPDATED',
      entityType: 'SETTINGS',
      entityId: 'settings',
      details: 'Updated club system settings'
    });

    wsService.broadcast('SETTINGS_UPDATED', db.data.settings);

    res.json({ success: true, data: db.data.settings });
  },

  resetDemoData: (req, res) => {
    db.seedDemoData();
    logActivity({
      actor: req.user,
      action: 'DEMO_DATA_RESET',
      entityType: 'SYSTEM',
      entityId: 'system',
      details: 'Reset ByteCraft demo data to baseline state'
    });

    wsService.broadcast('SYSTEM_RESET', { message: 'Demo data reset completed' });
    res.json({ success: true, message: 'Demo data successfully reset to baseline' });
  },

  uploadAttachment: (req, res) => {
    // If multer file exists or json metadata
    const file = req.file;
    if (!file) {
      // Simulate file upload with metadata if client sends JSON mock
      const { name, size, type } = req.body;
      const att = {
        id: `att-${Date.now()}`,
        name: name || 'Document.pdf',
        size: size || '1.4 MB',
        type: type || 'application/pdf',
        url: '#',
        uploadedBy: req.user ? req.user.name : 'Coordinator',
        uploadedAt: new Date().toISOString()
      };
      return res.json({ success: true, data: att });
    }

    const att = {
      id: `att-${Date.now()}`,
      name: file.originalname,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.mimetype,
      url: `/uploads/${file.filename}`,
      uploadedBy: req.user ? req.user.name : 'Coordinator',
      uploadedAt: new Date().toISOString()
    };

    res.json({ success: true, data: att });
  }
};
