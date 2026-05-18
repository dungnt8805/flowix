import { randomUUID } from 'node:crypto';

interface CreateDiagramShareLinkProps {
  id?: string;
  diagramId: string;
  workspaceId: string;
  tokenHash: string;
  createdBy: string;
  revokedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class DiagramShareLink {
  private constructor(
    readonly id: string,
    readonly diagramId: string,
    readonly workspaceId: string,
    readonly tokenHash: string,
    readonly createdBy: string,
    readonly revokedAt: Date | null,
    readonly createdAt: Date,
    readonly updatedAt: Date
  ) {}

  static create(props: CreateDiagramShareLinkProps): DiagramShareLink {
    const now = new Date();

    return new DiagramShareLink(
      props.id ?? randomUUID(),
      props.diagramId,
      props.workspaceId,
      props.tokenHash,
      props.createdBy,
      props.revokedAt ?? null,
      props.createdAt ?? now,
      props.updatedAt ?? now
    );
  }

  revoke(): DiagramShareLink {
    return DiagramShareLink.create({
      id: this.id,
      diagramId: this.diagramId,
      workspaceId: this.workspaceId,
      tokenHash: this.tokenHash,
      createdBy: this.createdBy,
      revokedAt: new Date(),
      createdAt: this.createdAt
    });
  }
}
