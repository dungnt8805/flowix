import { Diagram } from '../../domain/diagram';
import { DiagramEntity } from './diagram.entity';

export class DiagramMapper {
  static toEntity(diagram: Diagram): DiagramEntity {
    const entity = new DiagramEntity();
    entity.id = diagram.id;
    entity.workspaceId = diagram.workspaceId;
    entity.projectId = diagram.projectId;
    entity.title = diagram.title;
    entity.description = diagram.description;
    entity.sourceCode = diagram.sourceCode;
    entity.diagramType = diagram.diagramType;
    entity.themeConfig = diagram.themeConfig;
    entity.createdBy = diagram.createdBy;
    entity.createdAt = diagram.createdAt;
    entity.updatedAt = diagram.updatedAt;
    return entity;
  }

  static toDomain(entity: DiagramEntity): Diagram {
    return Diagram.create({
      id: entity.id,
      workspaceId: entity.workspaceId,
      projectId: entity.projectId,
      title: entity.title,
      description: entity.description ?? undefined,
      sourceCode: entity.sourceCode,
      diagramType: entity.diagramType,
      themeConfig: entity.themeConfig,
      createdBy: entity.createdBy ?? 'system',
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
