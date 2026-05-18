import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'workspace_policies' })
export class WorkspacePolicyEntity {
  @PrimaryColumn({ name: 'workspace_id', type: 'uuid' })
  workspaceId!: string;

  @Column({ name: 'allow_share_links', type: 'boolean', default: true })
  allowShareLinks!: boolean;

  @Column({ name: 'allow_exports', type: 'boolean', default: true })
  allowExports!: boolean;

  @Column({ name: 'retention_days', type: 'integer', default: 365 })
  retentionDays!: number;

  @Column({ name: 'sso_required', type: 'boolean', default: false })
  ssoRequired!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
