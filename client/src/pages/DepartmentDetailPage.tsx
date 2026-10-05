import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckSquare, Calendar, Award,
  Clock, AlertCircle, ChevronRight, User, Plus
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Avatar from '../components/ui/Avatar';
import { RoleBadge, PriorityBadge, StatusBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../lib/utils';
import type { Department, User as TUser, Task, Event, Responsibility } from '../lib/types';

interface DeptDetailData {
  department: Department;
  leader: { id: string; name: string; email: string; avatarUrl: string } | null;
  members: Array<TUser & { activeTasksCount?: number; isOverloaded?: boolean }>;
  tasks: Task[];
  events: Event[];
  responsibilities: Responsibility[];
}

export default function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data, loading } = useFetch<DeptDetailData>(`/departments/${id}`);
  const [activeTab, setActiveTab] = useState<'members' | 'tasks' | 'responsibilities' | 'events'>('members');

  const dept = data?.department;
  const leader = data?.leader;
  const members = data?.members || [];
  const tasks = data?.tasks || [];
  const events = data?.events || [];
  const responsibilities = data?.responsibilities || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const overdueTasks = activeTasks.filter(t => t.deadline && t.deadline < todayStr);
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  if (loading) {
    return (
      <AppLayout title="Department Details">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />
        </div>
      </AppLayout>
    );
  }

  if (!dept) {
    return (
      <AppLayout title="Department Not Found">
        <div className="empty-state">
          <div className="empty-title">Department not found</div>
          <div className="empty-desc">The requested department could not be found.</div>
          <button className="btn btn-secondary" onClick={() => navigate('/departments')}>
            <ArrowLeft size={16} /> Back to Departments
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={dept.name} subtitle="Department Workspace">
      {/* Back button */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/departments')}>
          <ArrowLeft size={14} /> Back to Departments
        </button>
      </div>

      {/* Header Card */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24, borderTop: `4px solid ${dept.color || '#0284c7'}` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: dept.color }} />
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                {dept.name}
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', maxWidth: 640, lineHeight: 1.5 }}>
              {dept.description || 'Dedicated club operations and technical unit.'}
            </p>
          </div>

          {/* Department Leader card */}
          {leader ? (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
                background: 'var(--bg-elevated)', borderRadius: 12, border: '1px solid var(--border-subtle)',
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/team/${leader.id}`)}
              title="View Leader Profile"
            >
              <Avatar src={leader.avatarUrl} name={leader.name} size="md" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{leader.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department Leader</div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              No leader assigned
            </div>
          )}
        </div>
      </div>

      {/* Stats Counter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: dept.color }}>{members.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Team Members</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--cyan)' }}>{activeTasks.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Active Tasks</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: overdueTasks.length > 0 ? '#EF4444' : '#10B981' }}>
            {overdueTasks.length}
          </div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Overdue Tasks</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#10B981' }}>{completedTasks.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Completed Tasks</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>{events.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Owned Events</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 20, overflowX: 'auto', paddingBottom: 4
      }}>
        <button
          onClick={() => setActiveTab('members')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'members' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'members' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'members' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          👥 Team Members ({members.length})
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'tasks' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'tasks' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'tasks' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          📋 Active Tasks & Deadlines ({activeTasks.length})
        </button>
        <button
          onClick={() => setActiveTab('responsibilities')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'responsibilities' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'responsibilities' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'responsibilities' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          🎖️ Responsibilities ({responsibilities.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === 'events' ? 'var(--bg-elevated)' : 'transparent',
            color: activeTab === 'events' ? 'var(--cyan)' : 'var(--text-secondary)',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            borderBottom: activeTab === 'events' ? '2px solid var(--cyan)' : 'none'
          }}
        >
          📅 Events ({events.length})
        </button>
      </div>

      {/* Tab: Members */}
      {activeTab === 'members' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 14 }}>
          {members.map(m => (
            <div
              key={m.id}
              className="card"
              style={{ padding: '16px 18px', cursor: 'pointer' }}
              onClick={() => navigate(`/team/${m.id}`)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <Avatar src={m.avatarUrl} name={m.name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {m.position || 'Member'}
                  </div>
                </div>
                <RoleBadge role={m.role} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <span>Active tasks: {m.activeTasksCount ?? 0}</span>
                <span style={{ color: 'var(--cyan)', fontWeight: 600 }}>View Profile →</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Tasks */}
      {activeTab === 'tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">No tasks for this department</div>
              <div className="empty-desc">Create tasks and assign them to this department to track them here.</div>
            </div>
          ) : (
            tasks.map(t => {
              const isOverdue = t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline && t.deadline < todayStr;
              return (
                <div
                  key={t.id}
                  className="card"
                  style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'center',
                    gap: 14, flexWrap: 'wrap',
                    borderLeft: isOverdue ? '4px solid #EF4444' : undefined
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {t.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                      {t.deadline && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: isOverdue ? '#EF4444' : 'inherit', fontWeight: isOverdue ? 700 : 500 }}>
                          <Clock size={12} /> Due: {t.deadline} {isOverdue && '(Overdue)'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ minWidth: 100 }}>
                    <ProgressBar value={t.progressPercent ?? 0} showLabel />
                  </div>

                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Responsibilities */}
      {activeTab === 'responsibilities' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
          {responsibilities.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-title">No responsibilities assigned</div>
              <div className="empty-desc">Assign specific responsibilities to members of this department.</div>
            </div>
          ) : (
            responsibilities.map(r => (
              <div key={r.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <Award size={18} style={{ color: dept.color }} />
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                </div>
                {r.description && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>
                    {r.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Events */}
      {activeTab === 'events' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {events.length === 0 ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
              <div className="empty-title">No events for this department</div>
              <div className="empty-desc">Events where this department is responsible will appear here.</div>
            </div>
          ) : (
            events.map(e => (
              <div
                key={e.id}
                className="card"
                style={{ padding: '16px 18px', cursor: 'pointer' }}
                onClick={() => navigate(`/events/${e.id}`)}
              >
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{e.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  📅 {e.date} • 📍 {e.location}
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(2,132,199,0.12)', color: 'var(--cyan)'
                }}>
                  {e.eventType}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </AppLayout>
  );
}
