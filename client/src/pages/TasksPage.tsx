import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Filter, Search, CheckSquare, Square,
  Edit2, Trash2, Calendar
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Task, Department, User, TaskStatus, TaskPriority } from '../lib/types';
import { formatDate, getDeadlineUrgency, truncate } from '../lib/utils';
import api from '../lib/api';

// Derive a priority label from deadline urgency
function getUrgencyLabel(urgency: string): { label: string; color: string; bg: string } {
  switch (urgency) {
    case 'overdue': return { label: 'Overdue (Urgent)', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
    case 'today':   return { label: 'Due Today (High)', color: '#F97316', bg: 'rgba(249,115,22,0.12)' };
    case 'soon':    return { label: 'Due Soon (Medium)', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
    default:        return { label: 'Upcoming (Low)', color: '#10B981', bg: 'rgba(16,185,129,0.12)' };
  }
}

const EMPTY_TASK = {
  title: '',
  description: '',
  departmentId: '',
  assignedMemberId: '',
  eventId: '',
  priority: 'MEDIUM' as TaskPriority,
  status: 'TODO' as TaskStatus,
  startDate: new Date().toISOString().split('T')[0],
  deadline: '',
  notes: '',
};

export default function TasksPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [filterDept, setFilterDept] = useState(searchParams.get('departmentId') || '');
  const [filterMember, setFilterMember] = useState(searchParams.get('assignedMemberId') || '');
  const [showFilters, setShowFilters] = useState(Boolean(searchParams.get('departmentId') || searchParams.get('assignedMemberId')));
  const [filterDone, setFilterDone] = useState<'' | 'done' | 'pending'>(
    searchParams.get('filter') === 'done' ? 'done' : searchParams.get('filter') === 'pending' ? 'pending' : ''
  );

  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';
  const isCoordinator = user?.role === 'COORDINATOR';

  // 'mine' = only assigned-to-me tasks; 'dept' = whole dept; '' = all (coordinator only)
  const [viewMode, setViewMode] = useState<'mine' | 'dept' | ''>(
    isManager ? 'dept' : ''
  );

  const buildQuery = () => {
    const params = new URLSearchParams();
    // For coordinator: apply optional filters
    if (isCoordinator) {
      if (filterDept) params.set('departmentId', filterDept);
      if (filterMember) params.set('assignedMemberId', filterMember);
    }
    // For manager: pass view mode (mine vs dept) — server handles dept scoping
    if (isManager && viewMode === 'mine') params.set('view', 'mine');
    if (search) params.set('search', search);
    return `/tasks?${params.toString()}`;
  };

  const { data: tasks, loading, refetch } = useFetch<Task[]>(buildQuery(), [filterDept, filterMember, search, viewMode]);
  const { data: departments } = useFetch<Department[]>('/departments');
  const { data: members } = useFetch<User[]>('/users?status=active');

  useWebSocket(msg => {
    if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'].includes(msg.type)) refetch();
  });

  const openCreate = () => {
    setEditTask(null);
    setFormData(EMPTY_TASK);
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    setFormData({
      title: task.title,
      description: task.description,
      departmentId: task.departmentId,
      assignedMemberId: task.assignedMemberId || '',
      eventId: task.eventId || '',
      priority: task.priority,
      status: task.status,
      startDate: task.startDate,
      deadline: task.deadline,
      notes: task.notes,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.departmentId || !formData.deadline) {
      showToast('Please fill in title, department, and deadline.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editTask) {
        await api.patch(`/tasks/${editTask.id}`, formData);
        showToast('Task updated successfully.', 'success');
      } else {
        await api.post('/tasks', formData);
        showToast('Task created successfully.', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to save task.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this task? This action cannot be undone.')) return;
    setDeletingId(id);
    try {
      await api.delete(`/tasks/${id}`);
      showToast('Task deleted.', 'success');
      refetch();
    } catch {
      showToast('Failed to delete task.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleDone = async (task: Task) => {
    const canCheck = isCoordinator || (isManager && task.assignedMemberId === user?.id);
    if (!canCheck) {
      showToast('You can only check tasks assigned to you.', 'error');
      return;
    }
    const isDone = task.status === 'COMPLETED';
    setTogglingId(task.id);
    try {
      await api.patch(`/tasks/${task.id}`, { 
        status: isDone ? 'TODO' : 'COMPLETED',
        progressPercent: isDone ? 0 : 100
      });
      refetch();
    } catch {
      showToast('Failed to update task status.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const rawList = (tasks as Task[]) || [];

  // Sort by deadline ascending (earliest deadline first = highest priority)
  const sorted = [...rawList].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Filter by done/pending
  const taskList = sorted.filter(t => {
    if (filterDone === 'done') return t.status === 'COMPLETED';
    if (filterDone === 'pending') return t.status !== 'COMPLETED';
    return true;
  });

  const canCreate = user?.role === 'COORDINATOR' || user?.role === 'DEPARTMENT_LEADER' || user?.role === 'MANAGER';
  const canDelete = user?.role === 'COORDINATOR' || user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  const doneCount = sorted.filter(t => t.status === 'COMPLETED').length;
  const pendingCount = sorted.length - doneCount;

  return (
    <AppLayout title="Tasks" subtitle={`${pendingCount} pending · ${doneCount} checked`}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          {/* Search */}
          <div className="search-container" style={{ maxWidth: 280 }}>
            <Search size={14} className="search-icon" />
            <input
              id="tasks-search-input"
              type="text"
              className="search-input"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {isCoordinator && (
            <button
              id="tasks-filter-btn"
              className={`btn btn-secondary btn-sm ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(p => !p)}
            >
              <Filter size={14} /> Filters
              {(filterDept || filterMember || filterDone) && (
                <span className="sidebar-badge" style={{ marginLeft: 4 }}>!</span>
              )}
            </button>
          )}

          {/* Manager view toggle: My Tasks vs Dept Tasks */}
          {isManager && (
            <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', borderRadius: 8, padding: 3, border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setViewMode('dept')}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: viewMode === 'dept' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'dept' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >Dept Tasks</button>
              <button
                onClick={() => setViewMode('mine')}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                  border: 'none', cursor: 'pointer',
                  background: viewMode === 'mine' ? 'var(--color-primary)' : 'transparent',
                  color: viewMode === 'mine' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.15s'
                }}
              >My Tasks</button>
            </div>
          )}
        </div>

        {canCreate && (
          <button id="create-task-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {/* Summary Filter Pills */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setFilterDone('')}
          style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: filterDone === '' ? 'var(--color-primary)' : 'var(--bg-surface)',
            color: filterDone === '' ? '#fff' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >All ({sorted.length})</button>
        <button
          onClick={() => setFilterDone('pending')}
          style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: filterDone === 'pending' ? 'rgba(245,158,11,0.15)' : 'var(--bg-surface)',
            color: filterDone === 'pending' ? '#F59E0B' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >Pending ({pendingCount})</button>
        <button
          onClick={() => setFilterDone('done')}
          style={{
            padding: '6px 16px', borderRadius: 99, fontSize: 13, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: filterDone === 'done' ? 'rgba(16,185,129,0.15)' : 'var(--bg-surface)',
            color: filterDone === 'done' ? '#10B981' : 'var(--text-secondary)',
            transition: 'all 0.15s',
          }}
        >Checked / Done ({doneCount})</button>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div style={{
          display: 'flex', gap: 12, flexWrap: 'wrap',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '14px 16px',
          marginBottom: 16,
          animation: 'slideDown 150ms var(--ease-smooth)'
        }}>
          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={filterDept}
            onChange={e => setFilterDept(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All Departments</option>
            {(departments || []).map((d: Department) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            style={{ maxWidth: 200 }}
            value={filterMember}
            onChange={e => setFilterMember(e.target.value)}
            aria-label="Filter by member"
          >
            <option value="">All Members</option>
            {(members || []).map((m: User) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {(filterDept || filterMember) && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setFilterDept(''); setFilterMember(''); }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 62, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && taskList.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><CheckSquare size={24} /></div>
          <div className="empty-title">No tasks found</div>
          <div className="empty-desc">
            {search || filterDept || filterMember
              ? 'Try adjusting your filters or search.'
              : 'Create your first task to start organizing the team.'}
          </div>
          {canCreate && !search && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Create Task
            </button>
          )}
        </div>
      )}

      {/* Task list sorted by deadline */}
      {!loading && taskList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {taskList.map(task => {
            const isDone = task.status === 'COMPLETED';
            const urgency = isDone ? 'ok' : getDeadlineUrgency(task.deadline, task.status);
            const badge = getUrgencyLabel(urgency);
            const toggling = togglingId === task.id;
            const canCheckThisTask = isCoordinator || (isManager && task.assignedMemberId === user?.id);

            return (
              <div
                key={task.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  background: isDone ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  border: `1px solid ${isDone ? 'var(--border-subtle)' : 'var(--border-default)'}`,
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 16px',
                  opacity: isDone ? 0.65 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {/* Checkbox (Checked or not) */}
                <button
                  onClick={() => handleToggleDone(task)}
                  disabled={toggling || !canCheckThisTask}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: canCheckThisTask ? 'pointer' : 'not-allowed',
                    color: isDone ? '#10B981' : canCheckThisTask ? 'var(--text-muted)' : 'rgba(255,255,255,0.2)',
                    opacity: canCheckThisTask ? 1 : 0.5,
                    flexShrink: 0,
                    padding: 0,
                    transition: 'color 0.15s, transform 0.15s',
                  }}
                  title={!canCheckThisTask ? 'Only assigned manager can check this task' : isDone ? 'Mark as pending' : 'Mark as checked'}
                >
                  {isDone
                    ? <CheckSquare size={22} strokeWidth={2.2} />
                    : <Square size={22} strokeWidth={1.8} />
                  }
                </button>

                {/* Title + description */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 600, fontSize: 14,
                    textDecoration: isDone ? 'line-through' : 'none',
                    color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {task.title}
                  </div>
                  {task.description && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {truncate(task.description, 70)}
                    </div>
                  )}
                </div>

                {/* Department dot */}
                {task.department && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: task.department.color, flexShrink: 0
                    }} />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {task.department.name}
                    </span>
                  </div>
                )}

                {/* Assignee */}
                {task.assignee ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Avatar src={task.assignee.avatarUrl} name={task.assignee.name} size="sm" />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {task.assignee.name.split(' ')[0]}
                    </span>
                  </div>
                ) : <span style={{ width: 28 }} />}

                {/* Deadline (Priority sorted by date) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{
                    fontSize: 12,
                    fontWeight: urgency === 'overdue' || urgency === 'today' ? 600 : 400,
                    color: urgency === 'overdue' ? '#F87171' : urgency === 'today' ? '#FDBA74' : urgency === 'soon' ? '#FCD34D' : 'var(--text-secondary)',
                    whiteSpace: 'nowrap'
                  }}>
                    {formatDate(task.deadline)}
                  </span>
                </div>

                {/* Dynamic Priority badge derived directly from deadline proximity */}
                {!isDone ? (
                  <span style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    color: badge.color, background: badge.bg, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {badge.label}
                  </span>
                ) : (
                  <span style={{
                    padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
                    color: '#10B981', background: 'rgba(16,185,129,0.12)', whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    Completed
                  </span>
                )}

                {/* Actions */}
                {canCreate && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={e => { e.stopPropagation(); openEdit(task); }}
                      title="Edit task"
                    >
                      <Edit2 size={14} />
                    </button>
                    {canDelete && (
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        style={{ color: '#F87171' }}
                        onClick={e => { e.stopPropagation(); handleDelete(task.id); }}
                        disabled={deletingId === task.id}
                        title="Delete task"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTask ? 'Edit Task' : 'Create New Task'}
        size="lg"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editTask ? 'Save Changes' : 'Create Task'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="task-title">Task Title *</label>
            <input
              id="task-title"
              className="form-input"
              placeholder="e.g. Design event poster"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className="form-textarea"
              placeholder="What needs to be done?"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-dept">Department *</label>
            <select
              id="task-dept"
              className="form-select"
              value={formData.departmentId}
              onChange={e => setFormData(p => ({ ...p, departmentId: e.target.value }))}
            >
              <option value="">Select department…</option>
              {(departments || []).map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-member">Assign To</label>
            <select
              id="task-member"
              className="form-select"
              value={formData.assignedMemberId}
              onChange={e => setFormData(p => ({ ...p, assignedMemberId: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {(members || []).map((m: User) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-start">Start Date</label>
            <input
              id="task-start"
              type="date"
              className="form-input"
              value={formData.startDate}
              onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-deadline">Deadline * <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>(determines priority)</span></label>
            <input
              id="task-deadline"
              type="date"
              className="form-input"
              value={formData.deadline}
              onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="task-notes">Notes</label>
            <textarea
              id="task-notes"
              className="form-textarea"
              placeholder="Additional notes or context…"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              style={{ minHeight: 60 }}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
