import React from 'react';
import { X, Shield, Eye, Lock, CheckCircle2 } from 'lucide-react';
import { useVisibility } from '../../contexts/VisibilityContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CoordinatorVisibilityModal({ isOpen, onClose }: Props) {
  const { visibility, updateVisibility } = useVisibility();

  if (!isOpen) return null;

  const toggleOption = (key: keyof typeof visibility) => {
    if (typeof visibility[key] === 'boolean') {
      updateVisibility({ [key]: !visibility[key] });
    }
  };

  const controls = [
    {
      key: 'showAllDepartments' as const,
      title: 'Cross-Department Access for Managers',
      description: 'When OFF, each manager can ONLY see tasks, events, and crew belonging to their own department.',
      badge: 'Scope Filter'
    },
    {
      key: 'showRadar' as const,
      title: 'Coordinator Radar & Health Telemetry',
      description: 'Show club-wide performance index, health checks, and executive radar to managers.',
      badge: 'Telemetry'
    },
    {
      key: 'showWorkload' as const,
      title: 'Workload & Capacity Analytics',
      description: 'Show team capacity charts, overloaded member indicators, and task volume breakdown.',
      badge: 'Workload'
    },
    {
      key: 'showDeadlines' as const,
      title: 'Deadlines & Approaching Milestones',
      description: 'Allow managers to view upcoming club-wide deadlines calendar and countdowns.',
      badge: 'Timeline'
    },
    {
      key: 'showReports' as const,
      title: 'Activity Logs & System Reports',
      description: 'Allow managers to view audit trails, task export reports, and activity logs.',
      badge: 'Audit'
    },
    {
      key: 'showMeetings' as const,
      title: 'Meeting Agendas & Coordinator Notes',
      description: 'Allow managers to access coordinated executive meeting schedules and minutes.',
      badge: 'Meetings'
    },
  ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 3000 }}>
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 680,
          borderRadius: 28,
          border: '3px solid #e0f2fe',
          boxShadow: '0 24px 60px rgba(0, 50, 80, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #00334e 0%, #005d86 100%)',
          color: '#ffffff',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(234, 108, 32, 0.2)',
              border: '2px solid #ea6c20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ea6c20'
            }}>
              <Shield size={24} />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: '#7dd3ea', textTransform: 'uppercase' }}>
                <Lock size={12} /> Coordinator Access Control
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, letterSpacing: '0.03em', textTransform: 'uppercase', lineHeight: 1.1 }}>
                Manager Visibility Settings
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.12)',
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
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px 32px', maxHeight: '70vh', overflowY: 'auto' }}>
          <p style={{ fontSize: 13.5, color: '#557d98', marginBottom: 20, lineHeight: 1.5 }}>
            As the <strong>Club Coordinator</strong>, you have 100% control over which platform modules and department data are visible to department managers. Changes take effect across all active sessions instantly.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {controls.map(item => {
              const isEnabled = Boolean(visibility[item.key]);
              return (
                <div
                  key={item.key}
                  onClick={() => toggleOption(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    borderRadius: 18,
                    background: isEnabled ? '#f0f9ff' : '#f8fafc',
                    border: `2px solid ${isEnabled ? '#7dd3ea' : '#e2e8f0'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    gap: 16
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#00334e' }}>
                        {item.title}
                      </span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: isEnabled ? '#e0f2fe' : '#f1f5f9',
                        color: isEnabled ? '#0284c7' : '#64748b'
                      }}>
                        {item.badge}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <div style={{
                    width: 52,
                    height: 28,
                    borderRadius: 999,
                    background: isEnabled ? '#ea6c20' : '#cbd5e1',
                    position: 'relative',
                    transition: 'background 0.25s ease',
                    flexShrink: 0
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: 3,
                      left: isEnabled ? 27 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#ffffff',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                      transition: 'left 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 32px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#059669', fontWeight: 600 }}>
            <CheckCircle2 size={16} /> Instant live synchronization active
          </div>
          <button
            onClick={onClose}
            className="cloud-submit-btn"
            style={{ padding: '8px 24px', fontSize: 16 }}
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
}
