import { afterEach, describe, expect, it, vi } from 'vitest';
import { FloVisApiClient, FloVisApiError } from './floVisApiClient';

describe('FloVisApiClient', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('adds auth headers and maps project responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: 'project-1',
            workspaceId: 'workspace-1',
            name: 'Architecture',
            description: null,
            status: 'active'
          }
        ])
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001/',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    const projects = await client.listProjects('workspace-1');

    expect(projects).toEqual([
      {
        id: 'project-1',
        workspaceId: 'workspace-1',
        name: 'Architecture',
        description: null
      }
    ]);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/workspaces/workspace-1/projects', {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '11111111-1111-4111-8111-111111111111',
        'x-user-email': 'user@example.com'
      }
    });
  });

  it('prefers bearer auth when an access token is available', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001/',
      accessToken: 'access-token'
    });

    await client.listWorkspaces();

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/workspaces', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer access-token'
      }
    });
  });

  it('maps diagram responses with a synced timestamp label', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'diagram-1',
              workspaceId: 'workspace-1',
              projectId: 'project-1',
              title: 'System',
              description: 'Context',
              diagramType: 'flowchart',
              sourceCode: 'flowchart LR\nA-->B'
            }
          ])
      })
    );
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.listProjectDiagrams('project-1')).resolves.toEqual([
      {
        id: 'diagram-1',
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        title: 'System',
        description: 'Context',
        diagramType: 'flowchart',
        themeConfig: { theme: 'default' },
        sourceCode: 'flowchart LR\nA-->B',
        updatedAtLabel: 'Synced'
      }
    ]);
  });

  it('updates diagrams through the PATCH endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 'diagram-1',
          workspaceId: 'workspace-1',
          projectId: 'project-1',
          title: 'Updated',
          description: null,
          diagramType: 'sequence',
          sourceCode: 'sequenceDiagram\nA->>B: ok'
        })
    });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    const diagram = await client.updateDiagram({
      diagramId: 'diagram-1',
      title: 'Updated',
      description: null,
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: 'sequence'
    });

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3001/api/v1/diagrams/diagram-1', {
      method: 'PATCH',
      body: JSON.stringify({
        title: 'Updated',
        description: null,
        sourceCode: 'sequenceDiagram\nA->>B: ok',
        diagramType: 'sequence'
      }),
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': '11111111-1111-4111-8111-111111111111',
        'x-user-email': 'user@example.com'
      }
    });
    expect(diagram.updatedAtLabel).toBe('Synced');
  });

  it('manages workspace members through workspace endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'member-1',
              workspaceId: 'workspace-1',
              userId: 'user-1',
              email: 'member@example.com',
              displayName: 'Member',
              role: 'viewer',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'member-2',
            workspaceId: 'workspace-1',
            userId: 'user-2',
            email: 'new@example.com',
            displayName: null,
            role: 'commenter',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'member-2',
            workspaceId: 'workspace-1',
            userId: 'user-2',
            email: 'new@example.com',
            displayName: null,
            role: 'editor',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ removed: true })
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      accessToken: 'access-token'
    });

    await expect(client.listWorkspaceMembers('workspace-1')).resolves.toHaveLength(1);
    await expect(
      client.addWorkspaceMember({ workspaceId: 'workspace-1', email: 'new@example.com', role: 'commenter' })
    ).resolves.toEqual(expect.objectContaining({ role: 'commenter' }));
    await expect(
      client.updateWorkspaceMemberRole({ workspaceId: 'workspace-1', userId: 'user-2', role: 'editor' })
    ).resolves.toEqual(expect.objectContaining({ role: 'editor' }));
    await expect(client.removeWorkspaceMember('workspace-1', 'user-2')).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/v1/workspaces/workspace-1/members',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'new@example.com', role: 'commenter' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/v1/workspaces/workspace-1/members/user-2',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ role: 'editor' })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/api/v1/workspaces/workspace-1/members/user-2',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('lists and restores diagram versions', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'version-1',
              diagramId: 'diagram-1',
              workspaceId: 'workspace-1',
              projectId: 'project-1',
              title: 'Saved',
              description: null,
              diagramType: 'flowchart',
              sourceCode: 'flowchart LR\nA-->B',
              createdBy: '11111111-1111-4111-8111-111111111111',
              createdAt: '2026-01-01T00:00:00.000Z'
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'diagram-1',
            workspaceId: 'workspace-1',
            projectId: 'project-1',
            title: 'Saved',
            description: null,
            diagramType: 'flowchart',
            sourceCode: 'flowchart LR\nA-->B'
          })
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.listDiagramVersions('diagram-1')).resolves.toHaveLength(1);
    await expect(client.restoreDiagramVersion('diagram-1', 'version-1')).resolves.toEqual(
      expect.objectContaining({ id: 'diagram-1', updatedAtLabel: 'Synced' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/v1/diagrams/diagram-1/versions',
      {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': '11111111-1111-4111-8111-111111111111',
          'x-user-email': 'user@example.com'
        }
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/v1/diagrams/diagram-1/versions/version-1/restore',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('lists and creates diagram comments', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'comment-1',
              diagramId: 'diagram-1',
              workspaceId: 'workspace-1',
              authorId: '11111111-1111-4111-8111-111111111111',
              body: 'Clarify this edge.',
              anchor: null,
              status: 'open',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z'
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'comment-2',
            diagramId: 'diagram-1',
            workspaceId: 'workspace-1',
            authorId: '11111111-1111-4111-8111-111111111111',
            body: 'Looks good.',
            anchor: null,
            status: 'open',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'comment-2',
            diagramId: 'diagram-1',
            workspaceId: 'workspace-1',
            authorId: '11111111-1111-4111-8111-111111111111',
            body: 'Looks good.',
            anchor: null,
            status: 'resolved',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-03T00:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'comment-2',
            diagramId: 'diagram-1',
            workspaceId: 'workspace-1',
            authorId: '11111111-1111-4111-8111-111111111111',
            body: 'Looks good.',
            anchor: null,
            status: 'open',
            createdAt: '2026-01-02T00:00:00.000Z',
            updatedAt: '2026-01-04T00:00:00.000Z'
          })
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.listDiagramComments('diagram-1')).resolves.toHaveLength(1);
    await expect(
      client.createDiagramComment({
        diagramId: 'diagram-1',
        body: 'Looks good.'
      })
    ).resolves.toEqual(expect.objectContaining({ id: 'comment-2', body: 'Looks good.' }));
    await expect(client.resolveDiagramComment('diagram-1', 'comment-2')).resolves.toEqual(
      expect.objectContaining({ status: 'resolved' })
    );
    await expect(client.reopenDiagramComment('diagram-1', 'comment-2')).resolves.toEqual(
      expect.objectContaining({ status: 'open' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/v1/diagrams/diagram-1/comments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: 'Looks good.', anchor: undefined })
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/v1/diagrams/diagram-1/comments/comment-2/resolve',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      'http://localhost:3001/api/v1/diagrams/diagram-1/comments/comment-2/reopen',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('exports Mermaid source from the source export endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        headers: new Headers({ 'content-disposition': 'attachment; filename="system.mmd"' }),
        text: () => Promise.resolve('flowchart LR\nA-->B')
      })
    );
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.exportDiagramSource('diagram-1')).resolves.toEqual({
      filename: 'system.mmd',
      sourceCode: 'flowchart LR\nA-->B'
    });
  });

  it('creates, revokes, and opens share links', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'share-1',
            diagramId: 'diagram-1',
            token: 'token-1',
            url: '/share/token-1',
            revokedAt: null,
            createdAt: '2026-01-01T00:00:00.000Z'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'revoked' })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'diagram-1',
            workspaceId: 'workspace-1',
            projectId: 'project-1',
            title: 'Shared',
            description: null,
            diagramType: 'flowchart',
            sourceCode: 'flowchart LR\nA-->B'
          })
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.createShareLink('diagram-1')).resolves.toEqual(
      expect.objectContaining({ token: 'token-1' })
    );
    await expect(client.revokeShareLink('diagram-1', 'share-1')).resolves.toBeUndefined();
    await expect(client.getSharedDiagram('token-1')).resolves.toEqual(
      expect.objectContaining({ title: 'Shared', updatedAtLabel: 'Synced' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      'http://localhost:3001/api/v1/diagrams/shared/token-1'
    );
  });

  it('imports Mermaid and parses Markdown blocks', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'diagram-import',
            workspaceId: 'workspace-1',
            projectId: 'project-1',
            title: 'Imported',
            description: null,
            diagramType: 'flowchart',
            sourceCode: 'flowchart LR\nA-->B'
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              index: 0,
              title: 'Imported block 1',
              sourceCode: 'sequenceDiagram\nA->>B: ok'
            }
          ])
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(
      client.importMermaid({
        workspaceId: 'workspace-1',
        projectId: 'project-1',
        title: 'Imported',
        sourceCode: 'flowchart LR\nA-->B'
      })
    ).resolves.toEqual(expect.objectContaining({ id: 'diagram-import', updatedAtLabel: 'Synced' }));
    await expect(client.parseMarkdownMermaidBlocks('```mermaid\nsequenceDiagram\nA->>B: ok\n```')).resolves.toHaveLength(1);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      'http://localhost:3001/api/v1/diagrams/import/mmd',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      'http://localhost:3001/api/v1/diagrams/import/markdown-blocks',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('reads governance, identity, and retention endpoints', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            workspaceId: 'workspace-1',
            allowShareLinks: true,
            allowExports: false,
            retentionDays: 180,
            ssoRequired: true
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            workspaceId: 'workspace-1',
            allowShareLinks: false,
            allowExports: false,
            retentionDays: 365,
            ssoRequired: true
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              id: 'audit-1',
              workspaceId: 'workspace-1',
              actorId: null,
              action: 'diagram.create',
              targetType: 'diagram',
              targetId: 'diagram-1',
              metadata: {},
              createdAt: '2026-01-01T00:00:00.000Z'
            }
          ])
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            workspaceId: 'workspace-1',
            strategy: 'oidc',
            status: 'specified',
            loginUrl: '/api/v1/auth/oidc/start',
            requiredClaims: ['sub', 'email']
          })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            workspaceId: 'workspace-1',
            cutoff: '2026-01-01T00:00:00.000Z',
            deletedVersions: 2,
            deletedAuditEvents: 1
          })
      });
    vi.stubGlobal('fetch', fetchMock);
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.getWorkspacePolicy('workspace-1')).resolves.toEqual(
      expect.objectContaining({ retentionDays: 180 })
    );
    await expect(
      client.updateWorkspacePolicy({
        workspaceId: 'workspace-1',
        allowShareLinks: false,
        retentionDays: 365
      })
    ).resolves.toEqual(expect.objectContaining({ allowShareLinks: false }));
    await expect(client.listAuditEvents('workspace-1')).resolves.toHaveLength(1);
    await expect(client.getEnterpriseIdentity('workspace-1')).resolves.toEqual(
      expect.objectContaining({ strategy: 'oidc' })
    );
    await expect(client.enforceRetention('workspace-1')).resolves.toEqual(
      expect.objectContaining({ deletedVersions: 2 })
    );
  });

  it('throws structured API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        json: () => Promise.resolve({ message: 'Forbidden' })
      })
    );
    const client = new FloVisApiClient({
      baseUrl: 'http://localhost:3001',
      userId: '11111111-1111-4111-8111-111111111111',
      userEmail: 'user@example.com'
    });

    await expect(client.listWorkspaces()).rejects.toEqual(new FloVisApiError('Forbidden', 403));
  });
});
