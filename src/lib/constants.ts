import type { Preferences, Theme } from './types';

export const STORAGE_KEY = 'nsg-ops-state';

export const ME_ID = '__me__';

export const WEEKDAYS: { label: string; dow: number }[] = [
  { label: 'Monday', dow: 1 },
  { label: 'Tuesday', dow: 2 },
  { label: 'Wednesday', dow: 3 },
  { label: 'Thursday', dow: 4 },
  { label: 'Friday', dow: 5 },
  { label: 'Saturday', dow: 6 },
  { label: 'Sunday', dow: 0 },
];

/** How many of each thing the starter workspace is seeded with. */
export const SEED_COUNTS = {
  departments: 3,
  membersPerDepartment: 3,
  projects: 3,
  tasksPerProject: 3,
  recipients: 2,
  followUps: 2,
};

export const DEFAULT_STATUS_SEED = [
  { name: 'Active', color: '#7FB4E3', terminal: false },
  { name: 'Planning', color: '#E3A94E', terminal: false },
  { name: 'On Hold', color: '#B39CE0', terminal: false },
  { name: 'Done', color: '#6FBF95', terminal: true },
];

export const DEFAULT_UI_COLORS = { project: '#B39CE0', general: '#8B909B' };

export const DEFAULT_THEME: Theme = {
  paper: '#121317',
  panel: '#1A1C21',
  panelRaised: '#1F2127',
  ink: '#ECEDF0',
  inkSoft: '#8B909B',
  inkFaint: '#5B5F68',
  line: '#2B2D33',
  accent: '#D9D4C5',
};

/** A few ready-made palettes so the board can be reskinned in one click. */
export const THEME_PRESETS: { name: string; theme: Theme }[] = [
  { name: 'Charcoal', theme: DEFAULT_THEME },
  {
    name: 'Midnight',
    theme: {
      paper: '#0E1220', panel: '#161B2E', panelRaised: '#1D2338', ink: '#E8EBF5',
      inkSoft: '#8791AE', inkFaint: '#5A6280', line: '#262D45', accent: '#7FB4E3',
    },
  },
  {
    name: 'Forest',
    theme: {
      paper: '#101613', panel: '#171F1B', panelRaised: '#1D2724', ink: '#E7EFE9',
      inkSoft: '#88998F', inkFaint: '#586661', line: '#26322D', accent: '#6FBF95',
    },
  },
  {
    name: 'Paper',
    theme: {
      paper: '#F4F2ED', panel: '#FFFFFF', panelRaised: '#F0EDE6', ink: '#1E2024',
      inkSoft: '#5E636E', inkFaint: '#8B909B', line: '#DCD8CF', accent: '#2F3238',
    },
  },
  {
    name: 'Plum',
    theme: {
      paper: '#15111B', panel: '#1D1826', panelRaised: '#251F31', ink: '#EFEAF5',
      inkSoft: '#9A8FAE', inkFaint: '#685D7C', line: '#2E2740', accent: '#B39CE0',
    },
  },
];

export const DEFAULT_PREFERENCES: Preferences = {
  labels: {},
  theme: { ...DEFAULT_THEME },
  splits: {},
  hidden: {},
  density: 'comfortable',
  showTasksWithoutDue: false,
  showCompletedInDue: false,
  projectStripes: true,
};

export const PALETTE = [
  '#E2685A', '#E3A94E', '#6FBF95', '#7FB4E3', '#B39CE0', '#E091B8', '#8FD0C4', '#D9C25A',
  '#9BA8E8', '#D98F5A', '#7FD6E3', '#C4E37F', '#E37F9E', '#7FE3A0', '#A9E37F', '#7FA0E3',
];
