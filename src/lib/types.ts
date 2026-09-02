export type ID = string;

export interface Member {
  id: ID;
  name: string;
  color: string;
  department: ID | null;
}

export interface Department {
  id: ID;
  name: string;
}

export interface Status {
  id: ID;
  name: string;
  color: string;
  terminal: boolean;
}

export interface Recipient {
  id: ID;
  name: string;
}

/** '' = unassigned, ME_ID = myself, otherwise a Member id. */
export type AssigneeId = string;

export interface Task {
  id: ID;
  text: string;
  done: boolean;
  due: string | null;
  assignee: AssigneeId;
}

export interface Project {
  id: ID;
  name: string;
  owner: string;
  status: ID;
  notes: string;
  open: boolean;
  tasks: Task[];
}

export const FOLLOW_UP_STATUSES = ['Pending', 'Asked', 'Answered'] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export interface FollowUp {
  id: ID;
  question: string;
  /** Project name at the time it was raised, or '' for general. */
  project: string;
  status: FollowUpStatus;
  answer: string;
  recipient: string;
  added: string;
}

export type TrashItem =
  | { id: ID; type: 'project'; payload: Project; extra: null; deletedAt: string }
  | { id: ID; type: 'task'; payload: Task; extra: { projectId: ID | null } | null; deletedAt: string }
  | { id: ID; type: 'adminQueue'; payload: FollowUp; extra: null; deletedAt: string }
  | { id: ID; type: 'member'; payload: Member; extra: null; deletedAt: string }
  | { id: ID; type: 'recipient'; payload: Recipient; extra: null; deletedAt: string };

export interface UiColors {
  project: string;
  general: string;
}

export interface AppState {
  members: Member[];
  departments: Department[];
  statuses: Status[];
  recipients: Recipient[];
  uiColors: UiColors;
  generalTasks: Task[];
  trash: TrashItem[];
  projects: Project[];
  adminQueue: FollowUp[];
}

/** A task from any source, flattened for the dashboard lists. */
export interface FlatTask {
  ref: string;
  text: string;
  done: boolean;
  due: string | null;
  assignee: AssigneeId;
  projectName: string | null;
}

export type ViewId = 'dashboard' | 'projects' | 'manage';
