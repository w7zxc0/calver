import { todayISO } from './date';
import type { AppState, FollowUp, Member, Project, Recipient, Task, TrashItem } from './types';
import { clone, uid } from './utils';

type TrashPayload =
  | { type: 'project'; payload: Project; extra?: null }
  | { type: 'task'; payload: Task; extra?: { projectId: string | null } | null }
  | { type: 'adminQueue'; payload: FollowUp; extra?: null }
  | { type: 'member'; payload: Member; extra?: null }
  | { type: 'recipient'; payload: Recipient; extra?: null };

/** Everything deleted goes to the trash first so it can be brought back. */
export function trashPush(state: AppState, entry: TrashPayload): void {
  state.trash.push({
    id: uid(),
    type: entry.type,
    payload: clone(entry.payload),
    extra: entry.extra ?? null,
    deletedAt: todayISO(),
  } as TrashItem);
}

export function restoreTrashItem(state: AppState, id: string): void {
  const item = state.trash.find((x) => x.id === id);
  if (!item) return;

  if (item.type === 'project') {
    state.projects.push(item.payload);
  } else if (item.type === 'task') {
    const pid = item.extra?.projectId;
    const p = pid ? state.projects.find((x) => x.id === pid) : undefined;
    if (p) p.tasks.push(item.payload);
    else state.generalTasks.push(item.payload);
  } else if (item.type === 'adminQueue') {
    state.adminQueue.push(item.payload);
  } else if (item.type === 'member') {
    if (!state.departments.some((d) => d.id === item.payload.department)) {
      item.payload.department = state.departments[0] ? state.departments[0].id : null;
    }
    state.members.push(item.payload);
  } else if (item.type === 'recipient') {
    state.recipients.push(item.payload);
  }

  state.trash = state.trash.filter((x) => x.id !== id);
}

export function reassignAwayFromMember(state: AppState, id: string): void {
  state.projects.forEach((p) => p.tasks.forEach((t) => { if (t.assignee === id) t.assignee = ''; }));
  state.generalTasks.forEach((t) => { if (t.assignee === id) t.assignee = ''; });
}

export function reassignAwayFromRecipient(state: AppState, id: string): void {
  state.adminQueue.forEach((q) => { if (q.recipient === id) q.recipient = ''; });
}

/** Swap two neighbouring entries in a list, used by the ↑/↓ reorder buttons. */
export function moveInList<T>(list: T[], index: number, delta: number): void {
  const target = index + delta;
  if (index < 0 || target < 0 || target >= list.length) return;
  [list[index], list[target]] = [list[target], list[index]];
}
