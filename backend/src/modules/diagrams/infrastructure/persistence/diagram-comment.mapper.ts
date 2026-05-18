import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentEntity } from './diagram-comment.entity';

export class DiagramCommentMapper {
  static toEntity(comment: DiagramComment): DiagramCommentEntity {
    const entity = new DiagramCommentEntity();
    entity.id = comment.id;
    entity.diagramId = comment.diagramId;
    entity.workspaceId = comment.workspaceId;
    entity.authorId = comment.authorId;
    entity.body = comment.body;
    entity.anchor = comment.anchor;
    entity.status = comment.status;
    entity.createdAt = comment.createdAt;
    entity.updatedAt = comment.updatedAt;
    return entity;
  }

  static toDomain(entity: DiagramCommentEntity): DiagramComment {
    return DiagramComment.create({
      id: entity.id,
      diagramId: entity.diagramId,
      workspaceId: entity.workspaceId,
      authorId: entity.authorId,
      body: entity.body,
      anchor: entity.anchor,
      status: entity.status,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    });
  }
}
