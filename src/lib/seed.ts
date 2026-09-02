import {
  DEFAULT_DEPARTMENTS, DEFAULT_MEMBERS, DEFAULT_RECIPIENT_NAMES, DEFAULT_STATUSES,
  DEFAULT_UI_COLORS, DEPT_IDS, ME_ID, NAME_TO_DEPT,
} from './constants';
import { plus, thisThursday, todayISO } from './date';
import type { AppState, Member, Recipient } from './types';
import { clone, shuffledPalette, uid } from './utils';

export function buildDefaultMembers(): Member[] {
  const names = DEFAULT_MEMBERS.slice();
  if (!names.some((n) => n.toLowerCase() === 'maryam f.')) names.push('Maryam F.');
  const colors = shuffledPalette(names.length);
  const members: Member[] = names.map((name, i) => ({
    id: uid(),
    name,
    color: colors[i % colors.length],
    department: NAME_TO_DEPT[name.toLowerCase()] || DEPT_IDS.house,
  }));
  members.sort((a, b) => a.name.localeCompare(b.name));
  return members;
}

export function buildDefaultRecipients(members: Member[] | undefined): Recipient[] {
  const names = DEFAULT_RECIPIENT_NAMES.concat((members || []).map((m) => m.name));
  return names.map((name) => ({ id: uid(), name }));
}

export function freshState(): AppState {
  const members = buildDefaultMembers();
  return {
    members,
    departments: clone(DEFAULT_DEPARTMENTS),
    statuses: clone(DEFAULT_STATUSES),
    recipients: buildDefaultRecipients(members),
    uiColors: { ...DEFAULT_UI_COLORS },
    generalTasks: [],
    trash: [],
    projects: [
      {
        id: uid(), name: 'NixLink WiFi Program', owner: 'Usman', status: 'st_active',
        notes: 'Operational plan complete. Document all sponsorship-route options and justify the chosen route before submission.',
        open: true,
        tasks: [
          { id: uid(), text: '6-month consumer strength projection', done: false, due: plus(10), assignee: '' },
          { id: uid(), text: 'Budget plan built from projection figures', done: false, due: plus(14), assignee: '' },
          { id: uid(), text: 'Sponsorship proposal — document all potential routes', done: false, due: plus(18), assignee: '' },
          { id: uid(), text: 'Justify chosen sponsorship route', done: false, due: plus(18), assignee: ME_ID },
        ],
      },
      {
        id: uid(), name: 'Nixor Tribute — Ops Plan', owner: 'Usman', status: 'st_planning',
        notes: 'Future event. Just need the ops plan ready ahead of the event.', open: true,
        tasks: [{ id: uid(), text: 'Draft full ops plan', done: false, due: plus(28), assignee: ME_ID }],
      },
      {
        id: uid(), name: 'Rest-of-Year Ops Plans', owner: 'Usman', status: 'st_planning',
        notes: 'All remaining event ops plans for the year, batched together.', open: true,
        tasks: [{ id: uid(), text: 'Draft ops plans for all remaining events', done: false, due: '2026-09-30', assignee: ME_ID }],
      },
      {
        id: uid(), name: 'Campus Upgrade Ops Plans (x6)', owner: 'Usman', status: 'st_active',
        notes: 'Six separate ops plans, all due together.', open: true,
        tasks: [1, 2, 3, 4, 5, 6].map((n) => ({
          id: uid(), text: `Upgrade ops plan ${n}`, done: false, due: thisThursday(), assignee: '',
        })),
      },
      {
        id: uid(), name: 'Urdu Wall Painting', owner: 'Usman', status: 'st_active',
        notes: 'Budget plan for the painter.', open: true,
        tasks: [{ id: uid(), text: 'Build painter budget plan', done: false, due: null, assignee: ME_ID }],
      },
    ],
    adminQueue: [
      {
        id: uid(), question: 'Can the painter bring his own equipment, or do we need to arrange it?',
        project: 'Urdu Wall Painting', status: 'Pending', answer: '', recipient: '', added: todayISO(),
      },
      {
        id: uid(), question: 'What figures should go into the sponsorship proposal?',
        project: 'NixLink WiFi Program', status: 'Pending', answer: '', recipient: '', added: todayISO(),
      },
    ],
  };
}

/**
 * Brings any previously stored shape up to the current one: fills in fields
 * added later, converts the old string-array member list into member records,
 * and rewrites assignees/statuses that were stored as names into ids.
 */
export function migrate(input: unknown): AppState {
  if (!input || typeof input !== 'object') return freshState();
  const s = input as Partial<AppState> & { members?: unknown };

  if (!s.departments) s.departments = clone(DEFAULT_DEPARTMENTS);
  if (!s.statuses) s.statuses = clone(DEFAULT_STATUSES);
  if (!s.uiColors) s.uiColors = { ...DEFAULT_UI_COLORS };
  if (!s.trash) s.trash = [];
  if (!s.generalTasks) s.generalTasks = [];
  if (!s.adminQueue) s.adminQueue = [];
  if (!s.projects) s.projects = [];
  if (!s.members) s.members = [];

  const legacyNames = s.members as unknown[];
  if (legacyNames.length && typeof legacyNames[0] === 'string') {
    const names = (legacyNames as string[]).slice();
    if (!names.some((n) => n.toLowerCase() === 'maryam f.')) names.push('Maryam F.');
    const colors = shuffledPalette(names.length);
    s.members = names.map((name, i) => ({
      id: uid(),
      name,
      color: colors[i % colors.length],
      department: NAME_TO_DEPT[name.toLowerCase()] || DEPT_IDS.house,
    }));
  }

  const state = s as AppState;
  if (!state.recipients) state.recipients = buildDefaultRecipients(state.members);
  state.adminQueue.forEach((q) => { if (q.recipient === undefined) q.recipient = ''; });
  state.members.sort((a, b) => a.name.localeCompare(b.name));

  const nameToId: Record<string, string> = {};
  state.members.forEach((m) => { nameToId[m.name.toLowerCase()] = m.id; });

  const convertAssignee = (val: unknown): string => {
    if (val === undefined || val === null || val === '') return '';
    if (val === ME_ID || val === 'Myself') return ME_ID;
    if (state.members.some((m) => m.id === val)) return val as string;
    return nameToId[String(val).toLowerCase()] || '';
  };

  state.projects.forEach((p) => {
    if (!p.tasks) p.tasks = [];
    if (p.open === undefined) p.open = false;
    p.tasks.forEach((t) => {
      t.assignee = convertAssignee(t.assignee);
      if (t.due === undefined) t.due = null;
    });
    if (!p.status || !state.statuses.some((st) => st.id === p.status)) {
      const match = state.statuses.find(
        (st) => st.name.toLowerCase() === String(p.status || '').toLowerCase(),
      );
      p.status = match ? match.id : state.statuses[0].id;
    }
  });
  state.generalTasks.forEach((t) => { t.assignee = convertAssignee(t.assignee); });

  return state;
}
