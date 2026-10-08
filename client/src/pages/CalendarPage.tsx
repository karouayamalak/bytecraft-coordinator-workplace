import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
import { useAuth } from '../contexts/AuthContext';
import type { Event, Task } from '../lib/types';
import { EVENT_TYPE_LABELS } from '../lib/utils';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  let startDow = firstDay.getDay();
  startDow = startDow === 0 ? 6 : startDow - 1; // Shift to Mon=0

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
  }

  return days;
}

function toISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const EVENT_COLORS: Record<string, string> = {
  WORKSHOP:    '#6366F1',
  HACKATHON:   '#06B6D4',
  MEETUP:      '#10B981',
  COMPETITION: '#F59E0B',
  CONFERENCE:  '#EC4899',
  PRESENTATION:'#8B5CF6',
  OTHER:       '#64748B',
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const { user, department } = useAuth();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [taskScope, setTaskScope] = useState<'all' | 'mine'>('all');

  const { data: events } = useFetch<Event[]>('/events');
  const { data: tasks } = useFetch<Task[]>('/tasks');

  const eventList = (events as Event[]) || [];
  const taskList = (tasks as Task[]) || [];

  const calDays = useMemo(() => getCalendarDays(year, month), [year, month]);
  const todayISO = toISO(now);

  const eventsMap = useMemo(() => {
    const map: Record<string, Event[]> = {};
    eventList.forEach(e => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    return map;
  }, [eventList]);

  const isAssigned = (t: Task) => {
    if (t.assignedMemberId === user?.id) return true;
    if (Array.isArray(t.assignedMemberIds) && t.assignedMemberIds.includes(user?.id || '')) return true;
    return false;
  };

  const deadlineMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    taskList
      .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
      .filter(t => taskScope === 'all' || isAssigned(t))
      .forEach(t => {
        if (t.deadline) {
          if (!map[t.deadline]) map[t.deadline] = [];
          map[t.deadline].push(t);
        }
      });
    return map;
  }, [taskList, taskScope, user?.id]);

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const goToToday = () => {
    setMonth(now.getMonth());
    setYear(now.getFullYear());
    setSelectedDate(todayISO);
  };

  const selectedEvents = selectedDate ? (eventsMap[selectedDate] || []) : [];
  const selectedTasks = selectedDate ? (deadlineMap[selectedDate] || []) : [];

  const upcomingEvents = eventList
    .filter(e => e.date >= todayISO && e.status !== 'CANCELLED' && e.status !== 'COMPLETED')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <AppLayout title="Calendar" subtitle={`${MONTHS[month]} ${year}`}>
      <style>{`
        .cal-responsive-grid {
          display: grid;
          grid-template-columns: 1fr 280px;
          gap: 16px;
          align-items: start;
        }
        .cal-sidebar {
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: sticky;
          top: 72px;
        }
        @media (max-width: 900px) {
          .cal-responsive-grid {
            grid-template-columns: 1fr;
          }
          .cal-sidebar {
            position: static;
          }
        }
        .cal-day-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
        }
        .cal-day-cell {
          min-height: 72px;
          padding: 6px 4px 4px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s, border-color 0.15s;
          border: 1px solid transparent;
          overflow: hidden;
          background: var(--bg-surface);
        }
        .cal-day-cell:hover {
          background: var(--bg-subtle);
          border-color: var(--border-hover);
        }
        .cal-day-cell.today {
          border-color: var(--accent) !important;
          background: var(--bg-subtle);
        }
        .cal-day-cell.selected {
          border-color: var(--accent) !important;
          background: var(--bg-elevated) !important;
        }
        .cal-day-cell.other-month {
          opacity: 0.35;
        }
        .cal-day-num {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 50%;
        }
        .cal-day-cell.today .cal-day-num {
          background: var(--accent);
          color: #ffffff;
        }
        .cal-chip {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 5px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          margin-bottom: 2px;
          line-height: 1.3;
        }
        @media (max-width: 640px) {
          .cal-day-cell {
            min-height: 48px;
            padding: 4px 2px 2px;
          }
          .cal-chip { display: none; }
          .cal-dot-row { display: flex !important; gap: 3px; flex-wrap: wrap; }
        }
      `}</style>

      <div className="cal-responsive-grid">
        {/* ── Calendar Grid ── */}
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 14,
          border: '1px solid var(--border)',
          overflow: 'hidden'
        }}>
          {/* Month navigation header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border)',
            flexWrap: 'wrap',
            gap: 10
          }}>
            <h2 style={{ fontWeight: 700, fontSize: 18, color: 'var(--text-primary)', margin: 0 }}>
              {MONTHS[month]} {year}
            </h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {/* Personal vs Department Deadlines Filter */}
              <div style={{ display: 'inline-flex', background: 'var(--bg-subtle)', padding: 2, borderRadius: 8, marginRight: 6 }}>
                <button
                  type="button"
                  onClick={() => setTaskScope('all')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: taskScope === 'all' ? 'var(--bg-elevated)' : 'transparent',
                    color: taskScope === 'all' ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setTaskScope('mine')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    background: taskScope === 'mine' ? 'var(--bg-elevated)' : 'transparent',
                    color: taskScope === 'mine' ? 'var(--text-primary)' : 'var(--text-muted)'
                  }}
                >
                  My Tasks
                </button>
              </div>

              <button
                id="calendar-prev-btn"
                onClick={prevMonth}
                aria-label="Previous month"
                style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
                }}
              >
                <ChevronLeft size={15} />
              </button>
              <button
                onClick={goToToday}
                style={{
                  background: 'var(--accent)', color: 'white', border: 'none',
                  borderRadius: 8, padding: '5px 12px', fontSize: 11.5,
                  fontWeight: 600, cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                id="calendar-next-btn"
                onClick={nextMonth}
                aria-label="Next month"
                style={{
                  background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 8,
                  width: 30, height: 30, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)'
                }}
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="cal-day-grid" style={{ padding: '8px 12px 4px', background: 'var(--bg-subtle)' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 10.5, fontWeight: 600,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '3px 0'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar day cells */}
          <div className="cal-day-grid" style={{ padding: '4px 12px 16px', gap: 3 }}>
            {calDays.map(({ date, isCurrentMonth }, idx) => {
              const iso = toISO(date);
              const dayEvents = eventsMap[iso] || [];
              const dayTasks = deadlineMap[iso] || [];
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDate;
              const totalDots = dayEvents.length + dayTasks.length;

              return (
                <div
                  key={idx}
                  className={`cal-day-cell${!isCurrentMonth ? ' other-month' : ''}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`}
                  onClick={() => setSelectedDate(prev => prev === iso ? null : iso)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={e => e.key === 'Enter' && setSelectedDate(prev => prev === iso ? null : iso)}
                  aria-label={`${date.toDateString()}${dayEvents.length > 0 ? `, ${dayEvents.length} event(s)` : ''}${dayTasks.length > 0 ? `, ${dayTasks.length} deadline(s)` : ''}`}
                >
                  <div className="cal-day-num">{date.getDate()}</div>

                  {/* Desktop: show chips */}
                  {dayEvents.slice(0, 2).map(event => (
                    <span
                      key={event.id}
                      className="cal-chip"
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                      }}
                      onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                      title={event.name}
                    >
                      {event.name}
                    </span>
                  ))}

                  {dayTasks.slice(0, 1).map(task => (
                    <span
                      key={task.id}
                      className="cal-chip"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                      title={task.title}
                    >
                      {task.title}
                    </span>
                  ))}

                  {/* Mobile: dots */}
                  <div className="cal-dot-row" style={{ display: 'none' }}>
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: EVENT_COLORS[event.eventType] || 'var(--accent)'
                      }} />
                    ))}
                    {dayTasks.length > 0 && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                    )}
                  </div>

                  {totalDots > 3 && (
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>
                      +{totalDots - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar Panel ── */}
        <div className="cal-sidebar">
          {/* Legend */}
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 14,
            border: '1px solid var(--border)',
            padding: '14px 16px',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
              Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] || type}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: '#EF4444', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>Task Deadline</span>
              </div>
            </div>
          </div>

          {/* Selected date panel */}
          {selectedDate && (selectedEvents.length > 0 || selectedTasks.length > 0) && (
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 14,
              border: '1px solid var(--border)',
              padding: '14px 16px',
            }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--accent)', marginBottom: 12 }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>

              {selectedEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 8, marginBottom: 8, cursor: 'pointer',
                    transition: 'border-color 0.15s'
                  }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: 'var(--text-primary)' }}>
                    {event.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={11} /> {event.startTime} – {event.endTime}
                    </span>
                    {event.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <MapPin size={11} /> {event.location}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {selectedTasks.map(task => (
                <div
                  key={task.id}
                  style={{
                    padding: '8px 12px',
                    background: 'rgba(239,68,68,0.06)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, marginBottom: 6, fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#f87171', marginBottom: 2 }}>
                    <CheckCircle2 size={13} /> {task.title}
                  </div>
                  {task.assignee && (
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                      → {task.assignee.name}
                      {task.department && ` · ${task.department.name}`}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedDate && selectedEvents.length === 0 && selectedTasks.length === 0 && (
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 14,
              border: '1px solid var(--border)', padding: '16px',
              textAlign: 'center', color: 'var(--text-muted)', fontSize: 13
            }}>
              No events or deadlines on this day.
            </div>
          )}

          {/* Upcoming events */}
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 14,
            border: '1px solid var(--border)', padding: '14px 16px',
          }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', marginBottom: 10 }}>
              Upcoming Events
            </div>
            {upcomingEvents.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming events.</div>
            )}
            {upcomingEvents.map(event => {
              const daysUntil = Math.ceil((new Date(event.date + 'T00:00:00').getTime() - Date.now()) / 86400000);
              const urgentColor = daysUntil <= 3 ? '#EF4444' : daysUntil <= 7 ? '#F59E0B' : 'var(--text-muted)';
              return (
                <div
                  key={event.id}
                  style={{ display: 'flex', gap: 10, marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div style={{
                    width: 3, flexShrink: 0, borderRadius: 2,
                    background: EVENT_COLORS[event.eventType] || 'var(--accent)',
                    alignSelf: 'stretch', minHeight: 36
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span style={{ color: urgentColor, fontWeight: 600 }}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
