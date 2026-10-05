import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays, MapPin, Clock, ArrowLeft, CheckSquare,
  Plus, CheckCircle2, Circle, MessageSquare, AlertCircle,
  Sparkles, ChevronRight
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge, CommStatusBadge, EventStatusBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import confetti from 'canvas-confetti';

interface AgendaItem {
  id: string;
  order: number;
  time: string;
  title: string;
  speaker?: string;
  notes?: string;
}

interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  assignedMemberId?: string;
  assignedMemberName?: string;
  dueDate?: string;
}

interface EventDetail {
  id: string;
  name: string;
  description: string;
  date: string;
  time: string;
  location: string;
  eventType: string;
  status: 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  responsibleDepartmentId: string;
  organizerId: string;
  department?: { id: string; name: string; color: string };
  organizer?: { id: string; name: string; avatarUrl: string };
  responsibleMembers?: Array<{ id: string; name: string; avatarUrl: string }>;
  agendaItems?: AgendaItem[];
  checklist?: ChecklistItem[];
  tasks?: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    assignedUserName?: string;
  }>;
  comPlan?: {
    id: string;
    name: string;
  };
  comItems?: Array<{
    id: string;
    channel: string;
    phase: string;
    content: string;
    scheduledDate: string;
    status: string;
    responsibleMemberName?: string;
  }>;
  progressPercent?: number;
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canEdit = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER';

  const { data: event, loading, refetch } = useFetch<EventDetail>(`/events/${id}`);
  const [activeTab, setActiveTab] = useState<'agenda' | 'checklist' | 'comms' | 'tasks'>('agenda');

  // Agenda modal state
  const [agendaModalOpen, setAgendaModalOpen] = useState(false);
  const [agendaForm, setAgendaForm] = useState({
    time: '14:00',
    title: '',
    speaker: '',
    notes: '',
  });

  // Checklist modal state
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistForm, setChecklistForm] = useState({
    title: '',
    dueDate: '',
  });

  // Mascot selector based on event type or department
  const getMascot = (type?: string, deptName?: string) => {
    const t = (type || '').toLowerCase();
    const d = (deptName || '').toLowerCase();
    if (d.includes('tech') || t.includes('hack') || t.includes('code') || t.includes('dev')) {
      return '/mascots/tech.png';
    }
    if (d.includes('media') || t.includes('photo') || t.includes('design') || t.includes('creative')) {
      return '/mascots/media.png';
    }
    if (d.includes('pr') || d.includes('comm') || t.includes('welcome') || t.includes('network')) {
      return '/mascots/pr.png';
    }
    return '/mascots/executive.png';
  };

  const handleAddAgenda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendaForm.title.trim()) return;
    try {
      await api.post(`/events/${id}/agenda`, agendaForm);
      setAgendaModalOpen(false);
      setAgendaForm({ time: '14:00', title: '', speaker: '', notes: '' });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to add agenda item');
    }
  };

  const handleDeleteAgenda = async (itemId: string) => {
    if (!confirm('Remove this agenda item?')) return;
    try {
      await api.delete(`/events/${id}/agenda/${itemId}`);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to remove agenda item');
    }
  };

  const handleToggleChecklist = async (checkItem: ChecklistItem) => {
    try {
      const updatedChecklist = (event?.checklist || []).map(ci =>
        ci.id === checkItem.id ? { ...ci, completed: !ci.completed } : ci
      );
      await api.patch(`/events/${id}`, { checklist: updatedChecklist });
      if (!checkItem.completed) {
        confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } });
      }
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update checklist');
    }
  };

  const handleAddChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checklistForm.title.trim()) return;
    try {
      const newItem: ChecklistItem = {
        id: `chk-${Date.now()}`,
        title: checklistForm.title.trim(),
        completed: false,
        dueDate: checklistForm.dueDate || undefined,
        assignedMemberName: user?.name,
      };
      const updatedChecklist = [...(event?.checklist || []), newItem];
      await api.patch(`/events/${id}`, { checklist: updatedChecklist });
      setChecklistModalOpen(false);
      setChecklistForm({ title: '', dueDate: '' });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to add checklist item');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Event Details">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout title="Event Not Found">
        <div className="glass-card" style={{ padding: 40, textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: 'var(--accent-danger)', margin: '0 auto 16px' }} />
          <h3>Event not found or has been removed</h3>
          <button className="btn btn-secondary" onClick={() => navigate('/events')} style={{ marginTop: 16 }}>
            <ArrowLeft size={16} /> Back to Events
          </button>
        </div>
      </AppLayout>
    );
  }

  const checklistItems = event.checklist || [];
  const completedChecklist = checklistItems.filter(c => c.completed).length;
  const checklistPercent = checklistItems.length > 0
    ? Math.round((completedChecklist / checklistItems.length) * 100)
    : 0;

  return (
    <AppLayout
      title={event.name}
      subtitle={`${formatDate(event.date)} • ${event.location}`}
      breadcrumbs={[
        { label: 'Events', to: '/events' },
        { label: event.name }
      ]}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/events')}>
            <ArrowLeft size={16} /> Back
          </button>
          {canEdit && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (activeTab === 'agenda') setAgendaModalOpen(true);
                else if (activeTab === 'checklist') setChecklistModalOpen(true);
                else navigate(`/tasks?eventId=${event.id}`);
              }}
            >
              <Plus size={16} />
              {activeTab === 'agenda' ? 'Add Agenda Item' : activeTab === 'checklist' ? 'Add Checklist Item' : 'New Task'}
            </button>
          )}
        </div>
      }
    >
      {/* Event Hero Card with ByteCraft Mascot Visual */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow backdrop */}
        <div style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, rgba(0, 212, 255, 0.25) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span className="badge" style={{
                background: 'rgba(0, 212, 255, 0.15)',
                color: '#38BDF8',
                border: '1px solid rgba(0, 212, 255, 0.3)',
                fontWeight: 600
              }}>
                {event.eventType}
              </span>
              <EventStatusBadge status={event.status} />
              {event.department && (
                <span className="badge" style={{
                  background: `${event.department.color}20`,
                  color: event.department.color,
                  border: `1px solid ${event.department.color}50`
                }}>
                  {event.department.name}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', color: '#FFFFFF' }}>
              {event.name}
            </h1>

            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 650 }}>
              {event.description || 'No detailed description provided for this ByteCraft event.'}
            </p>

            {/* Quick Meta */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 13, color: 'var(--text-muted)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={16} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{formatDate(event.date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={16} style={{ color: '#F59E0B' }} />
                <span>{event.time}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={16} style={{ color: '#EC4899' }} />
                <span>{event.location}</span>
              </div>
              {event.organizer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar src={event.organizer.avatarUrl} name={event.organizer.name} size="xs" />
                  <span>Lead: <strong style={{ color: 'var(--text-primary)' }}>{event.organizer.name}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* 3D Mascot Graphic */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 20,
            padding: 12,
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <img
              src={getMascot(event.eventType, event.department?.name)}
              alt="ByteCraft Mascot"
              style={{
                width: 130,
                height: 130,
                objectFit: 'contain',
                filter: 'drop-shadow(0 10px 20px rgba(0, 212, 255, 0.3))'
              }}
            />
          </div>
        </div>

        {/* Preparation Progress Bar */}
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
              Overall Event Readiness
            </span>
            <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
              {event.progressPercent ?? checklistPercent}% Ready
            </span>
          </div>
          <ProgressBar value={event.progressPercent ?? checklistPercent} variant="gradient" height={8} />
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <button
          className={`btn ${activeTab === 'agenda' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('agenda')}
        >
          <Clock size={16} /> Agenda Timeline ({event.agendaItems?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'checklist' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('checklist')}
        >
          <CheckSquare size={16} /> Preparation Checklist ({checklistItems.length})
        </button>
        <button
          className={`btn ${activeTab === 'comms' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('comms')}
        >
          <MessageSquare size={16} /> Communication Plan ({event.comItems?.length || 0})
        </button>
        <button
          className={`btn ${activeTab === 'tasks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('tasks')}
        >
          <Sparkles size={16} /> Event Tasks ({event.tasks?.length || 0})
        </button>
      </div>

      {/* TAB 1: AGENDA */}
      {activeTab === 'agenda' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Event Day Agenda</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Chronological rundown of sessions, keynotes, workshops, and breaks.
              </p>
            </div>
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => setAgendaModalOpen(true)}>
                <Plus size={14} /> Add Agenda Item
              </button>
            )}
          </div>

          {(!event.agendaItems || event.agendaItems.length === 0) ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Clock size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No agenda items scheduled yet for this event.</p>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => setAgendaModalOpen(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Schedule First Item
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {event.agendaItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 16,
                    padding: 16,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    transition: 'var(--transition)'
                  }}
                >
                  <div style={{
                    minWidth: 70,
                    padding: '6px 10px',
                    background: 'rgba(0, 212, 255, 0.1)',
                    border: '1px solid rgba(0, 212, 255, 0.25)',
                    borderRadius: 8,
                    textAlign: 'center',
                    fontWeight: 700,
                    color: 'var(--accent-primary)',
                    fontSize: 13
                  }}>
                    {item.time}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>
                      {item.title}
                    </div>
                    {item.speaker && (
                      <div style={{ fontSize: 13, color: 'var(--accent-secondary)', marginTop: 2 }}>
                        Speaker / Lead: <strong>{item.speaker}</strong>
                      </div>
                    )}
                    {item.notes && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                  {canEdit && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDeleteAgenda(item.id)}
                      title="Remove"
                      style={{ color: 'var(--accent-danger)' }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Preparation Checklist</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Items that must be prepared and verified before the event kicks off.
              </p>
            </div>
            {canEdit && (
              <button className="btn btn-secondary btn-sm" onClick={() => setChecklistModalOpen(true)}>
                <Plus size={14} /> Add Item
              </button>
            )}
          </div>

          {checklistItems.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No checklist items added yet.</p>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => setChecklistModalOpen(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Add Checklist Item
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {checklistItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleToggleChecklist(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    background: item.completed ? 'rgba(52, 211, 153, 0.05)' : 'var(--bg-elevated)',
                    border: `1px solid ${item.completed ? 'rgba(52, 211, 153, 0.25)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'var(--transition)'
                  }}
                >
                  {item.completed ? (
                    <CheckCircle2 size={20} style={{ color: '#34D399', flexShrink: 0 }} />
                  ) : (
                    <Circle size={20} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                  <span style={{
                    flex: 1,
                    textDecoration: item.completed ? 'line-through' : 'none',
                    color: item.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                    fontWeight: item.completed ? 400 : 500,
                    fontSize: 14
                  }}>
                    {item.title}
                  </span>
                  {item.dueDate && (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Due: {formatDate(item.dueDate)}
                    </span>
                  )}
                  {item.assignedMemberName && (
                    <span className="badge" style={{ background: 'var(--bg-surface)', fontSize: 11 }}>
                      {item.assignedMemberName}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMMUNICATION PLAN */}
      {activeTab === 'comms' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Communication & Promotion Plan</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Scheduled social media posts, announcements, discord notices, and emails.
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/communication')}>
              View All Comms <ChevronRight size={14} />
            </button>
          </div>

          {(!event.comItems || event.comItems.length === 0) ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No communication posts scheduled for this event yet.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/communication')} style={{ marginTop: 8 }}>
                <Plus size={14} /> Create Communication Post
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {event.comItems.map(item => (
                <div
                  key={item.id}
                  style={{
                    padding: 16,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818CF8' }}>
                      {item.channel}
                    </span>
                    <CommStatusBadge status={item.status as any} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {item.phase} Phase
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 10px' }}>
                    "{item.content}"
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Date: {formatDate(item.scheduledDate)}</span>
                    {item.responsibleMemberName && <span>Owner: {item.responsibleMemberName}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: TASKS */}
      {activeTab === 'tasks' && (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Associated Tasks</h3>
              <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
                Operational deliverables assigned to club members for this event.
              </p>
            </div>
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks?eventId=${event.id}`)}>
              <Plus size={14} /> Add Event Task
            </button>
          </div>

          {(!event.tasks || event.tasks.length === 0) ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <p>No tasks specifically assigned to this event.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate(`/tasks?eventId=${event.id}`)} style={{ marginTop: 8 }}>
                <Plus size={14} /> Create Task
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {event.tasks.map(t => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '12px 16px',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/tasks`)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                      {t.title}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Due: {formatDate(t.dueDate)} • Assigned: {t.assignedUserName || 'Unassigned'}
                    </div>
                  </div>
                  <PriorityBadge priority={t.priority as any} />
                  <StatusBadge status={t.status as any} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Agenda Modal */}
      <Modal
        isOpen={agendaModalOpen}
        onClose={() => setAgendaModalOpen(false)}
        title="Add Agenda Item"
      >
        <form onSubmit={handleAddAgenda}>
          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Time Slot *
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. 14:00 - 14:30"
              value={agendaForm.time}
              onChange={e => setAgendaForm({ ...agendaForm, time: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Activity / Session Title *
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Opening Keynote & Team Introductions"
              value={agendaForm.title}
              onChange={e => setAgendaForm({ ...agendaForm, title: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Speaker / Session Lead
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Alex Morgan & Technical Dept"
              value={agendaForm.speaker}
              onChange={e => setAgendaForm({ ...agendaForm, speaker: e.target.value })}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Notes or Materials Required
            </label>
            <textarea
              className="input w-full"
              rows={3}
              placeholder="Projector setup, microphone testing, presentation slides..."
              value={agendaForm.notes}
              onChange={e => setAgendaForm({ ...agendaForm, notes: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setAgendaModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Item
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Checklist Modal */}
      <Modal
        isOpen={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        title="Add Preparation Item"
      >
        <form onSubmit={handleAddChecklist}>
          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Checklist Item *
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Book Main Auditorium and AV equipment"
              value={checklistForm.title}
              onChange={e => setChecklistForm({ ...checklistForm, title: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Target Due Date
            </label>
            <input
              type="date"
              className="input w-full"
              value={checklistForm.dueDate}
              onChange={e => setChecklistForm({ ...checklistForm, dueDate: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setChecklistModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add to Checklist
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
