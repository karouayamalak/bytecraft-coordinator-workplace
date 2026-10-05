import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock, MapPin } from 'lucide-react';
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
  let startDow = firstDay.getDay(); // 0=Sun…6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1; // Shift to Mon=0

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = [];

  // Previous month padding
  for (let i = startDow - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push({ date: d, isCurrentMonth: false });
  }

  // Current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push({ date: new Date(year, month, i), isCurrentMonth: true });
  }

  // Next month padding
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
  WORKSHOP: '#6366F1',
  HACKATHON: '#00F0FF',
  MEETUP: '#10B981',
  COMPETITION: '#F59E0B',
  CONFERENCE: '#EC4899',
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
        if (!map[t.deadline]) map[t.deadline] = [];
        map[t.deadline].push(t);
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

  const selectedEvents = selectedDate ? (eventsMap[selectedDate] || []) : [];
  const selectedTasks = selectedDate ? (deadlineMap[selectedDate] || []) : [];

  return (
    <AppLayout title="Master Calendar" subtitle={`${MONTHS[month]} ${year}`}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>

        {/* ── Calendar Grid ── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20 }}>
              {MONTHS[month]} {year}
            </h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                id="calendar-prev-btn"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={prevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => { setMonth(now.getMonth()); setYear(now.getFullYear()); }}
              >
                Today
              </button>
              <button
                id="calendar-next-btn"
                className="btn btn-secondary btn-icon btn-sm"
                onClick={nextMonth}
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="calendar-grid" style={{ padding: '12px 16px 4px' }}>
            {DAYS.map(d => (
              <div key={d} className="calendar-day-header">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="calendar-grid" style={{ padding: '4px 16px 16px' }}>
            {calDays.map(({ date, isCurrentMonth }, idx) => {
              const iso = toISO(date);
              const dayEvents = eventsMap[iso] || [];
              const dayTasks = deadlineMap[iso] || [];
              const isToday = iso === todayISO;
              const isSelected = iso === selectedDate;

              return (
                <div
                  key={idx}
                  className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}`}
                  style={{
                    cursor: 'pointer',
                    outline: isSelected ? '2px solid var(--cyan)' : 'none',
                    outlineOffset: -2,
                  }}
                  onClick={() => setSelectedDate(prev => prev === iso ? null : iso)}
                  role="button"
                  aria-label={`${date.toDateString()}${dayEvents.length > 0 ? `, ${dayEvents.length} event(s)` : ''}${dayTasks.length > 0 ? `, ${dayTasks.length} deadline(s)` : ''}`}
                  tabIndex={0}
                  onKeyPress={e => e.key === 'Enter' && setSelectedDate(prev => prev === iso ? null : iso)}
                >
                  <div className="calendar-day-num">{date.getDate()}</div>

                  {dayEvents.slice(0, 2).map(event => (
                    <div
                      key={event.id}
                      className="cal-event-chip"
                      style={{
                        background: `${EVENT_COLORS[event.eventType] || '#6366F1'}22`,
                        color: EVENT_COLORS[event.eventType] || '#818CF8',
                        border: `1px solid ${EVENT_COLORS[event.eventType] || '#6366F1'}40`,
                      }}
                      onClick={e => { e.stopPropagation(); navigate(`/events/${event.id}`); }}
                    >
                      🎪 {event.name}
                    </div>
                  ))}

                  {dayTasks.slice(0, 2).map(task => (
                    <div
                      key={task.id}
                      className="cal-event-chip"
                      style={{
                        background: 'rgba(239,68,68,0.1)',
                        color: '#F87171',
                        border: '1px solid rgba(239,68,68,0.2)',
                      }}
                    >
                      ⏰ {task.title}
                    </div>
                  ))}

                  {(dayEvents.length > 2 || dayTasks.length > 2) && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      +{Math.max(0, dayEvents.length - 2) + Math.max(0, dayTasks.length - 2)} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Sidebar Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>

          {/* Legend */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Legend</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Object.entries(EVENT_COLORS).map(([type, color]) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{EVENT_TYPE_LABELS[type as keyof typeof EVENT_TYPE_LABELS]}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: '#EF4444' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Task Deadline</span>
              </div>
            </div>
          </div>

          {/* Selected date details */}
          {selectedDate && (selectedEvents.length > 0 || selectedTasks.length > 0) && (
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                {new Date(selectedDate + 'T12:00:00').toDateString()}
              </div>

              {selectedEvents.map(event => (
                <div
                  key={event.id}
                  style={{
                    padding: '10px 12px',
                    background: `${EVENT_COLORS[event.eventType] || '#6366F1'}12`,
                    border: `1px solid ${EVENT_COLORS[event.eventType] || '#6366F1'}30`,
                    borderRadius: 8, marginBottom: 8, cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/events/${event.id}`)}
                >
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{event.name}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12, color: 'var(--text-secondary)' }}>
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
                    background: 'rgba(239,68,68,0.08)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, marginBottom: 6, fontSize: 12
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: 2 }}>⏰ {task.title}</div>
                  {task.assignee && (
                    <div style={{ color: 'var(--text-muted)' }}>→ {task.assignee.name}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {selectedDate && selectedEvents.length === 0 && selectedTasks.length === 0 && (
            <div className="card" style={{ padding: '14px 16px', textAlign: 'center' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                No events or deadlines on this day.
              </div>
            </div>
          )}

          {/* Upcoming events quick list */}
          <div className="card" style={{ padding: '14px 16px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>📋 Upcoming Events</div>
            {eventList
              .filter(e => e.date >= todayISO && e.status !== 'CANCELLED' && e.status !== 'COMPLETED')
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(0, 5)
              .map(event => {
                const daysUntil = Math.ceil((new Date(event.date).getTime() - Date.now()) / 86400000);
                return (
                  <div
                    key={event.id}
                    style={{ display: 'flex', gap: 10, marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => navigate(`/events/${event.id}`)}
                  >
                    <div style={{
                      width: 8, flexShrink: 0, borderRadius: 4,
                      background: EVENT_COLORS[event.eventType] || '#6366F1', alignSelf: 'stretch'
                    }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{event.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {new Date(event.date + 'T12:00:00').toDateString()}
                        {daysUntil <= 7 && <span style={{ color: '#FCD34D', marginLeft: 4 }}>· in {daysUntil}d</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            {eventList.filter(e => e.date >= todayISO && e.status !== 'CANCELLED').length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No upcoming events.</div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
