import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiagramShareLinks1771200000000 implements MigrationInterface {
  name = 'AddDiagramShareLinks1771200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS diagram_share_links (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        diagram_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        token_hash varchar(128) NOT NULL UNIQUE,
        created_by uuid NOT NULL,
        revoked_at timestamptz NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_diagram_share_links_diagram FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_share_links_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_share_links_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_diagram_share_links_diagram ON diagram_share_links (diagram_id)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_diagram_share_links_workspace ON diagram_share_links (workspace_id)'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_share_links_workspace');
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_share_links_diagram');
    await queryRunner.query('DROP TABLE IF EXISTS diagram_share_links');
  }
}
