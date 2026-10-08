import { useState, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus, Search, UserCheck, UserX, Edit2, Upload, Camera, X,
  Phone, Mail, Copy, Check, Users, Crown, Briefcase, ChevronRight, Shield
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { User, Department, UserRole } from '../lib/types';
import api from '../lib/api';

const CLOUDINARY_CLOUD_NAME = 'bytecraft-club';
const CLOUDINARY_UPLOAD_PRESET = 'bytecraft_avatars';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  formData.append('folder', 'team');
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: formData }
  );
  if (!response.ok) throw new Error('Image upload failed. Storing locally.');
  const data = await response.json();
  return data.secure_url;
}

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'MANAGER' as UserRole,
  position: '',
  departmentId: '',
  phone: '',
  avatarUrl: '',
};

const BOARD_ROLES: UserRole[] = ['PRESIDENT', 'VICE_PRESIDENT', 'COORDINATOR', 'HR', 'SECRETARY'];

const ROLE_LABELS: Record<string, string> = {
  COORDINATOR: 'Coordinator',
  PRESIDENT: 'President',
  VICE_PRESIDENT: 'Vice President',
  HR: 'Human Resources',
  SECRETARY: 'General Secretary',
  MANAGER: 'Department Manager',
  DEPARTMENT_LEADER: 'Department Leader',
  MEMBER: 'Member',
};

const ROLE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  PRESIDENT:         { bg: 'rgba(255, 255, 255, 0.08)', color: '#f4f4f5', border: 'rgba(255, 255, 255, 0.16)' },
  VICE_PRESIDENT:    { bg: 'rgba(255, 255, 255, 0.06)', color: '#e4e4e7', border: 'rgba(255, 255, 255, 0.12)' },
  COORDINATOR:       { bg: 'rgba(255, 255, 255, 0.06)', color: '#e4e4e7', border: 'rgba(255, 255, 255, 0.12)' },
  HR:                { bg: 'rgba(255, 255, 255, 0.06)', color: '#e4e4e7', border: 'rgba(255, 255, 255, 0.12)' },
  SECRETARY:         { bg: 'rgba(255, 255, 255, 0.06)', color: '#e4e4e7', border: 'rgba(255, 255, 255, 0.12)' },
  MANAGER:           { bg: 'rgba(255, 255, 255, 0.04)', color: '#a1a1aa', border: 'rgba(255, 255, 255, 0.08)' },
  DEPARTMENT_LEADER: { bg: 'rgba(255, 255, 255, 0.04)', color: '#a1a1aa', border: 'rgba(255, 255, 255, 0.08)' },
  MEMBER:            { bg: 'rgba(255, 255, 255, 0.03)', color: '#71717a', border: 'rgba(255, 255, 255, 0.06)' },
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
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'BOARD' | 'MANAGERS'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const isCoordinator = BOARD_ROLES.includes((me?.role || '') as UserRole);
  const memberList = (members as User[]) || [];

  const filteredMembers = useMemo(() => {
    return memberList.filter(member => {
      if (activeCategory === 'BOARD') return BOARD_ROLES.includes(member.role);
      if (activeCategory === 'MANAGERS') return member.role === 'MANAGER' || member.role === 'DEPARTMENT_LEADER';
      return true;
    });
  }, [memberList, activeCategory]);

  const boardMembers = useMemo(() => memberList.filter(m => BOARD_ROLES.includes(m.role)), [memberList]);
  const managerMembers = useMemo(() => memberList.filter(m => m.role === 'MANAGER' || m.role === 'DEPARTMENT_LEADER'), [memberList]);

  const managersByDept = useMemo(() => {
    const grouped: Record<string, { dept?: Department; managers: User[] }> = {};
    const deptList = (departments || []) as Department[];
    managerMembers.forEach(m => {
      const deptId = m.departmentId || 'none';
      if (!grouped[deptId]) {
        grouped[deptId] = { dept: deptList.find(d => d.id === deptId), managers: [] };
      }
      grouped[deptId].managers.push(m);
    });
    return grouped;
  }, [managerMembers, departments]);

  const copyToClipboard = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast(`Copied: ${text}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCreate = () => { setEditMember(null); setFormData(EMPTY_FORM); setPreviewUrl(''); setShowModal(true); };

  const openEdit = (member: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditMember(member);
    setFormData({ name: member.name, email: member.email, role: member.role, position: member.position || '', departmentId: member.departmentId || '', phone: member.phone || '', avatarUrl: member.avatarUrl || '' });
    setPreviewUrl(member.avatarUrl || '');
    setShowModal(true);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setUploadingImage(true);
    try {
      const cloudUrl = await uploadToCloudinary(file);
      setFormData(p => ({ ...p, avatarUrl: cloudUrl }));
      setPreviewUrl(cloudUrl);
      showToast('Photo uploaded!', 'success');
    } catch {
      const reader = new FileReader();
      reader.onload = ev => { const d = ev.target?.result as string; setFormData(p => ({ ...p, avatarUrl: d })); setPreviewUrl(d); };
      reader.readAsDataURL(file);
      showToast('Photo saved locally', 'success');
    } finally { setUploadingImage(false); }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.email) { showToast('Name and email are required.', 'error'); return; }
    setSaving(true);
    try {
      if (editMember) { await api.patch(`/users/${editMember.id}`, formData); showToast('Profile updated.', 'success'); }
      else { await api.post('/users', formData); showToast('Member added! Default password: bytecraft2026', 'success'); }
      setShowModal(false);
      refetch();
    } catch (err) { showToast(err instanceof Error ? err.message : 'Save failed.', 'error'); }
    finally { setSaving(false); }
  };

  const handleDeactivate = async (member: User, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`${member.isActive ? 'Deactivate' : 'Reactivate'} ${member.name}?`)) return;
    try {
      await api.patch(`/users/${member.id}`, { isActive: !member.isActive });
      showToast(`Account ${member.isActive ? 'deactivated' : 'reactivated'}.`, 'success');
      refetch();
    } catch { showToast('Failed to update.', 'error'); }
  };

  const rolNeedsDept = !BOARD_ROLES.includes(formData.role);
  const boardFiltered = boardMembers.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <AppLayout
      title="Team"
      subtitle={`${memberList.filter(m => m.isActive).length} active members`}
      actions={isCoordinator ? (
        <button id="add-member-btn" className="btn btn-primary" onClick={openCreate} style={{ padding: '7px 14px', fontSize: 13, gap: 6 }}>
          <Plus size={15} /> Add Member
        </button>
      ) : undefined}
    >
      <style>{`
        .team-cat-tabs { display:flex; gap:4px; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:10px; padding:4px; margin-bottom:20px; overflow-x:auto; -webkit-overflow-scrolling:touch; scrollbar-width:none; }
        .team-cat-tabs::-webkit-scrollbar { display:none; }
        .team-cat-tab { flex:1; min-width:90px; display:flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border-radius:7px; border:none; font-size:13px; font-weight:500; cursor:pointer; transition:all 0.15s; white-space:nowrap; color:var(--text-muted); background:transparent; }
        .team-cat-tab.active { background:var(--accent-primary,#6366F1); color:#fff; font-weight:600; }
        .team-filter-bar { display:flex; gap:10px; align-items:center; margin-bottom:20px; flex-wrap:wrap; }
        .team-search { flex:1; min-width:200px; position:relative; }
        .team-search input { width:100%; padding:8px 32px 8px 34px; border-radius:8px; border:1px solid var(--border); background:var(--bg-surface); color:var(--text-primary); font-size:13px; outline:none; box-sizing:border-box; }
        .team-search input:focus { border-color:var(--accent-primary); }
        .team-search .si { position:absolute; left:10px; top:50%; transform:translateY(-50%); color:var(--text-muted); pointer-events:none; }
        .board-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(155px,1fr)); gap:12px; margin-bottom:28px; }
        .board-card { display:flex; flex-direction:column; align-items:center; text-align:center; padding:20px 14px 16px; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:12px; cursor:pointer; transition:all 0.15s; position:relative; gap:8px; }
        .board-card:hover { border-color:var(--accent-primary); background:var(--bg-elevated); transform:translateY(-1px); }
        .role-pill { font-size:10px; font-weight:700; padding:2px 8px; border-radius:99px; letter-spacing:0.03em; text-transform:uppercase; }
        .board-actions { position:absolute; top:8px; right:8px; gap:2px; display:none; }
        .board-card:hover .board-actions, .board-card:focus-within .board-actions { display:flex; }
        .dept-group { margin-bottom:16px; }
        .dept-group-header { display:flex; align-items:center; gap:8px; padding:4px 0 8px; margin-bottom:4px; border-bottom:1px solid var(--border-subtle); }
        .manager-row { display:flex; align-items:center; gap:12px; padding:11px 14px; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:9px; cursor:pointer; transition:all 0.12s; margin-bottom:6px; }
        .manager-row:hover { border-color:var(--accent-primary); background:var(--bg-elevated); }
        .manager-row-info { flex:1; min-width:0; }
        .manager-row-contacts { display:flex; align-items:center; gap:6px; flex-shrink:0; }
        .manager-row-actions { display:none; align-items:center; gap:3px; flex-shrink:0; }
        .manager-row:hover .manager-row-actions { display:flex; }
        .contact-btn { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-muted); padding:4px 7px; border-radius:6px; background:var(--bg-elevated); border:1px solid var(--border-subtle); cursor:pointer; text-decoration:none; white-space:nowrap; transition:all 0.12s; }
        .contact-btn:hover { border-color:var(--accent-primary); color:var(--text-primary); }
        .section-header { display:flex; align-items:center; gap:8px; margin-bottom:14px; }
        .section-label { font-size:12px; font-weight:700; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.07em; }
        @media (max-width:640px) {
          .board-grid { grid-template-columns:repeat(2,1fr); gap:8px; }
          .board-card { padding:14px 10px 12px; }
          .team-filter-bar { flex-direction:column; align-items:stretch; gap:8px; }
          .team-search { min-width:0; }
          .manager-row { padding:9px 10px; gap:10px; }
          .contact-btn { padding:4px 6px; }
          .board-card .board-actions { display:flex; }
        }
      `}</style>

      {/* Category Tabs */}
      <div className="team-cat-tabs">
        <button className={`team-cat-tab ${activeCategory === 'ALL' ? 'active' : ''}`} onClick={() => setActiveCategory('ALL')}>
          <Users size={14} /> All ({memberList.length})
        </button>
        <button className={`team-cat-tab ${activeCategory === 'BOARD' ? 'active' : ''}`} onClick={() => setActiveCategory('BOARD')}>
          <Crown size={14} /> Board ({boardMembers.length})
        </button>
        <button className={`team-cat-tab ${activeCategory === 'MANAGERS' ? 'active' : ''}`} onClick={() => setActiveCategory('MANAGERS')}>
          <Briefcase size={14} /> Managers ({managerMembers.length})
        </button>
      </div>

      {/* Filter Bar */}
      <div className="team-filter-bar">
        <div className="team-search">
          <Search size={14} className="si" />
          <input
            id="team-search-input"
            type="text"
            placeholder="Search by name, email, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:0 }}>
              <X size={12} />
            </button>
          )}
        </div>
        {activeCategory !== 'BOARD' && (
          <select className="form-select" style={{ fontSize:13, padding:'8px 12px', minWidth:150, flex:'0 1 180px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {(departments || []).map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        )}
        {activeCategory === 'ALL' && (
          <select className="form-select" style={{ fontSize:13, padding:'8px 12px', minWidth:130, flex:'0 1 160px' }} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="">All Roles</option>
            <option value="PRESIDENT">President</option>
            <option value="VICE_PRESIDENT">Vice President</option>
            <option value="COORDINATOR">Coordinator</option>
            <option value="HR">Human Resources</option>
            <option value="SECRETARY">Secretary</option>
            <option value="MANAGER">Manager</option>
          </select>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height:56, borderRadius:9 }} />)}
        </div>
      )}

      {/* Empty */}
      {!loading && filteredMembers.length === 0 && (
        <div style={{ padding:'48px 20px', textAlign:'center' }}>
          <Users size={36} style={{ margin:'0 auto 12px', color:'var(--text-muted)' }} />
          <div style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>No members found</div>
          <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:16 }}>No team members match your current filters.</div>
          {isCoordinator && <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Member</button>}
        </div>
      )}

      {!loading && filteredMembers.length > 0 && (
        <>
          {/* BOARD SECTION */}
          {(activeCategory === 'ALL' || activeCategory === 'BOARD') && boardFiltered.length > 0 && (
            <div style={{ marginBottom:28 }}>
              <div className="section-header">
                <Shield size={15} style={{ color:'#A78BFA' }} />
                <span className="section-label">Executive Board</span>
              </div>
              <div className="board-grid">
                {boardFiltered.map(member => {
                  const roleStyle = ROLE_STYLES[member.role] || ROLE_STYLES.MEMBER;
                  return (
                    <div key={member.id} className="board-card" onClick={() => navigate(`/team/${member.id}`)} style={{ opacity: member.isActive ? 1 : 0.5 }}>
                      {isCoordinator && (
                        <div className="board-actions" onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={e => openEdit(member, e)} title="Edit" style={{ padding:4, width:24, height:24 }}><Edit2 size={11} /></button>
                          <button className="btn btn-ghost btn-icon btn-sm" style={{ padding:4, width:24, height:24, color: member.isActive ? '#F87171' : '#34D399' }} onClick={e => handleDeactivate(member, e)} title={member.isActive ? 'Deactivate' : 'Reactivate'}>{member.isActive ? <UserX size={11} /> : <UserCheck size={11} />}</button>
                        </div>
                      )}
                      <Avatar src={member.avatarUrl} name={member.name} size="lg" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', marginBottom: 5, lineHeight: 1.3 }}>{member.name}</div>
                        <span className="role-pill" style={{ background: roleStyle.bg, color: roleStyle.color, border: `1px solid ${roleStyle.border}` }}>
                          {ROLE_LABELS[member.role] || member.role}
                        </span>
                      </div>
                      {member.phone && (
                        <div onClick={e => { e.stopPropagation(); window.location.href = `tel:${member.phone}`; }} style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                          <Phone size={10} style={{ color: '#94a3b8' }} />{member.phone}
                        </div>
                      )}
                      <ChevronRight size={14} style={{ color: 'var(--text-muted)', position: 'absolute', bottom: 10, right: 10 }} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MANAGERS SECTION */}
          {(activeCategory === 'ALL' || activeCategory === 'MANAGERS') && (
            <div>
              <div className="section-header">
                <Briefcase size={15} style={{ color: '#94a3b8' }} />
                <span className="section-label">Department Managers</span>
              </div>
              {Object.entries(managersByDept).map(([deptId, { dept, managers }]) => {
                const filtered = managers.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div key={deptId} className="dept-group">
                    <div className="dept-group-header">
                      {dept ? (
                        <>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: dept.color || '#64748b', display: 'inline-block', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{dept.name}</span>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{filtered.length} manager{filtered.length !== 1 ? 's' : ''}</span>
                        </>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>No Department</span>
                      )}
                    </div>
                    {filtered.map(member => {
                      const discordHandle = member.socialLinks?.discord;
                      return (
                        <div key={member.id} className="manager-row" onClick={() => navigate(`/team/${member.id}`)} style={{ opacity: member.isActive ? 1 : 0.5 }}>
                          <Avatar src={member.avatarUrl} name={member.name} size="md" />
                          <div className="manager-row-info">
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{member.position || ROLE_LABELS[member.role] || 'Manager'}</div>
                          </div>
                          <div className="manager-row-contacts" onClick={e => e.stopPropagation()}>
                            {member.phone && <a href={`tel:${member.phone}`} className="contact-btn" title={member.phone}><Phone size={11} style={{ color:'#0284c7' }} />{member.phone}</a>}
                            {discordHandle && (
                              <button onClick={e => copyToClipboard(discordHandle, member.id, e)} className="contact-btn" title={`Discord: ${discordHandle}`}>
                                {copiedId === member.id ? <Check size={11} style={{ color:'#10B981' }} /> : <Copy size={11} style={{ color:'#6366F1' }} />}
                                {discordHandle}
                              </button>
                            )}
                            <a href={`mailto:${member.email}`} className="contact-btn" title={member.email} onClick={e => e.stopPropagation()}><Mail size={11} /></a>
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-muted)', textAlign:'right', flexShrink:0, marginRight:4 }}>
                            <span style={{ fontWeight:700, fontSize:14, color: member.activeTasksCount ? 'var(--accent-primary,#6366F1)' : 'var(--text-muted)' }}>{member.activeTasksCount ?? 0}</span>
                            <div>tasks</div>
                          </div>
                          {isCoordinator && (
                            <div className="manager-row-actions" onClick={e => e.stopPropagation()}>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={e => openEdit(member, e)} title="Edit" style={{ padding:5 }}><Edit2 size={13} /></button>
                              <button className="btn btn-ghost btn-icon btn-sm" style={{ padding:5, color: member.isActive ? '#F87171' : '#34D399' }} onClick={e => handleDeactivate(member, e)} title={member.isActive ? 'Deactivate' : 'Reactivate'}>{member.isActive ? <UserX size={13} /> : <UserCheck size={13} />}</button>
                            </div>
                          )}
                          <ChevronRight size={14} style={{ color:'var(--text-muted)', flexShrink:0 }} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* MODAL */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMember ? 'Edit Member' : 'Add Team Member'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving || uploadingImage}>
              {saving ? 'Saving...' : editMember ? 'Save Changes' : 'Add Member'}
            </button>
          </>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div className="form-group">
            <label className="form-label">Profile Photo</label>
            <div style={{ display:'flex', alignItems:'center', gap:14 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', overflow:'hidden', background:'var(--bg-elevated)', border:'2px solid var(--border-subtle)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                {previewUrl ? <img src={previewUrl} alt="Preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <Camera size={20} style={{ color:'var(--text-muted)' }} />}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleImageSelect} id="avatar-upload-input" />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  <Upload size={13} />{uploadingImage ? 'Uploading...' : 'Upload Photo'}
                </button>
                {previewUrl && <button type="button" className="btn btn-ghost btn-sm" style={{ color:'#F87171' }} onClick={() => { setPreviewUrl(''); setFormData(p => ({ ...p, avatarUrl:'' })); }}><X size={12} /> Remove</button>}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="member-name">Full Name *</label>
            <input id="member-name" className="form-input" placeholder="e.g. Elmouatez Billah Ledjassa" value={formData.name} onChange={e => setFormData(p => ({ ...p, name:e.target.value }))} />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="member-email">Email *</label>
              <input id="member-email" type="email" className="form-input" placeholder="name@estin.dz" value={formData.email} onChange={e => setFormData(p => ({ ...p, email:e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="member-phone">Phone</label>
              <input id="member-phone" className="form-input" placeholder="0540226970" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone:e.target.value }))} />
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="member-position">Position Title</label>
              <input id="member-position" className="form-input" placeholder="e.g. President, Manager" value={formData.position} onChange={e => setFormData(p => ({ ...p, position:e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="member-role">Permission Role *</label>
              <select id="member-role" className="form-select" value={formData.role} onChange={e => setFormData(p => ({ ...p, role:e.target.value as UserRole, departmentId:BOARD_ROLES.includes(e.target.value as UserRole) ? '' : p.departmentId }))}>
                <optgroup label="Executive Board">
                  <option value="PRESIDENT">President</option>
                  <option value="VICE_PRESIDENT">Vice President</option>
                  <option value="COORDINATOR">Coordinator</option>
                  <option value="HR">Human Resources</option>
                  <option value="SECRETARY">General Secretary</option>
                </optgroup>
                <optgroup label="Department">
                  <option value="MANAGER">Department Manager</option>
                </optgroup>
              </select>
            </div>
          </div>

          {rolNeedsDept && (
            <div className="form-group">
              <label className="form-label" htmlFor="member-dept">Department *</label>
              <select id="member-dept" className="form-select" value={formData.departmentId} onChange={e => setFormData(p => ({ ...p, departmentId:e.target.value }))}>
                <option value="">Select Department...</option>
                {(departments || []).map((d: Department) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}

          {!editMember && (
            <div style={{ fontSize:12, color:'var(--text-muted)', padding:'8px 12px', background:'var(--bg-elevated)', borderRadius:7, border:'1px solid var(--border-subtle)' }}>
              Default password: <strong style={{ color:'var(--text-primary)' }}>bytecraft2026</strong>. Member can change it after first login.
            </div>
          )}
        </div>
      </Modal>
    </AppLayout>
  );
}
