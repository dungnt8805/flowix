import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Project } from '../../domain/project';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { ListProjectsUseCase } from './list-projects.use-case';

describe('ListProjectsUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Workspace Admin'
  };

  it('lists projects when the user belongs to the workspace', async () => {
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const findByWorkspaceIdAndUserId = jest.fn().mockResolvedValue({
      id: 'member-1',
      workspaceId: '22222222-2222-4222-8222-222222222222',
      userId: user.id,
      role: WorkspaceMemberRole.EDITOR,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    const projects = [
      Project.create({
        id: '33333333-3333-4333-8333-333333333333',
        workspaceId: '22222222-2222-4222-8222-222222222222',
        name: 'Editor MVP',
        createdBy: user.id
      })
    ];
    const listByWorkspaceId = jest.fn().mockResolvedValue(projects);
    const useCase = new ListProjectsUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { listByWorkspaceId } as never,
      { findByWorkspaceIdAndUserId } as never
    );

    const result = await useCase.execute(user, '22222222-2222-4222-8222-222222222222');

    expect(result).toEqual(projects);
    expect(listByWorkspaceId).toHaveBeenCalledWith('22222222-2222-4222-8222-222222222222');
  });

  it('rejects users outside the workspace', async () => {
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const findByWorkspaceIdAndUserId = jest.fn().mockResolvedValue(null);
    const useCase = new ListProjectsUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { listByWorkspaceId: jest.fn() } as never,
      { findByWorkspaceIdAndUserId } as never
    );

    await expect(
      useCase.execute(user, '22222222-2222-4222-8222-222222222222')
    ).rejects.toThrow(ForbiddenException);
  });
});
