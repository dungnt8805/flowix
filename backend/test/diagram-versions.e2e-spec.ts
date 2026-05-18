import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { Server } from 'node:http';
import * as request from 'supertest';
import { HeaderAuthGuard } from '../src/common/auth/header-auth.guard';
import { CurrentUserSyncService } from '../src/modules/auth/application/current-user-sync.service';
import { DIAGRAM_VERSION_REPOSITORY } from '../src/modules/diagrams/application/ports/diagram-version.repository';
import { DiagramVersionRepository } from '../src/modules/diagrams/application/ports/diagram-version.repository';
import { DIAGRAM_REPOSITORY, DiagramRepository } from '../src/modules/diagrams/application/ports/diagram.repository';
import { CreateDiagramUseCase } from '../src/modules/diagrams/application/use-cases/create-diagram.use-case';
import { CreateDiagramCommentUseCase } from '../src/modules/diagrams/application/use-cases/create-diagram-comment.use-case';
import { CreateDiagramShareLinkUseCase } from '../src/modules/diagrams/application/use-cases/create-diagram-share-link.use-case';
import { ExportDiagramSourceUseCase } from '../src/modules/diagrams/application/use-cases/export-diagram-source.use-case';
import { GetSharedDiagramUseCase } from '../src/modules/diagrams/application/use-cases/get-shared-diagram.use-case';
import { ListDiagramCommentsUseCase } from '../src/modules/diagrams/application/use-cases/list-diagram-comments.use-case';
import { ListDiagramVersionsUseCase } from '../src/modules/diagrams/application/use-cases/list-diagram-versions.use-case';
import { RequestDiagramSvgExportUseCase } from '../src/modules/diagrams/application/use-cases/request-diagram-svg-export.use-case';
import { RevokeDiagramShareLinkUseCase } from '../src/modules/diagrams/application/use-cases/revoke-diagram-share-link.use-case';
import { RestoreDiagramVersionUseCase } from '../src/modules/diagrams/application/use-cases/restore-diagram-version.use-case';
import { UpdateDiagramUseCase } from '../src/modules/diagrams/application/use-cases/update-diagram.use-case';
import { UpdateDiagramCommentStatusUseCase } from '../src/modules/diagrams/application/use-cases/update-diagram-comment-status.use-case';
import { Diagram } from '../src/modules/diagrams/domain/diagram';
import { DiagramVersion } from '../src/modules/diagrams/domain/diagram-version';
import { DiagramType } from '../src/modules/diagrams/domain/diagram-type';
import { DiagramsController } from '../src/modules/diagrams/presentation/diagrams.controller';
import { AuditService } from '../src/modules/audit/audit.service';
import { PROJECT_REPOSITORY, ProjectRepository } from '../src/modules/workspaces/application/ports/project.repository';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from '../src/modules/workspaces/application/ports/workspace-member.repository';
import { WorkspacePolicyService } from '../src/modules/workspaces/application/workspace-policy.service';
import { Project } from '../src/modules/workspaces/domain/project';
import { WorkspaceMemberRole } from '../src/modules/workspaces/domain/workspace-member-role';

describe('Diagram versions routes', () => {
  const user = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'editor@example.com',
    displayName: 'Diagram Editor'
  };
  const viewer = {
    id: '99999999-9999-4999-8999-999999999999',
    email: 'viewer@example.com',
    displayName: 'Diagram Viewer'
  };
  const diagramId = '44444444-4444-4444-8444-444444444444';
  const workspaceId = '22222222-2222-4222-8222-222222222222';
  const projectId = '33333333-3333-4333-8333-333333333333';

  let app: INestApplication;
  let diagram: Diagram;
  let versions: DiagramVersion[];
  let membershipRoleByUserId: Map<string, WorkspaceMemberRole>;
  let currentUserSyncService: jest.Mocked<CurrentUserSyncService>;
  let diagramRepository: jest.Mocked<DiagramRepository>;
  let diagramVersionRepository: jest.Mocked<DiagramVersionRepository>;

  beforeEach(async () => {
    diagram = Diagram.create({
      id: diagramId,
      workspaceId,
      projectId,
      title: 'Original',
      description: 'Initial version',
      sourceCode: 'flowchart LR\nA-->B',
      diagramType: DiagramType.FLOWCHART,
      createdBy: user.id,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z')
    });
    versions = [];
    membershipRoleByUserId = new Map<string, WorkspaceMemberRole>([
      [user.id, WorkspaceMemberRole.EDITOR],
      [viewer.id, WorkspaceMemberRole.VIEWER]
    ]);

    currentUserSyncService = {
      ensureUser: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<CurrentUserSyncService>;
    diagramRepository = {
      save: jest.fn((nextDiagram: Diagram) => {
        diagram = nextDiagram;
        return Promise.resolve(diagram);
      }),
      findById: jest.fn((id: string) => Promise.resolve(id === diagram.id ? diagram : null)),
      listByProjectId: jest.fn()
    };
    diagramVersionRepository = {
      save: jest.fn((version: DiagramVersion) => {
        versions = [version, ...versions];
        return Promise.resolve(version);
      }),
      findById: jest.fn((id: string) =>
        Promise.resolve(versions.find((version) => version.id === id) ?? null)
      ),
      findLatestByDiagramId: jest.fn((id: string) =>
        Promise.resolve(versions.find((version) => version.diagramId === id) ?? null)
      ),
      listByDiagramId: jest.fn((id: string) =>
        Promise.resolve(versions.filter((version) => version.diagramId === id))
      )
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn((id: string) => {
        if (id !== projectId) {
          return Promise.resolve(null);
        }

        return Promise.resolve(
          Project.create({
            id: projectId,
            workspaceId,
            name: 'Architecture',
            createdBy: user.id
          })
        );
      }),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: jest.Mocked<WorkspaceMemberRepository> = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn((memberWorkspaceId: string, memberUserId: string) => {
        const role = membershipRoleByUserId.get(memberUserId);
        if (memberWorkspaceId !== workspaceId || role === undefined) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          id: `member-${memberUserId}`,
          workspaceId,
          userId: memberUserId,
          role,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z')
        });
      })
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [DiagramsController],
      providers: [
        { provide: APP_GUARD, useClass: HeaderAuthGuard },
        { provide: CreateDiagramUseCase, useValue: { execute: jest.fn() } },
        UpdateDiagramUseCase,
        { provide: CreateDiagramCommentUseCase, useValue: { execute: jest.fn() } },
        { provide: ListDiagramCommentsUseCase, useValue: { execute: jest.fn() } },
        { provide: UpdateDiagramCommentStatusUseCase, useValue: { execute: jest.fn() } },
        ListDiagramVersionsUseCase,
        RestoreDiagramVersionUseCase,
        ExportDiagramSourceUseCase,
        RequestDiagramSvgExportUseCase,
        { provide: CreateDiagramShareLinkUseCase, useValue: { execute: jest.fn() } },
        { provide: RevokeDiagramShareLinkUseCase, useValue: { execute: jest.fn() } },
        { provide: GetSharedDiagramUseCase, useValue: { execute: jest.fn() } },
        {
          provide: WorkspacePolicyService,
          useValue: {
            getPolicy: jest.fn(),
            requireAdmin: jest.fn(),
            requireExportsAllowed: jest.fn().mockResolvedValue(undefined),
            requireShareLinksAllowed: jest.fn().mockResolvedValue(undefined)
          }
        },
        {
          provide: AuditService,
          useValue: {
            record: jest.fn().mockResolvedValue(undefined),
            purgeBefore: jest.fn()
          }
        },
        { provide: CurrentUserSyncService, useValue: currentUserSyncService },
        { provide: DIAGRAM_REPOSITORY, useValue: diagramRepository },
        { provide: DIAGRAM_VERSION_REPOSITORY, useValue: diagramVersionRepository },
        { provide: PROJECT_REPOSITORY, useValue: projectRepository },
        { provide: WORKSPACE_MEMBER_REPOSITORY, useValue: workspaceMemberRepository }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true
      })
    );
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('creates one version snapshot on update and lists it newest first', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .patch(`/api/v1/diagrams/${diagramId}`)
      .set('x-user-id', user.id)
      .set('x-user-email', user.email)
      .send({
        title: 'Updated',
        description: null,
        sourceCode: 'sequenceDiagram\nA->>B: ok',
        diagramType: DiagramType.SEQUENCE
      })
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual({
          id: diagramId,
          workspaceId,
          projectId,
          title: 'Updated',
          description: null,
          sourceCode: 'sequenceDiagram\nA->>B: ok',
          diagramType: DiagramType.SEQUENCE,
          themeConfig: { theme: 'default' }
        });
      });

    await request(server)
      .get(`/api/v1/diagrams/${diagramId}/versions`)
      .set('x-user-id', viewer.id)
      .set('x-user-email', viewer.email)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual([
          expect.objectContaining({
            diagramId,
            workspaceId,
            projectId,
            title: 'Updated',
            description: null,
            sourceCode: 'sequenceDiagram\nA->>B: ok',
            diagramType: DiagramType.SEQUENCE,
            themeConfig: { theme: 'default' },
            createdBy: user.id
          })
        ]);
      });

    expect(diagramRepository.save.mock.calls).toHaveLength(1);
    expect(diagramVersionRepository.save.mock.calls).toHaveLength(1);
  });

  it('does not create a duplicate snapshot when the latest version matches the saved diagram', async () => {
    const server = app.getHttpServer() as Server;
    const requestBody = {
      title: 'Updated',
      sourceCode: 'flowchart LR\nA-->B\nB-->C',
      diagramType: DiagramType.FLOWCHART
    };

    await request(server)
      .patch(`/api/v1/diagrams/${diagramId}`)
      .set('x-user-id', user.id)
      .set('x-user-email', user.email)
      .send(requestBody)
      .expect(200);
    await request(server)
      .patch(`/api/v1/diagrams/${diagramId}`)
      .set('x-user-id', user.id)
      .set('x-user-email', user.email)
      .send(requestBody)
      .expect(200);

    await request(server)
      .get(`/api/v1/diagrams/${diagramId}/versions`)
      .set('x-user-id', user.id)
      .set('x-user-email', user.email)
      .expect(200)
      .expect((response) => {
        expect(response.body).toHaveLength(1);
      });

    expect(diagramRepository.save.mock.calls).toHaveLength(2);
    expect(diagramVersionRepository.save.mock.calls).toHaveLength(1);
  });

  it('rejects unauthenticated version requests before reaching use cases', async () => {
    const server = app.getHttpServer() as Server;

    await request(server).get(`/api/v1/diagrams/${diagramId}/versions`).expect(401);

    expect(currentUserSyncService.ensureUser.mock.calls).toEqual([]);
  });

  it('rejects viewer updates while allowing viewer version reads', async () => {
    const server = app.getHttpServer() as Server;

    await request(server)
      .patch(`/api/v1/diagrams/${diagramId}`)
      .set('x-user-id', viewer.id)
      .set('x-user-email', viewer.email)
      .send({ title: 'Viewer change' })
      .expect(403);

    await request(server)
      .get(`/api/v1/diagrams/${diagramId}/versions`)
      .set('x-user-id', viewer.id)
      .set('x-user-email', viewer.email)
      .expect(200)
      .expect([]);
  });
});
