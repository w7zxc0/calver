'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useApp } from '@/components/AppProvider';

const MIN_RATIO = 0.2;
const MAX_RATIO = 0.8;
const STACK_BELOW = 760;

interface Props {
  /** Identifies the stored width so the drag survives a reload. */
  splitId: string;
  left: ReactNode;
  right: ReactNode;
  /** Used when only one side is visible. */
  soloLeft?: boolean;
  soloRight?: boolean;
}

/**
 * Two windows side by side with a divider you can drag; the ratio is stored in
 * preferences. Below a narrow breakpoint the panes stack and the divider goes
 * away, since there is nothing left to resize.
 */
export function SplitPane({ splitId, left, right, soloLeft, soloRight }: Props) {
  const { prefs, update } = useApp();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [stacked, setStacked] = useState(false);
  const [dragging, setDragging] = useState(false);
  const ratio = clamp(prefs.splits[splitId] ?? 0.5);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${STACK_BELOW}px)`);
    const sync = () => setStacked(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  const commitRatio = useCallback(
    (next: number) => update((draft) => { draft.prefs.splits[splitId] = clamp(next); }),
    [update, splitId],
  );

  useEffect(() => {
    if (!dragging) return;

    const onMove = (e: PointerEvent) => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (!box || box.width === 0) return;
      const el = wrapRef.current as HTMLDivElement;
      // Paint during the drag, commit once on release.
      el.style.gridTemplateColumns = columns(clamp((e.clientX - box.left) / box.width));
    };
    const onUp = (e: PointerEvent) => {
      const box = wrapRef.current?.getBoundingClientRect();
      if (box && box.width > 0) commitRatio((e.clientX - box.left) / box.width);
      setDragging(false);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging, commitRatio]);

  if (soloLeft && soloRight) return null;
  if (soloLeft) return <div className="split-solo">{left}</div>;
  if (soloRight) return <div className="split-solo">{right}</div>;

  if (stacked) {
    return (
      <div className="split split-stacked">
        {left}
        {right}
      </div>
    );
  }

  return (
    <div className="split" ref={wrapRef} style={{ gridTemplateColumns: columns(ratio) }}>
      {left}
      <div
        className={`split-handle${dragging ? ' dragging' : ''}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize windows"
        tabIndex={0}
        onPointerDown={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDoubleClick={() => commitRatio(0.5)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') commitRatio(ratio - 0.02);
          if (e.key === 'ArrowRight') commitRatio(ratio + 0.02);
          if (e.key === 'Enter') commitRatio(0.5);
        }}
        title="Drag to resize · double-click to even out"
      >
        <span className="split-grip" />
      </div>
      {right}
    </div>
  );
}

function clamp(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0.5;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, ratio));
}

function columns(ratio: number): string {
  return `${ratio}fr 10px ${1 - ratio}fr`;
}
