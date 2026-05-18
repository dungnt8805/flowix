import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiagramComments1771300000000 implements MigrationInterface {
  name = 'AddDiagramComments1771300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS diagram_comments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        diagram_id uuid NOT NULL,
        workspace_id uuid NOT NULL,
        author_id uuid NOT NULL,
        body text NOT NULL,
        anchor jsonb NULL,
        status varchar(20) NOT NULL DEFAULT 'open',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_diagram_comments_diagram FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_comments_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagram_comments_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_diagram_comments_diagram ON diagram_comments (diagram_id)');
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_diagram_comments_workspace_status ON diagram_comments (workspace_id, status)'
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_comments_workspace_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagram_comments_diagram');
    await queryRunner.query('DROP TABLE IF EXISTS diagram_comments');
  }
}
