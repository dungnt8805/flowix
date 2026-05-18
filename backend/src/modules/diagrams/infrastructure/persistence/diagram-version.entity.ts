import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { DiagramThemeConfig } from '../../domain/diagram-theme';
import { DiagramType } from '../../domain/diagram-type';

@Entity({ name: 'diagram_versions' })
export class DiagramVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'diagram_id', type: 'uuid' })
  diagramId!: string;

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

  @Column({ name: 'diagram_type', type: 'varchar', length: 40 })
  diagramType!: DiagramType;

  @Column({ name: 'theme_config', type: 'jsonb', default: { theme: 'default' } })
  themeConfig!: DiagramThemeConfig;

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
