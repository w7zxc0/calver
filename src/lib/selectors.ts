import { ME_ID } from './constants';
import { daysUntil } from './date';
import type { AppState, FlatTask, Member, Status, Task, TrashItem } from './types';

export function getMember(state: AppState, id: string | null | undefined): Member | null {
  if (id === ME_ID) return { id: ME_ID, name: 'Myself', color: '', department: null };
  if (!id) return null;
  return state.members.find((m) => m.id === id) || null;
}

export function getStatus(state: AppState, id: string): Status | undefined {
  return state.statuses.find((s) => s.id === id);
}

/** Members grouped by department, plus any whose department no longer exists. */
export function membersByDepartment(state: AppState) {
  const known = new Set(state.departments.map((d) => d.id));
  const byName = (a: Member, b: Member) => a.name.localeCompare(b.name);
  return {
    groups: state.departments.map((dept) => ({
      dept,
      members: state.members.filter((m) => m.department === dept.id).sort(byName),
    })),
    orphans: state.members.filter((m) => !known.has(m.department ?? '')).sort(byName),
  };
}

/** Project tasks and general tasks in one list, each tagged with a lookup ref. */
export function allTasksFlat(state: AppState): FlatTask[] {
  const out: FlatTask[] = [];
  state.projects.forEach((p) => {
    p.tasks.forEach((t) => {
      out.push({
        ref: `p:${p.id}:${t.id}`,
        text: t.text, done: t.done, due: t.due, assignee: t.assignee, projectName: p.name,
      });
    });
  });
  state.generalTasks.forEach((t) => {
    out.push({
      ref: `g:${t.id}`,
      text: t.text, done: t.done, due: t.due, assignee: t.assignee, projectName: null,
    });
  });
  return out;
}

export interface TaskHandle {
  task: Task;
  projectId: string | null;
  remove: () => void;
}

/** Resolve a `p:<projectId>:<taskId>` or `g:<taskId>` ref against a state object. */
export function findTaskByRef(state: AppState, ref: string): TaskHandle | null {
  if (ref.startsWith('p:')) {
    const [, pid, tid] = ref.split(':');
    const p = state.projects.find((x) => x.id === pid);
    const t = p?.tasks.find((x) => x.id === tid);
    if (!p || !t) return null;
    return { task: t, projectId: pid, remove: () => { p.tasks = p.tasks.filter((x) => x.id !== tid); } };
  }
  const tid = ref.split(':')[1];
  const t = state.generalTasks.find((x) => x.id === tid);
  if (!t) return null;
  return {
    task: t,
    projectId: null,
    remove: () => { state.generalTasks = state.generalTasks.filter((x) => x.id !== tid); },
  };
}

export interface DashboardStats {
  activeProjects: number;
  overdue: number;
  unassigned: number;
  pendingFollowups: number;
  total: number;
  completed: number;
}

export function dashboardStats(state: AppState): DashboardStats {
  const all = allTasksFlat(state);
  const open = all.filter((t) => !t.done);
  return {
    activeProjects: state.projects.filter((p) => {
      const st = getStatus(state, p.status);
      return st && !st.terminal;
    }).length,
    overdue: open.filter((t) => t.due && (daysUntil(t.due) as number) < 0).length,
    unassigned: open.filter((t) => !t.assignee).length,
    pendingFollowups: state.adminQueue.filter((q) => q.status !== 'Answered').length,
    total: all.length,
    completed: all.filter((t) => t.done).length,
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

export function trashTypeLabel(type: TrashItem['type']): string {
  return {
    project: 'Project', task: 'Task', adminQueue: 'Follow-up',
    member: 'Team member', recipient: 'Recipient',
  }[type] || type;
}
