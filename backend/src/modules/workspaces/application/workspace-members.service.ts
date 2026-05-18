import { ConflictException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UserEntity } from '../../users/infrastructure/persistence/user.entity';
import { WorkspaceMember } from '../domain/workspace-member';
import { Permission } from '../domain/permission';
import { ROLE_REPOSITORY, RoleRepository } from './ports/role.repository';
import {
  WORKSPACE_MEMBER_REPOSITORY,
  WorkspaceMemberRepository
} from './ports/workspace-member.repository';

export interface WorkspaceMemberSummary {
  id: string;
  workspaceId: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  roleId: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class WorkspaceMembersService {
  constructor(
    @Inject(WORKSPACE_MEMBER_REPOSITORY)
    private readonly members: WorkspaceMemberRepository,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @Inject(ROLE_REPOSITORY)
    private readonly roles: RoleRepository
  ) {}

  async listMembers(user: AuthenticatedUser, workspaceId: string): Promise<WorkspaceMemberSummary[]> {
    await this.requireWorkspaceMember(user, workspaceId);
    return this.toSummaries(await this.listByWorkspaceId(workspaceId));
  }

  async addMember(input: {
    actor: AuthenticatedUser;
    workspaceId: string;
    email: string;
    role: string;
  }): Promise<WorkspaceMemberSummary> {
    const actorMembership = await this.requireAdminActor(input.actor, input.workspaceId);
    this.assertActorCanAssignRole(actorMembership.role.name, input.role);
    
    const roleEntity = await this.roles.findByNameAndWorkspaceId(input.role, null);
    if (!roleEntity) throw new NotFoundException('Role not found.');

    const email = normalizeEmail(input.email);
    let targetUser = await this.users.findOneBy({ email });

    if (targetUser === null) {
      targetUser = await this.users.save(
        this.users.create({
          email,
          displayName: null,
          avatarUrl: null,
          emailVerifiedAt: null
        })
      );
    }

    const existing = await this.members.findByWorkspaceIdAndUserId(input.workspaceId, targetUser.id);
    if (existing !== null) {
      throw new ConflictException('User is already a workspace member.');
    }

    const member = await this.members.addMember({
      workspaceId: input.workspaceId,
      userId: targetUser.id,
      roleId: roleEntity.id
    });
    return (await this.toSummaries([member]))[0];
  }

  async updateRole(input: {
    actor: AuthenticatedUser;
    workspaceId: string;
    userId: string;
    role: string;
  }): Promise<WorkspaceMemberSummary> {
    const actorMembership = await this.requireAdminActor(input.actor, input.workspaceId);
    const targetMembership = await this.requireTargetMember(input.workspaceId, input.userId);
    
    const nextRoleEntity = await this.roles.findByNameAndWorkspaceId(input.role, null);
    if (!nextRoleEntity) throw new NotFoundException('Role not found.');

    this.assertActorCanManageTarget(actorMembership, targetMembership);
    this.assertActorCanAssignRole(actorMembership.role.name, input.role);
    await this.assertOwnerWouldRemain(input.workspaceId, targetMembership, nextRoleEntity.id);

    const updated = await this.updateMemberRole(input.workspaceId, input.userId, nextRoleEntity.id);
    return (await this.toSummaries([updated]))[0];
  }

  async removeMember(input: {
    actor: AuthenticatedUser;
    workspaceId: string;
    userId: string;
  }): Promise<void> {
    const actorMembership = await this.requireAdminActor(input.actor, input.workspaceId);
    const targetMembership = await this.requireTargetMember(input.workspaceId, input.userId);
    this.assertActorCanManageTarget(actorMembership, targetMembership);
    await this.assertOwnerWouldRemain(input.workspaceId, targetMembership, null);
    await this.removeByWorkspaceIdAndUserId(input.workspaceId, input.userId);
  }

  private async requireWorkspaceMember(user: AuthenticatedUser, workspaceId: string): Promise<WorkspaceMember> {
    const membership = await this.members.findByWorkspaceIdAndUserId(workspaceId, user.id);
    if (membership === null) {
      throw new NotFoundException('Workspace was not found.');
    }
    return membership;
  }

  private async requireAdminActor(user: AuthenticatedUser, workspaceId: string): Promise<WorkspaceMember> {
    const membership = await this.requireWorkspaceMember(user, workspaceId);
    if (!membership.role.hasPermission(Permission.WORKSPACE_MEMBER_ADD) && !membership.role.hasPermission(Permission.WORKSPACE_MANAGE)) {
      throw new ForbiddenException('Workspace member management requires sufficient access.');
    }
    return membership;
  }

  private async requireTargetMember(workspaceId: string, userId: string): Promise<WorkspaceMember> {
    const membership = await this.members.findByWorkspaceIdAndUserId(workspaceId, userId);
    if (membership === null) {
      throw new NotFoundException('Workspace member was not found.');
    }
    return membership;
  }

  private assertActorCanManageTarget(actor: WorkspaceMember, target: WorkspaceMember): void {
    if (target.role.name === 'owner' && actor.role.name !== 'owner') {
      throw new ForbiddenException('Only owners can manage owner memberships.');
    }
  }

  private assertActorCanAssignRole(actorRoleName: string, nextRoleName: string): void {
    if (
      (nextRoleName === 'owner' || nextRoleName === 'admin') &&
      actorRoleName !== 'owner'
    ) {
      throw new ForbiddenException('Only owners can assign owner or admin roles.');
    }
  }

  private async assertOwnerWouldRemain(
    workspaceId: string,
    target: WorkspaceMember,
    nextRoleId: string | null
  ): Promise<void> {
    if (target.role.name !== 'owner') {
      return;
    }

    const ownerRole = await this.roles.findByNameAndWorkspaceId('owner', null);
    if (!ownerRole) return;

    if (nextRoleId === ownerRole.id) {
      return;
    }

    const ownerCount = await this.countByWorkspaceIdAndRole(workspaceId, ownerRole.id);
    if (ownerCount <= 1) {
      throw new ForbiddenException('Workspace must keep at least one owner.');
    }
  }

  private async toSummaries(members: WorkspaceMember[]): Promise<WorkspaceMemberSummary[]> {
    const usersById = new Map(
      (await this.users.findBy({ id: In(members.map((member) => member.userId)) })).map((user) => [
        user.id,
        user
      ])
    );

    return members.map((member) => {
      const user = usersById.get(member.userId);
      return {
        id: member.id,
        workspaceId: member.workspaceId,
        userId: member.userId,
        email: user?.email ?? '',
        displayName: user?.displayName ?? null,
        role: member.role?.name ?? 'unknown',
        roleId: member.roleId,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString()
      };
    });
  }

  private listByWorkspaceId(workspaceId: string): Promise<WorkspaceMember[]> {
    if (this.members.listByWorkspaceId === undefined) {
      throw new Error('Workspace member repository does not support listing members.');
    }
    return this.members.listByWorkspaceId(workspaceId);
  }

  private updateMemberRole(
    workspaceId: string,
    userId: string,
    roleId: string
  ): Promise<WorkspaceMember> {
    if (this.members.updateRole === undefined) {
      throw new Error('Workspace member repository does not support role updates.');
    }
    return this.members.updateRole(workspaceId, userId, roleId);
  }

  private removeByWorkspaceIdAndUserId(workspaceId: string, userId: string): Promise<void> {
    if (this.members.removeByWorkspaceIdAndUserId === undefined) {
      throw new Error('Workspace member repository does not support removal.');
    }
    return this.members.removeByWorkspaceIdAndUserId(workspaceId, userId);
  }

  private countByWorkspaceIdAndRole(workspaceId: string, roleId: string): Promise<number> {
    if (this.members.countByWorkspaceIdAndRole === undefined) {
      throw new Error('Workspace member repository does not support role counts.');
    }
    return this.members.countByWorkspaceIdAndRole(workspaceId, roleId);
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
