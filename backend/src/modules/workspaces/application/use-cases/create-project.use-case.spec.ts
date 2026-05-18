import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Project } from '../../domain/project';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { CreateProjectUseCase } from './create-project.use-case';

describe('CreateProjectUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Workspace Admin'
  };

  it('creates a project when the user can manage the workspace', async () => {
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const save = jest.fn((project: Project) => Promise.resolve(project));
    const findByWorkspaceIdAndUserId = jest.fn().mockResolvedValue({
      id: 'member-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      userId: user.id,
      role: WorkspaceMemberRole.OWNER,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const useCase = new CreateProjectUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { save } as never,
      { findByWorkspaceIdAndUserId } as never
    );

    const project = await useCase.execute({
      user,
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Editor MVP',
      description: 'Workspace shell'
    });

    expect(project.name).toBe('Editor MVP');
    expect(project.description).toBe('Workspace shell');
  });

  it('rejects users without project creation permission', async () => {
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const findByWorkspaceIdAndUserId = jest.fn().mockResolvedValue({
      id: 'member-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      userId: user.id,
      role: WorkspaceMemberRole.VIEWER,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const useCase = new CreateProjectUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { save: jest.fn() } as never,
      { findByWorkspaceIdAndUserId } as never
    );

    await expect(
      useCase.execute({
        user,
        workspaceId: '22222222-2222-4222-8222-222222222222',
        name: 'Editor MVP'
      })
    ).rejects.toThrow(ForbiddenException);
  });
});
