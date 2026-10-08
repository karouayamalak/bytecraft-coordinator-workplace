import React from 'react';
import type { TaskStatus, TaskPriority, UserRole, CommStatus, EventStatus } from '../../lib/types';
import { STATUS_LABELS, PRIORITY_LABELS, COMM_STATUS_LABELS } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return <span className={`badge ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const key = status.toLowerCase().replace('_', '_');
  return (
    <span className={`badge badge-${key}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={`badge badge-${priority.toLowerCase()}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function RoleBadge({ role }: { role: UserRole | string }) {
  const normalized = (role || '').toUpperCase();

  const config: Record<string, { label: string; bg: string; color: string }> = {
    PRESIDENT:       { label: 'President',      bg: '#7c3aed', color: '#fff' },
    VICE_PRESIDENT:  { label: 'Vice President',  bg: '#4f46e5', color: '#fff' },
    COORDINATOR:     { label: 'Coordinator',     bg: '#ea580c', color: '#fff' },
    HR:              { label: 'HR',              bg: '#0891b2', color: '#fff' },
    SECRETARY:       { label: 'Secretary',       bg: '#059669', color: '#fff' },
    MANAGER:         { label: 'Manager',         bg: '#2563eb', color: '#fff' },
    DEPARTMENT_LEADER: { label: 'Manager',       bg: '#2563eb', color: '#fff' },
    MEMBER:          { label: 'Member',          bg: '#64748b', color: '#fff' },
  };

  const { label, bg, color } = config[normalized] || { label: role, bg: '#64748b', color: '#fff' };

  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 99,
      fontSize: 10,
      fontWeight: 800,
      background: bg,
      color,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
    }}>
      {label}
    </span>
  );
}


export function CommStatusBadge({ status }: { status: CommStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {COMM_STATUS_LABELS[status]}
    </span>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
