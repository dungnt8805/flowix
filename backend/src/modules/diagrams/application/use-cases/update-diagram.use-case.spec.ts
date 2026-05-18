import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
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
import { UpdateDiagramUseCase } from './update-diagram.use-case';

describe('UpdateDiagramUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Editor'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'Original',
    description: 'Old description',
    sourceCode: 'flowchart LR\nA-->B',
    diagramType: DiagramType.FLOWCHART,
    createdBy: user.id,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
  const project = Project.create({
    id: diagram.projectId,
    workspaceId: diagram.workspaceId,
    name: 'Architecture',
    createdBy: user.id
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.EDITOR): {
    diagramRepository: jest.Mocked<DiagramRepository>;
    save: jest.Mock;
    diagramVersionRepository: jest.Mocked<DiagramVersionRepository>;
    projectRepository: jest.Mocked<ProjectRepository>;
    useCase: UpdateDiagramUseCase;
  } {
    const save = jest.fn((updatedDiagram: Diagram) => Promise.resolve(updatedDiagram));
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save,
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(project),
      listByWorkspaceId: jest.fn()
    };
    const diagramVersionRepository: jest.Mocked<DiagramVersionRepository> = {
      save: jest.fn((version: DiagramVersion) => Promise.resolve(version)),
      findById: jest.fn(),
      findLatestByDiagramId: jest.fn().mockResolvedValue(null),
      listByDiagramId: jest.fn()
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
    const useCase = new UpdateDiagramUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository,
      diagramVersionRepository
    );

    return { diagramRepository, save, diagramVersionRepository, projectRepository, useCase };
  }

  it('updates diagram metadata and source for an editor and creates a version snapshot', async () => {
    const { save, diagramVersionRepository, useCase } = buildUseCase();

    const result = await useCase.execute({
      user,
      diagramId: diagram.id,
      title: 'Updated',
      description: null,
      sourceCode: 'sequenceDiagram\nA->>B: ok',
      diagramType: DiagramType.SEQUENCE,
      themeConfig: { theme: 'dark' }
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe(diagram.id);
    expect(result.workspaceId).toBe(diagram.workspaceId);
    expect(result.projectId).toBe(diagram.projectId);
    expect(result.title).toBe('Updated');
    expect(result.description).toBeNull();
    expect(result.sourceCode).toBe('sequenceDiagram\nA->>B: ok');
    expect(result.diagramType).toBe(DiagramType.SEQUENCE);
    expect(result.themeConfig).toEqual({ theme: 'dark' });
    expect(result.createdBy).toBe(user.id);
    expect(result.createdAt).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(result.updatedAt.getTime()).toBeGreaterThan(new Date('2026-01-01T00:00:00.000Z').getTime());
    expect(diagramVersionRepository.findLatestByDiagramId.mock.calls).toEqual([[diagram.id]]);
    expect(diagramVersionRepository.save.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        diagramId: diagram.id,
        workspaceId: diagram.workspaceId,
        projectId: diagram.projectId,
        title: 'Updated',
        description: null,
        sourceCode: 'sequenceDiagram\nA->>B: ok',
        diagramType: DiagramType.SEQUENCE,
        themeConfig: { theme: 'dark' },
        createdBy: user.id
      })
    );
  });

  it('updates only the theme config and creates a version snapshot', async () => {
    const { save, diagramVersionRepository, useCase } = buildUseCase();

    const result = await useCase.execute({
      user,
      diagramId: diagram.id,
      themeConfig: { theme: 'forest' }
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.themeConfig).toEqual({ theme: 'forest' });
    expect(diagramVersionRepository.save.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        diagramId: diagram.id,
        title: 'Original',
        sourceCode: 'flowchart LR\nA-->B',
        diagramType: DiagramType.FLOWCHART,
        themeConfig: { theme: 'forest' }
      })
    );
  });

  it('skips duplicate version snapshots when latest version matches the saved diagram', async () => {
    const { diagramVersionRepository, useCase } = buildUseCase();
    diagramVersionRepository.findLatestByDiagramId.mockResolvedValue(
      DiagramVersion.create({
        diagramId: diagram.id,
        workspaceId: diagram.workspaceId,
        projectId: diagram.projectId,
        title: 'Original',
        description: 'Old description',
        sourceCode: 'flowchart LR\nA-->B',
        diagramType: DiagramType.FLOWCHART,
        createdBy: user.id
      })
    );

    await useCase.execute({
      user,
      diagramId: diagram.id,
      title: 'Original'
    });

    expect(diagramVersionRepository.save.mock.calls).toEqual([]);
  });

  it('rejects users without update permission', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.VIEWER);

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        title: 'Updated'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects commenters from updating diagram source', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.COMMENTER);

    await expect(
      useCase.execute({
        user,
        diagramId: '44444444-4444-4444-8444-444444444444',
        sourceCode: 'flowchart LR\nCommenter-->Edit'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing diagrams', async () => {
    const { diagramRepository, useCase } = buildUseCase();
    diagramRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        title: 'Updated'
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects inconsistent diagram project ownership', async () => {
    const { projectRepository, useCase } = buildUseCase();
    projectRepository.findById.mockResolvedValue(
      Project.create({
        id: diagram.projectId,
        workspaceId: '99999999-9999-4999-8999-999999999999',
        name: 'Other',
        createdBy: user.id
      })
    );

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id,
        title: 'Updated'
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects empty patch bodies', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        user,
        diagramId: diagram.id
      })
    ).rejects.toThrow(BadRequestException);
  });
});
