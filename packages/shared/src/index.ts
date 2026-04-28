export enum Role {
  ADMIN = 'ADMIN',
  PM = 'PM',
  MEMBER = 'MEMBER',
}

export enum Position {
  DESIGNER = 'DESIGNER',
  DEV = 'DEV',
  ARTIST = 'ARTIST',
}

export const POSITION_ORDER: Record<string, number> = {
  DESIGNER: 0,
  DEV: 1,
  ARTIST: 2,
};

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export interface UserDto {
  id: string;
  email: string;
  ssoEmail?: string | null;
  name: string;
  role: Role;
  position: string;
  createdAt: string;
}

export interface ProjectDto {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
}

export enum MilestoneType {
  BUILD = 'BUILD',
  REVIEW = 'REVIEW',
  SENDOUT = 'SENDOUT',
  LIVE = 'LIVE',
}

export interface BuildMilestoneDto {
  id: string;
  name: string;
  date: string;
  type: MilestoneType;
  buildId: string;
}

export interface BuildAssigneeDto {
  id: string;
  buildId: string;
  userId: string;
  user?: UserDto;
}

export interface BuildDto {
  id: string;
  name: string;
  projectId: string;
  month: number;
  year: number;
  startDate: string | null;
  liveDate: string | null;
  endDate: string | null;
  createdAt: string;
  milestones?: BuildMilestoneDto[];
  assignees?: BuildAssigneeDto[];
}

export interface TaskDto {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  startDate: string;
  endDate: string;
  completedAt: string | null;
  order: number;
  week: number;
  buildId: string;
  build?: BuildDto;
  assigneeId: string;
  assignee?: UserDto;
  createdById: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeekGroup {
  week: number;
  startDate: string;
  endDate: string;
  members: MemberGroup[];
}

export interface MemberGroup {
  user: UserDto;
  tasks: TaskDto[];
}
