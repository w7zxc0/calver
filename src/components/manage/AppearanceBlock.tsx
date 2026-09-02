'use client';

import { DEFAULT_THEME, DEFAULT_UI_COLORS, THEME_PRESETS } from '@/lib/constants';
import type { Theme } from '@/lib/types';
import { useApp } from '@/components/AppProvider';
import { ManageBlock } from './ManageBlock';

const THEME_FIELDS: { key: keyof Theme; label: string; hint: string }[] = [
  { key: 'paper', label: 'Page', hint: 'The background behind everything' },
  { key: 'panel', label: 'Window', hint: 'Card and panel surfaces' },
  { key: 'panelRaised', label: 'Raised', hint: 'Hover states and inner rows' },
  { key: 'ink', label: 'Text', hint: 'Primary text' },
  { key: 'inkSoft', label: 'Muted text', hint: 'Secondary text and headings' },
  { key: 'inkFaint', label: 'Faint text', hint: 'Hints and placeholders' },
  { key: 'line', label: 'Borders', hint: 'Dividers and outlines' },
  { key: 'accent', label: 'Accent', hint: 'Active tab, buttons, selection' },
];

export function AppearanceBlock() {
  const { state, prefs, update, setPref } = useApp();

  const setTheme = (key: keyof Theme, value: string) =>
    update((draft) => { draft.prefs.theme[key] = value; });

  const applyPreset = (theme: Theme) =>
    update((draft) => { draft.prefs.theme = { ...theme }; });

  return (
    <>
      <ManageBlock
        labelKey="manage.appearance"
        extraItems={[
          { label: 'Reset colours', onSelect: () => applyPreset(DEFAULT_THEME) },
        ]}
        note="Every colour the board paints itself with. Changes apply as you pick them."
      >
        <div className="preset-row">
          {THEME_PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className="preset"
              onClick={() => applyPreset(p.theme)}
              title={`Apply the ${p.name} palette`}
            >
              <span className="preset-chips">
                <span style={{ background: p.theme.paper }} />
                <span style={{ background: p.theme.panel }} />
                <span style={{ background: p.theme.accent }} />
                <span style={{ background: p.theme.ink }} />
              </span>
              {p.name}
            </button>
          ))}
        </div>

        <div className="color-grid">
          {THEME_FIELDS.map((f) => (
            <label className="color-field" key={f.key}>
              <input
                type="color"
                value={prefs.theme[f.key]}
                onChange={(e) => setTheme(f.key, e.target.value)}
              />
              <span className="color-field-text">
                <span className="color-field-name">{f.label}</span>
                <span className="color-field-hint">{f.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </ManageBlock>

      <div className="manage-grid">
        <div className="manage-block">
          <h2><span className="panel-title">Pill colours</span></h2>
          <label className="color-field">
            <input
              type="color"
              value={state.uiColors.project}
              onChange={(e) => {
                const v = e.target.value;
                update((draft) => { draft.uiColors.project = v; });
              }}
            />
            <span className="color-field-text">
              <span className="color-field-name">Project pill</span>
              <span className="color-field-hint">Fallback when a project has no colour of its own</span>
            </span>
          </label>
          <label className="color-field">
            <input
              type="color"
              value={state.uiColors.general}
              onChange={(e) => {
                const v = e.target.value;
                update((draft) => { draft.uiColors.general = v; });
              }}
            />
            <span className="color-field-text">
              <span className="color-field-name">General pill</span>
              <span className="color-field-hint">Tasks that belong to no project</span>
            </span>
          </label>
          <div className="manage-note">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => update((draft) => { draft.uiColors = { ...DEFAULT_UI_COLORS }; })}
            >
              Reset pill colours
            </button>
          </div>
        </div>

        <div className="manage-block">
          <h2><span className="panel-title">Feel</span></h2>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={prefs.density === 'compact'}
              onChange={(e) => setPref('density', e.target.checked ? 'compact' : 'comfortable')}
            />
            <span>
              <strong>Compact spacing</strong>
              <em>Tightens rows so more fits on screen</em>
            </span>
          </label>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={prefs.projectStripes}
              onChange={(e) => setPref('projectStripes', e.target.checked)}
            />
            <span>
              <strong>Project colour stripes</strong>
              <em>Marks each card with its own colour so two projects never blur together</em>
            </span>
          </label>
        </div>
      </div>
    </>
  );
}
