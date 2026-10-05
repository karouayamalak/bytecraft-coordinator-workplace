import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import { useFetch } from '../hooks/useFetch';
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
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

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

  const deadlineMap = useMemo(() => {
    const map: Record<string, Task[]> = {};
    taskList
      .filter(t => t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
      .forEach(t => {
        if (t.deadline) {
          if (!map[t.deadline]) map[t.deadline] = [];
          map[t.deadline].push(t);
        }
      });
    return map;
  }, [taskList]);

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
          grid-template-columns: 1fr 300px;
          gap: 20px;
          align-items: start;
        }
        .cal-sidebar {
          display: flex;
          flex-direction: column;
          gap: 14px;
          position: sticky;
          top: 80px;
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
          transition: background 0.1s;
          border: 1.5px solid transparent;
          overflow: hidden;
        }
        .cal-day-cell:hover {
          background: #f0f9ff;
          border-color: #bae6fd;
        }
        .cal-day-cell.today {
          background: #eff6ff;
          border-color: #0284c7 !important;
        }
        .cal-day-cell.selected {
          border-color: #0284c7 !important;
          background: #e0f2fe !important;
        }
        .cal-day-cell.other-month .cal-day-num {
          opacity: 0.35;
        }
        .cal-day-num {
          font-size: 13px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1;
          margin-bottom: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .cal-day-cell.today .cal-day-num {
          background: #0284c7;
          color: white;
        }
        .cal-chip {
          font-size: 10px;
          font-weight: 600;
          padding: 1px 5px;
          border-radius: 4px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
          margin-bottom: 2px;
          line-height: 1.4;
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
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '1.5px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          {/* Month navigation header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px',
            borderBottom: '1px solid #f1f5f9'
          }}>
            <h2 style={{ fontWeight: 800, fontSize: 20, color: '#0f172a', margin: 0 }}>
              {MONTHS[month]} {year}
            </h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button
                id="calendar-prev-btn"
                onClick={prevMonth}
                aria-label="Previous month"
                style={{
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#334155'
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToToday}
                style={{
                  background: '#0284c7', color: 'white', border: 'none',
                  borderRadius: 8, padding: '5px 12px', fontSize: 12,
                  fontWeight: 700, cursor: 'pointer'
                }}
              >
                Today
              </button>
              <button
                id="calendar-next-btn"
                onClick={nextMonth}
                aria-label="Next month"
                style={{
                  background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: '#334155'
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day-of-week headers */}
          <div className="cal-day-grid" style={{ padding: '10px 12px 4px', background: '#f8fafc' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                textAlign: 'center', fontSize: 11, fontWeight: 800,
                color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em',
                padding: '4px 0'
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
                        background: `${EVENT_COLORS[event.eventType] || '#6366F1'}20`,
                        color: EVENT_COLORS[event.eventType] || '#6366F1',
                      }}
                      onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                      title={event.name}
                    >
                      🎪 {event.name}
                    </span>
                  ))}

                  {dayTasks.slice(0, 1).map(task => (
                    <span
                      key={task.id}
                      className="cal-chip"
                      style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444' }}
                      title={task.title}
                    >
                      ⏰ {task.title}
                    </span>
                  ))}

                  {/* Mobile: dots */}
                  <div className="cal-dot-row" style={{ display: 'none' }}>
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: EVENT_COLORS[event.eventType] || '#6366F1'
                      }} />
                    ))}
                    {dayTasks.length > 0 && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#EF4444' }} />
                    )}
                  </div>

                  {totalDots > 3 && (
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 1 }}>
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
            background: '#ffffff', borderRadius: 16,
            border: '1.5px solid #e2e8f0',
            padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>
              📋 Legend
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color, flexShrink: 0 }} />
                  <span style={{ color: '#64748b' }}>{EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS] || type}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444', flexShrink: 0 }} />
                <span style={{ color: '#64748b' }}>Task Deadline</span>
              </div>
            </div>
          </div>

          {/* Selected date panel */}
          {selectedDate && (selectedEvents.length > 0 || selectedTasks.length > 0) && (
            <div style={{
              background: '#ffffff', borderRadius: 16,
              border: '1.5px solid #bae6fd',
              padding: '14px 16px',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.08)'
            }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0284c7', marginBottom: 12 }}>
                📅 {new Date(selectedDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>

              {selectedEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    background: `${EVENT_COLORS[event.eventType] || '#6366F1'}10`,
                    border: `1.5px solid ${EVENT_COLORS[event.eventType] || '#6366F1'}30`,
                    borderRadius: 10, marginBottom: 8, cursor: 'pointer',
                    transition: 'transform 0.1s'
                  }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4, color: '#0f172a' }}>
                    🎪 {event.name}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: '#64748b' }}>
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
                    border: '1.5px solid rgba(239,68,68,0.2)',
                    borderRadius: 10, marginBottom: 6, fontSize: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#EF4444', marginBottom: 2 }}>
                    <CheckCircle2 size={13} /> {task.title}
                  </div>
                  {task.assignee && (
                    <div style={{ color: '#64748b', fontSize: 11 }}>
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
              background: '#ffffff', borderRadius: 16,
              border: '1.5px solid #e2e8f0', padding: '16px',
              textAlign: 'center', color: '#94a3b8', fontSize: 13
            }}>
              No events or deadlines on this day.
            </div>
          )}

          {/* Upcoming events */}
          <div style={{
            background: '#ffffff', borderRadius: 16,
            border: '1.5px solid #e2e8f0', padding: '14px 16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
          }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10 }}>
              🗓 Upcoming Events
            </div>
            {upcomingEvents.length === 0 && (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No upcoming events.</div>
            )}
            {upcomingEvents.map(event => {
              const daysUntil = Math.ceil((new Date(event.date + 'T00:00:00').getTime() - Date.now()) / 86400000);
              const urgentColor = daysUntil <= 3 ? '#EF4444' : daysUntil <= 7 ? '#F59E0B' : '#64748b';
              return (
                <div
                  key={event.id}
                  style={{ display: 'flex', gap: 10, marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div style={{
                    width: 6, flexShrink: 0, borderRadius: 4,
                    background: EVENT_COLORS[event.eventType] || '#6366F1',
                    alignSelf: 'stretch', minHeight: 36
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.name}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span>{new Date(event.date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span style={{ color: urgentColor, fontWeight: 700 }}>
                        {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `in ${daysUntil}d`}
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
