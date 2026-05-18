import { randomUUID } from 'node:crypto';
import { DiagramCommentStatus } from './diagram-comment-status';

interface CreateDiagramCommentProps {
  id?: string;
  diagramId: string;
  workspaceId: string;
  authorId: string;
  body: string;
  anchor?: Record<string, unknown> | null;
  status?: DiagramCommentStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DiagramComment {
  private constructor(
    readonly id: string,
    readonly diagramId: string,
    readonly workspaceId: string,
    readonly authorId: string,
    readonly body: string,
    readonly anchor: Record<string, unknown> | null,
    readonly status: DiagramCommentStatus,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  static create(props: CreateDiagramCommentProps): DiagramComment {
    const body = props.body.trim();

    if (body.length === 0) {
      throw new Error('Comment body is required.');
    }

    const now = new Date();

    return new DiagramComment(
      props.id ?? randomUUID(),
      props.diagramId,
      props.workspaceId,
      props.authorId,
      body,
      props.anchor ?? null,
      props.status ?? DiagramCommentStatus.OPEN,
      props.createdAt ?? now,
      props.updatedAt ?? now
    );
  }

  resolve(): DiagramComment {
    return DiagramComment.create({
      id: this.id,
      diagramId: this.diagramId,
      workspaceId: this.workspaceId,
      authorId: this.authorId,
      body: this.body,
      anchor: this.anchor,
      status: DiagramCommentStatus.RESOLVED,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }

  reopen(): DiagramComment {
    return DiagramComment.create({
      id: this.id,
      diagramId: this.diagramId,
      workspaceId: this.workspaceId,
      authorId: this.authorId,
      body: this.body,
      anchor: this.anchor,
      status: DiagramCommentStatus.OPEN,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }
}
