'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

export interface MenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
  /** Renders a tick when true, nothing when false, nothing at all when omitted. */
  checked?: boolean;
}

interface Props {
  items: (MenuItem | 'separator')[];
  title?: string;
  /** Extra content rendered above the items, e.g. a colour picker. */
  header?: ReactNode;
  align?: 'left' | 'right';
}

/** The ⋯ button that hangs off anything renamable or configurable. */
export function OverflowMenu({ items, title = 'More', header, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <span className="menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`dots${open ? ' dots-open' : ''}`}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        ⋯
      </button>
      {open && (
        <div className={`menu menu-${align}`} id={id} role="menu" onClick={(e) => e.stopPropagation()}>
          {header && <div className="menu-header">{header}</div>}
          {items.map((item, i) =>
            item === 'separator' ? (
              <div className="menu-sep" key={`sep-${i}`} />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                className={`menu-item${item.danger ? ' danger' : ''}`}
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
              >
                {item.checked !== undefined && (
                  <span className="menu-tick">{item.checked ? '✓' : ''}</span>
                )}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </span>
  );
}
