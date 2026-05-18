import { WorkspaceMember } from '../../domain/workspace-member';
import { WorkspaceMemberEntity } from './workspace-member.entity';

export class WorkspaceMemberMapper {
  static toDomain(entity: WorkspaceMemberEntity): WorkspaceMember {
    return {
      id: entity.id,
      workspaceId: entity.workspaceId,
      userId: entity.userId,
      role: entity.role,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}
