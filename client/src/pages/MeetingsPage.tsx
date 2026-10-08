import React, { useState } from 'react';
import {
  Calendar, Clock, Plus, Sparkles, CheckCircle2, ChevronDown, ChevronUp
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Modal from '../components/ui/Modal';
import confetti from 'canvas-confetti';

interface ActionItem {
  id: string;
  description: string;
  assignedMemberName?: string;
  dueDate?: string;
  convertedToTaskId?: string;
  completed?: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description?: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  attendeeNames?: string[];
  agenda?: string[];
  actionItems?: ActionItem[];
}

function MeetingsPage() {
  const { user } = useAuth();
  const canManage = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER';
  const { data: meetingsData, loading, refetch } = useFetch<Meeting[]>('/meetings');
  const meetings = meetingsData || [];

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '18:00',
    location: 'Discord Stage / Lab 304',
    description: '',
    agendaText: '1. Welcome & Announcements\n2. Department Progress Review\n3. Upcoming Event Logistics\n4. Open Discussion',
  });

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const agenda = form.agendaText.split('\n').filter(Boolean);
      await api.post('/meetings', {
        title: form.title,
        date: form.date,
        time: form.time,
        location: form.location,
        description: form.description,
        agenda,
        status: 'SCHEDULED',
      });
      setCreateModalOpen(false);
      setForm({
        title: '',
        date: new Date().toISOString().split('T')[0],
        time: '18:00',
        location: 'Discord Stage / Lab 304',
        description: '',
        agendaText: '1. Welcome & Announcements\n2. Department Progress Review\n3. Upcoming Event Logistics\n4. Open Discussion',
      });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to create meeting');
    }
  };

  const handleConvertToTask = async (meetingId: string, actionId: string) => {
    try {
      await api.post(`/meetings/${meetingId}/actions/${actionId}/convert-to-task`);
      confetti({ particleCount: 30, spread: 45, origin: { y: 0.7 } });
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to convert to task');
    }
  };

  return (
    <AppLayout
      title="Club Meetings & Agendas"
      subtitle="Coordinate executive syncs, department standups, and track action items"
      breadcrumbs={[{ label: 'Meetings' }]}
      actions={
        canManage ? (
          <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} /> Schedule Meeting
          </button>
        ) : undefined
      }
    >
      {/* Hero Banner */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ flex: '1 1 500px' }}>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
            Syncs & Minutes
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
            Track meeting discussions, action items, and converted tasks with clear ownership and deadlines.
          </p>
        </div>
      </div>

      {/* Meetings List */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Calendar size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No meetings scheduled yet.</p>
          {canManage && (
            <button className="btn btn-primary btn-sm" onClick={() => setCreateModalOpen(true)} style={{ marginTop: 8 }}>
              <Plus size={14} /> Schedule First Meeting
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {meetings.map(m => {
            const isExpanded = expandedId === m.id;
            return (
              <div
                key={m.id}
                className="glass-card"
                style={{
                  padding: 20,
                  border: isExpanded ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  transition: 'var(--transition)'
                }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                  onClick={() => setExpandedId(isExpanded ? null : m.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                      padding: '10px 14px',
                      background: 'rgba(0, 212, 255, 0.1)',
                      border: '1px solid rgba(0, 212, 255, 0.25)',
                      borderRadius: 10,
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        {new Date(m.date).toLocaleString('default', { month: 'short' })}
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--accent-primary)' }}>
                        {new Date(m.date).getDate()}
                      </div>
                    </div>

                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {m.title}
                      </h3>
                      <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        <span><Clock size={13} style={{ display: 'inline', verticalAlign: -2 }} /> {m.time}</span>
                        <span>{m.location}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="badge" style={{
                      background: m.status === 'COMPLETED' ? 'rgba(52, 211, 153, 0.15)' : 'rgba(0, 212, 255, 0.15)',
                      color: m.status === 'COMPLETED' ? '#34D399' : '#38BDF8'
                    }}>
                      {m.status}
                    </span>
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                    {m.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '0 0 16px', lineHeight: 1.5 }}>
                        {m.description}
                      </p>
                    )}

                    {/* Agendas */}
                    {m.agenda && m.agenda.length > 0 && (
                      <div style={{ marginBottom: 18 }}>
                        <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--accent-primary)' }}>
                          Agenda Topics
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {m.agenda.map((ag, i) => (
                            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', paddingLeft: 8 }}>
                              • {ag}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Items */}
                    <div>
                      <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: 'var(--accent-secondary)' }}>
                        Action Items & Deliverables
                      </h4>
                      {(!m.actionItems || m.actionItems.length === 0) ? (
                        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>No action items recorded.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {m.actionItems.map(act => (
                            <div
                              key={act.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '10px 14px',
                                background: 'var(--bg-elevated)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)'
                              }}
                            >
                              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                                {act.description}
                                {act.assignedMemberName && (
                                  <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                                    (Owner: {act.assignedMemberName})
                                  </span>
                                )}
                              </div>
                              {act.convertedToTaskId ? (
                                <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34D399' }}>
                                  <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> Linked Task
                                </span>
                              ) : (
                                canManage && (
                                  <button
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => handleConvertToTask(m.id, act.id)}
                                  >
                                    <Sparkles size={12} /> Convert to Task
                                  </button>
                                )
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Meeting Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Schedule Club Meeting"
      >
        <form onSubmit={handleCreateMeeting}>
          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Meeting Title *
            </label>
            <input
              type="text"
              className="input w-full"
              placeholder="e.g. Weekly Executive Coordination"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Date *
              </label>
              <input
                type="date"
                className="input w-full"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
                Time *
              </label>
              <input
                type="text"
                className="input w-full"
                value={form.time}
                onChange={e => setForm({ ...form, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Location / Link *
            </label>
            <input
              type="text"
              className="input w-full"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              required
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="text-sm font-semibold" style={{ display: 'block', marginBottom: 6 }}>
              Agenda Items (One per line)
            </label>
            <textarea
              className="input w-full"
              rows={4}
              value={form.agendaText}
              onChange={e => setForm({ ...form, agendaText: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Schedule Meeting
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}

export default MeetingsPage;
