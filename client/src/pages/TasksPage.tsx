import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Filter, Search, CheckSquare, X, Users, Calendar, AlertCircle, Check
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import TaskItem from '../components/common/TaskItem';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Task, Department, User, TaskStatus, TaskPriority, Event } from '../lib/types';
import api from '../lib/api';

const EMPTY_TASK = {
  title: '',
  description: '',
  departmentId: '',
  departmentIds: [] as string[],
  assignedMemberId: '',
  assignedMemberIds: [] as string[],
  eventId: '',
  priority: 'MEDIUM' as TaskPriority,
  status: 'TODO' as TaskStatus,
  startDate: new Date().toISOString().split('T')[0],
  deadline: '',
  notes: '',
};

export default function TasksPage() {
  const { user, department } = useAuth();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isCoordinator = user ? BOARD_ROLES.includes(user.role) : false;
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  // Primary view tab:
  // For managers: 'mine' (My Tasks) vs 'dept' (My Department Tasks)
  // For coordinator/board: 'all' (All ByteCraft) vs 'mine' (My Assigned Tasks)
  const initialView = searchParams.get('view') === 'mine' ? 'mine' : (isManager ? 'mine' : 'all');
  const [activeTab, setActiveTab] = useState<'mine' | 'dept' | 'all'>(initialView);

  const [search, setSearch] = useState(searchParams.get('search') || searchParams.get('q') || '');
  const [filterDept, setFilterDept] = useState(searchParams.get('departmentId') || '');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterDone, setFilterDone] = useState<'' | 'done' | 'pending'>('');
  const [showFilters, setShowFilters] = useState(false);

  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState(EMPTY_TASK);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (activeTab === 'mine') {
      params.set('view', 'mine');
    } else if (activeTab === 'dept' && user?.departmentId) {
      params.set('departmentId', user.departmentId);
    } else if (filterDept) {
      params.set('departmentId', filterDept);
    }
    if (filterPriority) params.set('priority', filterPriority);
    if (search) params.set('search', search);
    return `/tasks?${params.toString()}`;
  };

  const { data: tasks, loading, refetch } = useFetch<Task[]>(buildQuery(), [activeTab, filterDept, filterPriority, search]);
  const { data: departments } = useFetch<Department[]>('/departments');
  const { data: members } = useFetch<User[]>('/users?status=active');
  const { data: events } = useFetch<Event[]>('/events');

  useWebSocket(msg => {
    if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED'].includes(msg.type)) refetch();
  });

  const openCreate = () => {
    setEditTask(null);
    setFormData({
      ...EMPTY_TASK,
      departmentId: user?.departmentId || (departments?.[0]?.id || ''),
      departmentIds: user?.departmentId ? [user.departmentId] : [],
      assignedMemberIds: user?.id ? [user.id] : []
    });
    setShowModal(true);
  };

  const openEdit = (task: Task) => {
    setEditTask(task);
    const existingAssigneeIds = Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.length > 0
      ? task.assignedMemberIds
      : (task.assignedMemberId ? [task.assignedMemberId] : []);
    const existingDeptIds = Array.isArray(task.departmentIds) && task.departmentIds.length > 0
      ? task.departmentIds
      : (task.departmentId ? [task.departmentId] : []);

    setFormData({
      title: task.title,
      description: task.description || '',
      departmentId: task.departmentId,
      departmentIds: existingDeptIds,
      assignedMemberId: task.assignedMemberId || '',
      assignedMemberIds: existingAssigneeIds,
      eventId: task.eventId || '',
      priority: task.priority,
      status: task.status,
      startDate: task.startDate,
      deadline: task.deadline,
      notes: task.notes || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.departmentId || !formData.deadline) {
      showToast('Please fill in task title, department, and deadline.', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        departmentIds: formData.departmentIds.length > 0 ? formData.departmentIds : [formData.departmentId],
        assignedMemberIds: formData.assignedMemberIds,
        assignedMemberId: formData.assignedMemberIds[0] || null
      };

      if (editTask) {
        await api.patch(`/tasks/${editTask.id}`, payload);
        showToast('Task updated successfully.', 'success');
      } else {
        await api.post('/tasks', payload);
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
    // Board roles can toggle any task; managers/members can only toggle their own
    const isAssigned = task.assignedMemberId === user?.id || (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(user?.id || ''));
    const isManagerOfDept = isManager && user?.departmentId && (task.departmentId === user.departmentId || (Array.isArray(task.departmentIds) && task.departmentIds.includes(user.departmentId || '')));
    const canCheck = isCoordinator || isAssigned || isManagerOfDept;
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

  const toggleAssignee = (userId: string) => {
    setFormData(prev => {
      const exists = prev.assignedMemberIds.includes(userId);
      const next = exists ? prev.assignedMemberIds.filter(id => id !== userId) : [...prev.assignedMemberIds, userId];
      return {
        ...prev,
        assignedMemberIds: next,
        assignedMemberId: next[0] || ''
      };
    });
  };

  const toggleDept = (deptId: string) => {
    setFormData(prev => {
      const exists = prev.departmentIds.includes(deptId);
      const next = exists ? prev.departmentIds.filter(id => id !== deptId) : [...prev.departmentIds, deptId];
      return {
        ...prev,
        departmentIds: next,
        departmentId: next[0] || prev.departmentId || deptId
      };
    });
  };

  const rawList = (tasks as Task[]) || [];

  // Sort by deadline ascending
  const sorted = [...rawList].sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  // Filter by done/pending
  const filteredList = sorted.filter(t => {
    if (filterDone === 'done') return t.status === 'COMPLETED';
    if (filterDone === 'pending') return t.status !== 'COMPLETED';
    return true;
  });

  const doneCount = sorted.filter(t => t.status === 'COMPLETED').length;
  const pendingCount = sorted.length - doneCount;

  const myDeptName = department?.name || 'My Department';

  return (
    <AppLayout
      title={isCoordinator ? "Tasks Management" : "Task Operations"}
      subtitle={`${pendingCount} pending · ${doneCount} completed`}
      actions={
        <button className="btn btn-primary btn-sm" onClick={openCreate} style={{ gap: 6 }}>
          <Plus size={15} /> Create Task
        </button>
      }
    >
      {/* Primary Scope Tabs (Personal Work vs Department Work vs All ByteCraft) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 10,
        marginBottom: 16,
        overflowX: 'auto',
      }}>
        {isManager && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: activeTab === 'mine' ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: activeTab === 'mine' ? 'var(--accent)' : 'var(--bg-surface)',
                color: activeTab === 'mine' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <CheckSquare size={14} />
              My Tasks
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dept')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: activeTab === 'dept' ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: activeTab === 'dept' ? 'var(--accent)' : 'var(--bg-surface)',
                color: activeTab === 'dept' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Users size={14} />
              {myDeptName} Tasks
            </button>
          </>
        )}

        {isCoordinator && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: activeTab === 'all' ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: activeTab === 'all' ? 'var(--accent)' : 'var(--bg-surface)',
                color: activeTab === 'all' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <Users size={14} />
              All ByteCraft ({sorted.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('mine')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 7,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                border: activeTab === 'mine' ? '1px solid var(--accent)' : '1px solid var(--border)',
                background: activeTab === 'mine' ? 'var(--accent)' : 'var(--bg-surface)',
                color: activeTab === 'mine' ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <CheckSquare size={14} />
              My Assigned Tasks
            </button>
          </>
        )}
      </div>

      {/* Control Bar: Status Filters, Search, Filter dropdowns */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', width: '100%' }}>
          {/* Status buttons: All / Pending / Completed */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
            padding: 2,
            background: 'var(--bg-surface)',
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <button
              type="button"
              onClick={() => setFilterDone('')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: filterDone === '' ? 'var(--bg-elevated)' : 'transparent',
                color: filterDone === '' ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              All ({sorted.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterDone('pending')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: filterDone === 'pending' ? 'var(--bg-elevated)' : 'transparent',
                color: filterDone === 'pending' ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterDone('done')}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                background: filterDone === 'done' ? 'var(--bg-elevated)' : 'transparent',
                color: filterDone === 'done' ? '#10b981' : 'var(--text-muted)',
              }}
            >
              Completed ({doneCount})
            </button>
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1 1 180px', minWidth: 150 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              id="tasks-search-input"
              type="text"
              placeholder="Search tasks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 26px 6px 30px',
                fontSize: 12.5,
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-muted)'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Priority filter */}
          <select
            className="form-select"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{ width: 'auto', minWidth: 110, padding: '5px 10px', fontSize: 12 }}
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Department selector (for Coordinator) */}
          {isCoordinator && activeTab === 'all' && (
            <select
              className="form-select"
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              style={{ width: 'auto', minWidth: 140, padding: '5px 10px', fontSize: 12 }}
            >
              <option value="">All Departments</option>
              {(departments || []).map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 48, borderRadius: 8 }} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredList.length === 0 && (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
          <CheckSquare size={32} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>
            {activeTab === 'mine' ? 'No personal tasks assigned' : 'No tasks found'}
          </h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 auto 16px', maxWidth: 380 }}>
            {activeTab === 'mine'
              ? 'You do not have any tasks personally assigned under this filter.'
              : 'There are no tasks matching your selected filters.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={openCreate} style={{ gap: 6, margin: '0 auto' }}>
            <Plus size={14} /> Create Task
          </button>
        </div>
      )}

      {/* Task List */}
      {!loading && filteredList.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filteredList.map(task => {
            const isAssigned = task.assignedMemberId === user?.id || (Array.isArray(task.assignedMemberIds) && task.assignedMemberIds.includes(user?.id || ''));
            const isManagerOfDept = isManager && user?.departmentId && (task.departmentId === user.departmentId || (Array.isArray(task.departmentIds) && task.departmentIds.includes(user.departmentId || '')));
            const canCheck = isCoordinator || isAssigned || isManagerOfDept;

            return (
              <TaskItem
                key={task.id}
                task={task}
                onToggleDone={handleToggleDone}
                canToggle={canCheck}
                isToggling={togglingId === task.id}
                onEdit={openEdit}
                onDelete={handleDelete}
                canEdit={true}
                canDelete={isCoordinator || isManager}
                showAssignee={true}
                showDepartment={true}
                showDeadline={true}
              />
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL WITH MULTI-ASSIGNEE & CROSS-DEPARTMENT */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editTask ? 'Edit Task' : 'Create Task'}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Task Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Task Title *</label>
            <input
              id="task-title"
              className="form-input"
              placeholder="e.g. Design Hackathon Promotional Poster"
              value={formData.title}
              onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              className="form-textarea"
              placeholder="Detailed description of deliverables, specs, requirements…"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
              style={{ minHeight: 65 }}
            />
          </div>

          {/* Primary Department & Event Link */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-dept">Primary Department *</label>
              <select
                id="task-dept"
                className="form-select"
                value={formData.departmentId}
                onChange={e => {
                  const val = e.target.value;
                  setFormData(p => ({
                    ...p,
                    departmentId: val,
                    departmentIds: p.departmentIds.includes(val) ? p.departmentIds : [...p.departmentIds, val]
                  }));
                }}
              >
                <option value="">Select primary department…</option>
                {(departments || []).map((d: Department) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-event">Linked Event (Optional)</label>
              <select
                id="task-event"
                className="form-select"
                value={formData.eventId}
                onChange={e => setFormData(p => ({ ...p, eventId: e.target.value }))}
              >
                <option value="">None (General Club Task)</option>
                {(events || []).map((e: Event) => (
                  <option key={e.id} value={e.id}>{e.name} ({e.date})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cross-Department Multi-Selection */}
          <div className="form-group">
            <label className="form-label">
              Involved Departments (Cross-Department Task)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {(departments || []).map((d: Department) => {
                const isSelected = formData.departmentIds.includes(d.id) || formData.departmentId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => toggleDept(d.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
                      background: isSelected ? '#f0f9ff' : '#ffffff',
                      color: isSelected ? '#0284c7' : '#475569',
                    }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }} />
                    {d.name}
                    {isSelected && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Assign Multiple Managers */}
          <div className="form-group">
            <label className="form-label">
              Assign Managers ({formData.assignedMemberIds.length} selected)
            </label>
            <div style={{
              maxHeight: 160,
              overflowY: 'auto',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '6px 8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 6,
              background: '#ffffff'
            }}>
              {(members || []).map((m: User) => {
                const isAssigned = formData.assignedMemberIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => toggleAssignee(m.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 8px',
                      borderRadius: 6,
                      cursor: 'pointer',
                      background: isAssigned ? '#f0f9ff' : 'transparent',
                      border: isAssigned ? '1px solid #bae6fd' : '1px solid transparent',
                      transition: 'background 0.15s ease'
                    }}
                  >
                    <Avatar src={m.avatarUrl} name={m.name} size="xs" />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: 10.5, color: '#64748b' }}>
                        {m.position || m.departmentName || 'Manager'}
                      </div>
                    </div>
                    {isAssigned && <Check size={14} color="#0284c7" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dates & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="task-deadline">Deadline *</label>
              <input
                id="task-deadline"
                type="date"
                className="form-input"
                value={formData.deadline}
                onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                className="form-select"
                value={formData.priority}
                onChange={e => setFormData(p => ({ ...p, priority: e.target.value as TaskPriority }))}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="task-status">Status</label>
              <select
                id="task-status"
                className="form-select"
                value={formData.status}
                onChange={e => setFormData(p => ({ ...p, status: e.target.value as TaskStatus }))}
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="form-label" htmlFor="task-notes">Internal Notes</label>
            <textarea
              id="task-notes"
              className="form-textarea"
              placeholder="Any coordination links, Google Drive folders, or extra notes…"
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              style={{ minHeight: 50 }}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
