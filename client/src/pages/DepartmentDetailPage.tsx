import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckSquare, Calendar,
  Clock, AlertCircle, Plus, CheckCircle2,
  Phone, Mail, ChevronRight, Briefcase
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Avatar from '../components/ui/Avatar';
import TaskItem from '../components/common/TaskItem';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../lib/utils';
import type { Department, User as TUser, Task, Event, Responsibility } from '../lib/types';
import api from '../lib/api';

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
  const { showToast } = useToast();

  const { data, loading, refetch } = useFetch<DeptDetailData>(`/departments/${id}`);
  const [activeTab, setActiveTab] = useState<'department-tasks' | 'my-tasks' | 'deadlines' | 'managers' | 'events'>('department-tasks');
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  const dept = data?.department;
  const managers = data?.members || [];
  const tasks = data?.tasks || [];
  const events = data?.events || [];

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED'), [tasks]);
  const completedTasks = useMemo(() => tasks.filter(t => t.status === 'COMPLETED'), [tasks]);
  const overdueTasks = useMemo(() => activeTasks.filter(t => t.deadline && t.deadline < todayStr), [activeTasks, todayStr]);

  // Tasks assigned to logged in user
  const myTasks = useMemo(() => {
    if (!user) return [];
    return tasks.filter(t => {
      if (t.assignedMemberId === user.id) return true;
      if (Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.includes(user.id)) return true;
      return false;
    });
  }, [tasks, user]);

  // Upcoming deadlines sorted
  const upcomingDeadlines = useMemo(() => {
    return [...activeTasks].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return a.deadline.localeCompare(b.deadline);
    });
  }, [activeTasks]);

  const handleToggleTask = async (task: Task) => {
    const isAssigned = task.assignedMemberId === user?.id || (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(user?.id || ''));
    const isBoard = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'].includes(user?.role || '');
    const canCheck = isBoard || isAssigned || (user?.departmentId === dept?.id);

    if (!canCheck) {
      showToast('You can only check tasks in your department or assigned to you.', 'error');
      return;
    }

    const isDone = task.status === 'COMPLETED';
    setTogglingTaskId(task.id);
    try {
      await api.patch(`/tasks/${task.id}`, {
        status: isDone ? 'TODO' : 'COMPLETED',
        progressPercent: isDone ? 0 : 100
      });
      showToast(isDone ? 'Task marked as pending' : 'Task marked as completed', 'success');
      refetch();
    } catch {
      showToast('Failed to update task status.', 'error');
    } finally {
      setTogglingTaskId(null);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Department Workspace">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="skeleton" style={{ height: 120, borderRadius: 12 }} />
          <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        </div>
      </AppLayout>
    );
  }

  if (!dept) {
    return (
      <AppLayout title="Department Not Found">
        <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 12 }}>
          <AlertCircle size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Department Not Found</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 auto 16px', maxWidth: 360 }}>
            The requested department does not exist or has been archived.
          </p>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/departments')} style={{ margin: '0 auto' }}>
            <ArrowLeft size={14} /> Back to Departments
          </button>
        </div>
      </AppLayout>
    );
  }

  const deptColor = dept.color || '#3b82f6';

  return (
    <AppLayout
      title={`${dept.name}`}
      subtitle="Department Workspace"
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/departments')} style={{ gap: 6, padding: '6px 12px', fontSize: 12.5 }}>
            <ArrowLeft size={14} /> Departments
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate(`/tasks?action=new&departmentId=${dept.id}`)}
            style={{ gap: 6, padding: '6px 12px', fontSize: 12.5 }}
          >
            <Plus size={14} /> New Task
          </button>
        </div>
      }
    >
      <style>{`
        .dept-detail-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }
        @media (max-width: 640px) {
          .dept-detail-metrics {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
        }
        .dept-metric-chip {
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px 14px;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .dept-metric-chip:hover {
          border-color: rgba(255, 255, 255, 0.16);
          background: #161619;
        }
        .dept-metric-chip.active {
          border-color: var(--accent-primary);
          background: rgba(37, 99, 235, 0.08);
        }
        .dept-tabs-bar {
          display: flex;
          gap: 4px;
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 4px;
          margin-bottom: 16px;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .dept-tabs-bar::-webkit-scrollbar { display: none; }
        .dept-tab-btn {
          flex: 1;
          min-width: 100px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          border-radius: 7px;
          border: none;
          font-size: 12.5px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.12s ease;
          white-space: nowrap;
          color: var(--text-muted);
          background: transparent;
        }
        .dept-tab-btn.active {
          background: var(--accent-primary);
          color: #ffffff;
          font-weight: 600;
        }
        .manager-card-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 12px;
        }
        @media (max-width: 640px) {
          .manager-card-grid { grid-template-columns: 1fr; }
        }
        .manager-card-item {
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 14px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.12s ease;
        }
        .manager-card-item:hover {
          border-color: rgba(255, 255, 255, 0.16);
          background: #161619;
        }
      `}</style>

      {/* Department Summary Header Card */}
      <div style={{
        background: '#121214',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '18px 20px',
        marginBottom: 16,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: deptColor }} />
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Department Unit
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
              {dept.name}
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.5, maxWidth: 650 }}>
              {dept.description || 'Department coordination unit handling deliverables and operations.'}
            </p>
          </div>

          {/* Department Managers Avatars Group */}
          {managers.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Managers ({managers.length})
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {managers.map(m => (
                  <div
                    key={m.id}
                    title={`${m.name} (${m.position || 'Manager'})`}
                    onClick={() => navigate(`/team/${m.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Avatar src={m.avatarUrl} name={m.name} size="md" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 4 Metric Chips */}
      <div className="dept-detail-metrics">
        <div
          onClick={() => setActiveTab('department-tasks')}
          className={`dept-metric-chip ${activeTab === 'department-tasks' ? 'active' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)' }}>Active Tasks</span>
            <CheckSquare size={14} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{activeTasks.length}</div>
        </div>

        <div
          className="dept-metric-chip"
          onClick={() => setActiveTab('department-tasks')}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)' }}>Completed</span>
            <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{completedTasks.length}</div>
        </div>

        <div
          onClick={() => setActiveTab('deadlines')}
          className={`dept-metric-chip ${activeTab === 'deadlines' ? 'active' : ''}`}
          style={{
            borderColor: overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.25)' : undefined,
            background: overdueTasks.length > 0 ? 'rgba(239, 68, 68, 0.04)' : undefined,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: overdueTasks.length > 0 ? '#f87171' : 'var(--text-muted)' }}>Overdue</span>
            <AlertCircle size={14} style={{ color: overdueTasks.length > 0 ? '#ef4444' : 'var(--text-muted)' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: overdueTasks.length > 0 ? '#ef4444' : 'var(--text-primary)' }}>
            {overdueTasks.length}
          </div>
        </div>

        <div
          onClick={() => setActiveTab('managers')}
          className={`dept-metric-chip ${activeTab === 'managers' ? 'active' : ''}`}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)' }}>Managers</span>
            <Users size={14} style={{ color: 'var(--text-secondary)' }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{managers.length}</div>
        </div>
      </div>

      {/* Clean Tab Segment Bar */}
      <div className="dept-tabs-bar">
        <button
          type="button"
          onClick={() => setActiveTab('department-tasks')}
          className={`dept-tab-btn ${activeTab === 'department-tasks' ? 'active' : ''}`}
        >
          <CheckSquare size={13} /> Tasks ({tasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my-tasks')}
          className={`dept-tab-btn ${activeTab === 'my-tasks' ? 'active' : ''}`}
        >
          <Users size={13} /> My Tasks ({myTasks.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('deadlines')}
          className={`dept-tab-btn ${activeTab === 'deadlines' ? 'active' : ''}`}
        >
          <Clock size={13} /> Deadlines ({upcomingDeadlines.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('managers')}
          className={`dept-tab-btn ${activeTab === 'managers' ? 'active' : ''}`}
        >
          <Briefcase size={13} /> Managers ({managers.length})
        </button>

        {events.length > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('events')}
            className={`dept-tab-btn ${activeTab === 'events' ? 'active' : ''}`}
          >
            <Calendar size={13} /> Events ({events.length})
          </button>
        )}
      </div>

      {/* Tab Content */}
      {/* TAB 1: Department Tasks */}
      {activeTab === 'department-tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#121214', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10 }}>
              <CheckSquare size={26} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No tasks in this department</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                Add tasks to start coordinating deliverables.
              </div>
            </div>
          ) : (
            tasks.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                onToggleDone={handleToggleTask}
                canToggle={true}
                isToggling={togglingTaskId === t.id}
                showAssignee={true}
                showDepartment={false}
                showDeadline={true}
              />
            ))
          )}
        </div>
      )}

      {/* TAB 2: My Tasks */}
      {activeTab === 'my-tasks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {myTasks.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#121214', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10 }}>
              <CheckSquare size={26} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No tasks assigned to you</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                You do not have tasks directly assigned to you in this department.
              </div>
            </div>
          ) : (
            myTasks.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                onToggleDone={handleToggleTask}
                canToggle={true}
                isToggling={togglingTaskId === t.id}
                showAssignee={true}
                showDepartment={false}
                showDeadline={true}
              />
            ))
          )}
        </div>
      )}

      {/* TAB 3: Upcoming Deadlines */}
      {activeTab === 'deadlines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {upcomingDeadlines.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', background: '#121214', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 10 }}>
              <Clock size={26} style={{ margin: '0 auto 8px', color: 'var(--text-muted)' }} />
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No upcoming deadlines</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                All department deliverables are on schedule.
              </div>
            </div>
          ) : (
            upcomingDeadlines.map(t => {
              const isOverdue = !!(t.deadline && t.deadline < todayStr);
              return (
                <div
                  key={t.id}
                  style={{
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    background: '#121214',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: 9,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</div>
                    {t.description && (
                      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{t.description}</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {t.assignees && t.assignees.length > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Avatar src={t.assignees[0].avatarUrl} name={t.assignees[0].name} size="xs" />
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>
                          {t.assignees.map(a => a.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>
                    ) : t.assignee ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Avatar src={t.assignee.avatarUrl} name={t.assignee.name} size="xs" />
                        <span style={{ fontSize: 11.5, color: 'var(--text-secondary)' }}>{t.assignee.name}</span>
                      </div>
                    ) : (
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Unassigned</span>
                    )}

                    <span style={{
                      padding: '3px 8px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 600,
                      background: isOverdue ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255, 255, 255, 0.04)',
                      color: isOverdue ? '#f87171' : 'var(--text-muted)',
                      border: isOverdue ? '1px solid rgba(239, 68, 68, 0.25)' : '1px solid rgba(255, 255, 255, 0.08)',
                    }}>
                      {t.deadline ? formatDate(t.deadline) : 'No date'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 4: Department Managers Directory */}
      {activeTab === 'managers' && (
        <div className="manager-card-grid">
          {managers.map(m => (
            <div
              key={m.id}
              className="manager-card-item"
              onClick={() => navigate(`/team/${m.id}`)}
            >
              <Avatar src={m.avatarUrl} name={m.name} size="md" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.name}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                  {m.position || 'Department Manager'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }} onClick={e => e.stopPropagation()}>
                  {m.phone && (
                    <a
                      href={`tel:${m.phone}`}
                      style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                      title={m.phone}
                    >
                      <Phone size={11} style={{ color: '#94a3b8' }} /> {m.phone}
                    </a>
                  )}
                  {m.email && (
                    <a
                      href={`mailto:${m.email}`}
                      style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3, textDecoration: 'none' }}
                      title={m.email}
                    >
                      <Mail size={11} />
                    </a>
                  )}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: Events */}
      {activeTab === 'events' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {events.map(e => (
            <div
              key={e.id}
              style={{
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: '#121214',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 10,
                cursor: 'pointer'
              }}
              onClick={() => navigate(`/events/${e.id}`)}
            >
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{e.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>
                  {formatDate(e.date)} · {e.location || 'ESTIN Campus'}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: 4 }}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
