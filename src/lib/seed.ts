import {
  DEFAULT_PREFERENCES, DEFAULT_STATUS_SEED, DEFAULT_THEME, DEFAULT_UI_COLORS, ME_ID, SEED_COUNTS,
} from './constants';
import { plus, todayISO } from './date';
import type {
  AppState, Department, FollowUp, Member, Preferences, Project, Recipient, Status, Task,
} from './types';
import { clone, shuffledPalette, uid } from './utils';

/**
 * The starter workspace is deliberately generic — Department 1, Member 1,
 * Project 1 — so the board can be renamed into whatever the user runs.
 */
export function freshState(): AppState {
  const departments: Department[] = Array.from(
    { length: SEED_COUNTS.departments },
    (_, i): Department => ({ id: uid(), name: `Department ${i + 1}` }),
  );

  const memberCount = SEED_COUNTS.departments * SEED_COUNTS.membersPerDepartment;
  const memberColors = shuffledPalette(memberCount);
  const members: Member[] = Array.from({ length: memberCount }, (_, i): Member => ({
    id: uid(),
    name: `Member ${i + 1}`,
    color: memberColors[i],
    department: departments[Math.floor(i / SEED_COUNTS.membersPerDepartment)].id,
  }));

  const statuses: Status[] = DEFAULT_STATUS_SEED.map((s): Status => ({ id: uid(), ...s }));

  const recipients: Recipient[] = Array.from(
    { length: SEED_COUNTS.recipients },
    (_, i): Recipient => ({ id: uid(), name: `Recipient ${i + 1}` }),
  );

  const projectColors = shuffledPalette(SEED_COUNTS.projects);
  const projects: Project[] = Array.from({ length: SEED_COUNTS.projects }, (_, p): Project => ({
    id: uid(),
    name: `Project ${p + 1}`,
    owner: '',
    status: statuses[p % statuses.length].id,
    notes: '',
    open: p === 0,
    color: projectColors[p],
    tasks: Array.from({ length: SEED_COUNTS.tasksPerProject }, (_, t): Task => ({
      id: uid(),
      text: `Task ${t + 1}`,
      done: false,
      // A spread of states so every part of the board has something to show.
      due: t === 0 ? plus(2 + p) : t === 1 ? plus(9 + p) : null,
      assignee: t === 0 ? members[p % members.length].id : t === 2 ? ME_ID : '',
      lowVolume: t === 2,
      subtasks: Array.from({ length: SEED_COUNTS.subtasksPerTask }, (_, sub): Task => ({
        id: uid(),
        text: `Subtask ${sub + 1}`,
        done: false,
        due: null,
        assignee: '',
        lowVolume: false,
        subtasks: [],
      })),
    })),
  }));

  const adminQueue: FollowUp[] = Array.from(
    { length: SEED_COUNTS.followUps },
    (_, i): FollowUp => ({
      id: uid(),
      question: `Follow-up ${i + 1}`,
      project: i === 0 ? projects[0].name : '',
      status: 'Pending',
      answer: '',
      recipient: recipients[i % recipients.length]?.id ?? '',
      added: todayISO(),
    }),
  );

  return {
    members,
    departments,
    statuses,
    recipients,
    uiColors: { ...DEFAULT_UI_COLORS },
    prefs: clone(DEFAULT_PREFERENCES),
    generalTasks: [],
    trash: [],
    projects,
    adminQueue,
  };
}

/** Fills in anything a stored workspace predates, so old saves keep loading. */
function migratePreferences(input: unknown): Preferences {
  const base = clone(DEFAULT_PREFERENCES);
  if (!input || typeof input !== 'object') return base;
  const p = input as Partial<Preferences>;

  return {
    labels: p.labels && typeof p.labels === 'object' ? { ...p.labels } : base.labels,
    theme: { ...DEFAULT_THEME, ...(p.theme && typeof p.theme === 'object' ? p.theme : {}) },
    splits: p.splits && typeof p.splits === 'object' ? { ...p.splits } : base.splits,
    hidden: p.hidden && typeof p.hidden === 'object' ? { ...p.hidden } : base.hidden,
    density: p.density === 'compact' ? 'compact' : 'comfortable',
    showTasksWithoutDue: p.showTasksWithoutDue === true,
    showCompletedInDue: p.showCompletedInDue === true,
    showLowVolumeInDue: p.showLowVolumeInDue === true,
    showCompletedTasks: p.showCompletedTasks === true,
    showSubtasksOnDashboard: p.showSubtasksOnDashboard !== false,
    projectsView: p.projectsView === 'list' ? 'list' : 'kanban',
    kanbanColumns: clampColumns(p.kanbanColumns),
    projectStripes: p.projectStripes !== false,
  };
}

function clampColumns(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_PREFERENCES.kanbanColumns;
  return Math.min(4, Math.max(1, Math.round(n)));
}

/** Brings one task record up to date, subtasks included. */
function migrateTask(t: Task, convertAssignee: (val: unknown) => string, depth = 0): void {
  t.assignee = convertAssignee(t.assignee);
  if (t.due === undefined) t.due = null;
  t.lowVolume = t.lowVolume === true;
  if (!Array.isArray(t.subtasks)) t.subtasks = [];
  // Only one level of nesting is supported; anything deeper is flattened away.
  if (depth >= 1) {
    t.subtasks = [];
    return;
  }
  t.subtasks.forEach((sub) => migrateTask(sub, convertAssignee, depth + 1));
}

export function migrate(input: unknown): AppState {
  if (!input || typeof input !== 'object') return freshState();
  const s = input as Partial<AppState> & { members?: unknown };

  if (!s.departments) s.departments = [];
  if (!s.statuses || s.statuses.length === 0) {
    s.statuses = DEFAULT_STATUS_SEED.map((st): Status => ({ id: uid(), ...st }));
  }
  if (!s.uiColors) s.uiColors = { ...DEFAULT_UI_COLORS };
  if (!s.trash) s.trash = [];
  if (!s.generalTasks) s.generalTasks = [];
  if (!s.adminQueue) s.adminQueue = [];
  if (!s.projects) s.projects = [];
  if (!s.members) s.members = [];
  if (!s.recipients) s.recipients = [];

  // Members used to be stored as a plain array of names.
  const legacyNames = s.members as unknown[];
  if (legacyNames.length && typeof legacyNames[0] === 'string') {
    const names = legacyNames as string[];
    const colors = shuffledPalette(names.length);
    s.members = names.map((name, i) => ({
      id: uid(),
      name,
      color: colors[i % colors.length],
      department: s.departments?.[0]?.id ?? null,
    }));
  }

  const state = s as AppState;
  state.prefs = migratePreferences((s as { prefs?: unknown }).prefs);
  state.adminQueue.forEach((q) => { if (q.recipient === undefined) q.recipient = ''; });

  const nameToId: Record<string, string> = {};
  state.members.forEach((m) => { nameToId[m.name.toLowerCase()] = m.id; });

  const convertAssignee = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '';
    if (val === ME_ID || val === 'Myself') return ME_ID;
    if (state.members.some((m) => m.id === val)) return val as string;
    return nameToId[String(val).toLowerCase()] || '';
  };

  const projectColors = shuffledPalette(Math.max(1, state.projects.length));
  state.projects.forEach((p, i) => {
    if (!p.tasks) p.tasks = [];
    if (p.open === undefined) p.open = false;
    if (!p.color) p.color = projectColors[i % projectColors.length];
    if (p.owner === undefined) p.owner = '';
    if (p.notes === undefined) p.notes = '';
    p.tasks.forEach((t) => migrateTask(t, convertAssignee));
    if (!p.status || !state.statuses.some((st) => st.id === p.status)) {
      const match = state.statuses.find(
        (st) => st.name.toLowerCase() === String(p.status || '').toLowerCase(),
      );
      p.status = match ? match.id : state.statuses[0].id;
    }
  });
  state.generalTasks.forEach((t) => migrateTask(t, convertAssignee));

  return state;
}
