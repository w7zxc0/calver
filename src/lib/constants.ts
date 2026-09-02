import type { Department, Status } from './types';

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

export const DEFAULT_MEMBERS = [
  'Shameer', 'Raahyma', 'Mahnoor', 'Inayah', 'Eshan', 'Maryam', 'Amr', 'Zehra',
  'Saad', 'Rumman', 'Rafiq', 'Samad', 'Zoeya', 'Dawood', 'Hafsa', 'Arishba',
  'Maleeha', 'Javeria', 'Zunair', 'Zainab', 'Abdullah', 'Umer', 'Neshal', 'Shaayan',
];

export const DEPT_IDS = {
  ops: 'dep_ops',
  well: 'dep_well',
  mkt: 'dep_mkt',
  fin: 'dep_fin',
  house: 'dep_house',
} as const;

export const DEFAULT_DEPARTMENTS: Department[] = [
  { id: DEPT_IDS.ops, name: 'Operations' },
  { id: DEPT_IDS.well, name: 'Wellbeing' },
  { id: DEPT_IDS.mkt, name: 'Marketing' },
  { id: DEPT_IDS.fin, name: 'Finance' },
  { id: DEPT_IDS.house, name: 'House Captains' },
];

export const NAME_TO_DEPT: Record<string, string> = {
  'maleeha': DEPT_IDS.ops, 'maryam f.': DEPT_IDS.ops, 'mahnoor': DEPT_IDS.ops, 'shameer': DEPT_IDS.ops,
  'inayah': DEPT_IDS.well, 'zehra': DEPT_IDS.well, 'amr': DEPT_IDS.well, 'shaayan': DEPT_IDS.well,
  'maryam': DEPT_IDS.mkt, 'eshan': DEPT_IDS.mkt,
  'raahyma': DEPT_IDS.fin, 'umer': DEPT_IDS.fin, 'abdullah': DEPT_IDS.fin,
};

export const DEFAULT_RECIPIENT_NAMES = ['NES', 'Admin'];

export const DEFAULT_STATUSES: Status[] = [
  { id: 'st_active', name: 'Active', color: '#7FB4E3', terminal: false },
  { id: 'st_planning', name: 'Planning', color: '#E3A94E', terminal: false },
  { id: 'st_limbo', name: 'Limbo', color: '#B39CE0', terminal: false },
  { id: 'st_done', name: 'Done', color: '#6FBF95', terminal: true },
];

export const DEFAULT_UI_COLORS = { project: '#B39CE0', general: '#8B909B' };

export const PALETTE = [
  '#E2685A', '#E3A94E', '#6FBF95', '#7FB4E3', '#B39CE0', '#E091B8', '#8FD0C4', '#D9C25A',
  '#9BA8E8', '#D98F5A', '#7FD6E3', '#C4E37F', '#E37F9E', '#7FE3A0', '#A9E37F', '#7FA0E3',
];
