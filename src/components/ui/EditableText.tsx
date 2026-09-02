'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

interface Props {
  value: string;
  onCommit: (next: string) => void;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
  /** Renders a textarea instead of a single-line input. */
  multiline?: boolean;
}

/**
 * Shows text until something asks it to edit — normally the Rename item in a ⋯
 * menu — then swaps in an input that commits on Enter or blur.
 */
export function EditableText({
  value, onCommit, editing, onEditingChange, className, style, placeholder, multiline,
}: Props) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) {
      setDraft(value);
      // Focus after the swap so the caret lands in the field.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    }
  }, [editing, value]);

  const commit = () => {
    const next = draft.trim();
    onEditingChange(false);
    if (next !== '' && next !== value) onCommit(next);
  };

  if (!editing) {
    return (
      <span className={className} style={style}>
        {value || <span style={{ color: 'var(--ink-faint)' }}>{placeholder ?? 'Untitled'}</span>}
      </span>
    );
  }

  const shared = {
    ref: inputRef,
    className: 'inline-edit',
    value: draft,
    placeholder,
    onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
    onBlur: commit,
    onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
  };

  if (multiline) {
    return (
      <textarea
        {...shared}
        rows={2}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onEditingChange(false);
        }}
      />
    );
  }

  return (
    <input
      {...shared}
      type="text"
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit();
        if (e.key === 'Escape') onEditingChange(false);
      }}
    />
  );
}
