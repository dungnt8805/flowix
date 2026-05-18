import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

@Entity({ name: 'diagrams' })
export class DiagramEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'project_id', type: 'uuid' })
  projectId!: string;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'source_code', type: 'text' })
  sourceCode!: string;

  @Column({ name: 'diagram_type', type: 'varchar', length: 40, default: DiagramType.UNKNOWN })
  diagramType!: DiagramType;

  @Column({ name: 'theme_config', type: 'jsonb', default: { theme: 'default' } })
  themeConfig!: DiagramThemeConfig;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
