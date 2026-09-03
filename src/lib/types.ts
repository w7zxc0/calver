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
  /** Tagged as small, routine work; collected in its own dashboard window. */
  lowVolume: boolean;
  /** One level deep only: project -> task -> subtask. */
  subtasks: Task[];
}

export interface Project {
  id: ID;
  name: string;
  owner: string;
  status: ID;
  notes: string;
  open: boolean;
  /** Accent colour that makes the card distinguishable at a glance. */
  color: string;
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

/** Every colour the interface paints itself with, all user-editable. */
export interface Theme {
  paper: string;
  panel: string;
  panelRaised: string;
  ink: string;
  inkSoft: string;
  inkFaint: string;
  line: string;
  accent: string;
}

export type Density = 'comfortable' | 'compact';

export interface Preferences {
  /** Overrides for any label key; anything missing falls back to the default. */
  labels: Record<string, string>;
  theme: Theme;
  /** Left-pane width as a 0-1 ratio, keyed by split id. */
  splits: Record<string, number>;
  /** Keyed by panel or stat id; true means hidden. */
  hidden: Record<string, boolean>;
  density: Density;
  /** Whether the due window also lists tasks that have no due date. */
  showTasksWithoutDue: boolean;
  /** Whether completed tasks stay visible in the due window. */
  showCompletedInDue: boolean;
  /** Whether low-volume tasks also appear in the due window. */
  showLowVolumeInDue: boolean;
  /** Completed tasks are folded away on project cards until asked for. */
  showCompletedTasks: boolean;
  /** Subtasks are listed on the dashboard alongside their parents. */
  showSubtasksOnDashboard: boolean;
  projectsView: 'kanban' | 'list';
  /** Project cards per row in the kanban view. */
  kanbanColumns: number;
  /** Show the coloured stripe that separates one project card from the next. */
  projectStripes: boolean;
}

export interface AppState {
  members: Member[];
  departments: Department[];
  statuses: Status[];
  recipients: Recipient[];
  uiColors: UiColors;
  prefs: Preferences;
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
  projectColor: string | null;
  lowVolume: boolean;
  /** Set on subtasks, naming the task they sit under. */
  parentText: string | null;
}

export type ViewId = 'dashboard' | 'projects' | 'manage';

export type ManageSection = 'people' | 'workflow' | 'appearance' | 'labels' | 'layout' | 'data';
