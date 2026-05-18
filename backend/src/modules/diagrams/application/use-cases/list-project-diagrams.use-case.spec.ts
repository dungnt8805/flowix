import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { DiagramRepository } from '../ports/diagram.repository';
import { Diagram } from '../../domain/diagram';
import { ListProjectDiagramsUseCase } from './list-project-diagrams.use-case';

describe('ListProjectDiagramsUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Workspace User'
  };
  const project = Project.create({
    id: '33333333-3333-4333-8333-333333333333',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Editor MVP',
    createdBy: user.id
  });

  it('lists diagrams when the user belongs to the project workspace', async () => {
    const diagrams = [
      Diagram.create({
        id: '44444444-4444-4444-8444-444444444444',
        workspaceId: project.workspaceId,
        projectId: project.id,
        title: 'System context',
        sourceCode: 'flowchart LR\nA-->B',
        createdBy: user.id
      })
    ];
    const diagramRepository: DiagramRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      listByProjectId: jest.fn().mockResolvedValue(diagrams)
    };
    const projectRepository: ProjectRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(project),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: WorkspaceMemberRepository = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn().mockResolvedValue({
        id: 'member-1',
        workspaceId: project.workspaceId,
        userId: user.id,
        role: WorkspaceMemberRole.VIEWER,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    };
    const useCase = new ListProjectDiagramsUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository
    );

    const result = await useCase.execute(user, project.id);

    expect(result).toEqual(diagrams);
  });

  it('rejects users outside the workspace', async () => {
    const diagramRepository: DiagramRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      listByProjectId: jest.fn()
    };
    const projectRepository: ProjectRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(project),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: WorkspaceMemberRepository = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn().mockResolvedValue(null)
    };
    const useCase = new ListProjectDiagramsUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository
    );

    await expect(useCase.execute(user, project.id)).rejects.toThrow(ForbiddenException);
  });

  it('returns not found when the project does not exist', async () => {
    const diagramRepository: DiagramRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      listByProjectId: jest.fn()
    };
    const projectRepository: ProjectRepository = {
      save: jest.fn(),
      findById: jest.fn().mockResolvedValue(null),
      listByWorkspaceId: jest.fn()
    };
    const workspaceMemberRepository: WorkspaceMemberRepository = {
      addMember: jest.fn(),
      findByWorkspaceIdAndUserId: jest.fn()
    };
    const useCase = new ListProjectDiagramsUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      diagramRepository,
      projectRepository,
      workspaceMemberRepository
    );

    await expect(useCase.execute(user, project.id)).rejects.toThrow(NotFoundException);
  });
});
