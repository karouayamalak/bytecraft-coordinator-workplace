import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, CheckCircle2, Clock,
  ArrowRight, CheckSquare, BarChart3, ChevronRight, CalendarDays
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import type { DashboardData, Task, Event } from '../lib/types';
import { PriorityBadge } from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { formatDate } from '../lib/utils';

export default function CoordinatorRadarPage() {
  const navigate = useNavigate();
  const { data: dashboard, loading: loadingDash } = useFetch<DashboardData>('/dashboard/summary');
  const { data: allTasks = [] } = useFetch<Task[]>('/tasks');
  const { data: allEvents = [] } = useFetch<Event[]>('/events');

  if (loadingDash || !dashboard) {
    return (
      <AppLayout title="Coordinator Command Radar">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0' }}>
          <div className="spinner" />
        </div>
      </AppLayout>
    );
  }

  const tasksList = allTasks || [];
  const eventsList = allEvents || [];
  const todayStr = new Date().toISOString().split('T')[0];

  // Urgent deadlines: due within next 7 days and not completed
  const urgentDeadlines = tasksList
    .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline)
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 5);

  // Attention items: overdue tasks, blocked tasks, overloaded members
  const overdueTasks = tasksList.filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.deadline < todayStr);
  const blockedTasks = tasksList.filter(t => t.status === 'BLOCKED');
  
  const attentionItems = [
    ...overdueTasks.map(t => ({
      title: `Overdue Task: "${t.title}"`,
      link: `/tasks?search=${encodeURIComponent(t.title)}`,
      type: 'danger'
    })),
    ...blockedTasks.map(t => ({
      title: `Blocked Task: "${t.title}" requires coordination intervention`,
      link: `/tasks?search=${encodeURIComponent(t.title)}`,
      type: 'warning'
    })),
    ...(dashboard.overloadedMembers || []).map(m => ({
      title: `Workload Alert: ${m.user.name} has ${m.activeTasksCount} active tasks`,
      link: '/workload',
      type: 'warning'
    }))
  ];

  const departmentLoads = dashboard.departmentBreakdown || [];
  const upcomingEvents = eventsList
    .filter(e => e.date >= todayStr && e.status !== 'CANCELLED')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4);

  return (
    <AppLayout
      title="Coordinator Command Radar"
      subtitle="Executive intelligence answering all core operational questions at a glance"
      breadcrumbs={[{ label: 'Coordinator Radar' }]}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
            <BarChart3 size={16} /> Full Reports
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/tasks')}>
            <CheckSquare size={16} /> Manage All Tasks
          </button>
        </div>
      }
    >
      {/* Executive Hero Banner */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        marginBottom: 24,
        background: 'linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(31, 41, 55, 0.95) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', border: '1px solid var(--border-default)' }}>
                EXECUTIVE OVERSIGHT
              </span>
              <span className="badge" style={{ background: 'rgba(0, 212, 255, 0.15)', color: '#38BDF8' }}>
                ByteCraft Club Live
              </span>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 10px', color: '#FFFFFF' }}>
              Coordinator Command Center
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: 0, lineHeight: 1.6, maxWidth: 620 }}>
              Instant answers to who is working on what, approaching deadlines, event readiness, overload alerts, and pending club deliverables.
            </p>
          </div>
        </div>
      </div>

      {/* CORE QUESTIONS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>

        {/* Question 1: What needs the coordinator's attention today? */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={20} style={{ color: '#EF4444' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Coordinator's Attention</h3>
            </div>
            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#F87171' }}>
              {attentionItems.length} Actions
            </span>
          </div>

          {attentionItems.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={32} style={{ color: '#34D399', margin: '0 auto 8px' }} />
              <p style={{ margin: 0 }}>All clear! No urgent blockages or overdue tasks.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {attentionItems.slice(0, 4).map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => item.link && navigate(item.link)}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10
                  }}
                >
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {item.title}
                  </div>
                  <ChevronRight size={14} style={{ color: '#F87171', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Question 2: Which department has highest workload? */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={20} style={{ color: '#F59E0B' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Department Workloads</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/workload')}>
              View All <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {departmentLoads.map(dept => (
              <div
                key={dept.id}
                onClick={() => navigate('/workload')}
                style={{
                  padding: '10px 14px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{dept.name}</span>
                  <span className="badge" style={{ background: dept.activeTasksCount > 4 ? '#EF4444' : 'var(--bg-surface)', color: '#fff', fontSize: 11 }}>
                    {dept.activeTasksCount} tasks
                  </span>
                </div>
                <ProgressBar value={Math.min(100, (dept.activeTasksCount / 8) * 100)} color={dept.color} height={6} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {dept.memberCount} active members • {dept.overdueTasksCount} overdue
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Question 3: What deadlines are approaching? */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={20} style={{ color: '#38BDF8' }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Approaching Deadlines</h3>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/deadlines')}>
              Timeline <ArrowRight size={12} />
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {urgentDeadlines.map(task => (
              <div
                key={task.id}
                onClick={() => navigate(`/tasks?search=${encodeURIComponent(task.title)}`)}
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{task.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Due: {formatDate(task.deadline)}</div>
                </div>
                <PriorityBadge priority={task.priority} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED DRILLDOWN SECTIONS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>

        {/* SECTION: Upcoming Events & Preparation Readiness */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Upcoming Events & Preparation Readiness
              </h3>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Agendas, preparation checklists, and organizers
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/events')}>
              All Events ({upcomingEvents.length})
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {upcomingEvents.map(event => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                style={{
                  padding: 16,
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {event.name}
                    </h4>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {formatDate(event.date)} • {event.location}
                    </span>
                  </div>
                  <span className="badge" style={{ background: 'rgba(0, 212, 255, 0.1)', color: '#38BDF8' }}>
                    {event.eventType}
                  </span>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Event Preparation Readiness</span>
                    <span style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {event.progressPercent || 70}%
                    </span>
                  </div>
                  <ProgressBar value={event.progressPercent || 70} variant="gradient" height={6} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION: Overloaded Members & Action Redistribution */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>
                Overloaded Club Members
              </h3>
              <p style={{ margin: '2px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
                Members requiring task re-assignment or deadline assistance
              </p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/workload')}>
              Workload Grid
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(!dashboard.overloadedMembers || dashboard.overloadedMembers.length === 0) ? (
              <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <CheckCircle2 size={36} style={{ color: '#34D399', margin: '0 auto 8px' }} />
                <p>No club members are currently overloaded.</p>
              </div>
            ) : (
              dashboard.overloadedMembers.map(m => (
                <div
                  key={m.user.id}
                  onClick={() => navigate('/workload')}
                  style={{
                    padding: 14,
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{m.user.name}</span>
                    <span className="badge" style={{ background: '#EF4444', color: '#fff', fontSize: 11 }}>
                      {m.activeTasksCount} active tasks
                    </span>
                  </div>
                  <ProgressBar
                    value={Math.min(100, (m.activeTasksCount / 6) * 100)}
                    color="#EF4444"
                    height={6}
                  />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    Role: {m.user.role} • {m.overdueCount} overdue tasks
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
