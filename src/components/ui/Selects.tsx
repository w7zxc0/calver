'use client';

import { ME_ID, WEEKDAYS } from '@/lib/constants';
import { membersByDepartment } from '@/lib/selectors';
import { useApp } from '@/components/AppProvider';

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  title?: string;
  draggable?: boolean;
}

/** Unassigned / Myself / members grouped by department. */
export function MemberSelect({ value, onChange, className = 'assignee-select', title, draggable }: SelectProps) {
  const { state } = useApp();
  const { groups, orphans } = membersByDepartment(state);
  return (
    <select
      className={className}
      title={title}
      draggable={draggable}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Unassigned</option>
      <option value={ME_ID}>Myself</option>
      {groups
        .filter((g) => g.members.length > 0)
        .map((g) => (
          <optgroup key={g.dept.id} label={g.dept.name}>
            {g.members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </optgroup>
        ))}
      {orphans.length > 0 && (
        <optgroup label="Other">
          {orphans.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}

export function ProjectSelect({ value, onChange, className, title }: SelectProps) {
  const { state } = useApp();
  return (
    <select className={className} title={title} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">General (no project)</option>
      {state.projects.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
    </select>
  );
}

export function RecipientSelect({ value, onChange, className = 'assignee-select', title }: SelectProps) {
  const { state } = useApp();
  return (
    <select className={className} title={title} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Unassigned</option>
      {state.recipients.map((r) => (
        <option key={r.id} value={r.id}>{r.name}</option>
      ))}
    </select>
  );
}

/** Today / Tomorrow / next occurrence of each weekday. */
export function QuickDateSelect({ value, onChange, className, title }: SelectProps) {
  return (
    <select className={className} title={title} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Quick pick…</option>
      <option value="today">Today</option>
      <option value="tomorrow">Tomorrow</option>
      {WEEKDAYS.map((w) => (
        <option key={w.dow} value={`wd:${w.dow}`}>{w.label}</option>
      ))}
    </select>
  );
}

export function StatusSelect({
  value, onChange, className, style,
}: SelectProps & { style?: React.CSSProperties }) {
  const { state } = useApp();
  return (
    <select
      className={className}
      style={style}
      value={value}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value)}
    >
      {state.statuses.map((s) => (
        <option key={s.id} value={s.id}>{s.name}</option>
      ))}
    </select>
  );
}
