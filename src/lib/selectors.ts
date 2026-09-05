import { ME_ID } from './constants';
import { daysUntil } from './date';
import type { AppState, FlatTask, Member, Status, Task, TaskGrouping, TrashItem } from './types';

export function getMember(
  state: AppState,
  id: string | null | undefined,
  myselfLabel = 'Myself',
): Member | null {
  if (id === ME_ID) return { id: ME_ID, name: myselfLabel, color: '', department: null };
  if (!id) return null;
  return state.members.find((m) => m.id === id) || null;
}

export function getStatus(state: AppState, id: string): Status | undefined {
  return state.statuses.find((s) => s.id === id);
}

export function getProject(state: AppState, id: string) {
  return state.projects.find((p) => p.id === id);
}

/**
 * Members grouped by department, plus any whose department no longer exists.
 * Stored order is kept so the reorder actions in Manage actually stick.
 */
export function membersByDepartment(state: AppState) {
  const known = new Set(state.departments.map((d) => d.id));
  return {
    groups: state.departments.map((dept) => ({
      dept,
      members: state.members.filter((m) => m.department === dept.id),
    })),
    orphans: state.members.filter((m) => !known.has(m.department ?? '')),
  };
}

/** Subtasks are optional on older records, so always read them through this. */
export function subtasksOf(task: Task): Task[] {
  return Array.isArray(task.subtasks) ? task.subtasks : [];
}

/**
 * Project tasks, their subtasks, and general tasks in one list, each tagged
 * with a lookup ref. Subtasks appear as rows of their own so the dashboard can
 * treat them exactly like tasks.
 */
export function allTasksFlat(state: AppState, includeSubtasks = true): FlatTask[] {
  const out: FlatTask[] = [];

  const push = (
    task: Task,
    ref: string,
    projectName: string | null,
    projectColor: string | null,
    statusId: string | null,
    parentText: string | null,
  ) => {
    out.push({
      ref,
      text: task.text,
      done: task.done,
      due: task.due,
      assignee: task.assignee,
      lowVolume: task.lowVolume === true,
      projectName,
      projectColor,
      statusId,
      parentText,
    });
  };

  state.projects.forEach((p) => {
    p.tasks.forEach((t) => {
      push(t, `p:${p.id}:${t.id}`, p.name, p.color, p.status || null, null);
      if (!includeSubtasks) return;
      subtasksOf(t).forEach((sub) => {
        push(sub, `p:${p.id}:${t.id}:${sub.id}`, p.name, p.color, p.status || null, t.text);
      });
    });
  });

  state.generalTasks.forEach((t) => {
    push(t, `g:${t.id}`, null, null, null, null);
    if (!includeSubtasks) return;
    subtasksOf(t).forEach((sub) => {
      push(sub, `g:${t.id}:${sub.id}`, null, null, null, t.text);
    });
  });

  return out;
}

export interface TaskHandle {
  task: Task;
  projectId: string | null;
  /** Set when the ref points at a subtask. */
  parentId: string | null;
  remove: () => void;
}

/**
 * Resolve a task ref against a state object. Four shapes are understood:
 * `p:<project>:<task>`, `p:<project>:<task>:<subtask>`, `g:<task>` and
 * `g:<task>:<subtask>`.
 */
export function findTaskByRef(state: AppState, ref: string): TaskHandle | null {
  const parts = ref.split(':');

  if (parts[0] === 'p') {
    const [, pid, tid, sid] = parts;
    const p = state.projects.find((x) => x.id === pid);
    const t = p?.tasks.find((x) => x.id === tid);
    if (!p || !t) return null;
    if (sid) return subtaskHandle(t, sid, pid);
    return {
      task: t,
      projectId: pid,
      parentId: null,
      remove: () => { p.tasks = p.tasks.filter((x) => x.id !== tid); },
    };
  }

  const [, tid, sid] = parts;
  const t = state.generalTasks.find((x) => x.id === tid);
  if (!t) return null;
  if (sid) return subtaskHandle(t, sid, null);
  return {
    task: t,
    projectId: null,
    parentId: null,
    remove: () => { state.generalTasks = state.generalTasks.filter((x) => x.id !== tid); },
  };
}

function subtaskHandle(parent: Task, subId: string, projectId: string | null): TaskHandle | null {
  const sub = subtasksOf(parent).find((x) => x.id === subId);
  if (!sub) return null;
  return {
    task: sub,
    projectId,
    parentId: parent.id,
    remove: () => { parent.subtasks = subtasksOf(parent).filter((x) => x.id !== subId); },
  };
}

export interface DashboardStats {
  activeProjects: number;
  overdue: number;
  unassigned: number;
}

/**
 * The three board-wide numbers. Counts that describe one window — how many
 * tasks or follow-ups are listed — live on that window's own header instead.
 */
export function dashboardStats(state: AppState): DashboardStats {
  const open = allTasksFlat(state).filter((t) => !t.done);
  return {
    activeProjects: state.projects.filter((p) => {
      const st = getStatus(state, p.status);
      return st && !st.terminal;
    }).length,
    overdue: open.filter((t) => t.due && (daysUntil(t.due) as number) < 0).length,
    unassigned: open.filter((t) => !t.assignee).length,
  };
}

/** Assigned count per person — every listed task, done or not. */
export function workloadRows(state: AppState): { id: string; count: number }[] {
  const counts: Record<string, number> = {};
  allTasksFlat(state).forEach((t) => {
    if (!t.assignee) return;
    counts[t.assignee] = (counts[t.assignee] || 0) + 1;
  });
  return Object.keys(counts)
    .map((id) => ({ id, count: counts[id] }))
    .sort((a, b) => b.count - a.count);
}

/** Task and subtask totals for one project, used on the cards and overview. */
export function projectProgress(project: { tasks: Task[] }) {
  let total = 0;
  let done = 0;
  project.tasks.forEach((t) => {
    total += 1;
    if (t.done) done += 1;
    subtasksOf(t).forEach((sub) => {
      total += 1;
      if (sub.done) done += 1;
    });
  });
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}

export function trashLabel(item: TrashItem): string {
  switch (item.type) {
    case 'project': return item.payload.name;
    case 'task': return item.payload.text;
    case 'adminQueue': return item.payload.question;
    case 'member': return item.payload.name;
    case 'recipient': return item.payload.name;
    default: return 'Item';
  }
}

export function trashTypeLabel(item: TrashItem, label: (key: string) => string): string {
  switch (item.type) {
    case 'project': return label('term.project');
    case 'task': return label('term.task');
    case 'adminQueue': return label('term.followUp');
    case 'member': return label('term.member');
    case 'recipient': return label('term.recipient');
    default: return 'Item';
  }
}

/** One heading plus the tasks under it, for a grouped task window. */
export interface TaskBucket {
  key: string;
  name: string;
  /** Null leaves the heading in the muted default colour. */
  color: string | null;
  items: FlatTask[];
}

export interface GroupingLabels {
  myself: string;
  unassigned: string;
  status: string;
}

/**
 * Splits a task list into buckets. Statuses and members keep their configured
 * order so the headings match the rest of the board, and the catch-all bucket
 * (no status, or nobody assigned) always comes last. Empty buckets are dropped.
 */
export function groupTasks(
  state: AppState,
  tasks: FlatTask[],
  mode: TaskGrouping,
  labels: GroupingLabels,
): TaskBucket[] {
  if (mode === 'none') return [{ key: 'all', name: '', color: null, items: tasks }];

  const buckets: TaskBucket[] = [];
  const index = new Map<string, number>();

  const bucket = (key: string, name: string, color: string | null): TaskBucket => {
    const at = index.get(key);
    if (at !== undefined) return buckets[at];
    index.set(key, buckets.length);
    const created: TaskBucket = { key, name, color, items: [] };
    buckets.push(created);
    return created;
  };

  if (mode === 'status') {
    state.statuses.forEach((s) => bucket(s.id, s.name, s.color));
    bucket('__none__', `No ${labels.status.toLowerCase()}`, null);
    tasks.forEach((t) => {
      const target = t.statusId && index.has(t.statusId) ? t.statusId : '__none__';
      bucket(target, '', null).items.push(t);
    });
  } else {
    bucket(ME_ID, labels.myself, null);
    state.members.forEach((m) => bucket(m.id, m.name, m.color));
    bucket('__none__', labels.unassigned, null);
    tasks.forEach((t) => {
      const target = t.assignee && index.has(t.assignee) ? t.assignee : '__none__';
      bucket(target, '', null).items.push(t);
    });
  }

  return buckets.filter((b) => b.items.length > 0);
}
