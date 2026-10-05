import {
  Download, CheckCircle2, AlertCircle, Clock, Share2, Printer
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import ProgressBar from '../components/ui/ProgressBar';
import { formatDate } from '../lib/utils';

interface ReportData {
  taskStatusCounts: {
    COMPLETED: number;
    IN_PROGRESS: number;
    BLOCKED: number;
    REVIEW: number;
    TODO: number;
    CANCELLED: number;
    OVERDUE: number;
  };
  deptPerformance: Array<{
    id: string;
    name: string;
    color: string;
    totalTasks: number;
    activeTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
  }>;
  eventReadiness: Array<{
    id: string;
    name: string;
    date: string;
    eventType: string;
    totalTasks: number;
    completedTasks: number;
    remainingTasks: number;
    overdueTasks: number;
    percent: number;
  }>;
  communicationCounts: {
    PLANNED: number;
    IN_PROGRESS: number;
    READY: number;
    PUBLISHED: number;
    OVERDUE: number;
  };
}

export default function ReportsPage() {
  const { data, loading } = useFetch<ReportData>('/reports/analytics');

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!data) return;
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Department,Total Tasks,Active,Completed,Overdue,Completion Rate (%)\n';
    data.deptPerformance.forEach(d => {
      csvContent += `"${d.name}",${d.totalTasks},${d.activeTasks},${d.completedTasks},${d.overdueTasks},${d.completionRate}%\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bytecraft_executive_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || !data) {
    return (
      <AppLayout title="Reports & Analytics">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  const { taskStatusCounts, deptPerformance, eventReadiness, communicationCounts } = data;
  const totalAllTasks = Object.values(taskStatusCounts).reduce((a, b) => a + b, 0);
  const overallCompletionRate = totalAllTasks > 0 ? Math.round((taskStatusCounts.COMPLETED / totalAllTasks) * 100) : 0;

  return (
    <AppLayout
      title="Club Performance & Reports"
      subtitle="Comprehensive productivity metrics, department readiness, and audit reports"
      breadcrumbs={[{ label: 'Reports' }]}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>
            <Download size={16} /> Export CSV
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <Printer size={16} /> Print Briefing
          </button>
        </div>
      }
    >
      {/* Printable Report Header */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%)',
        border: '1px solid rgba(0, 212, 255, 0.25)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src="/bytecraft-logo.png" alt="ByteCraft" style={{ width: 50, height: 50, objectFit: 'contain' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#FFFFFF' }}>
              ByteCraft Executive Performance Report
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Generated on {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(0, 212, 255, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(0, 212, 255, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Completion</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent-primary)' }}>{overallCompletionRate}%</div>
          </div>
          <div style={{
            padding: '8px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: 8,
            border: '1px solid rgba(239, 68, 68, 0.2)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overdue Items</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#F87171' }}>{taskStatusCounts.OVERDUE}</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
            <CheckCircle2 size={24} style={{ color: '#34D399' }} />
          </div>
          <div className="stat-value">{taskStatusCounts.COMPLETED}</div>
          <div className="stat-label">Tasks Completed</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(56, 189, 248, 0.15)' }}>
            <Clock size={24} style={{ color: '#38BDF8' }} />
          </div>
          <div className="stat-value">{taskStatusCounts.IN_PROGRESS}</div>
          <div className="stat-label">Tasks In Progress</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
            <AlertCircle size={24} style={{ color: '#F59E0B' }} />
          </div>
          <div className="stat-value">{taskStatusCounts.BLOCKED + taskStatusCounts.REVIEW}</div>
          <div className="stat-label">Under Review / Blocked</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(139, 92, 246, 0.15)' }}>
            <Share2 size={24} style={{ color: '#A78BFA' }} />
          </div>
          <div className="stat-value">{communicationCounts.PUBLISHED} / {Object.values(communicationCounts).reduce((a,b)=>a+b,0)}</div>
          <div className="stat-label">Comms Published</div>
        </div>
      </div>

      {/* Department Breakdown Matrix */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
          Department Execution & Delivery Comparison
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Department</th>
                <th>Active Deliverables</th>
                <th>Completed</th>
                <th>Overdue</th>
                <th>Delivery Rate</th>
              </tr>
            </thead>
            <tbody>
              {deptPerformance.map(d => (
                <tr key={d.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', background: d.color }} />
                      <strong style={{ color: 'var(--text-primary)' }}>{d.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: 'var(--bg-elevated)' }}>
                      {d.activeTasks} tasks
                    </span>
                  </td>
                  <td style={{ color: '#34D399', fontWeight: 600 }}>{d.completedTasks}</td>
                  <td style={{ color: d.overdueTasks > 0 ? '#F87171' : 'var(--text-muted)', fontWeight: d.overdueTasks > 0 ? 700 : 400 }}>
                    {d.overdueTasks}
                  </td>
                  <td style={{ minWidth: 140 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <ProgressBar value={d.completionRate} color={d.color} height={6} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 34 }}>
                        {d.completionRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Readiness Summary */}
      <div className="glass-card" style={{ padding: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700 }}>
          Event Preparation & Logistics Health
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
          {eventReadiness.map(ev => (
            <div
              key={ev.id}
              style={{
                padding: 16,
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {ev.name}
                  </h4>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatDate(ev.date)} • {ev.eventType}
                  </span>
                </div>
                <span className="badge" style={{
                  background: ev.percent >= 80 ? 'rgba(52, 211, 153, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: ev.percent >= 80 ? '#34D399' : '#F59E0B'
                }}>
                  {ev.percent}% Ready
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <ProgressBar value={ev.percent} variant="gradient" height={6} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                <span>{ev.completedTasks} completed</span>
                <span>{ev.remainingTasks} remaining</span>
                {ev.overdueTasks > 0 && <span style={{ color: '#F87171', fontWeight: 600 }}>{ev.overdueTasks} late</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
