import { DiagramShareLink } from '../../domain/diagram-share-link';
import { DiagramShareLinkEntity } from './diagram-share-link.entity';

export class DiagramShareLinkMapper {
  static toEntity(link: DiagramShareLink): DiagramShareLinkEntity {
    const entity = new DiagramShareLinkEntity();
    entity.id = link.id;
    entity.diagramId = link.diagramId;
    entity.workspaceId = link.workspaceId;
    entity.tokenHash = link.tokenHash;
    entity.createdBy = link.createdBy;
    entity.revokedAt = link.revokedAt;
    entity.createdAt = link.createdAt;
    entity.updatedAt = link.updatedAt;
    return entity;
  }

  static toDomain(entity: DiagramShareLinkEntity): DiagramShareLink {
    return DiagramShareLink.create({
      id: entity.id,
      diagramId: entity.diagramId,
      workspaceId: entity.workspaceId,
      tokenHash: entity.tokenHash,
      createdBy: entity.createdBy,
      revokedAt: entity.revokedAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
