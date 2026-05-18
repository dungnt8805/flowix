import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkspaceRepository, WorkspaceWithRole } from '../../application/ports/workspace.repository';
import { WorkspaceMemberRole } from '../../domain/workspace-member-role';
import { Workspace } from '../../domain/workspace';
import { WorkspaceMemberEntity } from './workspace-member.entity';
import { WorkspaceEntity } from './workspace.entity';
import { WorkspaceMapper } from './workspace.mapper';

@Injectable()
export class TypeOrmWorkspaceRepository implements WorkspaceRepository {
  constructor(
    @InjectRepository(WorkspaceEntity)
    private readonly repository: Repository<WorkspaceEntity>
  ) {}

  async save(workspace: Workspace): Promise<Workspace> {
    const saved = await this.repository.save(WorkspaceMapper.toEntity(workspace));
    return WorkspaceMapper.toDomain(saved);
  }

  async listByUserId(userId: string): Promise<Workspace[]> {
    const workspacesWithRole = await this.listByUserIdWithRole(userId);
    return workspacesWithRole.map(({ workspace }) => workspace);
  }

  async listByUserIdWithRole(userId: string): Promise<WorkspaceWithRole[]> {
    const workspaces = await this.repository
      .createQueryBuilder('workspace')
      .innerJoin(WorkspaceMemberEntity, 'member', 'member.workspace_id = workspace.id')
      .innerJoin('workspace_roles', 'role', 'role.id = member.role_id')
      .addSelect('role.name', 'member_role')
      .where('member.user_id = :userId', { userId })
      .orderBy('workspace.created_at', 'DESC')
      .getRawAndEntities<{ member_role: WorkspaceMemberRole }>();

    return workspaces.entities.map((workspace, index) => ({
      workspace: WorkspaceMapper.toDomain(workspace),
      currentUserRole: workspaces.raw[index].member_role
    }));
  }
}
