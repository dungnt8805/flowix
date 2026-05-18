import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiagramVersions1771100000000 implements MigrationInterface {
  name = 'AddDiagramVersions1771100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS diagram_versions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        diagram_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        project_id uuid NOT NULL,
        title varchar(200) NOT NULL,
        description text NULL,
        source_code text NOT NULL,
        diagram_type varchar(40) NOT NULL,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_diagram_versions_diagram FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_versions_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_versions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_diagram_versions_diagram_created ON diagram_versions (diagram_id, created_at DESC)'
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_diagram_versions_workspace_diagram ON diagram_versions (workspace_id, diagram_id)'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_versions_workspace_diagram');
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_versions_diagram_created');
    await queryRunner.query('DROP TABLE IF EXISTS diagram_versions');
  }
}
