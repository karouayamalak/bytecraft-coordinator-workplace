import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search, Moon, Sun, CheckSquare, Square, Plus, Shield,
  Calendar, ArrowRight, Clock, AlertCircle, Sparkles,
  Users, CheckCircle2, ChevronRight, Menu, X, Lock,
  Share2, LayoutDashboard, Flag
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useFetch } from '../hooks/useFetch';
import { useAuth, DEMO_USERS } from '../contexts/AuthContext';
import { useVisibility } from '../contexts/VisibilityContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import type { DashboardData, Task } from '../lib/types';
import Avatar from '../components/ui/Avatar';
import CoordinatorVisibilityModal from '../components/common/CoordinatorVisibilityModal';
import { formatDate, getDeadlineUrgency, truncate } from '../lib/utils';
import api from '../lib/api';

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'overdue': return { label: 'Overdue', color: '#EF4444', bg: '#fee2e2' };
    case 'today':   return { label: 'Due Today', color: '#F97316', bg: '#ffedd5' };
    case 'soon':    return { label: 'Due Soon', color: '#D97706', bg: '#fef3c7' };
    default:        return { label: 'On Track', color: '#059669', bg: '#d1fae5' };
  }
}

export default function DashboardPage() {
  const { user, department, switchDemoUser, logout } = useAuth();
  const { isModuleAllowed, canViewDepartment } = useVisibility();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const { data, refetch } = useFetch<DashboardData>('/dashboard/summary');
  const { data: rawTasks, refetch: refetchTasks } = useFetch<Task[]>('/tasks');

  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [togglingTaskId, setTogglingTaskId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'all' | 'mine' | 'urgent' | 'completed'>('all');

  // Real-time synchronization
  useWebSocket(msg => {
    if (['TASK_CREATED', 'TASK_UPDATED', 'TASK_DELETED', 'EVENT_CREATED', 'EVENT_UPDATED', 'SETTINGS_UPDATED'].includes(msg.type)) {
      refetch();
      refetchTasks();
    }
  });

  const isCoordinator = user?.role === 'COORDINATOR';
  const deptName = (department?.name || '').toLowerCase();
  const isCommsDept = isCoordinator ||
    deptName.includes('communication') ||
    deptName.includes('relations') ||
    deptName.includes('external');

  // Handle checking/unchecking task
  const handleToggleTaskDone = async (task: Task) => {
    const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';
    const canCheck = isCoordinator || (isManager && task.assignedMemberId === user?.id);

    if (!canCheck) {
      showToast('You can only check tasks assigned to you.', 'error');
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
            particleCount: 50,
            spread: 60,
            origin: { y: 0.7 }
          });
        } catch {
          // ignore if confetti fails
        }
      }

      showToast(isDone ? 'Task marked as pending' : 'Task completed! 🎉', 'success');
      refetchTasks();
      refetch();
    } catch {
      showToast('Failed to update task status.', 'error');
    } finally {
      setTogglingTaskId(null);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  const stats = data?.stats || {
    totalMembers: 28,
    departmentsCount: 6,
    activeTasks: 18,
    completedTasks: 12,
    overdueTasks: 1,
    upcomingEvents: 3,
    tasksDueThisWeek: 5,
    tasksDueToday: 1
  };

  const nextEvent = data?.nextEventPrep;

  // Filter & sort tasks by deadline date ascending (earliest first)
  const allTasks = useMemo(() => {
    const list = rawTasks || [];
    return [...list].sort((a, b) => {
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  }, [rawTasks]);

  // Tab counts
  const myTasksCount = allTasks.filter(t => t.assignedMemberId === user?.id && t.status !== 'COMPLETED').length;
  const urgentTasksCount = allTasks.filter(t => {
    if (t.status === 'COMPLETED') return false;
    const urgency = getDeadlineUrgency(t.deadline, t.status);
    return urgency === 'overdue' || urgency === 'today' || urgency === 'soon';
  }).length;
  const completedTasksCount = allTasks.filter(t => t.status === 'COMPLETED').length;

  // Filtered tasks based on active tab & search query
  const displayedTasks = useMemo(() => {
    return allTasks.filter(task => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = task.title.toLowerCase().includes(q) ||
          (task.description && task.description.toLowerCase().includes(q)) ||
          (task.department?.name && task.department.name.toLowerCase().includes(q));
        if (!matches) return false;
      }

      if (taskFilter === 'mine') {
        return task.assignedMemberId === user?.id && task.status !== 'COMPLETED';
      }
      if (taskFilter === 'urgent') {
        if (task.status === 'COMPLETED') return false;
        const urgency = getDeadlineUrgency(task.deadline, task.status);
        return urgency === 'overdue' || urgency === 'today' || urgency === 'soon';
      }
      if (taskFilter === 'completed') {
        return task.status === 'COMPLETED';
      }
      // 'all' tab shows pending tasks first
      return task.status !== 'COMPLETED';
    }).slice(0, 8);
  }, [allTasks, taskFilter, searchQuery, user?.id]);

  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="sky-container" style={{ minHeight: '100vh', paddingBottom: 60 }}>
      {/* ── TOP NAVIGATION BAR ── */}
      <header className="nav-header" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '12px 24px',
        background: 'rgba(7, 89, 133, 0.75)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.15)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        {/* Brand Logo only (no text as requested) */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <img
            src="/bytecraft-logo.png"
            alt="ByteCraft Logo"
            style={{ height: 42, width: 'auto', objectFit: 'contain' }}
          />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="desktop-nav" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Link to="/" style={activeNavStyle}>Dashboard</Link>
          <Link to="/tasks" style={navStyle}>Tasks</Link>
          <Link to="/deadlines" style={navStyle}>Deadlines</Link>
          <Link to="/agenda" style={navStyle}>Agenda</Link>
          <Link to="/events" style={navStyle}>Events</Link>
          {isCommsDept && <Link to="/communication" style={navStyle}>Communication</Link>}
          {isCoordinator && isModuleAllowed('radar') && <Link to="/radar" style={navStyle}>Radar</Link>}
          {isCoordinator && isModuleAllowed('workload') && <Link to="/workload" style={navStyle}>Workload</Link>}
        </nav>

        {/* Right Action Icons & User Account */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Coordinator Visibility Settings */}
          {isCoordinator && (
            <button
              onClick={() => setShowVisibilityModal(true)}
              style={{
                background: '#ea6c20',
                border: 'none',
                borderRadius: 999,
                padding: '6px 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#ffffff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(234, 108, 32, 0.4)',
              }}
              title="Configure Manager Visibility Settings"
            >
              <Shield size={14} />
              <span className="hide-on-mobile">Visibility</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {/* User Profile Pill */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'rgba(255,255,255,0.18)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 999,
                padding: '4px 12px 4px 6px',
                color: '#ffffff',
                cursor: 'pointer'
              }}
            >
              <Avatar src={user?.avatarUrl} name={user?.name || 'User'} size="sm" />
              <div style={{ textAlign: 'left', lineHeight: 1.1 }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{user?.name?.split(' ')[0]}</div>
                <div style={{ fontSize: 10, opacity: 0.85 }}>{user?.role}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                background: '#ffffff',
                borderRadius: 16,
                boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
                padding: '14px',
                minWidth: 260,
                zIndex: 1001,
                border: '1.5px solid #e2f1fa'
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>
                  Switch Demo Account
                </div>
                {DEMO_USERS.map(du => (
                  <button
                    key={du.id}
                    onClick={() => {
                      switchDemoUser(du.id);
                      setShowUserMenu(false);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: 'none',
                      background: user?.id === du.id ? '#e0f2fe' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: 4
                    }}
                  >
                    <Avatar name={du.name} size="sm" />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {du.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{du.role}</div>
                    </div>
                  </button>
                ))}
                <div style={{ borderTop: '1px solid #f1f5f9', marginTop: 8, paddingTop: 8 }}>
                  <button
                    onClick={() => { logout(); navigate('/login'); }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      borderRadius: 8,
                      border: 'none',
                      background: '#fee2e2',
                      color: '#b91c1c',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Toggle */}
          <button
            className="mobile-menu-btn"
            onClick={() => setShowMobileNav(!showMobileNav)}
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: 8,
              width: 36,
              height: 36,
              display: 'none', // Handled via CSS media query
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer'
            }}
          >
            {showMobileNav ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile Nav Drawer */}
      {showMobileNav && (
        <div style={{
          background: 'rgba(7, 89, 133, 0.98)',
          backdropFilter: 'blur(16px)',
          padding: '16px 20px',
          borderBottom: '2px solid rgba(255,255,255,0.2)',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          zIndex: 99
        }}>
          <Link to="/" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Dashboard</Link>
          <Link to="/tasks" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Tasks & Sprints</Link>
          <Link to="/deadlines" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Deadlines</Link>
          <Link to="/agenda" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Club Agenda</Link>
          <Link to="/events" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Events</Link>
          {isCommsDept && <Link to="/communication" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Communication Plan</Link>}
          {isCoordinator && <Link to="/radar" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Coordinator Radar</Link>}
          {isCoordinator && <Link to="/workload" onClick={() => setShowMobileNav(false)} style={mobileNavStyle}>Team Workload</Link>}
        </div>
      )}

      {/* ── SKY BANNER & WELCOME STAGE ── */}
      <section style={{
        position: 'relative',
        padding: '36px 20px 24px',
        maxWidth: 1140,
        margin: '0 auto',
        overflow: 'hidden'
      }}>
        {/* Exactly Two Simple Static Anime Clouds (Never floating, no cutoff) */}
        <img
          src="/clouds/cloud_pure_1.png"
          alt=""
          style={{
            position: 'absolute',
            top: -20,
            left: -40,
            width: 280,
            maxWidth: '35vw',
            pointerEvents: 'none',
            opacity: 0.85,
            zIndex: 1,
            animation: 'none'
          }}
        />
        <img
          src="/clouds/cloud_pure_2.png"
          alt=""
          style={{
            position: 'absolute',
            top: 0,
            right: -30,
            width: 300,
            maxWidth: '35vw',
            pointerEvents: 'none',
            opacity: 0.85,
            zIndex: 1,
            animation: 'none'
          }}
        />

        {/* Welcome Card */}
        <div style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.94)',
          borderRadius: 24,
          padding: '24px 28px',
          boxShadow: '0 12px 36px rgba(0, 50, 90, 0.15)',
          border: '2px solid rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 20
        }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{
                background: isCoordinator ? '#ea580c' : '#0284c7',
                color: '#ffffff',
                padding: '3px 10px',
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {isCoordinator ? 'Coordinator Council' : `${department?.name || 'Department'} Manager`}
              </span>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                📅 {todayFormatted}
              </span>
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display, "Outfit", sans-serif)',
              fontSize: 28,
              fontWeight: 800,
              color: '#0f172a',
              margin: '0 0 6px 0',
              lineHeight: 1.2
            }}>
              Welcome back, {user?.name?.split(' ')[0] || 'Member'}! 👋
            </h1>

            <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>
              {isCoordinator
                ? 'Full club coordination overview. Check deadlines, manage velocity, and direct sprints.'
                : `Viewing tasks and deadlines for ${department?.name || 'your department'}. Click your checkbox to complete tasks.`}
            </p>

            {/* Quick Action Buttons */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              <button
                onClick={() => navigate('/tasks?action=new')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 99,
                  background: '#0284c7',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  boxShadow: '0 3px 8px rgba(2, 132, 199, 0.3)'
                }}
              >
                <Plus size={15} /> New Task
              </button>

              <button
                onClick={() => navigate('/agenda')}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '7px 14px',
                  borderRadius: 99,
                  background: '#f8fafc',
                  color: '#334155',
                  border: '1.5px solid #cbd5e1',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                <Calendar size={15} color="#ea580c" /> Agenda & Dates
              </button>

              {isCommsDept && (
                <button
                  onClick={() => navigate('/communication')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 99,
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1.5px solid #bfdbfe',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  <Share2 size={15} /> Communication Plan
                </button>
              )}
            </div>
          </div>

          {/* Static Grounded Mascot Companion (No floating) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 110,
            width: 110,
            flexShrink: 0
          }}>
            <img
              src="/mascot-hero.png"
              alt="ByteCraft Mascot"
              style={{
                maxHeight: '100%',
                maxWidth: '100%',
                objectFit: 'contain',
                filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.15))',
                animation: 'none'
              }}
            />
          </div>
        </div>
      </section>

      {/* ── MAIN DASHBOARD CONTAINER ── */}
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        {/* Quick Search Bar */}
        <form onSubmit={handleSearchSubmit} style={{
          background: '#ffffff',
          borderRadius: 999,
          padding: '6px 8px 6px 18px',
          display: 'flex',
          alignItems: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
          border: '2px solid #e2e8f0'
        }}>
          <Search size={18} color="#0284c7" style={{ marginRight: 10, flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search tasks, deadlines, members, or departments..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 14,
              fontFamily: 'inherit',
              color: '#1e293b'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px 8px' }}
            >
              <X size={16} />
            </button>
          )}
          <button
            type="submit"
            style={{
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: 999,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              flexShrink: 0
            }}
          >
            Search
          </button>
        </form>

        {/* ── 4 KEY METRICS ROW ── */}
        <div className="stat-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {/* Active Tasks */}
          <div
            onClick={() => { setTaskFilter('all'); }}
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '16px 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              border: taskFilter === 'all' ? '2px solid #0284c7' : '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Active Tasks</span>
              <CheckSquare size={18} color="#0284c7" />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a' }}>{stats.activeTasks}</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Pending in scope</div>
          </div>

          {/* Urgent / Overdue */}
          <div
            onClick={() => { setTaskFilter('urgent'); }}
            style={{
              background: (stats.overdueTasks > 0 || urgentTasksCount > 0) ? '#fff5f5' : '#ffffff',
              borderRadius: 18,
              padding: '16px 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              border: taskFilter === 'urgent' ? '2px solid #ef4444' : '1.5px solid #fecaca',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: stats.overdueTasks > 0 ? '#b91c1c' : '#64748b' }}>
                Urgent & Due Soon
              </span>
              <AlertCircle size={18} color={stats.overdueTasks > 0 ? '#ef4444' : '#f59e0b'} />
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: stats.overdueTasks > 0 ? '#ef4444' : '#0f172a' }}>
              {urgentTasksCount}
            </div>
            <div style={{ fontSize: 11, color: stats.overdueTasks > 0 ? '#dc2626' : '#94a3b8', marginTop: 2 }}>
              {stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue!` : 'Due in next 3 days'}
            </div>
          </div>

          {/* Next Event Prep */}
          <div
            onClick={() => navigate('/events')}
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '16px 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>Next Event</span>
              <Flag size={18} color="#ea580c" />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {nextEvent ? nextEvent.event.name : 'All Ready'}
            </div>
            <div style={{ fontSize: 11, color: '#0284c7', fontWeight: 700, marginTop: 2 }}>
              {nextEvent ? `${nextEvent.percent}% Prepared` : '3 Upcoming'}
            </div>
          </div>

          {/* Department / Squad */}
          <div
            onClick={() => navigate('/departments')}
            style={{
              background: '#ffffff',
              borderRadius: 18,
              padding: '16px 20px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.04)',
              border: '1.5px solid #e2e8f0',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b' }}>
                {isCoordinator ? 'Club Squads' : 'My Department'}
              </span>
              <Users size={18} color="#10b981" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isCoordinator ? `${stats.departmentsCount} Squads` : (department?.name || 'Department')}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {isCoordinator ? `${stats.totalMembers} active crew` : 'View team roster'}
            </div>
          </div>
        </div>

        {/* ── PRIORITY TASK CHECKLIST (Simple, Fast, Functional) ── */}
        <section style={{
          background: '#ffffff',
          borderRadius: 24,
          padding: '24px 26px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.04)',
          border: '1.5px solid #e2e8f0'
        }}>
          {/* Header & Filter Tabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid #f1f5f9'
          }}>
            <div>
              <h2 style={{
                fontSize: 20,
                fontWeight: 800,
                color: '#0f172a',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <Clock size={20} color="#0284c7" />
                Priority Tasks & Deadlines
              </h2>
              <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0 0' }}>
                Tasks sorted by deadline date. {isCoordinator ? 'Coordinators can check any task.' : 'You can check off tasks assigned to you.'}
              </p>
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: 4,
              borderRadius: 12,
              gap: 4
            }}>
              <button
                onClick={() => setTaskFilter('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: taskFilter === 'all' ? '#ffffff' : 'transparent',
                  color: taskFilter === 'all' ? '#0f172a' : '#64748b',
                  boxShadow: taskFilter === 'all' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                All Pending
              </button>

              <button
                onClick={() => setTaskFilter('mine')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: taskFilter === 'mine' ? '#ffffff' : 'transparent',
                  color: taskFilter === 'mine' ? '#0f172a' : '#64748b',
                  boxShadow: taskFilter === 'mine' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                My Tasks ({myTasksCount})
              </button>

              <button
                onClick={() => setTaskFilter('urgent')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: taskFilter === 'urgent' ? '#ffffff' : 'transparent',
                  color: taskFilter === 'urgent' ? '#b91c1c' : '#64748b',
                  boxShadow: taskFilter === 'urgent' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Urgent ({urgentTasksCount})
              </button>

              <button
                onClick={() => setTaskFilter('completed')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: taskFilter === 'completed' ? '#ffffff' : 'transparent',
                  color: taskFilter === 'completed' ? '#0f172a' : '#64748b',
                  boxShadow: taskFilter === 'completed' ? '0 2px 6px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                Done ({completedTasksCount})
              </button>
            </div>
          </div>

          {/* Task List Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {displayedTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 10px', display: 'block' }} />
                <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>No tasks found in this view</div>
                <p style={{ fontSize: 13, margin: '4px 0 16px 0' }}>All clear! You're completely up to date with this category.</p>
                <button
                  onClick={() => navigate('/tasks?action=new')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 99,
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> Create New Task
                </button>
              </div>
            ) : (
              displayedTasks.map(task => {
                const urgency = getDeadlineUrgency(task.deadline, task.status);
                const badge = getUrgencyBadge(urgency);
                const isDone = task.status === 'COMPLETED';
                const toggling = togglingTaskId === task.id;
                const canCheck = isCoordinator || (task.assignedMemberId === user?.id);

                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      background: isDone ? '#f8fafc' : '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: 14,
                      padding: '12px 16px',
                      transition: 'all 0.15s ease',
                      flexWrap: 'wrap'
                    }}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleTaskDone(task)}
                      disabled={toggling || !canCheck}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: canCheck ? 'pointer' : 'not-allowed',
                        color: isDone ? '#10b981' : canCheck ? '#94a3b8' : '#cbd5e1',
                        padding: 0,
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title={!canCheck ? `Assigned to ${task.assignee?.name || 'another manager'}` : isDone ? 'Mark as pending' : 'Click to complete'}
                    >
                      {isDone ? (
                        <CheckSquare size={22} color="#10b981" />
                      ) : canCheck ? (
                        <Square size={22} color="#94a3b8" />
                      ) : (
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <Square size={22} color="#cbd5e1" />
                          <Lock size={12} color="#94a3b8" style={{ position: 'absolute', top: 5, left: 5 }} />
                        </div>
                      )}
                    </button>

                    {/* Task Title & Details */}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: isDone ? '#94a3b8' : '#0f172a',
                        textDecoration: isDone ? 'line-through' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8
                      }}>
                        <span>{task.title}</span>
                      </div>
                      {task.description && (
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                          {truncate(task.description, 70)}
                        </div>
                      )}
                    </div>

                    {/* Department Tag */}
                    {task.department && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        background: '#f1f5f9',
                        padding: '4px 10px',
                        borderRadius: 999,
                        fontSize: 12,
                        color: '#475569',
                        flexShrink: 0
                      }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: task.department.color || '#0284c7'
                        }} />
                        <span>{task.department.name}</span>
                      </div>
                    )}

                    {/* Assignee Avatar */}
                    {task.assignee && (
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                        title={`Assigned to ${task.assignee.name}`}
                      >
                        <Avatar src={task.assignee.avatarUrl} name={task.assignee.name} size="xs" />
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                          {task.assignee.name.split(' ')[0]}
                        </span>
                      </div>
                    )}

                    {/* Deadline Date & Urgency Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#64748b' }}>
                        <Calendar size={13} color="#94a3b8" />
                        <span>{formatDate(task.deadline)}</span>
                      </div>

                      <span style={{
                        padding: '3px 9px',
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 700,
                        color: badge.color,
                        background: badge.bg
                      }}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom link to view full task page */}
          <div style={{ marginTop: 18, textAlign: 'center' }}>
            <Link
              to="/tasks"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                color: '#0284c7',
                fontWeight: 700,
                fontSize: 13,
                textDecoration: 'none'
              }}
            >
              Open Full Tasks & Sprints Pipeline ({allTasks.length} total) <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* ── TWO-COLUMN HUB: NEXT EVENT PREPARATION & QUICK SQUAD ACCESS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20
        }}>
          {/* Next Club Event Spotlight */}
          {nextEvent && (
            <div style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{
                    background: '#fef3c7',
                    color: '#92400e',
                    padding: '3px 10px',
                    borderRadius: 99,
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}>
                    🎯 Upcoming Main Event
                  </span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    {formatDate(nextEvent.event.date)}
                  </span>
                </div>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0' }}>
                  {nextEvent.event.name}
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                  Location: {nextEvent.event.location || 'ESTIN Campus / Discord'}
                </p>

                {/* Progress bar */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                    <span style={{ color: '#475569' }}>Preparation Checklist</span>
                    <span style={{ color: '#0284c7' }}>{nextEvent.percent}%</span>
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${nextEvent.percent}%`, height: '100%', background: '#0284c7', borderRadius: 99 }} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/events/${nextEvent.event.id}`)}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                Open Event Checklist <ChevronRight size={15} />
              </button>
            </div>
          )}

          {/* Communication Plan or Department Hub Card */}
          {isCommsDept ? (
            <div style={{
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              borderRadius: 20,
              padding: '24px',
              border: '1.5px solid #bfdbfe',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{
                  background: '#1d4ed8',
                  color: '#ffffff',
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  📢 Communication Plan
                </span>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#1e3a8a', margin: '12px 0 6px 0' }}>
                  Campaign & Media Pipeline
                </h3>
                <p style={{ fontSize: 13, color: '#3b82f6', margin: '0 0 16px 0' }}>
                  Manage pre-event announcements, Instagram posts, speaker reveals, and sponsor highlights.
                </p>
              </div>

              <button
                onClick={() => navigate('/communication')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 12,
                  background: '#1d4ed8',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  boxShadow: '0 2px 8px rgba(29, 78, 216, 0.3)'
                }}
              >
                Manage Social & Media Plan <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div style={{
              background: '#ffffff',
              borderRadius: 20,
              padding: '24px',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <span style={{
                  background: '#e0f2fe',
                  color: '#0369a1',
                  padding: '3px 10px',
                  borderRadius: 99,
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}>
                  🏢 Department Hub
                </span>

                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: '12px 0 6px 0' }}>
                  {department?.name || 'Department'} Squad
                </h3>
                <p style={{ fontSize: 13, color: '#64748b', margin: '0 0 16px 0' }}>
                  Collaborate with department managers, review sprint milestones, and track deadlines.
                </p>
              </div>

              <button
                onClick={() => navigate(department?.id ? `/departments/${department.id}` : '/departments')}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 12,
                  background: '#f8fafc',
                  border: '1.5px solid #cbd5e1',
                  color: '#0f172a',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6
                }}
              >
                View Department Squad <ChevronRight size={15} />
              </button>
            </div>
          )}
        </div>

      </main>

      {/* ── SIMPLE CLEAN FOOTER ── */}
      <footer style={{
        maxWidth: 1140,
        margin: '40px auto 0 auto',
        padding: '20px',
        borderTop: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        color: '#ffffff',
        fontSize: 13
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ height: 28, width: 'auto' }} />
          <span>© 2026–2027 ByteCraft Coordination System</span>
        </div>

        <div style={{ display: 'flex', gap: 14 }}>
          <Link to="/tasks" style={{ color: '#ffffff', textDecoration: 'none', opacity: 0.85 }}>Tasks</Link>
          <Link to="/deadlines" style={{ color: '#ffffff', textDecoration: 'none', opacity: 0.85 }}>Deadlines</Link>
          <Link to="/agenda" style={{ color: '#ffffff', textDecoration: 'none', opacity: 0.85 }}>Agenda</Link>
          <Link to="/events" style={{ color: '#ffffff', textDecoration: 'none', opacity: 0.85 }}>Events</Link>
        </div>
      </footer>

      {/* Coordinator Visibility Settings Modal */}
      <CoordinatorVisibilityModal
        isOpen={showVisibilityModal}
        onClose={() => setShowVisibilityModal(false)}
      />
    </div>
  );
}

const navStyle: React.CSSProperties = {
  color: 'rgba(255, 255, 255, 0.9)',
  textDecoration: 'none',
  fontSize: 13,
  fontWeight: 600,
  padding: '6px 12px',
  borderRadius: 999,
  transition: 'all 0.15s ease'
};

const activeNavStyle: React.CSSProperties = {
  ...navStyle,
  background: '#ea6c20',
  color: '#ffffff',
  boxShadow: '0 2px 8px rgba(234, 108, 32, 0.4)'
};

const mobileNavStyle: React.CSSProperties = {
  color: '#ffffff',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 700,
  padding: '8px 12px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.08)'
};
