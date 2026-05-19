'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MermaidPreview } from '@/features/renderer/components/MermaidPreview';
import { DiagramDraft, DiagramThemeName } from '../types';

const initialDraft: DiagramDraft = {
  title: 'Chat Project System Design',
  themeConfig: { theme: 'default' },
  sourceCode: `flowchart LR
  User[User] --> Web[Next.js Frontend]
  Web --> API[NestJS API]
  API --> DB[(PostgreSQL)]
  API --> Renderer[Sandboxed Mermaid Renderer]`
};

interface DiagramOutlineItem {
  line: number;
  label: string;
}

const themeOptions: Array<{ value: DiagramThemeName; label: string }> = [
  { value: 'default', label: 'Default' },
  { value: 'forest', label: 'Forest' },
  { value: 'dark', label: 'Dark' },
  { value: 'neutral', label: 'Neutral' }
];

interface DiagramEditorScreenProps {
  contextLabel?: string;
  draft?: DiagramDraft;
  draftKey?: string;
  onSave?: (draft: DiagramDraft) => Promise<void>;
  statusLabel?: string;
  onSourceChange?: (sourceCode: string) => void;
}

export function DiagramEditorScreen({
  contextLabel = 'Chat Project System Design',
  draft: initialDiagramDraft = initialDraft,
  draftKey = 'default',
  onSave,
  statusLabel = 'Sprint 2 workspace shell',
  onSourceChange
}: DiagramEditorScreenProps): React.ReactElement {
  const [draft, setDraft] = useState<DiagramDraft>(initialDiagramDraft);
  const [saveState, setSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const outline = useMemo(() => parseDiagramOutline(draft.sourceCode), [draft.sourceCode]);

  useEffect(() => {
    setDraft(initialDiagramDraft);
    setSaveState('clean');
  }, [draftKey, initialDiagramDraft]);

  async function saveDraft(): Promise<void> {
    if (onSave === undefined || saveState === 'saving') {
      return;
    }

    try {
      setSaveState('saving');
      await onSave(draft);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }

  function markDirty(): void {
    setSaveState('dirty');
  }

  function selectOutlineLine(line: number): void {
    const editor = editorRef.current;
    if (editor === null) {
      return;
    }

    const lineStart = draft.sourceCode
      .split('\n')
      .slice(0, line - 1)
      .join('\n').length;
    const offset = line === 1 ? 0 : lineStart + 1;
    editor.focus();
    editor.setSelectionRange(offset, offset);
  }

  const saveLabel =
    saveState === 'saving'
      ? 'Saving'
      : saveState === 'saved'
        ? 'Saved'
        : saveState === 'error'
          ? 'Retry save'
          : 'Save';

  return (
    <section
      className="flex h-full min-h-[34rem] flex-col overflow-hidden rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
      aria-label="Diagram editor"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-5 py-4">
        <div>
          <p className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">{contextLabel}</p>
          <h2 className="mt-1 text-base font-semibold text-[var(--color-text-primary)]">{draft.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            {saveState === 'dirty'
              ? 'Unsaved changes'
              : saveState === 'error'
                ? 'Save failed'
                : statusLabel}
          </span>
          <button
            className="h-9 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            type="button"
            onClick={() => void saveDraft()}
            disabled={
              onSave === undefined ||
              saveState === 'saving' ||
              saveState === 'clean' ||
              saveState === 'saved'
            }
          >
            {saveLabel}
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto]">
        <textarea
          ref={editorRef}
          aria-label="Mermaid source"
          className="min-h-0 w-full resize-none border-0 bg-white px-5 py-4 font-mono text-[13px] leading-6 text-slate-800 outline-none"
          value={draft.sourceCode}
          onChange={(event) => {
            const nextSource = event.target.value;
            setDraft((current) => ({
              ...current,
              sourceCode: nextSource
            }));
            onSourceChange?.(nextSource);
          }}
          onInput={markDirty}
        />

        <div className="grid gap-4 border-t border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] px-5 py-4 md:grid-cols-[minmax(0,1fr)_12rem]">
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">Outline</p>
            {outline.length === 0 ? (
              <p className="text-sm text-[var(--color-text-tertiary)]">No nodes detected.</p>
            ) : (
              <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto pr-1">
                {outline.map((item) => (
                  <button
                    aria-label={`Go to source line ${item.line}`}
                    key={`${item.line}-${item.label}`}
                    className="rounded-[6px] border border-[var(--color-border-default)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-sky-300 hover:text-sky-700"
                    type="button"
                    onClick={() => selectOutlineLine(item.line)}
                  >
                    <span aria-hidden="true">{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="diagram-theme" className="mb-2 block text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">
              Theme
            </label>
            <select
              id="diagram-theme"
              aria-label="Theme"
              className="h-10 w-full rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)]"
              value={draft.themeConfig.theme}
              onChange={(event) => {
                const nextTheme = event.target.value as DiagramThemeName;
                setDraft((current) => ({
                  ...current,
                  themeConfig: { theme: nextTheme }
                }));
                markDirty();
              }}
            >
              {themeOptions.map((theme) => (
                <option key={theme.value} value={theme.value}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="hidden" aria-hidden="true">
        <MermaidPreview source={draft.sourceCode} theme={draft.themeConfig.theme} />
      </div>
    </section>
  );
}

export function parseDiagramOutline(source: string): DiagramOutlineItem[] {
  return source
    .split('\n')
    .map((line, index) => ({ line: index + 1, text: line.trim() }))
    .filter(({ text }) => text.length > 0 && !/^(flowchart|graph|sequenceDiagram|stateDiagram|classDiagram|erDiagram)\b/.test(text))
    .slice(0, 12)
    .map(({ line, text }) => ({
      line,
      label: toOutlineLabel(text)
    }));
}

function toOutlineLabel(text: string): string {
  const bracketLabel = text.match(/\[([^\]]+)\]/)?.[1];
  if (bracketLabel !== undefined) {
    return bracketLabel;
  }

  return text.replace(/[-.=]+>|--+|::|:/g, ' ').replace(/\s+/g, ' ').slice(0, 64);
}
