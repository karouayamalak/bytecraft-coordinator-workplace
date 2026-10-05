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
      height: 66,
      background: 'rgba(255,255,255,0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid #daeef9',
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 14,
      position: 'sticky',
      top: 0,
      zIndex: 90,
      boxShadow: '0 2px 12px rgba(11,78,120,0.07)',
    }}>
      {/* Page Title */}
      <div style={{ marginRight: 'auto' }}>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          fontWeight: 800,
          color: 'var(--text-dark)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
          lineHeight: 1
        }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Search Input */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#f0f8fd',
        border: '1.5px solid #cce8f6',
        borderRadius: 999,
        padding: '7px 16px',
        width: 220,
        transition: 'all 0.2s ease',
      }}>
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={searchVal}
          onChange={e => setSearchVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && navigate(`/tasks?q=${encodeURIComponent(searchVal)}`)}
          placeholder="Search…"
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 13,
            color: 'var(--text-dark)',
            fontFamily: 'var(--font-body)',
            width: '100%',
            fontWeight: 500,
          }}
        />
      </div>

      {/* Quick Add Dropdown */}
      <div ref={qaRef} style={{ position: 'relative' }}>
        <button
          id="quick-actions-btn"
          onClick={() => setShowQuickActions(prev => !prev)}
          aria-expanded={showQuickActions}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: 'linear-gradient(135deg, #187db8, #38bdf8)',
            color: '#ffffff',
            border: 'none',
            borderRadius: 999,
            padding: '8px 18px',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            letterSpacing: '0.04em',
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(24,125,184,0.3)',
            transition: 'all 0.2s ease',
          }}
        >
          <Plus size={15} />
          QUICK ADD
        </button>

        {showQuickActions && (
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            background: '#ffffff',
            borderRadius: 18,
            boxShadow: '0 16px 40px rgba(11,78,120,0.2)',
            border: '2px solid #e0f0fa',
            minWidth: 200,
            zIndex: 300,
            overflow: 'hidden',
            padding: '8px',
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
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 600,
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text-dark)',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f8fd')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ color: 'var(--accent-primary)' }}>{action.icon}</span>
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
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '1.5px solid #cce8f6',
          background: '#f0f8fd',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-sub)',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      <NotificationBell />

      {/* Avatar */}
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
