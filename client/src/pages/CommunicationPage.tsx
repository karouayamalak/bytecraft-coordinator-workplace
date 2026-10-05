import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, Edit2, CalendarDays } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import { CommStatusBadge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { CommunicationItem, Event, User } from '../lib/types';
import {
  formatDate, COMM_CHANNEL_LABELS, COMM_CHANNEL_COLORS,
  PHASE_LABELS, COMM_STATUS_LABELS
} from '../lib/utils';
import api from '../lib/api';

const EMPTY_FORM = {
  eventId: '',
  phase: 'BEFORE',
  title: '',
  channel: 'INSTAGRAM',
  content: '',
  responsiblePersonId: '',
  publicationDate: '',
  status: 'PLANNED',
  notes: '',
};

export default function CommunicationPage() {
  const { user, department } = useAuth();
  const { showToast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CommunicationItem | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterPhase, setFilterPhase] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEvent, setFilterEvent] = useState('');

  const deptName = department?.name || '';
  const canAccessComm = user?.role === 'COORDINATOR' ||
    deptName.toLowerCase().includes('communication') ||
    deptName.toLowerCase().includes('relations') ||
    deptName.toLowerCase().includes('external');

  if (!canAccessComm) {
    return <Navigate to="/" replace />;
  }

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filterPhase) p.set('phase', filterPhase);
    if (filterStatus) p.set('status', filterStatus);
    if (filterEvent) p.set('eventId', filterEvent);
    return `/communication?${p.toString()}`;
  };

  const { data: items, loading, refetch } = useFetch<CommunicationItem[]>(buildQuery(), [filterPhase, filterStatus, filterEvent]);
  const { data: events } = useFetch<Event[]>('/events');
  const { data: members } = useFetch<User[]>('/users?status=active');

  const canManage = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER' || user?.role === 'MANAGER';

  const openCreate = () => {
    setEditItem(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: CommunicationItem) => {
    setEditItem(item);
    setFormData({
      eventId: item.eventId || '',
      phase: item.phase,
      title: item.title,
      channel: item.channel,
      content: item.content,
      responsiblePersonId: item.responsiblePersonId,
      publicationDate: item.publicationDate,
      status: item.status,
      notes: item.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.channel || !formData.publicationDate) {
      showToast('Title, channel, and publication date are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editItem) {
        await api.patch(`/communication/${editItem.id}`, formData);
        showToast('Communication item updated.', 'success');
      } else {
        await api.post('/communication', formData);
        showToast('Communication item created!', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this communication item?')) return;
    try {
      await api.delete(`/communication/${id}`);
      showToast('Deleted.', 'success');
      refetch();
    } catch {
      showToast('Failed to delete.', 'error');
    }
  };

  const itemList = (items as CommunicationItem[]) || [];
  const eventList = (events as Event[]) || [];
  const memberList = (members as User[]) || [];

  // Group by phase
  const phases: CommunicationItem['phase'][] = ['BEFORE', 'DURING', 'AFTER'];
  const grouped = phases.map(phase => ({
    phase,
    items: itemList.filter(i => i.phase === phase)
  })).filter(g => g.items.length > 0 || (!filterPhase));

  return (
    <AppLayout title="Communication Plans" subtitle={`${itemList.length} items`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
          <select
            className="form-select" style={{ maxWidth: 180 }}
            value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
            aria-label="Filter by event"
          >
            <option value="">All Events</option>
            {eventList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select
            className="form-select" style={{ maxWidth: 150 }}
            value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
            aria-label="Filter by phase"
          >
            <option value="">All Phases</option>
            {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select
            className="form-select" style={{ maxWidth: 150 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {Object.entries(COMM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {canManage && (
          <button id="create-comm-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Item
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {!loading && itemList.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><MessageSquare size={24} /></div>
          <div className="empty-title">No communication items</div>
          <div className="empty-desc">Plan your social media, email, and poster campaigns here.</div>
          {canManage && (
            <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add Item</button>
          )}
        </div>
      )}

      {/* Grouped by phase */}
      {!loading && itemList.length > 0 && phases.map(phase => {
        const phaseItems = itemList.filter(i => i.phase === phase);
        if (phaseItems.length === 0) return null;

        return (
          <div key={phase} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
              {phase === 'BEFORE' ? 'Pre-Event Phase'
                : phase === 'DURING' ? 'During Event Phase'
                : 'Post-Event Phase'}
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phaseItems.map(item => {
                const channelColor = COMM_CHANNEL_COLORS[item.channel] || '#64748B';
                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{ display: 'flex', gap: 16, alignItems: 'center', padding: '14px 18px' }}
                  >
                    {/* Channel indicator */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${channelColor}18`, border: `1px solid ${channelColor}30`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <MessageSquare size={18} style={{ color: channelColor }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: '2px 8px',
                          borderRadius: 'var(--radius-full)',
                          background: `${channelColor}18`, color: channelColor,
                          border: `1px solid ${channelColor}30`
                        }}>
                          {COMM_CHANNEL_LABELS[item.channel]}
                        </span>
                        <CommStatusBadge status={item.status} />
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CalendarDays size={11} /> {formatDate(item.publicationDate)}
                        </span>
                        {item.event && (
                          <span>🎪 {item.event.name}</span>
                        )}
                        {item.responsible && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Avatar src={item.responsible.avatarUrl} name={item.responsible.name} size="sm" />
                            {item.responsible.name}
                          </span>
                        )}
                      </div>
                      {item.content && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
                          "{item.content.slice(0, 80)}{item.content.length > 80 ? '…' : ''}"
                        </div>
                      )}
                    </div>

                    {canManage && (
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => openEdit(item)}
                          title="Edit item"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          style={{ color: '#F87171' }}
                          onClick={() => handleDelete(item.id)}
                          title="Delete item"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Communication Item' : 'New Communication Item'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="comm-title">Title *</label>
            <input
              id="comm-title"
              className="form-input"
              placeholder="e.g. Instagram Announcement Post"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-channel">Channel *</label>
            <select
              id="comm-channel"
              className="form-select"
              value={formData.channel}
              onChange={e => setFormData(p => ({ ...p, channel: e.target.value }))}
            >
              {Object.entries(COMM_CHANNEL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-phase">Phase</label>
            <select
              id="comm-phase"
              className="form-select"
              value={formData.phase}
              onChange={e => setFormData(p => ({ ...p, phase: e.target.value }))}
            >
              {Object.entries(PHASE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-event">Related Event</label>
            <select
              id="comm-event"
              className="form-select"
              value={formData.eventId}
              onChange={e => setFormData(p => ({ ...p, eventId: e.target.value }))}
            >
              <option value="">None</option>
              {eventList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-person">Responsible Person</label>
            <select
              id="comm-person"
              className="form-select"
              value={formData.responsiblePersonId}
              onChange={e => setFormData(p => ({ ...p, responsiblePersonId: e.target.value }))}
            >
              <option value="">None</option>
              {memberList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-date">Publication Date *</label>
            <input
              id="comm-date"
              type="date"
              className="form-input"
              value={formData.publicationDate}
              onChange={e => setFormData(p => ({ ...p, publicationDate: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-status">Status</label>
            <select
              id="comm-status"
              className="form-select"
              value={formData.status}
              onChange={e => setFormData(p => ({ ...p, status: e.target.value }))}
            >
              {Object.entries(COMM_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="comm-content">Content / Caption</label>
            <textarea
              id="comm-content"
              className="form-textarea"
              placeholder="Post caption, email subject, or poster description…"
              value={formData.content}
              onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
