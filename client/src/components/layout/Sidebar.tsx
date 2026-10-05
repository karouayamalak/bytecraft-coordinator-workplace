import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CheckSquare, Clock, Calendar, Building2, Users,
  CalendarDays, Activity, Settings, LogOut, Zap,
  MessageSquare, BarChart3, Target, Network, Wifi, WifiOff
} from 'lucide-react';
import { useAuth, DEMO_USERS } from '../../contexts/AuthContext';
import Avatar from '../ui/Avatar';
import { RoleBadge } from '../ui/Badge';
import { useWebSocket } from '../../hooks/useWebSocket';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_SECTIONS = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', to: '/', icon: <LayoutDashboard size={17} /> },
      { label: 'Coordinator Radar', to: '/radar', icon: <Target size={17} />, roles: ['COORDINATOR'] },
      { label: 'Deadlines', to: '/deadlines', icon: <Clock size={17} /> },
    ]
  },
  {
    label: 'Work',
    items: [
      { label: 'Tasks', to: '/tasks', icon: <CheckSquare size={17} /> },
      { label: 'Workload', to: '/workload', icon: <Network size={17} />, roles: ['COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'] },
    ]
  },
  {
    label: 'Organization',
    items: [
      { label: 'Departments', to: '/departments', icon: <Building2 size={17} /> },
      { label: 'Team', to: '/team', icon: <Users size={17} /> },
    ]
  },
  {
    label: 'Events & Comms',
    items: [
      { label: 'Events', to: '/events', icon: <CalendarDays size={17} /> },
      { label: 'Agenda', to: '/agenda', icon: <Clock size={17} /> },
      { label: 'Master Calendar', to: '/calendar', icon: <Calendar size={17} /> },
      // Communication Plans: only Coordinator or the Communication dept manager
      { label: 'Communication Plans', to: '/communication', icon: <MessageSquare size={17} />, roles: ['COORDINATOR', 'COMMUNICATION'] },
    ]
  },
  {
    label: 'Management',
    items: [
      { label: 'Meetings', to: '/meetings', icon: <Zap size={17} /> },
      { label: 'Reports', to: '/reports', icon: <BarChart3 size={17} />, roles: ['COORDINATOR', 'DEPARTMENT_LEADER', 'MANAGER'] },
      { label: 'Activity', to: '/activity', icon: <Activity size={17} /> },
      { label: 'Settings', to: '/settings', icon: <Settings size={17} /> },
    ]
  }
];


export default function Sidebar() {
  const { user, department, logout, switchDemoUser } = useAuth();
  const navigate = useNavigate();
  const { isConnected } = useWebSocket();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ flex: 1, padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {NAV_SECTIONS.map(section => {
        const visibleItems = section.items.filter(
          (item: NavItem) => {
            if (!item.roles) return true;
            if (!user) return false;
            // Special COMMUNICATION marker: allow if user role is COORDINATOR or department is communication-related
            if (item.roles.includes('COMMUNICATION')) {
              const deptName = department?.name || '';
              const isCommDept = deptName.toLowerCase().includes('communication') || deptName.toLowerCase().includes('relations') || deptName.toLowerCase().includes('external');
              return user.role === 'COORDINATOR' || isCommDept;
            }
            return item.roles.includes(user.role);
          }
        );
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.label} style={{ marginBottom: 10 }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: 'rgba(168,216,240,0.45)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              padding: '8px 10px 4px',
              fontFamily: 'var(--font-body)'
            }}>
              {section.label}
            </div>
            {visibleItems.map((item: NavItem) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 13px',
                  borderRadius: 12,
                  color: isActive ? '#ffffff' : 'rgba(168,216,240,0.75)',
                  textDecoration: 'none',
                  fontSize: 13.5,
                  fontWeight: 600,
                  marginBottom: 3,
                  fontFamily: 'var(--font-body)',
                  background: isActive
                    ? 'linear-gradient(135deg, #e87823 0%, #f48a37 100%)'
                    : 'transparent',
                  boxShadow: isActive ? '0 4px 14px rgba(232,120,35,0.4)' : 'none',
                  transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
                })}
              >
                {item.icon}
                {item.label}
              </NavLink>
            ))}
          </div>
        );
      })}

      {/* Demo Account Switcher */}
      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(168,216,240,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, padding: '0 6px' }}>
          Demo Accounts
        </div>
        {DEMO_USERS.map(du => (
          <button
            key={du.id}
            onClick={() => switchDemoUser(du.id)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 12px',
              borderRadius: 10,
              border: 'none',
              background: user?.id === du.id ? 'rgba(232,120,35,0.2)' : 'transparent',
              color: 'rgba(168,216,240,0.8)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 3,
              transition: 'background 0.15s ease',
            }}
          >
            <span style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: user?.id === du.id ? '#e87823' : 'rgba(168,216,240,0.35)',
              flexShrink: 0
            }} />
            {du.name}
          </button>
        ))}

        {/* User Info */}
        {user && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 12,
            marginTop: 10,
            marginBottom: 6
          }}>
            <Avatar src={user.avatarUrl} name={user.name} size="sm" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <RoleBadge role={user.role} />
            </div>
            <div title={isConnected ? 'Live' : 'Reconnecting…'}>
              {isConnected
                ? <Wifi size={12} style={{ color: '#34D399' }} />
                : <WifiOff size={12} style={{ color: 'rgba(168,216,240,0.4)' }} />
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
            gap: 9,
            padding: '8px 12px',
            borderRadius: 10,
            border: 'none',
            background: 'rgba(229,57,53,0.12)',
            color: '#F87171',
            cursor: 'pointer',
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    </nav>
  );
}
