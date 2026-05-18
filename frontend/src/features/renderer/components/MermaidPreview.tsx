'use client';

import { useEffect, useId, useState } from 'react';
import mermaid from 'mermaid';
import { DiagramThemeName } from '@/features/diagram/types';

interface MermaidPreviewProps {
  source: string;
  theme?: DiagramThemeName;
}

interface RenderError {
  title: string;
  message: string;
  sourceExcerpt: string;
}

interface RenderState {
  svg: string;
  error: RenderError | null;
  isRendering: boolean;
}

const RENDER_DEBOUNCE_MS = 250;
const SOURCE_EXCERPT_LIMIT = 220;
const ZOOM_STEP = 0.15;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const PAN_STEP = 48;

mermaid.initialize({
  startOnLoad: false,
  securityLevel: 'strict',
  theme: 'default'
});

function formatRenderError(error: unknown, source: string): RenderError {
  return {
    title: 'Render error',
    message: error instanceof Error ? error.message : 'Unable to render Mermaid source.',
    sourceExcerpt:
      source.trim().length > SOURCE_EXCERPT_LIMIT
        ? `${source.trim().slice(0, SOURCE_EXCERPT_LIMIT)}...`
        : source.trim()
  };
}

function buildSandboxDocument(svg: string, theme: DiagramThemeName): string {
  const background = theme === 'dark' ? '#171b1f' : 'transparent';
  const color = theme === 'dark' ? '#f7f3ea' : '#20241f';

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline';" />
    <style>
      html,
      body {
        margin: 0;
        min-height: 100%;
        background: ${background};
        color: ${color};
        font-family: ui-sans-serif, system-ui, sans-serif;
      }

      body {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 16px;
      }

      svg {
        max-width: 100%;
        height: auto;
      }
    </style>
  </head>
  <body>${svg}</body>
</html>`;
}

export function MermaidPreview({ source, theme = 'default' }: MermaidPreviewProps): React.ReactElement {
  const id = useId().replaceAll(':', '');
  const [debouncedSource, setDebouncedSource] = useState(source);
  const [viewport, setViewport] = useState({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [state, setState] = useState<RenderState>({
    svg: '',
    error: null,
    isRendering: true
  });

  useEffect(() => {
    setState((current) => ({
      ...current,
      error: null,
      isRendering: true
    }));

    const debounceTimer = window.setTimeout(() => {
      setDebouncedSource(source);
    }, RENDER_DEBOUNCE_MS);

    return () => window.clearTimeout(debounceTimer);
  }, [source]);

  useEffect(() => {
    let cancelled = false;

    async function renderDiagram(): Promise<void> {
      try {
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme
        });
        const result = await mermaid.render(`diagram-${id}`, debouncedSource);
        if (!cancelled) {
          setState({ svg: result.svg, error: null, isRendering: false });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            svg: '',
            error: formatRenderError(error, debouncedSource),
            isRendering: false
          });
        }
      }
    }

    void renderDiagram();

    return () => {
      cancelled = true;
    };
  }, [debouncedSource, id, theme]);

  function zoomBy(delta: number): void {
    setViewport((current) => ({
      ...current,
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((current.zoom + delta).toFixed(2))))
    }));
  }

  function panBy(offsetX: number, offsetY: number): void {
    setViewport((current) => ({
      ...current,
      offsetX: current.offsetX + offsetX,
      offsetY: current.offsetY + offsetY
    }));
  }

  function fitToScreen(): void {
    setViewport({ zoom: 1, offsetX: 0, offsetY: 0 });
  }

  if (state.error) {
    return (
      <div className="preview" role="alert" aria-label="Mermaid render error">
        <div className="render-error-panel">
          <div>
            <p className="eyebrow">Renderer</p>
            <h3>{state.error.title}</h3>
          </div>
          <p>{state.error.message}</p>
          {state.error.sourceExcerpt.length === 0 ? null : (
            <pre>{state.error.sourceExcerpt}</pre>
          )}
        </div>
      </div>
    );
  }

  return (
    <div aria-label="Mermaid preview" className="preview">
      {state.isRendering ? <span className="preview-status">Rendering preview</span> : null}
      <div className="preview-toolbar" aria-label="Preview navigation controls">
        <button type="button" onClick={() => zoomBy(ZOOM_STEP)}>
          Zoom in
        </button>
        <button type="button" onClick={() => zoomBy(-ZOOM_STEP)}>
          Zoom out
        </button>
        <button type="button" onClick={() => panBy(-PAN_STEP, 0)}>
          Pan left
        </button>
        <button type="button" onClick={() => panBy(PAN_STEP, 0)}>
          Pan right
        </button>
        <button type="button" onClick={() => panBy(0, -PAN_STEP)}>
          Pan up
        </button>
        <button type="button" onClick={() => panBy(0, PAN_STEP)}>
          Pan down
        </button>
        <button type="button" onClick={fitToScreen}>
          Fit
        </button>
        <span className="preview-zoom-label">{Math.round(viewport.zoom * 100)}%</span>
      </div>
      <div
        className="preview-pan-stage"
        style={{
          transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`
        }}
      >
        <iframe
          className="preview-frame"
          sandbox=""
          srcDoc={buildSandboxDocument(state.svg, theme)}
          title="Sandboxed Mermaid preview"
        />
      </div>
    </div>
  );
}
