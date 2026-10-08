import React from 'react';
import { Plus, UserPlus, CalendarPlus, FolderPlus, Sun, Moon, Search } from 'lucide-react';
import NotificationBell from './NotificationBell';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showQuickActions, setShowQuickActions] = React.useState(false);
  const [searchVal, setSearchVal] = React.useState('');
  const qaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (qaRef.current && !qaRef.current.contains(e.target as Node)) {
        setShowQuickActions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const quickActions = [
    { label: 'Add Task',          icon: <Plus size={14} />,       action: () => navigate('/tasks?action=new')       },
    { label: 'Add Member',        icon: <UserPlus size={14} />,   action: () => navigate('/team?action=new')        },
    { label: 'Create Event',      icon: <CalendarPlus size={14} />, action: () => navigate('/events?action=new')   },
    { label: 'Create Department', icon: <FolderPlus size={14} />, action: () => navigate('/departments?action=new'), coordOnly: true },
  ];

  const visibleActions = quickActions.filter(a =>
    !a.coordOnly || (user?.role === 'COORDINATOR')
  );

  return (
    <header style={{
      height: 64,
      background: '#ffffff',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 90,
    }}>
      {/* Page Title */}
      <div style={{ marginRight: 'auto' }}>
        <h1 style={{
          fontSize: 18,
          fontWeight: 700,
          color: '#0f172a',
          lineHeight: 1.2,
          margin: 0
        }}>
          {title}
        </h1>
        {subtitle && (
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, fontWeight: 400 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Clean Minimal Search Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '6px 12px',
        width: 240,
        transition: 'all 0.15s ease',
      }}>
        <Search size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
        <input
          type="text"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate(`/tasks?search=${encodeURIComponent(searchVal)}`)}
          placeholder="Quick search…"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: '#0f172a',
            width: '100%',
          }}
        />
      </div>

      {/* Quick Add Dropdown */}
      <div ref={qaRef} style={{ position: 'relative' }}>
        <button
          id="quick-actions-btn"
          onClick={() => setShowQuickActions(prev => !prev)}
          aria-expanded={showQuickActions}
          className="btn btn-primary btn-sm"
          style={{
            gap: 6,
            borderRadius: 8,
            padding: '7px 14px',
            fontSize: 12.5,
          }}
        >
          <Plus size={14} />
          New Action
        </button>

        {showQuickActions && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: '#ffffff',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
            border: '1px solid #e2e8f0',
            minWidth: 190,
            zIndex: 300,
            overflow: 'hidden',
            padding: '6px',
          }}>
            {visibleActions.map(action => (
              <button
                key={action.label}
                onClick={() => { action.action(); setShowQuickActions(false); }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#0f172a',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: '#0284c7' }}>{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Theme Toggle */}
      <button
        id="theme-toggle-btn"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        style={{
          width: 34,
          height: 34,
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#64748b',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
      </button>

      <NotificationBell />

      {/* User Profile avatar */}
      {user && (
        <button
          id="topbar-profile-btn"
          onClick={() => navigate('/settings')}
          title={user.name}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <Avatar src={user.avatarUrl} name={user.name} size="sm" />
        </button>
      )}
    </header>
  );
}
