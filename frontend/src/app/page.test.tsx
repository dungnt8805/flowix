import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Home from './page';

vi.mock('@/features/workspace/components/WorkspaceProjectShell', () => ({
  WorkspaceProjectShell: () => <main aria-label="workspace shell">Workspace</main>
}));

describe('Home', () => {
  it('should render the workspace shell', () => {
    render(<Home />);

    expect(screen.getByLabelText('workspace shell')).toBeInTheDocument();
  });
});
