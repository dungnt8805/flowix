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
import { ListDiagramVersionsUseCase } from './list-diagram-versions.use-case';

describe('ListDiagramVersionsUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Viewer'
  };
  const diagram = Diagram.create({
    id: '44444444-4444-4444-8444-444444444444',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    projectId: '33333333-3333-4333-8333-333333333333',
    title: 'Original',
    sourceCode: 'flowchart LR\nA-->B',
    diagramType: DiagramType.FLOWCHART,
    createdBy: user.id
  });
  const project = Project.create({
    id: diagram.projectId,
    workspaceId: diagram.workspaceId,
    name: 'Architecture',
    createdBy: user.id
  });
  const version = DiagramVersion.create({
    id: '55555555-5555-4555-8555-555555555555',
    diagramId: diagram.id,
    workspaceId: diagram.workspaceId,
    projectId: diagram.projectId,
    title: diagram.title,
    sourceCode: diagram.sourceCode,
    diagramType: diagram.diagramType,
    createdBy: user.id,
    createdAt: new Date('2026-01-02T00:00:00.000Z')
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.VIEWER): {
    diagramRepository: jest.Mocked<DiagramRepository>;
    projectRepository: jest.Mocked<ProjectRepository>;
    diagramVersionRepository: jest.Mocked<DiagramVersionRepository>;
    useCase: ListDiagramVersionsUseCase;
  } {
    const diagramRepository: jest.Mocked<DiagramRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(diagram),
      listByProjectId: jest.fn()
    };
    const projectRepository: jest.Mocked<ProjectRepository> = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(project),
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
    const diagramVersionRepository: jest.Mocked<DiagramVersionRepository> = {
      save: jest.fn(),
      findById: jest.fn(),
      findLatestByDiagramId: jest.fn(),
      listByDiagramId: jest.fn().mockResolvedValue([version])
    };
    const useCase = new ListDiagramVersionsUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository,
      diagramVersionRepository
    );

    return { diagramRepository, projectRepository, diagramVersionRepository, useCase };
  }

  it('lists versions for a workspace viewer', async () => {
    const { diagramVersionRepository, useCase } = buildUseCase();

    const result = await useCase.execute({ user, diagramId: diagram.id });

    expect(diagramVersionRepository.listByDiagramId.mock.calls).toEqual([[diagram.id]]);
    expect(result).toEqual([version]);
  });

  it('rejects non-members', async () => {
    const { useCase } = buildUseCase(null);

    await expect(useCase.execute({ user, diagramId: diagram.id })).rejects.toThrow(ForbiddenException);
  });

  it('rejects missing diagrams', async () => {
    const { diagramRepository, useCase } = buildUseCase();
    diagramRepository.findById.mockResolvedValue(null);

    await expect(useCase.execute({ user, diagramId: diagram.id })).rejects.toThrow(NotFoundException);
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

    await expect(useCase.execute({ user, diagramId: diagram.id })).rejects.toThrow(BadRequestException);
  });
});
