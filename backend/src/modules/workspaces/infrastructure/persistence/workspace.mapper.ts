import { Workspace } from '../../domain/workspace';
import { WorkspaceEntity } from './workspace.entity';

export class WorkspaceMapper {
  static toEntity(workspace: Workspace): WorkspaceEntity {
    const entity = new WorkspaceEntity();
    entity.id = workspace.id;
    entity.name = workspace.name;
    entity.slug = workspace.slug;
    entity.createdBy = workspace.createdBy;
    entity.createdAt = workspace.createdAt;
    entity.updatedAt = workspace.updatedAt;
    return entity;
  }

  static toDomain(entity: WorkspaceEntity): Workspace {
    return Workspace.create({
      id: entity.id,
      name: entity.name,
      slug: entity.slug,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
