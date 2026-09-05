import type { Preferences } from './types';

/**
 * Every piece of fixed wording in the interface lives here so it can be renamed
 * from the Manage screen or from the ⋯ menu next to it.
 */
export const LABEL_GROUPS: { group: string; keys: { key: string; text: string; hint?: string }[] }[] = [
  {
    group: 'Application',
    keys: [
      { key: 'app.title', text: 'Calver - Management', hint: 'Shown in the header' },
      { key: 'tab.dashboard', text: 'Dashboard' },
      { key: 'tab.projects', text: 'Projects' },
      { key: 'tab.manage', text: 'Manage' },
      { key: 'footer.reset', text: 'Reset all data' },
    ],
  },
  {
    group: 'Dashboard',
    keys: [
      { key: 'stat.activeProjects', text: 'active projects' },
      { key: 'stat.overdue', text: 'overdue' },
      { key: 'stat.unassigned', text: 'unassigned' },
      { key: 'panel.due', text: 'Due' },
      { key: 'panel.followUp', text: 'Follow Up' },
      { key: 'panel.workload', text: 'Workload' },
      { key: 'panel.projects', text: 'Projects Overview' },
      { key: 'panel.lowVolume', text: 'Low Volume' },
    ],
  },
  {
    group: 'Wording',
    keys: [
      { key: 'term.myself', text: 'Myself', hint: 'The fixed personal assignee' },
      { key: 'term.unassigned', text: 'Unassigned' },
      { key: 'term.general', text: 'General', hint: 'Tasks with no project' },
      { key: 'term.project', text: 'Project' },
      { key: 'term.task', text: 'Task' },
      { key: 'term.subtask', text: 'Subtask' },
      { key: 'term.lowVolume', text: 'Low volume' },
      { key: 'term.member', text: 'Team member' },
      { key: 'term.department', text: 'Department' },
      { key: 'term.status', text: 'Status' },
      { key: 'term.assignee', text: 'Assignee' },
      { key: 'term.recipient', text: 'Recipient' },
      { key: 'term.followUp', text: 'Follow-up' },
    ],
  },
  {
    group: 'Actions',
    keys: [
      { key: 'action.addTask', text: 'Add task' },
      { key: 'action.addProject', text: 'Add project' },
      { key: 'action.addFollowUp', text: 'Add follow-up' },
      { key: 'placeholder.newTask', text: 'New task' },
      { key: 'placeholder.newSubtask', text: 'New subtask' },
      { key: 'placeholder.newProject', text: 'New project name' },
      { key: 'placeholder.newFollowUp', text: 'New follow-up question' },
      { key: 'placeholder.searchProjects', text: 'Search projects…' },
    ],
  },
  {
    group: 'Manage sections',
    keys: [
      { key: 'manage.people', text: 'People' },
      { key: 'manage.workflow', text: 'Workflow' },
      { key: 'manage.appearance', text: 'Appearance' },
      { key: 'manage.labels', text: 'Labels' },
      { key: 'manage.layout', text: 'Layout' },
      { key: 'manage.data', text: 'Data' },
      { key: 'block.members', text: 'Team Members' },
      { key: 'block.departments', text: 'Departments' },
      { key: 'block.statuses', text: 'Project Statuses' },
      { key: 'block.recipients', text: 'Follow-up Recipients' },
      { key: 'block.completed', text: 'Completed Tasks' },
      { key: 'block.trash', text: 'Trash' },
      { key: 'block.backup', text: 'Backup' },
    ],
  },
];

export const DEFAULT_LABELS: Record<string, string> = Object.fromEntries(
  LABEL_GROUPS.flatMap((g) => g.keys.map((k) => [k.key, k.text])),
);

export function labelOf(prefs: Preferences | undefined, key: string): string {
  const custom = prefs?.labels?.[key];
  if (typeof custom === 'string' && custom.trim() !== '') return custom;
  return DEFAULT_LABELS[key] ?? key;
}

/** Panels and stats the user can switch off from Manage → Layout. */
export const TOGGLEABLE_PARTS: { key: string; labelKey: string; where: string }[] = [
  { key: 'stat.activeProjects', labelKey: 'stat.activeProjects', where: 'Dashboard counts' },
  { key: 'stat.overdue', labelKey: 'stat.overdue', where: 'Dashboard counts' },
  { key: 'stat.unassigned', labelKey: 'stat.unassigned', where: 'Dashboard counts' },
  { key: 'panel.due', labelKey: 'panel.due', where: 'Dashboard windows' },
  { key: 'panel.followUp', labelKey: 'panel.followUp', where: 'Dashboard windows' },
  { key: 'panel.workload', labelKey: 'panel.workload', where: 'Dashboard windows' },
  { key: 'panel.projects', labelKey: 'panel.projects', where: 'Dashboard windows' },
  { key: 'panel.lowVolume', labelKey: 'panel.lowVolume', where: 'Dashboard windows' },
];

/** Split ids, used for the draggable dividers between side-by-side windows. */
export const SPLITS = {
  dashTop: 'dash.top',
  dashMiddle: 'dash.middle',
  managePeople: 'manage.people',
  manageWorkflow: 'manage.workflow',
  manageData: 'manage.data',
} as const;
