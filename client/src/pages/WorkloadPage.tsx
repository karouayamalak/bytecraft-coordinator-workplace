import { useState } from 'react';
import { AlertTriangle, BarChart3, Users } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ProgressBar from '../components/ui/ProgressBar';
import Avatar from '../components/ui/Avatar';
import { useFetch } from '../hooks/useFetch';
import type { User, Department } from '../lib/types';
import { useNavigate } from 'react-router-dom';

interface WorkloadData {
  members: Array<{
    user: User;
    activeTasksCount: number;
    overdueCount: number;
    completedCount: number;
    isOverloaded: boolean;
  }>;
  departments: Array<{
    dept: Department;
    activeTasks: number;
    overdueTasks: number;
    completedTasks: number;
    memberCount: number;
  }>;
  thresholds: { overloadedAt: number };
}

export default function WorkloadPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<'members' | 'departments'>('members');
  const { data, loading } = useFetch<WorkloadData>('/reports/workload');

  const MAX_TASKS = 10;

  return (
    <AppLayout title="Team Workload" subtitle="Identify bottlenecks and balance tasks">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="tabs" style={{ width: 'auto' }}>
          <button
            id="workload-members-tab"
            className={`tab-btn ${view === 'members' ? 'active' : ''}`}
            onClick={() => setView('members')}
          >
            <Users size={14} style={{ marginRight: 4 }} /> By Member
          </button>
          <button
            id="workload-depts-tab"
            className={`tab-btn ${view === 'departments' ? 'active' : ''}`}
            onClick={() => setView('departments')}
          >
            <BarChart3 size={14} style={{ marginRight: 4 }} /> By Department
          </button>
        </div>
        {data?.thresholds && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Threshold: {data.thresholds.overloadedAt}+ active tasks
          </span>
        )}
      </div>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          ))}
        </div>
      )}

      {/* Member view */}
      {!loading && view === 'members' && data?.members && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Department</th>
                <th>Workload</th>
                <th>Active</th>
                <th>Overdue</th>
                <th>Completed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {[...data.members]
                .sort((a, b) => b.activeTasksCount - a.activeTasksCount)
                .map(row => (
                  <tr
                    key={row.user.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/team/${row.user.id}`)}
                  >
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar src={row.user.avatarUrl} name={row.user.name} size="sm" />
                        <div>
                          <div className="font-semibold text-sm">{row.user.name}</div>
                          <div className="text-xs text-muted">{row.user.role.replace('_', ' ')}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {row.user.departmentId ? (row.user as User & { departmentName?: string }).departmentName || '—' : '—'}
                      </span>
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ flex: 1 }}>
                          <div
                            className="progress-bar"
                            style={{ height: 8, background: 'var(--bg-overlay)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}
                          >
                            <div style={{
                              height: '100%',
                              borderRadius: 'var(--radius-full)',
                              width: `${Math.min(100, (row.activeTasksCount / MAX_TASKS) * 100)}%`,
                              background: row.isOverloaded ? 'linear-gradient(90deg, #EF4444, #F97316)' : 'linear-gradient(90deg, #3B82F6, #8B5CF6)',
                              transition: 'width 0.6s var(--ease-spring)'
                            }} />
                          </div>
                        </div>
                        <span className="text-xs text-muted">{row.activeTasksCount}/{MAX_TASKS}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: row.isOverloaded ? '#F97316' : 'var(--text-primary)'
                      }}>
                        {row.activeTasksCount}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: row.overdueCount > 0 ? '#F87171' : 'var(--text-muted)' }}>
                        {row.overdueCount}
                      </span>
                    </td>
                    <td style={{ color: '#34D399' }}>{row.completedCount}</td>
                    <td>
                      {row.isOverloaded ? (
                        <span style={{
                          display: 'flex', alignItems: 'center', gap: 5,
                          color: '#F97316', fontWeight: 600, fontSize: 12
                        }}>
                          <AlertTriangle size={13} /> Overloaded
                        </span>
                      ) : row.activeTasksCount === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Available</span>
                      ) : (
                        <span style={{ color: '#34D399', fontSize: 12 }}>OK</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Department view */}
      {!loading && view === 'departments' && data?.departments && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[...data.departments]
            .sort((a, b) => b.activeTasks - a.activeTasks)
            .map(row => (
              <div
                key={row.dept.id}
                className="card"
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/departments/${row.dept.id}`)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15,
                        background: row.overdueTasks > 0 ? 'none' : 'none',
                        color: 'var(--text-primary)'
                      }}>
                        {row.dept.name}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {row.memberCount} member{row.memberCount !== 1 ? 's' : ''}
                      </span>
                      {row.overdueTasks > 0 && (
                        <span style={{
                          background: 'rgba(239,68,68,0.12)', color: '#F87171',
                          fontSize: 11, fontWeight: 700, padding: '2px 8px',
                          borderRadius: 'var(--radius-full)', border: '1px solid rgba(239,68,68,0.25)'
                        }}>
                          {row.overdueTasks} overdue
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      value={row.activeTasks + row.completedTasks > 0
                        ? Math.round((row.completedTasks / (row.activeTasks + row.completedTasks)) * 100)
                        : 0}
                      showLabel
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, flexShrink: 0 }}>
                    {[
                      { label: 'Active', value: row.activeTasks, color: '#3B82F6' },
                      { label: 'Overdue', value: row.overdueTasks, color: '#EF4444' },
                      { label: 'Done', value: row.completedTasks, color: '#10B981' },
                    ].map(stat => (
                      <div key={stat.label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: stat.value > 0 ? stat.color : 'var(--text-muted)' }}>
                          {stat.value}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </AppLayout>
  );
}
