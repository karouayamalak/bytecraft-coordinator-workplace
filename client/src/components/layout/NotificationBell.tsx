import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { useFetch } from '../../hooks/useFetch';
import type { Notification } from '../../lib/types';
import { formatRelativeTime } from '../../lib/utils';
import api from '../../lib/api';
import { useWebSocket } from '../../hooks/useWebSocket';

interface NotifResponse {
  success: boolean;
  data: Notification[];
  unreadCount: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: '#EF4444',
  WARNING: '#F59E0B',
  INFO: '#6366F1',
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data, refetch } = useFetch<{ data: Notification[]; unreadCount: number }>('/notifications');
  const notifications = (data as unknown as NotifResponse)?.data || [];
  const unreadCount = (data as unknown as NotifResponse)?.unreadCount || 0;

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {});
    refetch();
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all', {});
    refetch();
  };

  const handleWsMessage = useCallback(() => {
    refetch();
  }, [refetch]);

  useWebSocket(msg => {
    if (msg.type === 'NOTIFICATION_NEW') handleWsMessage();
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        id="notification-bell-btn"
        className="notif-btn"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="notif-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown" role="menu">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 14 }}>Notifications</span>
            {unreadCount > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={markAllRead}
                style={{ gap: 6, fontSize: 12 }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                No notifications yet.
              </div>
            ) : (
              notifications.slice(0, 10).map(n => (
                <div
                  key={n.id}
                  className={`notif-item ${!n.isRead ? 'unread' : ''}`}
                  role="menuitem"
                  onClick={() => markRead(n.id)}
                >
                  <div
                    className="notif-dot"
                    style={{ background: !n.isRead ? PRIORITY_COLORS[n.priority] || '#6366F1' : 'var(--bg-overlay)' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      {formatRelativeTime(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
