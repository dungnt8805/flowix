import { AuthenticatedUser } from '../../../../common/auth/authenticated-user';
import { CurrentUserSyncService } from '../../../auth/application/current-user-sync.service';
import { Permission } from '../../domain/permission';
import { Role } from '../../domain/role';
import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { CreateWorkspaceUseCase } from './create-workspace.use-case';

describe('CreateWorkspaceUseCase', () => {
  const user: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'user@example.com',
    displayName: 'Workspace Admin'
  };

  it('creates a workspace and adds the creator as owner', async () => {
    const ensureUser = jest.fn().mockResolvedValue(undefined);
    const save = jest.fn((workspace: Workspace) => Promise.resolve(workspace));
    const addMember = jest.fn().mockResolvedValue(undefined);
    const ownerRole = makeRole(WorkspaceMemberRole.OWNER);
    const findByNameAndWorkspaceId = jest.fn().mockResolvedValue(ownerRole);
    const useCase = new CreateWorkspaceUseCase(
      { ensureUser } as unknown as CurrentUserSyncService,
      { save } as never,
      { addMember } as never,
      { findByNameAndWorkspaceId } as never
    );

    const workspace = await useCase.execute({ user, name: 'Platform' });

    expect(ensureUser).toHaveBeenCalledWith(user);
    expect(workspace.name).toBe('Platform');
    expect(workspace.slug).toMatch(/^platform-/);
    expect(addMember).toHaveBeenCalledWith({
      workspaceId: workspace.id,
      userId: user.id,
      roleId: ownerRole.id
    });
  });
});

function makeRole(name: WorkspaceMemberRole): Role {
  return new Role({
    id: `role-${name}`,
    workspaceId: null,
    name,
    permissions: [Permission.WORKSPACE_MANAGE],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  });
}
