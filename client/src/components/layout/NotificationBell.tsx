import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, BellRing, Smartphone } from 'lucide-react';
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
  URGENT: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#3b82f6',
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data, refetch } = useFetch<{ data: Notification[]; unreadCount: number }>('/notifications');
  const notifications = (data as unknown as NotifResponse)?.data || [];
  const unreadCount = (data as unknown as NotifResponse)?.unreadCount || 0;

  const [hasPermission, setHasPermission] = useState<boolean>(() => {
    return typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted';
  });

  const requestPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const perm = await Notification.requestPermission();
      setHasPermission(perm === 'granted');
      if (perm === 'granted') {
        new Notification('ByteCraft Notifications Active', {
          body: 'You will now receive alerts for tasks, communication actions, and deadline reminders.',
          icon: '/bytecraft-logo.png',
        });
      }
    }
  };

  const markRead = async (id: string) => {
    await api.patch(`/notifications/${id}/read`, {});
    refetch();
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all', {});
    refetch();
  };

  const handleWsMessage = useCallback((payload?: any) => {
    refetch();

    // Trigger system browser notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && payload) {
      try {
        new Notification(payload.title || 'ByteCraft Alert', {
          body: payload.message || 'You have a new update in ByteCraft.',
          icon: '/bytecraft-logo.png',
        });
      } catch (e) {
        console.warn('Could not fire browser notification:', e);
      }
    }
  }, [refetch]);

  useWebSocket(msg => {
    if (msg.type === 'NOTIFICATION_NEW') handleWsMessage(msg.data);
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
        onClick={() => setIsOpen(prev => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        aria-haspopup="true"
        style={{
          background: 'none',
          border: 'none',
          color: unreadCount > 0 ? '#f4f4f5' : '#71717a',
          cursor: 'pointer',
          padding: '6px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'color 0.15s ease',
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '2px',
              right: '2px',
              minWidth: '16px',
              height: '16px',
              padding: '0 4px',
              borderRadius: '999px',
              background: '#2563eb',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              boxShadow: '0 0 0 2px #111111',
            }}
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            right: 0,
            top: 'calc(100% + 8px)',
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            background: '#121214',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              background: '#161619',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600, fontSize: 13.5, color: '#f4f4f5' }}>Notifications</span>
              {unreadCount > 0 && (
                <span style={{ fontSize: 11, background: 'rgba(37, 99, 235, 0.2)', color: '#60a5fa', padding: '1px 6px', borderRadius: 99, fontWeight: 600 }}>
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a1a1aa',
                  fontSize: '11.5px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: 0,
                }}
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>

          {/* Browser / Device Push Permission Banner */}
          {!hasPermission && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(37, 99, 235, 0.08)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
            }}>
              <div style={{ fontSize: 11.5, color: '#93c5fd', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Smartphone size={14} style={{ flexShrink: 0 }} />
                <span>Get phone alerts for tasks & deadlines</span>
              </div>
              <button
                onClick={requestPermission}
                style={{
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Enable
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div style={{ maxHeight: 340, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#71717a', fontSize: 12.5 }}>
                <BellRing size={24} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                <div>No notifications right now</div>
                <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>You're all caught up!</div>
              </div>
            ) : (
              notifications.slice(0, 15).map(n => (
                <div
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '12px 14px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                    background: !n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.12s ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = !n.isRead ? 'rgba(255, 255, 255, 0.02)' : 'transparent'}
                >
                  <span
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: '50%',
                      background: !n.isRead ? (PRIORITY_COLORS[n.priority] || '#3b82f6') : 'rgba(255, 255, 255, 0.15)',
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: !n.isRead ? 600 : 500, fontSize: 12.5, color: !n.isRead ? '#f4f4f5' : '#a1a1aa', marginBottom: 2 }}>
                      {n.title}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#71717a', lineHeight: 1.45, wordBreak: 'break-word' }}>
                      {n.message}
                    </div>
                    <div style={{ fontSize: 10.5, color: '#52525b', marginTop: 4 }}>
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
