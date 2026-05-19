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
  const background = theme === 'dark' ? '#111827' : '#ffffff';
  const color = theme === 'dark' ? '#f8fafc' : '#0f172a';

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
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
      }

      body {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 24px;
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

function toolbarButtonClassName(): string {
  return 'inline-flex h-9 items-center justify-center rounded-[8px] border border-[var(--color-border-default)] bg-white px-3 text-xs font-medium text-[var(--color-text-secondary)] transition hover:border-sky-300 hover:text-sky-700';
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
      <div className="flex h-full min-h-[20rem] flex-col rounded-[10px] border border-rose-200 bg-rose-50 p-5" role="alert" aria-label="Mermaid render error">
        <div>
          <p className="text-[11px] font-medium uppercase text-rose-500">Renderer</p>
          <h3 className="mt-1 text-base font-semibold text-rose-700">{state.error.title}</h3>
        </div>
        <p className="mt-3 text-sm text-rose-700">{state.error.message}</p>
        {state.error.sourceExcerpt.length === 0 ? null : (
          <pre className="mt-4 overflow-auto rounded-[8px] border border-rose-100 bg-white p-4 text-xs text-slate-700">
            {state.error.sourceExcerpt}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div aria-label="Mermaid preview" className="flex h-full min-h-[24rem] flex-col overflow-hidden rounded-[10px] border border-[var(--color-border-default)] bg-[var(--color-bg-panel)]">
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <button className={toolbarButtonClassName()} type="button" onClick={() => zoomBy(-ZOOM_STEP)}>
            Zoom out
          </button>
          <span className="inline-flex h-9 items-center rounded-[8px] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-3 text-xs font-medium text-[var(--color-text-secondary)]">
            {Math.round(viewport.zoom * 100)}%
          </span>
          <button className={toolbarButtonClassName()} type="button" onClick={() => zoomBy(ZOOM_STEP)}>
            Zoom in
          </button>
          <button className={toolbarButtonClassName()} type="button" onClick={fitToScreen}>
            Fit
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className={toolbarButtonClassName()} type="button" onClick={() => panBy(-PAN_STEP, 0)}>
            Pan left
          </button>
          <button className={toolbarButtonClassName()} type="button" onClick={() => panBy(PAN_STEP, 0)}>
            Pan right
          </button>
          <button className={toolbarButtonClassName()} type="button" onClick={() => panBy(0, -PAN_STEP)}>
            Pan up
          </button>
          <button className={toolbarButtonClassName()} type="button" onClick={() => panBy(0, PAN_STEP)}>
            Pan down
          </button>
        </div>
      </div>

      <div className="preview-grid-bg relative flex flex-1 items-center justify-center overflow-hidden p-5">
        {state.isRendering ? (
          <span className="absolute left-5 top-5 rounded-full border border-[var(--color-border-subtle)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
            Rendering preview
          </span>
        ) : null}
        <div
          style={{
            transform: `translate(${viewport.offsetX}px, ${viewport.offsetY}px) scale(${viewport.zoom})`
          }}
        >
          <iframe
            className="h-[32rem] w-[48rem] max-w-full rounded-[10px] border border-[var(--color-border-subtle)] bg-white shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
            sandbox=""
            srcDoc={buildSandboxDocument(state.svg, theme)}
            title="Sandboxed Mermaid preview"
          />
        </div>
      </div>
    </div>
  );
}
