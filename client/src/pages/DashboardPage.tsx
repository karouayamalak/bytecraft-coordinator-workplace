import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Square, Plus, Shield,
  Calendar, Clock, AlertCircle,
  Users, CheckCircle2, Lock,
  Share2, Flag, ArrowRight, Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import AppLayout from '../components/layout/AppLayout';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useVisibility } from '../contexts/VisibilityContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../contexts/ToastContext';
import type { DashboardData, Task, Department } from '../lib/types';
import CoordinatorVisibilityModal from '../components/common/CoordinatorVisibilityModal';
import { formatDate, getDeadlineUrgency } from '../lib/utils';
import api from '../lib/api';

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'overdue': return { label: 'Overdue', color: '#b91c1c', bg: '#fef2f2', border: '#fecaca' };
    case 'today':   return { label: 'Due Today', color: '#c2410c', bg: '#fff7ed', border: '#fed7aa' };
    case 'soon':    return { label: 'Due Soon', color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
    default:        return { label: 'On Track', color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  }
}

export default function DashboardPage() {
  const { user, department } = useAuth();
  const { isModuleAllowed } = useVisibility();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isCoordinator = user ? BOARD_ROLES.includes(user.role) : false;
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  const { data, refetch } = useFetch<DashboardData>('/dashboard/summary');
  const { data: rawTasks, refetch: refetchTasks } = useFetch<Task[]>('/tasks');
  const { data: departments } = useFetch<Department[]>('/departments');

  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);

  // Tab filter:
  // For manager: 'mine' (default) vs 'dept' vs 'urgent' vs 'completed'
  // For board: 'all' (default) vs 'mine' vs 'urgent' vs 'completed'
  const [taskFilter, setTaskFilter] = useState<'mine' | 'dept' | 'all' | 'urgent' | 'completed'>(
    isManager ? 'mine' : 'all'
  );

  // Real-time synchronization
  useWebSocket(msg => {
    if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'EVENT_CREATED', 'EVENT_UPDATED', 'SETTINGS_UPDATED'].includes(msg.type)) {
      refetch();
      refetchTasks();
    }
  });

  const deptName = department?.name || 'Department';

  const isAssigned = (t: Task) => {
    if (t.assignedMemberId === user?.id) return true;
    if (Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.includes(user?.id || '')) return true;
    return false;
  };

  const isDeptTask = (t: Task) => {
    if (!user?.departmentId) return false;
    if (t.departmentId === user.departmentId) return true;
    if (Array.isArray(t.departmentIds) && t.departmentIds.includes(user.departmentId)) return true;
    return false;
  };

  // Handle checking/unchecking task
  const handleToggleTaskDone = async (task: Task) => {
    const canCheck = isCoordinator || isAssigned(task) || (isManager && isDeptTask(task));

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

      if (!isDone) {
        try {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.7 }
          });
        } catch {
          // ignore
        }
      }

      showToast(isDone ? 'Task marked as pending' : 'Task completed successfully', 'success');
      refetchTasks();
      refetch();
    } catch {
      showToast('Failed to update task status.', 'error');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const allTasks = useMemo(() => {
    const list = rawTasks || [];
    return [...list].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [rawTasks]);

  // Tab counts
  const myTasksCount = allTasks.filter(t => isAssigned(t) && t.status !== 'COMPLETED').length;
  const deptTasksCount = allTasks.filter(t => isDeptTask(t) && t.status !== 'COMPLETED').length;
  const urgentTasksCount = allTasks.filter(t => {
    if (t.status === 'COMPLETED') return false;
    const urgency = getDeadlineUrgency(t.deadline, t.status);
    return urgency === 'overdue' || urgency === 'today' || urgency === 'soon';
  }).length;
  const completedTasksCount = allTasks.filter(t => t.status === 'COMPLETED').length;

  // Filtered tasks based on active tab
  const displayedTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (taskFilter === 'mine') {
        return isAssigned(task) && task.status !== 'COMPLETED';
      }
      if (taskFilter === 'dept') {
        return isDeptTask(task) && task.status !== 'COMPLETED';
      }
      if (taskFilter === 'urgent') {
        if (task.status === 'COMPLETED') return false;
        const urgency = getDeadlineUrgency(task.deadline, task.status);
        return urgency === 'overdue' || urgency === 'today' || urgency === 'soon';
      }
      if (taskFilter === 'completed') {
        return task.status === 'COMPLETED';
      }
      return task.status !== 'COMPLETED';
    }).slice(0, 10);
  }, [allTasks, taskFilter, user?.id, user?.departmentId]);

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const managerView = data?.managerView;
  const stats = data?.stats || {
    totalMembers: 29,
    departmentsCount: 6,
    activeTasks: allTasks.filter(t => t.status !== 'COMPLETED').length,
    completedTasks: completedTasksCount,
    overdueTasks: 0,
    upcomingEvents: 3,
    tasksDueThisWeek: 5,
    tasksDueToday: 1
  };

  return (
    <AppLayout
      title="Dashboard"
      subtitle={`Club operations overview for ${todayFormatted}`}
      actions={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isCoordinator && (
            <button
              onClick={() => setShowVisibilityModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ gap: 6 }}
            >
              <Shield size={14} /> Visibility Settings
            </button>
          )}
          <button
            onClick={() => navigate('/tasks?action=new')}
            className="btn btn-primary btn-sm"
            style={{ gap: 6 }}
          >
            <Plus size={14} /> Create Task
          </button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* Welcome Banner Card */}
        <div className="card" style={{ padding: '18px 22px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="badge badge-primary">
                  {isCoordinator ? 'Executive Board' : `${deptName} Manager`}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {todayFormatted}
                </span>
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Welcome back, {user?.name || 'Member'}
              </h2>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                {isCoordinator
                  ? 'All club departments, operations, and deliverables at a glance.'
                  : `Managing operations for ${deptName}. Monitor both your personal tasks and department responsibilities.`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {user?.departmentId && (
                <button
                  onClick={() => navigate(`/departments/${user.departmentId}`)}
                  className="btn btn-secondary btn-sm"
                  style={{ gap: 6 }}
                >
                  <Building2 size={14} /> {deptName} Hub
                </button>
              )}
              <button
                onClick={() => navigate('/calendar')}
                className="btn btn-secondary btn-sm"
                style={{ gap: 6 }}
              >
                <Calendar size={14} /> Calendar
              </button>
            </div>
          </div>
        </div>

        {/* 4 Clean Metric Cards */}
        {isManager && managerView ? (
          /* Manager View Metric Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* 1. My Personal Tasks */}
            <div
              onClick={() => setTaskFilter('mine')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: taskFilter === 'mine' ? 'var(--accent)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>My Personal Tasks</span>
                <CheckSquare size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{myTasksCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Assigned specifically to you</div>
            </div>

            {/* 2. Department Workload */}
            <div
              onClick={() => setTaskFilter('dept')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: taskFilter === 'dept' ? 'var(--accent)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{deptName} Active</span>
                <Users size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{deptTasksCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>All tasks in department</div>
            </div>

            {/* 3. Department Overdue */}
            <div
              onClick={() => setTaskFilter('urgent')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: managerView.departmentStats.overdueCount > 0 ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: managerView.departmentStats.overdueCount > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                  Department Overdue
                </span>
                <AlertCircle size={16} color={managerView.departmentStats.overdueCount > 0 ? '#ef4444' : 'var(--text-muted)'} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: managerView.departmentStats.overdueCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {managerView.departmentStats.overdueCount}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Requires prompt review</div>
            </div>

            {/* 4. Department Completed */}
            <div
              onClick={() => setTaskFilter('completed')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: taskFilter === 'completed' ? '#10b981' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Department Completed</span>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{managerView.departmentStats.completedCount}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Delivered tasks</div>
            </div>
          </div>
        ) : (
          /* Coordinator / Board View Metric Cards */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {/* Active Tasks */}
            <div
              onClick={() => setTaskFilter('all')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: taskFilter === 'all' ? 'var(--accent)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Club Active Tasks</span>
                <CheckSquare size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>{stats.activeTasks}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Across all departments</div>
            </div>

            {/* Overdue */}
            <div
              onClick={() => setTaskFilter('urgent')}
              className="card"
              style={{
                padding: '16px 18px',
                cursor: 'pointer',
                background: 'var(--bg-surface)',
                border: '1px solid',
                borderColor: stats.overdueTasks > 0 ? 'rgba(239, 68, 68, 0.5)' : 'var(--border)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: stats.overdueTasks > 0 ? '#f87171' : 'var(--text-secondary)' }}>
                  Urgent & Overdue
                </span>
                <AlertCircle size={16} color={stats.overdueTasks > 0 ? '#ef4444' : '#f59e0b'} />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: stats.overdueTasks > 0 ? '#ef4444' : 'var(--text-primary)' }}>
                {urgentTasksCount}
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>
                {stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : 'Due within 3 days'}
              </div>
            </div>

            {/* Departments */}
            <div
              onClick={() => navigate('/departments')}
              className="card"
              style={{ padding: '16px 18px', cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Departments</span>
                <Building2 size={16} color="var(--accent)" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)' }}>6 Departments</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>29 managers & leaders</div>
            </div>

            {/* Completed */}
            <div
              onClick={() => setTaskFilter('completed')}
              className="card"
              style={{ padding: '16px 18px', cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Completed Tasks</span>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.completedTasks}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>Executed successfully</div>
            </div>
          </div>
        )}

        {/* Priority Tasks Checklist Card */}
        <div className="card" style={{ padding: '20px 22px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          {/* Header & Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={16} color="var(--accent)" />
                Task Checklist & Deliverables
              </h3>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Click a checkbox to mark tasks as completed.
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 8, gap: 2, flexWrap: 'wrap' }}>
              {isManager && (
                <>
                  <button
                    onClick={() => setTaskFilter('mine')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: taskFilter === 'mine' ? 'var(--bg-elevated)' : 'transparent',
                      color: taskFilter === 'mine' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    My Tasks ({myTasksCount})
                  </button>

                  <button
                    onClick={() => setTaskFilter('dept')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: taskFilter === 'dept' ? 'var(--bg-elevated)' : 'transparent',
                      color: taskFilter === 'dept' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {deptName} ({deptTasksCount})
                  </button>
                </>
              )}

              {isCoordinator && (
                <>
                  <button
                    onClick={() => setTaskFilter('all')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: taskFilter === 'all' ? 'var(--bg-elevated)' : 'transparent',
                      color: taskFilter === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    All ByteCraft
                  </button>

                  <button
                    onClick={() => setTaskFilter('mine')}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      background: taskFilter === 'mine' ? 'var(--bg-elevated)' : 'transparent',
                      color: taskFilter === 'mine' ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    My Tasks ({myTasksCount})
                  </button>
                </>
              )}

              <button
                onClick={() => setTaskFilter('urgent')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: taskFilter === 'urgent' ? 'var(--bg-elevated)' : 'transparent',
                  color: taskFilter === 'urgent' ? '#f87171' : 'var(--text-muted)',
                }}
              >
                Urgent ({urgentTasksCount})
              </button>

              <button
                onClick={() => setTaskFilter('completed')}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  background: taskFilter === 'completed' ? 'var(--bg-elevated)' : 'transparent',
                  color: taskFilter === 'completed' ? '#10b981' : 'var(--text-muted)',
                }}
              >
                Done ({completedTasksCount})
              </button>
            </div>
          </div>

          {/* Task List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {displayedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={30} style={{ margin: '0 auto 8px', display: 'block', color: '#10b981' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>No tasks found in this view</div>
                <p style={{ fontSize: 12, margin: '4px 0 14px 0', color: 'var(--text-muted)' }}>All clear for this category.</p>
                <button
                  onClick={() => navigate('/tasks?action=new')}
                  className="btn btn-primary btn-sm"
                  style={{ gap: 6, margin: '0 auto' }}
                >
                  <Plus size={13} /> Create Task
                </button>
              </div>
            ) : (
              displayedTasks.map(task => {
                const urgency = getDeadlineUrgency(task.deadline, task.status);
                const badge = getUrgencyBadge(urgency);
                const isDone = task.status === 'COMPLETED';
                const toggling = togglingTaskId === task.id;
                const canCheck = isCoordinator || isAssigned(task) || (isManager && isDeptTask(task));

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: isDone ? 'var(--bg-subtle)' : 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      padding: '10px 14px',
                      transition: 'all 0.12s ease',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Checkbox button */}
                    <button
                      onClick={() => handleToggleTaskDone(task)}
                      disabled={toggling || !canCheck}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: canCheck ? 'pointer' : 'not-allowed',
                        color: isDone ? '#10b981' : canCheck ? 'var(--text-muted)' : 'var(--border)',
                        padding: 0,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={!canCheck ? 'Assigned to another manager' : isDone ? 'Mark as pending' : 'Click to complete'}
                    >
                      {isDone ? (
                        <CheckSquare size={18} color="#10b981" />
                      ) : canCheck ? (
                        <Square size={18} color="var(--text-muted)" />
                      ) : (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Square size={18} color="var(--border)" />
                          <Lock size={9} color="var(--text-muted)" style={{ position: 'absolute', top: 5, left: 5 }} />
                        </div>
                      )}
                    </button>

                    {/* Task details */}
                    <div style={{ flex: 1, minWidth: 180 }}>
                      <div
                        style={{
                          fontWeight: 500,
                          fontSize: 13,
                          color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                          textDecoration: isDone ? 'line-through' : 'none',
                          cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/tasks?search=${encodeURIComponent(task.title)}`)}
                      >
                        {task.title}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3, flexWrap: 'wrap', fontSize: 11.5, color: 'var(--text-muted)' }}>
                        {task.department && (
                          <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                            {task.department.name}
                          </span>
                        )}
                        {task.assignees && task.assignees.length > 0 ? (
                          <span>
                            • {task.assignees.map(a => a.name.split(' ')[0]).join(' + ')}
                          </span>
                        ) : task.assignee ? (
                          <span>
                            • {task.assignee.name}
                          </span>
                        ) : null}
                        {task.deadline && (
                          <span>
                            • Due {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 500,
                        padding: '2px 7px',
                        borderRadius: 5,
                        background: isDone ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-subtle)',
                        color: isDone ? '#10b981' : 'var(--text-secondary)',
                        border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`
                      }}
                    >
                      {isDone ? 'Completed' : badge.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          <div style={{ marginTop: 14, textAlign: 'right' }}>
            <button
              onClick={() => navigate(isManager ? '/tasks?view=mine' : '/tasks')}
              className="btn btn-ghost btn-sm"
              style={{ gap: 6 }}
            >
              View full task workspace <ArrowRight size={13} />
            </button>
          </div>
        </div>

        {/* Manager View: Department Managers & Upcoming Deadlines Widget */}
        {isManager && managerView && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            {/* Department Managers Widget */}
            <div className="card" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  {deptName} Managers
                </h4>
                <button
                  onClick={() => navigate(`/departments/${user?.departmentId}`)}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11.5, padding: '2px 6px' }}
                >
                  View Hub
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {managerView.managers.map(m => (
                  <div
                    key={m.id}
                    onClick={() => navigate(`/team/${m.id}`)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '7px 9px',
                      borderRadius: 6,
                      background: 'var(--bg-subtle)',
                      cursor: 'pointer',
                      border: '1px solid var(--border)'
                    }}
                  >
                    <Avatar src={m.avatarUrl} name={m.name} size="sm" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.position || 'Manager'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming Department Deadlines Widget */}
            <div className="card" style={{ padding: '16px 18px', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ fontSize: 13.5, fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                  Upcoming {deptName} Deadlines
                </h4>
                <button
                  onClick={() => navigate('/calendar')}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: 11.5, padding: '2px 6px' }}
                >
                  Calendar
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {managerView.departmentStats.upcomingDeadlines.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '12px 0' }}>
                    No upcoming deadlines scheduled.
                  </div>
                ) : (
                  managerView.departmentStats.upcomingDeadlines.slice(0, 4).map(d => (
                    <div
                      key={d.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '7px 9px',
                        borderRadius: 6,
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        gap: 10
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {d.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Assigned: {d.assignee?.name || 'Unassigned'}
                        </div>
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 500, color: 'var(--accent)', background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 4 }}>
                        {formatDate(d.deadline)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <CoordinatorVisibilityModal
        isOpen={showVisibilityModal}
        onClose={() => setShowVisibilityModal(false)}
      />
    </AppLayout>
  );
}
