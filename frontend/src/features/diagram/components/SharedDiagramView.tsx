'use client';

import { useEffect, useState } from 'react';
import { MermaidPreview } from '@/features/renderer/components/MermaidPreview';
import { createBrowserFloVisApiClient } from '@/lib/api/floVisApiClient';
import { DiagramSummary } from '@/features/workspace/types';

interface SharedDiagramViewProps {
  token: string;
}

export function SharedDiagramView({ token }: SharedDiagramViewProps): React.ReactElement {
  const [diagram, setDiagram] = useState<DiagramSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiClient = createBrowserFloVisApiClient();
    if (apiClient === null) {
      setError('Shared diagrams require an API connection.');
      return;
    }

    apiClient
      .getSharedDiagram(token)
      .then(setDiagram)
      .catch(() => setError('This share link is unavailable.'));
  }, [token]);

  if (error !== null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] p-6">
        <div className="w-full max-w-xl rounded-[10px] border border-rose-200 bg-white p-6 text-sm text-rose-700 shadow-[0_24px_80px_rgba(15,23,42,0.08)]" role="alert">
          {error}
        </div>
      </main>
    );
  }

  if (diagram === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-app)] p-6 text-sm text-[var(--color-text-secondary)]">
        Loading shared diagram...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--color-bg-app)] p-4 text-[var(--color-text-primary)] sm:p-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1400px] flex-col rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)] shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border-subtle)] px-6 py-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">Flo Vis</span>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-medium text-sky-700">
                Read-only
              </span>
            </div>
            <h1 className="mt-3 text-[28px] font-semibold leading-8">{diagram.title}</h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Shared diagram preview and Mermaid source.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-10 rounded-[8px] border border-[var(--color-border-default)] bg-white px-4 text-sm font-medium text-[var(--color-text-secondary)] transition hover:border-sky-300 hover:text-sky-700"
              onClick={() => {
                void navigator.clipboard.writeText(window.location.href).catch(() => undefined);
              }}
            >
              Copy link
            </button>
            <button
              type="button"
              className="h-10 rounded-[8px] bg-[var(--color-accent)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--color-accent-hover)]"
            >
              Export
            </button>
          </div>
        </header>

        <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className="min-h-0">
            <MermaidPreview source={diagram.sourceCode} theme={diagram.themeConfig.theme} />
          </section>

          <aside className="flex min-h-0 flex-col gap-4 rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel-alt)] p-4">
            <div className="flex gap-2 border-b border-[var(--color-border-subtle)] pb-3 text-sm">
              <span className="rounded-[8px] bg-white px-3 py-2 font-medium text-[var(--color-accent)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                Source
              </span>
              <span className="rounded-[8px] px-3 py-2 text-[var(--color-text-secondary)]">Details</span>
              <span className="rounded-[8px] px-3 py-2 text-[var(--color-text-secondary)]">Comments</span>
            </div>

            <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Mermaid source</h2>
                <button
                  type="button"
                  className="rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-sky-300 hover:text-sky-700"
                  onClick={() => {
                    void navigator.clipboard.writeText(diagram.sourceCode).catch(() => undefined);
                  }}
                >
                  Copy
                </button>
              </div>
              <pre className="max-h-[22rem] overflow-auto rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-panel-alt)] p-4 text-xs leading-6 text-slate-700">
                {diagram.sourceCode}
              </pre>
            </section>

            <section className="rounded-[10px] border border-[var(--color-border-subtle)] bg-white p-4">
              <h2 className="text-sm font-semibold">Diagram details</h2>
              <dl className="mt-4 grid gap-3 text-sm">
                <Detail label="Diagram type" value={diagram.diagramType} />
                <Detail label="Theme" value={diagram.themeConfig.theme} />
                <Detail label="Updated" value={diagram.updatedAtLabel} />
                <Detail label="Description" value={diagram.description ?? 'No description'} />
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Detail({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="grid gap-1">
      <dt className="text-[11px] font-medium uppercase text-[var(--color-text-tertiary)]">{label}</dt>
      <dd className="text-[var(--color-text-secondary)]">{value}</dd>
    </div>
  );
}
