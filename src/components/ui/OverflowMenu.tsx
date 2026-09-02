'use client';

import {
  useCallback, useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

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

const GAP = 4;
const EDGE = 8;

/**
 * The ⋯ button that hangs off anything renamable or configurable.
 *
 * The menu is portalled to the body and positioned against the button's
 * viewport rect, because several of its hosts (project cards, panels) clip
 * their own overflow and would otherwise cut the list off.
 */
export function OverflowMenu({ items, title = 'More', header, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const place = useCallback(() => {
    const button = buttonRef.current?.getBoundingClientRect();
    if (!button) return;

    const wanted = menuRef.current?.offsetHeight ?? 220;
    const below = window.innerHeight - button.bottom - GAP - EDGE;
    const above = button.top - GAP - EDGE;
    // Drop upward only when there is genuinely more room up there.
    const flip = wanted > below && above > below;

    const next: CSSProperties = {
      position: 'fixed',
      maxHeight: Math.max(120, flip ? above : below),
    };
    if (flip) next.bottom = window.innerHeight - button.top + GAP;
    else next.top = button.bottom + GAP;

    if (align === 'right') next.right = Math.max(EDGE, window.innerWidth - button.right);
    else next.left = Math.max(EDGE, button.left);

    setStyle(next);
  }, [align]);

  // Measure before paint so the menu never shows in the wrong spot.
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;

    const onDocPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const reposition = () => place();

    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('keydown', onKey);
    // Capture phase so scrolling inside any container keeps the menu anchored.
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open, place]);

  const menu = (
    <div
      className="menu"
      ref={menuRef}
      id={id}
      role="menu"
      style={style ?? { position: 'fixed', visibility: 'hidden' }}
      onClick={(e) => e.stopPropagation()}
    >
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
  );

  return (
    <span className="menu-wrap">
      <button
        ref={buttonRef}
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
      {open && typeof document !== 'undefined' && createPortal(menu, document.body)}
    </span>
  );
}
