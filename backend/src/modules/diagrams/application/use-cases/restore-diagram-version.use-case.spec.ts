import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { Diagram } from '../../domain/diagram';
import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramType } from '../../domain/diagram-type';
import { DiagramVersionRepository } from '../ports/diagram-version.repository';
import { DiagramRepository } from '../ports/diagram.repository';
import { RestoreDiagramVersionUseCase } from './restore-diagram-version.use-case';

describe('RestoreDiagramVersionUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Editor'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'Current',
    sourceCode: 'flowchart LR\nA-->B',
    diagramType: DiagramType.FLOWCHART,
    createdBy: user.id
  });
  const version = DiagramVersion.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: diagram.id,
    workspaceId: diagram.workspaceId,
    projectId: diagram.projectId,
    title: 'Restored',
    sourceCode: 'sequenceDiagram\nA->>B: restored',
    diagramType: DiagramType.SEQUENCE,
    themeConfig: { theme: 'neutral' },
    createdBy: user.id
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.EDITOR): {
    diagramRepository: jest.Mocked<DiagramRepository>;
    diagramVersionRepository: jest.Mocked<DiagramVersionRepository>;
    useCase: RestoreDiagramVersionUseCase;
  } {
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save: jest.fn((updated: Diagram) => Promise.resolve(updated)),
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const diagramVersionRepository: jest.Mocked<DiagramVersionRepository> = {
      save: jest.fn((snapshot: DiagramVersion) => Promise.resolve(snapshot)),
      findById: jest.fn().mockResolvedValue(version),
      findLatestByDiagramId: jest.fn(),
      listByDiagramId: jest.fn()
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(
        Project.create({
          id: diagram.projectId,
          workspaceId: diagram.workspaceId,
          name: 'Architecture',
          createdBy: user.id
        })
      ),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: jest.Mocked<WorkspaceMemberRepository> = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn().mockResolvedValue(
        role === null
          ? null
          : {
              id: 'member-1',
              workspaceId: diagram.workspaceId,
              userId: user.id,
              role,
              createdAt: new Date(),
              updatedAt: new Date()
            }
      )
    };
    const useCase = new RestoreDiagramVersionUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository,
      diagramVersionRepository
    );

    return { diagramRepository, diagramVersionRepository, useCase };
  }

  it('restores a version and creates a fresh snapshot', async () => {
    const { diagramRepository, diagramVersionRepository, useCase } = buildUseCase();

    const restored = await useCase.execute({
      user,
      diagramId: diagram.id,
      versionId: version.id
    });

    expect(restored.title).toBe('Restored');
    expect(restored.sourceCode).toBe('sequenceDiagram\nA->>B: restored');
    expect(restored.diagramType).toBe(DiagramType.SEQUENCE);
    expect(restored.themeConfig).toEqual({ theme: 'neutral' });
    expect(diagramRepository.save.mock.calls).toHaveLength(1);
    expect(diagramVersionRepository.save.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        diagramId: diagram.id,
        title: 'Restored',
        sourceCode: 'sequenceDiagram\nA->>B: restored',
        themeConfig: { theme: 'neutral' },
        createdBy: user.id
      })
    );
  });

  it('rejects viewer restore attempts', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.VIEWER);

    await expect(useCase.execute({ user, diagramId: diagram.id, versionId: version.id })).rejects.toThrow(
      ForbiddenException
    );
  });

  it('rejects missing versions', async () => {
    const { diagramVersionRepository, useCase } = buildUseCase();
    diagramVersionRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ user, diagramId: diagram.id, versionId: version.id })).rejects.toThrow(
      NotFoundException
    );
  });
});
