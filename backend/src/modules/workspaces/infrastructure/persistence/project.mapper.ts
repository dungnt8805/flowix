import { Project } from '../../domain/project';
import { ProjectEntity } from './project.entity';

export class ProjectMapper {
  static toEntity(project: Project): ProjectEntity {
    const entity = new ProjectEntity();
    entity.id = project.id;
    entity.workspaceId = project.workspaceId;
    entity.name = project.name;
    entity.description = project.description;
    entity.status = project.status;
    entity.createdBy = project.createdBy;
    entity.createdAt = project.createdAt;
    entity.updatedAt = project.updatedAt;
    return entity;
  }

  static toDomain(entity: ProjectEntity): Project {
    return Project.create({
      id: entity.id,
      workspaceId: entity.workspaceId,
      name: entity.name,
      description: entity.description ?? undefined,
      status: entity.status,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
