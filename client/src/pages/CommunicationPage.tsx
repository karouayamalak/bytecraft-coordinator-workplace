import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, MessageSquare, Trash2, Edit2, CalendarDays, Clock, User, CheckCircle, AlertCircle, Send, Mail, Megaphone } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { CommunicationItem, Event, User as TUser } from '../lib/types';
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
  publicationTime: '18:00',
  status: 'PLANNED',
  notes: '',
  contentType: 'POST',
};

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  );
}

function TwitterIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
    </svg>
  );
}

// Platform icons
function PlatformIcon({ channel, size = 16 }: { channel?: string; size?: number }) {
  const style = { flexShrink: 0 };
  switch (channel) {
    case 'INSTAGRAM': return <InstagramIcon size={size} />;
    case 'TWITTER': return <TwitterIcon size={size} />;
    case 'EMAIL': return <Mail size={size} style={style} />;
    case 'FACEBOOK': return <MessageSquare size={size} style={style} />;
    default: return <Megaphone size={size} style={style} />;
  }
}

// Status config
function getStatusConfig(status: string) {
  switch (status) {
    case 'PUBLISHED': return { color: '#10B981', bg: '#d1fae5', label: 'Published', icon: <CheckCircle size={12} /> };
    case 'SCHEDULED': return { color: '#3B82F6', bg: '#dbeafe', label: 'Scheduled', icon: <Clock size={12} /> };
    case 'IN_PROGRESS': return { color: '#F59E0B', bg: '#fef3c7', label: 'In Progress', icon: <AlertCircle size={12} /> };
    case 'READY': return { color: '#8B5CF6', bg: '#ede9fe', label: 'Ready', icon: <Send size={12} /> };
    case 'CANCELLED': return { color: '#94A3B8', bg: '#f1f5f9', label: 'Cancelled', icon: <AlertCircle size={12} /> };
    default: return { color: '#64748B', bg: '#f8fafc', label: status || 'Planned', icon: <Clock size={12} /> };
  }
}

const CONTENT_TYPES = ['POST', 'STORY', 'REEL', 'VIDEO', 'EMAIL', 'POSTER', 'ANNOUNCEMENT', 'ARTICLE'];
const PHASE_CONFIG = {
  BEFORE: { label: 'Pre-Event', color: '#6366F1', bg: 'rgba(99,102,241,0.1)' },
  DURING: { label: 'During Event', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
  AFTER:  { label: 'Post-Event', color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
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
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

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
  const { data: members } = useFetch<TUser[]>('/users?status=active');

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
      phase: item.phase || 'BEFORE',
      title: item.title,
      channel: item.channel || 'INSTAGRAM',
      content: item.content,
      responsiblePersonId: item.responsiblePersonId,
      publicationDate: item.publicationDate,
      publicationTime: (item as any).publicationTime || '18:00',
      status: item.status,
      notes: (item as any).notes || '',
      contentType: (item as any).contentType || 'POST',
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
  const memberList = (members as TUser[]) || [];

  const phases: Array<keyof typeof PHASE_CONFIG> = ['BEFORE', 'DURING', 'AFTER'];

  // Timeline view: sorted by publication date
  const sortedByDate = [...itemList].sort((a, b) => {
    const da = `${a.publicationDate}T${(a as any).publicationTime || '00:00'}`;
    const db = `${b.publicationDate}T${(b as any).publicationTime || '00:00'}`;
    return da.localeCompare(db);
  });

  return (
    <AppLayout
      title="Communication Plan"
      subtitle={`${itemList.length} publication${itemList.length !== 1 ? 's' : ''}`}
    >
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 10, padding: 3, gap: 3 }}>
            <button
              onClick={() => setViewMode('list')}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: viewMode === 'list' ? 'var(--bg-elevated)' : 'transparent',
                color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              By Phase
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              style={{
                padding: '5px 12px', borderRadius: 7, border: 'none',
                background: viewMode === 'timeline' ? 'var(--bg-elevated)' : 'transparent',
                color: viewMode === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: 600, fontSize: 12, cursor: 'pointer',
              }}
            >
              Timeline
            </button>
          </div>

          <select
            className="form-select" style={{ maxWidth: 160, fontSize: 13 }}
            value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
            aria-label="Filter by event"
          >
            <option value="">All Events</option>
            {eventList.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>

          <select
            className="form-select" style={{ maxWidth: 140, fontSize: 13 }}
            value={filterPhase} onChange={e => setFilterPhase(e.target.value)}
            aria-label="Filter by phase"
          >
            <option value="">All Phases</option>
            {Object.entries(PHASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>

          <select
            className="form-select" style={{ maxWidth: 140, fontSize: 13 }}
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All Statuses</option>
            {Object.entries(COMM_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {canManage && (
          <button id="create-comm-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Publication
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!loading && itemList.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><MessageSquare size={24} /></div>
          <div className="empty-title">No communication items yet</div>
          <div className="empty-desc">Plan your Instagram posts, email campaigns, posters and more here.</div>
          {canManage && (
            <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> Add First Publication</button>
          )}
        </div>
      )}

      {/* ── LIST VIEW: grouped by phase ── */}
      {!loading && viewMode === 'list' && itemList.length > 0 && phases.map(phase => {
        const phaseItems = itemList.filter(i => i.phase === phase);
        if (phaseItems.length === 0) return null;
        const config = PHASE_CONFIG[phase];

        return (
          <div key={phase} style={{ marginBottom: 28 }}>
            {/* Phase header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: 12, padding: '8px 14px',
              background: config.bg, borderRadius: 10,
              border: `1px solid ${config.color}30`
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: config.color }}>{config.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{phaseItems.length} item{phaseItems.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {phaseItems.map(item => <CommItemCard key={item.id} item={item} canManage={canManage} onEdit={openEdit} onDelete={handleDelete} />)}
            </div>
          </div>
        );
      })}

      {/* ── TIMELINE VIEW: sorted by date ── */}
      {!loading && viewMode === 'timeline' && itemList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {sortedByDate.map((item, idx) => {
            const prev = sortedByDate[idx - 1];
            const showDateHeader = !prev || prev.publicationDate !== item.publicationDate;
            return (
              <React.Fragment key={item.id}>
                {showDateHeader && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '6px 0', borderBottom: '1.5px solid #e2e8f0',
                    marginTop: idx > 0 ? 8 : 0
                  }}>
                    <CalendarDays size={14} color="#0284c7" />
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>
                      {new Date(item.publicationDate + 'T12:00:00').toLocaleDateString(undefined, {
                        weekday: 'long', month: 'long', day: 'numeric'
                      })}
                    </span>
                  </div>
                )}
                <CommItemCard item={item} canManage={canManage} onEdit={openEdit} onDelete={handleDelete} showTime />
              </React.Fragment>
            );
          })}
        </div>
      )}

      {/* ── Modal ── */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Publication' : 'New Publication'}
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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="comm-title">Title *</label>
            <input
              id="comm-title"
              className="form-input"
              placeholder="e.g. Instagram Announcement for ByteHack"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="comm-channel">Platform *</label>
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
            <label className="form-label" htmlFor="comm-content-type">Content Type</label>
            <select
              id="comm-content-type"
              className="form-select"
              value={formData.contentType}
              onChange={e => setFormData(p => ({ ...p, contentType: e.target.value }))}
            >
              {CONTENT_TYPES.map(t => (
                <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</option>
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
            <label className="form-label" htmlFor="comm-time">Publication Time</label>
            <input
              id="comm-time"
              type="time"
              className="form-input"
              value={formData.publicationTime}
              onChange={e => setFormData(p => ({ ...p, publicationTime: e.target.value }))}
            />
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
            <label className="form-label" htmlFor="comm-content">Caption / Content</label>
            <textarea
              id="comm-content"
              className="form-textarea"
              placeholder="Post caption, email subject, or poster description…"
              value={formData.content}
              onChange={e => setFormData(p => ({ ...p, content: e.target.value }))}
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

// ── Shared card component ──
interface CommItemCardProps {
  item: CommunicationItem;
  canManage: boolean;
  onEdit: (item: CommunicationItem) => void;
  onDelete: (id: string) => void;
  showTime?: boolean;
}

function CommItemCard({ item, canManage, onEdit, onDelete, showTime }: CommItemCardProps) {
  const channel = item.channel || 'OTHER';
  const channelColor = (item.channel && COMM_CHANNEL_COLORS[item.channel]) || '#64748B';
  const statusCfg = getStatusConfig(item.status);
  const pubTime = (item as any).publicationTime;
  const contentType = (item as any).contentType;

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1.5px solid #e2e8f0',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        gap: 14,
        alignItems: 'flex-start',
        transition: 'box-shadow 0.15s',
      }}
    >
      {/* Platform icon bubble */}
      <div style={{
        width: 42, height: 42, borderRadius: 11,
        background: `${channelColor}18`,
        border: `1.5px solid ${channelColor}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
      }}>
        <span style={{ color: channelColor }}>
          <PlatformIcon channel={channel} size={18} />
        </span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{item.title}</span>

          {/* Platform badge */}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            borderRadius: 999,
            background: `${channelColor}15`, color: channelColor,
            border: `1px solid ${channelColor}25`
          }}>
            {COMM_CHANNEL_LABELS[channel] || channel}
          </span>

          {/* Content type badge */}
          {contentType && (
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px',
              borderRadius: 999, background: '#f1f5f9', color: '#64748b',
              border: '1px solid #e2e8f0'
            }}>
              {contentType}
            </span>
          )}

          {/* Status badge */}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px',
            borderRadius: 999,
            background: statusCfg.bg, color: statusCfg.color,
            display: 'inline-flex', alignItems: 'center', gap: 4
          }}>
            {statusCfg.icon} {statusCfg.label}
          </span>
        </div>

        {/* Meta info row */}
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
            <CalendarDays size={12} color="#0284c7" />
            {formatDate(item.publicationDate)}
            {(showTime || pubTime) && pubTime && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                <Clock size={11} /> {pubTime}
              </span>
            )}
          </span>

          {item.event && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {item.event.name}
            </span>
          )}

          {item.responsible && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Avatar src={item.responsible.avatarUrl} name={item.responsible.name} size="sm" />
              <span>{item.responsible.name}</span>
            </span>
          )}
        </div>

        {/* Content preview */}
        {item.content && (
          <div style={{
            fontSize: 12, color: '#94a3b8', marginTop: 6,
            fontStyle: 'italic',
            background: '#f8fafc', borderRadius: 6, padding: '6px 10px',
            border: '1px solid var(--border-subtle)'
          }}>
            "{item.content.slice(0, 100)}{item.content.length > 100 ? '…' : ''}"
          </div>
        )}
      </div>

      {/* Actions */}
      {canManage && (
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onEdit(item)}
            title="Edit"
          >
            <Edit2 size={13} />
          </button>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color: '#F87171' }}
            onClick={() => onDelete(item.id)}
            title="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </div>
  );
}
