import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Clock, Calendar, Building2, Users,
  CalendarDays, Settings, LogOut,
  MessageSquare, BarChart3, Target, Wifi, WifiOff, Network, Zap, Activity
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import { useWebSocket } from '../../hooks/useWebSocket';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: string | number;
}

export default function Sidebar() {
  const { user, department, logout } = useAuth();
  const navigate = useNavigate();
  const { isConnected } = useWebSocket();

  const handleLogout = () => { logout(); navigate('/login'); };

  const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
  const isBoard = user ? BOARD_ROLES.includes(user.role) : false;
  const isManager = user?.role === 'MANAGER' || user?.role === 'DEPARTMENT_LEADER';

  // Primary navigation tailored directly to user role
  const mainNavItems: NavItem[] = isBoard ? [
    { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={17} /> },
    { label: 'All Tasks', to: '/tasks', icon: <CheckSquare size={17} /> },
    { label: 'Departments', to: '/departments', icon: <Building2 size={17} /> },
    { label: 'Calendar', to: '/calendar', icon: <Calendar size={17} /> },
    { label: 'Communication', to: '/communication', icon: <MessageSquare size={17} /> },
    { label: 'Events', to: '/events', icon: <CalendarDays size={17} /> },
    { label: 'Team', to: '/team', icon: <Users size={17} /> },
    { label: 'Management', to: '/radar', icon: <Target size={17} /> },
  ] : [
    { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={17} /> },
    { label: 'My Tasks', to: '/tasks?view=mine', icon: <CheckSquare size={17} /> },
    { 
      label: department?.name ? `${department.name}` : 'My Department', 
      to: user?.departmentId ? `/departments/${user.departmentId}` : '/departments', 
      icon: <Building2 size={17} /> 
    },
    { label: 'Calendar', to: '/calendar', icon: <Calendar size={17} /> },
    { label: 'Communication', to: '/communication', icon: <MessageSquare size={17} /> },
    { label: 'Events', to: '/events', icon: <CalendarDays size={17} /> },
    { label: 'Team', to: '/team', icon: <Users size={17} /> },
  ];

  const secondaryNavItems: NavItem[] = [
    { label: 'Meetings', to: '/meetings', icon: <Zap size={16} /> },
    { label: 'Activity Logs', to: '/activity', icon: <Activity size={16} /> },
    ...(isBoard ? [{ label: 'Settings', to: '/settings', icon: <Settings size={16} /> }] : []),
  ];

  return (
    <nav style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto' }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '6px 10px 4px',
        }}>
          {isBoard ? 'ByteCraft Workspace' : 'Department Portal'}
        </div>
        {mainNavItems.map((item: NavItem) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 8,
              color: isActive ? '#ffffff' : '#475569',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 500,
              marginBottom: 2,
              background: isActive ? '#0284c7' : 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            })}
          >
            {item.icon}
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div style={{
          fontSize: 10.5,
          fontWeight: 700,
          color: '#94a3b8',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          padding: '6px 10px 4px',
        }}>
          Workspace Tools
        </div>
        {secondaryNavItems.map((item: NavItem) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '7px 12px',
              borderRadius: 8,
              color: isActive ? '#ffffff' : '#64748b',
              textDecoration: 'none',
              fontSize: 12.5,
              fontWeight: isActive ? 600 : 500,
              marginBottom: 2,
              background: isActive ? '#0284c7' : 'transparent',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            })}
          >
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* User Footer Profile */}
      <div style={{ marginTop: 'auto', paddingTop: 14, borderTop: '1px solid #e2e8f0' }}>
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            marginBottom: 8,
          }}>
            <Avatar src={user.avatarUrl} name={user.name} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                {user.role === 'COORDINATOR' ? 'Coordinator'
                  : user.role === 'PRESIDENT' ? 'President'
                  : user.role === 'VICE_PRESIDENT' ? 'Vice President'
                  : user.role === 'HR' ? 'Human Resources'
                  : user.role === 'SECRETARY' ? 'Secretary'
                  : user.role === 'MANAGER' || user.role === 'DEPARTMENT_LEADER' ? 'Dept. Manager'
                  : 'Member'}
              </div>
            </div>
            <div title={isConnected ? 'Connected live' : 'Offline'}>
              {isConnected
                ? <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                : <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8' }} />
              }
            </div>
          </div>
        )}

        <button
          id="sidebar-logout-btn"
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #fecaca',
            background: '#fff1f2',
            color: '#b91c1c',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 600,
            transition: 'background 0.15s ease',
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
