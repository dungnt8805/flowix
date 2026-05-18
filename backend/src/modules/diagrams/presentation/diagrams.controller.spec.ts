import { DiagramsController } from './diagrams.controller';
import { CreateDiagramUseCase } from '../application/use-cases/create-diagram.use-case';
import { CreateDiagramCommentUseCase } from '../application/use-cases/create-diagram-comment.use-case';
import { CreateDiagramShareLinkUseCase } from '../application/use-cases/create-diagram-share-link.use-case';
import { ExportDiagramSourceUseCase } from '../application/use-cases/export-diagram-source.use-case';
import { GetSharedDiagramUseCase } from '../application/use-cases/get-shared-diagram.use-case';
import { ListDiagramCommentsUseCase } from '../application/use-cases/list-diagram-comments.use-case';
import { ListDiagramVersionsUseCase } from '../application/use-cases/list-diagram-versions.use-case';
import { RequestDiagramSvgExportUseCase } from '../application/use-cases/request-diagram-svg-export.use-case';
import { RestoreDiagramVersionUseCase } from '../application/use-cases/restore-diagram-version.use-case';
import { UpdateDiagramUseCase } from '../application/use-cases/update-diagram.use-case';
import { UpdateDiagramCommentStatusUseCase } from '../application/use-cases/update-diagram-comment-status.use-case';
import { RevokeDiagramShareLinkUseCase } from '../application/use-cases/revoke-diagram-share-link.use-case';
import { Diagram } from '../domain/diagram';
import { DiagramComment } from '../domain/diagram-comment';
import { DiagramVersion } from '../domain/diagram-version';
import { DiagramType } from '../domain/diagram-type';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { WorkspacePolicyService } from '../../workspaces/application/workspace-policy.service';
import { AuditService } from '../../audit/audit.service';
import { DiagramVersionRepository } from '../application/ports/diagram-version.repository';

describe('DiagramsController', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Author'
  };

  function buildController(overrides: {
    create?: unknown;
    update?: unknown;
    createComment?: unknown;
    listComments?: unknown;
    updateCommentStatus?: unknown;
    listVersions?: unknown;
    restore?: unknown;
    exportSource?: unknown;
    svgExport?: unknown;
    createShare?: unknown;
    revokeShare?: unknown;
    getShared?: unknown;
    policy?: unknown;
    audit?: unknown;
    versionRepository?: unknown;
  } = {}): DiagramsController {
    return new DiagramsController(
      (overrides.create ?? { execute: jest.fn() }) as CreateDiagramUseCase,
      (overrides.update ?? { execute: jest.fn() }) as UpdateDiagramUseCase,
      (overrides.createComment ?? { execute: jest.fn() }) as CreateDiagramCommentUseCase,
      (overrides.listComments ?? { execute: jest.fn() }) as ListDiagramCommentsUseCase,
      (overrides.updateCommentStatus ?? { execute: jest.fn() }) as UpdateDiagramCommentStatusUseCase,
      (overrides.listVersions ?? { execute: jest.fn() }) as ListDiagramVersionsUseCase,
      (overrides.restore ?? { execute: jest.fn() }) as RestoreDiagramVersionUseCase,
      (overrides.exportSource ?? { execute: jest.fn() }) as ExportDiagramSourceUseCase,
      (overrides.svgExport ?? { execute: jest.fn() }) as RequestDiagramSvgExportUseCase,
      (overrides.createShare ?? { execute: jest.fn() }) as CreateDiagramShareLinkUseCase,
      (overrides.revokeShare ?? { execute: jest.fn() }) as RevokeDiagramShareLinkUseCase,
      (overrides.getShared ?? { execute: jest.fn() }) as GetSharedDiagramUseCase,
      (overrides.policy ?? {
        getPolicy: jest.fn().mockResolvedValue({
          workspaceId: '22222222-2222-4222-8222-222222222222',
          allowShareLinks: true,
          allowExports: true,
          retentionDays: 365,
          ssoRequired: false
        }),
        requireAdmin: jest.fn().mockResolvedValue(undefined),
        requireExportsAllowed: jest.fn().mockResolvedValue(undefined),
        requireShareLinksAllowed: jest.fn().mockResolvedValue(undefined)
      }) as WorkspacePolicyService,
      (overrides.audit ?? {
        record: jest.fn().mockResolvedValue(undefined),
        purgeBefore: jest.fn().mockResolvedValue(0)
      }) as unknown as AuditService,
      (overrides.versionRepository ?? {
        save: jest.fn(),
        findById: jest.fn(),
        findLatestByDiagramId: jest.fn(),
        listByDiagramId: jest.fn(),
        deleteOlderThan: jest.fn().mockResolvedValue(0)
      }) as DiagramVersionRepository
    );
  }

  it('should create a diagram and return an API response', async () => {
    const diagram = Diagram.create({
      id: 'diagram-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System context',
      description: 'High-level system design',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      createdBy: '11111111-1111-4111-8111-111111111111',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });
    const execute = jest.fn().mockResolvedValue(diagram);
    const controller = buildController({ create: { execute } });

    const response = await controller.createDiagram(user, {
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System context',
      description: 'High-level system design',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      themeConfig: { theme: 'forest' }
    });

    expect(execute).toHaveBeenCalledWith({
      user,
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System context',
      description: 'High-level system design',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      themeConfig: { theme: 'forest' }
    });
    expect(response).toEqual({
      id: 'diagram-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'System context',
      description: 'High-level system design',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      themeConfig: { theme: 'default' }
    });
  });

  it('imports Mermaid source and records an audit event', async () => {
    const diagram = Diagram.create({
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Imported',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      createdBy: user.id
    });
    const create = { execute: jest.fn().mockResolvedValue(diagram) };
    const audit = { record: jest.fn().mockResolvedValue(undefined), purgeBefore: jest.fn() };
    const controller = buildController({ create, audit });

    const response = await controller.importMermaidSource(user, {
      workspaceId: diagram.workspaceId,
      projectId: diagram.projectId,
      title: 'Imported',
      sourceCode: 'flowchart LR\nA-->B'
    });

    expect(create.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        user,
        diagramType: DiagramType.FLOWCHART,
        themeConfig: { theme: 'default' }
      })
    );
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'diagram.import_mmd' }));
    expect(response.id).toBe(diagram.id);
  });

  it('parses Markdown Mermaid blocks and validates public render requests', () => {
    const controller = buildController();

    expect(
      controller.parseMarkdownMermaidBlocks({
        markdown: '```mermaid\nsequenceDiagram\nA->>B: ok\n```'
      })
    ).toEqual([
      {
        index: 0,
        title: 'Imported block 1',
        sourceCode: 'sequenceDiagram\nA->>B: ok'
      }
    ]);
    expect(controller.validatePublicDiagram({ sourceCode: 'flowchart LR\nA-->B' })).toEqual({
      valid: true,
      diagramType: DiagramType.FLOWCHART,
      warnings: []
    });
    expect(controller.renderPublicDiagram({ sourceCode: 'flowchart LR\nA-->B' })).toEqual(
      expect.objectContaining({ status: 'accepted', renderer: 'client-mermaid' })
    );
  });

  it('enforces retention using workspace policy cutoff', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-16T00:00:00.000Z'));
    const policy = {
      getPolicy: jest.fn().mockResolvedValue({
        workspaceId: '22222222-2222-4222-8222-222222222222',
        allowShareLinks: true,
        allowExports: true,
        retentionDays: 30,
        ssoRequired: false
      }),
      requireAdmin: jest.fn().mockResolvedValue(undefined),
      requireExportsAllowed: jest.fn(),
      requireShareLinksAllowed: jest.fn()
    };
    const audit = {
      record: jest.fn().mockResolvedValue(undefined),
      purgeBefore: jest.fn().mockResolvedValue(2)
    };
    const versionRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findLatestByDiagramId: jest.fn(),
      listByDiagramId: jest.fn(),
      deleteOlderThan: jest.fn().mockResolvedValue(3)
    };
    const controller = buildController({ policy, audit, versionRepository });

    const response = await controller.enforceRetention(
      user,
      '22222222-2222-4222-8222-222222222222'
    );

    expect(policy.requireAdmin).toHaveBeenCalledWith(user, '22222222-2222-4222-8222-222222222222');
    expect(versionRepository.deleteOlderThan).toHaveBeenCalled();
    expect(audit.purgeBefore).toHaveBeenCalled();
    expect(response.deletedVersions).toBe(3);
    expect(response.deletedAuditEvents).toBe(2);
    jest.useRealTimers();
  });

  it('should update a diagram and return an API response', async () => {
    const diagram = Diagram.create({
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Updated context',
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: DiagramType.SEQUENCE,
      createdBy: user.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z')
    });
    const execute = jest.fn().mockResolvedValue(diagram);
    const controller = buildController({ update: { execute } });

    const response = await controller.updateDiagram(user, diagram.id, {
      title: 'Updated context',
      description: null,
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: DiagramType.SEQUENCE,
      themeConfig: { theme: 'dark' }
    });

    expect(execute).toHaveBeenCalledWith({
      user,
      diagramId: diagram.id,
      title: 'Updated context',
      description: null,
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: DiagramType.SEQUENCE,
      themeConfig: { theme: 'dark' }
    });
    expect(response).toEqual({
      id: diagram.id,
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Updated context',
      description: null,
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: DiagramType.SEQUENCE,
      themeConfig: { theme: 'default' }
    });
  });

  it('should list diagram versions and return API responses', async () => {
    const version = DiagramVersion.create({
      id: '55555555-5555-4555-8555-555555555555',
      diagramId: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Saved context',
      description: 'Version description',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      createdBy: user.id,
      createdAt: new Date('2026-01-03T00:00:00.000Z')
    });
    const execute = jest.fn().mockResolvedValue([version]);
    const controller = buildController({ listVersions: { execute } });

    const response = await controller.listDiagramVersions(user, version.diagramId);

    expect(execute).toHaveBeenCalledWith({
      user,
      diagramId: version.diagramId
    });
    expect(response).toEqual([
      {
        id: version.id,
        diagramId: version.diagramId,
        workspaceId: version.workspaceId,
        projectId: version.projectId,
        title: 'Saved context',
        description: 'Version description',
        sourceCode: 'flowchart LR\nA-->B',
        diagramType: DiagramType.FLOWCHART,
        themeConfig: { theme: 'default' },
        createdBy: user.id,
        createdAt: '2026-01-03T00:00:00.000Z'
      }
    ]);
  });

  it('should create and list diagram comments', async () => {
    const comment = DiagramComment.create({
      id: '66666666-6666-4666-8666-666666666666',
      diagramId: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      authorId: user.id,
      body: 'Looks good after the auth note.',
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z')
    });
    const createExecute = jest.fn().mockResolvedValue(comment);
    const listExecute = jest.fn().mockResolvedValue([comment]);
    const controller = buildController({
      createComment: { execute: createExecute },
      listComments: { execute: listExecute }
    });

    const created = await controller.createDiagramComment(user, comment.diagramId, {
      body: 'Looks good after the auth note.'
    });
    const listed = await controller.listDiagramComments(user, comment.diagramId);

    expect(createExecute).toHaveBeenCalledWith({
      user,
      diagramId: comment.diagramId,
      body: 'Looks good after the auth note.',
      anchor: undefined
    });
    expect(listExecute).toHaveBeenCalledWith(user, comment.diagramId);
    expect(created.body).toBe('Looks good after the auth note.');
    expect(listed).toEqual([created]);
  });

  it('should resolve and reopen diagram comments', async () => {
    const openComment = DiagramComment.create({
      id: '66666666-6666-4666-8666-666666666666',
      diagramId: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      authorId: user.id,
      body: 'Resolve me',
      createdAt: new Date('2026-01-04T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z')
    });
    const execute = jest
      .fn()
      .mockResolvedValueOnce(openComment.resolve())
      .mockResolvedValueOnce(openComment.reopen());
    const controller = buildController({ updateCommentStatus: { execute } });

    const resolved = await controller.resolveDiagramComment(user, openComment.diagramId, openComment.id);
    const reopened = await controller.reopenDiagramComment(user, openComment.diagramId, openComment.id);

    expect(execute).toHaveBeenNthCalledWith(1, {
      user,
      diagramId: openComment.diagramId,
      commentId: openComment.id,
      status: 'resolved'
    });
    expect(execute).toHaveBeenNthCalledWith(2, {
      user,
      diagramId: openComment.diagramId,
      commentId: openComment.id,
      status: 'open'
    });
    expect(resolved.status).toBe('resolved');
    expect(reopened.status).toBe('open');
  });

  it('should restore a diagram version and return the restored diagram', async () => {
    const diagram = Diagram.create({
      id: '44444444-4444-4444-8444-444444444444',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Restored',
      sourceCode: 'flowchart LR\nA-->Restored',
      diagramType: DiagramType.FLOWCHART,
      createdBy: user.id
    });
    const execute = jest.fn().mockResolvedValue(diagram);
    const controller = buildController({ restore: { execute } });

    const response = await controller.restoreDiagramVersion(
      user,
      diagram.id,
      '55555555-5555-4555-8555-555555555555'
    );

    expect(execute).toHaveBeenCalledWith({
      user,
      diagramId: diagram.id,
      versionId: '55555555-5555-4555-8555-555555555555'
    });
    expect(response.title).toBe('Restored');
  });

  it('should export Mermaid source with a safe filename', async () => {
    const execute = jest.fn().mockResolvedValue({
      filename: 'system-context.mmd',
      sourceCode: 'flowchart LR\nA-->B'
    });
    const setHeader = jest.fn();
    const controller = buildController({ exportSource: { execute } });

    const response = await controller.exportDiagramSource(
      user,
      '44444444-4444-4444-8444-444444444444',
      { setHeader } as never
    );

    expect(execute).toHaveBeenCalledWith({
      user,
      diagramId: '44444444-4444-4444-8444-444444444444'
    });
    expect(setHeader).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="system-context.mmd"');
    expect(response).toBe('flowchart LR\nA-->B');
  });

  it('should return the SVG export contract status', async () => {
    const execute = jest.fn().mockResolvedValue({
      status: 'not_available',
      format: 'svg',
      message: 'SVG export requires the renderer job pipeline and is not available in this sprint.'
    });
    const controller = buildController({ svgExport: { execute } });

    const response = await controller.requestDiagramSvgExport(
      user,
      '44444444-4444-4444-8444-444444444444'
    );

    expect(response.status).toBe('not_available');
    expect(response.format).toBe('svg');
  });
});
