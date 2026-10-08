import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, CalendarDays, MapPin, Users, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import { EventStatusBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useWebSocket } from '../hooks/useWebSocket';
import type { Event, Department } from '../lib/types';
import { formatDate, EVENT_TYPE_LABELS } from '../lib/utils';
import api from '../lib/api';

const EMPTY_FORM = {
  name: '',
  description: '',
  eventType: 'WORKSHOP',
  date: '',
  startTime: '14:00',
  endTime: '17:00',
  location: '',
  responsibleDepartmentId: '',
  expectedParticipants: 50,
  notes: '',
};

export default function EventsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filterStatus) p.set('status', filterStatus);
    return `/events?${p.toString()}`;
  };

  const { data: events, loading, refetch } = useFetch<Event[]>(buildQuery(), [filterStatus]);
  const { data: departments } = useFetch<Department[]>('/departments');

  useWebSocket(msg => {
    if (['EVENT_CREATED', 'EVENT_UPDATED', 'EVENT_DELETED'].includes(msg.type)) refetch();
  });

  const isCoordinator = user?.role === 'COORDINATOR';
  const canManage = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER';

  const openCreate = () => {
    setEditEvent(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (event: Event) => {
    setEditEvent(event);
    setFormData({
      name: event.name,
      description: event.description,
      eventType: event.eventType,
      date: event.date,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location,
      responsibleDepartmentId: event.responsibleDepartmentId,
      expectedParticipants: event.expectedParticipants,
      notes: event.notes,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.date || !formData.startTime) {
      showToast('Name, date, and start time are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editEvent) {
        await api.patch(`/events/${editEvent.id}`, formData);
        showToast('Event updated.', 'success');
      } else {
        await api.post('/events', formData);
        showToast('Event created!', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string, name: string) => {
    if (!confirm(`Delete event "${name}"? This will NOT delete associated tasks.`)) return;
    try {
      await api.delete(`/events/${eventId}`);
      showToast('Event deleted.', 'success');
      refetch();
    } catch {
      showToast('Failed to delete event.', 'error');
    }
  };

  const eventList = (events as Event[]) || [];

  // Separate upcoming vs past
  const today = new Date().toISOString().split('T')[0];
  const upcoming = eventList.filter(e => e.date >= today && e.status !== 'CANCELLED');
  const past = eventList.filter(e => e.date < today || e.status === 'CANCELLED' || e.status === 'COMPLETED');

  return (
    <AppLayout title="Events" subtitle={`${upcoming.length} upcoming`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div className="flex items-center gap-3">
          <select
            className="form-select"
            style={{ maxWidth: 160 }}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            aria-label="Filter by event status"
          >
            <option value="">All Events</option>
            <option value="PLANNED">Planned</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/calendar')}>
            <CalendarDays size={14} /> Calendar View
          </button>
        </div>
        {canManage && (
          <button id="create-event-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Event
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 150, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {!loading && eventList.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><CalendarDays size={24} /></div>
          <div className="empty-title">No events yet</div>
          <div className="empty-desc">Create your first event to start planning and coordinating.</div>
          {canManage && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Create Event
            </button>
          )}
        </div>
      )}

      {/* Upcoming Events */}
      {!loading && upcoming.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            Upcoming Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={openEdit}
                onDelete={handleDelete}
                canManage={canManage}
                isCoordinator={isCoordinator}
                onClick={() => navigate(`/events/${event.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Past Events */}
      {!loading && past.length > 0 && (
        <div>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 14 }}>
            Past Events
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {past.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={openEdit}
                onDelete={handleDelete}
                canManage={canManage}
                isCoordinator={isCoordinator}
                onClick={() => navigate(`/events/${event.id}`)}
                dimmed
              />
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editEvent ? 'Edit Event' : 'Create New Event'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="evt-name">Event Name *</label>
            <input
              id="evt-name"
              className="form-input"
              placeholder="e.g. ByteCraft Annual Hackathon"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="evt-desc">Description</label>
            <textarea
              id="evt-desc"
              className="form-textarea"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-type">Event Type</label>
            <select
              id="evt-type"
              className="form-select"
              value={formData.eventType}
              onChange={e => setFormData(p => ({ ...p, eventType: e.target.value }))}
            >
              {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-dept">Responsible Dept.</label>
            <select
              id="evt-dept"
              className="form-select"
              value={formData.responsibleDepartmentId}
              onChange={e => setFormData(p => ({ ...p, responsibleDepartmentId: e.target.value }))}
            >
              <option value="">None</option>
              {(departments || []).map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-date">Date *</label>
            <input
              id="evt-date"
              type="date"
              className="form-input"
              value={formData.date}
              onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="form-label">Time</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="evt-start"
                type="time"
                className="form-input"
                value={formData.startTime}
                onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}
              />
              <input
                id="evt-end"
                type="time"
                className="form-input"
                value={formData.endTime}
                onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="evt-location">Location</label>
            <input
              id="evt-location"
              className="form-input"
              placeholder="e.g. University Tech Amphitheater B"
              value={formData.location}
              onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="evt-participants">Expected Participants</label>
            <input
              id="evt-participants"
              type="number"
              className="form-input"
              min={1}
              value={formData.expectedParticipants}
              onChange={e => setFormData(p => ({ ...p, expectedParticipants: Number(e.target.value) }))}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

// Event Card sub-component
function EventCard({
  event, onEdit, onDelete, canManage, isCoordinator, onClick, dimmed = false
}: {
  event: Event; onEdit: (e: Event) => void; onDelete: (id: string, name: string) => void;
  canManage: boolean; isCoordinator: boolean; onClick: () => void; dimmed?: boolean;
}) {
  const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);

  return (
    <div
      className="card"
      style={{
        cursor: 'pointer', opacity: dimmed ? 0.65 : 1,
        display: 'flex', gap: 20, alignItems: 'stretch',
        padding: 0, overflow: 'hidden'
      }}
      onClick={onClick}
    >
      {/* Left accent */}
      <div style={{
        width: 8, flexShrink: 0,
        background: event.status === 'ACTIVE' ? '#10B981'
          : event.status === 'COMPLETED' ? '#64748B'
          : 'var(--grad-cyan-blue)',
      }} />

      <div style={{ flex: 1, padding: '18px 20px 18px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10, gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17 }}>
                {event.name}
              </div>
              <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}>
                {event.eventType}
              </span>
              <EventStatusBadge status={event.status} />
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-secondary)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CalendarDays size={13} />
                {formatDate(event.date)} &nbsp;·&nbsp; {event.startTime}–{event.endTime}
              </span>
              {event.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={13} /> {event.location}
                </span>
              )}
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={13} /> {event.expectedParticipants} expected
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            {daysUntil > 0 && daysUntil <= 7 && (
              <div style={{
                background: daysUntil <= 3 ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                color: daysUntil <= 3 ? '#F87171' : '#FCD34D',
                fontSize: 12, fontWeight: 700,
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                border: `1px solid ${daysUntil <= 3 ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
              }}>
                {daysUntil === 0 ? 'Today!' : `In ${daysUntil}d`}
              </div>
            )}
            {canManage && (
              <>
                <button
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={e => { e.stopPropagation(); onEdit(event); }}
                  title="Edit event"
                >
                  <Edit2 size={13} />
                </button>
                {isCoordinator && (
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#F87171' }}
                    onClick={e => { e.stopPropagation(); onDelete(event.id, event.name); }}
                    title="Delete event"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Prep progress */}
        {event.tasksCount && event.tasksCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Preparation
            </span>
            <div style={{ flex: 1 }}>
              <ProgressBar value={event.progressPercent ?? 0} showLabel />
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {event.completedTasksCount}/{event.tasksCount} tasks
            </span>
            <ChevronRight size={16} color="var(--text-muted)" />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
            No preparation tasks yet <ChevronRight size={14} />
          </div>
        )}
      </div>
    </div>
  );
}
