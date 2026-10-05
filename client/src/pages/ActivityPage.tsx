import React, { useState } from 'react';
import {
  Activity, CheckSquare, Calendar, Building2, User,
  Settings, Clock, Filter, RefreshCw
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import { useWebSocket } from '../hooks/useWebSocket';
import Avatar from '../components/ui/Avatar';
import { formatRelativeTime } from '../lib/utils';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
  actor?: {
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
  };
}

export default function ActivityPage() {
  const { data, loading, refetch } = useFetch<ActivityItem[]>('/system/activity?limit=100');
  const [filterType, setFilterType] = useState<string>('ALL');

  useWebSocket(() => {
    refetch();
  });

  const logs = data || [];
  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.entityType === filterType;
  });

  const getEntityIcon = (type: string) => {
    switch (type) {
      case 'TASK':
        return <CheckSquare size={16} style={{ color: '#38BDF8' }} />;
      case 'EVENT':
        return <Calendar size={16} style={{ color: '#A78BFA' }} />;
      case 'DEPARTMENT':
        return <Building2 size={16} style={{ color: '#F59E0B' }} />;
      case 'USER':
      case 'MEMBER':
        return <User size={16} style={{ color: '#34D399' }} />;
      default:
        return <Activity size={16} style={{ color: 'var(--accent-primary)' }} />;
    }
  };

  return (
    <AppLayout
      title="Audit Trail & Club Activity"
      subtitle="Transparent, real-time log of team actions, task progressions, and organizational updates"
      breadcrumbs={[{ label: 'Activity' }]}
      actions={
        <button className="btn btn-secondary" onClick={() => refetch()}>
          <RefreshCw size={14} /> Refresh
        </button>
      }
    >
      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['ALL', 'TASK', 'EVENT', 'DEPARTMENT', 'SETTINGS'].map(t => (
          <button
            key={t}
            className={`btn btn-sm ${filterType === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setFilterType(t)}
          >
            {t === 'ALL' ? 'All Activity' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
          <div className="spinner" />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
          <Activity size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <p>No activity recorded for this category.</p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {filteredLogs.map(log => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '12px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{
                  padding: 8,
                  borderRadius: 10,
                  background: 'var(--bg-surface)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {getEntityIcon(log.entityType)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {log.actor && (
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: 14 }}>
                        {log.actor.name}
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {log.details || log.action}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Entity: <span style={{ textTransform: 'capitalize' }}>{log.entityType.toLowerCase()}</span> • {formatRelativeTime(log.timestamp)}
                  </div>
                </div>

                <span className="badge" style={{ background: 'var(--bg-surface)', fontSize: 11 }}>
                  {log.action}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
