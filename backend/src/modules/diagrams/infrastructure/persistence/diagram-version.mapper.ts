import { DiagramVersion } from '../../domain/diagram-version';
import { DiagramVersionEntity } from './diagram-version.entity';

export class DiagramVersionMapper {
  static toEntity(version: DiagramVersion): DiagramVersionEntity {
    const entity = new DiagramVersionEntity();
    entity.id = version.id;
    entity.diagramId = version.diagramId;
    entity.workspaceId = version.workspaceId;
    entity.projectId = version.projectId;
    entity.title = version.title;
    entity.description = version.description;
    entity.sourceCode = version.sourceCode;
    entity.diagramType = version.diagramType;
    entity.themeConfig = version.themeConfig;
    entity.createdBy = version.createdBy;
    entity.createdAt = version.createdAt;
    return entity;
  }

  static toDomain(entity: DiagramVersionEntity): DiagramVersion {
    return DiagramVersion.create({
      id: entity.id,
      diagramId: entity.diagramId,
      workspaceId: entity.workspaceId,
      projectId: entity.projectId,
      title: entity.title,
      description: entity.description,
      sourceCode: entity.sourceCode,
      diagramType: entity.diagramType,
      themeConfig: entity.themeConfig,
      createdBy: entity.createdBy,
      createdAt: entity.createdAt
    });
  }
}
