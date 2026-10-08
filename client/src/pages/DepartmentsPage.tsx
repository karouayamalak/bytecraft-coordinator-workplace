import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users, AlertCircle, ChevronRight, Edit2, Archive } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Department, User } from '../lib/types';
import api from '../lib/api';

const ICON_OPTIONS = ['Code2', 'Megaphone', 'Palette', 'PackageCheck', 'BookOpen', 'Briefcase', 'Cpu', 'Globe', 'Camera'];
const COLOR_OPTIONS = ['#00F0FF', '#8B5CF6', '#EC4899', '#10B981', '#F59E0B', '#3B82F6', '#F97316', '#14B8A6', '#EF4444'];

const EMPTY_FORM = {
  name: '',
  description: '',
  leaderId: '',
  color: '#00F0FF',
  icon: 'Briefcase',
};

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const { data: departments, loading, refetch } = useFetch<Department[]>('/departments?includeArchived=true');
  const { data: members } = useFetch<User[]>('/users?status=active');

  const isCoordinator = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'].includes(user?.role || '');

  const openCreate = () => {
    setEditDept(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditDept(dept);
    setFormData({
      name: dept.name,
      description: dept.description,
      leaderId: dept.leaderId || '',
      color: dept.color,
      icon: dept.icon,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      showToast('Department name is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editDept) {
        await api.patch(`/departments/${editDept.id}`, formData);
        showToast('Department updated.', 'success');
      } else {
        await api.post('/departments', formData);
        showToast('Department created!', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (dept: Department) => {
    const action = dept.isArchived ? 'restore' : 'archive';
    if (!confirm(`${dept.isArchived ? 'Restore' : 'Archive'} department "${dept.name}"?`)) return;
    try {
      await api.patch(`/departments/${dept.id}/archive`, {});
      showToast(`Department ${action}d.`, 'success');
      refetch();
    } catch {
      showToast(`Failed to ${action} department.`, 'error');
    }
  };

  const deptList = (departments as Department[]) || [];
  const active = deptList.filter(d => !d.isArchived);
  const archived = deptList.filter(d => d.isArchived);

  const totalManagers = deptList.reduce((acc, d) => acc + (d.memberCount || 0), 0);
  const totalTasks = deptList.reduce((acc, d) => acc + (d.activeTasksCount || 0), 0);
  const totalOverdue = deptList.reduce((acc, d) => acc + (d.overdueTasksCount || 0), 0);

  return (
    <AppLayout title="Departments" subtitle={`${active.length} active departments`}>
      <style>{`
        .dept-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        @media (max-width: 1024px) {
          .dept-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .dept-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        .dept-card {
          background: #121214;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 16px 18px;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          gap: 12px;
          transition: all 0.15s ease;
          position: relative;
        }
        .dept-card:hover {
          border-color: rgba(255, 255, 255, 0.18);
          background: #161619;
          transform: translateY(-1px);
        }
        .dept-stat-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11.5px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 3px 8px;
          border-radius: 6px;
        }
      `}</style>

      {/* Top Action & Overview */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className="dept-stat-pill">
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{active.length}</span> departments
          </div>
          <div className="dept-stat-pill">
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalManagers}</span> managers
          </div>
          <div className="dept-stat-pill">
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{totalTasks}</span> active tasks
          </div>
          {totalOverdue > 0 && (
            <div className="dept-stat-pill" style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.05)' }}>
              <AlertCircle size={12} />
              <span style={{ fontWeight: 600 }}>{totalOverdue}</span> overdue
            </div>
          )}
        </div>

        {isCoordinator && (
          <button id="create-dept-btn" className="btn btn-primary" onClick={openCreate} style={{ padding: '7px 14px', fontSize: 13, gap: 6 }}>
            <Plus size={15} /> New Department
          </button>
        )}
      </div>

      {loading && (
        <div className="dept-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 160, borderRadius: 12 }} />
          ))}
        </div>
      )}

      {!loading && active.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon"><Users size={24} /></div>
          <div className="empty-title">No departments yet</div>
          <div className="empty-desc">Create your first department to organize the team.</div>
          {isCoordinator && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Create Department
            </button>
          )}
        </div>
      )}

      <div className="dept-grid">
        {active.map(dept => {
          const deptColor = dept.color || '#3b82f6';
          return (
            <div
              key={dept.id}
              className="dept-card"
              onClick={() => navigate(`/departments/${dept.id}`)}
            >
              {/* Card Top: Header & Actions */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: deptColor }} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontWeight: 600, fontSize: 14.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dept.name}
                    </h3>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
                      {dept.memberCount ?? 0} manager{dept.memberCount !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                {isCoordinator && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openEdit(dept)}
                      title="Edit department"
                      style={{ padding: 4, width: 26, height: 26 }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleArchive(dept)}
                      title="Archive department"
                      style={{ padding: 4, width: 26, height: 26, color: 'var(--text-muted)' }}
                    >
                      <Archive size={12} />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <p style={{
                fontSize: 12.5,
                color: 'var(--text-secondary)',
                lineHeight: 1.45,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 36
              }}>
                {dept.description || 'Department coordination unit handling deliverables and operations.'}
              </p>

              {/* Footer: Task count, overdue status, and enter arrow */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 10,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                marginTop: 'auto',
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{dept.activeTasksCount ?? 0}</strong> active tasks
                  </span>
                  {(dept.overdueTasksCount ?? 0) > 0 && (
                    <span style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: '#f87171',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: '1px 6px',
                      borderRadius: 4
                    }}>
                      {dept.overdueTasksCount} overdue
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)', fontSize: 11.5 }}>
                  <span>Open</span>
                  <ChevronRight size={13} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            Archived Departments ({archived.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {archived.map(dept => (
              <div key={dept.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 8, opacity: 0.6
              }}>
                <div style={{ flex: 1, fontWeight: 500, fontSize: 13 }}>{dept.name}</div>
                {isCoordinator && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleArchive(dept)}
                    style={{ padding: '4px 10px', fontSize: 12 }}
                  >
                    Restore
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editDept ? 'Edit Department' : 'Create Department'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editDept ? 'Save Changes' : 'Create'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label" htmlFor="dept-name">Department Name *</label>
            <input
              id="dept-name"
              className="form-input"
              placeholder="e.g. Development"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-desc">Description</label>
            <textarea
              id="dept-desc"
              className="form-textarea"
              placeholder="What does this department do?"
              value={formData.description}
              onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dept-leader">Department Manager</label>
            <select
              id="dept-leader"
              className="form-select"
              value={formData.leaderId}
              onChange={e => setFormData(p => ({ ...p, leaderId: e.target.value }))}
            >
              <option value="">None</option>
              {(members || []).map((m: User) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Color picker */}
          <div className="form-group">
            <label className="form-label">Brand Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => setFormData(p => ({ ...p, color: c }))}
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: c, border: formData.color === c ? '3px solid white' : '2px solid transparent',
                    cursor: 'pointer', outline: formData.color === c ? `2px solid ${c}` : 'none',
                  }}
                  title={c}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
