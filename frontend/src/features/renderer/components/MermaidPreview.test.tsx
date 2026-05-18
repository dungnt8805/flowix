import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mermaid from 'mermaid';
import { MermaidPreview } from './MermaidPreview';

vi.mock('mermaid', () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn()
  }
}));

describe('MermaidPreview', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  async function flushDebouncedRender(): Promise<void> {
    await act(async () => {
      vi.advanceTimersByTime(250);
      await Promise.resolve();
    });
  }

  it('should render Mermaid SVG output inside a sandboxed frame', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg role="img"><text>Rendered</text></svg>',
      bindFunctions: undefined,
      diagramType: 'flowchart'
    });

    render(<MermaidPreview source="flowchart LR\nA-->B" />);
    await flushDebouncedRender();

    expect(screen.getByTitle('Sandboxed Mermaid preview')).toHaveAttribute('sandbox', '');
    expect(screen.getByTitle('Sandboxed Mermaid preview')).toHaveAttribute(
      'srcdoc',
      expect.stringContaining('<svg role="img"><text>Rendered</text></svg>')
    );
  });

  it('should show structured render errors without crashing', async () => {
    vi.mocked(mermaid.render).mockRejectedValue(new Error('Parse error'));

    render(<MermaidPreview source="not mermaid" />);
    await flushDebouncedRender();

    expect(screen.getByRole('alert', { name: 'Mermaid render error' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Render error' })).toBeInTheDocument();
    expect(screen.getByText('Parse error')).toBeInTheDocument();
    expect(screen.getByText('not mermaid')).toBeInTheDocument();
  });

  it('debounces render requests and renders the latest source', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg role="img"><text>Rendered</text></svg>',
      bindFunctions: undefined,
      diagramType: 'flowchart'
    });

    const { rerender } = render(<MermaidPreview source={'flowchart LR\nA-->B'} />);
    rerender(<MermaidPreview source={'flowchart LR\nA-->C'} />);
    rerender(<MermaidPreview source={'flowchart LR\nA-->D'} />);

    expect(mermaid.render).toHaveBeenCalledTimes(1);
    await flushDebouncedRender();

    expect(mermaid.render).toHaveBeenLastCalledWith(expect.any(String), 'flowchart LR\nA-->D');
  });

  it('supports zoom, pan, and fit controls', async () => {
    vi.mocked(mermaid.render).mockResolvedValue({
      svg: '<svg role="img"><text>Rendered</text></svg>',
      bindFunctions: undefined,
      diagramType: 'flowchart'
    });

    render(<MermaidPreview source="flowchart LR\nA-->B" />);
    await flushDebouncedRender();

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    expect(screen.getByText('115%')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pan right' }));
    expect(screen.getByTitle('Sandboxed Mermaid preview').parentElement).toHaveStyle({
      transform: 'translate(48px, 0px) scale(1.15)'
    });

    fireEvent.click(screen.getByRole('button', { name: 'Fit' }));
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByTitle('Sandboxed Mermaid preview').parentElement).toHaveStyle({
      transform: 'translate(0px, 0px) scale(1)'
    });
  });
});
