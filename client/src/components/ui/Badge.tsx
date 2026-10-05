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
  const labels: Record<string, string> = {
    COORDINATOR: 'Coordinator',
    DEPARTMENT_LEADER: 'Dept. Lead',
    MANAGER: 'Dept. Lead',
    MEMBER: 'Member',
  };
  const key = normalized === 'COORDINATOR' ? 'coordinator'
    : normalized === 'DEPARTMENT_LEADER' || normalized === 'MANAGER' ? 'department_leader'
    : 'member';

  return (
    <span className={`badge badge-${key}`}>
      {labels[normalized] || role}
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
