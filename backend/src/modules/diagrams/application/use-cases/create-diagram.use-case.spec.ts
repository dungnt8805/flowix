import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { ProjectRepository } from '../../../workspaces/application/ports/project.repository';
import { WorkspaceMemberRepository } from '../../../workspaces/application/ports/workspace-member.repository';
import { Project } from '../../../workspaces/domain/project';
import { WorkspaceMemberRole } from '../../../workspaces/domain/workspace-member-role';
import { DiagramRepository } from '../ports/diagram.repository';
import { CreateDiagramUseCase } from './create-diagram.use-case';

describe('CreateDiagramUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Diagram Author'
  };
  const project = Project.create({
    id: '33333333-3333-4333-8333-333333333333',
    workspaceId: '22222222-2222-4222-8222-222222222222',
    name: 'Checkout Flows',
    createdBy: user.id
  });

  function buildUseCase(role: WorkspaceMemberRole | null = WorkspaceMemberRole.EDITOR): {
    repository: jest.Mocked<DiagramRepository>;
    projectRepository: jest.Mocked<ProjectRepository>;
    useCase: CreateDiagramUseCase;
  } {
    const repository: jest.Mocked<DiagramRepository> = {
      save: jest.fn((diagram) => Promise.resolve(diagram)),
      findById: jest.fn(),
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
              workspaceId: project.workspaceId,
              userId: user.id,
              role,
              createdAt: new Date(),
              updatedAt: new Date()
            }
      )
    };
    const useCase = new CreateDiagramUseCase(
      { ensureUser: jest.fn().mockResolvedValue(undefined) } as unknown as CurrentUserSyncService,
      repository,
      projectRepository,
      workspaceMemberRepository
    );

    return { repository, projectRepository, useCase };
  }

  it('should create and persist a diagram for an editor in the project workspace', async () => {
    const { repository, useCase } = buildUseCase();

    const diagram = await useCase.execute({
      user,
      workspaceId: '22222222-2222-4222-8222-222222222222',
      projectId: '33333333-3333-4333-8333-333333333333',
      title: 'Checkout Flow',
      sourceCode: 'flowchart LR\nCart-->Payment'
    });

    expect(repository.save.mock.calls).toHaveLength(1);
    expect(diagram.projectId).toBe('33333333-3333-4333-8333-333333333333');
    expect(diagram.workspaceId).toBe('22222222-2222-4222-8222-222222222222');
    expect(diagram.createdBy).toBe(user.id);
  });

  it('rejects users without diagram create permission', async () => {
    const { useCase } = buildUseCase(WorkspaceMemberRole.VIEWER);

    await expect(
      useCase.execute({
        user,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'Checkout Flow',
        sourceCode: 'flowchart LR\nCart-->Payment'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects diagrams outside the project workspace', async () => {
    const { useCase } = buildUseCase();

    await expect(
      useCase.execute({
        user,
        workspaceId: '99999999-9999-4999-8999-999999999999',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'Checkout Flow',
        sourceCode: 'flowchart LR\nCart-->Payment'
      })
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects blank titles before persisting', async () => {
    const { repository, useCase } = buildUseCase();

    await expect(
      useCase.execute({
        user,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: ' ',
        sourceCode: 'flowchart LR\nCart-->Payment'
      })
    ).rejects.toThrow(BadRequestException);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('rejects blank source code before persisting', async () => {
    const { repository, useCase } = buildUseCase();

    await expect(
      useCase.execute({
        user,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'Checkout Flow',
        sourceCode: ' '
      })
    ).rejects.toThrow(BadRequestException);
    expect(repository.save.mock.calls).toHaveLength(0);
  });

  it('returns not found when the project does not exist', async () => {
    const { projectRepository, useCase } = buildUseCase();
    projectRepository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({
        user,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        projectId: '33333333-3333-4333-8333-333333333333',
        title: 'Checkout Flow',
        sourceCode: 'flowchart LR\nCart-->Payment'
      })
    ).rejects.toThrow(NotFoundException);
  });
});
