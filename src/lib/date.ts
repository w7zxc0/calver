/**
 * Every date calculation is anchored to local midnight of the day the app was
 * loaded, exactly as the original single-file app did.
 */
export const TODAY = (() => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
})();

export const todayISO = () => isoOf(TODAY);

export function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtDate(d?: string | null): string | null {
  if (!d) return null;
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const dt = new Date(d + 'T00:00:00');
  return Math.round((dt.getTime() - TODAY.getTime()) / 86400000);
}

export function dueClass(d?: string | null): string {
  const n = daysUntil(d);
  if (n === null) return '';
  if (n < 0) return 'overdue';
  if (n <= 3) return 'soon';
  return '';
}

export function dueLabelLowkey(d?: string | null): string {
  const n = daysUntil(d);
  if (n === null) return '';
  if (n < 0) return `overdue by ${Math.abs(n)}d`;
  if (n === 0) return 'due today';
  if (n === 1) return 'due tomorrow';
  return `due in ${n}d`;
}

/** ISO date `days` after today. */
export function plus(days: number): string {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

export function nextWeekday(targetDow: number): string {
  const diff = (targetDow - TODAY.getDay() + 7) % 7;
  return plus(diff);
}

export const thisThursday = () => nextWeekday(4);

export function resolveQuickDate(val: string): string | null {
  if (val === 'today') return plus(0);
  if (val === 'tomorrow') return plus(1);
  if (val.startsWith('wd:')) return nextWeekday(parseInt(val.split(':')[1], 10));
  return null;
}

export function longDateLabel(): string {
  return TODAY.toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}
