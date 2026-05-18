import { Role } from '../../domain/role';
import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberEntity } from './workspace-member.entity';

export class WorkspaceMemberMapper {
  static toDomain(entity: WorkspaceMemberEntity): WorkspaceMember {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      userId: entity.userId,
      roleId: entity.roleId,
      role: entity.role ? new Role({
        id: entity.role.id,
        workspaceId: entity.role.workspaceId,
        name: entity.role.name,
        permissions: entity.role.permissions,
        createdAt: entity.role.createdAt,
        updatedAt: entity.role.updatedAt
      }) : undefined as any,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}
