export type UserRole = 'COORDINATOR' | 'DEPARTMENT_LEADER' | 'MEMBER' | 'MANAGER';

export interface VisibilitySettings {
  showAllDepartments: boolean;
  showRadar: boolean;
  showWorkload: boolean;
  showDeadlines: boolean;
  showReports: boolean;
  showMeetings: boolean;
  showBudget: boolean;
  allowedTabs: string[];
}
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'REVIEW' | 'COMPLETED' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type EventType = 'WORKSHOP' | 'HACKATHON' | 'MEETUP' | 'COMPETITION' | 'CONFERENCE';
export type EventStatus = 'PLANNED' | 'ACTIVE' | 'UPCOMING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CommChannel = 'INSTAGRAM' | 'WHATSAPP' | 'LINKEDIN' | 'DISCORD' | 'EMAIL' | 'POSTER' | 'TIKTOK';
export type CommPhase = 'BEFORE' | 'DURING' | 'AFTER';
export type CommStatus = 'PLANNED' | 'SCHEDULED' | 'IN_PROGRESS' | 'READY' | 'PUBLISHED' | 'CANCELLED';
export type NotifPriority = 'INFO' | 'WARNING' | 'URGENT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  avatarUrl: string;
  phone?: string;
  whatsapp?: string;
  position?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  socialLinks?: {
    linkedin?: string;
    github?: string;
    instagram?: string;
    discord?: string;
    facebook?: string;
    tiktok?: string;
    website?: string;
  };
  joinedDate: string;
  isActive: boolean;
  createdAt?: string;
  // Enriched
  departmentName?: string;
  departmentColor?: string;
  activeTasksCount?: number;
  completedTasksCount?: number;
  responsibilitiesCount?: number;
  ongoingResponsibilities?: string[];
  currentTask?: { id: string; title: string; deadline: string; priority: TaskPriority; status: TaskStatus } | null;
  nextDeadline?: string | null;
  isOverloaded?: boolean;
}

export interface Department {
  id: string;
  name: string;
  description: string;
  leaderId: string | null;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  // Enriched
  memberCount?: number;
  activeTasksCount?: number;
  completedTasksCount?: number;
  overdueTasksCount?: number;
  leader?: { id: string; name: string; avatarUrl: string; email: string };
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedBy?: string;
  uploadedAt?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  assignedMemberId: string | null;
  createdById: string;
  eventId: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  startDate: string;
  deadline: string;
  progressPercent: number;
  notes: string;
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
  // Enriched
  assignee?: { id: string; name: string; email: string; avatarUrl: string } | null;
  creator?: { id: string; name: string } | null;
  department?: { id: string; name: string; color: string } | null;
  event?: { id: string; name: string; date: string } | null;
  isPastDue?: boolean;
  isDueToday?: boolean;
}

export interface Responsibility {
  id: string;
  memberId: string;
  departmentId: string;
  title: string;
  description: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  eventType: EventType;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  organizerId: string;
  responsibleDepartmentId: string;
  responsibleMemberIds: string[];
  status: EventStatus;
  expectedParticipants: number;
  notes: string;
  attachments: Attachment[];
  createdAt: string;
  // Enriched
  department?: { id: string; name: string; color: string } | null;
  organizer?: { id: string; name: string; avatarUrl: string } | null;
  responsibleMembers?: Array<{ id: string; name: string; role: string; avatarUrl: string; email: string }>;
  tasksCount?: number;
  completedTasksCount?: number;
  progressPercent?: number;
}

export interface AgendaSection {
  id: string;
  eventId: string;
  title: string;
  order: number;
  description?: string;
  timing?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  responsiblePersonId?: string;
  responsiblePerson?: string;
  notes?: string;
  items?: AgendaItem[];
}

export interface AgendaItem {
  id: string;
  eventId?: string;
  sectionId?: string;
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration?: string;
  responsiblePersonId?: string;
  responsiblePerson?: string;
  location?: string;
  order: number;
  notes?: string;
}

export interface CommunicationPlan {
  id: string;
  eventId: string;
  title: string;
  targetAudience: string;
  createdAt: string;
}

export interface CommunicationItem {
  id: string;
  communicationPlanId?: string;
  eventId: string | null;
  relatedTaskId?: string | null;
  phase?: CommPhase;
  title: string;
  channel?: CommChannel;
  platform?: string;
  contentType?: 'POST' | 'STORY' | 'VIDEO' | 'REEL' | 'CAROUSEL' | 'PHOTO' | 'ANNOUNCEMENT' | 'OTHER' | string;
  content: string;
  responsiblePersonId: string;
  publicationDate: string;
  publicationTime?: string;
  status: CommStatus;
  notes: string;
  createdAt?: string;
  // Enriched
  responsible?: { id: string; name: string; avatarUrl: string } | null;
  responsiblePerson?: { id: string; name: string; avatarUrl: string } | null;
  event?: { id: string; name: string; date: string } | null;
  eventName?: string | null;
  task?: { id: string; title: string; status: string; deadline: string } | null;
  planTitle?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  departmentId: string | null;
  responsibleId: string | null;
  deadline: string;
  taskCreated: boolean;
  taskId?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  participantIds: string[];
  agenda: string;
  notes: string;
  decisions: string[];
  actionItems: ActionItem[];
  createdAt?: string;
  // Enriched
  participants?: Array<{ id: string; name: string; role: string; avatarUrl: string }>;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  priority: NotifPriority;
  isRead: boolean;
  linkUrl: string;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: string;
}

// Dashboard / Reports
export interface DashboardStats {
  totalMembers: number;
  departmentsCount: number;
  activeTasks: number;
  completedTasks: number;
  overdueTasks: number;
  upcomingEvents: number;
  tasksDueThisWeek: number;
  tasksDueToday: number;
  upcomingPublications?: number;
}

export interface RadarData {
  tasksDueTodayCount: number;
  overdueTasksCount: number;
  daysUntilNextEvent: number | null;
  pendingCommunicationCount: number;
  overloadedMembersCount: number;
}

export interface MemberWorkload {
  user: { id: string; name: string; role: string; avatarUrl: string; departmentId: string | null };
  activeTasksCount: number;
  overdueCount: number;
  isOverloaded: boolean;
}

export interface DashboardAttention {
  overdueTasks: Task[];
  tasksDueToday: Task[];
  tasksDueSoon: Task[];
  blockedTasks: Task[];
  upcomingEvents: Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    department?: { id: string; name: string; color: string } | null;
    progressPercent: number;
    tasksCount: number;
    completedTasksCount: number;
  }>;
  upcomingPublications: CommunicationItem[];
}

export interface DashboardData {
  stats: DashboardStats;
  radar?: RadarData;
  attention?: DashboardAttention;
  upcomingEvents?: Array<{
    id: string;
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    department?: { id: string; name: string; color: string } | null;
    organizer?: { id: string; name: string; avatarUrl: string } | null;
    progressPercent: number;
    tasksCount: number;
    completedTasksCount: number;
  }>;
  upcomingCommunication?: CommunicationItem[];
  nextEventPrep: {
    event: Event;
    totalTasks: number;
    completedTasks: number;
    percent: number;
    tasks: Task[];
  } | null;
  departmentBreakdown: Array<{
    id: string; name: string; color: string; icon: string;
    leader: { id: string; name: string; avatarUrl: string } | null;
    memberCount: number; activeTasksCount: number; overdueTasksCount: number;
  }>;
  overloadedMembers: MemberWorkload[];
  recentActivity: ActivityLog[];
}
