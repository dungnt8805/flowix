import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiagramThemeConfig1771700000000 implements MigrationInterface {
  name = 'AddDiagramThemeConfig1771700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE diagrams
      ADD COLUMN IF NOT EXISTS theme_config jsonb NOT NULL DEFAULT '{"theme":"default"}'::jsonb
    `);
    await queryRunner.query(`
      ALTER TABLE diagram_versions
      ADD COLUMN IF NOT EXISTS theme_config jsonb NOT NULL DEFAULT '{"theme":"default"}'::jsonb
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE diagram_versions DROP COLUMN IF EXISTS theme_config');
    await queryRunner.query('ALTER TABLE diagrams DROP COLUMN IF EXISTS theme_config');
  }
}
