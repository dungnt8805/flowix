import { DiagramComment } from '../../domain/diagram-comment';
import { DiagramCommentStatus } from '../../domain/diagram-comment-status';

export interface DiagramCommentResponse {
  id: string;
  diagramId: string;
  workspaceId: string;
  authorId: string;
  body: string;
  anchor: Record<string, unknown> | null;
  status: DiagramCommentStatus;
  createdAt: string;
  updatedAt: string;
}

export function toDiagramCommentResponse(comment: DiagramComment): DiagramCommentResponse {
  return {
    id: comment.id,
    diagramId: comment.diagramId,
    workspaceId: comment.workspaceId,
    authorId: comment.authorId,
    body: comment.body,
    anchor: comment.anchor,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    updatedAt: comment.updatedAt.toISOString()
  };
}
