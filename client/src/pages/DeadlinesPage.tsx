import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2, ArrowRight, Users, CheckSquare } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import ProgressBar from '../components/ui/ProgressBar';
import type { Task, Department } from '../lib/types';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../lib/utils';

interface DeadlineGroups {
  overdue: Task[];
  today: Task[];
  tomorrow: Task[];
  thisWeek: Task[];
  nextWeek: Task[];
  completed: Task[];
}

function TaskRow({ task, onStatusChange }: { task: Task; onStatusChange: () => void }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isCoordinator = user ? BOARD_ROLES.includes(user.role) : false;
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';
  const isAssigned = task.assignedMemberId === user?.id || (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(user?.id || ''));
  const canCheck = isCoordinator || isAssigned;

  const markComplete = async () => {
    if (!canCheck) {
      showToast('You can only complete tasks assigned to you.', 'error');
      return;
    }
    try {
      await api.patch(`/tasks/${task.id}`, { status: 'COMPLETED', progressPercent: 100 });
      showToast('Task marked as completed!', 'success');
      onStatusChange();
    } catch {
      showToast('Failed to update task.', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '12px 16px',
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 10,
      transition: 'all 0.15s ease',
      flexWrap: 'wrap'
    }}>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a', marginBottom: 3 }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.department && (
            <span style={{ fontSize: 12, color: '#475569', display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.department.color || '#0284c7' }} />
              {task.department.name}
            </span>
          )}

          {/* Multiple Assignees or Single Assignee */}
          {task.assignees && task.assignees.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                {task.assignees.slice(0, 3).map((a, idx) => (
                  <div key={a.id} style={{ marginLeft: idx > 0 ? -6 : 0, zIndex: 10 - idx }}>
                    <Avatar src={a.avatarUrl} name={a.name} size="xs" />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#475569' }}>
                {task.assignees.map(a => a.name.split(' ')[0]).join(' + ')}
              </span>
            </div>
          ) : task.assignee ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar src={task.assignee.avatarUrl} name={task.assignee.name} size="xs" />
              <span style={{ fontSize: 12, color: '#475569' }}>{task.assignee.name}</span>
            </div>
          ) : null}

          {task.deadline && (
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Due {formatDate(task.deadline)}
            </span>
          )}
        </div>
      </div>

      <div style={{ minWidth: 90 }}>
        <ProgressBar value={task.progressPercent} showLabel />
      </div>

      <PriorityBadge priority={task.priority} />
      <StatusBadge status={task.status} />

      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && canCheck && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: '#10B981', border: '1px solid rgba(16,185,129,0.3)', padding: '4px 8px' }}
          onClick={markComplete}
          title="Mark as completed"
        >
          <CheckCircle2 size={14} />
        </button>
      )}
    </div>
  );
}

interface SectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  tasks: Task[];
  refetch: () => void;
  defaultOpen?: boolean;
}

function DeadlineSection({ title, count, icon, color, tasks, refetch, defaultOpen = false }: SectionProps) {
  const [open, setOpen] = React.useState(defaultOpen || count > 0);

  if (count === 0) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px 0', width: '100%',
          marginBottom: open ? 10 : 0
        }}
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
      >
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0f172a' }}>{title}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{count} task{count !== 1 ? 's' : ''}</div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: `${color}18`,
          color,
          fontSize: 12,
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: 6,
        }}>{count}</div>
      </button>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => (
            <TaskRow key={t.id} task={t} onStatusChange={refetch} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DeadlinesPage() {
  const navigate = useNavigate();
  const { user, department } = useAuth();

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isCoordinator = user ? BOARD_ROLES.includes(user.role) : false;
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  // Tabs:
  // For managers: 'mine' (My Deadlines) vs 'dept' (Department Deadlines)
  // For board: 'all' (All Deadlines) vs 'mine' (My Deadlines)
  const [scopeTab, setScopeTab] = useState<'mine' | 'dept' | 'all'>(
    isManager ? 'mine' : 'all'
  );

  const queryUrl = scopeTab === 'mine' ? '/tasks/deadlines?view=mine' : '/tasks/deadlines';
  const { data, loading, refetch } = useFetch<DeadlineGroups>(queryUrl, [scopeTab]);

  const groups = data as DeadlineGroups | null;
  const deptName = department?.name || 'Department';

  return (
    <AppLayout title="Deadlines & Calendar" subtitle="Track all task due dates">
      {/* Scope Navigation Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: 10,
        marginBottom: 16
      }}>
        {isManager && (
          <>
            <button
              type="button"
              onClick={() => setScopeTab('mine')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: scopeTab === 'mine' ? '#0284c7' : '#f1f5f9',
                color: scopeTab === 'mine' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckSquare size={14} /> My Deadlines
            </button>
            <button
              type="button"
              onClick={() => setScopeTab('dept')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: scopeTab === 'dept' ? '#0284c7' : '#f1f5f9',
                color: scopeTab === 'dept' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} /> {deptName} Deadlines
            </button>
          </>
        )}

        {isCoordinator && (
          <>
            <button
              type="button"
              onClick={() => setScopeTab('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: scopeTab === 'all' ? '#0284c7' : '#f1f5f9',
                color: scopeTab === 'all' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <Users size={14} /> All Club Deadlines
            </button>
            <button
              type="button"
              onClick={() => setScopeTab('mine')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                border: 'none',
                background: scopeTab === 'mine' ? '#0284c7' : '#f1f5f9',
                color: scopeTab === 'mine' ? '#ffffff' : '#475569',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckSquare size={14} /> My Deadlines
            </button>
          </>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')} style={{ gap: 6 }}>
            All Tasks <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {!loading && groups && (
        <>
          <DeadlineSection
            title="Overdue"
            count={groups.overdue.length}
            icon={<AlertCircle size={16} color="#ef4444" />}
            color="#ef4444"
            tasks={groups.overdue}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Due Today"
            count={groups.today.length}
            icon={<Clock size={16} color="#f97316" />}
            color="#f97316"
            tasks={groups.today}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Due Tomorrow"
            count={groups.tomorrow.length}
            icon={<AlertTriangle size={16} color="#f59e0b" />}
            color="#f59e0b"
            tasks={groups.tomorrow}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="This Week"
            count={groups.thisWeek.length}
            icon={<Clock size={16} color="#10b981" />}
            color="#10b981"
            tasks={groups.thisWeek}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Next Week"
            count={groups.nextWeek.length}
            icon={<Clock size={16} color="#6366f1" />}
            color="#6366f1"
            tasks={groups.nextWeek}
            refetch={refetch}
          />
          <DeadlineSection
            title="Completed"
            count={groups.completed.length}
            icon={<CheckCircle2 size={16} color="#10b981" />}
            color="#10b981"
            tasks={groups.completed}
            refetch={refetch}
          />

          {Object.values(groups).every(g => g.length === 0) && (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: '#ffffff' }}>
              <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: '0 0 6px 0' }}>All clear!</h3>
              <p style={{ fontSize: 13, color: '#64748b', margin: '0 auto 16px', maxWidth: 360 }}>
                No active deadlines found under this view.
              </p>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
