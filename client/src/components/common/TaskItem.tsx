import { Check, Clock, Calendar, Edit2, Trash2, AlertCircle } from 'lucide-react';
import Avatar from '../ui/Avatar';
import type { Task } from '../../lib/types';
import { formatDate, getDeadlineUrgency } from '../../lib/utils';

export function getShortDeptName(name?: string) {
  if (!name) return '';
  const lower = name.toLowerCase();
  if (lower.includes('comm') || lower.includes('relation') || lower.includes('external')) return 'Comms';
  if (lower.includes('design')) return 'Design';
  if (lower.includes('multimedia')) return 'Multimedia';
  if (lower.includes('logistics') || lower.includes('activit')) return 'Logistics';
  if (lower.includes('dev')) return 'Dev';
  return name.replace(' Department', '').trim();
}

export interface TaskItemProps {
  task: Task;
  onToggleDone?: (task: Task) => void;
  canToggle?: boolean;
  isToggling?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  showAssignee?: boolean;
  showDepartment?: boolean;
  showDeadline?: boolean;
  className?: string;
}

export default function TaskItem({
  task,
  onToggleDone,
  canToggle = true,
  isToggling = false,
  onEdit,
  onDelete,
  canEdit = false,
  canDelete = false,
  showAssignee = true,
  showDepartment = true,
  showDeadline = true,
  className = '',
}: TaskItemProps) {
  const isDone = task.status === 'COMPLETED';
  const urgency = isDone ? 'done' : getDeadlineUrgency(task.deadline, task.status);
  const isOverdue = urgency === 'overdue';
  const isToday = urgency === 'today';
  const isSoon = urgency === 'soon';

  return (
    <div
      className={`task-minimal-row ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        background: isDone ? 'var(--bg-subtle)' : 'var(--bg-surface)',
        border: '1px solid',
        borderColor: isDone
          ? 'var(--border-subtle)'
          : isOverdue
          ? 'rgba(239, 68, 68, 0.4)'
          : 'var(--border)',
        borderRadius: 8,
        transition: 'all 0.12s ease',
        opacity: isDone ? 0.6 : 1,
      }}
    >
      {/* Minimal Checkbox */}
      <button
        type="button"
        onClick={() => canToggle && onToggleDone && onToggleDone(task)}
        disabled={isToggling || !canToggle}
        aria-label={isDone ? 'Mark as incomplete' : 'Mark as completed'}
        title={!canToggle ? 'Only the assignee, department manager, or board can check this' : isDone ? 'Mark as pending' : 'Mark as done'}
        style={{
          width: 18,
          height: 18,
          borderRadius: 5,
          border: isDone ? 'none' : '1.5px solid var(--border-hover)',
          background: isDone ? '#10B981' : 'var(--bg-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: canToggle ? 'pointer' : 'not-allowed',
          padding: 0,
          flexShrink: 0,
          transition: 'all 0.12s ease',
        }}
      >
        {isDone && <Check size={11} strokeWidth={3} color="#ffffff" />}
      </button>

      {/* Title & Description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: isDone ? 400 : 500,
            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
            textDecoration: isDone ? 'line-through' : 'none',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={task.title}
        >
          {task.title}
        </div>
        {task.description && !isDone && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {task.description}
          </div>
        )}
      </div>

      {/* Right-aligned Meta Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {/* Department chip(s) */}
        {showDepartment && (
          task.departments && task.departments.length > 0 ? (
            <div style={{ display: 'flex', gap: 4 }}>
              {task.departments.map(d => (
                <span
                  key={d.id}
                  title={d.name}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 10.5,
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    padding: '1px 6px',
                    borderRadius: 4,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: d.color || 'var(--accent)' }} />
                  {getShortDeptName(d.name)}
                </span>
              ))}
            </div>
          ) : task.department ? (
            <span
              title={task.department.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 10.5,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                background: 'var(--bg-subtle)',
                border: '1px solid var(--border)',
                padding: '1px 6px',
                borderRadius: 4,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: task.department.color || 'var(--accent)' }} />
              {getShortDeptName(task.department.name)}
            </span>
          ) : null
        )}

        {/* Assignee(s) */}
        {showAssignee && (
          task.assignees && task.assignees.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} title={task.assignees.map(a => a.name).join(', ')}>
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: task.assignees.length > 1 ? 4 : 0 }}>
                {task.assignees.slice(0, 3).map((a, idx) => (
                  <div key={a.id} style={{ marginLeft: idx > 0 ? -6 : 0, zIndex: 10 - idx }}>
                    <Avatar src={a.avatarUrl} name={a.name} size="xs" />
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.assignees.map(a => a.name.split(' ')[0]).join(' + ')}
              </span>
            </div>
          ) : task.assignee ? (
            <span
              title={`Assigned to ${task.assignee.name}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <Avatar src={task.assignee.avatarUrl} name={task.assignee.name} size="xs" />
              <span style={{ whiteSpace: 'nowrap', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.assignee.name.split(' ')[0]}
              </span>
            </span>
          ) : (
            <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>
              Unassigned
            </span>
          )
        )}

        {/* Deadline & Urgency */}
        {showDeadline && (
          isDone ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#10B981',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '2px 8px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              Done
            </span>
          ) : isOverdue ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: '#EF4444',
                background: 'rgba(239, 68, 68, 0.1)',
                padding: '2px 8px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              <AlertCircle size={11} /> Overdue
            </span>
          ) : isToday ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 700,
                color: '#e87823',
                background: 'rgba(232, 120, 35, 0.1)',
                padding: '2px 8px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              <Clock size={11} /> Today
            </span>
          ) : isSoon ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                fontWeight: 600,
                color: '#d97706',
                background: 'rgba(217, 119, 6, 0.08)',
                padding: '2px 8px',
                borderRadius: 99,
                whiteSpace: 'nowrap',
              }}
            >
              <Calendar size={11} /> {formatDate(task.deadline)}
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 11,
                color: '#64748b',
                whiteSpace: 'nowrap',
              }}
            >
              <Calendar size={11} /> {formatDate(task.deadline)}
            </span>
          )
        )}

        {/* Actions */}
        {(canEdit || canDelete) && (
          <div
            className="task-action-btns"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              marginLeft: 4,
            }}
          >
            {canEdit && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(task);
                }}
                title="Edit task"
                style={{
                  width: 26,
                  height: 26,
                  padding: 0,
                  borderRadius: 6,
                  color: '#64748b',
                }}
              >
                <Edit2 size={12} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(task.id);
                }}
                title="Delete task"
                style={{
                  width: 26,
                  height: 26,
                  padding: 0,
                  borderRadius: 6,
                  color: '#94a3b8',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
