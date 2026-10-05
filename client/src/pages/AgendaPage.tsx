import { useState } from 'react';
import { Clock, CalendarDays, MapPin, User, Plus, Search, Filter } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import api from '../lib/api';

interface AgendaItemWithEvent {
  id: string;
  eventId: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  responsiblePerson: string;
  location: string;
  order: number;
  notes: string;
  event: {
    id: string;
    name: string;
    date: string;
    location: string;
    eventType: string;
  } | null;
  department: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface EventItem {
  id: string;
  name: string;
  date: string;
}

const EMPTY_AGENDA = {
  eventId: '',
  title: '',
  description: '',
  startTime: '',
  endTime: '',
  responsiblePerson: '',
  location: '',
  notes: '',
};

export default function AgendaPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_AGENDA);
  const [saving, setSaving] = useState(false);

  const { data: agendaItems, loading, refetch } = useFetch<AgendaItemWithEvent[]>('/events/agenda/all');
  const { data: events } = useFetch<EventItem[]>('/events');

  const canManage = user?.role === 'COORDINATOR' || user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  const items = agendaItems || [];

  const filteredItems = items.filter(item => {
    if (selectedEventId && item.eventId !== selectedEventId) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchEvent = item.event?.name?.toLowerCase().includes(q);
      const matchPerson = item.responsiblePerson?.toLowerCase().includes(q);
      const matchLoc = item.location?.toLowerCase().includes(q);
      if (!matchTitle && !matchEvent && !matchPerson && !matchLoc) return false;
    }
    return true;
  });

  const handleCreate = async () => {
    if (!formData.eventId || !formData.title || !formData.startTime) {
      showToast('Please select an event, title, and start time.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/events/${formData.eventId}/agenda`, formData);
      showToast('Agenda item added successfully!', 'success');
      setShowModal(false);
      setFormData(EMPTY_AGENDA);
      refetch();
    } catch {
      showToast('Failed to add agenda item.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout title="Event Agendas" subtitle="Complete schedule, runsheet & timings for ByteCraft club activations">
      {/* Header Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div className="search-container" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search agenda, speaker, room…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Event Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={14} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-input form-select"
              style={{ width: 'auto', minWidth: 200, padding: '7px 12px', fontSize: 13 }}
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
            >
              <option value="">All Events</option>
              {events?.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>
          </div>
        </div>

        {canManage && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Agenda Item
          </button>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><CalendarDays size={24} /></div>
          <div className="empty-title">No agenda items found</div>
          <div className="empty-desc">
            {search || selectedEventId
              ? 'Try clearing the search or choosing another event.'
              : 'Add agenda items to build the schedule for upcoming events.'}
          </div>
          {canManage && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add First Item
            </button>
          )}
        </div>
      )}

      {/* Agenda Timeline List */}
      {!loading && filteredItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredItems.map(item => (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 16,
                flexWrap: 'wrap',
                transition: 'all var(--transition-fast)',
              }}
            >
              {/* Timing Badge */}
              <div style={{
                background: 'rgba(232,120,35,0.12)',
                border: '1px solid rgba(232,120,35,0.3)',
                color: 'var(--brand-primary)',
                padding: '8px 12px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                whiteSpace: 'nowrap'
              }}>
                <Clock size={14} />
                <span>{item.startTime} {item.endTime ? `– ${item.endTime}` : ''}</span>
              </div>

              {/* Main Content */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {item.title}
                  </h4>
                  {item.event && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: 'rgba(56,189,248,0.12)',
                      color: 'var(--brand-blue)',
                      border: '1px solid rgba(56,189,248,0.25)'
                    }}>
                      {item.event.name} · {item.event.date}
                    </span>
                  )}
                  {item.department && (
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 6,
                      background: `${item.department.color}18`,
                      color: item.department.color,
                    }}>
                      {item.department.name}
                    </span>
                  )}
                </div>

                {item.description && (
                  <p style={{ margin: '4px 0 8px', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                    {item.description}
                  </p>
                )}

                {/* Metadata tags */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
                  {item.responsiblePerson && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <User size={13} style={{ color: 'var(--text-secondary)' }} />
                      <strong style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{item.responsiblePerson}</strong>
                    </span>
                  )}
                  {item.location && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <MapPin size={13} style={{ color: 'var(--text-secondary)' }} />
                      <span>{item.location}</span>
                    </span>
                  )}
                  {item.notes && (
                    <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                      Note: {item.notes}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Agenda Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add Agenda Item"
          size="default"
        >
          <div className="form-group">
            <label className="form-label required">Event</label>
            <select
              className="form-input form-select"
              value={formData.eventId}
              onChange={e => setFormData(p => ({ ...p, eventId: e.target.value }))}
            >
              <option value="">Select event…</option>
              {events?.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.name} ({ev.date})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label required">Title</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Keynote Presentation, Coding Challenge…"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label required">Start Time</label>
              <input
                type="text"
                className="form-input"
                placeholder="14:00"
                value={formData.startTime}
                onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <input
                type="text"
                className="form-input"
                placeholder="15:30"
                value={formData.endTime}
                onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Responsible Person</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Amine Benali, Rayane Alem"
                value={formData.responsiblePerson}
                onChange={e => setFormData(p => ({ ...p, responsiblePerson: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Room</label>
              <input
                type="text"
                className="form-input"
                placeholder="Amphi B, Cyber Lounge…"
                value={formData.location}
                onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={2}
              placeholder="Brief summary of what happens during this slot…"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes / Logistics Requirements</label>
            <input
              type="text"
              className="form-input"
              placeholder="Microphone check, slides ready on laptop 2…"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
            />
          </div>

          <div className="modal-footer" style={{ marginTop: 20 }}>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving}>
              {saving ? 'Adding…' : 'Add Item'}
            </button>
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
