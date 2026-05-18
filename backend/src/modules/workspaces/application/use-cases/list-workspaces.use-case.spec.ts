import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { ListWorkspacesUseCase } from './list-workspaces.use-case';

describe('ListWorkspacesUseCase', () => {
  it('lists workspaces for the current user', async () => {
    const user: AuthenticatedUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'user@example.com',
      displayName: 'Workspace Admin'
    };
    const workspaces = [
      Workspace.create({
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Platform',
        slug: 'platform-1234abcd',
        createdBy: user.id
      })
    ];
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const listByUserIdWithRole = jest.fn().mockResolvedValue([
      {
        workspace: workspaces[0],
        currentUserRole: WorkspaceMemberRole.OWNER
      }
    ]);
    const useCase = new ListWorkspacesUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { listByUserIdWithRole } as never
    );

    const result = await useCase.execute(user);

    expect(ensureUser).toHaveBeenCalledWith(user);
    expect(listByUserIdWithRole).toHaveBeenCalledWith(user.id);
    expect(result).toEqual([
      {
        workspace: workspaces[0],
        currentUserRole: WorkspaceMemberRole.OWNER
      }
    ]);
  });
});
