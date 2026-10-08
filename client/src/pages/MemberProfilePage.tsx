import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Phone, Calendar, Briefcase, Building2,
  CheckSquare, Clock, AlertCircle, Edit2, Plus, Trash2,
  ExternalLink, MessageSquare, Award, UserX, UserCheck
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Avatar from '../components/ui/Avatar';
import TaskItem from '../components/common/TaskItem';
import ProgressBar from '../components/ui/ProgressBar';
import Modal from '../components/ui/Modal';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate } from '../lib/utils';
import api from '../lib/api';
import type { User, Department, Task, Responsibility, Event, CommunicationItem } from '../lib/types';

interface UserDetailData {
  user: User;
  department: Department | null;
  tasks: Task[];
  responsibilities: Responsibility[];
  events: Event[];
  communicationItems: CommunicationItem[];
  activity: any[];
}

export default function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const { showToast } = useToast();

  const { data, loading, refetch } = useFetch<UserDetailData>(`/users/${id}`);
  const { data: allDepts } = useFetch<Department[]>('/departments');

  const [activeTab, setActiveTab] = useState<'tasks' | 'events' | 'communication' | 'responsibilities'>('tasks');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRespModal, setShowRespModal] = useState(false);
  const [respTitle, setRespTitle] = useState('');
  const [respDesc, setRespDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit member form
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'MEMBER' as User['role'],
    position: '',
    departmentId: '',
    phone: '',
    whatsapp: '',
    avatarUrl: '',
    linkedin: '',
    github: '',
    instagram: '',
  });

  const member = data?.user;
  const dept = data?.department;
  const tasks = data?.tasks || [];
  const responsibilities = data?.responsibilities || [];
  const events = data?.events || [];
  const comItems = data?.communicationItems || [];

  const isCoordinator = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'].includes(me?.role || '');
  const isSelf = me?.id === member?.id;
  const isDeptLeader = (me?.role === 'DEPARTMENT_LEADER' || me?.role === 'MANAGER') && me?.departmentId === member?.departmentId;
  const canManage = isCoordinator || isDeptLeader;

  const todayStr = new Date().toISOString().split('T')[0];
  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED');
  const overdueTasks = activeTasks.filter(t => t.deadline && t.deadline < todayStr);
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  const openEdit = () => {
    if (!member) return;
    setEditForm({
      name: member.name,
      email: member.email,
      role: member.role,
      position: member.position || '',
      departmentId: member.departmentId || '',
      phone: member.phone || '',
      whatsapp: member.whatsapp || member.phone || '',
      avatarUrl: member.avatarUrl || '',
      linkedin: member.socialLinks?.linkedin || '',
      github: member.socialLinks?.github || '',
      instagram: member.socialLinks?.instagram || '',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!member) return;
    setSaving(true);
    try {
      await api.patch(`/users/${member.id}`, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        position: editForm.position,
        departmentId: editForm.departmentId || null,
        phone: editForm.phone,
        whatsapp: editForm.whatsapp,
        avatarUrl: editForm.avatarUrl,
        socialLinks: {
          linkedin: editForm.linkedin,
          github: editForm.github,
          instagram: editForm.instagram,
        }
      });
      showToast('Member profile updated successfully', 'success');
      setShowEditModal(false);
      refetch();
    } catch {
      showToast('Failed to update member profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!member) return;
    const action = member.isActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} ${member.name}'s account?`)) return;
    try {
      await api.patch(`/users/${member.id}`, { isActive: !member.isActive });
      showToast(`Account ${action}d.`, 'success');
      refetch();
    } catch {
      showToast('Action failed', 'error');
    }
  };

  const handleAddResponsibility = async () => {
    if (!member || !respTitle.trim()) {
      showToast('Responsibility title is required', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/users/${member.id}/responsibilities`, {
        title: respTitle.trim(),
        description: respDesc.trim()
      });
      showToast('Responsibility assigned', 'success');
      setShowRespModal(false);
      setRespTitle('');
      setRespDesc('');
      refetch();
    } catch {
      showToast('Failed to assign responsibility', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResponsibility = async (respId: string) => {
    if (!member) return;
    try {
      await api.delete(`/users/${member.id}/responsibilities/${respId}`);
      showToast('Responsibility removed', 'success');
      refetch();
    } catch {
      showToast('Failed to remove responsibility', 'error');
    }
  };

  if (loading) {
    return (
      <AppLayout title="Member Profile">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="skeleton" style={{ height: 180, borderRadius: 16 }} />
          <div className="skeleton" style={{ height: 320, borderRadius: 16 }} />
        </div>
      </AppLayout>
    );
  }

  if (!member) {
    return (
      <AppLayout title="Member Not Found">
        <div className="empty-state">
          <div className="empty-title">Member not found</div>
          <div className="empty-desc">The requested member could not be located in the club directory.</div>
          <button className="btn btn-secondary" onClick={() => navigate('/team')}>
            <ArrowLeft size={16} /> Back to Team Directory
          </button>
        </div>
      </AppLayout>
    );
  }

  const social = member.socialLinks || {};
  const hasSocials = Boolean(social.linkedin || social.github || social.instagram || social.facebook || social.website);

  return (
    <AppLayout title={member.name} subtitle={member.position || 'ByteCraft Member'}>
      {/* Top back button */}
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/team')}>
          <ArrowLeft size={14} /> Back to Team
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 18 }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Avatar src={member.avatarUrl} name={member.name} size="xl" />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>
                  {member.name}
                </h2>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', color: 'var(--text-secondary)', fontSize: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Briefcase size={14} style={{ color: 'var(--cyan)' }} />
                  <span style={{ fontWeight: 600 }}>{member.position || 'Club Contributor'}</span>
                </div>
                {dept && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color }} />
                    <span style={{ fontWeight: 600 }}>{dept.name}</span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Calendar size={14} style={{ color: '#94A3B8' }} />
                  <span>Joined {formatDate(member.joinedDate)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {canManage && (
              <button className="btn btn-secondary btn-sm" onClick={openEdit}>
                <Edit2 size={14} /> Edit Profile
              </button>
            )}
            {isCoordinator && !isSelf && (
              <button
                className={`btn btn-sm ${member.isActive ? 'btn-danger' : 'btn-secondary'}`}
                onClick={handleToggleActive}
              >
                {member.isActive ? <><UserX size={14} /> Deactivate</> : <><UserCheck size={14} /> Reactivate</>}
              </button>
            )}
          </div>
        </div>

        {/* Quick Contact Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
          marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)'
        }}>
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--cyan)' }}
              title="Send email"
            >
              <Mail size={14} /> {member.email}
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-secondary)' }}
              title="Call member"
            >
              <Phone size={14} /> {member.phone}
            </a>
          )}
          {member.whatsapp && (
            <a
              href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: '#10B981' }}
              title="WhatsApp chat"
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
          )}

          {social.linkedin && (
            <a
              href={social.linkedin.startsWith('http') ? social.linkedin : `https://${social.linkedin}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: '#0A66C2' }}
              title="LinkedIn Profile"
            >
              <ExternalLink size={14} /> LinkedIn
            </a>
          )}
          {social.github && (
            <a
              href={social.github.startsWith('http') ? social.github : `https://github.com/${social.github}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              title="GitHub Profile"
            >
              <ExternalLink size={14} /> GitHub
            </a>
          )}
          {social.instagram && (
            <a
              href={social.instagram.startsWith('http') ? social.instagram : `https://instagram.com/${social.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ color: '#E1306C' }}
              title="Instagram Profile"
            >
              <ExternalLink size={14} /> Instagram
            </a>
          )}
          {social.discord && (
            <span
              className="btn btn-ghost btn-sm"
              style={{ color: '#5865F2' }}
              title="Discord Handle"
            >
              <MessageSquare size={14} /> Discord: {social.discord}
            </span>
          )}
        </div>
      </div>

      {/* Work Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
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
          <div style={{ fontSize: 26, fontWeight: 800, color: '#8B5CF6' }}>{responsibilities.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Responsibilities</div>
        </div>
        <div className="card" style={{ padding: '16px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>{events.length}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Related Events</div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div style={{
        display: 'flex', gap: 8, borderBottom: '1px solid var(--border-subtle)',
        marginBottom: 20, overflowX: 'auto', paddingBottom: 4
      }}>
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
          Tasks & Deadlines ({tasks.length})
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
          Responsibilities ({responsibilities.length})
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
          Related Events ({events.length})
        </button>
        {comItems.length > 0 && (
          <button
            onClick={() => setActiveTab('communication')}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === 'communication' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'communication' ? 'var(--cyan)' : 'var(--text-secondary)',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
              borderBottom: activeTab === 'communication' ? '2px solid var(--cyan)' : 'none'
            }}
          >
            Publications ({comItems.length})
          </button>
        )}
      </div>

      {/* Tab Content: Tasks */}
      {activeTab === 'tasks' && (
        <div>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><CheckSquare size={24} /></div>
              <div className="empty-title">No tasks assigned</div>
              <div className="empty-desc">This member currently has no tasks on their plate.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tasks.map(t => (
                <TaskItem
                  key={t.id}
                  task={t}
                  showAssignee={false}
                  showDepartment={true}
                  showDeadline={true}
                  canToggle={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Responsibilities */}
      {activeTab === 'responsibilities' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Organizational assignments and key responsibilities held by {member.name}.
            </p>
            {canManage && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowRespModal(true)}>
                <Plus size={14} /> Add Responsibility
              </button>
            )}
          </div>

          {responsibilities.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Award size={24} /></div>
              <div className="empty-title">No responsibilities assigned</div>
              <div className="empty-desc">Assign specific responsibilities (e.g. Design, Photography, Animation) to this member.</div>
              {canManage && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowRespModal(true)}>
                  <Plus size={14} /> Assign Responsibility
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {responsibilities.map(r => (
                <div key={r.id} className="card" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, background: 'rgba(2,132,199,0.12)',
                      color: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Award size={16} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{r.title}</div>
                      {r.description && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.description}</div>}
                    </div>
                  </div>
                  {canManage && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      style={{ color: '#EF4444' }}
                      onClick={() => handleDeleteResponsibility(r.id)}
                      title="Remove responsibility"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Events */}
      {activeTab === 'events' && (
        <div>
          {events.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Calendar size={24} /></div>
              <div className="empty-title">No associated events</div>
              <div className="empty-desc">This member is not currently assigned as organizer or key crew for any event.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {events.map(e => (
                <div
                  key={e.id}
                  className="card"
                  style={{ padding: '16px 18px', cursor: 'pointer' }}
                  onClick={() => navigate(`/events/${e.id}`)}
                >
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{e.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                    {e.date} • {e.location}
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                    background: 'rgba(2,132,199,0.12)', color: 'var(--cyan)'
                  }}>
                    {e.eventType}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Communication Items */}
      {activeTab === 'communication' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comItems.map(item => (
            <div key={item.id} className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Platform: {item.channel || (item as any).platform} • Date: {item.publicationDate} {(item as any).publicationTime}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: '#f1f5f9' }}>
                {(item as any).contentType || 'POST'}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Edit Member Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Member Information"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </>
        }
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Full Name *</label>
            <input
              className="form-input"
              value={editForm.name}
              onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              type="email"
              className="form-input"
              value={editForm.email}
              onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Position (Job/Title)</label>
            <input
              className="form-input"
              placeholder="e.g. Developer, Animator, Designer"
              value={editForm.position}
              onChange={e => setEditForm(p => ({ ...p, position: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Permission Role</label>
            <select
              className="form-select"
              value={editForm.role}
              onChange={e => setEditForm(p => ({ ...p, role: e.target.value as any }))}
              disabled={!isCoordinator}
            >
              <option value="PRESIDENT">President</option>
              <option value="VICE_PRESIDENT">Vice President</option>
              <option value="COORDINATOR">Coordinator</option>
              <option value="HR">HR</option>
              <option value="SECRETARY">Secretary</option>
              <option value="MANAGER">Manager</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Department</label>
            <select
              className="form-select"
              value={editForm.departmentId}
              onChange={e => setEditForm(p => ({ ...p, departmentId: e.target.value }))}
              disabled={!isCoordinator}
            >
              <option value="">None / Unassigned</option>
              {(allDepts || []).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              placeholder="+213 555 12 34 56"
              value={editForm.phone}
              onChange={e => setEditForm(p => ({ ...p, phone: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Number</label>
            <input
              className="form-input"
              placeholder="+213 555 12 34 56"
              value={editForm.whatsapp}
              onChange={e => setEditForm(p => ({ ...p, whatsapp: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">LinkedIn Profile URL</label>
            <input
              className="form-input"
              placeholder="https://linkedin.com/in/..."
              value={editForm.linkedin}
              onChange={e => setEditForm(p => ({ ...p, linkedin: e.target.value }))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">GitHub Username / URL</label>
            <input
              className="form-input"
              placeholder="username"
              value={editForm.github}
              onChange={e => setEditForm(p => ({ ...p, github: e.target.value }))}
            />
          </div>

          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Instagram Handle / URL</label>
            <input
              className="form-input"
              placeholder="@handle"
              value={editForm.instagram}
              onChange={e => setEditForm(p => ({ ...p, instagram: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Add Responsibility Modal */}
      <Modal
        isOpen={showRespModal}
        onClose={() => setShowRespModal(false)}
        title={`Assign Responsibility to ${member.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRespModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleAddResponsibility} disabled={saving}>
              {saving ? 'Assigning…' : 'Assign'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Responsibility Title *</label>
            <input
              className="form-input"
              placeholder="e.g. Social Media Management, Event Animation, Photography"
              value={respTitle}
              onChange={e => setRespTitle(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Description / Scope (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="Key responsibilities and expectations..."
              value={respDesc}
              onChange={e => setRespDesc(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
