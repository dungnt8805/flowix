import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialFloVisSchema1771000000000 implements MigrationInterface {
  name = 'InitialFloVisSchema1771000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL UNIQUE,
        display_name varchar(120) NULL,
        avatar_url varchar(500) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(160) NOT NULL,
        slug varchar(160) NOT NULL UNIQUE,
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_workspaces_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS workspace_members (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role varchar(20) NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_workspace_members_workspace_user UNIQUE (workspace_id, user_id),
        CONSTRAINT fk_workspace_members_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_workspace_members_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL,
        name varchar(200) NOT NULL,
        description text NULL,
        status varchar(20) NOT NULL DEFAULT 'active',
        created_by uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_projects_workspace_name UNIQUE (workspace_id, name),
        CONSTRAINT fk_projects_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_projects_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS diagrams (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id uuid NOT NULL,
        project_id uuid NOT NULL,
        title varchar(200) NOT NULL,
        description text NULL,
        source_code text NOT NULL,
        diagram_type varchar(40) NOT NULL DEFAULT 'unknown',
        created_by uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_diagrams_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagrams_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_diagrams_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace ON workspace_members (workspace_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON workspace_members (user_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_projects_workspace ON projects (workspace_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_projects_workspace_status ON projects (workspace_id, status)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_diagrams_workspace_project ON diagrams (workspace_id, project_id)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS idx_diagrams_workspace_updated ON diagrams (workspace_id, updated_at)');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagrams_workspace_updated');
    await queryRunner.query('DROP INDEX IF EXISTS idx_diagrams_workspace_project');
    await queryRunner.query('DROP INDEX IF EXISTS idx_projects_workspace_status');
    await queryRunner.query('DROP INDEX IF EXISTS idx_projects_workspace');
    await queryRunner.query('DROP INDEX IF EXISTS idx_workspace_members_user');
    await queryRunner.query('DROP INDEX IF EXISTS idx_workspace_members_workspace');
    await queryRunner.query('DROP TABLE IF EXISTS diagrams');
    await queryRunner.query('DROP TABLE IF EXISTS projects');
    await queryRunner.query('DROP TABLE IF EXISTS workspace_members');
    await queryRunner.query('DROP TABLE IF EXISTS workspaces');
    await queryRunner.query('DROP TABLE IF EXISTS users');
  }
}
