import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CalendarDays, MapPin, Clock, ArrowLeft, CheckSquare,
  Plus, CheckCircle2, Circle, MessageSquare, AlertCircle,
  Users, Trash2, Edit2, ChevronDown, ChevronUp, Share2,
  Calendar, Layers, Sparkles
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge, RoleBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import { formatDate } from '../lib/utils';
import confetti from 'canvas-confetti';
import type { Event, Task, User as TUser, Department, AgendaSection, AgendaItem, CommunicationItem } from '../lib/types';

interface EventDetailResponse {
  event: Event & {
    department?: Department | null;
    organizer?: { id: string; name: string; avatarUrl: string } | null;
    responsibleMembers?: Array<{ id: string; name: string; role: string; avatarUrl: string; email: string }>;
    progressPercent?: number;
  };
  agendaSections: AgendaSection[];
  unsectionedAgenda: AgendaItem[];
  agenda: AgendaItem[];
  tasks: Task[];
  communicationPlan?: {
    id: string;
    title: string;
    items?: CommunicationItem[];
  } | null;
  activity: any[];
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();

  const canEdit = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER' || user?.role === 'MANAGER';

  const { data, loading, refetch } = useFetch<EventDetailResponse>(`/events/${id}`);
  const { data: allMembers } = useFetch<TUser[]>('/users?status=active');

  const [activeTab, setActiveTab] = useState<'overview' | 'agenda' | 'preparation' | 'communication' | 'people'>('overview');

  // Agenda Section modal
  const [sectionModalOpen, setSectionModalOpen] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    title: '',
    description: '',
    timing: '',
    duration: '',
    responsiblePerson: '',
    notes: '',
  });

  // Agenda Item modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [itemForm, setItemForm] = useState({
    title: '',
    description: '',
    duration: '',
    startTime: '',
    responsiblePerson: '',
    notes: '',
  });

  // Preparation Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignedMemberId: '',
    priority: 'MEDIUM',
    deadline: '',
  });

  // Communication Publication modal
  const [commModalOpen, setCommModalOpen] = useState(false);
  const [commForm, setCommForm] = useState({
    title: '',
    contentType: 'POST',
    channel: 'INSTAGRAM',
    publicationDate: '',
    publicationTime: '18:00',
    responsiblePersonId: '',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  const event = data?.event;
  const sections = data?.agendaSections || [];
  const unsectioned = data?.unsectionedAgenda || [];
  const tasks = data?.tasks || [];
  const comPlan = data?.communicationPlan;
  const comItems = comPlan?.items || [];
  const responsibleMembers = event?.responsibleMembers || [];

  // Mascot selector
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

  // Section Handlers
  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionForm.title.trim()) {
      showToast('Section title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/events/${id}/sections`, sectionForm);
      showToast('Agenda section created', 'success');
      setSectionModalOpen(false);
      setSectionForm({ title: '', description: '', timing: '', duration: '', responsiblePerson: '', notes: '' });
      refetch();
    } catch {
      showToast('Failed to create agenda section', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSection = async (secId: string) => {
    if (!confirm('Delete this section and its agenda items?')) return;
    try {
      await api.delete(`/events/${id}/sections/${secId}`);
      showToast('Section removed', 'success');
      refetch();
    } catch {
      showToast('Failed to remove section', 'error');
    }
  };

  // Item Handlers
  const openAddItemModal = (secId: string = '') => {
    setSelectedSectionId(secId);
    setItemForm({ title: '', description: '', duration: '', startTime: '', responsiblePerson: '', notes: '' });
    setItemModalOpen(true);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.title.trim()) {
      showToast('Item title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/events/${id}/agenda`, {
        ...itemForm,
        sectionId: selectedSectionId || null,
      });
      showToast('Agenda item added to Run-of-Show', 'success');
      setItemModalOpen(false);
      refetch();
    } catch {
      showToast('Failed to add agenda item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this agenda item?')) return;
    try {
      await api.delete(`/events/${id}/agenda/${itemId}`);
      showToast('Item removed', 'success');
      refetch();
    } catch {
      showToast('Failed to remove item', 'error');
    }
  };

  // Preparation Task Handlers
  const handleAddPreparationTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title.trim()) {
      showToast('Task title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        assignedMemberId: taskForm.assignedMemberId || null,
        departmentId: event?.responsibleDepartmentId || null,
        priority: taskForm.priority,
        deadline: taskForm.deadline || event?.date,
        eventId: id,
        status: 'TODO'
      });
      showToast('Preparation task added', 'success');
      setTaskModalOpen(false);
      setTaskForm({ title: '', description: '', assignedMemberId: '', priority: 'MEDIUM', deadline: '' });
      refetch();
    } catch {
      showToast('Failed to add preparation task', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTask = async (task: Task) => {
    const isDone = task.status === 'COMPLETED';
    const nextStatus = isDone ? 'TODO' : 'COMPLETED';
    try {
      await api.patch(`/tasks/${task.id}`, { status: nextStatus });
      if (!isDone) {
        confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
      }
      refetch();
    } catch {
      showToast('Failed to update task status', 'error');
    }
  };

  // Communication Handlers
  const handleAddComm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commForm.title.trim() || !commForm.publicationDate) {
      showToast('Title and publication date are required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/communication', {
        ...commForm,
        eventId: id,
        status: 'PLANNED'
      });
      showToast('Publication item added to plan', 'success');
      setCommModalOpen(false);
      refetch();
    } catch {
      showToast('Failed to add publication item', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Event Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 200, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 350, borderRadius: 16 }} />
        </div>
      </AppLayout>
    );
  }

  if (!event) {
    return (
      <AppLayout title="Event Not Found">
        <div className="empty-state">
          <AlertCircle size={48} style={{ color: '#EF4444', marginBottom: 12 }} />
          <div className="empty-title">Event not found</div>
          <div className="empty-desc">The requested event could not be found or was removed.</div>
          <button className="btn btn-secondary" onClick={() => navigate('/events')} style={{ marginTop: 16 }}>
            <ArrowLeft size={16} /> Back to Events
          </button>
        </div>
      </AppLayout>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const readinessPercent = tasks.length > 0 ? Math.round((completedTasks.length / tasks.length) * 100) : (event.status === 'COMPLETED' ? 100 : 0);

  return (
    <AppLayout
      title={event.name}
      subtitle={`${formatDate(event.date)} • ${event.location}`}
    >
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')}>
          <ArrowLeft size={14} /> Back to Events
        </button>
      </div>

      {/* Hero Overview Banner */}
      <div className="card" style={{
        padding: '24px 28px',
        marginBottom: 20,
        background: 'linear-gradient(135deg, #09304a 0%, #061d2d 100%)',
        color: '#ffffff',
        border: '1.5px solid rgba(255,255,255,0.12)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              <span className="badge" style={{ background: 'rgba(56,189,248,0.2)', color: '#38BDF8', border: '1px solid rgba(56,189,248,0.4)', fontWeight: 700 }}>
                {event.eventType}
              </span>
              <span className="badge" style={{ background: 'rgba(16,185,129,0.2)', color: '#34D399', border: '1px solid rgba(16,185,129,0.4)', fontWeight: 700 }}>
                {event.status}
              </span>
              {event.department && (
                <span className="badge" style={{ background: `${event.department.color}25`, color: event.department.color, border: `1px solid ${event.department.color}50` }}>
                  {event.department.name}
                </span>
              )}
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 10px', color: '#ffffff' }}>
              {event.name}
            </h1>

            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.6, maxWidth: 650 }}>
              {event.description || 'ByteCraft official club activation.'}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CalendarDays size={15} style={{ color: '#38BDF8' }} />
                <span style={{ color: '#ffffff', fontWeight: 600 }}>{formatDate(event.date)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={15} style={{ color: '#FBBF24' }} />
                <span>{event.startTime} {event.endTime ? `– ${event.endTime}` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={15} style={{ color: '#F472B6' }} />
                <span>{event.location}</span>
              </div>
              {event.organizer && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Avatar src={event.organizer.avatarUrl} name={event.organizer.name} size="xs" />
                  <span>Lead: <strong style={{ color: '#ffffff' }}>{event.organizer.name}</strong></span>
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 12,
            border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <img
              src={getMascot(event.eventType, event.department?.name)}
              alt="ByteCraft Mascot"
              style={{ width: 110, height: 110, objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Readiness Bar */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
            <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              Event Preparation Progress ({completedTasks.length} / {tasks.length} tasks ready)
            </span>
            <span style={{ fontWeight: 800, color: '#38BDF8' }}>
              {readinessPercent}%
            </span>
          </div>
          <ProgressBar value={readinessPercent} height={8} />
        </div>
      </div>

      {/* Five-Section Tabs Navigation */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 20, overflowX: 'auto', paddingBottom: 4
      }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'overview' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'overview' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'overview' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          📌 Overview
        </button>
        <button
          onClick={() => setActiveTab('agenda')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'agenda' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'agenda' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'agenda' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          ⏱️ Run-of-Show Agenda ({sections.length} sections)
        </button>
        <button
          onClick={() => setActiveTab('preparation')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'preparation' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'preparation' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'preparation' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          ☑️ Preparation Tasks ({tasks.length})
        </button>
        <button
          onClick={() => setActiveTab('communication')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'communication' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'communication' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'communication' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          📢 Communication Plan ({comItems.length})
        </button>
        <button
          onClick={() => setActiveTab('people')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'people' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'people' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'people' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          👥 People & Roles ({responsibleMembers.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Event Operational Specs</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
              <div><strong>Expected Attendance:</strong> {event.expectedParticipants || 150} participants</div>
              <div><strong>Lead Department:</strong> {event.department?.name || 'External Relations'}</div>
              <div><strong>Venue:</strong> {event.location}</div>
              <div><strong>Date & Timings:</strong> {formatDate(event.date)} ({event.startTime} - {event.endTime || 'Wrap up'})</div>
              {event.notes && <div><strong>Coordination Notes:</strong> {event.notes}</div>}
            </div>
          </div>

          <div className="card" style={{ padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>Key Milestones</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Run-of-Show Program</span>
                <span className="badge" style={{ background: sections.length > 0 ? '#dcfce7' : '#fef3c7', color: sections.length > 0 ? '#15803d' : '#92400e' }}>
                  {sections.length > 0 ? `${sections.length} Sections Ready` : 'Needs Setup'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Pre-Event Preparation</span>
                <span className="badge" style={{ background: completedTasks.length === tasks.length && tasks.length > 0 ? '#dcfce7' : '#dbeafe', color: '#1e40af' }}>
                  {completedTasks.length} / {tasks.length} Tasks Done
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span>Publication Schedule</span>
                <span className="badge" style={{ background: comItems.length > 0 ? '#dcfce7' : '#f1f5f9', color: '#334155' }}>
                  {comItems.length} Publications Planned
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RUN-OF-SHOW AGENDA */}
      {activeTab === 'agenda' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Event Run-of-Show</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Exact sequence of what happens during the event, ordered by section and responsibilities.
              </p>
            </div>
            {canEdit && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => openAddItemModal()}>
                  <Plus size={14} /> Add Item
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setSectionModalOpen(true)}>
                  <Layers size={14} /> New Section
                </button>
              </div>
            )}
          </div>

          {sections.length === 0 && unsectioned.length === 0 ? (
            <div className="empty-state">
              <Clock size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div className="empty-title">No run-of-show sections created yet</div>
              <div className="empty-desc">Create your first agenda section (e.g. "30 minutes before", "1. Opening", "2. Game")</div>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => setSectionModalOpen(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Create First Section
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {sections.map((sec, secIdx) => (
                <div
                  key={sec.id}
                  className="card"
                  style={{
                    border: '1.5px solid var(--border-subtle)',
                    borderRadius: 14,
                    overflow: 'hidden'
                  }}
                >
                  {/* Section Header */}
                  <div style={{
                    padding: '14px 18px',
                    background: 'var(--bg-elevated)',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: '50%',
                        background: 'rgba(2,132,199,0.15)', color: 'var(--cyan)',
                        fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>
                        {sec.order || secIdx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text-primary)' }}>
                          {sec.title}
                        </div>
                        {sec.description && (
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {sec.description}
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {sec.timing && (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#F59E0B', background: 'rgba(245,158,11,0.12)', padding: '3px 8px', borderRadius: 6 }}>
                          ⏱️ {sec.timing}
                        </span>
                      )}
                      {sec.responsiblePerson && (
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                          Lead: {sec.responsiblePerson}
                        </span>
                      )}
                      {canEdit && (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openAddItemModal(sec.id)}
                            title="Add item to this section"
                          >
                            <Plus size={12} /> Add Item
                          </button>
                          <button
                            className="btn btn-ghost btn-icon btn-sm"
                            style={{ color: '#EF4444' }}
                            onClick={() => handleDeleteSection(sec.id)}
                            title="Delete section"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section Items */}
                  <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {(!sec.items || sec.items.length === 0) ? (
                      <div style={{ padding: '12px 0', fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        No specific items in this section. Click "+ Add Item" above to add run-of-show details.
                      </div>
                    ) : (
                      sec.items.map((it, itIdx) => (
                        <div
                          key={it.id}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: '#ffffff',
                            borderRadius: 10,
                            border: '1px solid var(--border-subtle)',
                            gap: 12
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
                            <div style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: 'var(--cyan)', marginTop: 6, flexShrink: 0
                            }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
                                {it.title}
                              </div>
                              {it.description && (
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                                  {it.description}
                                </div>
                              )}
                              <div style={{ display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
                                {it.duration && <span>Duration: <strong>{it.duration}</strong></span>}
                                {it.responsiblePerson && <span>Responsible: <strong>{it.responsiblePerson}</strong></span>}
                                {it.notes && <span>Note: {it.notes}</span>}
                              </div>
                            </div>
                          </div>

                          {canEdit && (
                            <button
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: '#EF4444' }}
                              onClick={() => handleDeleteItem(it.id)}
                              title="Remove item"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}

              {/* Unsectioned Items if any */}
              {unsectioned.length > 0 && (
                <div className="card" style={{ padding: '16px 20px' }}>
                  <h4 style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 700 }}>General / Unsectioned Items</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {unsectioned.map(it => (
                      <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{it.title}</div>
                          {it.responsiblePerson && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{it.responsiblePerson}</div>}
                        </div>
                        {canEdit && (
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#EF4444' }} onClick={() => handleDeleteItem(it.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PREPARATION TASKS */}
      {activeTab === 'preparation' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Event Preparation Tasks</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Checklist and organizational tasks required before the event starts (venue, badges, tech tests, swag).
              </p>
            </div>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setTaskModalOpen(true)}>
                <Plus size={14} /> Add Preparation Task
              </button>
            )}
          </div>

          {tasks.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div className="empty-title">No preparation tasks created yet</div>
              <div className="empty-desc">Create tasks like "Print badges", "Test sound equipment", "Prepare gift kits" for this event.</div>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => setTaskModalOpen(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Add First Preparation Task
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tasks.map(t => {
                const isCompleted = t.status === 'COMPLETED';
                return (
                  <div
                    key={t.id}
                    className="card"
                    style={{
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      background: isCompleted ? 'rgba(16,185,129,0.04)' : '#ffffff',
                      borderLeft: isCompleted ? '4px solid #10B981' : '4px solid #F59E0B'
                    }}
                  >
                    <button
                      onClick={() => handleToggleTask(t)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      title={isCompleted ? 'Mark not completed' : 'Mark completed'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 size={20} style={{ color: '#10B981' }} />
                      ) : (
                        <Circle size={20} style={{ color: '#94A3B8' }} />
                      )}
                    </button>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{
                        fontWeight: 600, fontSize: 14,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-primary)'
                      }}>
                        {t.title}
                      </div>
                      {t.description && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {t.description}
                        </div>
                      )}
                    </div>

                    {t.deadline && (
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} /> Due: {t.deadline}
                      </span>
                    )}

                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: COMMUNICATION PLAN */}
      {activeTab === 'communication' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>Communication & Publication Schedule</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                Exact publications, social media posts, and announcements scheduled for this event.
              </p>
            </div>
            {canEdit && (
              <button className="btn btn-primary btn-sm" onClick={() => setCommModalOpen(true)}>
                <Plus size={14} /> Add Publication
              </button>
            )}
          </div>

          {comItems.length === 0 ? (
            <div className="empty-state">
              <MessageSquare size={36} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
              <div className="empty-title">No communication items scheduled</div>
              <div className="empty-desc">Plan Instagram announcements, reminder emails, teaser stories, and recap posts.</div>
              {canEdit && (
                <button className="btn btn-primary btn-sm" onClick={() => setCommModalOpen(true)} style={{ marginTop: 8 }}>
                  <Plus size={14} /> Schedule First Post
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {comItems.map(item => (
                <div
                  key={item.id}
                  className="card"
                  style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                      Platform: <strong>{item.channel || (item as any).platform}</strong> • Scheduled for: <strong>{item.publicationDate} {(item as any).publicationTime}</strong>
                    </div>
                  </div>

                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9' }}>
                    {(item as any).contentType || 'POST'}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: PEOPLE */}
      {activeTab === 'people' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {/* Organizer */}
          {event.organizer && (
            <div className="card" style={{ padding: '16px 18px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 8 }}>
                Lead Organizer
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={event.organizer.avatarUrl} name={event.organizer.name} size="md" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{event.organizer.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Project Lead</div>
                </div>
              </div>
            </div>
          )}

          {/* Department */}
          {event.department && (
            <div className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${event.department.color}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: event.department.color, textTransform: 'uppercase', marginBottom: 8 }}>
                Responsible Department
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{event.department.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Event Owner Squad</div>
            </div>
          )}

          {/* Crew members */}
          {responsibleMembers.map(m => (
            <div
              key={m.id}
              className="card"
              style={{ padding: '16px 18px', cursor: 'pointer' }}
              onClick={() => navigate(`/team/${m.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar src={m.avatarUrl} name={m.name} size="md" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{m.role}</div>
                </div>
                <RoleBadge role={m.role} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Section */}
      <Modal
        isOpen={sectionModalOpen}
        onClose={() => setSectionModalOpen(false)}
        title="Add Run-of-Show Section"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setSectionModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddSection} disabled={saving}>
              {saving ? 'Creating…' : 'Create Section'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Section Title *</label>
            <input
              className="form-input"
              placeholder="e.g. 30 minutes before the event, 1. Opening, 2. Game"
              value={sectionForm.title}
              onChange={e => setSectionForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Relative Timing / Approximate Clock (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. 30 mins before, 13:30 - 14:00, During break"
              value={sectionForm.timing}
              onChange={e => setSectionForm(p => ({ ...p, timing: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Lead / Responsible Person (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Animation Team, President, Department Leads"
              value={sectionForm.responsiblePerson}
              onChange={e => setSectionForm(p => ({ ...p, responsiblePerson: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Overview of this phase..."
              value={sectionForm.description}
              onChange={e => setSectionForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Add Agenda Item */}
      <Modal
        isOpen={itemModalOpen}
        onClose={() => setItemModalOpen(false)}
        title="Add Run-of-Show Item"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setItemModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddItem} disabled={saving}>
              {saving ? 'Adding…' : 'Add Item'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Target Section</label>
            <select
              className="form-select"
              value={selectedSectionId}
              onChange={e => setSelectedSectionId(e.target.value)}
            >
              <option value="">General / Standalone</option>
              {sections.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Item Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Mini games for early arrivals, President's speech"
              value={itemForm.title}
              onChange={e => setItemForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Expected Duration / Timing (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. 10 min, 14:15"
              value={itemForm.duration}
              onChange={e => setItemForm(p => ({ ...p, duration: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Responsible Person (Optional)</label>
            <input
              className="form-input"
              placeholder="e.g. Animator, Sarah, Yassine"
              value={itemForm.responsiblePerson}
              onChange={e => setItemForm(p => ({ ...p, responsiblePerson: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Instructions (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Specific run-of-show details or cues..."
              value={itemForm.description}
              onChange={e => setItemForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Modal: Add Preparation Task */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        title="Add Event Preparation Task"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setTaskModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddPreparationTask} disabled={saving}>
              {saving ? 'Creating…' : 'Add Task'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Print member badges, Test sound system, Prepare gifts"
              value={taskForm.title}
              onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Member</label>
            <select
              className="form-select"
              value={taskForm.assignedMemberId}
              onChange={e => setTaskForm(p => ({ ...p, assignedMemberId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {(allMembers || []).map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Deadline</label>
            <input
              type="date"
              className="form-input"
              value={taskForm.deadline || event.date}
              onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={taskForm.priority}
              onChange={e => setTaskForm(p => ({ ...p, priority: e.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Modal: Add Communication Publication */}
      <Modal
        isOpen={commModalOpen}
        onClose={() => setCommModalOpen(false)}
        title="Schedule Event Publication"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCommModalOpen(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddComm} disabled={saving}>
              {saving ? 'Scheduling…' : 'Schedule Publication'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Publication Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Welcome Day Official Announcement Poster"
              value={commForm.title}
              onChange={e => setCommForm(p => ({ ...p, title: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Platform</label>
              <select
                className="form-select"
                value={commForm.channel}
                onChange={e => setCommForm(p => ({ ...p, channel: e.target.value }))}
              >
                <option value="INSTAGRAM">Instagram</option>
                <option value="FACEBOOK">Facebook</option>
                <option value="TIKTOK">TikTok</option>
                <option value="LINKEDIN">LinkedIn</option>
                <option value="DISCORD">Discord</option>
                <option value="EMAIL">Email</option>
                <option value="WHATSAPP">WhatsApp</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Content Type</label>
              <select
                className="form-select"
                value={commForm.contentType}
                onChange={e => setCommForm(p => ({ ...p, contentType: e.target.value }))}
              >
                <option value="POST">Post</option>
                <option value="STORY">Story</option>
                <option value="REEL">Reel</option>
                <option value="VIDEO">Video</option>
                <option value="ANNOUNCEMENT">Announcement</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Publication Date *</label>
              <input
                type="date"
                className="form-input"
                value={commForm.publicationDate}
                onChange={e => setCommForm(p => ({ ...p, publicationDate: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Publication Time</label>
              <input
                type="time"
                className="form-input"
                value={commForm.publicationTime}
                onChange={e => setCommForm(p => ({ ...p, publicationTime: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
