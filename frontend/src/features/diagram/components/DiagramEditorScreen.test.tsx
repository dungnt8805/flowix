import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiagramEditorScreen } from './DiagramEditorScreen';

vi.mock('@/features/renderer/components/MermaidPreview', () => ({
  MermaidPreview: ({ source, theme }: { source: string; theme?: string }) => (
    <output aria-label="preview" data-theme={theme}>
      {source}
    </output>
  )
}));

describe('DiagramEditorScreen', () => {
  it('should update the Mermaid source draft while editing', async () => {
    const user = userEvent.setup();
    render(<DiagramEditorScreen />);

    const editor = screen.getByLabelText('Mermaid source');
    await user.clear(editor);
    await user.type(editor, 'flowchart LR\nA-->B');

    expect(screen.getByLabelText('preview')).toHaveTextContent('flowchart LR');
    expect(screen.getByLabelText('preview')).toHaveTextContent('A-->B');
  });

  it('saves edited Mermaid source and shows a saved state', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DiagramEditorScreen onSave={onSave} />);

    const editor = screen.getByLabelText('Mermaid source');
    await user.clear(editor);
    await user.type(editor, 'sequenceDiagram\nA->>B: ok');
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith({
      title: 'Chat Project System Design',
      themeConfig: { theme: 'default' },
      sourceCode: 'sequenceDiagram\nA->>B: ok'
    });
    expect(await screen.findByRole('button', { name: 'Saved' })).toBeDisabled();
  });

  it('builds an outline and saves the selected theme', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<DiagramEditorScreen onSave={onSave} />);

    expect(screen.getByRole('button', { name: 'Go to source line 2' })).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Theme'), 'forest');
    expect(screen.getByLabelText('preview')).toHaveAttribute('data-theme', 'forest');

    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        themeConfig: { theme: 'forest' }
      })
    );
  });

  it('shows a retry state when saving fails', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error('failed'));
    render(<DiagramEditorScreen onSave={onSave} />);

    await user.type(screen.getByLabelText('Mermaid source'), '\nA-->C');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Save failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry save' })).toBeEnabled();
  });
});
