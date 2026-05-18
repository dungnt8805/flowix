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
      <main className="workspace-main">
        <div className="sync-error" role="alert">
          {error}
        </div>
      </main>
    );
  }

  if (diagram === null) {
    return <main className="workspace-main">Loading shared diagram...</main>;
  }

  return (
    <main className="workspace-main">
      <header className="topbar">
        <div>
          <p className="eyebrow">Read-only shared diagram</p>
          <h1>{diagram.title}</h1>
        </div>
        <span className="status">Shared view</span>
      </header>
      <section className="editor-grid" aria-label="Shared diagram">
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Mermaid source</p>
              <h2>{diagram.diagramType}</h2>
            </div>
          </div>
          <pre className="source-editor">{diagram.sourceCode}</pre>
        </article>
        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Renderer</p>
              <h2>Preview</h2>
            </div>
          </div>
          <MermaidPreview source={diagram.sourceCode} theme={diagram.themeConfig.theme} />
        </article>
      </section>
    </main>
  );
}
