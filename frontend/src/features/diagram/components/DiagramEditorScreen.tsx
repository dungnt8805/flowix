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
    <section className="flex flex-col h-full bg-slate-900/40" aria-label="Diagram editor">
      {/* Editor Panel Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{contextLabel}</p>
          <h2 className="text-sm font-semibold text-slate-200 leading-none">{draft.title}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-medium text-slate-400">
            {saveState === 'dirty'
              ? 'Unsaved changes'
              : saveState === 'error'
                ? 'Save failed'
                : statusLabel}
          </span>
          <button
            className="px-3 py-1.5 rounded-md text-xs font-semibold bg-teal-500 hover:bg-teal-400 disabled:bg-slate-800 text-slate-950 disabled:text-slate-500 transition-all duration-150 shadow-md shadow-teal-500/10 active:scale-[0.98] disabled:scale-100 disabled:shadow-none"
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

      {/* Editor Main Text Area */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <textarea
          ref={editorRef}
          aria-label="Mermaid source"
          className="flex-1 w-full bg-slate-950/80 text-slate-100 font-mono text-xs p-4 border-0 focus:ring-1 focus:ring-teal-500/50 focus:outline-none resize-none overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
          value={draft.sourceCode}
          onChange={(event) => {
            const nextSource = event.target.value;
            setDraft((current) => ({
              ...current,
              sourceCode: nextSource
            }));
            if (onSourceChange) {
              onSourceChange(nextSource);
            }
          }}
          onInput={markDirty}
        />
      </div>

      {/* Editor Support: Outline & Theme */}
      <div className="grid grid-cols-2 gap-4 border-t border-slate-800/80 p-4 bg-slate-900/60">
        <div className="outline-panel flex flex-col min-w-0">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Outline</p>
          {outline.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No nodes detected.</p>
          ) : (
            <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {outline.map((item) => (
                <button
                  aria-label={`Go to source line ${item.line}`}
                  key={`${item.line}-${item.label}`}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 px-2 py-0.5 rounded transition-all duration-100 border border-slate-700/50"
                  type="button"
                  onClick={() => selectOutlineLine(item.line)}
                >
                  <span aria-hidden="true">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="theme-panel flex flex-col justify-start">
          <label htmlFor="diagram-theme" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Theme</label>
          <select
            id="diagram-theme"
            className="w-full bg-slate-800 text-slate-200 border border-slate-700/60 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500/50 focus:outline-none cursor-pointer hover:bg-slate-750 transition-colors"
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

      {/* Hidden DOM preview supporting unit and integration tests */}
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
