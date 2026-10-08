import type { TaskStatus, TaskPriority, CommStatus, CommChannel, CommPhase } from './types';

export const BOARD_ROLES = ['COORDINATOR', 'PRESIDENT', 'VICE_PRESIDENT', 'HR', 'SECRETARY'];
export const isBoardRole = (role?: string) => BOARD_ROLES.includes((role || '').toUpperCase());
export const isManagerRole = (role?: string) => ['MANAGER', 'DEPARTMENT_LEADER'].includes((role || '').toUpperCase());

export const STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  BLOCKED: 'Blocked',
  REVIEW: 'In Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent',
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WORKSHOP: 'Workshop',
  HACKATHON: 'Hackathon',
  MEETUP: 'Meetup',
  COMPETITION: 'Competition',
  CONFERENCE: 'Conference',
  PRESENTATION: 'Presentation',
  OTHER: 'Other',
};

export const COMM_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'Planned',
  SCHEDULED: 'Scheduled',
  IN_PROGRESS: 'In Progress',
  READY: 'Ready',
  PUBLISHED: 'Published',
  CANCELLED: 'Cancelled',
};

export const COMM_CHANNEL_LABELS: Record<string, string> = {
  INSTAGRAM: 'Instagram',
  WHATSAPP: 'WhatsApp',
  LINKEDIN: 'LinkedIn',
  DISCORD: 'Discord',
  EMAIL: 'Email',
  POSTER: 'Poster',
  TIKTOK: 'TikTok',
  TWITTER: 'Twitter/X',
  FACEBOOK: 'Facebook',
  ANNOUNCEMENT: 'Announcement',
  WEBSITE: 'Website',
};

export const COMM_CHANNEL_COLORS: Record<string, string> = {
  INSTAGRAM: '#E1306C',
  WHATSAPP: '#25D366',
  LINKEDIN: '#0A66C2',
  DISCORD: '#5865F2',
  EMAIL: '#06B6D4',
  POSTER: '#A855F7',
  TIKTOK: '#FF0050',
  TWITTER: '#1DA1F2',
  FACEBOOK: '#1877F2',
  ANNOUNCEMENT: '#EA580C',
  WEBSITE: '#64748B',
};

export const PHASE_LABELS: Record<CommPhase, string> = {
  BEFORE: 'Before Event',
  DURING: 'During Event',
  AFTER: 'After Event',
};

export const DEPT_ICON_MAP: Record<string, string> = {
  Code2: 'dev',
  Megaphone: 'comm',
  Palette: 'design',
  PackageCheck: 'logistics',
  BookOpen: 'relations',
  Briefcase: 'ops',
};

// Utility helpers
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDatetime(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function getDeadlineUrgency(deadline: string, status: string): 'overdue' | 'today' | 'soon' | 'upcoming' | 'done' {
  if (status === 'COMPLETED' || status === 'CANCELLED') return 'done';
  const today = new Date().toISOString().split('T')[0];
  if (deadline < today) return 'overdue';
  if (deadline === today) return 'today';
  const daysOut = Math.ceil((new Date(deadline).getTime() - new Date().getTime()) / 86400000);
  if (daysOut <= 3) return 'soon';
  return 'upcoming';
}

export function getDeadlineLabel(urgency: ReturnType<typeof getDeadlineUrgency>): string {
  const map = { overdue: 'Overdue', today: 'Due today', soon: 'Due soon', upcoming: 'Upcoming', done: 'Done' };
  return map[urgency];
}

export function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

export function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function truncate(str: string, max = 60): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + '…';
}
