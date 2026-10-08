import React, { useState } from 'react';
import { Navigate, NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Building2, Calendar,
  MessageSquare, Users, CalendarDays, Target, Menu, X,
  Bell, Settings, LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import NotificationBell from './NotificationBell';

interface BreadcrumbItem { label: string; to?: string; }
interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  fullPage?: boolean;
}

export default function AppLayout({ children, title, subtitle, actions, fullPage }: LayoutProps) {
  const { user, department, logout, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isBoard = user ? BOARD_ROLES.includes(user.role) : false;

  const mainNav = isBoard ? [
    { label: 'Dashboard',  to: '/',              icon: LayoutDashboard },
    { label: 'Tasks',      to: '/tasks',          icon: CheckSquare },
    { label: 'Departments',to: '/departments',    icon: Building2 },
    { label: 'Calendar',   to: '/calendar',       icon: Calendar },
    { label: 'Comms',      to: '/communication',  icon: MessageSquare },
    { label: 'Events',     to: '/events',         icon: CalendarDays },
    { label: 'Team',       to: '/team',           icon: Users },
    { label: 'Radar',      to: '/radar',          icon: Target },
    { label: 'Settings',   to: '/settings',       icon: Settings },
  ] : [
    { label: 'Dashboard',  to: '/',              icon: LayoutDashboard },
    { label: 'My Tasks',   to: '/tasks',         icon: CheckSquare },
    {
      label: department?.name ?? 'Dept',
      to: user?.departmentId ? `/departments/${user.departmentId}` : '/departments',
      icon: Building2
    },
    { label: 'Calendar',   to: '/calendar',      icon: Calendar },
    { label: 'Comms',      to: '/communication', icon: MessageSquare },
    { label: 'Events',     to: '/events',        icon: CalendarDays },
    { label: 'Team',       to: '/team',          icon: Users },
  ];

  // Bottom nav shows 5 most important items (mobile)
  const bottomNav = isBoard ? [
    { label: 'Home',     to: '/',              icon: LayoutDashboard },
    { label: 'Tasks',    to: '/tasks',         icon: CheckSquare },
    { label: 'Depts',    to: '/departments',   icon: Building2 },
    { label: 'Comms',    to: '/communication', icon: MessageSquare },
    { label: 'Team',     to: '/team',          icon: Users },
  ] : [
    { label: 'Home',     to: '/',              icon: LayoutDashboard },
    { label: 'My Tasks', to: '/tasks',         icon: CheckSquare },
    {
      label: 'Dept',
      to: user?.departmentId ? `/departments/${user.departmentId}` : '/departments',
      icon: Building2
    },
    { label: 'Comms',    to: '/communication', icon: MessageSquare },
    { label: 'Team',     to: '/team',          icon: Users },
  ];

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/';
    return location.pathname.startsWith(to);
  };

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#0a0a0a', flexDirection: 'column', gap: 16
      }}>
        <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ height: 44, opacity: 0.7 }} />
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (fullPage) return <>{children}</>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>

      {/* Overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`app-sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          width: 240,
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'transform 0.25s ease',
        }}
      >
        {/* Logo bar */}
        <div style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ height: 38, width: 'auto', objectFit: 'contain', filter: 'brightness(1.15) drop-shadow(0 2px 6px rgba(0,0,0,0.4))' }} />
          </Link>
          <button
            className="mobile-only"
            onClick={() => setSidebarOpen(false)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--text-muted)', cursor: 'pointer',
              padding: 4, display: 'none',
              borderRadius: 6,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '10px 10px', overflowY: 'auto' }}>
          <div style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            padding: '8px 8px 4px',
          }}>
            {isBoard ? 'Workspace' : 'Portal'}
          </div>

          {mainNav.map(item => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={() => setSidebarOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  padding: '7px 10px',
                  borderRadius: 7,
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontSize: 13,
                  fontWeight: active ? 500 : 400,
                  marginBottom: 1,
                  background: active ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'all 0.12s ease',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={15} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{
          padding: '10px 12px',
          borderTop: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'var(--accent-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0,
              overflow: 'hidden',
            }}>
              {user.avatarUrl
                ? <img src={user.avatarUrl} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : user.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.position ?? user.role}
              </div>
            </div>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              title="Sign out"
              style={{
                background: 'none', border: 'none',
                color: 'var(--text-muted)', cursor: 'pointer',
                padding: 4, borderRadius: 6, flexShrink: 0,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-elevated)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content-area" style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Mobile topbar */}
        <div className="mobile-topbar" style={{ display: 'none', alignItems: 'center', gap: 10, padding: '0 14px' }}>
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{ background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 5, borderRadius: 6, display: 'flex', alignItems: 'center' }}
          >
            <Menu size={20} />
          </button>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
            <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ height: 34, width: 'auto', objectFit: 'contain', filter: 'brightness(1.1)' }} />
          </Link>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {title}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <NotificationBell />
            {actions}
          </div>
        </div>

        {/* Desktop topbar */}
        <header className="desktop-topbar" style={{
          height: 56,
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          gap: 16,
        }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
            {subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
          </div>
          {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{actions}</div>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <NotificationBell />
            {isBoard && (
              <button
                onClick={() => navigate('/settings')}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 7, borderRadius: 6 }}
                title="Settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="main-content" style={{ flex: 1, padding: '24px 28px', overflowX: 'hidden' }}>
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {bottomNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, flex: 1, padding: '8px 4px',
                color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                fontSize: 10, fontWeight: active ? 600 : 400,
                textDecoration: 'none',
                transition: 'color 0.12s',
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
