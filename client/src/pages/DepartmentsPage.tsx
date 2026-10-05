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

  const isCoordinator = user?.role === 'COORDINATOR';

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

  return (
    <AppLayout title="Departments" subtitle={`${active.length} active`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
          Manage club departments, leaders, and responsibilities.
        </p>
        {isCoordinator && (
          <button id="create-dept-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> New Department
          </button>
        )}
      </div>

      {loading && (
        <div className="grid-auto">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 180, borderRadius: 14 }} />
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

      <div className="grid-auto">
        {active.map(dept => (
          <div
            key={dept.id}
            className="card"
            style={{
              cursor: 'pointer',
              borderLeft: `4px solid ${dept.color}`,
              position: 'relative',
              overflow: 'hidden',
            }}
            onClick={() => navigate(`/departments/${dept.id}`)}
          >
            {/* Header with Mascot */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div className="mascot-sticker" style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', padding: 4 }}>
                  <img
                    src={
                      dept.name.toLowerCase().includes('dev') || dept.name.toLowerCase().includes('tech') ? '/mascots/tech.png' :
                      dept.name.toLowerCase().includes('com') || dept.name.toLowerCase().includes('pr') ? '/mascots/pr.png' :
                      dept.name.toLowerCase().includes('media') || dept.name.toLowerCase().includes('design') ? '/mascots/media.png' :
                      dept.name.toLowerCase().includes('logistics') || dept.name.toLowerCase().includes('op') ? '/mascots/logistics.png' :
                      dept.name.toLowerCase().includes('content') || dept.name.toLowerCase().includes('acad') ? '/mascots/academic.png' :
                      '/mascots/executive.png'
                    }
                    alt={dept.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16, fontFamily: 'var(--font-pixel)' }}>{dept.name}</div>
                  <span className="badge" style={{ background: `${dept.color}20`, color: dept.color, fontSize: 10, marginTop: 4 }}>
                    Active Squad
                  </span>
                </div>
              </div>

              {isCoordinator && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={e => { e.stopPropagation(); openEdit(dept); }}
                    title="Edit department"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={e => { e.stopPropagation(); handleArchive(dept); }}
                    title="Archive department"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Archive size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Description */}
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
              {dept.description || 'No description yet.'}
            </p>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: dept.color }}>{dept.memberCount ?? 0}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Members</div>
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{
                  fontSize: 20, fontWeight: 800,
                  color: (dept.overdueTasksCount ?? 0) > 0 ? '#F87171' : 'var(--text-primary)'
                }}>
                  {dept.activeTasksCount ?? 0}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active Tasks</div>
              </div>
            </div>

            {/* Overdue warning */}
            {(dept.overdueTasksCount ?? 0) > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: 6, padding: '6px 10px',
                marginBottom: 12, fontSize: 12, color: '#F87171'
              }}>
                <AlertCircle size={13} />
                {dept.overdueTasksCount} overdue task{dept.overdueTasksCount !== 1 ? 's' : ''}
              </div>
            )}

            {/* Leader */}
            {dept.leader ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar src={dept.leader.avatarUrl} name={dept.leader.name} size="sm" />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{dept.leader.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Department Lead</div>
                </div>
                <ChevronRight size={16} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No leader assigned
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Archived Departments
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {archived.map(dept => (
              <div key={dept.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 10, opacity: 0.6
              }}>
                <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{dept.name}</div>
                {isCoordinator && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleArchive(dept)}
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
            <label className="form-label" htmlFor="dept-leader">Department Leader</label>
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
