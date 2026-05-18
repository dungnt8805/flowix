import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UserEntity } from '../../users/infrastructure/persistence/user.entity';
import { CreateWorkspaceMemberRecord } from './ports/workspace-member.repository';
import { WorkspaceMemberRole } from '../domain/workspace-member-role';
import { WorkspaceMemberRepository } from './ports/workspace-member.repository';
import { WorkspaceMembersService } from './workspace-members.service';

describe('WorkspaceMembersService', () => {
  const workspaceId = '22222222-2222-4222-8222-222222222222';
  const actor: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'owner@example.com',
    displayName: 'Owner'
  };
  const targetUser = makeUser('33333333-3333-4333-8333-333333333333', 'member@example.com');

  function buildService(options: {
    actorRole?: WorkspaceMemberRole;
    targetRole?: WorkspaceMemberRole | null;
    ownerCount?: number;
    existingUser?: UserEntity | null;
  } = {}): {
    service: WorkspaceMembersService;
    members: jest.Mocked<Required<WorkspaceMemberRepository>>;
    users: jest.Mocked<Pick<Repository<UserEntity>, 'findOneBy' | 'save' | 'create' | 'findBy'>>;
  } {
    const actorRole = options.actorRole ?? WorkspaceMemberRole.OWNER;
    const targetRole = options.targetRole === undefined ? WorkspaceMemberRole.EDITOR : options.targetRole;
    const members: jest.Mocked<Required<WorkspaceMemberRepository>> = {
      addMember: jest.fn().mockImplementation((input: CreateWorkspaceMemberRecord) =>
        Promise.resolve({
          id: 'member-new',
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-01T00:00:00.000Z')
        })
      ),
      listByWorkspaceId: jest.fn().mockResolvedValue([
        makeMember(actor.id, WorkspaceMemberRole.OWNER),
        makeMember(targetUser.id, WorkspaceMemberRole.EDITOR)
      ]),
      findByWorkspaceIdAndUserId: jest.fn().mockImplementation((_workspaceId: string, userId: string) => {
        if (userId === actor.id) {
          return Promise.resolve(makeMember(actor.id, actorRole));
        }
        if (userId !== targetUser.id) {
          return Promise.resolve(null);
        }
        if (targetRole === null) {
          return Promise.resolve(null);
        }
        return Promise.resolve(makeMember(targetUser.id, targetRole));
      }),
      updateRole: jest
        .fn()
        .mockImplementation((_workspaceId: string, userId: string, role: WorkspaceMemberRole) =>
          Promise.resolve(makeMember(userId, role))
        ),
      removeByWorkspaceIdAndUserId: jest.fn().mockResolvedValue(undefined),
      countByWorkspaceIdAndRole: jest.fn().mockResolvedValue(options.ownerCount ?? 2)
    };
    const users = {
      findOneBy: jest.fn().mockResolvedValue(options.existingUser === undefined ? targetUser : options.existingUser),
      save: jest.fn().mockResolvedValue(targetUser),
      create: jest.fn().mockImplementation((input: Partial<UserEntity>) => ({ ...targetUser, ...input })),
      findBy: jest.fn().mockResolvedValue([makeUser(actor.id, actor.email), targetUser])
    };

    return {
      service: new WorkspaceMembersService(
        members,
        users as unknown as Repository<UserEntity>
      ),
      members,
      users
    };
  }

  it('lists workspace members for existing members', async () => {
    const { service } = buildService();

    await expect(service.listMembers(actor, workspaceId)).resolves.toEqual([
      expect.objectContaining({ userId: actor.id, email: actor.email, role: WorkspaceMemberRole.OWNER }),
      expect.objectContaining({ userId: targetUser.id, email: targetUser.email, role: WorkspaceMemberRole.EDITOR })
    ]);
  });

  it('adds an existing user as a member when actor can manage roles', async () => {
    const { service, members } = buildService({ targetRole: null });

    await expect(
      service.addMember({
        actor,
        workspaceId,
        email: targetUser.email,
        role: WorkspaceMemberRole.COMMENTER
      })
    ).resolves.toEqual(expect.objectContaining({ email: targetUser.email, role: WorkspaceMemberRole.COMMENTER }));
    expect(members.addMember).toHaveBeenCalledWith({
      workspaceId,
      userId: targetUser.id,
      role: WorkspaceMemberRole.COMMENTER
    });
  });

  it('rejects duplicate members', async () => {
    const { service } = buildService();

    await expect(
      service.addMember({ actor, workspaceId, email: targetUser.email, role: WorkspaceMemberRole.VIEWER })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lets owners update roles while preserving at least one owner', async () => {
    const { service, members } = buildService({ targetRole: WorkspaceMemberRole.OWNER, ownerCount: 1 });

    await expect(
      service.updateRole({ actor, workspaceId, userId: targetUser.id, role: WorkspaceMemberRole.ADMIN })
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(members.updateRole).not.toHaveBeenCalled();
  });

  it('prevents admins from managing owners or assigning admin roles', async () => {
    const { service } = buildService({ actorRole: WorkspaceMemberRole.ADMIN, targetRole: WorkspaceMemberRole.OWNER });

    await expect(
      service.removeMember({ actor, workspaceId, userId: targetUser.id })
    ).rejects.toBeInstanceOf(ForbiddenException);

    const adminService = buildService({ actorRole: WorkspaceMemberRole.ADMIN, targetRole: WorkspaceMemberRole.EDITOR }).service;
    await expect(
      adminService.updateRole({ actor, workspaceId, userId: targetUser.id, role: WorkspaceMemberRole.ADMIN })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects non-admin member management', async () => {
    const { service } = buildService({ actorRole: WorkspaceMemberRole.EDITOR });

    await expect(service.listMembers({ ...actor, id: 'missing' }, workspaceId)).rejects.toBeInstanceOf(
      NotFoundException
    );
    await expect(
      service.addMember({ actor, workspaceId, email: targetUser.email, role: WorkspaceMemberRole.VIEWER })
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

function makeMember(userId: string, role: WorkspaceMemberRole) {
  return {
    id: `member-${userId}`,
    workspaceId: '22222222-2222-4222-8222-222222222222',
    userId,
    role,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  };
}

function makeUser(id: string, email: string): UserEntity {
  return {
    id,
    email,
    displayName: email.split('@')[0],
    avatarUrl: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z')
  };
}
