import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, AlertTriangle, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Avatar from '../components/ui/Avatar';
import ProgressBar from '../components/ui/ProgressBar';
import type { Task } from '../lib/types';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

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

  const isCoordinator = user?.role === 'COORDINATOR';
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';
  const canCheck = isCoordinator || (isManager && task.assignedMemberId === user?.id);

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
      background: 'var(--bg-surface)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-lg)',
      transition: 'all var(--transition-fast)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{task.title}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {task.department && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: task.department.color }} />
              {task.department.name}
            </span>
          )}
          {task.assignee && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Avatar src={task.assignee.avatarUrl} name={task.assignee.name} size="sm" />
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{task.assignee.name}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ minWidth: 100 }}>
        <ProgressBar value={task.progressPercent} showLabel />
      </div>

      <PriorityBadge priority={task.priority} />
      <StatusBadge status={task.status} />

      {task.status !== 'COMPLETED' && task.status !== 'CANCELLED' && canCheck && (
        <button
          className="btn btn-ghost btn-sm"
          style={{ color: '#34D399', border: '1px solid rgba(16,185,129,0.3)' }}
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
    <div style={{ marginBottom: 24 }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '8px 0', width: '100%',
          marginBottom: open ? 10 : 0
        }}
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
      >
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)' }}>{title}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} task{count !== 1 ? 's' : ''}</div>
        </div>
        <div style={{
          marginLeft: 'auto',
          background: `${color}18`,
          color,
          fontSize: 13,
          fontWeight: 700,
          padding: '2px 10px',
          borderRadius: 'var(--radius-full)',
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
  const { data, loading, refetch } = useFetch<DeadlineGroups>('/tasks/deadlines');

  const groups = data as DeadlineGroups | null;

  return (
    <AppLayout title="Deadlines" subtitle="Track all task due dates">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          An overview of every task deadline grouped by urgency.
        </p>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/tasks')}>
          All Tasks <ArrowRight size={14} />
        </button>
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {!loading && groups && (
        <>
          <DeadlineSection
            title="Overdue"
            count={groups.overdue.length}
            icon={<AlertCircle size={16} color="#F87171" />}
            color="#EF4444"
            tasks={groups.overdue}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Due Today"
            count={groups.today.length}
            icon={<Clock size={16} color="#FDBA74" />}
            color="#F97316"
            tasks={groups.today}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Due Tomorrow"
            count={groups.tomorrow.length}
            icon={<AlertTriangle size={16} color="#FCD34D" />}
            color="#F59E0B"
            tasks={groups.tomorrow}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="This Week"
            count={groups.thisWeek.length}
            icon={<Clock size={16} color="#34D399" />}
            color="#10B981"
            tasks={groups.thisWeek}
            refetch={refetch}
            defaultOpen
          />
          <DeadlineSection
            title="Next Week"
            count={groups.nextWeek.length}
            icon={<Clock size={16} color="#818CF8" />}
            color="#6366F1"
            tasks={groups.nextWeek}
            refetch={refetch}
          />
          <DeadlineSection
            title="Completed"
            count={groups.completed.length}
            icon={<CheckCircle2 size={16} color="#34D399" />}
            color="#10B981"
            tasks={groups.completed}
            refetch={refetch}
          />

          {Object.values(groups).every(g => g.length === 0) && (
            <div className="empty-state">
              <div className="empty-icon"><CheckCircle2 size={24} /></div>
              <div className="empty-title">All clear!</div>
              <div className="empty-desc">No deadline tasks found. Create tasks with deadlines to track them here.</div>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
