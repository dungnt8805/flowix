import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEnterpriseGovernance1772600000000 implements MigrationInterface {
  name = 'AddEnterpriseGovernance1772600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS audit_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        actor_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        action varchar(80) NOT NULL,
        target_type varchar(80) NOT NULL,
        target_id varchar(120) NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_created
      ON audit_events(workspace_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_policies (
        workspace_id uuid PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
        allow_share_links boolean NOT NULL DEFAULT true,
        allow_exports boolean NOT NULL DEFAULT true,
        retention_days integer NOT NULL DEFAULT 365,
        sso_required boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS workspace_policies');
    await queryRunner.query('DROP INDEX IF EXISTS idx_audit_events_workspace_created');
    await queryRunner.query('DROP TABLE IF EXISTS audit_events');
  }
}
