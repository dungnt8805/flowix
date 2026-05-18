import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { WorkspaceProjectApi } from '@/lib/api/floVisApiClient';
import { WorkspaceProjectShell } from './WorkspaceProjectShell';
import type { DiagramDraft } from '@/features/diagram/types';

vi.mock('@/features/diagram/components/DiagramEditorScreen', () => ({
  DiagramEditorScreen: ({
    contextLabel,
    draft,
    onSave
  }: {
    contextLabel: string;
    draft?: DiagramDraft;
    onSave?: (draft: DiagramDraft) => Promise<void>;
  }) => (
    <section aria-label="diagram editor">
      {contextLabel}
      <pre>{draft?.sourceCode}</pre>
      <button
        type="button"
        disabled={onSave === undefined}
        onClick={() =>
          void onSave?.({
            title: 'Saved Diagram',
            themeConfig: { theme: 'dark' },
            sourceCode: 'sequenceDiagram\nA->>B: saved'
          })
        }
      >
        Mock save
      </button>
    </section>
  )
}));

describe('WorkspaceProjectShell', () => {
  function buildApiClient(): {
    apiClient: WorkspaceProjectApi;
    createDiagram: ReturnType<typeof vi.fn>;
    createProject: ReturnType<typeof vi.fn>;
    createWorkspace: ReturnType<typeof vi.fn>;
    listProjectDiagrams: ReturnType<typeof vi.fn>;
    listProjects: ReturnType<typeof vi.fn>;
    listWorkspaces: ReturnType<typeof vi.fn>;
    listDiagramComments: ReturnType<typeof vi.fn>;
    createDiagramComment: ReturnType<typeof vi.fn>;
    resolveDiagramComment: ReturnType<typeof vi.fn>;
    reopenDiagramComment: ReturnType<typeof vi.fn>;
    listDiagramVersions: ReturnType<typeof vi.fn>;
    restoreDiagramVersion: ReturnType<typeof vi.fn>;
    importMermaid: ReturnType<typeof vi.fn>;
    parseMarkdownMermaidBlocks: ReturnType<typeof vi.fn>;
    exportDiagramSource: ReturnType<typeof vi.fn>;
    createShareLink: ReturnType<typeof vi.fn>;
    revokeShareLink: ReturnType<typeof vi.fn>;
    updateWorkspacePolicy: ReturnType<typeof vi.fn>;
    enforceRetention: ReturnType<typeof vi.fn>;
    updateDiagram: ReturnType<typeof vi.fn>;
  } {
    const listWorkspaces = vi.fn().mockResolvedValue([
      {
        id: 'workspace-api',
        name: 'API Workspace',
        slug: 'api-workspace',
        currentUserRole: 'editor'
      }
    ]);
    const createWorkspace = vi.fn().mockResolvedValue({
      id: 'workspace-created',
      name: 'Release Planning',
      slug: 'release-planning',
      currentUserRole: 'owner'
    });
    const listProjects = vi.fn().mockResolvedValue([
      {
        id: 'project-api',
        workspaceId: 'workspace-api',
        name: 'API Project',
        description: 'Loaded from backend'
      }
    ]);
    const createProject = vi.fn().mockResolvedValue({
      id: 'project-created',
      workspaceId: 'workspace-api',
      name: 'Sprint Maps',
      description: null
    });
    const listProjectDiagrams = vi.fn().mockResolvedValue([
      {
        id: 'diagram-api',
        workspaceId: 'workspace-api',
        projectId: 'project-api',
        title: 'API Diagram',
        description: 'Loaded chart',
        diagramType: 'flowchart' as const,
        themeConfig: { theme: 'default' as const },
        sourceCode: 'flowchart LR\nA-->B',
        updatedAtLabel: 'Synced'
      }
    ]);
    const createDiagram = vi.fn().mockResolvedValue({
      id: 'diagram-created',
      workspaceId: 'workspace-api',
      projectId: 'project-api',
      title: 'Blank flowchart 2',
      description: 'Minimal blank Mermaid flow for freeform editing',
      diagramType: 'flowchart',
      themeConfig: { theme: 'default' },
      sourceCode: 'flowchart LR\n  Start[Start] --> Draft[Edit Mermaid source]\n  Draft --> Preview[Preview chart]',
      updatedAtLabel: 'Synced'
    });
    const importMermaid = vi.fn((payload: { title: string; sourceCode: string }) =>
      Promise.resolve({
        id: `diagram-import-${payload.title.replace(/\s+/g, '-').toLowerCase()}`,
        workspaceId: 'workspace-api',
        projectId: 'project-api',
        title: payload.title,
        description: 'Imported Mermaid source',
        diagramType: 'flowchart' as const,
        themeConfig: { theme: 'default' as const },
        sourceCode: payload.sourceCode,
        updatedAtLabel: 'Synced'
      })
    );
    const parseMarkdownMermaidBlocks = vi.fn().mockResolvedValue([
      {
        index: 0,
        title: 'Imported block 1',
        sourceCode: 'sequenceDiagram\nA->>B: ok'
      }
    ]);
    const updateDiagram = vi.fn().mockResolvedValue({
      id: 'diagram-api',
      workspaceId: 'workspace-api',
      projectId: 'project-api',
      title: 'Saved Diagram',
      description: 'Loaded chart',
      diagramType: 'flowchart',
      themeConfig: { theme: 'dark' },
      sourceCode: 'sequenceDiagram\nA->>B: saved',
      updatedAtLabel: 'Synced'
    });
    const listDiagramComments = vi.fn().mockResolvedValue([
      {
        id: 'comment-1',
        diagramId: 'diagram-api',
        workspaceId: 'workspace-api',
        authorId: '22222222-2222-4222-8222-222222222222',
        body: 'Clarify the backend boundary.',
        anchor: null,
        status: 'open',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    const createDiagramComment = vi.fn().mockResolvedValue({
      id: 'comment-2',
      diagramId: 'diagram-api',
      workspaceId: 'workspace-api',
      authorId: '11111111-1111-4111-8111-111111111111',
      body: 'Looks good.',
      anchor: null,
      status: 'open',
      createdAt: '2026-01-02T00:00:00.000Z',
      updatedAt: '2026-01-02T00:00:00.000Z'
    });
    const resolveDiagramComment = vi.fn().mockResolvedValue({
      id: 'comment-1',
      diagramId: 'diagram-api',
      workspaceId: 'workspace-api',
      authorId: '22222222-2222-4222-8222-222222222222',
      body: 'Clarify the backend boundary.',
      anchor: null,
      status: 'resolved',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-03T00:00:00.000Z'
    });
    const reopenDiagramComment = vi.fn().mockResolvedValue({
      id: 'comment-1',
      diagramId: 'diagram-api',
      workspaceId: 'workspace-api',
      authorId: '22222222-2222-4222-8222-222222222222',
      body: 'Clarify the backend boundary.',
      anchor: null,
      status: 'open',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z'
    });
    const listDiagramVersions = vi.fn().mockResolvedValue([
      {
        id: 'version-1',
        diagramId: 'diagram-api',
        workspaceId: 'workspace-api',
        projectId: 'project-api',
        title: 'API Diagram',
        description: 'Loaded chart',
        diagramType: 'flowchart',
        themeConfig: { theme: 'forest' },
        sourceCode: 'flowchart LR\nA-->B',
        createdBy: '11111111-1111-4111-8111-111111111111',
        createdAt: '2026-01-01T00:00:00.000Z'
      }
    ]);
    const restoreDiagramVersion = vi.fn().mockResolvedValue({
      id: 'diagram-api',
      workspaceId: 'workspace-api',
      projectId: 'project-api',
      title: 'Restored Diagram',
      description: 'Loaded chart',
      diagramType: 'flowchart',
      themeConfig: { theme: 'forest' },
      sourceCode: 'flowchart LR\nRestored-->B',
      updatedAtLabel: 'Synced'
    });
    const exportDiagramSource = vi.fn().mockResolvedValue({
      filename: 'api-diagram.mmd',
      sourceCode: 'flowchart LR\nA-->B'
    });
    const createShareLink = vi.fn().mockResolvedValue({
      id: 'share-1',
      diagramId: 'diagram-api',
      token: 'share-token',
      url: '/share/share-token',
      revokedAt: null,
      createdAt: '2026-01-01T00:00:00.000Z'
    });
    const revokeShareLink = vi.fn().mockResolvedValue(undefined);
    const updateWorkspacePolicy = vi.fn().mockResolvedValue({
      workspaceId: 'workspace-api',
      allowShareLinks: false,
      allowExports: true,
      retentionDays: 365,
      ssoRequired: false
    });
    const enforceRetention = vi.fn().mockResolvedValue({
      workspaceId: 'workspace-api',
      cutoff: '2026-01-01T00:00:00.000Z',
      deletedVersions: 1,
      deletedAuditEvents: 0
    });
    const apiClient: WorkspaceProjectApi = {
      listWorkspaces,
      createWorkspace,
      listProjects,
      createProject,
      listWorkspaceMembers: vi.fn().mockResolvedValue([
        {
          id: 'member-1',
          workspaceId: 'workspace-api',
          userId: 'user-1',
          email: 'member@example.com',
          displayName: 'Member',
          role: 'editor',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ]),
      addWorkspaceMember: vi.fn().mockResolvedValue({
        id: 'member-2',
        workspaceId: 'workspace-api',
        userId: 'user-2',
        email: 'new@example.com',
        displayName: null,
        role: 'viewer',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }),
      updateWorkspaceMemberRole: vi.fn().mockResolvedValue({
        id: 'member-1',
        workspaceId: 'workspace-api',
        userId: 'user-1',
        email: 'member@example.com',
        displayName: 'Member',
        role: 'commenter',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z'
      }),
      removeWorkspaceMember: vi.fn().mockResolvedValue(undefined),
      listProjectDiagrams,
      createDiagram,
      importMermaid,
      parseMarkdownMermaidBlocks,
      updateDiagram,
      listDiagramComments,
      createDiagramComment,
      resolveDiagramComment,
      reopenDiagramComment,
      listDiagramVersions,
      restoreDiagramVersion,
      exportDiagramSource,
      requestDiagramSvgExport: vi.fn(),
      createShareLink,
      revokeShareLink,
      getSharedDiagram: vi.fn(),
      getWorkspacePolicy: vi.fn().mockResolvedValue({
        workspaceId: 'workspace-api',
        allowShareLinks: true,
        allowExports: true,
        retentionDays: 365,
        ssoRequired: false
      }),
      updateWorkspacePolicy,
      listAuditEvents: vi.fn().mockResolvedValue([
        {
          id: 'audit-1',
          workspaceId: 'workspace-api',
          actorId: null,
          action: 'diagram.create',
          targetType: 'diagram',
          targetId: 'diagram-api',
          metadata: {},
          createdAt: '2026-01-01T00:00:00.000Z'
        }
      ]),
      getEnterpriseIdentity: vi.fn().mockResolvedValue({
        workspaceId: 'workspace-api',
        strategy: 'oidc',
        status: 'specified',
        loginUrl: '/api/v1/auth/oidc/start',
        requiredClaims: ['sub', 'email', 'workspace_id']
      }),
      enforceRetention
    };

    return {
      apiClient,
      createDiagram,
      createProject,
      createWorkspace,
      listProjectDiagrams,
      listProjects,
      listWorkspaces,
      listDiagramComments,
      createDiagramComment,
      resolveDiagramComment,
      reopenDiagramComment,
      listDiagramVersions,
      restoreDiagramVersion,
      importMermaid,
      parseMarkdownMermaidBlocks,
      exportDiagramSource,
      createShareLink,
      revokeShareLink,
      updateWorkspacePolicy,
      enforceRetention,
      updateDiagram
    };
  }

  it('renders workspace and project navigation around the editor', () => {
    render(<WorkspaceProjectShell />);

    expect(screen.getByRole('heading', { name: 'Flo Vis' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Workspaces' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Projects' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Project diagrams' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('region', { name: 'Project diagrams' })).getByRole('button', {
        name: /System Context/
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent(
      'Platform Architecture / Chat Project'
    );
  });

  it('creates a local workspace and project shell entry', async () => {
    const user = userEvent.setup();
    render(<WorkspaceProjectShell />);

    await user.type(screen.getByLabelText('Workspace'), 'Release Planning');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    expect(screen.getByRole('button', { name: /Release Planning/ })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Project'), 'Sprint Maps');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(screen.getByRole('button', { name: /Sprint Maps/ })).toBeInTheDocument();
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent(
      'Release Planning / Sprint Maps'
    );
    expect(screen.getByText('No diagrams in this project')).toBeInTheDocument();
  });

  it('creates a diagram entry for the selected project', async () => {
    const user = userEvent.setup();
    render(<WorkspaceProjectShell />);

    await user.click(screen.getByRole('button', { name: 'New diagram' }));

    expect(
      within(screen.getByRole('region', { name: 'Project diagrams' })).getByRole('button', {
        name: /Blank flowchart 3/
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent(
      'Platform Architecture / Chat Project'
    );
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent('Draft --> Preview');
  });

  it('creates a diagram entry from the selected starter template', async () => {
    const user = userEvent.setup();
    render(<WorkspaceProjectShell />);

    await user.selectOptions(screen.getByLabelText('Template'), 'sequence-flow');
    await user.click(screen.getByRole('button', { name: 'New diagram' }));

    expect(
      within(screen.getByRole('region', { name: 'Project diagrams' })).getByRole('button', {
        name: /Sequence flow 3/
      })
    ).toBeInTheDocument();
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent('sequenceDiagram');
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent(
      'participant API as Backend API'
    );
  });

  it('hydrates workspace, project, and diagram lists from the API client', async () => {
    const { apiClient, listProjectDiagrams, listProjects, listWorkspaces } = buildApiClient();

    render(<WorkspaceProjectShell apiClient={apiClient} />);

    expect(await screen.findByRole('button', { name: /API Workspace/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /API Project/ })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /API Diagram/ })).toBeInTheDocument();
    expect(screen.getByLabelText('diagram editor')).toHaveTextContent('API Workspace / API Project');
    expect(listWorkspaces).toHaveBeenCalled();
    expect(listProjects).toHaveBeenCalledWith('workspace-api');
    expect(listProjectDiagrams).toHaveBeenCalledWith('project-api');
  });

  it('creates workspace, project, and diagram entries through the API client', async () => {
    const { apiClient, createDiagram, createProject, createWorkspace } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Project/ });

    await user.type(screen.getByLabelText('Workspace'), 'Release Planning');
    await user.click(screen.getByRole('button', { name: 'Create' }));
    await waitFor(() => expect(createWorkspace).toHaveBeenCalledWith({ name: 'Release Planning' }));

    await user.type(screen.getByLabelText('Project'), 'Sprint Maps');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() =>
      expect(createProject).toHaveBeenCalledWith({
        workspaceId: 'workspace-created',
        name: 'Sprint Maps'
      })
    );

    await user.selectOptions(screen.getByLabelText('Template'), 'sequence-flow');
    await user.click(screen.getByRole('button', { name: 'New diagram' }));
    await waitFor(() =>
      expect(createDiagram).toHaveBeenCalledWith({
        workspaceId: 'workspace-created',
        projectId: 'project-created',
        title: 'Sequence flow 1',
        description: 'Request and response path between actors',
        diagramType: 'sequence',
        themeConfig: { theme: 'default' },
        sourceCode:
          'sequenceDiagram\n  participant User\n  participant Web as Frontend\n  participant API as Backend API\n  User->>Web: Start action\n  Web->>API: Send request\n  API-->>Web: Return response'
      })
    );
  });

  it('saves the selected diagram through the API client', async () => {
    const { apiClient, updateDiagram } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    await user.click(screen.getByRole('button', { name: 'Mock save' }));

    await waitFor(() =>
      expect(updateDiagram).toHaveBeenCalledWith({
        diagramId: 'diagram-api',
        title: 'Saved Diagram',
        description: 'Loaded chart',
        sourceCode: 'sequenceDiagram\nA->>B: saved',
        diagramType: 'flowchart',
        themeConfig: { theme: 'dark' }
      })
    );
  });

  it('loads versions and restores a selected API version', async () => {
    const { apiClient, listDiagramVersions, restoreDiagramVersion } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    expect(
      await within(screen.getByRole('region', { name: 'Project diagrams' })).findByRole('button', {
        name: /API Diagram/
      })
    ).toBeInTheDocument();
    await waitFor(() => expect(listDiagramVersions).toHaveBeenCalledWith('diagram-api'));
    await user.click(
      within(screen.getByRole('region', { name: 'Diagram utilities' })).getByRole('button', {
        name: /Restore snapshot/
      })
    );

    await waitFor(() =>
      expect(restoreDiagramVersion).toHaveBeenCalledWith('diagram-api', 'version-1')
    );
    expect(await screen.findByText('Version restored')).toBeInTheDocument();
  });

  it('exports Mermaid source through the API client', async () => {
    const { apiClient, exportDiagramSource } = buildApiClient();
    const createObjectUrl = vi.fn().mockReturnValue('blob:source');
    const revokeObjectUrl = vi.fn();
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectUrl, configurable: true });
    Object.defineProperty(URL, 'revokeObjectURL', { value: revokeObjectUrl, configurable: true });
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });
    await user.click(screen.getByRole('button', { name: 'Export .mmd' }));

    await waitFor(() => expect(exportDiagramSource).toHaveBeenCalledWith('diagram-api'));
    expect(createObjectUrl).toHaveBeenCalled();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:source');
    expect(anchorClick).toHaveBeenCalled();
    expect(await screen.findByText('Mermaid source exported')).toBeInTheDocument();
    anchorClick.mockRestore();
  });

  it('creates and revokes a read-only share link through the API client', async () => {
    const { apiClient, createShareLink, revokeShareLink } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    await user.click(screen.getByRole('button', { name: 'New share link' }));

    await waitFor(() => expect(createShareLink).toHaveBeenCalledWith('diagram-api'));
    expect(await screen.findByText('Read-only share link created')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Revoke share link/ }));

    await waitFor(() => expect(revokeShareLink).toHaveBeenCalledWith('diagram-api', 'share-1'));
    expect(await screen.findByText('Share link revoked')).toBeInTheDocument();
  });

  it('imports Mermaid source and Markdown blocks through the API client', async () => {
    const { apiClient, importMermaid, parseMarkdownMermaidBlocks } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    await user.type(screen.getByLabelText('Imported .mmd content'), 'flowchart LR\nImported-->B');
    await user.click(screen.getByRole('button', { name: 'Import .mmd' }));
    await waitFor(() =>
      expect(importMermaid).toHaveBeenCalledWith({
        workspaceId: 'workspace-api',
        projectId: 'project-api',
        title: 'Imported diagram 2',
        sourceCode: 'flowchart LR\nImported-->B'
      })
    );

    await user.type(
      screen.getByLabelText('Markdown Mermaid import'),
      '```mermaid\nsequenceDiagram\nA->>B: ok\n```'
    );
    await user.click(screen.getByRole('button', { name: 'Detect blocks' }));
    await waitFor(() => expect(parseMarkdownMermaidBlocks).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Imported block 1/ }));
    await waitFor(() =>
      expect(importMermaid).toHaveBeenCalledWith({
        workspaceId: 'workspace-api',
        projectId: 'project-api',
        title: 'Imported block 1',
        sourceCode: 'sequenceDiagram\nA->>B: ok'
      })
    );
  });

  it('toggles presentation mode and updates governance controls', async () => {
    const { apiClient, enforceRetention, updateWorkspacePolicy } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    await user.click(screen.getByRole('button', { name: 'Present' }));
    expect(screen.getByRole('region', { name: 'Presentation mode' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Exit presentation' }));
    expect(screen.getByLabelText('diagram editor')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Share links'));
    await waitFor(() =>
      expect(updateWorkspacePolicy).toHaveBeenCalledWith({
        workspaceId: 'workspace-api',
        allowShareLinks: false
      })
    );
    await user.click(screen.getByRole('button', { name: 'Enforce retention' }));
    await waitFor(() => expect(enforceRetention).toHaveBeenCalledWith('workspace-api'));
    expect(await screen.findByText(/Retention removed 1 snapshots/)).toBeInTheDocument();
    expect(screen.getByText('diagram.create')).toBeInTheDocument();
  });

  it('loads and creates comments through the API client', async () => {
    const { apiClient, createDiagramComment, listDiagramComments } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });
    await waitFor(() => expect(listDiagramComments).toHaveBeenCalledWith('diagram-api'));

    expect(await screen.findByText('Clarify the backend boundary.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Comment'), 'Looks good.');
    await user.click(screen.getByRole('button', { name: 'Add comment' }));

    await waitFor(() =>
      expect(createDiagramComment).toHaveBeenCalledWith({
        diagramId: 'diagram-api',
        body: 'Looks good.'
      })
    );
    expect(await screen.findByText('Comment added')).toBeInTheDocument();
  });

  it('resolves and reopens comments through the API client', async () => {
    const { apiClient, reopenDiagramComment, resolveDiagramComment } = buildApiClient();
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByText('Clarify the backend boundary.');

    await user.click(screen.getByRole('button', { name: 'Resolve' }));
    await waitFor(() => expect(resolveDiagramComment).toHaveBeenCalledWith('diagram-api', 'comment-1'));
    expect(await screen.findByText('Comment resolved')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reopen' }));
    await waitFor(() => expect(reopenDiagramComment).toHaveBeenCalledWith('diagram-api', 'comment-1'));
    expect(await screen.findByText('Comment reopened')).toBeInTheDocument();
  });

  it('disables edit and comment controls for viewer workspaces', async () => {
    const { apiClient, listWorkspaces } = buildApiClient();
    listWorkspaces.mockResolvedValueOnce([
      {
        id: 'workspace-api',
        name: 'API Workspace',
        slug: 'api-workspace',
        currentUserRole: 'viewer'
      }
    ]);

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    expect(screen.getByRole('button', { name: 'Mock save' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New diagram' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New share link' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add comment' })).toBeDisabled();
    expect(screen.getByLabelText('Project')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(screen.getByLabelText('Imported .mmd content')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Import .mmd' })).toBeDisabled();
    expect(screen.getByLabelText('Markdown Mermaid import')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Detect blocks' })).toBeDisabled();
    expect(
      within(screen.getByRole('region', { name: 'Diagram utilities' })).getByRole('button', {
        name: /Restore snapshot/
      })
    ).toBeDisabled();
    expect(screen.getByLabelText('Share links')).toBeDisabled();
    expect(screen.getByLabelText('Exports')).toBeDisabled();
    expect(screen.getByLabelText('SSO required')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Enforce retention' })).toBeDisabled();
    expect(screen.getByLabelText('Member email')).toBeDisabled();
    expect(screen.getByLabelText('Member role')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Add member' })).toBeDisabled();
    expect(screen.getByLabelText('Role for member@example.com')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDisabled();
  });

  it('limits admin member management to non-admin, non-owner roles', async () => {
    const { apiClient, listWorkspaces } = buildApiClient();
    listWorkspaces.mockResolvedValueOnce([
      {
        id: 'workspace-api',
        name: 'API Workspace',
        slug: 'api-workspace',
        currentUserRole: 'admin'
      }
    ]);
    const user = userEvent.setup();

    render(<WorkspaceProjectShell apiClient={apiClient} />);
    await screen.findByRole('button', { name: /API Diagram/ });

    const addRoleSelect = screen.getByLabelText('Member role');
    expect(within(addRoleSelect).queryByRole('option', { name: 'owner' })).not.toBeInTheDocument();
    expect(within(addRoleSelect).queryByRole('option', { name: 'admin' })).not.toBeInTheDocument();
    expect(within(addRoleSelect).getByRole('option', { name: 'editor' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Role for member@example.com'), 'commenter');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const updateRole = apiClient.updateWorkspaceMemberRole;
    await waitFor(() =>
      expect(updateRole).toHaveBeenCalledWith({
        workspaceId: 'workspace-api',
        userId: 'user-1',
        role: 'commenter'
      })
    );
  });
});
