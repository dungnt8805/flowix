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
}

export function DiagramEditorScreen({
  contextLabel = 'Chat Project System Design',
  draft: initialDiagramDraft = initialDraft,
  draftKey = 'default',
  onSave,
  statusLabel = 'Sprint 2 workspace shell'
}: DiagramEditorScreenProps): React.ReactElement {
  const [draft, setDraft] = useState<DiagramDraft>(initialDiagramDraft);
  const [saveState, setSaveState] = useState<'clean' | 'dirty' | 'saving' | 'saved' | 'error'>('clean');
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const outline = useMemo(() => parseDiagramOutline(draft.sourceCode), [draft.sourceCode]);

  useEffect(() => {
    setDraft(initialDiagramDraft);
    setSaveState('clean');
  }, [draftKey]);

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
    <section className="editor-grid" aria-label="Diagram editor">
      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">{contextLabel}</p>
            <h2>{draft.title}</h2>
          </div>
          <div className="editor-actions">
            <span className="status">
              {saveState === 'dirty'
                ? 'Unsaved changes'
                : saveState === 'error'
                  ? 'Save failed'
                  : statusLabel}
            </span>
            <button
              className="secondary-action"
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
        <textarea
          ref={editorRef}
          aria-label="Mermaid source"
          className="source-editor"
          value={draft.sourceCode}
          onChange={(event) =>
            setDraft((current) => ({
              ...current,
              sourceCode: event.target.value
            }))
          }
          onInput={markDirty}
        />
        <div className="editor-support-grid">
          <div className="outline-panel">
            <p className="eyebrow">Outline</p>
            {outline.length === 0 ? (
              <p className="empty-copy">No outline items detected.</p>
            ) : (
              <div className="outline-list">
                {outline.map((item) => (
                  <button
                    aria-label={`Go to source line ${item.line}`}
                    key={`${item.line}-${item.label}`}
                    type="button"
                    onClick={() => selectOutlineLine(item.line)}
                  >
                    <span aria-hidden="true">{item.label}</span>
                    <small>Line {item.line}</small>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="theme-panel">
            <label htmlFor="diagram-theme">Theme</label>
            <select
              id="diagram-theme"
              value={draft.themeConfig.theme}
              onChange={(event) => {
                setDraft((current) => ({
                  ...current,
                  themeConfig: { theme: event.target.value as DiagramThemeName }
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
      </article>

      <article className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Renderer</p>
            <h2>Live Preview</h2>
          </div>
          <span className="status">Mermaid.js</span>
        </div>
        <MermaidPreview source={draft.sourceCode} theme={draft.themeConfig.theme} />
      </article>
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
