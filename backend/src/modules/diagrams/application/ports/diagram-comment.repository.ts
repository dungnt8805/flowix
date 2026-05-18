import { DiagramComment } from '../../domain/diagram-comment';

export const DIAGRAM_COMMENT_REPOSITORY = Symbol('DIAGRAM_COMMENT_REPOSITORY');

export interface DiagramCommentRepository {
  save(comment: DiagramComment): Promise<DiagramComment>;
  findById(commentId: string): Promise<DiagramComment | null>;
  listByDiagramId(diagramId: string): Promise<DiagramComment[]>;
}
