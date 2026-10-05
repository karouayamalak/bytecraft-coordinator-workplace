import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, UserCheck, UserX, Edit2, Upload, Camera, X } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/Badge';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { User, Department } from '../lib/types';
import { formatDate } from '../lib/utils';
import api from '../lib/api';

// Cloudinary unsigned upload config
// Users set their own Cloudinary cloud name and unsigned upload preset
const CLOUDINARY_CLOUD_NAME = 'bytecraft-club'; // Change to your cloud name
const CLOUDINARY_UPLOAD_PRESET = 'bytecraft_avatars'; // Change to your unsigned preset

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'managers');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    throw new Error('Image upload failed. Check Cloudinary configuration.');
  }

  const data = await response.json();
  return data.secure_url;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'MANAGER' as User['role'],
  departmentId: '',
  phone: '',
  avatarUrl: '',
};

export default function TeamPage() {
  const { user: me } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const [showModal, setShowModal] = useState(searchParams.get('action') === 'new');
  const [editMember, setEditMember] = useState<User | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const buildQuery = () => {
    const p = new URLSearchParams();
    if (filterDept) p.set('departmentId', filterDept);
    if (filterRole) p.set('role', filterRole);
    if (search) p.set('search', search);
    return `/users?${p.toString()}`;
  };

  const { data: members, loading, refetch } = useFetch<User[]>(buildQuery(), [filterDept, filterRole, search]);
  const { data: departments } = useFetch<Department[]>('/departments');

  const isCoordinator = me?.role === 'COORDINATOR';

  const openCreate = () => {
    setEditMember(null);
    setFormData(EMPTY_FORM);
    setPreviewUrl('');
    setShowModal(true);
  };

  const openEdit = (member: User) => {
    setEditMember(member);
    setFormData({
      name: member.name,
      email: member.email,
      role: member.role,
      departmentId: member.departmentId || '',
      phone: member.phone || '',
      avatarUrl: member.avatarUrl || '',
    });
    setPreviewUrl(member.avatarUrl || '');
    setShowModal(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    setUploadingImage(true);
    try {
      const cloudUrl = await uploadToCloudinary(file);
      setFormData(p => ({ ...p, avatarUrl: cloudUrl }));
      setPreviewUrl(cloudUrl);
      showToast('Photo uploaded successfully!', 'success');
    } catch {
      // Fallback: store as local data URI (graceful degradation if Cloudinary not configured)
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setFormData(p => ({ ...p, avatarUrl: dataUrl }));
        setPreviewUrl(dataUrl);
      };
      reader.readAsDataURL(file);
      showToast('Photo saved locally (configure Cloudinary for cloud storage)', 'success');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      showToast('Name and email are required.', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editMember) {
        await api.patch(`/users/${editMember.id}`, formData);
        showToast('Manager updated successfully.', 'success');
      } else {
        await api.post('/users', formData);
        showToast('Manager added! Default password: bytecraft2026', 'success');
      }
      setShowModal(false);
      refetch();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Save failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (member: User) => {
    if (!confirm(`${member.isActive ? 'Deactivate' : 'Reactivate'} account for ${member.name}?`)) return;
    try {
      await api.patch(`/users/${member.id}`, { isActive: !member.isActive });
      showToast(`Account ${member.isActive ? 'deactivated' : 'reactivated'}.`, 'success');
      refetch();
    } catch {
      showToast('Failed to update account status.', 'error');
    }
  };

  const memberList = (members as User[]) || [];

  return (
    <AppLayout title="Team" subtitle={`${memberList.filter(m => m.isActive).length} active managers`}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flex: 1 }}>
          <div className="search-container" style={{ maxWidth: 260 }}>
            <Search size={14} className="search-icon" />
            <input
              id="team-search-input"
              type="text"
              className="search-input"
              placeholder="Search managers…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ maxWidth: 180 }}
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
            style={{ maxWidth: 160 }}
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            aria-label="Filter by role"
          >
            <option value="">All Roles</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="MANAGER">Manager</option>
            <option value="DEPARTMENT_LEADER">Dept. Leader</option>
          </select>
        </div>

        {isCoordinator && (
          <button id="add-member-btn" className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Add Manager
          </button>
        )}
      </div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 200, borderRadius: 14 }} />
          ))}
        </div>
      )}

      {!loading && memberList.length === 0 && (
        <div className="empty-state">
          <div className="empty-title">No managers found</div>
          <div className="empty-desc">Try adjusting your filters or add a new manager.</div>
          {isCoordinator && (
            <button className="btn btn-primary" onClick={openCreate}>
              <Plus size={16} /> Add Manager
            </button>
          )}
        </div>
      )}

      {!loading && memberList.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
          {memberList.map(member => (
            <div
              key={member.id}
              className="card"
              style={{
                cursor: 'pointer',
                opacity: member.isActive ? 1 : 0.55,
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
              }}
              onClick={() => navigate(`/team/${member.id}`)}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(0,0,0,0.12)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar src={member.avatarUrl} name={member.name} size="lg" />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{member.name}</div>
                    <RoleBadge role={member.role} />
                  </div>
                </div>

                {isCoordinator && (
                  <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => openEdit(member)}
                      title="Edit manager"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: member.isActive ? '#F87171' : '#34D399' }}
                      onClick={() => handleDeactivate(member)}
                      title={member.isActive ? 'Deactivate' : 'Reactivate'}
                    >
                      {member.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
                    </button>
                  </div>
                )}
              </div>

              {/* Department */}
              {member.departmentName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: member.departmentColor || '#64748B' }} />
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{member.departmentName}</span>
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{
                    fontSize: 20, fontWeight: 800,
                    color: member.isOverloaded ? '#F97316' : 'var(--cyan)'
                  }}>
                    {member.activeTasksCount ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Active</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#34D399' }}>
                    {member.completedTasksCount ?? 0}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Done</div>
                </div>
              </div>

              {member.isOverloaded && (
                <div style={{
                  marginTop: 10, padding: '5px 10px', borderRadius: 6,
                  background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.25)',
                  fontSize: 11, color: '#FDBA74', textAlign: 'center', fontWeight: 600
                }}>
                  Overloaded Capacity
                </div>
              )}

              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10 }}>
                Joined {formatDate(member.joinedDate)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMember ? 'Edit Manager' : 'Add New Manager'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploadingImage}>
              {saving ? 'Saving…' : editMember ? 'Save Changes' : 'Add Manager'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Photo Upload */}
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Profile Photo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Preview */}
              <div style={{
                width: 72, height: 72, borderRadius: '50%', overflow: 'hidden',
                background: 'var(--bg-elevated)', border: '2px solid var(--border-default)',
                flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative'
              }}>
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Camera size={24} style={{ color: 'var(--text-muted)' }} />
                )}
                {uploadingImage && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                  }}>
                    <div style={{ width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                )}
              </div>

              <div style={{ flex: 1 }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImageSelect}
                  id="avatar-upload-input"
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  <Upload size={14} />
                  {uploadingImage ? 'Uploading…' : 'Upload Photo'}
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginLeft: 8, color: '#F87171' }}
                    onClick={() => { setPreviewUrl(''); setFormData(p => ({ ...p, avatarUrl: '' })); }}
                  >
                    <X size={13} /> Remove
                  </button>
                )}
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  JPG, PNG, WebP — max 5MB. Stored on Cloudinary.
                </div>
              </div>
            </div>
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" htmlFor="member-name">Full Name *</label>
            <input
              id="member-name"
              className="form-input"
              placeholder="e.g. Manel Lyazidi"
              value={formData.name}
              onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-email">Email *</label>
            <input
              id="member-email"
              type="email"
              className="form-input"
              placeholder="m_lyazidi@estin.dz"
              value={formData.email}
              onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-phone">Phone</label>
            <input
              id="member-phone"
              className="form-input"
              placeholder="+213 …"
              value={formData.phone}
              onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-role">Role</label>
            <select
              id="member-role"
              className="form-select"
              value={formData.role}
              onChange={e => setFormData(p => ({ ...p, role: e.target.value as User['role'] }))}
            >
              <option value="MANAGER">Manager</option>
              <option value="DEPARTMENT_LEADER">Department Leader</option>
              <option value="COORDINATOR">Coordinator</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-dept">Department</label>
            <select
              id="member-dept"
              className="form-select"
              value={formData.departmentId}
              onChange={e => setFormData(p => ({ ...p, departmentId: e.target.value }))}
            >
              <option value="">None</option>
              {(departments || []).map((d: Department) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {!editMember && (
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <div className="form-hint">
                Default password: <strong>bytecraft2026</strong>. The manager can change it after first login.
              </div>
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
