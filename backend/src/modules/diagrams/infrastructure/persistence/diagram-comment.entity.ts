import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DiagramCommentStatus } from '../../domain/diagram-comment-status';

@Entity({ name: 'diagram_comments' })
export class DiagramCommentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'diagram_id', type: 'uuid' })
  diagramId!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'author_id', type: 'uuid' })
  authorId!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'jsonb', nullable: true })
  anchor!: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: DiagramCommentStatus.OPEN })
  status!: DiagramCommentStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
